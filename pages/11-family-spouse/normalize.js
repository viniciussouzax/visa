// ============================================================
// Family — Spouse normalize
// Returns: { spouse: { surname, givenName, dob, nationality, ... address } }
// The field-map (b1b2-modular) expects applicantData.spouse as an object
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na }
 * @returns {Object} { spouse: { ... } } or {}
 */
function normalizeSpouse(data, helpers) {
    const { g } = helpers;
    const fam2 = data.family2 || {};

    // If no spouse data at all, return empty (single/minor)
    if (!fam2.spouseSurname && !fam2.spouseGivenName) return {};

    const spouse = {
        surname: g(fam2, 'spouseSurname', 'spouse_surname'),
        givenName: g(fam2, 'spouseGivenName', 'spouse_given_name'),
        dob: {
            day: g(fam2, 'spouseDobDay', 'spouse_dob_day') || fam2.spouseDob?.day || '',
            month: g(fam2, 'spouseDobMonth', 'spouse_dob_month') || fam2.spouseDob?.month || '',
            year: g(fam2, 'spouseDobYear', 'spouse_dob_year') || fam2.spouseDob?.year || '',
        },
        nationality: g(fam2, 'spouseNationality', 'spouse_nationality'),
        cityOfBirth: g(fam2, 'spouseCityOfBirth', 'spouse_city_of_birth'),
        countryOfBirth: g(fam2, 'spouseCountryOfBirth', 'spouse_country_of_birth'),
        addressType: g(fam2, 'spouseAddressType', 'spouse_address_type'),
        // Address fields (when spouse lives at different address)
        address1: g(fam2, 'spouseStreet1', 'spouse_street1') || g(fam2, 'spouseAddress1', 'spouse_address1'),
        address2: g(fam2, 'spouseStreet2', 'spouse_street2') || g(fam2, 'spouseAddress2', 'spouse_address2'),
        city: g(fam2, 'spouseCity', 'spouse_city'),
        state: g(fam2, 'spouseState', 'spouse_state'),
        zip: g(fam2, 'spousePostalCode', 'spouse_postal_code') || g(fam2, 'spouseZip', 'spouse_zip'),
        country: g(fam2, 'spouseCountry', 'spouse_country'),
    };

    return { spouse };
}

module.exports = { normalizeSpouse };
