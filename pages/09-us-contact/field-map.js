// ============================================================
// US Contact — Name, address, phone, email
// Field map for 09-us-contact
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildUSContactMap(a, ctx) {
    const map = [];
    const { uc } = ctx;

    // ===================================================================
    // US CONTACT
    // ===================================================================
    // Name: fill text OR mark "Do Not Know" checkbox
    if (uc.nameDoNotKnow) {
      map.push(
        { pattern: /cbxUS_POC_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxUS_POC_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_SURNAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxUS_POC_SURNAME$/i, value: uc.surname, type: "text" },
        { pattern: /tbxUS_POC_GIVEN_NAME$/i, value: uc.givenName, type: "text" },
      );
    }
    // Organization: fill text OR mark "Do Not Know" checkbox
    if (uc.orgDoNotKnow) {
      map.push(
        { pattern: /cbxUS_POC_ORG_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_ORG_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxUS_POC_ORG_NA_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_ORG_NA_IND$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxUS_POC_ORGANIZATION$/i, value: uc.organization || uc.surname, type: "text" },
      );
    }
    // Pad ZIP to 5 digits for US format (e.g. 8244 → 08244)
    const ucZip = uc.zip ? uc.zip.toString().padStart(5, '0') : '';
    map.push(
      { pattern: /tbxUS_POC_ADDR_LN1$/i, value: uc.street1, type: "text" },
      { pattern: /tbxUS_POC_ADDR_LN2$/i, value: uc.street2 || '', type: "text" },
      { pattern: /tbxUS_POC_ADDR_CITY$/i, value: uc.city, type: "text" },
      { pattern: /ddlUS_POC_ADDR_STATE$/i, value: uc.state, type: "select" },
      { pattern: /tbxUS_POC_ADDR_POSTAL_CD$/i, value: ucZip, type: "text" },
      { pattern: /tbxUS_POC_HOME_TEL$/i, value: ph(uc.phone), type: "text" },
      { pattern: /ddlUS_POC_REL_TO_APP$/i, value: uc.relationship, type: "select" },
      { pattern: /ddlUS_POC_REL$/i, value: uc.relationship, type: "select" },
    );
    if (uc.email) {
      map.push({ pattern: /tbxUS_POC_EMAIL_ADDR$/i, value: uc.email, type: "text" });
    } else {
      map.push(
        { pattern: /cbxUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" },
      );
    }

    return map;
}

module.exports = { buildUSContactMap };
