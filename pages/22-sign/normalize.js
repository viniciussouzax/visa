// ============================================================
// Sign and Submit — Normalize (automação only)
// ============================================================

/**
 * @param {Object} data - Raw applicant data
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized fields for sign page
 */
function normalizeSign(data, helpers) {
    const { g } = helpers;

    return {
        passportNumber: g(data, 'passport.passportNumber') || '',
        securityAnswer: data.securityAnswer || data.security_answer || '',
    };
}

module.exports = { normalizeSign };
