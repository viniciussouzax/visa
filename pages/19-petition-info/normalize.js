// ============================================================
// Temporary Work Visa — Normalize raw form data
// Schema principal usa id: 'petitionInfo'
// Schema local usa id: 'temporaryWork'
// Suporta ambos com prioridade para petitionInfo (form-engine)
// ============================================================

function normalizeTemporaryWork(data, helpers) {
    const { g } = helpers;
    // petitionInfo = schema principal (form-engine gera JSON com essa chave)
    // temporaryWork = schema local / legado
    const pi = data.petitionInfo || data.temporaryWork || {};
    return {
        temporaryWork: {
            petitionNumber: g(pi, 'petitionNumber', 'petition_number'),
            nameOfPetitioner: g(pi, 'nameOfPetitioner', 'name_of_petitioner')
                || g(pi, 'petitionerSurname', 'petitioner_surname')
                + (g(pi, 'petitionerGivenName', 'petitioner_given_name') ? ' ' + g(pi, 'petitionerGivenName', 'petitioner_given_name') : ''),
            employerName: g(pi, 'employerName', 'employer_name'),
            employerAddress: g(pi, 'employerAddress', 'employer_address'),
            employerAddress2: g(pi, 'employerAddress2', 'employer_address2') || '',
            employerCity: g(pi, 'employerCity', 'employer_city'),
            employerState: g(pi, 'employerState', 'employer_state'),
            employerZip: g(pi, 'employerZip', 'employer_zip') || '',
            employerPhone: g(pi, 'employerPhone', 'employer_phone')
                || g(pi, 'petitionerPhone', 'petitioner_phone'),
            monthlySalary: g(pi, 'monthlySalary', 'monthly_salary'),
        },
    };
}

module.exports = { normalizeTemporaryWork, normalizePetitionInfo: normalizeTemporaryWork };

