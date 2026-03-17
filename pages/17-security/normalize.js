// ============================================================
// Security Questions
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeSecurity(data, helpers) {
    const { g } = helpers;

    const sec = data.security || {};
    const fields = [
        'disease', 'disorder', 'drugUser',
        'arrested', 'controlledSubstances', 'prostitution', 'moneyLaundering',
        'humanTrafficking', 'assistedSevereTrafficking', 'humanTraffickingRelated',
        'illegalActivity', 'terroristActivity', 'terroristSupport', 'terroristOrg',
        'terroristRel', 'genocide', 'torture', 'exViolence', 'childSoldier',
        'religiousFreedom', 'populationControls', 'transplant',
        'removalHearing', 'immigrationFraud', 'failToAttend', 'visaViolation', 'deport',
        'childCustody', 'votingViolation', 'renounceExp', 'attWoReimb',
    ];
    const result = {};
    for (const f of fields) {
        result[f] = sec[f] === 'Y';
        result[f + 'Expl'] = sec[f + 'Expl'] || '';
    }
    return { security: result };
}

module.exports = { normalizeSecurity };
