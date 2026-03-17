// ============================================================
// US Contact — Name, address, phone, email
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeUSContact(data, helpers) {
    const { g } = helpers;

    const uc = data.usContact || data.us_contact || data.travel?.usContact || data.travel?.us_contact || {};
    const ucAddr = uc.address || {};
    const na = helpers.na;
    const sn = na(uc.surname || uc.usContactSurname) || '';
    const gn = na(uc.givenName || uc.given_name || uc.usContactGivenName) || '';
    return {
        usContact: {
            surname: sn, givenName: gn,
            nameDoNotKnow: uc.nameDoNotKnow || uc.name_do_not_know || (!sn && !gn),
            organization: na(uc.organization) || '',
            orgDoNotKnow: uc.orgDoNotKnow || uc.org_do_not_know || false,
            relationship: uc.relationship || '',
            street1: na(uc.usContactStreet1 || uc.street1 || ucAddr.street1) || '',
            street2: na(uc.usContactStreet2 || uc.street2 || ucAddr.street2) || '',
            city: na(uc.usContactCity || uc.city || ucAddr.city) || '',
            state: na(uc.usContactState || uc.state || ucAddr.state) || '',
            zip: na(uc.usContactZip || uc.zip || ucAddr.zip) || '',
            phone: uc.usContactPhone || uc.phone || '',
            email: na(uc.usContactEmail || uc.email) || '',
        },
    };
}

module.exports = { normalizeUSContact };
