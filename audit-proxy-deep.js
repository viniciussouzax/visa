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
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function deepCheck() {
  console.log('🔍 CHECAGEM PROFUNDA DO PROXY\n');

  // 1. Verificar TODAS as configurações
  const { data: allSettings } = await supabase.from('settings').select('*');
  console.log('📋 CONFIGURAÇÕES COMPLETAS (settings):');
  allSettings?.forEach(s => {
    const val = s.key_value ? (s.key_value.length > 30 ? s.key_value.substring(0, 30) + '...' : s.key_value) : 'NULL';
    console.log(`   ${s.key_name.padEnd(25)} = ${val}`);
  });

  // 2. Verificar automation_config (onde o filler busca config)
  const { data: autoConfig } = await supabase.from('automation_config').select('*');
  console.log('\n⚙️  AUTOMATION_CONFIG:');
  if (autoConfig?.[0]) {
    const cfg = autoConfig[0];
    Object.entries(cfg).forEach(([k, v]) => {
      if (k !== 'id' && k !== 'created_at' && k !== 'updated_at') {
        const val = v ? (String(v).length > 30 ? String(v).substring(0, 30) + '...' : v) : 'NULL';
        console.log(`   ${k.padEnd(25)} = ${val}`);
      }
    });
  } else {
    console.log('   ❌ Nenhum registro em automation_config');
  }

  // 3. Verificar applicants com proxy_session preenchido
  console.log('\n👥 APPLICANTS COM proxy_session:');
  const { data: appsWithProxy } = await supabase
    .from('applications')
    .select('applicant_id, proxy_session, created_at')
    .not('proxy_session', 'is', null)
    .limit(5);
  if (appsWithProxy?.length) {
    appsWithProxy.forEach(app => {
      console.log(`   App ${app.applicant_id.substring(0,8)}...: ${app.proxy_session.replace(/:\/\/.*@/, '://***@')}`);
    });
  } else {
    console.log('   ❌ NENHUM application com proxy_session salvo');
  }

  // 4. Verificar se há todo applications sem proxy
  const { data: pendingApps } = await supabase
    .from('applications')
    .select('id, applicant_id, fill_status, proxy_session')
    .in('fill_status', ['todo', 'doing']);
  console.log(`\n⏳ APLICAÇÕES TODO/DOING: ${pendingApps?.length || 0}`);
  pendingApps?.forEach(app => {
    const proxyStatus = app.proxy_session ? '✅' : '❌';
    console.log(`   ${proxyStatus} App ${app.id.substring(0,8)}... (status: ${app.fill_status})`);
  });

  // 5. Testar se o worker consegue ler settings (mesma query do ds160-entry.js)
  console.log('\n🧪 SIMULANDO LEITURA DO WORKER (ds160-entry.js):');
  const candidate = pendingApps?.[0];
  if (candidate) {
    // Simular a query do entry
    const { data: proxyFromSettings } = await supabase
      .from('settings')
      .select('key_value')
      .eq('key_name', 'proxy_url')
      .single();
    const proxyUrl = proxyFromSettings?.key_value || process.env.PROXY_URL || null;
    console.log(`   proxyUrl lido: ${proxyUrl ? proxyUrl.replace(/:\/\/.*@/, '://***@') : 'NULL'}`);
    console.log(`   ℹ️  Isso é o que o worker verá ao processar`);
  }

  // 6. Sugestão de correção
  console.log('\n💡 SUGESTÃO DE CORREÇÃO:');
  if (!allSettings?.find(s => s.key_name === 'proxy_url')?.key_value) {
    console.log('   settings.proxy_url está NULL. Inserir via SQL:');
    console.log('   INSERT INTO settings (key_name, key_value) VALUES');
    console.log('     (\'proxy_url\', \'http://user:pass@gw.dataimpulse.com:823\')');
    console.log('   ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value;');
  }
}
deepCheck().catch(e => console.error('Erro:', e));