// ============================================================
// Work/Education 1 — Current occupation
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeWorkEducation1(data, helpers) {
    const { g } = helpers;

    const we1 = data.workEducation1 || {};
    const e = we1.employer || {};
    return {
        occupationCode: g(we1, 'occupation', 'occupation') || null,
        occupationExplanation: we1.occupationExplanation || we1.occupation_explanation || we1.specifyOther || we1.specify_other || we1.otherOccupation || we1.other_occupation || '',
        employer: {
            name: e.name || we1.employerName || we1.employer_name || '',
            phone: e.phone || we1.employerPhone || we1.employer_phone || '',
            street1: e.street1 || we1.employerStreet1 || we1.employer_street1 || '',
            street2: e.street2 || we1.employerStreet2 || we1.employer_street2 || '',
            city: e.city || we1.employerCity || we1.employer_city || '',
            state: e.state || we1.employerState || we1.employer_state || '',
            postalCode: e.postalCode || we1.employerPostalCode || we1.employer_postal_code || '',
            country: e.country || we1.employerCountry || we1.employer_country || '',
            monthlyIncome: e.monthlyIncome || e.monthlySalary || we1.monthlySalary || we1.monthlyIncome || we1.monthly_salary || '',
            jobTitle: e.jobTitle || e.job_title || e.duties || e.courseOfStudy || e.course_of_study || we1.duties || we1.courseOfStudy || we1.course_of_study || '',
            duties: e.duties || e.courseOfStudy || e.course_of_study || we1.duties || we1.courseOfStudy || we1.course_of_study || '',
            startDate: e.startDate || e.start_date || we1.employerStartDate || we1.employer_start_date || { day: '', month: '', year: '' },
        },
    };
}

module.exports = { normalizeWorkEducation1 };
