/**
 * Visa Configs — Mapeamento de páginas por tipo de visto
 * 
 * Foco atual: B, F, J, O
 * 
 * Cada config define:
 *   - label: nome amigável
 *   - categories: categorias DS-160 (para match por purposeCategory)
 *   - classes: classes de visto aceitas
 *   - extraPages: páginas extras além das base
 */

// Páginas base compartilhadas por TODOS os vistos
const BASE_PAGES = [
    '01-location',
    '02-personal1',
    '03-personal2',
    '04-travel',
    '05-travel-companions',
    '06-previous-us-travel',
    '07-address-phone',
    '08-passport',
    '09-us-contact',
    '10-family-parents',
    // 11 (family-spouse), 12 (deceased-spouse), 13 (prev-spouse)
    // → condicionais por maritalStatus (incluídos dinamicamente)
];

// Páginas condicionais por estado civil
const MARITAL_PAGES = {
    'M': '11-family-spouse',    // Married
    'C': '11-family-spouse',    // Common Law / Civil Partnership
    'P': '11-family-spouse',    // Civil Partnership
    'W': '12-deceased-spouse',  // Widowed
    'D': '13-prev-spouse',      // Divorced
    'S': null,                  // Single — nenhuma página extra
};

// Páginas de trabalho/educação (removidas para menores de 14)
const WORK_EDUCATION_PAGES = [
    '14-work-education-current',
    '15-work-education-previous',
    '16-work-education-additional',
];

// Páginas finais (sempre presentes)
const FINAL_PAGES = [
    '17-security',
];

// ========================================
// Configuração por tipo de visto (B, F, J, O)
// ========================================

const VISA_CONFIGS = {
    // === TURISMO / NEGÓCIOS ===
    'B1/B2': {
        label: 'Turismo / Negócios',
        categories: ['B'],
        classes: ['B1/B2', 'B1', 'B2'],
        extraPages: [],
    },

    // === ESTUDANTE ACADÊMICO ===
    'F1': {
        label: 'Estudante Acadêmico',
        categories: ['F'],
        classes: ['F1'],
        extraPages: ['18-student-exchange', '19a-student-add-contact'],    // SEVIS, School Info, Additional Contact
    },
    'F2': {
        label: 'Dependente de Estudante F',
        categories: ['F'],
        classes: ['F2'],
        extraPages: ['18-student-exchange'],
    },

    // === VISITANTE DE INTERCÂMBIO ===
    'J1': {
        label: 'Visitante de Intercâmbio',
        categories: ['J'],
        classes: ['J1'],
        extraPages: ['18-student-exchange', '19a-student-add-contact'],    // SEVIS, Program Info, Additional Contact
    },
    'J2': {
        label: 'Dependente de Intercâmbio J',
        categories: ['J'],
        classes: ['J2'],
        extraPages: ['18-student-exchange'],
    },

    // === HABILIDADE EXTRAORDINÁRIA ===
    'O1': {
        label: 'Habilidade Extraordinária',
        categories: ['O'],
        classes: ['O1', 'O1A', 'O1B'],
        extraPages: ['19-petition-info'],       // I-129 Petition Number
    },
    'O2': {
        label: 'Assistente de O1',
        categories: ['O'],
        classes: ['O2'],
        extraPages: ['19-petition-info'],
    },
    'O3': {
        label: 'Dependente de O1/O2',
        categories: ['O'],
        classes: ['O3'],
        extraPages: ['19-petition-info'],
    },
};

// ========================================
// Funções de resolução
// ========================================

/**
 * Calcula a idade a partir de uma data de nascimento
 */
function calculateAge(dob) {
    if (!dob || !dob.year || !dob.month || !dob.day) return 99;
    const y = parseInt(dob.year), m = parseInt(dob.month), d = parseInt(dob.day);
    const now = new Date();
    let age = now.getFullYear() - y;
    const monthDiff = (now.getMonth() + 1) - m;
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age--;
    return age;
}

/**
 * Resolve a lista de páginas para um solicitante específico
 * @param {string} visaType - 'B1/B2', 'F1', 'J1', 'O1'
 * @param {string} maritalStatus - 'S', 'M', 'D', 'W', 'C', 'P'
 * @param {{ day, month, year }} dob
 * @returns {string[]} Array ordenado de pastas de páginas
 */
function resolvePages(visaType, maritalStatus, dob) {
    const config = VISA_CONFIGS[visaType];
    if (!config) {
        console.warn(`[VisaConfig] Tipo "${visaType}" não encontrado, usando B1/B2`);
        return resolvePages('B1/B2', maritalStatus, dob);
    }

    const pages = [...BASE_PAGES];

    // Condicionais por estado civil
    const maritalPage = MARITAL_PAGES[maritalStatus];
    if (maritalPage) pages.push(maritalPage);

    // Work/Education — somente se idade >= 14
    const age = calculateAge(dob);
    if (age >= 14) {
        pages.push(...WORK_EDUCATION_PAGES);
    } else {
        console.log(`[VisaConfig] Menor de 14 (${age}) — omitindo Work/Education`);
    }

    // Finais (security)
    pages.push(...FINAL_PAGES);

    // Extras por visto (SEVIS para F/J, Petition para O)
    pages.push(...config.extraPages);

    // Ordenar pela numeração da pasta
    pages.sort((a, b) => parseInt(a.split('-')[0]) - parseInt(b.split('-')[0]));

    return pages;
}

/**
 * Encontra o visa config pela classe de visto
 */
function findConfigByClass(visaClass) {
    if (!visaClass) return null;
    const upper = visaClass.toUpperCase().replace(/\s/g, '');
    for (const [key, config] of Object.entries(VISA_CONFIGS)) {
        if (config.classes.includes(upper)) return { key, ...config };
    }
    return null;
}

module.exports = {
    VISA_CONFIGS,
    BASE_PAGES,
    MARITAL_PAGES,
    WORK_EDUCATION_PAGES,
    FINAL_PAGES,
    resolvePages,
    findConfigByClass,
    calculateAge,
};
