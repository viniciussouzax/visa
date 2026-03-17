// ============================================================
// Deceased Spouse
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeDeceasedSpouse(data, helpers) {
    const { g } = helpers;

    const ds = data.deceasedSpouse || data.deceased_spouse;
    const na = helpers.na;
    if (!ds || !ds.surname) return { deceasedSpouse: null };
    return {
        deceasedSpouse: {
            surname: ds.surname || '', givenName: ds.givenName || ds.given_name || '',
            dob: ds.dob || { day: '', month: '', year: '' },
            nationality: ds.nationality || '',
            cityOfBirth: na(ds.cityOfBirth || ds.city_of_birth) || '',
            countryOfBirth: ds.countryOfBirth || ds.country_of_birth || '',
        },
    };
}

module.exports = { normalizeDeceasedSpouse };
