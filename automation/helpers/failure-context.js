// ============================================================
// failure-context.js — Envelope padronizado de falha
// Coleta evidências estruturadas para debugging e logs
// ============================================================

const { collectFailureEvidence } = require('./page-state');

/**
 * Monta um envelope de erro consistente para a automação
 *
 * @param {Error} error - Erro original
 * @param {object} pageState - resultado de detectPageState()
 * @param {string} cause - código da causa (missing_data, captcha_failed, challenge_detected, etc)
 * @param {object} extra - campos extras
 * @returns {object} envelope padronizado
 */
function buildFailureEnvelope(error, pageState, cause, extra = {}) {
    return {
        success: false,
        error: error?.message || String(error),
        stack: error?.stack,
        cause,
        pageState: pageState?.type || 'unknown',
        url: pageState?.url || 'n/a',
        evidence: pageState?.evidence || {},
        timestamp: new Date().toISOString(),
        ...extra,
    };
}

/**
 * Wrapper para capturar erro + evidências em uma única chamada
 *
 * @param {import('playwright').Page} page
 * @param {Function} fn - função que pode falhar
 * @param {string} context - descrição do contexto (ex: 'Landing captcha solve')
 * @returns {Promise<any>} resultado da fn ou throws Error with envelope attached
 */
async function withFailureCapture(page, fn, context = '') {
    try {
        return await fn();
    } catch (error) {
        const evidence = await collectFailureEvidence(page, { context });
        const cause = classifyError(error, evidence);
        const envelope = buildFailureEnvelope(error, { type: evidence.state, url: evidence.url }, cause, {
            context,
            evidence,
        });
        // Throw a proper Error with envelope attached (preserves instanceof Error)
        const enrichedError = new Error(error?.message || String(error));
        enrichedError.name = error?.name || 'AutomationError';
        enrichedError.stack = error?.stack;
        enrichedError.failureEnvelope = envelope;
        enrichedError.cause = cause;
        throw enrichedError;
    }
}

/**
 * Classifica o tipo de erro com base no erro + estado da página
 */
function classifyError(error, evidence) {
    const msg = String(error?.message || '').toLowerCase();

    // Se temos estado explícito de challenge
    if (evidence.state === 'challenge') {
        return 'challenge_detected';
    }

    // Se timed out esperando estado
    if (msg.includes('timeout') || msg.includes('waiting for state')) {
        return 'timeout';
    }

    // Erro de DOM/selector
    if (msg.includes('waiting for locator') || msg.includes('element not found') || msg.includes('no node found')) {
        return 'dom_mismatch';
    }

    // Erro de sessão
    if (msg.includes('session') && msg.includes('expired')) {
        return 'session_expired';
    }

    // Captcha failure
    if (msg.includes('captcha')) {
        return 'captcha_failed';
    }

    // Erro de rede
    if (msg.includes('net::') || msg.includes('econn') || msg.includes('enotfound') || msg.includes('network')) {
        return 'network_error';
    }

    // Erro de validação de dados
    if (msg.includes('validation') || msg.includes('missing data') || msg.includes('dados faltantes')) {
        return 'validation_error';
    }

    return 'unknown_error';
}

/**
 * Decidir se a sessão (browser/page) deve ser descartada após este erro
 *
 * @param {string} cause - código da causa
 * @param {string} pageState - estado da página
 * @returns {boolean}
 */
function shouldDiscardSession(cause, pageState) {
    return (
        pageState === 'challenge' ||
        cause === 'challenge_detected' ||
        cause === 'dom_mismatch' ||
        cause === 'landing_dom_mismatch' ||
        cause === 'recovery_dom_mismatch' ||
        cause === 'session_expired'
    );
}

module.exports = {
    buildFailureEnvelope,
    withFailureCapture,
    classifyError,
    shouldDiscardSession,
};
