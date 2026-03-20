// ============================================================
// page-guards.js — Validações de pré-condição (Guard pattern)
// Garante que a automação só procede se o estado da página for válido
// ============================================================

const { detectPageState, ensurePageState } = require('./page-state');

/**
 * Guard: aguarda até que a página atinja um estado permitido
 * Útil para transições pós-navegação
 *
 * @param {import('playwright').Page} page
 * @param {string[]} allowedStates
 * @param {object} opts
 * @param {number} opts.timeoutMs - timeout total
 * @param {number} opts.pollInterval - intervalo de polling
 * @returns {Promise<{type: string, url: string}>}
 */
async function waitForState(page, allowedStates, { timeoutMs = 15000, pollInterval = 300 } = {}) {
    const start = Date.now();
    let lastState = null;

    while (Date.now() - start < timeoutMs) {
        const state = await detectPageState(page);
        lastState = state;

        if (allowedStates.includes(state.type)) {
            return state;
        }

        // Se caiu em challenge, fail rápido — não adianta esperar
        if (state.type === 'challenge') {
            const err = new Error(`Challenge detected (TSPD/Akamai)`);
            err.code = 'CHALLENGE_DETECTED';
            err.pageState = state;
            throw err;
        }

        await new Promise(r => setTimeout(r, pollInterval));
    }

    const err = new Error(`Timeout waiting for state ${allowedStates.join(', ')}. Last: ${lastState?.type}`);
    err.code = 'STATE_TIMEOUT';
    err.pageState = lastState;
    throw err;
}

/**
 * Guard: valida que a landing está em estado correto antes de prosseguir
 */
async function ensureLandingReady(page, context = '') {
    return ensurePageState(page, ['landing_ready', 'landing_partial'], context);
}

/**
 * Guard: valida que o recovery está em estado correto
 */
async function ensureRecoveryState(page, context = '') {
    return ensurePageState(page, ['recovery_captcha', 'recovery_questions'], context);
}

/**
 * Guard: valida que não está em challenge
 */
async function ensureNoChallenge(page, context = '') {
    const state = await detectPageState(page);
    if (state.type === 'challenge') {
        const err = new Error(`Challenge detected${context ? ` [${context}]` : ''}`);
        err.code = 'CHALLENGE_DETECTED';
        err.pageState = state;
        throw err;
    }
    return state;
}

module.exports = {
    waitForState,
    ensureLandingReady,
    ensureRecoveryState,
    ensureNoChallenge,
};
