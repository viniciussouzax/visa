// AUDIT Supabase Integration - DS160 IA
// Rodar: node audit-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').replace(/\r/g, '').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const i = line.indexOf('=');
    if (i === -1) return;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function audit() {
  console.log('🔍 AUDITORIA SUPABASE - DS160 IA\n');
  console.log('=' .repeat(50));

  // 1. Conexão básica
  console.log('\n1️⃣  TESTE DE CONEXÃO');
  const { data: health, error: healthErr } = await supabase
    .from('applicants')
    .select('id')
    .limit(1);
  console.log(`   Conexão: ${healthErr ? '❌ FALHOU' : '✅ OK'}`);
  if (healthErr) console.log(`   Erro: ${healthErr.message}`);

  // 2. Listar tabelas importantes
  console.log('\n2️⃣  TABELAS CRÍTICAS');
  const criticalTables = [
    'applicants',
    'applications',
    'settings',
    'automation_config',
    'error_logs',
    'fill_logs',
    'members',
    'companies'
  ];

  for (const table of criticalTables) {
    const { count, error: countErr } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    const status = countErr ? '❌' : '✅';
    console.log(`   ${status} ${table.padEnd(20)} rows: ${countErr ? 'ERROR' : count}`);
  }

  // 3. Verificar settings (proxy, capmonster)
  console.log('\n3️⃣  CONFIGURAÇÕES (settings)');
  const { data: settings, error: settingsErr } = await supabase
    .from('settings')
    .select('key_name, key_value')
    .in('key_name', ['proxy_url', 'capmonster_key', 'headless', 'captcha_mode']);
  if (settingsErr) {
    console.log(`   ❌ Erro ao ler settings: ${settingsErr.message}`);
  } else {
    const keys = ['proxy_url', 'capmonster_key', 'headless', 'captcha_mode'];
    for (const key of keys) {
      const found = settings?.find(s => s.key_name === key);
      const status = found?.key_value ? '✅' : '❌';
      const value = found?.key_value ? (key === 'capmonster_key' ? '***' : found.key_value.substring(0, 30) + '...') : 'NULL';
      console.log(`   ${status} ${key.padEnd(20)} = ${value}`);
    }
  }

  // 4. Verificar automation_config
  console.log('\n4️⃣  AUTOMATION CONFIG');
  const { data: autoConfig, error: autoErr } = await supabase
    .from('automation_config')
    .select('*')
    .limit(1);
  if (autoErr || !autoConfig?.[0]) {
    console.log('   ❌ Nenhuma configuração de automação encontrada');
  } else {
    const config = autoConfig[0];
    console.log(`   ✅ Config encontrada (id: ${config.id})`);
    console.log(`      - captcha_mode: ${config.captcha_mode || 'N/A'}`);
    console.log(`      - timeout_default: ${config.timeout_default || 'N/A'}`);
    console.log(`      - retry_max: ${config.retry_max || 'N/A'}`);
  }

  // 5. Sample applicant - verificar estrutura do JSON
  console.log('\n5️⃣  AMOSTRA DE APPLICANT');
  const { data: sampleApplicants, error: sampleErr } = await supabase
    .from('applicants')
    .select('id, full_name, stage, status, company_id, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  if (sampleErr || !sampleApplicants?.length) {
    console.log('   ❌ Nenhum applicant encontrado');
  } else {
    console.log(`   ✅ Encontrados ${sampleApplicants.length} applicants (mostrando últimos 3):`);
    for (const a of sampleApplicants) {
      console.log(`      - ${a.full_name} | stage: ${a.stage} | status: ${a.status}`);
    }

    // 5a. Verificar dados JSON do primeiro
    const firstId = sampleApplicants[0].id;
    const { data: fullData } = await supabase
      .from('applicants')
      .select('data')
      .eq('id', firstId)
      .single();

    if (fullData?.data) {
      const keys = Object.keys(fullData.data);
      console.log(`      📦 JSON data: ${keys.length} campos raiz`);
      console.log(`         Top-level keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);

      // Verificar campos obrigatórios da automação
      const required = ['surname', 'givenName', 'sex', 'maritalStatus', 'dob', 'cityOfBirth', 'countryOfBirth', 'nationality', 'purposeOfTrip', 'passport', 'phone', 'email'];
      const missing = required.filter(k => !fullData.data[k]);
      if (missing.length > 0) {
        console.log(`      ⚠️  Campos obrigatórios faltando: ${missing.join(', ')}`);
      } else {
        console.log(`      ✅ Todos os ${required.length} campos obrigatórios presentes`);
      }
    } else {
      console.log('      ❌ Campo data NULL ou ausente');
    }
  }

  // 6. Aplicações vinculadas
  console.log('\n6️⃣  APLICAÇÕES (automation)');
  if (sampleApplicants?.length) {
    const applicantId = sampleApplicants[0].id;
    const { data: apps } = await supabase
      .from('applications')
      .select('id, fill_status, application_id, proxy_session, fill_started_at, fill_finished_at')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false });
    if (apps?.length) {
      console.log(`   ✅ ${apps.length} aplicações para este applicant:`);
      apps.forEach(app => {
        const proxy = app.proxy_session ? '✅ Proxy' : '❌ Sem proxy';
        console.log(`      - App ${app.id}: ${app.fill_status} | ${proxy}`);
      });
    } else {
      console.log('   ℹ️  Nenhuma aplicação registrada ainda');
    }
  }

  // 7. Verificar RLS policies (via query direta)
  console.log('\n7️⃣  ROW LEVEL SECURITY (RLS)');
  try {
    const { data: policies, error: polErr } = await supabase
      .rpc('pg_policies', { schemaname: 'public' });
    if (polErr || !policies?.length) {
      console.log('   ⚠️  Não foi possível listar policies (pode precisar de permissão admin)');
    } else {
      console.log(`   ✅ ${policies.length} policies encontradas:`);
      const byTable = {};
      policies.forEach(p => {
        if (!byTable[p.tablename]) byTable[p.tablename] = [];
        byTable[p.tablename].push(p.policyname);
      });
      Object.entries(byTable).forEach(([table, plist]) => {
        console.log(`      • ${table}: ${plist.length} policies`);
      });
    }
  } catch (e) {
    console.log(`   ⚠️  Erro ao verificar RLS: ${e.message}`);
  }

  // 8. Teste de escrita (leve)
  console.log('\n8️⃣  TESTE DE ESCRITA ( Safety Check )');
  console.log('   ⚠️  Pulando teste de escrita para não corromper dados reais');
  console.log('   (Use um ambiente de staging para writes)');

  // 9. Erros recentes
  console.log('\n9️⃣  ERROS RECENTES DA AUTOMAÇÃO');
  const { data: errors, error: errErr } = await supabase
    .from('error_logs')
    .select('id, applicant_id, error_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (errErr || !errors?.length) {
    console.log('   ✅ Nenhum erro registrado recentemente');
  } else {
    console.log(`   ⚠️  Últimos ${errors.length} erros:`);
    errors.forEach(e => {
      const date = new Date(e.created_at).toLocaleString('pt-BR');
      console.log(`      • ${e.error_type} (log: ${e.id.substring(0,8)}...)`);
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ AUDITORIA SUPABASE CONCLUÍDA!\n');
}

audit().catch(e => {
  console.error('\n💥 Erro durante auditoria:', e);
  process.exit(1);
});
