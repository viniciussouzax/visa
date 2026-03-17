// ============================================================
// Previous Spouse
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizePrevSpouse(data, helpers) {
    const { g } = helpers;

    const ps = data.prevSpouse || data.prev_spouse || {};
    const spouses = ps.spouses || [];
    const mapped = spouses.map(s => ({
        numberOfFormerSpouses: ps.numberOfPrevious || ps.number_of_previous || String(spouses.length),
        surname: s.surname || '', givenName: s.givenName || s.given_name || '',
        dob: s.dob || { day: '', month: '', year: '' },
        nationality: s.nationality || '',
        cityOfBirth: s.cityOfBirth || s.city_of_birth || '',
        countryOfBirth: s.countryOfBirth || s.country_of_birth || '',
        dateOfMarriage: s.dateOfMarriage || s.date_of_marriage || { day: '', month: '', year: '' },
        dateMarriageEnded: s.dateMarriageEnded || s.date_marriage_ended || { day: '', month: '', year: '' },
        howMarriageEnded: s.howEnded || s.how_ended || '',
        countryMarriageTerminated: s.countryTerminated || s.country_terminated || '',
    }));
    return {
        previousSpouses: mapped,
        previousSpouse: mapped[0] || null,
    };
}

module.exports = { normalizePrevSpouse };
