// ==================================================================
// DS-160 Bridge — Content script for ceac.state.gov/GenNIV/*
// Uses playwright-shim.js + automation-bundle.js for full form filling
// ==================================================================
(async function ds160Bridge() {
    // Get current task from storage
    const stored = await chrome.storage.local.get('currentTask');
    const task = stored.currentTask;
    if (!task || task.type !== 'ds160') return;

    const auto = window._automation;
    if (!auto) {
        console.error('[DS160-Ext] automation-bundle not loaded!');
        return;
    }

    // Create Playwright-compatible page shim
    const page = window.createPageShim();
    const url = page.url();
    const pageName = auto.identifyPage(url);
    console.log(`[DS160-Ext] 📄 ${pageName} | ${url.substring(0, 80)}`);

    // Report progress
    sendToBackground({ type: 'TASK_PROGRESS', page: pageName, detail: `Carregou ${pageName}` });

    try {
        // ── Session expired? ──
        if (url.includes('SessionTimedOut') || url.includes('TimedOut')) {
            sendToBackground({ type: 'TASK_ERROR', error: 'Sessão expirada', cause: 'session_expired', page: pageName });
            return;
        }

        // ── Route by page ──
        if (pageName === 'Landing' || url.includes('Default.aspx')) {
            await handleLanding(page, task, auto);
        } else if (pageName === 'SecurityQuestion' || url.includes('SecureQuestion') || url.includes('ConfirmApplicationID')) {
            await handleSecurityQuestion(page, task, auto);
        } else if (auto.isFinalPage(pageName)) {
            await handleFinalPage(page, task, pageName);
        } else {
            await handleFormPage(page, task, auto, pageName);
        }
    } catch (err) {
        console.error('[DS160-Ext] Erro:', err);
        sendToBackground({ type: 'TASK_ERROR', error: err.message, cause: 'script_error', page: pageName });
    }
})();

// ------------------------------------------------------------------
// Landing page: location + captcha + start/retrieve
// ------------------------------------------------------------------
async function handleLanding(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const location = profile.location || 'RCF';
    const settings = task.settings || {};

    // 1) Select location — ONLY if not already selected (prevents loop!)
    const locSelect = document.querySelector("select[id$='_ddlLocation']");
    if (locSelect && locSelect.value !== location) {
        locSelect.value = location;
        locSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`[DS160-Ext] Location: ${location} — postback will reload page`);
        // The postback will reload the page, content script re-runs.
        // On re-run, locSelect.value === location, so we skip to captcha.
        return;
    }
    console.log(`[DS160-Ext] Location already set: ${locSelect?.value}`);

    // 2) Wait for page to stabilize
    await auto.sleep(1000);

    // 3) Close modal if present
    const modalBg = document.querySelector('.modalBackground');
    if (modalBg && modalBg.offsetParent !== null) {
        const closeBtn = document.querySelector('[id*="lnkClose"]');
        if (closeBtn) {
            closeBtn.click();
            console.log('[DS160-Ext] Modal fechado');
            // Modal close triggers postback — page reloads, we'll continue on re-run
            return;
        }
    }

    // 4) Solve captcha
    const captchaImg = document.querySelector("img[id$='_CaptchaImage'], img[src*='captcha']");
    if (captchaImg) {
        const base64 = await getImageBase64(captchaImg);
        if (base64) {
            const result = await sendToBackground({ type: 'SOLVE_CAPTCHA', imageBase64: base64 });
            if (result?.error) {
                console.error(`[DS160-Ext] Captcha erro: ${result.error}`);
                sendToBackground({ type: 'TASK_ERROR', error: `Captcha: ${result.error}`, cause: 'captcha_failed', page: 'Landing' });
                return;
            }
            const captchaInput = document.querySelector("input[id$='_txtCodeTextBox']");
            if (captchaInput && result?.answer) {
                fillInput(captchaInput, result.answer);
                console.log(`[DS160-Ext] Captcha: ${result.answer}`);
            }
        }
    }

    await auto.sleep(500);

    // 5) Click Start or Retrieve
    const appId = task.data?._meta?.application_id;
    if (appId) {
        // Retrieve mode
        const appIdInput = document.querySelector("input[id$='_tbxApplicationID']");
        if (appIdInput) fillInput(appIdInput, appId);

        const secAnswerInput = document.querySelector("input[id$='_txtAnswer']");
        if (secAnswerInput) {
            const secAnswer = settings.security_answer || profile.securityAnswer || '';
            fillInput(secAnswerInput, secAnswer);
        }

        const retrieveBtn = document.querySelector("a[id$='_lnkRetrieve'], input[id$='_btnRetrieve']");
        if (retrieveBtn) {
            retrieveBtn.click();
            console.log(`[DS160-Ext] Retrieve: ${appId}`);
        }
    } else {
        // Start new
        const startBtn = document.querySelector("a[id$='_lnkNew']");
        if (startBtn) {
            startBtn.click();
            console.log('[DS160-Ext] Start New Application');
        }
    }
    // Navigation to SecurityQuestion/form page → content script re-runs
}

// ------------------------------------------------------------------
// Security Question + Confirm App ID
// ------------------------------------------------------------------
async function handleSecurityQuestion(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const settings = task.settings || {};
    const url = page.url();

    // Confirm Application ID page
    if (url.includes('ConfirmApplicationID')) {
        const appIdEl = document.querySelector("span[id$='_lblAppID'], b");
        if (appIdEl) {
            const text = appIdEl.textContent || '';
            const match = text.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
            if (match) {
                console.log(`[DS160-Ext] App ID: ${match[0]}`);
                task.data._meta = task.data._meta || {};
                task.data._meta.application_id = match[0];
                await chrome.storage.local.set({ currentTask: task });
                sendToBackground({ type: 'TASK_PROGRESS', page: 'ConfirmAppId', detail: `App ID: ${match[0]}`, applicationId: match[0] });
            }
        }
        const continueBtn = document.querySelector("input[id$='_btnContinueApp']");
        if (continueBtn) continueBtn.click();
        return;
    }

    // Security Question page
    const privacy = document.querySelector('#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct');
    if (privacy && !privacy.checked) privacy.click();

    const questionSelect = document.querySelector("select[id$='_ddlQuestions']");
    if (questionSelect && !questionSelect.disabled) {
        const qIndex = parseInt(settings.security_question || '0', 10);
        if (questionSelect.options[qIndex]) {
            questionSelect.value = questionSelect.options[qIndex].value;
            questionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    const answerInput = document.querySelector("input[id$='_txtAnswer']");
    if (answerInput && !answerInput.disabled) {
        fillInput(answerInput, settings.security_answer || profile.securityAnswer || '');
    }

    await auto.sleep(500);
    const continueBtn = document.querySelector("input[id$='_btnContinue']:not([disabled])");
    const nextBtn = document.querySelector("input[type='submit'][value*='Next']:not([disabled])");
    if (continueBtn) continueBtn.click();
    else if (nextBtn) nextBtn.click();
    console.log('[DS160-Ext] SecurityQuestion → Next');
}

// ------------------------------------------------------------------
// Regular form page: fill using field-map + generic-page
// ------------------------------------------------------------------
async function handleFormPage(page, task, auto, pageName) {
    const profile = auto.normalizeProfile(task.data);
    const fieldMap = auto.buildDynamicFieldMap(profile);
    console.log(`[DS160-Ext] Fields: ${fieldMap.length} | Page: ${pageName}`);

    sendToBackground({ type: 'TASK_PROGRESS', page: pageName, detail: `Preenchendo ${pageName}...` });

    // Fill the page
    const result = await auto.fillPage(page, fieldMap);
    console.log(`[DS160-Ext] ✅ ${pageName} em ${result.passes} passes [${result.elapsed}s]`);

    sendToBackground({
        type: 'TASK_PROGRESS',
        page: pageName,
        detail: `✅ ${pageName} em ${result.passes} passes [${result.elapsed}s]`,
    });

    // Click Next
    await auto.sleep(500);
    const nextBtn = document.querySelector("input[id$='_btnNext'], a[id$='_lnkNext'], input[type='submit'][value*='Next']");
    if (nextBtn) {
        nextBtn.click();
        console.log(`[DS160-Ext] → Next`);
    }
}

// ------------------------------------------------------------------
// Final page (Review, E-Sign, Photo, Complete)
// ------------------------------------------------------------------
async function handleFinalPage(page, task, pageName) {
    console.log(`[DS160-Ext] 🏁 Final: ${pageName}`);
    if (pageName === 'Confirmation') {
        sendToBackground({ type: 'TASK_COMPLETE', page: pageName });
    } else {
        sendToBackground({ type: 'TASK_PROGRESS', page: pageName, detail: `Página final: ${pageName}` });
    }
}
