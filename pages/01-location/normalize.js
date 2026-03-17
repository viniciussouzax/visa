// ============================================================
// Location + Meta
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeLocation(data, helpers) {
    const { g } = helpers;

    return {
        location: (() => {
            const loc = data.location;
            if (!loc) return null;
            if (typeof loc === 'string') return loc;
            return loc.location || null;
        })(),
        securityAnswer: data.securityAnswer || data.security_answer || null,
    };
}

module.exports = { normalizeLocation };
