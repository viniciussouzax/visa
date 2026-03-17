// ============================================================
// Previous Spouse — Divorced
// Field map for 13-prev-spouse
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPrevSpouseMap(a, ctx) {
    const map = [];

    // ===================================================================
    // PREVIOUS SPOUSE (PrevSpouse page - D marital status only)
    // ===================================================================
    const needsPrevSpouse = a.maritalStatus === "D";
    // Support multiple previous spouses via array (from form clone) or singular object (legacy)
    const prevSpouseEntries = (a.previousSpouses || (a.previousSpouse ? [a.previousSpouse] : []))
      .filter(ps => ps.surname || ps.givenName); // filter out empty entries
    if (needsPrevSpouse && prevSpouseEntries.length > 0) {
      // Number of former spouses
      map.push({ pattern: /NumberOfFormerSpouses$|NUM_PREV_SPOUSES$|ddlNumberPrevSpouses$|tbxNumberPrevSpouses$|tbxNumberOfPrevSpouses$/i, value: prevSpouseEntries[0].numberOfFormerSpouses || String(prevSpouseEntries.length), type: "text" });
    
      prevSpouseEntries.forEach((ps, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "DListSpouse", idx };
        const dom = ps.dateOfMarriage || emptyDate;
        const dome = ps.dateMarriageEnded || emptyDate;
    
        map.push(
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxSURNAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_SURNAME$`, 'i'), value: ps.surname || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxGIVEN_NAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_GIVEN_NAME$`, 'i'), value: ps.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBDay$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBDay$`, 'i'), value: ps.dob?.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBMonth$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBMonth$`, 'i'), value: ps.dob?.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxDOBYear$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_DOBYear$`, 'i'), value: ps.dob?.year || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlSpouseNatDropDownList$|ddlSPOUSE_NATL$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_NATL$`, 'i'), value: ps.nationality || "", type: "select-label", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxSpousePOBCity$|DListSpouse_${ctl}_tbxSPOUSE_POB_CITY$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_CITY$`, 'i'), value: ps.cityOfBirth || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlSpousePOBCountry$|DListSpouse_${ctl}_ddlSPOUSE_POB_CNTRY$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_CNTRY$`, 'i'), value: ps.countryOfBirth || "", type: "select-label", ...base },
          // DOM dates: real IDs use ddlDomDay (values 1-31), ddlDomMonth (values 1-12), txtDomYear
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomDay$|ddlDATE_OF_MARRIAGEDay$|ddlDateOfMarriageDay$|dlPrevSpouse_${ctl}_ddlDOM_DTEDay$`, 'i'), value: dom.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomMonth$|ddlDATE_OF_MARRIAGEMonth$|ddlDateOfMarriageMonth$|dlPrevSpouse_${ctl}_ddlDOM_DTEMonth$`, 'i'), value: dom.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_txtDomYear$|tbxDATE_OF_MARRIAGEYear$|tbxDateOfMarriageYear$|dlPrevSpouse_${ctl}_tbxDOM_DTEYear$`, 'i'), value: dom.year || "", type: "text", ...base },
          // DOME dates: real IDs use ddlDomEndDay (values 1-31), ddlDomEndMonth (values 1-12), txtDomEndYear
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomEndDay$|ddlDATE_MARRIAGE_ENDEDDay$|ddlDateMarriageEndedDay$|dlPrevSpouse_${ctl}_ddlDOME_DTEDay$`, 'i'), value: dome.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomEndMonth$|ddlDATE_MARRIAGE_ENDEDMonth$|ddlDateMarriageEndedMonth$|dlPrevSpouse_${ctl}_ddlDOME_DTEMonth$`, 'i'), value: dome.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_txtDomEndYear$|tbxDATE_MARRIAGE_ENDEDYear$|tbxDateMarriageEndedYear$|dlPrevSpouse_${ctl}_tbxDOME_DTEYear$`, 'i'), value: dome.year || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxHowMarriageEnded$|tbxHOW_MARRIAGE_ENDED$|dlPrevSpouse_${ctl}_tbxHOW_MARRIAGE_ENDED$`, 'i'), value: ps.howMarriageEnded || ps.howEnded || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlMarriageEnded_CNTRY$|ddlCNTRY_MARRIAGE_TERMINATED$|dlPrevSpouse_${ctl}_ddlCNTRY_MARRIAGE_TERMINATED$`, 'i'), value: ps.countryMarriageTerminated || ps.countryTerminated || "", type: "select-label", ...base },
        );
      });
      // Generic fallbacks for single-entry compat (skip for W/widowed — DeceasedSpouse handles it)
      if (prevSpouseEntries.length === 1 && a.maritalStatus !== 'W') {
        const ps = prevSpouseEntries[0];
        map.push(
          { pattern: /FormView1_tbxSURNAME$/i, value: ps.surname, type: "text" },
          { pattern: /FormView1_tbxGIVEN_NAME$/i, value: ps.givenName, type: "text" },
          { pattern: /ddlCOUNTRY_OF_ORIGIN$|ddlSpouseNatDropDownList$/i, value: ps.nationality, type: "select-label" },
          { pattern: /tbxPOB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
          { pattern: /ddlPOB_CNTRY$|ddlPOB_COUNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
        );
      }
    }

    return map;
}

module.exports = { buildPrevSpouseMap };
