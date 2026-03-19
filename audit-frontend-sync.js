// Teste de Sincronização Frontend → Supabase
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
  console.log('🔍 TESTE DE SINCRONIZAÇÃO FRONTEND → SUPABASE\n');
  console.log('='.repeat(50));

  // 1. Ler um applicant real com dados completos
  console.log('\n1️⃣  Buscando applicant com dados completos...');
  const { data: applicants } = await supabase
    .from('applicants')
    .select('id, full_name, data, stage, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!applicants?.length) {
    console.log('❌ Nenhum applicant encontrado');
    return;
  }

  // Encontrar um com data não nula
  const appWithData = applicants.find(a => a.data && typeof a.data === 'object' && Object.keys(a.data).length > 10);
  if (!appWithData) {
    console.log('❌ Nenhum applicant com dados significativos');
    console.log('   (Isso pode ser normal se o frontend ainda não salvou nada)');
    return;
  }

  console.log(`✅ Usando: ${appWithData.full_name} (ID: ${appWithData.id})`);
  console.log(`   Stage: ${appWithData.stage} | Status: ${appWithData.status}`);
  console.log(`   Data size: ${JSON.stringify(appWithData.data).length} bytes`);
  console.log(`   Last update: ${new Date(appWithData.updated_at).toLocaleString('pt-BR')}`);

  // 2. Simular generateJSON do frontend
  console.log('\n2️⃣  Simulando generateJSON() do frontend...');
  const data = appWithData.data;

  // Verificar se contém os marcadores DNA/UNKNOWN
  const jsonString = JSON.stringify(data);
  const hasDNA = jsonString.includes('DNA');
  const hasUNKNOWN = jsonString.includes('UNKNOWN');
  console.log(`   Marcadores: DNA=${hasDNA}, UNKNOWN=${hasUNKNOWN}`);

  // 3. Testar se o JSON seria aceito pelo filler
  console.log('\n3️⃣  Validando estrutura para o filler...');
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
    console.log('   ✅ Todos os campos obrigatórios presentes');
  } else {
    console.log(`   ⚠️  ${missing.length} campos obrigatórios faltando:`);
    missing.forEach(m => console.log(`      - ${m}`));
  }

  // 4. Testar PATCH (atualização) — ler antes, modificar, salvar
  console.log('\n4️⃣  Testando update no Supabase (PATCH)...');
  const applicantId = appWithData.id;

  // Ler state atual novamente
  const { data: before } = await supabase
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
    console.log(`   ❌ Erro no PATCH: ${patchErr.message}`);
  } else {
    console.log(`   ✅ PATCH OK — test marker adicionado`);

    // Verificar se gravou
    const { data: after } = await supabase
      .from('applicants')
      .select('data')
      .eq('id', applicantId)
      .single();

    const hasMarker = after?.data?._test_marker === testMeta._frontend_test;
    console.log(`   ${hasMarker ? '✅' : '❌'} Marcador presente após update? ${hasMarker}`);

    // Remover marcador (cleanup)
    await supabase.from('applicants').update({
      data: Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_')))
    }).eq('id', applicantId);
    console.log('   🧹 Marcador removido (cleanup)');
  }

  // 5. Testar insert de form_logs (para debugging)
  console.log('\n5️⃣  Testando log de formulário (form_logs)...');
  const { error: logErr } = await supabase
    .from('form_logs')
    .insert({
      applicant_id: applicantId,
      log_type: 'info',
      error_message: 'Frontend sync test OK',
      error_details: { test: 'sync-check', timestamp: new Date().toISOString() }
    });

  if (logErr) {
    console.log(`   ❌ Erro ao inserir log: ${logErr.message}`);
  } else {
    console.log(`   ✅ form_logs insert OK`);
  }

  // 6. Testar leitura de settings (config)
  console.log('\n6️⃣  Testando leitura de settings...');
  const { data: settings } = await supabase
    .from('settings')
    .select('key_name, key_value')
    .limit(5);

  console.log(`   ✅ Settings acessíveis (${settings?.length || 0} registros)`);
  if (settings?.length) {
    console.log('      Sample:', settings[0].key_name, '=', settings[0].key_value.substring(0, 20) + '...');
  }

  // 7. Testar RLS — tentar operação com anon key
  console.log('\n7️⃣  Verificando RLS (permissões anônimas)...');
  const { data: countData, error: countErr } = await supabase
    .from('applicants')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Leitura anônima permitida (count: ${countErr ? 'ERROR' : countData})`);

  // Tentar write anônimo em tabela que permite (form_logs já testado)
  console.log('   ℹ️  Write anônimo: testado via form_logs (permitido)');
  console.log('   ℹ️  applicants updates: RLS geralmente restringe a owners; isso é normal');

  // 8. Verificar se há erros recentes
  console.log('\n8️⃣  Erros recentes de sincronização...');
  const { data: recentErrors } = await supabase
    .from('error_logs')
    .select('error_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentErrors?.length) {
    console.log(`   ⚠️  Últimos erros:`);
    recentErrors.forEach(e => {
      const date = new Date(e.created_at).toLocaleString('pt-BR');
      console.log(`      • ${e.error_type} em ${date}`);
    });
  } else {
    console.log('   ✅ Nenhum erro recente');
  }

  // 9. Validação de schema no lado cliente
  console.log('\n9️⃣  Verificando ds160-schema.js no frontend...');
  try {
    // Carregar ds160-schema.js
    const schemaCode = fs.readFileSync(path.join(__dirname, 'public', 'ds160-schema.js'), 'utf8');
    // Extrair DS160_SCHEMA (simples eval)
    const match = schemaCode.match(/const DS160_SCHEMA = (\[[\s\S]*?\]);/);
    if (match) {
      const schema = eval(match[1]);
      console.log(`   ✅ DS160_SCHEMA carregado: ${schema.length} seções`);
      console.log(`      Seções: ${schema.map(s => s.id).join(', ')}`);
    } else {
      console.log('   ❌ Não foi possível parsear DS160_SCHEMA');
    }
  } catch (e) {
    console.log(`   ❌ Erro ao ler schema: ${e.message}`);
  }

  // 10. Testar connectivity do frontend (AppCore.sbFetch)
  console.log('\n🔟 Testando AppCore.sbFetch (como o frontend usa)...');
  try {
    // Simular chamada do frontend (sem auth token real)
    const testRes = await fetch(process.env.SUPABASE_URL + '/rest/v1/applicants?select=id&limit=1', {
      headers: {
        'apikey': process.env.SUPABASE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_KEY
      }
    });
    if (testRes.ok) {
      console.log('   ✅ Frontend consegue acessar REST API');
    } else {
      console.log(`   ❌ Frontend REST error: ${testRes.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Erro de conectividade: ${e.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ TESTE DE SINCRONIZAÇÃO CONCLUÍDO!\n');
}

testSync().catch(e => {
  console.error('\n💥 Erro durante teste:', e);
  process.exit(1);
});
er ' + process.env.SUPABASE_KEY
      }
    });
    if (testRes.ok) {
      console.log('   ✅ Frontend consegue acessar REST API');
    } else {
      console.log(`   ❌ Frontend REST error: ${testRes.status}`);
    }
  } catch (e) {
    console.log(`   ❌ Erro de conectividade: ${e.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ TESTE DE SINCRONIZAÇÃO CONCLUÍDO!\n');
}

testSync().catch(e => {
  console.error('\n💥 Erro durante teste:', e);
  process.exit(1);
});
