// ============================================================
// Temporary Work Visa — Field map for H/L/O/P/Q/R work visas
// URL: complete_temporarywork.aspx?node=TemporaryWork
// ============================================================

function buildTemporaryWorkMap(a, ctx) {
    const map = [];
    const tw = a.temporaryWork || {};

    map.push(
        { pattern: /tbxPetitionNumber$/i, value: tw.petitionNumber || '', type: 'text' },
        { pattern: /tbxNameOfPetitioner$/i, value: tw.nameOfPetitioner || '', type: 'text' },
        { pattern: /tbxEmployerName$/i, value: tw.employerName || '', type: 'text' },
        { pattern: /tbxEmpStreetAddress1$/i, value: tw.employerAddress || '', type: 'text' },
        { pattern: /tbxEmpStreetAddress2$/i, value: tw.employerAddress2 || '', type: 'text' },
        { pattern: /tbxEmpCity$/i, value: tw.employerCity || '', type: 'text' },
        { pattern: /ddlEmpState$/i, value: tw.employerState || '', type: 'select' },
        { pattern: /tbxZIPCode$/i, value: tw.employerZip || '', type: 'text' },
        { pattern: /tbxTEMP_WORK_TEL$/i, value: tw.employerPhone || '', type: 'text' },
        { pattern: /tbxEmpSalaryInUSD$/i, value: tw.monthlySalary || '', type: 'text' },
    );

    return map;
}

module.exports = { buildTemporaryWorkMap };
