// ============================================================
// Travel Companions
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeTravelCompanions(data, helpers) {
    const { g } = helpers;

    const tc = data.travelCompanions || {};
    const comps = tc.companions || [];
    const seen = new Set();
    return {
        travelingWithOthers: tc.travelingWithOthers === 'Y' || tc.traveling_with_others === 'Y',
        companions: comps.filter(c => {
            const key = `${(c.surname || '').toUpperCase()}|${(c.givenName || '').toUpperCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }),
        partOfGroup: tc.partOfGroup === 'Y' || tc.part_of_group === 'Y',
        groupName: tc.groupName || tc.group_name || '',
    };
}

module.exports = { normalizeTravelCompanions };
