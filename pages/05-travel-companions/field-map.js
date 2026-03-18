// ============================================================
// Travel Companions
// Field map for 05-travel-companions
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildTravelCompanionsMap(a, ctx) {
    const map = [];

    // ===================================================================
    // TRAVEL COMPANIONS
    // ===================================================================
    // Travel Companions (dlTravelCompanions) — supports multiple entries
    // Pergunta: "Are there other persons traveling with you?" → Yes/No
    // Respostas: companions[0] (ctl00), companions[1] (ctl01 → addAnother), ...
    if (a.travelingWithOthers) {
      map.push({ pattern: /rblOtherPersonsTravelingWithYou_0$/i, value: "", type: "click" });
    
      if (a.companions?.length > 0) {
        a.companions.forEach((comp, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = {};
          if (idx > 0) base.addAnother = { list: "dlTravelCompanions", idx };
      
          map.push(
            { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxSurname$`, 'i'), value: comp.surname || "", type: "text", ...base },
            { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_SURNAME$`, 'i'), value: comp.surname || "", type: "text", ...base },
            { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxGivenName$`, 'i'), value: comp.givenName || "", type: "text", ...base },
            { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_GIVEN_NAME$`, 'i'), value: comp.givenName || "", type: "text", ...base },
            { pattern: new RegExp(`dlTravelCompanions_${ctl}_ddlTCRelationship$`, 'i'), value: comp.relationship || "", type: "select", ...base },
          );
          if (idx === 0) {
            map.push(
              { pattern: /dlTravelCompanions_ctl00_tbxSurname$/i, value: comp.surname || "", type: "text" },
              { pattern: /dlTravelCompanions_ctl00_tbxTC_SURNAME$/i, value: comp.surname || "", type: "text" },
              { pattern: /dlTravelCompanions_ctl00_tbxGivenName$/i, value: comp.givenName || "", type: "text" },
              { pattern: /dlTravelCompanions_ctl00_tbxTC_GIVEN_NAME$/i, value: comp.givenName || "", type: "text" },
              { pattern: /dlTravelCompanions_ctl00_ddlTCRelationship$/i, value: comp.relationship || "", type: "select" },
            );
          }
        });
      }
    
      if ((a.partOfGroup === 'Y' || a.partOfGroup === true) && a.groupName) {
        map.push(
          { pattern: /rblGroupTravel_0$/i, value: "", type: "click" },
          { pattern: /tbxGroupName$/i, value: a.groupName, type: "text" },
        );
      } else {
        map.push({ pattern: /rblGroupTravel_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblOtherPersonsTravelingWithYou_1$/i, value: "", type: "click" });
      map.push({ pattern: /rblGroupTravel_1$/i, value: "", type: "click" });
    }

    return map;
}

module.exports = { buildTravelCompanionsMap };
