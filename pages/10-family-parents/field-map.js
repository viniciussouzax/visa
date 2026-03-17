// ============================================================
// Family — Parents, spouse, relatives in US
// Field map for 10-family-parents
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildFamilyParentsMap(a, ctx) {
    const map = [];
    const { father, mother, spouse } = ctx;

    // ===================================================================
    // FAMILY
    // ===================================================================
    if (a.father.nameUnknown) {
      map.push(
        { pattern: /cbxFATHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxFATHER_SURNAME$/i, value: a.father.surname, type: "text" },
        { pattern: /tbxFATHER_GIVEN_NAME$/i, value: a.father.givenName, type: "text" },
      );
    }
    if (a.father.dobUnknown) {
      map.push(
        { pattern: /cbxFATHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFathersDOBUNK$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFathersDOBUNK$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /ddlFathersDOBDay$/i, value: a.father.dob.day, type: "select" },
        { pattern: /ddlFathersDOBMonth$/i, value: a.father.dob.month, type: "select" },
        { pattern: /tbxFathersDOBYear$/i, value: a.father.dob.year, type: "text" },
        { pattern: /ddlFATHER_DOBDay$/i, value: a.father.dob.day, type: "select" },
        { pattern: /ddlFATHER_DOBMonth$/i, value: a.father.dob.month, type: "select" },
        { pattern: /tbxFATHER_DOBYear$/i, value: a.father.dob.year, type: "text" },
      );
    }
    if (a.mother.nameUnknown) {
      map.push(
        { pattern: /cbxMOTHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxMOTHER_SURNAME$/i, value: a.mother.surname, type: "text" },
        { pattern: /tbxMOTHER_GIVEN_NAME$/i, value: a.mother.givenName, type: "text" },
      );
    }
    if (a.mother.dobUnknown) {
      map.push(
        { pattern: /cbxMOTHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMothersDOBUNK$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMothersDOBUNK$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /ddlMothersDOBDay$/i, value: a.mother.dob.day, type: "select" },
        { pattern: /ddlMothersDOBMonth$/i, value: a.mother.dob.month, type: "select" },
        { pattern: /tbxMothersDOBYear$/i, value: a.mother.dob.year, type: "text" },
        { pattern: /ddlMOTHER_DOBDay$/i, value: a.mother.dob.day, type: "select" },
        { pattern: /ddlMOTHER_DOBMonth$/i, value: a.mother.dob.month, type: "select" },
        { pattern: /tbxMOTHER_DOBYear$/i, value: a.mother.dob.year, type: "text" },
      );
    }
    
    // Father in US
    if (a.father.inUS === 'Y' || a.father.inUS === true) {
      map.push(
        { pattern: /rblFATHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" },
        { pattern: /rblFATHER_US_0$/i, value: "", type: "click" },
        { pattern: /ddlFATHER_US_STATUS$/i, value: a.father.usStatus || "S", type: "select" },
      );
    } else {
      map.push(
        { pattern: /rblFATHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" },
        { pattern: /rblFATHER_US_1$/i, value: "", type: "click" },
      );
    }
    
    // Mother in US
    if (a.mother.inUS === 'Y' || a.mother.inUS === true) {
      map.push(
        { pattern: /rblMOTHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" },
        { pattern: /rblMOTHER_US_0$/i, value: "", type: "click" },
        { pattern: /ddlMOTHER_US_STATUS$/i, value: a.mother.usStatus || "S", type: "select" },
      );
    } else {
      map.push(
        { pattern: /rblMOTHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" },
        { pattern: /rblMOTHER_US_1$/i, value: "", type: "click" },
      );
    }
    
    // Spouse (Family2 page) - only for M/C/P/L marital status
    // Actual IDs: tbxSpouseSurname, tbxSpouseGivenName, ddlSpouseNatDropDownList,
    //             ddlSpousePOBCountry, tbxSpousePOBCity, ddlSpouseAddressType
    // DOB uses generic ddlDOBDay/ddlDOBMonth/tbxDOBYear (handled via page override in fill-form)
    const needsSpouse = ["M", "C", "P", "L"].includes(a.maritalStatus);
    if (needsSpouse && a.spouse) {
      map.push(
        { pattern: /tbxSpouseSurname$/i, value: a.spouse.surname, type: "text" },
        { pattern: /tbxSpouseGivenName$/i, value: a.spouse.givenName, type: "text" },
        { pattern: /ddlSpouseNatDropDownList$/i, value: a.spouse.nationality || a.nationality, type: "select-label" },
        { pattern: /ddlSpousePOBCountry$/i, value: a.spouse.pobCountry || a.spouse.nationality || a.nationality, type: "select-label" },
        { pattern: /tbxSpousePOBCity$/i, value: a.spouse.cityOfBirth || "", type: "text" },
        { pattern: /ddlSpouseAddressType$/i, value: a.spouse.addressType || "H", type: "select" },
      );
      // Spouse address fields when addressType = "O" (Other)
      if (a.spouse.addressType === "O" && a.spouse.address) {
        const sa = a.spouse.address;
        map.push(
          { pattern: /SPOUSE_ADDR_LN1$|SpouseAddr1$|_tbxADDR_LN1$/i, value: sa.street1, type: "text" },
          { pattern: /SPOUSE_ADDR_LN2$|SpouseAddr2$|_tbxADDR_LN2$/i, value: sa.street2 || "", type: "text" },
          { pattern: /SPOUSE_ADDR_CITY$|SpouseCity$|_tbxADDR_CITY$/i, value: sa.city, type: "text" },
          { pattern: /SPOUSE_ADDR_STATE$|SpouseState$|_tbxADDR_STATE$/i, value: sa.state || "", type: "text" },
          { pattern: /SPOUSE_ADDR_POSTAL_CD$|SpousePostalCd$|_tbxPOSTAL_CD$/i, value: sa.postalCode || "", type: "text" },
          { pattern: /SPOUSE_ADDR_CNTRY$|SpouseAddrCntry$|_ddlSPOUSE_ADDR_CNTRY$/i, value: sa.country, type: "select-label" },
        );
      }
    } else {
      map.push(
        { pattern: /cbexSPOUSE_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexSPOUSE_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    }
    
    // Immediate relatives in US (dlUSRelatives) — supports multiple entries
    // Pergunta: "Do you have any immediate relatives in the US?" → Yes/No
    // Respostas: relatives[0] (ctl00), relatives[1] (ctl01 → addAnother), ...
    const usRelatives = a.relatives || (a.immediateRelative ? [a.immediateRelative] : []);
    if ((a.relativesInUS || a.immediateRelativesInUS) && usRelatives.length > 0) {
      map.push({ pattern: /rblUS_IMMED_RELATIVE_IND_0$/i, value: "", type: "click" });
    
      usRelatives.forEach((rel, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dlUSRelatives", idx };
    
        map.push(
          { pattern: new RegExp(`dlUSRelatives_${ctl}_tbxUS_REL_SURNAME$`, 'i'), value: rel.surname || "", type: "text", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_tbxUS_REL_GIVEN_NAME$`, 'i'), value: rel.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_ddlUS_REL_TYPE$`, 'i'), value: rel.type || rel.relationship || "", type: "select", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_ddlUS_REL_STATUS$`, 'i'), value: rel.status || "", type: "select", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblUS_IMMED_RELATIVE_IND_1$/i, value: "", type: "click" });
      // OTHER_RELATIVE only appears when IMMED=NO
      if (a.otherRelativesInUS) {
        map.push({ pattern: /rblUS_OTHER_RELATIVE_IND_0$/i, value: "", type: "click" });
      } else {
        map.push({ pattern: /rblUS_OTHER_RELATIVE_IND_1$/i, value: "", type: "click" });
      }
    }

    return map;
}

module.exports = { buildFamilyParentsMap };
