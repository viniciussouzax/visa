// ==================================================================
// DS-160 Bridge — runs on ceac.state.gov/GenNIV/*
// Receives task from background, orchestrates filling
// ==================================================================
(async function ds160Bridge() {
    // Check if we have a task
    const stored = await chrome.storage.local.get('currentTask');
    const task = stored.currentTask;

    if (!task || task.type !== 'ds160') {
        return; // No DS-160 task — don't do anything
    }

    const page = detectPage();
    console.log(`[DS160] 📄 Página: ${page}`);

    // Report progress
    sendToBackground({
        type: 'TASK_PROGRESS',
        page,
        detail: `Carregou ${page}`,
    });

    try {
        // Check for validation errors from previous submission
        const errors = getValidationErrors();
        if (errors.length > 0) {
            console.warn('[DS160] Validation errors:', errors);
            sendToBackground({
                type: 'TASK_ERROR',
                error: errors.join('; '),
                cause: 'validation_error',
                page,
                tabId: (await chrome.runtime.sendMessage({ type: 'GET_STATUS' }))?.currentTask?.tabId,
            });
            return;
        }

        // Route to appropriate handler based on page
        if (page === 'Landing') {
            await handleLanding(task);
        } else if (page === 'Complete') {
            await handleComplete(task);
        } else {
            // Regular form page — fill fields
            await handleFormPage(task, page);
        }

    } catch (err) {
        console.error('[DS160] Erro:', err);
        sendToBackground({
            type: 'TASK_ERROR',
            error: err.message,
            cause: 'script_error',
            page,
        });
    }
})();

// ------------------------------------------------------------------
// Landing page: select location, solve captcha, start/retrieve
// ------------------------------------------------------------------
async function handleLanding(task) {
    const location = task.data?.location || 'RCF';

    // Select location
    const locationSelect = await waitFor('select[id$="_ddlLocation"]');
    selectOption(locationSelect, location);
    console.log(`[DS160] Location: ${location}`);

    // Wait for postback
    await sleep(3000);

    // Close modal if present
    const modal = document.querySelector('[id$="_btnCloseModal"]');
    if (modal) {
        modal.click();
        await sleep(2000);
    }

    // Solve captcha
    const captchaImg = document.querySelector('img[id$="_CaptchaImage"]');
    if (captchaImg) {
        const base64 = await getImageBase64(captchaImg);
        if (base64) {
            const { answer, error } = await sendToBackground({
                type: 'SOLVE_CAPTCHA',
                imageBase64: base64,
            });

            if (error) throw new Error(`Captcha: ${error}`);

            const captchaInput = document.querySelector('input[id$="_txtAnswer"]');
            if (captchaInput) {
                fillInput(captchaInput, answer);
                console.log(`[DS160] Captcha: ${answer}`);
            }
        }
    }

    // Click Start or Retrieve
    await sleep(1000);

    // Check if we have an application_id for Retrieve
    const appId = task.data?._meta?.application_id;
    if (appId) {
        const appIdInput = document.querySelector('input[id$="_txtAppID"]');
        if (appIdInput) {
            fillInput(appIdInput, appId);
            const retrieveBtn = document.querySelector('input[id$="_btnRetrieve"]');
            if (retrieveBtn) retrieveBtn.click();
            console.log(`[DS160] Retrieve: ${appId}`);
            return;
        }
    }

    // Start new application
    const startBtn = document.querySelector('input[id$="_btnStart"]');
    if (startBtn) {
        startBtn.click();
        console.log('[DS160] Start new application');
    }
}

// ------------------------------------------------------------------
// Regular form page: fill fields using field-map
// ------------------------------------------------------------------
async function handleFormPage(task, page) {
    // TODO: Fase 2 — implement field filling using field-map
    // For now, report that we reached this page
    console.log(`[DS160] Form page: ${page} — field filling not yet implemented`);
    sendToBackground({
        type: 'TASK_PROGRESS',
        page,
        detail: 'Página carregada — preenchimento em desenvolvimento',
    });
}

// ------------------------------------------------------------------
// Complete page: download confirmation
// ------------------------------------------------------------------
async function handleComplete(task) {
    // TODO: Fase 2 — implement PDF download and upload
    console.log('[DS160] Complete page reached');
    sendToBackground({
        type: 'TASK_COMPLETE',
        page: 'Complete',
    });
}
