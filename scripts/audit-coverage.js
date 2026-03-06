#!/usr/bin/env node
// ============================================================
// AUDITORIA DE COBERTURA — Verifica se os perfis cobrem TODOS
// os condicionais e AddAnother do field-map.js
// ============================================================
const path = require('path');
const { normalizeProfile } = require(path.join(__dirname, '..', 'automation', 'filler'));
const { buildDynamicFieldMap } = require(path.join(__dirname, '..', 'automation', 'field-map'));
const { PROFILES } = require('./test-profiles');

// ── 1. Rodar cada perfil e coletar os patterns gerados ──
const coverage = {};     // pattern → [perfis que geraram este campo]
const addAnotherCoverage = {}; // list → [perfis que usaram addAnother nesta list]
const profileStats = {};

for (const [name, profile] of Object.entries(PROFILES)) {
    const normalized = normalizeProfile(profile.data);
    const fm = buildDynamicFieldMap(normalized);

    const uniquePatterns = new Set();
    let addAnotherCount = 0;

    for (const entry of fm) {
        const p = entry.pattern.toString();
        uniquePatterns.add(p);

        if (!coverage[p]) coverage[p] = [];
        coverage[p].push(name);

        if (entry.addAnother) {
            addAnotherCount++;
            const listName = entry.addAnother.list;
            if (!addAnotherCoverage[listName]) addAnotherCoverage[listName] = [];
            if (!addAnotherCoverage[listName].includes(name)) {
                addAnotherCoverage[listName].push(name);
            }
        }
    }

    profileStats[name] = { fields: fm.length, unique: uniquePatterns.size, addAnother: addAnotherCount };
}

// ── 2. Lista de TODOS os condicionais do field-map.js ──
// Extraídos manualmente da análise completa do código
const ALL_CONDITIONALS = {
    // Personal 1
    'otherNamesUsed=Y (DListAlias AddAnother)': (p) => p.some(e => /DListAlias/i.test(e)),
    'otherNamesUsed=N (rblOtherNames_1)': (p) => p.some(e => /rblOtherNames_1/i.test(e)),
    'telecode=Y (telecodeSurname/GivenName)': (p) => p.some(e => /TelecodeQuestion_0/i.test(e)),
    'telecode=N (TelecodeQuestion_1)': (p) => p.some(e => /TelecodeQuestion_1/i.test(e)),

    // Personal 2
    'otherNationality=Y (dtlOTHER_NATL AddAnother)': (p) => p.some(e => /dtlOTHER_NATL|OTH_NATL_IND_0/i.test(e)),
    'otherNationality=N (OTH_NATL_IND_1)': (p) => p.some(e => /OTH_NATL_IND_1/i.test(e)),
    'otherNationalityPassport=Y (passport number)': (p) => p.some(e => /OTH_NATL_PPT_NUM/i.test(e)),
    'otherNationalityPassport=N (no passport number)': (p) => p.some(e => /OTH_NATL_HAS_PPT_1|OTH_NATL_PPT_NUM_NA/i.test(e)),
    'permanentResident=Y (dtlOthPermResCntry AddAnother)': (p) => p.some(e => /PermResOtherCntryInd_0|dtlOthPermResCntry/i.test(e)),
    'permanentResident=N (PermRes_1)': (p) => p.some(e => /PermResOtherCntryInd_1/i.test(e)),
    'ssn=DNA (checkbox)': (p) => p.some(e => /SSN_NA/i.test(e)),
    'ssn=valid (3 fields)': (p) => p.some(e => /APP_SSN1\$/i.test(e)),
    'taxId=DNA (checkbox)': (p) => p.some(e => /TAX_ID_NA/i.test(e)),
    'taxId=valid (field)': (p) => p.some(e => /APP_TAX_ID\$/i.test(e) && !/NA/i.test(e)),
    'nationalId=DNA (checkbox)': (p) => p.some(e => /NATIONAL_ID_NA\$/i.test(e)),
    'nationalId=valid (field)': (p) => p.some(e => /NATIONAL_ID\$/i.test(e) && !/NA/i.test(e)),

    // Travel  
    'hasSpecificPlans=Y (dtlTravelLoc AddAnother)': (p) => p.some(e => /SpecificTravel_0|dtlTravelLoc/i.test(e)),
    'hasSpecificPlans=N (nonSpecific arrival)': (p) => p.some(e => /SpecificTravel_1/i.test(e)),
    'whoIsPaying=SELF': (p) => p.some(e => /WhoIsPaying.*SELF|ddlWhoIsPaying/i.test(e)),
    'whoIsPaying=OTH (payer name + address)': (p) => p.some(e => /PayerSurname\$/i.test(e)),
    'whoIsPaying=COM (company payer)': (p) => p.some(e => /PayingCompany\$/i.test(e)),
    'payer.sameAddress=Y (no address)': (p) => p.some(e => /PayerAddrSameAsInd_0/i.test(e)),
    'payer.sameAddress=N (payer address)': (p) => p.some(e => /PayerAddrSameAsInd_1/i.test(e)),

    // Travel Companions
    'travelingWithOthers=Y (dlTravelCompanions AddAnother)': (p) => p.some(e => /OtherPersonsTraveling_0|dlTravelCompanions/i.test(e)),
    'travelingWithOthers=N': (p) => p.some(e => /OtherPersonsTraveling_1/i.test(e)),
    'partOfGroup=Y (groupName)': (p) => p.some(e => /GroupTravel_0|GroupName/i.test(e)),
    'partOfGroup=N': (p) => p.some(e => /GroupTravel_1/i.test(e)),

    // Previous US Travel
    'hasBeenInUS=Y (dtlPREV_US_VISIT AddAnother)': (p) => p.some(e => /PREV_US_TRAVEL_IND_0|dtlPREV_US_VISIT/i.test(e)),
    'hasBeenInUS=N': (p) => p.some(e => /PREV_US_TRAVEL_IND_1/i.test(e)),
    'hasDriversLicense=Y (dtlUS_DRIVER_LICENSE)': (p) => p.some(e => /DRIVER_LIC_IND_0|dtlUS_DRIVER_LICENSE/i.test(e)),
    'hasDriversLicense=N': (p) => p.some(e => /DRIVER_LIC_IND_1|PREV_US_DRIVER_LIC_IND_1/i.test(e)),
    'hasUSVisa=Y (visa fields)': (p) => p.some(e => /PREV_VISA_IND_0/i.test(e)),
    'hasUSVisa=N': (p) => p.some(e => /PREV_VISA_IND_1/i.test(e)),
    'previousVisa.lost=Y': (p) => p.some(e => /PREV_VISA_LOST_IND_0|LOST_VISA_IND_0/i.test(e)),
    'previousVisa.lost=N': (p) => p.some(e => /PREV_VISA_LOST_IND_1|LOST_VISA_IND_1/i.test(e)),
    'previousVisa.cancelled=Y': (p) => p.some(e => /CANCELLED_VISA_IND_0/i.test(e)),
    'previousVisa.cancelled=N': (p) => p.some(e => /CANCELLED_VISA_IND_1/i.test(e)),
    'visaRefused=Y': (p) => p.some(e => /PREV_VISA_REFUSED_IND_0|IV_PETITION_REFUSED_0/i.test(e)),
    'visaRefused=N': (p) => p.some(e => /PREV_VISA_REFUSED_IND_1/i.test(e)),
    'immigrantPetition=Y': (p) => p.some(e => /IV_PETITION_IND_0/i.test(e)),
    'immigrantPetition=N': (p) => p.some(e => /IV_PETITION_IND_1/i.test(e)),

    // Address & Phone
    'mailingAddressSame=Y': (p) => p.some(e => /MailingAddr.*_0|MAILING_ADDR_SAME_0/i.test(e)),
    'mailingAddressSame=N (address fields)': (p) => p.some(e => /MailingAddr.*_1|MAILING_ADDR_SAME_1/i.test(e)),
    'mobilePhone=DNA (checkbox)': (p) => p.some(e => /MOBILE_NA/i.test(e)),
    'mobilePhone=valid': (p) => p.some(e => /APP_MOBILE_TEL\$/i.test(e) && !/NA/i.test(e)),
    'businessPhone=DNA (checkbox)': (p) => p.some(e => /BUS_TEL_NA/i.test(e)),
    'businessPhone=valid': (p) => p.some(e => /APP_BUS_TEL\$/i.test(e) && !/NA/i.test(e)),
    'additionalPhones=Y (dtlAddPhone AddAnother)': (p) => p.some(e => /AddPhone_0|dtlAddPhone/i.test(e)),
    'additionalPhones=N': (p) => p.some(e => /AddPhone_1/i.test(e)),
    'additionalEmails=Y (dtlAddEmail AddAnother)': (p) => p.some(e => /AddEmail_0|dtlAddEmail/i.test(e)),
    'additionalEmails=N': (p) => p.some(e => /AddEmail_1/i.test(e)),
    'additionalSocialMedia=Y (dtlAddSocial AddAnother)': (p) => p.some(e => /AddSocial_0|AddSite_0|dtlAddSocial/i.test(e)),
    'additionalSocialMedia=N': (p) => p.some(e => /AddSocial_1|AddSite_1/i.test(e)),

    // Passport
    'bookNumber=DNA (checkbox)': (p) => p.some(e => /PPT_BOOK_NA|PPT_BOOK_NUM_NA/i.test(e)),
    'bookNumber=valid (text)': (p) => p.some(e => /tbxPPT_BOOK_NUM\$/i.test(e)),
    'lostOrStolen=Y (dtlLostPPT AddAnother)': (p) => p.some(e => /LOST_PPT_IND_0|dtlLostPPT/i.test(e)),
    'lostOrStolen=N': (p) => p.some(e => /LOST_PPT_IND_1/i.test(e)),

    // US Contact
    'nameDoNotKnow=true (checkboxes)': (p) => p.some(e => /US_POC_SURNAME_NA|US_POC_GIVEN_NAME_NA/i.test(e)),
    'nameDoNotKnow=false (name fields)': (p) => p.some(e => /tbxUS_POC_SURNAME\$/i.test(e)),
    'orgDoNotKnow=true (checkbox)': (p) => p.some(e => /US_POC_ORG_NA/i.test(e)),
    'orgDoNotKnow=false (org field)': (p) => p.some(e => /tbxUS_POC_ORG\$/i.test(e)),

    // Family 1
    'father.nameUnknown (checkboxes)': (p) => p.some(e => /FATHER_SURNAME_UNK|FatherSurnameUNK|FATHER_SURNAME_NA|cbxFATHER_SURNAME/i.test(e)),
    'father.name known (text fields)': (p) => p.some(e => /tbxFATHER_SURNAME\$|tbxFathersSurname\$/i.test(e)),
    'father.dobUnknown (checkbox)': (p) => p.some(e => /FATHER_DOB_UNK|FathersDOBUNK/i.test(e)),
    'father.dob known (date fields)': (p) => p.some(e => /ddlFathersDOBDay|ddlFATHER_DOBDay/i.test(e)),
    'father.inUS=Y (status)': (p) => p.some(e => /FATHER_LIVE_IN_US_IND_0|FATHER_US_0/i.test(e)),
    'father.inUS=N': (p) => p.some(e => /FATHER_LIVE_IN_US_IND_1|FATHER_US_1/i.test(e)),
    'mother.nameUnknown (checkboxes)': (p) => p.some(e => /MOTHER_SURNAME_UNK|MOTHER_SURNAME_NA|cbxMOTHER_SURNAME/i.test(e)),
    'mother.name known (text fields)': (p) => p.some(e => /tbxMOTHER_SURNAME\$/i.test(e)),
    'mother.dobUnknown (checkbox)': (p) => p.some(e => /MOTHER_DOB_UNK|MothersDOBUNK/i.test(e)),
    'mother.dob known (date fields)': (p) => p.some(e => /ddlMothersDOBDay|ddlMOTHER_DOBDay/i.test(e)),
    'mother.inUS=Y (status)': (p) => p.some(e => /MOTHER_LIVE_IN_US_IND_0|MOTHER_US_0/i.test(e)),
    'mother.inUS=N': (p) => p.some(e => /MOTHER_LIVE_IN_US_IND_1|MOTHER_US_1/i.test(e)),
    'immediateRelativesInUS=Y (dlUSRelatives AddAnother)': (p) => p.some(e => /US_IMMED_RELATIVE_IND_0/i.test(e)),
    'immediateRelativesInUS=N': (p) => p.some(e => /US_IMMED_RELATIVE_IND_1/i.test(e)),
    'otherRelativesInUS=Y': (p) => p.some(e => /US_OTHER_RELATIVE_IND_0/i.test(e)),
    'otherRelativesInUS=N': (p) => p.some(e => /US_OTHER_RELATIVE_IND_1/i.test(e)),

    // Family 2 - Spouse
    'maritalStatus M/C/P/L → spouse fields': (p) => p.some(e => /tbxSpouseSurname\$/i.test(e)),
    'maritalStatus S/other → spouse NA checkboxes': (p) => p.some(e => /SPOUSE_SURNAME_NA|SPOUSE_GIVEN_NAME_NA/i.test(e)),
    'spouse.addressType=O (address fields)': (p) => p.some(e => /SPOUSE_ADDR_LN1|SpouseAddr1/i.test(e)),

    // Previous Spouse (D)
    'maritalStatus=D → DListSpouse AddAnother': (p) => p.some(e => /DListSpouse|dlPrevSpouse/i.test(e)),

    // Deceased Spouse (W)
    'maritalStatus=W → deceased spouse fields': (p) => p.some(e => /DECEASED_SPOUSE_SURNAME|tbxSURNAME\$/i.test(e)),
    'deceasedSpouse.cityOfBirth empty → NA checkbox': (p) => p.some(e => /SPOUSE_POB_CITY_NA|DECEASED_SPOUSE_POB_CITY_NA|POB_CITY_NA/i.test(e)),

    // Work/Education 1
    'occupation code (select)': (p) => p.some(e => /ddlPresentOccupation\$/i.test(e)),
    'occupation=N|O → explanation': (p) => p.some(e => /ExplainOtherPresentOccupation/i.test(e)),
    'employer present → employer fields': (p) => p.some(e => /tbxEmpSchName\$/i.test(e)),
    'supervisor known → name fields': (p) => p.some(e => /SupervisorSurname\$/i.test(e) && !/NA/i.test(e)),
    'supervisor unknown → NA checkboxes': (p) => p.some(e => /SupervisorSurname.*_NA/i.test(e)),

    // Work/Education 2
    'hasPreviousEmployment=Y (dtlPrevEmpl AddAnother)': (p) => p.some(e => /rblPreviouslyEmployed_0/i.test(e)),
    'hasPreviousEmployment=N': (p) => p.some(e => /rblPreviouslyEmployed_1/i.test(e)),
    'prevEmpl supervisor known': (p) => p.some(e => /dtlPrevEmpl.*tbSupervisorSurname\$/i.test(e)),
    'prevEmpl supervisor=N/A → checkbox': (p) => p.some(e => /dtlPrevEmpl.*cbxSupervisorSurname_NA/i.test(e)),
    'hasEducation=Y (dtlPrevEduc AddAnother)': (p) => p.some(e => /rblOtherEduc_0/i.test(e)),
    'hasEducation=N': (p) => p.some(e => /rblOtherEduc_1/i.test(e)),

    // Work/Education 3
    'languages (dtlLANGUAGES AddAnother)': (p) => p.some(e => /dtlLANGUAGES/i.test(e)),
    'clanTribe=Y': (p) => p.some(e => /CLAN_TRIBE_IND_0/i.test(e)),
    'clanTribe=N': (p) => p.some(e => /CLAN_TRIBE_IND_1/i.test(e)),
    'countriesVisited=Y (dtlCountriesVisited AddAnother)': (p) => p.some(e => /COUNTRIES_VISITED_IND_0/i.test(e)),
    'countriesVisited=N': (p) => p.some(e => /COUNTRIES_VISITED_IND_1/i.test(e)),
    'organizationMember=Y (dtlORGANIZATIONS AddAnother)': (p) => p.some(e => /ORGANIZATION_IND_0/i.test(e)),
    'organizationMember=N': (p) => p.some(e => /ORGANIZATION_IND_1/i.test(e)),
    'specializedSkills=Y': (p) => p.some(e => /SPECIALIZED_SKILLS_IND_0/i.test(e)),
    'specializedSkills=N': (p) => p.some(e => /SPECIALIZED_SKILLS_IND_1/i.test(e)),
    'militaryService=Y (dtlMILITARY_SERVICE AddAnother)': (p) => p.some(e => /MILITARY_SERVICE_IND_0/i.test(e)),
    'militaryService=N': (p) => p.some(e => /MILITARY_SERVICE_IND_1/i.test(e)),
    'insurgentOrg=Y': (p) => p.some(e => /INSURGENT_ORG_IND_0/i.test(e)),
    'insurgentOrg=N': (p) => p.some(e => /INSURGENT_ORG_IND_1/i.test(e)),

    // Security
    'security field = Y (radio + explanation)': (p) => p.some(e => /rblDisease.*Y|rblArrested|rblDeport/i.test(e)),
};

// ── 3. Testar cada condicional contra os perfis ──
console.log('=== AUDITORIA DE COBERTURA DE CONDICIONAIS ===\n');

const allPatterns = {};
for (const [name, profile] of Object.entries(PROFILES)) {
    const normalized = normalizeProfile(profile.data);
    const fm = buildDynamicFieldMap(normalized);
    allPatterns[name] = fm.map(e => e.pattern.toString());
}

let covered = 0;
let missing = 0;
const missingList = [];

for (const [condName, testFn] of Object.entries(ALL_CONDITIONALS)) {
    const matchedProfiles = [];
    for (const [pName, patterns] of Object.entries(allPatterns)) {
        if (testFn(patterns)) matchedProfiles.push(pName);
    }

    if (matchedProfiles.length > 0) {
        covered++;
        // console.log(`COVERED: ${condName} (${matchedProfiles.length} perfis)`);
    } else {
        missing++;
        missingList.push(condName);
        console.log(`MISSING: ${condName}`);
    }
}

console.log(`\nCondicionais: ${covered} cobertos, ${missing} faltando, ${covered + missing} total`);

if (missingList.length) {
    console.log('\n--- CONDICIONAIS FALTANDO ---');
    missingList.forEach(m => console.log(`  - ${m}`));
}

// ── 4. AddAnother coverage ──
console.log('\n=== ADD ANOTHER COVERAGE ===\n');

const ALL_DATALISTS = [
    'DListAlias', 'dtlOTHER_NATL', 'dtlOthPermResCntry', 'dtlTravelLoc',
    'dlTravelCompanions', 'dtlPREV_US_VISIT', 'dtlUS_DRIVER_LICENSE',
    'dtlSocial', 'dtlAddPhone', 'dtlAddEmail', 'dtlLostPPT',
    'dlUSRelatives', 'DListSpouse', 'dtlPrevEmpl', 'dtlPrevEduc',
    'dtlLANGUAGES', 'dtlCountriesVisited', 'dtlORGANIZATIONS', 'dtlMILITARY_SERVICE'
];

let aaFound = 0;
let aaMissing = 0;
const aaMissingList = [];

for (const list of ALL_DATALISTS) {
    if (addAnotherCoverage[list]) {
        aaFound++;
        console.log(`COVERED: ${list} (by: ${addAnotherCoverage[list].join(', ')})`);
    } else {
        aaMissing++;
        aaMissingList.push(list);
        console.log(`MISSING: ${list}`);
    }
}

console.log(`\nAddAnother: ${aaFound} cobertos, ${aaMissing} faltando, ${ALL_DATALISTS.length} total`);

if (aaMissingList.length) {
    console.log('\n--- DATALISTS FALTANDO ---');
    aaMissingList.forEach(m => console.log(`  - ${m}`));
}

// ── 5. Summary ──
console.log('\n=== RESUMO FINAL ===');
console.log(`Perfis: ${Object.keys(PROFILES).length}`);
console.log(`Condicionais: ${covered}/${covered + missing} (${Math.round(covered / (covered + missing) * 100)}%)`);
console.log(`AddAnother: ${aaFound}/${ALL_DATALISTS.length} (${Math.round(aaFound / ALL_DATALISTS.length * 100)}%)`);
console.log(`Total patterns únicos: ${Object.keys(coverage).length}`);
