// ============================================================
// Student / Exchange — Field map for F/J/M visas (SEVIS page)
// ============================================================
// F1-F1/M1  → full school fields (always)
// J1-J1     → programNumber + intendToStudy + school (if Yes)
// F2/J2/M2  → SEVIS IDs only (own + principal)
// J2-CH/SP  → SEVIS ID + principal SEVIS ID + programNumber
// ============================================================

function buildStudentExchangeMap(a, ctx) {
    const map = [];
    const se = a.studentExchange || {};
    const visaType = ctx?.purposeOfTrip || a.travel?.purposeOfTrip || '';
    const isDependentVisa = ['F2-CH', 'F2-SP', 'J2-CH', 'J2-SP', 'M2'].includes(visaType);
    const isJVisa = ['J1-J1', 'J2-CH', 'J2-SP'].includes(visaType);

    // SEVIS ID — always
    map.push({ pattern: /tbxSevisID$/i, value: se.sevisId || '', type: 'text' });

    // Program Number — J visas only
    if (isJVisa) {
        map.push({ pattern: /tbxProgram$/i, value: se.programNumber || '', type: 'text' });
    }

    // Principal SEVIS ID — dependents only
    if (isDependentVisa) {
        map.push({ pattern: /tbxPrincipalSevisID$/i, value: se.principalSevisId || '', type: 'text' });
    }

    // intendToStudy — J1-J1 only
    if (visaType === 'J1-J1') {
        map.push({ pattern: /rblStudyQuestion$/i, value: se.intendToStudy || 'Y', type: 'radio' });
    }

    // School fields — primary holders only
    if (!isDependentVisa) {
        const showSchool = visaType !== 'J1-J1' || se.intendToStudy === 'Y';
        if (showSchool) {
            map.push(
                { pattern: /tbxNameOfSchool$/i, value: se.schoolName || '', type: 'text' },
                { pattern: /tbxSchoolCourseOfStudy$/i, value: se.courseOfStudy || '', type: 'text' },
                { pattern: /tbxSchoolStreetAddress1$/i, value: se.schoolAddress || '', type: 'text' },
                { pattern: /tbxSchoolStreetAddress2$/i, value: se.schoolAddress2 || '', type: 'text' },
                { pattern: /tbxSchoolCity$/i, value: se.schoolCity || '', type: 'text' },
                { pattern: /ddlSchoolState$/i, value: se.schoolState || '', type: 'select' },
                { pattern: /tbxSchoolZIPCode$/i, value: se.schoolZip || '', type: 'text' },
            );
        }
    }

    return map;
}

module.exports = { buildStudentExchangeMap };
