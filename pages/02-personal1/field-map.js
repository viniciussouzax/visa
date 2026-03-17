// ============================================================
// Personal 1 — Names, telecode, gender, DOB
// Field map for 02-personal1
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPersonal1Map(a, ctx) {
    const map = [];

    // ===================================================================
    // PERSONAL 1 (order matches official DS-160 form hierarchy)
    // ===================================================================
    // 1. Name fields
    map.push(
      { pattern: /tbxAPP_SURNAME$/i, value: a.surname, type: "text" },
      { pattern: /tbxAPP_GIVEN_NAME$/i, value: a.givenName, type: "text" },
      { pattern: /tbxAPP_FULL_NAME_NATIVE$/i, value: a.fullNameNative, type: "text" },
    );
    
    // 2. Other Names (DListAlias) — supports multiple entries via "Add Another"
    // Pergunta: "Have you ever used other names?" → Yes/No
    // Respostas: otherNames[0] (ctl00), otherNames[1] (ctl01 → addAnother), ...
    if (a.otherNamesUsed && a.otherNames?.length) {
      map.push({ pattern: /rblOtherNames_0$/i, value: "", type: "click" });
    
      a.otherNames.forEach((entry, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "DListAlias", idx };
    
        map.push(
          { pattern: new RegExp(`DListAlias_${ctl}_tbxSURNAME$`, 'i'), value: entry.surname || "", ...base },
          { pattern: new RegExp(`DListAlias_${ctl}_tbxGIVEN_NAME$`, 'i'), value: entry.givenName || "", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblOtherNames_1$/i, value: "", type: "click" });
    }
    
    // 3. Telecode (before Gender/MaritalStatus in official form)
    if (a.telecode && a.telecodeSurname) {
      map.push(
        { pattern: /rblTelecodeQuestion_0$/i, value: "", type: "click" },
        { pattern: /tbxAPP_TelecodeSURNAME$/i, value: a.telecodeSurname, type: "text" },
        { pattern: /tbxAPP_TelecodeGIVEN_NAME$/i, value: a.telecodeGivenName || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblTelecodeQuestion_1$/i, value: "", type: "click" });
    }
    
    // 4. Gender + Marital Status
    map.push(
      { pattern: /ddlAPP_GENDER$/i, value: a.sex, type: "select" },
      { pattern: /ddlAPP_MARITAL_STATUS$/i, value: a.maritalStatus, type: "select" },
    );
    
    // 5. Other Marital Status (conditional, appears after MaritalStatus='O')
    if (a.maritalStatus === "O" && a.otherMaritalStatusText) {
      map.push({ pattern: /tbxOtherMaritalStatus$/i, value: a.otherMaritalStatusText, type: "text" });
    }
    
    // 6. Date and Place of Birth
    map.push(
      { pattern: /ddlDOBDay$/i, value: a.dob.day, type: "select" },
      { pattern: /ddlDOBMonth$/i, value: a.dob.month, type: "select" },
      { pattern: /tbxDOBYear$/i, value: a.dob.year, type: "text" },
      { pattern: /tbxAPP_POB_CITY$/i, value: a.cityOfBirth, type: "text" },
      { pattern: /tbxAPP_POB_ST_PROVINCE$/i, value: a.stateOfBirth, type: "text" },
      { pattern: /ddlAPP_POB_CNTRY$/i, value: a.countryOfBirth, type: "select-label" },
    );

    return map;
}

module.exports = { buildPersonal1Map };
