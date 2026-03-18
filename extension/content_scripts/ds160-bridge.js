// ==================================================================
// DS-160 Bridge — Content script for ceac.state.gov/GenNIV/*
// Runs on each page load. Uses state tracking to avoid re-doing steps.
// ==================================================================
(async function ds160Bridge() {
    // ─── Guard: only run once per page load ───
    if (window.__ds160BridgeRan) return;
    window.__ds160BridgeRan = true;

    // ─── Get task ───
    const stored = await chrome.storage.local.get('currentTask');
    const task = stored.currentTask;
    if (!task || task.type !== 'ds160') {
        console.log('[DS160-Ext] Sem task DS-160');
        return;
    }

    const auto = window._automation;
    if (!auto) {
        console.error('[DS160-Ext] ❌ automation-bundle NÃO carregou!');
        reportError('automation-bundle não carregou', 'bundle_missing');
        return;
    }

    console.log('[DS160-Ext] ✅ Bundle OK. Funções:', Object.keys(auto).join(', '));

    const page = window.createPageShim();
    const url = page.url();
    const pageName = auto.identifyPage(url);
    console.log(`[DS160-Ext] ═══ Página: ${pageName} ═══ ${url.substring(0, 80)}`);
    reportProgress(pageName, `Carregou ${pageName}`);

    try {
        // ── Session expired? ──
        if (url.includes('SessionTimedOut') || url.includes('TimedOut')) {
            reportError('Sessão expirada', 'session_expired', pageName);
            return;
        }

        // ── Route ──
        if (pageName === 'Landing' || url.includes('Default.aspx')) {
            await handleLanding(page, task, auto);
        } else if (pageName === 'SecurityQuestion' || url.includes('SecureQuestion') || url.includes('ConfirmApplicationID')) {
            await handleSecurityQuestion(page, task, auto);
        } else if (auto.isFinalPage(pageName)) {
            await handleFinalPage(pageName);
        } else {
            await handleFormPage(page, task, auto, pageName);
        }
    } catch (err) {
        console.error('[DS160-Ext] ❌ Erro:', err.message);
        reportError(err.message, 'script_error', pageName);
    }
})();

// ═════════════════════════════════════════════════════════════════
// LANDING PAGE — Step-by-step with state tracking
// ═════════════════════════════════════════════════════════════════
async function handleLanding(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const location = profile.location || 'RCF';
    const settings = task.settings || {};

    console.log('[DS160-Ext] Landing — location:', location);

    // Step 1: Select location (if not yet selected)
    const locSelect = document.querySelector("select[id$='_ddlLocation']");
    if (locSelect) {
        console.log('[DS160-Ext] locSelect.value =', locSelect.value, '| target =', location);
        if (locSelect.value !== location) {
            console.log('[DS160-Ext] Selecionando location...');
            locSelect.value = location;
            locSelect.dispatchEvent(new Event('change', { bubbles: true }));
            // This triggers ASP.NET postback — page will reload or update
            // Wait and let it finish; the content script will re-run
            await sleep(2000);
            // Check if page reloaded (if we're still here, it was an async postback)
            // Wait for any postback to finish
            await waitForPostbackDone();
            console.log('[DS160-Ext] Location postback done');
        }
    }

    // Step 2: Close modal if visible
    const modalBg = document.querySelector('.modalBackground');
    if (modalBg && modalBg.offsetParent !== null) {
        console.log('[DS160-Ext] Modal visível');
        const closeBtn = document.querySelector('[id*="lnkClose"], [id*="btnClose"]');
        if (closeBtn) {
            closeBtn.click();
            console.log('[DS160-Ext] Modal fechado — esperando postback...');
            await sleep(1000);
            await waitForPostbackDone();
        }
    }

    // Step 3: Solve captcha
    const captchaImg = document.querySelector("img[id$='_CaptchaImage'], img[id*='c_pages_ctl00'], img[src*='botdetect']");
    if (captchaImg) {
        console.log('[DS160-Ext] Captcha encontrado');
        const base64 = await getImgBase64(captchaImg);
        if (base64) {
            const result = await sendBg({ type: 'SOLVE_CAPTCHA', imageBase64: base64 });
            if (result?.error) {
                console.error('[DS160-Ext] Captcha falhou:', result.error);
                reportError(`Captcha: ${result.error}`, 'captcha_failed', 'Landing');
                return;
            }
            const captchaInput = document.querySelector("input[id$='_txtCodeTextBox']");
            if (captchaInput && result?.answer) {
                setInputValue(captchaInput, result.answer);
                console.log('[DS160-Ext] Captcha preenchido:', result.answer);
            }
        }
    } else {
        console.log('[DS160-Ext] Sem captcha encontrado');
    }

    await sleep(500);

    // Step 4: Click Start or Retrieve
    const appId = task.data?._meta?.application_id;
    if (appId) {
        console.log('[DS160-Ext] Retrieve mode, appId:', appId);
        const appIdInput = document.querySelector("input[id$='_tbxApplicationID']");
        if (appIdInput) setInputValue(appIdInput, appId);

        const secAnswerInput = document.querySelector("input[id$='_txtAnswer']");
        if (secAnswerInput) {
            setInputValue(secAnswerInput, settings.security_answer || profile.securityAnswer || '');
        }

        const retrieveBtn = document.querySelector("a[id$='_lnkRetrieve'], input[id$='_btnRetrieve']");
        if (retrieveBtn) {
            retrieveBtn.click();
            console.log('[DS160-Ext] ✅ Retrieve clicado');
        }
    } else {
        console.log('[DS160-Ext] Start New mode');
        const startBtn = document.querySelector("a[id$='_lnkNew']");
        if (startBtn) {
            startBtn.click();
            console.log('[DS160-Ext] ✅ Start New clicado');
        } else {
            console.error('[DS160-Ext] ❌ Botão Start não encontrado!');
            // Log all links/buttons for debugging
            const allBtns = document.querySelectorAll('input[type="submit"], a[id]');
            console.log('[DS160-Ext] Buttons:', Array.from(allBtns).map(b => b.id || b.textContent?.trim()).join(', '));
        }
    }
}

// ═════════════════════════════════════════════════════════════════
// SECURITY QUESTION + CONFIRM APP ID
// ═════════════════════════════════════════════════════════════════
async function handleSecurityQuestion(page, task, auto) {
    const profile = auto.normalizeProfile(task.data);
    const settings = task.settings || {};
    const url = page.url();

    if (url.includes('ConfirmApplicationID')) {
        const texts = document.body.innerText;
        const match = texts.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
        if (match) {
            console.log('[DS160-Ext] App ID:', match[0]);
            reportProgress('ConfirmAppId', `App ID: ${match[0]}`, { applicationId: match[0] });
        }
        const continueBtn = document.querySelector("input[id$='_btnContinueApp']");
        if (continueBtn) continueBtn.click();
        return;
    }

    // Privacy checkbox
    const privacy = document.querySelector('#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct');
    if (privacy && !privacy.checked) privacy.click();

    // Security question
    const questionSelect = document.querySelector("select[id$='_ddlQuestions']");
    if (questionSelect && !questionSelect.disabled && questionSelect.options.length > 1) {
        const qIndex = parseInt(settings.security_question || '0', 10) + 1; // skip "Select One"
        if (questionSelect.options[qIndex]) {
            questionSelect.value = questionSelect.options[qIndex].value;
            questionSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // Security answer
    const answerInput = document.querySelector("input[id$='_txtAnswer']");
    if (answerInput) {
        setInputValue(answerInput, settings.security_answer || profile.securityAnswer || 'send160');
    }

    await sleep(500);

    const continueBtn = document.querySelector("input[id$='_btnContinue'], input[type='submit'][value*='Continue']");
    if (continueBtn) {
        continueBtn.click();
        console.log('[DS160-Ext] ✅ SecurityQuestion → Next');
    }
}

// ═════════════════════════════════════════════════════════════════
// FORM PAGE — fill using automation bundle
// ═════════════════════════════════════════════════════════════════
async function handleFormPage(page, task, auto, pageName) {
    const profile = auto.normalizeProfile(task.data);
    const fieldMap = auto.buildDynamicFieldMap(profile);
    console.log(`[DS160-Ext] FieldMap: ${fieldMap.length} entries for ${pageName}`);

    reportProgress(pageName, `Preenchendo ${pageName}...`);

    const result = await auto.fillPage(page, fieldMap, { maxPasses: 10 });
    console.log(`[DS160-Ext] ✅ ${pageName}: ${result.passes} passes, ${result.elapsed}s`);

    reportProgress(pageName, `✅ ${pageName} [${result.passes}p, ${result.elapsed}s]`);

    await sleep(500);

    // Click Next
    const nextBtn = document.querySelector(
        "input[id$='_btnNext'], " +
        "a[id$='_lnkNext'], " +
        "input[type='submit'][value*='Next']"
    );
    if (nextBtn) {
        nextBtn.click();
        console.log('[DS160-Ext] → Next');
    } else {
        console.warn('[DS160-Ext] ⚠️ Botão Next não encontrado');
    }
}

// ═════════════════════════════════════════════════════════════════
// FINAL PAGE
// ═════════════════════════════════════════════════════════════════
async function handleFinalPage(pageName) {
    console.log(`[DS160-Ext] 🏁 Final: ${pageName}`);
    if (pageName === 'Confirmation') {
        sendBg({ type: 'TASK_COMPLETE', page: pageName });
    } else {
        reportProgress(pageName, `Página final: ${pageName}`);
        // For Review/Sign pages, just report (manual intervention may be needed)
    }
}

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sendBg(msg) {
    return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

function reportProgress(page, detail, extra = {}) {
    sendBg({ type: 'TASK_PROGRESS', page, detail, ...extra });
}

function reportError(error, cause, page = 'unknown') {
    sendBg({ type: 'TASK_ERROR', error, cause, page });
}

function setInputValue(el, value) {
    el.focus();
    try {
        const proto = el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, String(value));
        else el.value = String(value);
    } catch { el.value = String(value); }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
}

async function getImgBase64(img) {
    if (!img) return null;
    if (!img.complete) {
        await new Promise(r => { img.onload = r; img.onerror = r; });
    }
    try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas.toDataURL('image/png').split(',')[1];
    } catch (e) {
        console.error('[DS160-Ext] getImgBase64 error:', e.message);
        return null;
    }
}

async function waitForPostbackDone(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const inPB = (function() {
            try {
                const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
                return mgr?.get_isInAsyncPostBack?.() || false;
            } catch { return false; }
        })();
        if (!inPB) return;
        await sleep(100);
    }
}
