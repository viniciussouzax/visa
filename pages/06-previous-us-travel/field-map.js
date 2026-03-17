// ============================================================
// Previous US Travel — Visits, DL, visas, refusals
// Field map for 06-previous-us-travel
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPreviousUSTravelMap(a, ctx) {
    const map = [];

    // ===================================================================
    // PREVIOUS US TRAVEL
    // ===================================================================
    // Has been in US? — supports multiple visits via addAnother
    const previousVisits = a.previousVisits || (a.previousUSVisit ? [a.previousUSVisit] : []);
    if (a.hasBeenInUS && previousVisits.length > 0) {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" });
    
      previousVisits.forEach((pv, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dtlPREV_US_VISIT", idx };
        const ad = pv.arrivalDate || {};
    
        map.push(
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEDay$`, 'i'), value: padDay(ad.day), type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEMonth$`, 'i'), value: ad.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_DTEYear$`, 'i'), value: ad.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_LOS$`, 'i'), value: pv.lengthOfStay || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_LOS_CD$`, 'i'), value: pv.lengthOfStayUnit || "", type: "select", ...base },
        );
      });
      // Generic fallback for ctl00
      if (previousVisits.length === 1) {
        const pv = previousVisits[0];
        const ad = pv.arrivalDate || {};
        map.push(
          { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: padDay(ad.day), type: "select" },
          { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: ad.month, type: "select" },
          { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: ad.year, type: "text" },
          { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
          { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
        );
      }
    
      // Driver's licenses — supports multiple via addAnother
      const driversLicenses = a.driversLicenses || (a.previousUSDriversLicenseNumber ? [{ number: a.previousUSDriversLicenseNumber, state: a.previousUSDriversLicenseState }] : []);
      if (a.previousUSDriversLicense && driversLicenses.length > 0) {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" });
    
        driversLicenses.forEach((dl, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = {};
          if (idx > 0) base.addAnother = { list: "dtlUS_DRIVER_LICENSE", idx };
    
          map.push(
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_tbxUS_DRIVER_LICENSE$`, 'i'), value: dl.number || "", type: "text", ...base },
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_ddlUS_DRIVER_LICENSE_STATE$`, 'i'), value: dl.state || "", type: "select", ...base },
          );
        });
        // Generic fallback for ctl00
        if (driversLicenses.length === 1) {
          map.push(
            { pattern: /tbxUS_DRIVER_LICENSE$/i, value: driversLicenses[0].number || "", type: "text" },
            { pattern: /ddlUS_DRIVER_LICENSE_STATE$/i, value: driversLicenses[0].state || "", type: "select" },
          );
        }
      } else {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" });
    }
    
    // Has previous visa?
    if (a.hasUSVisa && a.previousVisa) {
      const visa = a.previousVisa;
      map.push(
        { pattern: /rblPREV_VISA_IND_0$/i, value: "", type: "click" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEDay$/i, value: visa.issueDate.day, type: "select" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEMonth$/i, value: visa.issueDate.month, type: "select" },
        { pattern: /tbxPREV_VISA_ISSUED_DTEYear$/i, value: visa.issueDate.year, type: "text" },
      );
      if (visa.numberNA) {
        map.push({ pattern: /cbexPREV_VISA_FOIL_NUMBER_NA$/i, value: "", type: "checkbox-check" });
      } else {
        map.push({ pattern: /tbxPREV_VISA_FOIL_NUMBER$/i, value: visa.number, type: "text" });
      }
      map.push(
        { pattern: visa.sameType ? /rblPREV_VISA_SAME_TYPE_IND_0$/i : /rblPREV_VISA_SAME_TYPE_IND_1$/i, value: "", type: "click" },
        { pattern: visa.sameCountry ? /rblPREV_VISA_SAME_CNTRY_IND_0$/i : /rblPREV_VISA_SAME_CNTRY_IND_1$/i, value: "", type: "click" },
        { pattern: visa.tenPrint ? /rblPREV_VISA_TEN_PRINT_IND_0$/i : /rblPREV_VISA_TEN_PRINT_IND_1$/i, value: "", type: "click" },
        { pattern: visa.lost ? /rblPREV_VISA_LOST_IND_0$/i : /rblPREV_VISA_LOST_IND_1$/i, value: "", type: "click" },
      );
      // Visa Lost conditional fields (appear after rblPREV_VISA_LOST_IND = Yes postback)
      if (visa.lost) {
        if (visa.lostYear) map.push({ pattern: /tbxPREV_VISA_LOST_YEAR$/i, value: visa.lostYear, type: "text" });
        if (visa.lostExplanation) map.push({ pattern: /tbxPREV_VISA_LOST_EXPL$/i, value: visa.lostExplanation, type: "text" });
      }
      map.push(
        { pattern: visa.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
      );
      // Visa Cancelled conditional fields (appear after rblPREV_VISA_CANCELLED_IND = Yes postback)
      if (visa.cancelled && visa.cancelledExplanation) {
        map.push(
          { pattern: /tbxPREV_VISA_CANCELLED_EXPL$/i, value: visa.cancelledExplanation, type: "text" },
        );
      }
    } else {
      map.push({ pattern: /rblPREV_VISA_IND_1$/i, value: "", type: "click" });
    }
    
    // Visa refused?
    if (a.visaRefused) {
      map.push(
        { pattern: /rblPREV_VISA_REFUSED_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPREV_VISA_REFUSED_EXPL$/i, value: a.visaRefusedExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPREV_VISA_REFUSED_IND_1$/i, value: "", type: "click" });
    }
    
    // Immigrant petition?
    if (a.immigrantPetition) {
      map.push(
        { pattern: /rblIV_PETITION_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxIV_PETITION_EXPL$/i, value: a.immigrantPetitionExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblIV_PETITION_IND_1$/i, value: "", type: "click" });
    }
    
    // Permanent Resident?
    if (a.permanentResident) {
      map.push(
        { pattern: /rblPERM_RESIDENT_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPERM_RESIDENT_EXPL$/i, value: a.permanentResidentExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPERM_RESIDENT_IND_1$/i, value: "", type: "click" });
    }
    
    // VWP (Visa Waiver Program) denial?
    if (a.vwpDenial) {
      map.push(
        { pattern: /rblVWP_DENIAL_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxVWP_DENIAL_EXPL$/i, value: a.vwpDenialExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblVWP_DENIAL_IND_1$/i, value: "", type: "click" });
    }

    return map;
}

module.exports = { buildPreviousUSTravelMap };
