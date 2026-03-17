// ============================================================
// Student / Exchange — Normalize raw form data (SEVIS page)
// ============================================================

function normalizeStudentExchange(data, helpers) {
    const { g } = helpers;
    const se = data.studentExchange || {};
    return {
        studentExchange: {
            sevisId: g(se, 'sevisId', 'sevis_id'),
            programNumber: g(se, 'programNumber', 'program_number') || '',
            principalSevisId: g(se, 'principalSevisId', 'principal_sevis_id') || '',
            intendToStudy: g(se, 'intendToStudy', 'intend_to_study') || '',
            schoolName: g(se, 'schoolName', 'school_name'),
            courseOfStudy: g(se, 'courseOfStudy', 'course_of_study'),
            schoolAddress: g(se, 'schoolAddress', 'school_address'),
            schoolAddress2: g(se, 'schoolAddress2', 'school_address2') || '',
            schoolCity: g(se, 'schoolCity', 'school_city'),
            schoolState: g(se, 'schoolState', 'school_state'),
            schoolZip: g(se, 'schoolZip', 'school_zip'),
        },
    };
}

module.exports = { normalizeStudentExchange };
