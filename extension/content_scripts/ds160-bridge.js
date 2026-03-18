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
        console.error('[DS160] automation-bundle not loaded');
        return;
    }

    // Create Playwright-compatible page shim
    const page = window.createPageShim();
    const url = page.url();
    const pageName = auto.identifyPage(url);
    console.log(`[DS160-Ext] 📄 ${pageName} | ${url.substring(0, 60)}`);

    // Report progress
    sendToBackground({ type: 'TASK_PROGRESS', page: pageName, detail: `Carregou ${pageName}` });

    try {
        // ── Session expired check ──
        if (url.includes('SessionTimedOut') || url.includes('TimedOut')) {
            sendToBackground({
                type: 'TASK_ERROR',
                error: 'Sessão expirada',
                cause: 'session_expired',
                page: pageName,
            });
            return;
        }

        // ── Validation errors from previous submission ──
        const validationErrors = auto.getValidationErrors(page);
        if (validationErrors && validationErrors.length > 0) {
            // These are page-level validation errors — report to background
            sendToBackground({
                type: 'TASK_ERROR',
                error: validationErrors.join('; '),
                cause: 'validation_error',
                page: pageName,
            });
            return;
        }

        // ── Route by page ──
        if (pageName === 'Landing' || url.includes('Default.aspx')) {
            await handleLanding(page, task, auto);
        } else if (auto.isFinalPage(pageName)) {
            await handleFinalPage(page, task, pageName);
        } else {
            await handleFormPage(page, task, auto, pageName);
        }

    } catch (err) {
        console.error('[DS160-Ext] Erro:', err);
        sendToBackground({
            type: 'TASK_ERROR',
            error: err.message,
            cause: 'script_error',
            page: pageName,
        });
    }
})();

// ------------------------------------------------------------------
// Landing page: location + captcha + start/retrieve
// ------------------------------------------------------------------
async function handleLanding(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const location = profile.location || 'RCF';
    const settings = task.settings || {};

    // 1) Select location
    const locSelect = document.querySelector("select[id$='_ddlLocation']");
    if (locSelect) {
        selectOption(locSelect, location);
        console.log(`[DS160-Ext] Location: ${location}`);
        await auto.sleep(3000); // wait for postback
    }

    // 2) Wait for page to stabilize
    await auto.waitForPageReady(page);

    // 3) Close modal if present
    const modalBg = document.querySelector('.modalBackground');
    if (modalBg && modalBg.offsetParent !== null) {
        const closeBtn = document.querySelector('[id*="lnkClose"]');
        if (closeBtn) {
            closeBtn.click();
            await auto.sleep(2000);
            await auto.waitForPageReady(page);
        }
    }

    // 4) Solve captcha
    const captchaImg = document.querySelector("img[id$='_CaptchaImage'], img[src*='captcha']");
    if (captchaImg) {
        const base64 = await getImageBase64(captchaImg);
        if (base64) {
            const { answer, error } = await sendToBackground({
                type: 'SOLVE_CAPTCHA',
                imageBase64: base64,
            });

            if (error) throw new Error(`Captcha: ${error}`);

            const captchaInput = document.querySelector("input[id$='_txtCodeTextBox']");
            if (captchaInput) {
                fillInput(captchaInput, answer);
                console.log(`[DS160-Ext] Captcha: ${answer}`);
            }
        }
    }

    await auto.sleep(1000);

    // 5) Check if Retrieve (has app_id) or Start New
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
    // Navigation will cause this content script to re-run on the next page
}

// ------------------------------------------------------------------
// Security Question page
// ------------------------------------------------------------------
async function handleSecurityQuestion(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const settings = task.settings || {};

    // Privacy checkbox
    const privacy = document.querySelector('#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct');
    if (privacy && !privacy.checked) {
        privacy.click();
    }

    // Select security question
    const questionSelect = document.querySelector("select[id$='_ddlQuestions']");
    if (questionSelect && !questionSelect.disabled) {
        const qIndex = parseInt(settings.security_question || '0', 10);
        if (questionSelect.options[qIndex]) {
            questionSelect.value = questionSelect.options[qIndex].value;
            questionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Fill answer
    const answerInput = document.querySelector("input[id$='_txtAnswer']");
    if (answerInput && !answerInput.disabled) {
        const answer = settings.security_answer || profile.securityAnswer || '';
        fillInput(answerInput, answer);
    }

    // Click Continue/Next
    const continueBtn = document.querySelector("input[id$='_btnContinue']:not([disabled])");
    const nextBtn = document.querySelector("input[type='submit'][value*='Next']:not([disabled])");
    if (continueBtn) continueBtn.click();
    else if (nextBtn) nextBtn.click();

    console.log('[DS160-Ext] SecurityQuestion filled');
}

// ------------------------------------------------------------------
// Confirm Application ID page
// ------------------------------------------------------------------
async function handleConfirmAppId(page, task) {
    // Capture application_id
    const appIdEl = document.querySelector("span[id$='_lblAppID'], b");
    if (appIdEl) {
        const text = appIdEl.textContent || '';
        const match = text.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
        if (match) {
            console.log(`[DS160-Ext] Application ID: ${match[0]}`);
            // Save to storage for subsequent pages
            task.data._meta = task.data._meta || {};
            task.data._meta.application_id = match[0];
            await chrome.storage.local.set({ currentTask: task });

            // Report to background for DB update
            sendToBackground({
                type: 'TASK_PROGRESS',
                page: 'ConfirmAppId',
                detail: `App ID: ${match[0]}`,
                applicationId: match[0],
            });
        }
    }

    // Click Continue
    const continueBtn = document.querySelector("input[id$='_btnContinueApp']");
    if (continueBtn) continueBtn.click();
}

// ------------------------------------------------------------------
// Regular form page: fill using field-map + generic-page
// ------------------------------------------------------------------
async function handleFormPage(page, task, auto, pageName) {
    // Handle special pages first
    if (pageName === 'SecurityQuestion' || pageName.includes('SecureQuestion')) {
        await handleSecurityQuestion(page, task, auto);
        return;
    }
    if (pageName.includes('ConfirmApplicationID') || pageName.includes('confirm_')) {
        await handleConfirmAppId(page, task);
        return;
    }

    // Build field map
    const profile = auto.normalizeProfile(task.data);
    const fieldMap = auto.buildDynamicFieldMap(profile);
    console.log(`[DS160-Ext] Fields: ${fieldMap.length} | Page: ${pageName}`);

    // Fill the page using generic-page.js (via shim)
    const result = await auto.fillPage(page, fieldMap);
    console.log(`[DS160-Ext] ✅ Preenchida em ${result.passes} passes [${result.elapsed}s]`);

    sendToBackground({
        type: 'TASK_PROGRESS',
        page: pageName,
        detail: `Preenchida em ${result.passes} passes [${result.elapsed}s]`,
    });

    // Check for validation errors before clicking Next
    const errors = auto.getValidationErrors(page);
    if (errors && errors.length > 0) {
        console.warn(`[DS160-Ext] Validation errors: ${errors.join('; ')}`);
        sendToBackground({
            type: 'TASK_ERROR',
            error: errors.join('; '),
            cause: 'validation_error',
            page: pageName,
        });
        return;
    }

    // Click Next
    await auto.sleep(500);
    const nextBtn = document.querySelector(
        "input[id$='_btnNext'], a[id$='_lnkNext'], input[type='submit'][value*='Next']"
    );
    if (nextBtn) {
        nextBtn.click();
        console.log(`[DS160-Ext] → Next`);
        // Content script will re-run on the new page after navigation
    }
}

// ------------------------------------------------------------------
// Final page (Review, E-Sign, Photo, Complete)
// ------------------------------------------------------------------
async function handleFinalPage(page, task, pageName) {
    console.log(`[DS160-Ext] 🏁 Final page: ${pageName}`);

    if (pageName === 'Complete' || pageName.includes('Confirmation')) {
        // TODO: Download confirmation PDF and upload to Supabase
        sendToBackground({
            type: 'TASK_COMPLETE',
            page: pageName,
        });
    } else {
        // Review, E-Sign, Photo — report and wait for manual handling or next automation step
        sendToBackground({
            type: 'TASK_PROGRESS',
            page: pageName,
            detail: `Página final: ${pageName}`,
        });
    }
}
