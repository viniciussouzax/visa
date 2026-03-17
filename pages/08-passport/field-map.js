// ============================================================
// Passport — Type, number, dates, lost
// Field map for 08-passport
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPassportMap(a, ctx) {
    const map = [];
    const { pp } = ctx;

    // ===================================================================
    // PASSPORT
    // ===================================================================
    map.push(
      { pattern: /ddlPPT_TYPE$/i, value: pp.type, type: "select" },
    );
    
    // Passport type explanation (for "T" = Other/Travel Document)
    if (pp.type === "T" && pp.typeExplanation) {
      map.push({ pattern: /tbxPptOtherExpl$/i, value: pp.typeExplanation, type: "text" });
    }
    
    map.push(
      { pattern: /tbxPPT_NUM$/i, value: pp.number, type: "text" },
      { pattern: /ddlPPT_ISSUED_CNTRY$/i, value: pp.issuingCountry, type: "select-label" },
      { pattern: /tbxPPT_ISSUED_IN_CITY$/i, value: pp.issuedCity, type: "text" },
      { pattern: /tbxPPT_ISSUED_IN_STATE$/i, value: pp.issuedState, type: "text" },
      { pattern: /ddlPPT_ISSUED_IN_CNTRY$/i, value: pp.issuedCountry, type: "select-label" },
      // ddlCountry on Passport page = "Where was passport issued - Country/Region"
      { pattern: /ddlCountry$/i, value: pp.issuedCountry, type: "select-label" },
      // Issuance date — DS-160 uses both ddlPPT_ISSUED_DTEDay and ddlPPT_ISSUEDDay variants
      { pattern: /ddlPPT_ISSUED(_DTE)?Day$/i, value: pp.issuanceDate.day, type: "select" },
      { pattern: /ddlPPT_ISSUED(_DTE)?Month$/i, value: pp.issuanceDate.month, type: "select" },
      { pattern: /tbxPPT_ISSUED(_DTE)?Year$/i, value: pp.issuanceDate.year, type: "text" },
      // Expiration date — DS-160 uses both ddlPPT_EXPIRE_DTEDay and ddlPPT_EXPIREDay variants
      { pattern: /ddlPPT_EXPIRE(_DTE)?Day$/i, value: pp.expirationDate.day, type: "select" },
      { pattern: /ddlPPT_EXPIRE(_DTE)?Month$/i, value: pp.expirationDate.month, type: "select" },
      { pattern: /tbxPPT_EXPIRE(_DTE)?Year$/i, value: pp.expirationDate.year, type: "text" },
    );
    
    // Book number
    if (pp.bookNumber) {
      map.push({ pattern: /tbxPPT_BOOK_NUM$/i, value: pp.bookNumber, type: "text" });
    } else {
      map.push(
        { pattern: /cbexPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" },
      );
    }
    
    // Lost/Stolen passport (dtlLostPPT) — supports multiple entries
    // Pergunta: "Have you ever lost a passport?" → Yes/No
    // Respostas: lostPassports[0] (ctl00), [1] (ctl01 → addAnother), ...
    const lostPassports = pp.lostPassports || (pp.lostPassport ? [pp.lostPassport] : []);
    if ((pp.lostOrStolen === 'Y' || pp.lostOrStolen === true) && lostPassports.length > 0) {
      map.push({ pattern: /rblLOST_PPT_IND_0$/i, value: "", type: "click" });
    
      lostPassports.forEach((lp, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dtlLostPPT", idx };
    
        const lostNum = lp.number;
        if (lostNum && lostNum !== 'N/A' && lostNum !== 'n/a' && !lp.numberUnknown) {
          map.push({ pattern: new RegExp(`dtlLostPPT_${ctl}_tbxLOST_PPT_NUM$`, 'i'), value: lostNum, type: "text", ...base });
        } else {
          map.push({ pattern: new RegExp(`dtlLostPPT_${ctl}_cbxLOST_PPT_NUM_UNKN_IND$`, 'i'), value: "", type: "checkbox-check", ...base });
        }
        map.push(
          { pattern: new RegExp(`dtlLostPPT_${ctl}_ddlLOST_PPT_NATL$`, 'i'), value: lp.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlLostPPT_${ctl}_tbxLOST_PPT_EXPL$`, 'i'), value: lp.explanation || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblLOST_PPT_IND_1$/i, value: "", type: "click" });
    }

    return map;
}

module.exports = { buildPassportMap };
