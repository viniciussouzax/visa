// ============================================================
// page-state.js — Detecção central de estado da página
// Fonte única de verdade: "que página estou vendo agora?"
// ============================================================

/**
 * Estados possíveis da automação
 */
const PageState = {
    LANDING_READY: 'landing_ready',           // Landing com location + start/retrieve visíveis
    LANDING_PARTIAL: 'landing_partial',       // Landing com location mas sem captcha ainda
    CHALLENGE: 'challenge',                   // TSPD/Akamai challenge ativo
    RECOVERY_CAPTCHA: 'recovery_captcha',     // Retrieve com captcha
    RECOVERY_QUESTIONS: 'recovery_questions', // Retrieve com security questions
    SECURITY_QUESTION: 'security_question',   // Security question setup
    UNKNOWN: 'unknown',                       // Estado não reconhecido
};

/**
 * Detecta o estado atual da página
 *
 * Estratégia: combina URL + marcadores DOM + elementos visíveis
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{type: string, url: string, evidence?: object}>}
 */
async function detectPageState(page) {
    const url = page.url();
    let html = '';
    try {
        html = await page.content({ timeout: 3000 });
    } catch (e) {
        html = '';
    }

    // 1. CHALLENGE: detectar markers TSPD/Akamai
    if (hasTspdMarkers(html)) {
        return { type: PageState.CHALLENGE, url, evidence: { tspd: true } };
    }

    // 2. LANDING: Default.aspx
    if (url.includes('Default.aspx')) {
        const hasLocation = await isVisible(page, "select[id$='_ddlLocation']", 500);
        const hasStartLink = await isVisible(page, "a[id$='_lnkNew']", 500);
        const hasRetrieveLink = await isVisible(page, "a[id$='_lnkRetrieve']", 500);
        const hasCaptcha = await isVisible(page, "img[id*='CaptchaImage'], .LBD_CaptchaImage", 500);

        if (hasLocation && (hasStartLink || hasRetrieveLink)) {
            return {
                type: hasCaptcha ? PageState.LANDING_READY : PageState.LANDING_PARTIAL,
                url,
                evidence: { location: true, start: hasStartLink, retrieve: hasRetrieveLink, captcha: hasCaptcha }
            };
        }
    }

    // 3. RECOVERY: Retrieve.aspx ou páginas de recuperação
    if (url.includes('Retrieve') || url.includes('Recovery') || url.includes('SecureQuestion') || url.includes('ConfirmApplicationID')) {
        const hasAppIdInput = await isVisible(page, "input[id*='ApplicationID']", 500);
        const hasSecurityQuestions = await isVisible(page, "input[id*='txbSname'], input[id*='txbYear']", 500);
        const hasCaptcha = await isVisible(page, "input[id*='txtCodeTextBox'], img[id*='CaptchaImage']", 500);

        if (hasSecurityQuestions) {
            return { type: PageState.RECOVERY_QUESTIONS, url, evidence: { questions: true } };
        }
        if (hasCaptcha || hasAppIdInput) {
            return { type: PageState.RECOVERY_CAPTCHA, url, evidence: { captcha: true, appId: hasAppIdInput } };
        }
    }

    // 4. SECURITY QUESTION: página de security question (após New)
    if (url.includes('SecureQuestion') || await isCheckboxVisible(page, "input[id$='chkbxPrivacyAct']", 500)) {
        return { type: PageState.SECURITY_QUESTION, url, evidence: { privacy: true } };
    }

    return { type: PageState.UNKNOWN, url, evidence: {} };
}

/**
 * Verifica se elemento está visível (timeout curto)
 */
async function isVisible(page, selector, timeout = 1000) {
    try {
        const el = page.locator(selector).first();
        return await el.isVisible({ timeout });
    } catch {
        return false;
    }
}

/**
 * Verifica se checkbox está visível
 */
async function isCheckboxVisible(page, selector, timeout = 1000) {
    try {
        const el = page.locator(selector).first();
        return await el.isVisible({ timeout }) && (await el.isEnabled());
    } catch {
        return false;
    }
}

/**
 * Detecta markers TSPD no HTML
 */
function hasTspdMarkers(html) {
    const markers = [
        '/TSPD/',
        'window["loaderConfig"] = "/TSPD/?type=20"',
        'src="/TSPD/?type=18"',
        'input#ans',
        'button#jar',
    ];
    return markers.some(m => html.includes(m));
}

/**
 * Garante que a página está em um estado permitido
 * Lanca erro se estado for inesperado
 */
async function ensurePageState(page, allowedStates, context = '') {
    const state = await detectPageState(page);

    if (!allowedStates.includes(state.type)) {
        const err = new Error(`Unexpected page state: ${state.type} (allowed: ${allowedStates.join(', ')})${context ? ` [${context}]` : ''}`);
        err.code = 'PAGE_STATE_MISMATCH';
        err.pageState = state;
        throw err;
    }

    return state;
}

/**
 * Coleta evidências mínimas de falha para logging
 */
async function collectFailureEvidence(page, extra = {}) {
    try {
        const state = await detectPageState(page);
        const html = await page.content().catch(() => '');
        const title = await page.title().catch(() => '');
        const bodyText = await page.locator('body').innerText().catch(() => '');

        return {
            url: state.url,
            state: state.type,
            title: title.slice(0, 200),
            htmlSnippet: html.slice(0, 3000),
            bodySnippet: bodyText.slice(0, 1500),
            timestamp: new Date().toISOString(),
            ...extra,
        };
    } catch (e) {
        return {
            error: 'failed to collect evidence',
            message: e.message,
            ...extra,
        };
    }
}

module.exports = {
    PageState,
    detectPageState,
    ensurePageState,
    hasTspdMarkers,
    collectFailureEvidence,
    isVisible,
};
