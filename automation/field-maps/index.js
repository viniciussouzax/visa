// ============================================================
// FIELD MAP ROUTER — Selects the correct field map by visa type
// Supports: B, F, J, O (modular architecture)
// ============================================================

const path = require('path');

// HOT-RELOAD: Clear require cache for all field-map modules
function clearFieldMapCache() {
    const fieldMapsDir = __dirname;
    const pagesDir = path.join(__dirname, '..', '..', 'pages');
    Object.keys(require.cache).forEach(key => {
        if (key.startsWith(fieldMapsDir) || key.startsWith(pagesDir)) {
            delete require.cache[key];
        }
    });
}

// Load modular field maps
const b1b2Modular = require('./b1-b2-modular');
const { isPostbackSelect, isPostbackClick, POSTBACK_SELECT_IDS, POSTBACK_CLICK_YES_IDS, POSTBACK_CLICK_ANY_IDS } = require('./shared');

// Extra page builders for F/J (student) and O (petition)
const { buildStudentExchangeMap } = require('../../pages/18-student-exchange/field-map');
const { buildTemporaryWorkMap } = require('../../pages/19-petition-info/field-map');
const { buildStudentAddContactMap } = require('../../pages/19a-student-add-contact/field-map');

/**
 * Build field map for the given applicant data
 * Auto-detects visa type, applies extra pages for F/J/O
 * HOT-RELOAD: Clears require cache before loading to pick up code changes
 */
function buildDynamicFieldMap(applicantData, visaType) {
    // HOT-RELOAD
    clearFieldMapCache();

    // Build base B1/B2 map (all visas share these pages)
    const freshModular = require('./b1-b2-modular');
    const map = freshModular.buildDynamicFieldMap(applicantData);

    // Determine visa type
    const type = (visaType || applicantData?.purposeOfTrip || 'B1/B2').toUpperCase();

    // Add extra pages based on visa type
    const ctx = {}; // minimal ctx for extras
    if (['F1', 'F2', 'J1', 'J2'].some(v => type.includes(v)) || ['F', 'J', 'M'].includes(type.charAt(0))) {
        map.push(...buildStudentExchangeMap(applicantData, ctx));
        // Additional Contact page — only for F1/J1 principal applicants (not F2/J2 dependents)
        if (['F1', 'J1'].some(v => type.includes(v)) || (type.charAt(0) === 'F' && !type.includes('2')) || (type.charAt(0) === 'J' && !type.includes('2'))) {
            map.push(...buildStudentAddContactMap(applicantData, ctx));
        }
    }
    if (['O1', 'O2', 'O3'].some(v => type.includes(v)) || type.charAt(0) === 'O') {
        map.push(...buildTemporaryWorkMap(applicantData, ctx));
    }

    return map;
}

// Re-export everything for backward compatibility
module.exports = {
    buildDynamicFieldMap,
    isPostbackSelect,
    isPostbackClick,
    POSTBACK_SELECT_IDS,
    POSTBACK_CLICK_YES_IDS,
    POSTBACK_CLICK_ANY_IDS,
};
