/**
 * Auditoria completa: generateJSON vs campos condicionais
 * Verifica TODAS as possíveis fontes de erros desnecessários
 */
const fs = require('fs');
const html = fs.readFileSync('docs/ds160/index.html', 'utf-8');

const issues = [];
const ok = [];

// ===== 1. CHECKBOXES N/A =====
console.log('══════════════════════════════════════════');
console.log('1. CHECKBOXES "NÃO SE APLICA" (N/A)');
console.log('══════════════════════════════════════════');
const lines = html.split('\n');
const naCheckboxes = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('class="na-cb"') && lines[i].includes('id="')) {
        const idMatch = lines[i].match(/id="([^"]+)"/);
        let targetMatch = lines[i].match(/data-target="([^"]+)"/);
        if (!targetMatch && i + 1 < lines.length) {
            targetMatch = lines[i + 1].match(/data-target="([^"]+)"/);
        }
        if (idMatch) {
            naCheckboxes.push({ id: idMatch[1], target: targetMatch ? targetMatch[1] : '?', line: i + 1 });
        }
    }
}

// Check val() function handles disabled fields
const valFunc = html.match(/function val\(id\)\s*\{[\s\S]*?^\s{8}\}/m);
const valHandlesNA = html.includes('.na-cb[data-target*=') && html.includes("return 'DNA'");
console.log(`  Total checkboxes N/A: ${naCheckboxes.length}`);
console.log(`  val() detecta N/A: ${valHandlesNA ? '✅ SIM' : '❌ NÃO'}`);

const dateValHandlesNA = html.includes("=== 'DNA'") && html.includes("return 'DNA'");
console.log(`  dateVal() detecta N/A: ${dateValHandlesNA ? '✅ SIM' : '❌ NÃO'}`);

if (!valHandlesNA) issues.push('val() não detecta campos N/A disabled');
if (!dateValHandlesNA) issues.push('dateVal() não detecta campos N/A');

naCheckboxes.forEach(cb => {
    console.log(`  ${cb.id} -> ${cb.target}`);
});

// ===== 2. SEÇÕES CONDICIONAIS (radio -> array/objeto) =====
console.log('\n══════════════════════════════════════════');
console.log('2. ARRAYS CONDICIONAIS (radio controla)');
console.log('══════════════════════════════════════════');

const genStart = html.indexOf('function generateJSON()');
const genEnd = html.indexOf('\n        // Security', genStart + 100);
const genBlock = html.substring(genStart, genEnd > genStart ? genEnd + 500 : genStart + 20000);

const conditionalArrays = [
    { radio: 'rblOtherNames', key: 'otherNames', listId: 'DListAlias' },
    { radio: 'rblAPP_OTH_NATL_IND', key: 'otherNationalities', listId: 'dtlOTHER_NATL' },
    { radio: 'rblPermResOtherCntryInd', key: 'permanentResidentCountries', listId: 'dtlOthPermResCntry' },
    { radio: 'rblOtherPersonsTravelingWithYou', key: 'companions', listId: 'dlTravelCompanions' },
    { radio: 'rblPREV_US_TRAVEL_IND', key: 'previousVisits', listId: 'dtlPREV_US_VISIT' },
    { radio: 'rblPREV_US_DRIVER_LIC_IND', key: 'driversLicenses', listId: 'dtlUS_DRIVER_LICENSE' },
    { radio: 'rblLOST_PPT_IND', key: 'lostPassports', listId: 'dtlLostPPT' },
    { radio: 'rblUS_IMMED_RELATIVE_IND', key: 'relatives', listId: 'dlUSRelatives' },
    { radio: 'rblPreviouslyEmployed', key: 'previousEmployment', listId: 'dtlPrevEmpl' },
    { radio: 'rblOtherEduc', key: 'education', listId: 'dtlPrevEduc' },
    { radio: 'rblMILITARY_SERVICE_IND', key: 'military', listId: 'dtlMILITARY_SERVICE' },
    { radio: 'rblAddPhone', key: 'additionalPhoneNumbers', listId: 'dtlAddPhone' },
    { radio: 'rblAddEmail', key: 'additionalEmailAddresses', listId: 'dtlAddEmail' },
    { radio: 'rblAddSocial', key: 'additionalSocialMediaAccounts', listId: 'dtlAddSocial' },
    { radio: 'rblCOUNTRIES_VISITED_IND', key: 'countriesVisitedList', listId: 'dtlCountriesVisited' },
    { radio: 'rblORGANIZATION_IND', key: 'organizations', listId: 'dtlORGANIZATIONS' },
    { radio: 'rblCLAN_TRIBE_IND', key: 'clanTribeName', listId: null },
];

conditionalArrays.forEach(ca => {
    // Check if the array is conditionally collected
    const pattern1 = `${ca.radio}') === 'Y' ? collectEntries`;
    const pattern2 = `${ca.radio}') === 'Y' ?`;
    const isConditional = genBlock.includes(pattern1) || genBlock.includes(pattern2);

    // For non-array fields, check differently
    if (!ca.listId) {
        console.log(`  ⏭️  ${ca.key} (${ca.radio}) — campo simples, não array`);
        return;
    }

    if (isConditional) {
        console.log(`  ✅ ${ca.key} (${ca.radio}) — condicional`);
        ok.push(`Array ${ca.key} é condicional em ${ca.radio}`);
    } else {
        // Check if it uses collectEntries at all
        const usesCollect = genBlock.includes(`collectEntries('${ca.listId}'`);
        if (usesCollect) {
            console.log(`  ❌ ${ca.key} (${ca.radio}) — SEMPRE coleta, risco de dados vazios!`);
            issues.push(`Array ${ca.key} (${ca.listId}) sempre coleta mesmo quando ${ca.radio}='N'`);
        } else {
            console.log(`  ⚠️  ${ca.key} (${ca.radio}) — não encontrado no generateJSON`);
        }
    }
});

// ===== 3. OBJETOS CONDICIONAIS =====
console.log('\n══════════════════════════════════════════');
console.log('3. OBJETOS CONDICIONAIS');
console.log('══════════════════════════════════════════');

const conditionalObjects = [
    { condition: "radioVal('rblMailingAddrSame') === 'N'", key: 'mailingAddress', desc: 'Endereço de correspondência' },
    { condition: "radioVal('rblPREV_VISA_IND') === 'Y'", key: 'previousVisa', desc: 'Visto anterior' },
    { condition: "pg-Family2", key: 'family2', desc: 'Cônjuge (casado)' },
    { condition: "pg-DeceasedSpouse", key: 'deceasedSpouse', desc: 'Cônjuge falecido (viúvo)' },
    { condition: "pg-PrevSpouse", key: 'prevSpouse', desc: 'Ex-cônjuge (divorciado)' },
];

conditionalObjects.forEach(co => {
    const isConditional = genBlock.includes(co.condition) || genBlock.includes(`'${co.condition}'`);
    if (isConditional) {
        console.log(`  ✅ ${co.key} — ${co.desc} (condicional)`);
        ok.push(`Objeto ${co.key} é condicional`);
    } else {
        // Check more loosely
        const hasUndefined = genBlock.includes(`${co.key}:`) && genBlock.includes(': undefined');
        if (hasUndefined) {
            console.log(`  ✅ ${co.key} — ${co.desc} (usa undefined)`);
        } else {
            console.log(`  ❌ ${co.key} — ${co.desc} — SEMPRE incluído!`);
            issues.push(`Objeto ${co.key} sempre incluído sem verificar condição`);
        }
    }
});

// ===== 4. ENDEREÇO DO CÔNJUGE =====
console.log('\n══════════════════════════════════════════');
console.log('4. SUB-OBJETOS CONDICIONAIS');
console.log('══════════════════════════════════════════');

const subConditionals = [
    { pattern: "ddlSpouseAddressType') === 'O'", key: 'spouse.address', desc: 'Endereço do cônjuge (só quando addressType=O)' },
    { pattern: "ddlWhoIsPaying').value", key: 'payer', desc: 'Pagador (depende de whoIsPaying)' },
];

subConditionals.forEach(sc => {
    const found = genBlock.includes(sc.pattern);
    console.log(`  ${found ? '✅' : '⚠️ '} ${sc.key} — ${sc.desc}`);
});

// ===== 5. CAMPOS QUE PODEM GERAR ERROS COM VALOR VAZIO =====
console.log('\n══════════════════════════════════════════');
console.log('5. CAMPOS RADIO OBRIGATÓRIOS');
console.log('══════════════════════════════════════════');

const requiredRadios = [
    'rblPREV_US_TRAVEL_IND', 'rblPREV_US_DRIVER_LIC_IND', 'rblPREV_VISA_IND',
    'rblPREV_VISA_REFUSED_IND', 'rblIV_PETITION_IND', 'rblPERM_RESIDENT_IND', 'rblVWP_DENIAL_IND',
    'rblMailingAddrSame', 'rblAddPhone', 'rblAddEmail', 'rblAddSocial',
    'rblLOST_PPT_IND', 'rblFATHER_LIVE_IN_US_IND', 'rblMOTHER_LIVE_IN_US_IND',
    'rblUS_IMMED_RELATIVE_IND', 'rblUS_OTHER_RELATIVE_IND',
    'rblPreviouslyEmployed', 'rblOtherEduc', 'rblMILITARY_SERVICE_IND',
    'rblOtherNames', 'rblTelecodeQuestion', 'rblAPP_OTH_NATL_IND', 'rblPermResOtherCntryInd',
    'rblSpecificTravel', 'rblOtherPersonsTravelingWithYou',
    'rblCLAN_TRIBE_IND', 'rblCOUNTRIES_VISITED_IND', 'rblORGANIZATION_IND',
    'rblSPECIALIZED_SKILLS_IND', 'rblINSURGENT_ORG_IND',
];
console.log(`  Total radios mapeados: ${requiredRadios.length}`);
console.log('  (Estes são campos que o Zod pode exigir "Sim ou Não")');
console.log('  → Se não respondidos, geram erro — isso é CORRETO (dados genuínos faltando)');

// ===== 6. COMPANIONS condicionais =====
console.log('\n══════════════════════════════════════════');
console.log('6. ARRAYS QUE FALTAM CONDIÇÃO');
console.log('══════════════════════════════════════════');

const uncheckedArrays = [
    { radio: 'rblOtherNames', listId: 'DListAlias', key: 'otherNames' },
    { radio: 'rblAPP_OTH_NATL_IND', listId: 'dtlOTHER_NATL', key: 'otherNationalities' },
    { radio: 'rblPermResOtherCntryInd', listId: 'dtlOthPermResCntry', key: 'permanentResidentCountries' },
    { radio: 'rblOtherPersonsTravelingWithYou', listId: 'dlTravelCompanions', key: 'companions' },
    { radio: 'rblUS_IMMED_RELATIVE_IND', listId: 'dlUSRelatives', key: 'relatives' },
    { radio: 'rblAddPhone', listId: 'dtlAddPhone', key: 'additionalPhoneNumbers' },
    { radio: 'rblAddEmail', listId: 'dtlAddEmail', key: 'additionalEmailAddresses' },
    { radio: 'rblAddSocial', listId: 'dtlAddSocial', key: 'additionalSocialMediaAccounts' },
    { radio: 'rblCOUNTRIES_VISITED_IND', listId: 'dtlCountriesVisited', key: 'countriesVisitedList' },
    { radio: 'rblORGANIZATION_IND', listId: 'dtlORGANIZATIONS', key: 'organizations' },
];

uncheckedArrays.forEach(ua => {
    const conditional = genBlock.includes(`${ua.radio}') === 'Y' ? collectEntries`);
    if (!conditional) {
        const usesCollect = genBlock.includes(`collectEntries('${ua.listId}'`);
        if (usesCollect) {
            console.log(`  ❌ ${ua.key} (${ua.radio}) — SEMPRE coleta!`);
            issues.push(`Array ${ua.key} sempre coleta entradas mesmo com radio='N'`);
        }
    } else {
        console.log(`  ✅ ${ua.key} — já condicional`);
    }
});

// ===== 7. EXPLICAÇÕES CONDICIONAIS =====
console.log('\n══════════════════════════════════════════');
console.log('7. CAMPOS EXPLANATION CONDICIONAIS');
console.log('══════════════════════════════════════════');

const explanationFields = [
    { radio: 'rblPREV_VISA_REFUSED_IND', field: 'tbxPREV_VISA_REFUSED_EXPL', key: 'visaRefusedExplanation' },
    { radio: 'rblIV_PETITION_IND', field: 'tbxIV_PETITION_EXPL', key: 'immigrantPetitionExplanation' },
    { radio: 'rblPERM_RESIDENT_IND', field: 'tbxPERM_RESIDENT_EXPL', key: 'permanentResidentExplanation' },
    { radio: 'rblVWP_DENIAL_IND', field: 'tbxVWP_DENIAL_EXPL', key: 'vwpDenialExplanation' },
    { radio: 'rblSPECIALIZED_SKILLS_IND', field: 'tbxSPECIALIZED_SKILLS_EXPL', key: 'specializedSkillsExplanation' },
    { radio: 'rblINSURGENT_ORG_IND', field: 'tbxINSURGENT_ORG_EXPL', key: 'insurgentOrgExplanation' },
];
explanationFields.forEach(ef => {
    // These are always included but empty is fine — validation is on the branch, not standalone
    console.log(`  ℹ️  ${ef.key} — sempre incluído (string vazia = OK por Zod)`);
});

// ===== 8. SECURITY RADIO FIELDS =====
console.log('\n══════════════════════════════════════════');
console.log('8. SECURITY RADIOS (defaulted to "N")');
console.log('══════════════════════════════════════════');
const securityRadios = genBlock.match(/radioVal\('rbl(Disease|Disorder|Druguser|Arrested|ControlledSubstances|Prostitution|MoneyLaundering|HumanTrafficking|AssistedSevereTrafficking|HumanTraffickingRelated|IllegalActivity|TerroristActivity|PalestineAssist|Genocide|Torture|ExjudicialKilling|ChildSoldier|ReligiousFreedom|PopControl|Transplant|USPresElect|Smuggling|Polygamy|GuardianAccompany|Withhold|Unlawful)'\)/g);
const defaultsSet = html.includes("querySelectorAll('input[type=\"radio\"][value=\"N\"]')");
console.log(`  Security radios encontrados: ${securityRadios ? securityRadios.length : 0}`);
console.log(`  Default 'Não' aplicado automaticamente: ${defaultsSet ? '✅' : '❌'}`);

// ===== SUMMARY =====
console.log('\n══════════════════════════════════════════');
console.log('═══════ RESUMO DA AUDITORIA ═══════');
console.log('══════════════════════════════════════════');
if (issues.length === 0) {
    console.log('\n✅ NENHUM PROBLEMA ENCONTRADO!');
} else {
    console.log(`\n❌ ${issues.length} PROBLEMA(S) ENCONTRADO(S):`);
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
}

// Write results to file
const output = { issues, ok, naCheckboxes: naCheckboxes.length, timestamp: new Date().toISOString() };
fs.writeFileSync('scripts/audit-results.json', JSON.stringify(output, null, 2));
