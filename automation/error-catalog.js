// ============================================================
// ERROR CATALOG — Known error patterns → diagnostic actions
// Grows over time as new patterns are discovered
// ============================================================

const CATALOG = [
    // ── FIELD ERRORS ──
    {
        pattern: /no option matching/i,
        cause: 'dropdown_changed',
        severity: 'system',
        action: 'DS-160 mudou opções do dropdown — atualizar values no field-map.js',
        autoRetry: false
    },
    {
        pattern: /element not found.*tbx|element not found.*ddl|element not found.*rbl/i,
        cause: 'field_missing',
        severity: 'system',
        action: 'DS-160 mudou ID do campo — atualizar regex no field-map.js',
        autoRetry: false
    },
    {
        pattern: /field_error:select/i,
        cause: 'select_mismatch',
        severity: 'system',
        action: 'Valor do select não encontrado — verificar mapeamento no field-map.js',
        autoRetry: false
    },

    // ── POSTBACK ERRORS ──
    {
        pattern: /postback.*timeout|postback.*stuck/i,
        cause: 'postback_stuck',
        severity: 'system',
        action: 'Novo postback trigger — adicionar ID ao POSTBACK_SELECT_IDS ou POSTBACK_CLICK_YES_IDS',
        autoRetry: true
    },
    {
        pattern: /page didn.*advance|page.*stuck|stuck.*same page/i,
        cause: 'page_stuck',
        severity: 'system',
        action: 'Página não avançou após preenchimento — verificar validação do DS-160 via screenshot',
        autoRetry: true
    },

    // ── CAPTCHA ERRORS ──
    {
        pattern: /captcha.*failed|captcha.*timeout|captcha.*balance/i,
        cause: 'captcha_failed',
        severity: 'operational',
        action: 'Captcha falhou — verificar saldo CapMonster ou alternar para AI Vision',
        autoRetry: true
    },

    // ── BROWSER ERRORS ──
    {
        pattern: /browser.*closed|target.*closed|context.*destroyed/i,
        cause: 'browser_closed',
        severity: 'operational',
        action: 'Browser crashou — retry automático com novo browser',
        autoRetry: true
    },
    {
        pattern: /net::ERR_|network.*error|ECONNREFUSED|timeout.*navigation/i,
        cause: 'network_error',
        severity: 'operational',
        action: 'Erro de rede — verificar conexão VPS e retry',
        autoRetry: true
    },

    // ── DATA ERRORS ──
    {
        pattern: /validation.*error|required.*field|campo.*obrigat/i,
        cause: 'validation_error',
        severity: 'data',
        action: 'Campo obrigatório ausente — verificar JSON do applicant + normalizeProfile',
        autoRetry: false
    },
    {
        pattern: /missing.*data|dados.*faltantes|campo faltante/i,
        cause: 'missing_data',
        severity: 'data',
        action: 'Dados incompletos — solicitar preenchimento ao cliente via dashboard',
        autoRetry: false
    },
    {
        pattern: /null.*value|undefined.*value|Cannot read prop/i,
        cause: 'null_value',
        severity: 'system',
        action: 'Valor null/undefined — normalizeProfile não está tratando campo correto',
        autoRetry: false
    },

    // ── SESSION ERRORS ──
    {
        pattern: /session.*expired|session.*timeout|please start over/i,
        cause: 'session_expired',
        severity: 'operational',
        action: 'Sessão do DS-160 expirou — retry com novo browser',
        autoRetry: true
    },
    {
        pattern: /identifyPage.*unknown|page.*not recognized/i,
        cause: 'unknown_page',
        severity: 'system',
        action: 'Página desconhecida — DS-160 adicionou nova página ou mudou layout',
        autoRetry: false
    }
];

/**
 * Diagnose an error message against the catalog
 * @param {string} errorMessage - The error message to diagnose
 * @param {string} errorCause - Optional cause already identified by the automation
 * @returns {object} { match, cause, severity, action, autoRetry }
 */
function diagnose(errorMessage, errorCause) {
    if (!errorMessage) return { match: false, cause: 'unknown', severity: 'unknown', action: 'Erro sem mensagem — investigar logs', autoRetry: false };

    // First try to match by errorCause if provided
    if (errorCause) {
        const byCause = CATALOG.find(c => c.cause === errorCause);
        if (byCause) return { match: true, ...byCause };
    }

    // Then try pattern matching
    for (const entry of CATALOG) {
        if (entry.pattern.test(errorMessage)) {
            return { match: true, ...entry };
        }
    }

    return {
        match: false,
        cause: errorCause || 'unknown',
        severity: 'unknown',
        action: `Erro novo não catalogado: "${errorMessage.slice(0, 100)}" — adicionar ao catálogo`,
        autoRetry: false
    };
}

/**
 * Get statistics about error patterns
 * @returns {object} { total, bySeverity, autoRetryable }
 */
function getStats() {
    return {
        total: CATALOG.length,
        bySeverity: {
            system: CATALOG.filter(c => c.severity === 'system').length,
            operational: CATALOG.filter(c => c.severity === 'operational').length,
            data: CATALOG.filter(c => c.severity === 'data').length,
        },
        autoRetryable: CATALOG.filter(c => c.autoRetry).length
    };
}

module.exports = { CATALOG, diagnose, getStats };
