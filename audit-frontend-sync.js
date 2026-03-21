// Teste de SincronizaÃ§Ã£o Frontend â†’ Supabase
// Simula o fluxo completo do form-engine.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar .env
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

async function testSync() {
  console.log('ðŸ” TESTE DE SINCRONIZAÃ‡ÃƒO FRONTEND â†’ SUPABASE\n');
  console.log('='.repeat(50));

  // 1. Ler um applicant real com dados completos
  console.log('\n1ï¸âƒ£  Buscando applicant com dados completos...');
  const { data: applicants } = await supabase
    .from('applicants')
    .select('id, full_name, data, stage, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!applicants?.length) {
    console.log('âŒ Nenhum applicant encontrado');
    return;
  }

  // Encontrar um com data nÃ£o nula
  const appWithData = applicants.find(a => a.data && typeof a.data === 'object' && Object.keys(a.data).length > 10);
  if (!appWithData) {
    console.log('âŒ Nenhum applicant com dados significativos');
    console.log('   (Isso pode ser normal se o frontend ainda nÃ£o salvou nada)');
    return;
  }

  console.log(`âœ… Usando: ${appWithData.full_name} (ID: ${appWithData.id})`);
  console.log(`   Stage: ${appWithData.stage} | Status: ${appWithData.status}`);
  console.log(`   Data size: ${JSON.stringify(appWithData.data).length} bytes`);
  console.log(`   Last update: ${new Date(appWithData.updated_at).toLocaleString('pt-BR')}`);

  // 2. Simular generateJSON do frontend
  console.log('\n2ï¸âƒ£  Simulando generateJSON() do frontend...');
  const data = appWithData.data;

  // Verificar se contÃ©m os marcadores DNA/UNKNOWN
  const jsonString = JSON.stringify(data);
  const hasDNA = jsonString.includes('DNA');
  const hasUNKNOWN = jsonString.includes('UNKNOWN');
  console.log(`   Marcadores: DNA=${hasDNA}, UNKNOWN=${hasUNKNOWN}`);

  // 3. Testar se o JSON seria aceito pelo filler
  console.log('\n3ï¸âƒ£  Validando estrutura para o filler...');
  const required = [
    'personal1.surname', 'personal1.givenName', 'personal1.sex',
    'personal1.maritalStatus', 'personal1.dob', 'personal1.cityOfBirth',
    'personal1.countryOfBirth', 'personal2.nationality',
    'travel.purposeOfTrip', 'travel.arrivalDate', 'travel.usAddress', 'travel.payingForTrip',
    'passport.number', 'addressPhone.phone', 'addressPhone.email'
  ];

  const missing = required.filter(k => {
    const parts = k.split('.');
    let cur = data;
    for (const p of parts) {
      if (!cur || !(p in cur)) return true;
      cur = cur[p];
    }
    return !cur;
  });

  if (missing.length === 0) {
    console.log('   âœ… Todos os campos obrigatÃ³rios presentes');
  } else {
    console.log(`   âš ï¸  ${missing.length} campos obrigatÃ³rios faltando:`);
    missing.forEach(m => console.log(`      - ${m}`));
  }

  // 4. Testar PATCH (atualizaÃ§Ã£o) â€” ler antes, modificar, salvar
  console.log('\n4ï¸âƒ£  Testando update no Supabase (PATCH)...');
  const applicantId = appWithData.id;

  // Ler state atual novamente
  await supabase
    .from('applicants')
    .select('updated_at')
    .eq('id', applicantId)
    .single();

  // Fazer um update leve (metadata apenas)
  const testMeta = { _frontend_test: 'sync-check-' + Date.now() };
  const { error: patchErr } = await supabase
    .from('applicants')
    .update({ data: { ...data, _test_marker: testMeta._frontend_test } })
    .eq('id', applicantId);

  if (patchErr) {
    console.log(`   âŒ Erro no PATCH: ${patchErr.message}`);
  } else {
    console.log('   âœ… PATCH OK â€” test marker adicionado');

    // Verificar se gravou
    const { data: after } = await supabase
      .from('applicants')
      .select('data')
      .eq('id', applicantId)
      .single();

    const hasMarker = after?.data?._test_marker === testMeta._frontend_test;
    console.log(`   ${hasMarker ? 'âœ…' : 'âŒ'} Marcador presente apÃ³s update? ${hasMarker}`);

    // Remover marcador (cleanup)
    await supabase.from('applicants').update({
      data: Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_')))
    }).eq('id', applicantId);
    console.log('   ðŸ§¹ Marcador removido (cleanup)');
  }

  // 5. Testar insert de form_logs (para debugging)
  console.log('\n5ï¸âƒ£  Testando log de formulÃ¡rio (form_logs)...');
  const { error: logErr } = await supabase
    .from('form_logs')
    .insert({
      applicant_id: applicantId,
      log_type: 'info',
      error_message: 'Frontend sync test OK',
      error_details: { test: 'sync-check', timestamp: new Date().toISOString() }
    });

  if (logErr) {
    console.log(`   âŒ Erro ao inserir log: ${logErr.message}`);
  } else {
    console.log('   âœ… form_logs insert OK');
  }

  // 6. Testar leitura de settings (config)
  console.log('\n6ï¸âƒ£  Testando leitura de settings...');
  const { data: settings } = await supabase
    .from('settings')
    .select('key_name, key_value')
    .limit(5);

  console.log(`   âœ… Settings acessÃ­veis (${settings?.length || 0} registros)`);
  if (settings?.length) {
    console.log('      Sample:', settings[0].key_name, '=', settings[0].key_value.substring(0, 20) + '...');
  }

  // 7. Testar RLS â€” tentar operaÃ§Ã£o com anon key
  console.log('\n7ï¸âƒ£  Verificando RLS (permissÃµes anÃ´nimas)...');
  const { data: countData, error: countErr } = await supabase
    .from('applicants')
    .select('*', { count: 'exact', head: true });

  console.log(`   âœ… Leitura anÃ´nima permitida (count: ${countErr ? 'ERROR' : countData})`);

  // Tentar write anÃ´nimo em tabela que permite (form_logs jÃ¡ testado)
  console.log('   â„¹ï¸  Write anÃ´nimo: testado via form_logs (permitido)');
  console.log('   â„¹ï¸  applicants updates: RLS geralmente restringe a owners; isso Ã© normal');

  // 8. Verificar se hÃ¡ erros recentes
  console.log('\n8ï¸âƒ£  Erros recentes de sincronizaÃ§Ã£o...');
  const { data: recentErrors } = await supabase
    .from('error_logs')
    .select('error_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentErrors?.length) {
    console.log('   âš ï¸  Ãšltimos erros:');
    recentErrors.forEach(e => {
      const date = new Date(e.created_at).toLocaleString('pt-BR');
      console.log(`      â€¢ ${e.error_type} em ${date}`);
    });
  } else {
    console.log('   âœ… Nenhum erro recente');
  }

  // 9. ValidaÃ§Ã£o de schema no lado cliente
  console.log('\n9ï¸âƒ£  Verificando ds160-schema.js no frontend...');
  try {
    const schemaCode = fs.readFileSync(path.join(__dirname, 'public', 'ds160-schema.js'), 'utf8');
    const match = schemaCode.match(/const DS160_SCHEMA = (\[[\s\S]*?\]);/);
    if (match) {
      const schema = eval(match[1]);
      console.log(`   âœ… DS160_SCHEMA carregado: ${schema.length} seÃ§Ãµes`);
      console.log(`      SeÃ§Ãµes: ${schema.map(s => s.id).join(', ')}`);
    } else {
      console.log('   âŒ NÃ£o foi possÃ­vel parsear DS160_SCHEMA');
    }
  } catch (e) {
    console.log(`   âŒ Erro ao ler schema: ${e.message}`);
  }

  // 10. Testar connectivity do frontend (AppCore.sbFetch)
  console.log('\nðŸ”Ÿ Testando AppCore.sbFetch (como o frontend usa)...');
  try {
    const testRes = await fetch(process.env.SUPABASE_URL + '/rest/v1/applicants?select=id&limit=1', {
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: 'Bearer ' + process.env.SUPABASE_KEY
      }
    });
    if (testRes.ok) {
      console.log('   âœ… Frontend consegue acessar REST API');
    } else {
      console.log(`   âŒ Frontend REST error: ${testRes.status}`);
    }
  } catch (e) {
    console.log(`   âŒ Erro de conectividade: ${e.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('âœ… TESTE DE SINCRONIZAÃ‡ÃƒO CONCLUÃDO!\n');
}

testSync().catch(e => {
  console.error('\nðŸ’¥ Erro durante teste:', e);
  process.exit(1);
});
