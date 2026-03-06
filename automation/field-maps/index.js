// ============================================================
// FIELD MAP ROUTER — Selects the correct field map by visa type
// Currently only B1/B2 is supported
// To add a new visa: create field-maps/f1-student.js, add here
// ============================================================

const b1b2 = require('./b1-b2');

const VISA_MAPS = {
    'B1/B2': b1b2,
    'B1': b1b2,
    'B2': b1b2,
    // Future:
    // 'F1': require('./f1-student'),
    // 'H1B': require('./h1b-work'),
};

/**
 * Build field map for the given applicant data
 * Auto-detects visa type from data, defaults to B1/B2
 */
function buildDynamicFieldMap(applicantData, visaType) {
    const type = visaType || applicantData?.purposeOfTrip || 'B1/B2';
    const map = VISA_MAPS[type] || b1b2; // Default to B1/B2
    return map.buildDynamicFieldMap(applicantData);
}

// Re-export everything for backward compatibility
module.exports = {
    buildDynamicFieldMap,
    isPostbackSelect: b1b2.isPostbackSelect,
    isPostbackClick: b1b2.isPostbackClick,
    POSTBACK_SELECT_IDS: b1b2.POSTBACK_SELECT_IDS,
    POSTBACK_CLICK_YES_IDS: b1b2.POSTBACK_CLICK_YES_IDS,
    POSTBACK_CLICK_ANY_IDS: b1b2.POSTBACK_CLICK_ANY_IDS,
    // Expose visa maps for testing
    VISA_MAPS,
};
