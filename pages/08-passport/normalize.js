// ============================================================
// Passport — Type, number, dates, lost
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizePassport(data, helpers) {
    const { g } = helpers;

    const ppt = data.passport || {};
    const na = helpers.na;
    return {
        passport: {
            type: g(ppt, 'type', 'type') || null,
            typeExplanation: ppt.typeExplanation || ppt.type_explanation,
            number: g(ppt, 'number', 'number'),
            bookNumber: na(ppt.bookNumber || ppt.book_number),
            issuingCountry: g(ppt, 'issuingCountry', 'issuing_country') || null,
            issuedCity: g(ppt, 'issuedCity', 'issued_city'),
            issuedState: g(ppt, 'issuedState', 'issued_state'),
            issuedCountry: g(ppt, 'issuedCountry', 'issued_country') || null,
            issuanceDate: ppt.issuanceDate || ppt.issuance_date,
            expirationDate: ppt.expirationDate || ppt.expiration_date,
            lostOrStolen: ppt.lostOrStolen === 'Y' || ppt.lost_or_stolen === 'Y',
            lostPassports: ppt.lostPassports || ppt.lost_passports || [],
            lostPassport: (ppt.lostPassports || ppt.lost_passports || [])[0] || null,
        },
    };
}

module.exports = { normalizePassport };
