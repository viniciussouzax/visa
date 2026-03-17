// ============================================================
// Work/Education 2 — Previous employment, education
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeWorkEducation2(data, helpers) {
    const { g } = helpers;

    const we2 = data.workEducation2 || {};
    return {
        hasPreviousEmployment: we2.hasPreviousEmployment === 'Y' || we2.has_previous_employment === 'Y',
        previousEmployment: (we2.previousEmployment || we2.previous_employment || []).map(p => ({
            name: p.name || p.prevEmplName || '',
            street1: p.street1 || p.prevEmplStreet1 || '',
            street2: p.street2 || p.prevEmplStreet2 || '',
            city: p.city || p.prevEmplCity || '',
            state: p.state || p.prevEmplState || '',
            postalCode: p.postalCode || p.prevEmplPostalCode || p.postal_code || '',
            country: p.country || p.prevEmplCountry || '',
            phone: p.phone || p.prevEmplPhone || '',
            jobTitle: p.jobTitle || p.job_title || '',
            duties: p.duties || '',
            supervisor: p.supervisor || p.supervisorSurname || '',
            supervisorGivenName: p.supervisorGivenName || p.supervisor_given_name || '',
            startDate: p.startDate || p.start_date || { month: '', year: '' },
            endDate: p.endDate || p.end_date || { month: '', year: '' },
        })),
        hasEducation: we2.hasEducation === 'Y' || we2.has_education === 'Y',
        education: (we2.education || []).map(e => ({
            name: e.name || e.schoolName || '', 
            street1: e.street1 || e.schoolStreet1 || '', 
            street2: e.street2 || e.schoolStreet2 || '',
            city: e.city || e.schoolCity || '', 
            state: e.state || e.schoolState || '',
            postalCode: e.postalCode || e.schoolPostalCode || e.postal_code || '', 
            country: e.country || e.schoolCountry || '',
            course: e.course || e.courseOfStudy || e.course_of_study || '',
            startDate: e.startDate || e.start_date || { month: '', year: '' },
            endDate: e.endDate || e.end_date || { month: '', year: '' },
        })),
    };
}

module.exports = { normalizeWorkEducation2 };
