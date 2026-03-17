// ============================================================
// Location — Field map (embassy selection)
// This page has only the location/embassy dropdown, no complex mapping needed
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Field map entries (empty — location is set at application start)
 */
function buildLocationMap(a, ctx) {
    // Location/embassy is typically pre-selected at application start,
    // not filled via the field map. Return empty.
    return [];
}

module.exports = { buildLocationMap };
