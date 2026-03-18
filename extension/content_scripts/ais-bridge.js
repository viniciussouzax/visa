// ==================================================================
// AIS Bridge — runs on ais.usvisa-info.com/*
// Receives task from background, orchestrates AIS actions
// ==================================================================
(async function aisBridge() {
    const stored = await chrome.storage.local.get('currentTask');
    const task = stored.currentTask;

    if (!task || task.type !== 'ais') {
        return; // No AIS task
    }

    const url = window.location.href;
    console.log(`[AIS] 📄 URL: ${url}`);

    sendToBackground({
        type: 'TASK_PROGRESS',
        page: 'AIS',
        detail: `Carregou ${url.substring(0, 60)}`,
    });

    try {
        if (url.includes('/users/sign_up')) {
            await handleSignup(task);
        } else if (url.includes('/users/sign_in') || url.includes('/users/login')) {
            await handleLogin(task);
        } else if (url.includes('/niv/groups')) {
            await handleAddApplicant(task);
        } else if (url.includes('/niv/schedule')) {
            await handleSchedule(task);
        } else if (url.includes('/niv/payment')) {
            await handlePayment(task);
        } else {
            console.log('[AIS] Página não mapeada:', url);
        }
    } catch (err) {
        console.error('[AIS] Erro:', err);
        sendToBackground({
            type: 'TASK_ERROR',
            error: err.message,
            cause: 'script_error',
            page: 'AIS',
        });
    }
})();

// TODO: Fase 3 — Implement each handler
async function handleSignup(task) {
    console.log('[AIS] Signup — em desenvolvimento');
}

async function handleLogin(task) {
    console.log('[AIS] Login — em desenvolvimento');
}

async function handleAddApplicant(task) {
    console.log('[AIS] Add Applicant — em desenvolvimento');
}

async function handleSchedule(task) {
    console.log('[AIS] Schedule — em desenvolvimento');
}

async function handlePayment(task) {
    console.log('[AIS] Payment — em desenvolvimento');
}
