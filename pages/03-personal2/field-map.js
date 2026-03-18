// ============================================================
// Personal 2 — Nationality, perm resident, IDs
// Field map for 03-personal2
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPersonal2Map(a, ctx) {
    const map = [];

    // ===================================================================
    // PERSONAL 2 (order matches official DS-160 form hierarchy)
    // ===================================================================
    // 1. Nationality
    map.push(
      { pattern: /ddlAPP_NATL$/i, value: a.nationality, type: "select-label" },
    );
    
    // 2. Other Nationality — supports multiple entries via "Add Another"
    if (a.otherNationality) {
      map.push({ pattern: /rblAPP_OTH_NATL_IND_0$/i, value: "", type: "click" });
    
      if (a.otherNationalities?.length > 0) {
        a.otherNationalities.forEach((entry, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          if (idx > 0) {
            map.push({
              pattern: new RegExp(`dtlOTHER_NATL_${ctl}_ddlOTHER_NATL$`, 'i'),
              value: entry.country || "",
              type: "select-label",
              addAnother: { list: "dtlOTHER_NATL", buttonPattern: /btnAdd.*NATL|lnkAdd.*NATL|btnAddOTHER_NATL/i, idx }
            });
          } else {
            map.push({ pattern: new RegExp(`dtlOTHER_NATL_${ctl}_ddlOTHER_NATL$`, 'i'), value: entry.country || "", type: "select-label" });
          }
      
          if (entry.hasPassport === 'Y') {
            map.push(
              { pattern: new RegExp(`dtlOTHER_NATL_${ctl}_rblOTHER_PPT_IND_0$`, 'i'), value: "", type: "click" },
              { pattern: new RegExp(`dtlOTHER_NATL_${ctl}_tbxOTHER_PPT_NUM$`, 'i'), value: entry.passportNumber || "", type: "text" },
            );
          } else {
            map.push({ pattern: new RegExp(`dtlOTHER_NATL_${ctl}_rblOTHER_PPT_IND_1$`, 'i'), value: "", type: "click" });
          }
        });
      }
    } else {
      map.push({ pattern: /rblAPP_OTH_NATL_IND_1$/i, value: "", type: "click" });
    }
    
    // 3. Permanent Resident Other Country — supports multiple entries via "Add Another"
    if (a.permanentResidentOtherCountry) {
      map.push({ pattern: /rblPermResOtherCntryInd_0$/i, value: "", type: "click" });
    
      if (a.permanentResidentCountries?.length > 0) {
        a.permanentResidentCountries.forEach((entry, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          if (idx > 0) {
            map.push({
              pattern: new RegExp(`dtlOthPermResCntry_${ctl}_ddlOthPermResCntry$`, 'i'),
              value: entry.country || "",
              type: "select-label",
              addAnother: { list: "dtlOthPermResCntry", buttonPattern: /btnAdd.*PermRes|lnkAdd.*PermRes|btnAddPerm/i, idx }
            });
          } else {
            map.push({ pattern: new RegExp(`dtlOthPermResCntry_${ctl}_ddlOthPermResCntry$`, 'i'), value: entry.country || "", type: "select-label" });
          }
        });
      }
    } else {
      map.push({ pattern: /rblPermResOtherCntryInd_1$/i, value: "", type: "click" });
    }
    
    // 4. National ID (CPF)
    map.push(
      { pattern: /tbxAPP_NATIONAL_ID$/i, value: a.nationalId, type: "text" },
    );
    
    // 5. SSN
    if (a.usSsn) {
      map.push({ pattern: /tbxAPP_SSN1$/i, value: a.usSsn.slice(0, 3), type: "text" });
      map.push({ pattern: /tbxAPP_SSN2$/i, value: a.usSsn.slice(3, 5), type: "text" });
      map.push({ pattern: /tbxAPP_SSN3$/i, value: a.usSsn.slice(5, 9), type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_SSN_NA$/i, value: "", type: "checkbox-check" });
    }
    
    // 6. Tax ID
    if (a.usTaxpayerId) {
      map.push({ pattern: /tbxAPP_TAX_ID$/i, value: a.usTaxpayerId, type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_TAX_ID_NA$/i, value: "", type: "checkbox-check" });
    }

    return map;
}

module.exports = { buildPersonal2Map };
