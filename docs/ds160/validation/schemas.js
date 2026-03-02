/**
 * SENDS160 — Zod Validation Schemas for DS-160 Clone Form
 * 
 * Cada schema corresponde a uma sanfona do formulário.
 * Alinhado 1:1 com generateJSON() do index.html.
 * Carregado via CDN: <script type="module" src="validation/schemas.js"></script>
 */

import { z } from 'https://cdn.jsdelivr.net/npm/zod@3/+esm';

// ============================================================
// HELPERS REUTILIZÁVEIS
// ============================================================

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const SPECIAL_CHARS = /[<>&"'\/\\;:{}[\]|~]/;

/** Texto seguro: trim, sem especiais, max length */
const safeText = (max = 40) => z.string().trim()
    .max(max, `Máximo ${max} caracteres`)
    .refine(v => !SPECIAL_CHARS.test(v), 'Caracteres especiais não permitidos (<>&"\'\/\\;:{}[]|~)');

/** Texto obrigatório */
const requiredText = (max = 40) => safeText(max).refine(v => v.length > 0, 'Campo obrigatório');

/** Texto opcional (pode ser vazio) */
const optionalText = (max = 40) => safeText(max).or(z.literal(''));

/** Data no formato DS-160: { day, month, year } */
const dateSchema = z.object({
    day: z.string().regex(/^\d{1,2}$/, 'Dia inválido').refine(d => {
        const n = parseInt(d); return n >= 1 && n <= 31;
    }, 'Dia deve ser entre 1 e 31'),
    month: z.enum(MONTHS, { errorMap: () => ({ message: 'Mês inválido. Use: JAN, FEB, MAR...' }) }),
    year: z.string().regex(/^\d{4}$/, 'Ano deve ter 4 dígitos'),
});

/** Data obrigatória com validação de ano razoável */
const requiredDate = dateSchema.refine(d => {
    const y = parseInt(d.year);
    return y >= 1900 && y <= new Date().getFullYear() + 2;
}, 'Ano fora do intervalo válido (1900-futuro)');

/** Data de nascimento (deve ser no passado, idade 1-120) */
const dobSchema = dateSchema.refine(d => {
    const y = parseInt(d.year);
    const now = new Date().getFullYear();
    return y >= (now - 120) && y <= (now - 1);
}, 'Data de nascimento inválida');

/** Yes/No radio */
const yesNo = z.enum(['Y', 'N'], { errorMap: () => ({ message: 'Selecione Sim ou Não' }) });

/** Yes/No opcional (pode ser vazio/undefined) */
const optionalYesNo = yesNo.or(z.literal('')).optional();

/** Telefone: apenas dígitos, 7-15 chars */
const phoneSchema = z.string()
    .transform(v => v.replace(/\D/g, ''))
    .pipe(z.string().min(7, 'Mínimo 7 dígitos').max(15, 'Máximo 15 dígitos'));

/** Telefone opcional */
const optionalPhone = z.string().optional().or(z.literal(''));

/** Telefone US: exatamente 10 dígitos */
const usPhoneSchema = z.string()
    .transform(v => v.replace(/\D/g, ''))
    .pipe(z.string().length(10, 'Telefone US deve ter 10 dígitos'));

/** Email */
const emailSchema = z.string().trim()
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido');

/** ZIP Code US: 5 dígitos */
const usZipSchema = z.string()
    .transform(v => v.replace(/\D/g, ''))
    .pipe(z.string().min(5, 'CEP US deve ter 5 dígitos'));

/** Texto de explicação condicional (string livre quando campo Yes/No = Y) */
const explanationText = optionalText(200).optional().or(z.literal(''));

// ============================================================
// 1. PERSONAL 1
// ============================================================
export const Personal1Schema = z.object({
    surname: requiredText(33),
    givenName: requiredText(33),
    fullNameNative: optionalText(100).default('DOES NOT APPLY'),
    otherNamesUsed: yesNo,
    otherNames: z.array(z.object({
        surname: requiredText(33),
        givenName: requiredText(33),
    })).max(5, 'Máximo 5 nomes').optional().default([]),
    telecode: yesNo.optional().default('N'),
    telecodeSurname: optionalText(33).optional(),
    telecodeGivenName: optionalText(33).optional(),
    sex: z.enum(['M', 'F'], { errorMap: () => ({ message: 'Selecione o sexo' }) }),
    maritalStatus: z.enum(['S', 'M', 'C', 'D', 'W', 'P', 'O', 'L'], {
        errorMap: () => ({ message: 'Selecione o estado civil' })
    }),
    otherMaritalStatusText: optionalText(40).optional(), // <-- ADICIONADO
    dob: dobSchema,
    cityOfBirth: requiredText(20),
    stateOfBirth: optionalText(20).optional(),
    countryOfBirth: requiredText(40),
}).refine(d => {
    if (d.otherNamesUsed === 'Y' && (!d.otherNames || d.otherNames.length === 0)) return false;
    return true;
}, { message: 'Adicione pelo menos um outro nome', path: ['otherNames'] });

// ============================================================
// 2. PERSONAL 2
// ============================================================
export const Personal2Schema = z.object({
    nationality: requiredText(40),
    otherNationality: yesNo.optional().default('N'),
    otherNationalities: z.array(z.object({
        country: requiredText(40),
        hasPassport: optionalYesNo,
        passportNumber: optionalText(20).optional(),
    })).max(5).optional().default([]),
    permanentResident: yesNo.optional().default('N'),
    permanentResidentCountries: z.array(z.object({
        country: requiredText(40),
    })).max(5).optional().default([]),
    nationalId: optionalText(20).optional(),
    ssn: z.string().optional().refine(v => {
        if (!v || v === 'N/A' || v === 'DNA' || v.length === 0) return true;
        return /^\d{9}$/.test(v.replace(/-/g, ''));
    }, 'SSN deve ter 9 dígitos'),
    taxId: optionalText(20).optional(),
});

// ============================================================
// 3. ADDRESS & PHONE
// ============================================================
const AddressSchema = z.object({
    street1: requiredText(40),
    street2: optionalText(40).optional(),
    city: requiredText(20),
    state: optionalText(20).optional(),
    postalCode: optionalText(10).optional(),
    country: requiredText(40),
});

const SocialMediaEntry = z.object({
    platform: z.string().min(1, 'Plataforma obrigatória'),
    handle: z.string().min(1, 'Usuário obrigatório').max(50),
});

export const AddressPhoneSchema = z.object({
    homeAddress: AddressSchema,
    mailingAddressSame: optionalYesNo, // <-- CORRIGIDO: é Y/N string, não boolean
    mailingAddress: AddressSchema.optional().nullable(),
    phone: phoneSchema,
    mobilePhone: optionalPhone,
    businessPhone: optionalPhone,
    additionalPhones: optionalYesNo,
    additionalPhoneNumbers: z.array(z.string()).max(5).optional().default([]),
    email: emailSchema,
    additionalEmails: optionalYesNo,
    additionalEmailAddresses: z.array(z.string()).max(5).optional().default([]),
    socialMedia: z.array(SocialMediaEntry).optional().default([]),
    additionalSocialMedia: optionalYesNo, // <-- ADICIONADO
    additionalSocialMediaAccounts: z.array(z.object({ // <-- ADICIONADO
        platform: optionalText(40).optional(),
        handle: optionalText(50).optional(),
    })).max(5).optional().default([]),
});

// ============================================================
// 4. PASSPORT
// ============================================================
export const PassportSchema = z.object({
    type: z.string().min(1, 'Tipo de passaporte obrigatório'),
    typeExplanation: optionalText(100).optional(),
    number: requiredText(20),
    bookNumber: optionalText(20).optional().nullable(),
    issuingCountry: requiredText(40),
    issuedCity: requiredText(20),
    issuedState: optionalText(20).optional(),
    issuedCountry: requiredText(40),
    issuanceDate: requiredDate,
    expirationDate: dateSchema,
    lostOrStolen: yesNo.optional().default('N'),
    lostPassports: z.array(z.object({
        number: optionalText(20).optional(),
        country: requiredText(40),
        explanation: optionalText(200).optional(),
    })).max(5).optional().default([]),
}).refine(d => {
    const iy = parseInt(d.issuanceDate.year);
    const ey = parseInt(d.expirationDate.year);
    if (ey < iy) return false;
    if (ey === iy) {
        const im = MONTHS.indexOf(d.issuanceDate.month);
        const em = MONTHS.indexOf(d.expirationDate.month);
        if (em < im) return false;
    }
    return true;
}, { message: 'Data de expiração deve ser posterior à emissão', path: ['expirationDate'] });

// ============================================================
// 5. TRAVEL
// ============================================================
const USAddressSchema = z.object({
    street1: requiredText(40),
    street2: optionalText(40).optional(),
    city: requiredText(20),
    state: requiredText(20),
    zip: usZipSchema,
});

const PayerAddressSchema = z.object({
    street1: optionalText(40).optional(),
    street2: optionalText(40).optional(),
    city: optionalText(20).optional(),
    state: optionalText(20).optional(),
    postalCode: optionalText(10).optional(),
    country: optionalText(40).optional(),
}).optional().nullable();

export const TravelSchema = z.object({
    purposeOfTrip: z.string().min(1, 'Propósito da viagem obrigatório'),
    purposeCategory: z.string().optional(), // <-- ADICIONADO
    purposeSubCategory: z.string().optional(), // <-- ADICIONADO
    hasSpecificPlans: yesNo.optional().default('Y'),
    arrivalDate: dateSchema.optional(),
    arrivalFlight: optionalText(20).optional(),
    arrivalCity: optionalText(20).optional(),
    departureDate: dateSchema.optional(),
    departureFlight: optionalText(20).optional(),
    departureCity: optionalText(20).optional(),
    specificLocations: z.array(optionalText(100)).max(5).optional(),
    specificLocation: optionalText(100).optional(), // backward compat
    nonSpecificArrival: dateSchema.optional(),
    lengthOfStay: z.any().optional(),
    lengthOfStayUnit: z.string().optional(),
    usAddress: USAddressSchema.optional(),
    whoIsPaying: z.string().optional(),
    payer: z.object({ // <-- EXPANDIDO com address aninhado e empresa
        surname: optionalText(33).optional(),
        givenName: optionalText(33).optional(),
        phone: optionalPhone,
        email: z.string().optional().or(z.literal('')),
        relationship: optionalText(40).optional(),
        sameAddress: optionalYesNo,
        address: PayerAddressSchema, // <-- ADICIONADO: address aninhado
        companyName: optionalText(40).optional(), // <-- ADICIONADO
        companyPhone: optionalPhone, // <-- ADICIONADO
        companyRelation: optionalText(40).optional(), // <-- ADICIONADO
        companyAddress: PayerAddressSchema, // <-- ADICIONADO
    }).optional().nullable(),
});

// ============================================================
// 6. US CONTACT
// ============================================================
export const USContactSchema = z.object({
    surname: optionalText(33).optional(),
    givenName: optionalText(33).optional(),
    nameDoNotKnow: z.boolean().optional().default(false),
    organization: optionalText(40).optional(),
    orgDoNotKnow: z.boolean().optional().default(false),
    relationship: requiredText(40),
    address: z.object({ // <-- CORRIGIDO: aninhado em address{} como generateJSON()
        street1: requiredText(40),
        street2: optionalText(40).optional(),
        city: requiredText(20),
        state: requiredText(20),
        zip: usZipSchema,
    }),
    phone: usPhoneSchema,
    email: emailSchema.optional().or(z.literal('')).or(z.literal('DNA')),
}).refine(d => {
    if (!d.nameDoNotKnow && (!d.surname || !d.givenName)) return false;
    return true;
}, { message: 'Preencha nome e sobrenome ou marque "Não sei"', path: ['surname'] })
    .refine(d => {
        if (!d.orgDoNotKnow && !d.organization) return false;
        return true;
    }, { message: 'Preencha a organização ou marque "Não sei"', path: ['organization'] });

// ============================================================
// 7. TRAVEL COMPANIONS
// ============================================================
export const TravelCompanionsSchema = z.object({
    travelingWithOthers: yesNo.optional().default('N'),
    companions: z.array(z.object({
        surname: requiredText(33),
        givenName: requiredText(33),
        relationship: requiredText(40),
    })).max(5).optional().default([]),
    partOfGroup: yesNo.optional().default('N'),
    groupName: optionalText(40).optional(),
});

// ============================================================
// 8. PREVIOUS US TRAVEL
// ============================================================
export const PreviousUSTravelSchema = z.object({
    hasBeenInUS: yesNo.optional().default('N'),
    previousVisits: z.array(z.object({
        arrivalDate: dateSchema,
        lengthOfStay: z.string().min(1, 'Duração obrigatória'),
        lengthOfStayUnit: z.enum(['D', 'W', 'M', 'Y']).optional().default('D'),
    })).max(5).optional().default([]),
    hasDriversLicense: yesNo.or(z.literal('')).optional().default('N'),
    driversLicenses: z.array(z.object({
        number: requiredText(20),
        state: requiredText(20),
    })).max(5).optional().default([]),
    hasUSVisa: yesNo.or(z.literal('')).optional().default('N'),
    previousVisa: z.object({
        issueDate: dateSchema,
        number: optionalText(20).optional(),
        sameType: optionalYesNo,
        sameCountry: optionalYesNo,
        tenPrint: optionalYesNo,
        lost: optionalYesNo,
        lostYear: optionalText(4).optional(),
        lostExplanation: explanationText,
        cancelled: optionalYesNo,
        cancelledExplanation: explanationText,
    }).optional().nullable(),
    visaRefused: yesNo.or(z.literal('')).optional().default('N'),
    visaRefusedExplanation: explanationText,
    immigrantPetition: yesNo.or(z.literal('')).optional().default('N'),
    immigrantPetitionExplanation: explanationText,
    permanentResident: yesNo.or(z.literal('')).optional().default('N'),
    permanentResidentExplanation: explanationText,
    vwpDenial: yesNo.or(z.literal('')).optional().default('N'),
    vwpDenialExplanation: explanationText,
});

// ============================================================
// 9. FAMILY 1 (Pais)
// ============================================================
const ParentSchema = z.object({
    surname: requiredText(33).or(z.literal('DNA')),
    givenName: requiredText(33).or(z.literal('DNA')),
    dob: dobSchema.nullable().optional(),
    inUS: yesNo.optional().default('N'),
    usStatus: optionalText(40).optional(),
});

export const Family1Schema = z.object({
    father: ParentSchema,
    mother: ParentSchema,
    immediateRelativesInUS: yesNo.optional().default('N'),
    otherRelativesInUS: yesNo.optional().default('N'),
    relatives: z.array(z.object({
        surname: requiredText(33),
        givenName: requiredText(33),
        type: requiredText(40), // <-- CORRIGIDO: era 'relationship', JSON usa 'type'
        status: optionalText(40).optional(),
    })).max(5).optional().default([]),
});

// ============================================================
// 10. FAMILY 2 (Cônjuge)
// ============================================================
export const Family2Schema = z.object({
    surname: optionalText(33).optional(), // <-- CORRIGIDO: era 'spouseSurname'
    givenName: optionalText(33).optional(), // <-- CORRIGIDO: era 'spouseGivenName'
    dob: dateSchema.optional(), // <-- CORRIGIDO: era 'spouseDob'
    nationality: optionalText(40).optional(), // <-- CORRIGIDO: era 'spouseNationality'
    cityOfBirth: optionalText(20).optional(), // <-- CORRIGIDO: era 'spouseCityOfBirth'
    countryOfBirth: optionalText(40).optional(), // <-- CORRIGIDO: era 'spouseCountryOfBirth'
    addressType: z.string().optional(), // <-- CORRIGIDO: era 'spouseAddressType'
    address: AddressSchema.optional().nullable(), // <-- CORRIGIDO: era 'spouseAddress'
});

// ============================================================
// 10b. DECEASED SPOUSE (NOVO)
// ============================================================
export const DeceasedSpouseSchema = z.object({
    surname: optionalText(33).optional(),
    givenName: optionalText(33).optional(),
    dob: dateSchema.optional(),
    nationality: optionalText(40).optional(),
    cityOfBirth: optionalText(20).optional(),
    countryOfBirth: optionalText(40).optional(),
});

// ============================================================
// 10c. PREVIOUS SPOUSES (NOVO)
// ============================================================
export const PrevSpouseSchema = z.object({
    numberOfPrevious: z.string().optional(),
    spouses: z.array(z.object({
        surname: requiredText(33),
        givenName: requiredText(33),
        dob: dateSchema,
        nationality: optionalText(40).optional(),
        cityOfBirth: optionalText(20).optional(),
        countryOfBirth: optionalText(40).optional(),
        dateOfMarriage: dateSchema,
        dateMarriageEnded: dateSchema,
        howEnded: optionalText(40).optional(),
        countryTerminated: optionalText(40).optional(),
    })).max(10).optional().default([]),
});

// ============================================================
// 11. WORK/EDUCATION 1
// ============================================================
const EmployerSchema = z.object({
    name: requiredText(40),
    street1: requiredText(40),
    street2: optionalText(40).optional(),
    city: requiredText(20),
    state: optionalText(20).optional(),
    postalCode: optionalText(10).optional(),
    country: requiredText(40),
    phone: phoneSchema,
    startDate: dateSchema, // <-- CORRIGIDO: era partialDate, JSON inclui day
    monthlySalary: z.string().optional(), // <-- CORRIGIDO: era 'monthlyIncome'
    duties: optionalText(200).optional(), // <-- CORRIGIDO: era 'jobTitle'
});

export const WorkEducation1Schema = z.object({
    occupation: z.string().min(1, 'Ocupação obrigatória'),
    employer: EmployerSchema.optional().nullable(),
});

// ============================================================
// 12. WORK/EDUCATION 2
// ============================================================
const EducationEntry = z.object({
    name: requiredText(40),
    street1: optionalText(40).optional(),
    street2: optionalText(40).optional(), // <-- ADICIONADO
    city: requiredText(20),
    state: optionalText(20).optional(),
    postalCode: optionalText(10).optional(),
    country: requiredText(40),
    course: requiredText(40), // <-- CORRIGIDO: era 'courseOfStudy'
    startDate: dateSchema, // <-- CORRIGIDO: era partialDate, JSON inclui day
    endDate: dateSchema, // <-- CORRIGIDO: era partialDate, JSON inclui day
});

const PreviousEmploymentEntry = z.object({
    name: requiredText(40),
    street1: optionalText(40).optional(),
    street2: optionalText(40).optional(), // <-- ADICIONADO
    city: requiredText(20),
    state: optionalText(20).optional(),
    postalCode: optionalText(10).optional(),
    country: requiredText(40),
    phone: optionalPhone,
    jobTitle: optionalText(40).optional(),
    supervisor: optionalText(33).optional(), // <-- CORRIGIDO: era 'supervisorSurname'
    supervisorGivenName: optionalText(33).optional(),
    startDate: dateSchema, // <-- CORRIGIDO: era partialDate
    endDate: dateSchema, // <-- CORRIGIDO: era partialDate
    duties: optionalText(200).optional(),
});

export const WorkEducation2Schema = z.object({
    hasPreviousEmployment: yesNo.optional().default('N'),
    previousEmployment: z.array(PreviousEmploymentEntry).max(5).optional().default([]),
    hasEducation: yesNo.optional().default('N'),
    education: z.array(EducationEntry).max(5).optional().default([]),
});

// ============================================================
// 13. WORK/EDUCATION 3
// ============================================================
export const WorkEducation3Schema = z.object({
    clanTribe: yesNo.optional().default('N'),
    clanTribeName: optionalText(40).optional(),
    languages: z.array(z.string().min(1)).optional().default([]),
    countriesVisited: yesNo.optional().default('N'),
    countriesVisitedList: z.array(z.string().min(1)).max(20).optional().default([]),
    organizationMember: yesNo.optional().default('N'),
    organizations: z.array(optionalText(100)).max(5).optional().default([]),
    specializedSkills: yesNo.optional().default('N'),
    specializedSkillsExplanation: explanationText,
    militaryService: yesNo.optional().default('N'),
    military: z.array(z.object({
        country: requiredText(40),
        branch: requiredText(40),
        rank: optionalText(40).optional(),
        specialty: optionalText(40).optional(), // <-- CORRIGIDO: era 'speciality'
        startDate: dateSchema, // <-- CORRIGIDO: era partialDate
        endDate: dateSchema, // <-- CORRIGIDO: era partialDate
    })).max(5).optional().default([]),
    insurgentOrg: yesNo.optional().default('N'),
    insurgentOrgExplanation: explanationText,
});

// ============================================================
// 14. SECURITY (EXPANDIDO — campos reais do DS-160)
// ============================================================
export const SecuritySchema = z.object({
    // Security1 - Health
    disease: optionalYesNo, diseaseExpl: explanationText,
    disorder: optionalYesNo, disorderExpl: explanationText,
    drugUser: optionalYesNo, drugUserExpl: explanationText,
    // Security2 - Criminal
    arrested: optionalYesNo, arrestedExpl: explanationText,
    controlledSubstances: optionalYesNo, controlledSubstancesExpl: explanationText,
    prostitution: optionalYesNo, prostitutionExpl: explanationText,
    moneyLaundering: optionalYesNo, moneyLaunderingExpl: explanationText,
    humanTrafficking: optionalYesNo, humanTraffickingExpl: explanationText,
    assistedSevereTrafficking: optionalYesNo, assistedSevereTraffickingExpl: explanationText,
    humanTraffickingRelated: optionalYesNo, humanTraffickingRelatedExpl: explanationText,
    // Security3 - National Security
    illegalActivity: optionalYesNo, illegalActivityExpl: explanationText,
    terroristActivity: optionalYesNo, terroristActivityExpl: explanationText,
    terroristSupport: optionalYesNo, terroristSupportExpl: explanationText,
    terroristOrg: optionalYesNo, terroristOrgExpl: explanationText,
    terroristRel: optionalYesNo, terroristRelExpl: explanationText,
    genocide: optionalYesNo, genocideExpl: explanationText,
    torture: optionalYesNo, tortureExpl: explanationText,
    exViolence: optionalYesNo, exViolenceExpl: explanationText,
    childSoldier: optionalYesNo, childSoldierExpl: explanationText,
    religiousFreedom: optionalYesNo, religiousFreedomExpl: explanationText,
    populationControls: optionalYesNo, populationControlsExpl: explanationText,
    transplant: optionalYesNo, transplantExpl: explanationText,
    // Security4 - Immigration
    removalHearing: optionalYesNo, removalHearingExpl: explanationText,
    immigrationFraud: optionalYesNo, immigrationFraudExpl: explanationText,
    failToAttend: optionalYesNo, failToAttendExpl: explanationText,
    visaViolation: optionalYesNo, visaViolationExpl: explanationText,
    deport: optionalYesNo, deportExpl: explanationText,
    // Security5 - Miscellaneous
    childCustody: optionalYesNo, childCustodyExpl: explanationText,
    votingViolation: optionalYesNo, votingViolationExpl: explanationText,
    renounceExp: optionalYesNo, renounceExpExpl: explanationText,
    attWoReimb: optionalYesNo, attWoReimbExpl: explanationText,
});

// ============================================================
// SCHEMA COMPLETO (check final)
// ============================================================
export const ApplicantDataSchema = z.object({
    location: z.string().optional(), // Interview location code
    personal1: Personal1Schema,
    personal2: Personal2Schema,
    addressPhone: AddressPhoneSchema,
    passport: PassportSchema,
    travel: TravelSchema,
    usContact: USContactSchema.optional(),
    travelCompanions: TravelCompanionsSchema.optional(),
    previousUSTravel: PreviousUSTravelSchema.optional(),
    family1: Family1Schema,
    family2: Family2Schema.optional(),
    deceasedSpouse: DeceasedSpouseSchema.optional(), // <-- ADICIONADO
    prevSpouse: PrevSpouseSchema.optional(), // <-- ADICIONADO
    workEducation1: WorkEducation1Schema,
    workEducation2: WorkEducation2Schema.optional(),
    workEducation3: WorkEducation3Schema.optional(),
    security: SecuritySchema.optional(),
});

// ============================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================

/**
 * Valida uma seção específica e retorna resultado formatado
 * @param {string} section - Nome da seção (ex: 'personal1')
 * @param {object} data - Dados da seção
 * @returns {{ success: boolean, errors: Array<{field: string, message: string}> }}
 */
export function validateSection(section, data) {
    const schemas = {
        personal1: Personal1Schema,
        personal2: Personal2Schema,
        addressPhone: AddressPhoneSchema,
        passport: PassportSchema,
        travel: TravelSchema,
        usContact: USContactSchema,
        travelCompanions: TravelCompanionsSchema,
        previousUSTravel: PreviousUSTravelSchema,
        family1: Family1Schema,
        family2: Family2Schema,
        deceasedSpouse: DeceasedSpouseSchema,
        prevSpouse: PrevSpouseSchema,
        workEducation1: WorkEducation1Schema,
        workEducation2: WorkEducation2Schema,
        workEducation3: WorkEducation3Schema,
        security: SecuritySchema,
    };

    const schema = schemas[section];
    if (!schema) return { success: true, errors: [] };

    const result = schema.safeParse(data);
    if (result.success) return { success: true, errors: [] };

    const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
    }));

    return { success: false, errors };
}

/**
 * Valida todos os dados do applicant (check final)
 * @param {object} data - Dados completos do applicant
 * @returns {{ success: boolean, errors: Array<{section: string, field: string, message: string}> }}
 */
export function validateAll(data) {
    const result = ApplicantDataSchema.safeParse(data);
    if (result.success) return { success: true, errors: [] };

    const errors = result.error.issues.map(issue => ({
        section: issue.path[0] || 'unknown',
        field: issue.path.slice(1).join('.'),
        message: issue.message,
        code: issue.code,
    }));

    return { success: false, errors };
}

// Exportar tudo para uso global (formulários vanilla JS)
if (typeof window !== 'undefined') {
    window.DS160Validation = {
        validateSection,
        validateAll,
        schemas: {
            Personal1Schema, Personal2Schema, AddressPhoneSchema,
            PassportSchema, TravelSchema, USContactSchema,
            TravelCompanionsSchema, PreviousUSTravelSchema,
            Family1Schema, Family2Schema,
            DeceasedSpouseSchema, PrevSpouseSchema,
            WorkEducation1Schema, WorkEducation2Schema, WorkEducation3Schema,
            SecuritySchema, ApplicantDataSchema,
        }
    };
}
