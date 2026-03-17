// ============================================================
// Deceased Spouse — Widowed
// Field map for 12-deceased-spouse
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildDeceasedSpouseMap(a, ctx) {
    const map = [];

    // ===================================================================
    // DECEASED SPOUSE (DeceasedSpouse page - W marital status)
    // ===================================================================
    if (a.maritalStatus === 'W' && a.deceasedSpouse) {
      const ds = a.deceasedSpouse;
      map.push(
        { pattern: /tbxDECEASED_SPOUSE_SURNAME$|tbxSpouseSurname$|tbxSURNAME$/i, value: ds.surname, type: "text" },
        { pattern: /tbxDECEASED_SPOUSE_GIVEN_NAME$|tbxSpouseGivenName$|tbxGIVEN_NAME$/i, value: ds.givenName, type: "text" },
        { pattern: /ddlDECEASED_SPOUSE_DOBDay$|ddlSpouseDOBDay$|ddlDOBDay$/i, value: ds.dob?.day || "", type: "select" },
        { pattern: /ddlDECEASED_SPOUSE_DOBMonth$|ddlSpouseDOBMonth$|ddlDOBMonth$/i, value: ds.dob?.month || "", type: "select" },
        { pattern: /tbxDECEASED_SPOUSE_DOBYear$|tbxSpouseDOBYear$|tbxDOBYear$/i, value: ds.dob?.year || "", type: "text" },
        { pattern: /ddlDECEASED_SPOUSE_NATL$|ddlSpouseNatDropDownList$/i, value: ds.nationality, type: "select-label" },
        { pattern: /ddlDECEASED_SPOUSE_POB_CNTRY$|ddlSpousePOBCountry$/i, value: ds.countryOfBirth, type: "select-label" },
      );
      if (ds.cityOfBirth) {
        map.push(
          { pattern: /tbxDECEASED_SPOUSE_POB_CITY$|tbxSpousePOBCity$/i, value: ds.cityOfBirth, type: "text" },
        );
      } else {
        map.push(
          { pattern: /cbxSPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbexSPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbxDECEASED_SPOUSE_POB_CITY_NA$|cbexDECEASED_SPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbxPOB_CITY_NA$|cbexPOB_CITY_NA$/i, value: "", type: "checkbox-check" },
        );
      }
    }

    return map;
}

module.exports = { buildDeceasedSpouseMap };
