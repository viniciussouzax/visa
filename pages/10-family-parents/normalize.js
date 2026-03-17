// ============================================================
// Family — Father, Mother, Spouse, Relatives in US
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeFamilyParents(data, helpers) {
    const { g } = helpers;

    const fam1 = data.family1 || {};
    const fam2 = data.family2 || {};
    const na = helpers.na;
    const f = fam1.father || {};
    const m = fam1.mother || {};
    const s = fam2 || {};
    const fSn = na(fam1.fatherSurname || f.surname) || '';
    const fGn = na(fam1.fatherGivenName || f.givenName || f.given_name) || '';
    const mSn = na(fam1.motherSurname || m.surname) || '';
    const mGn = na(fam1.motherGivenName || m.givenName || m.given_name) || '';
    return {
        father: { surname: fSn, givenName: fGn, nameUnknown: !fSn && !fGn, dob: fam1.fatherDob || f.dob || { day: '', month: '', year: '' }, dobUnknown: (fam1.fatherDob === 'UNKNOWN') || !f.dob || f.dobUnknown || f.dob_unknown || false, inUS: fam1.fatherInUS || f.inUS || f.in_us || 'N', usStatus: fam1.fatherUSStatus || f.usStatus || f.us_status || '' },
        mother: { surname: mSn, givenName: mGn, nameUnknown: !mSn && !mGn, dob: fam1.motherDob || m.dob || { day: '', month: '', year: '' }, dobUnknown: (fam1.motherDob === 'UNKNOWN') || !m.dob || m.dobUnknown || m.dob_unknown || false, inUS: fam1.motherInUS || m.inUS || m.in_us || 'N', usStatus: fam1.motherUSStatus || m.usStatus || m.us_status || '' },
        spouse: {
            surname: s.spouseSurname || s.surname || '', givenName: s.spouseGivenName || s.givenName || s.given_name || '',
            dob: s.spouseDob || s.dob || { day: '', month: '', year: '' },
            nationality: s.spouseNationality || s.nationality || '',
            cityOfBirth: s.spouseCityOfBirth || s.cityOfBirth || s.city_of_birth || '',
            countryOfBirth: s.spouseCountryOfBirth || s.countryOfBirth || s.country_of_birth || '',
            pobCountry: s.spouseCountry || s.spouseCountryOfBirth || s.countryOfBirth || '',
            addressType: s.spouseAddressType || s.addressType || 'H',
            postalCode: s.spousePostalCode || s.postalCode || '',
            address: s.spouseAddress || s.address || { street1: s.spouseStreet1 || '', street2: s.spouseStreet2 || '', city: s.spouseCity || '', state: s.spouseState || '', postalCode: s.spousePostalCode || '', country: s.spouseCountry || '' },
        },
        relativesInUS: fam1.immediateRelativesInUS === 'Y' || fam1.relatives_in_us === 'Y',
        relatives: fam1.relatives || [],
        immediateRelative: (fam1.relatives || [])[0] || null,
        otherRelativesInUS: fam1.otherRelativesInUS === 'Y' || fam1.other_relatives_in_us === 'Y',
    };
}

module.exports = { normalizeFamilyParents };
