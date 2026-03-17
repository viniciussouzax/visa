// ============================================================
// Family — Spouse (Married / Civil Partnership)
// Field map for 11-family-spouse
// DS-160 IDs aligned with ds160-schema.js L3195-3300
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (includes ctx.spouse)
 * @returns {Array} Field map entries
 */
function buildFamilySpouseMap(a, ctx) {
    const map = [];
    const { spouse } = ctx;

    if (!spouse || (!spouse.surname && !spouse.givenName)) return map;

    // Core spouse fields
    map.push(
        { pattern: /tbxSpouseSurname$/i, value: spouse.surname || '', type: 'text' },
        { pattern: /tbxSpouseGivenName$/i, value: spouse.givenName || '', type: 'text' },
    );

    // DOB — DS-160 uses ddlDOBDay (with leading zero: '01'-'31'),
    //        ddlDOBMonth (abbreviation: 'JAN'-'DEC'), tbxDOBYear
    //        Note: NO "Spouse" prefix on these IDs in the official form!
    const dob = spouse.dob || {};
    const MONTH_ABBR = { '1':'JAN','2':'FEB','3':'MAR','4':'APR','5':'MAY','6':'JUN',
        '7':'JUL','8':'AUG','9':'SEP','10':'OCT','11':'NOV','12':'DEC' };
    const dobMonth = dob.month ? (MONTH_ABBR[String(dob.month)] || dob.month) : '';
    const dobDay = dob.day ? String(dob.day).padStart(2, '0') : '';
    map.push(
        { pattern: /ddlDOBDay$/i, value: dobDay, type: 'select' },
        { pattern: /ddlDOBMonth$/i, value: dobMonth, type: 'select' },
        { pattern: /tbxDOBYear$/i, value: dob.year || '', type: 'text' },
    );

    // Nationality — Schema ds160: ddlSpouseNatDropDownList
    map.push(
        { pattern: /ddlSpouseNat/i, value: spouse.nationality || '', type: 'select-label' },
    );

    // Place of birth
    map.push(
        { pattern: /tbxSpousePOBCity$/i, value: spouse.cityOfBirth || '', type: 'text' },
        { pattern: /ddlSpousePOBCountry$/i, value: spouse.countryOfBirth || '', type: 'select-label' },
    );

    // Address type (Y = same, N = different)
    map.push(
        { pattern: /ddlSpouseAddressType$/i, value: spouse.addressType || '', type: 'select' },
    );

    // Spouse address — only when address type is different (not same as applicant)
    if (spouse.address1 || spouse.city || spouse.country) {
        map.push(
            // Schema: ddlSPOUSE_ADDR_CNTRY
            { pattern: /ddlSPOUSE_ADDR_CNTRY$/i, value: spouse.country || '', type: 'select-label' },
            // Schema: tbxSPOUSE_ADDR_POSTAL_CD
            { pattern: /tbxSPOUSE_ADDR_POSTAL_CD$/i, value: spouse.zip || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_LN1
            { pattern: /tbxSPOUSE_ADDR_LN1$/i, value: spouse.address1 || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_LN2
            { pattern: /tbxSPOUSE_ADDR_LN2$/i, value: spouse.address2 || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_CITY
            { pattern: /tbxSPOUSE_ADDR_CITY$/i, value: spouse.city || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_STATE
            { pattern: /tbxSPOUSE_ADDR_STATE$/i, value: spouse.state || '', type: 'text' },
        );
    }

    return map;
}

module.exports = { buildFamilySpouseMap };
