const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').replace(/\r/g, '').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const i = line.indexOf('=');
    if (i === -1) return;
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkFrontendData() {
  console.log('🔍 VALIDAÇÃO DOS DADOS DO FRONTEND\n');

  // Pegar um applicant que tenha preenchido algo
  const { data: applicants } = await supabase
    .from('applicants')
    .select('id, full_name, data')
    .not('data', 'is', null)
    .limit(5);

  if (!applicants?.length) {
    console.log('❌ Nenhum applicant com data preenchida');
    return;
  }

  console.log(`📋 Analisando ${applicants.length} applicants com JSON:\n`);

  const issues = [];

  for (const app of applicants) {
    const data = app.data;
    if (!data || typeof data !== 'object') {
      issues.push(`${app.full_name}: data não é objeto`);
      continue;
    }

    console.log(`👤 ${app.full_name} (${app.id.substring(0,8)}...)`);

    // Verificar estruturaesperada
    const expectedTop = ['personal1', 'personal2', 'travel', 'passport', 'addressPhone', 'family1', 'family2', 'workEducation', 'security'];
    const missing = expectedTop.filter(k => !data[k]);

    if (missing.length > 0) {
      console.log(`   ⚠️  Seções faltando: ${missing.join(', ')}`);
      issues.push(`${app.full_name}: faltam seções`);
    }

    // Verificar travel (obrigatório para automação)
    if (data.travel) {
      const t = data.travel;
      const travelErrors = [];
      if (!t.purposeOfTrip) travelErrors.push('purposeOfTrip');
      if (!t.arrivalDate) travelErrors.push('arrivalDate');
      if (!t.usAddress) travelErrors.push('usAddress');
      if (!t.payingForTrip) travelErrors.push('payingForTrip');

      if (travelErrors.length > 0) {
        console.log(`   ⚠️  Travel faltando: ${travelErrors.join(', ')}`);
        issues.push(`${app.full_name}: travel incompleto`);
      } else {
        console.log(`   ✅ Travel OK (purpose: ${t.purposeOfTrip}, arrival: ${t.arrivalDate})`);
      }
    }

    // Verificar personal1
    if (data.personal1) {
      const p1 = data.personal1;
      const p1Errors = [];
      if (!p1.surname) p1Errors.push('surname');
      if (!p1.givenName) p1Errors.push('givenName');
      if (!p1.sex) p1Errors.push('sex');
      if (!p1.maritalStatus) p1Errors.push('maritalStatus');
      if (!p1.dob) p1Errors.push('dob');
      if (!p1.cityOfBirth) p1Errors.push('cityOfBirth');
      if (!p1.countryOfBirth) p1Errors.push('countryOfBirth');

      if (p1Errors.length > 0) {
        console.log(`   ⚠️  Personal1 faltando: ${p1Errors.join(', ')}`);
        issues.push(`${app.full_name}: personal1 incompleto`);
      } else {
        console.log(`   ✅ Personal1 OK (${p1.givenName} ${p1.surname}, ${p1.dob})`);
      }
    }

    // Verificar passport
    if (data.passport) {
      const pp = data.passport;
      if (!pp.number) {
        console.log(`   ⚠️  Passport.number faltando`);
        issues.push(`${app.full_name}: passport number`);
      } else {
        console.log(`   ✅ Passport OK (${pp.number})`);
      }
    }

    // Verificar contact
    if (data.addressPhone) {
      const ap = data.addressPhone;
      if (!ap.phone || !ap.email) {
        console.log(`   ⚠️  Contact info faltando`);
        issues.push(`${app.full_name}: contact`);
      } else {
        console.log(`   ✅ Contact OK (${ap.phone}, ${ap.email})`);
      }
    }

    console.log('');
  }

  // Resumo
  console.log('='.repeat(50));
  if (issues.length === 0) {
    console.log('✅ TODOS OS DADOS ESTÃO COMPLETOS E ESTRUTURADOS');
  } else {
    console.log(`⚠️  PROBLEMAS ENCONTRADOS: ${issues.length}`);
    issues.forEach(i => console.log(`   - ${i}`));
  }

  // Testar se o JSON seria aceito pelo normalize-profile.js
  console.log('\n🧪 SIMULANDO NORMALIZE PROFILE:');
  const testData = applicants[0]?.data;
  if (testData) {
    try {
      // Simular normalize-profile (função básica)
      const profile = {
        surname: testData.personal1?.surname || '',
        givenName: testData.personal1?.givenName || '',
        sex: testData.personal1?.sex || '',
        maritalStatus: testData.personal1?.maritalStatus || '',
        dob: testData.personal1?.dob || {},
        cityOfBirth: testData.personal1?.cityOfBirth || '',
        countryOfBirth: testData.personal1?.countryOfBirth || '',
        nationality: testData.personal2?.nationality || '',
        purposeOfTrip: testData.travel?.purposeOfTrip || '',
        arrivalDate: testData.travel?.arrivalDate || {},
        usAddress: testData.travel?.usAddress || {},
        payingForTrip: testData.travel?.payingForTrip || '',
        passport: testData.passport || {},
        phone: testData.addressPhone?.phone || '',
        email: testData.addressPhone?.email || '',
      };

      const missing = ['surname','givenName','sex','maritalStatus','dob','cityOfBirth','countryOfBirth','nationality','purposeOfTrip','passport.number','phone','email']
        .filter(k => {
          if (k.includes('.')) {
            const [obj, prop] = k.split('.');
            return !profile[obj] || !profile[obj][prop];
          }
          return !profile[k];
        });

      if (missing.length > 0) {
        console.log(`❌ normalize-profile falharia: ${missing.join(', ')}`);
      } else {
        console.log(`✅ normalize-profile aceitaria este JSON (${Object.keys(profile).length} campos)`);
      }
    } catch (e) {
      console.log(`❌ Erro ao simular: ${e.message}`);
    }
  }
}
checkFrontendData().catch(e => console.error(e));
