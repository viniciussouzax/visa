#!/usr/bin/env node
// ============================================================
// seed-test-profiles.js — Insere perfis de teste no Supabase
// para testes em massa no Cloud Run Jobs
//
// Uso:
//   node scripts/seed-test-profiles.js              → insere todos os 26 perfis
//   node scripts/seed-test-profiles.js --clean      → deleta antigos + insere todos
//   node scripts/seed-test-profiles.js --only=minimal-single,divorced-prev-spouses
//   node scripts/seed-test-profiles.js --clean-only → apenas deleta perfis de teste
//   node scripts/seed-test-profiles.js --list       → lista perfis disponíveis
//   node scripts/seed-test-profiles.js --batch=5    → insere apenas os primeiros 5
// ============================================================

const path = require('path');
const fs = require('fs');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
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

const { createClient } = require('@supabase/supabase-js');
const { PROFILES } = require('./test-profiles');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Parse args ──
const args = process.argv.slice(2);
const FLAG_CLEAN = args.includes('--clean');
const FLAG_CLEAN_ONLY = args.includes('--clean-only');
const FLAG_LIST = args.includes('--list');
const FLAG_ONLY = args.find(a => a.startsWith('--only='));
const FLAG_BATCH = args.find(a => a.startsWith('--batch='));

const TEST_PREFIX = '[TEST]';
const TEST_GROUP = 'TEST_BATCH';

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  🧪 DS-160 Test Profile Seeder');
    console.log('═══════════════════════════════════════\n');

    // ── List mode ──
    if (FLAG_LIST) {
        const keys = Object.keys(PROFILES);
        console.log(`📋 ${keys.length} perfis disponíveis:\n`);
        keys.forEach((key, i) => {
            const p = PROFILES[key];
            const num = String(i + 1).padStart(2, '0');
            console.log(`  P${num} — ${key}`);
            console.log(`       ${p.description}`);
            console.log(`       Branches: ${p.branches?.length || 0}`);
        });
        process.exit(0);
    }

    // ── Auth ──
    const workerEmail = process.env.WORKER_EMAIL;
    const workerPassword = process.env.WORKER_PASSWORD;
    if (workerEmail && workerPassword) {
        const { error } = await supabase.auth.signInWithPassword({
            email: workerEmail, password: workerPassword,
        });
        if (error) {
            console.warn(`⚠️ Auth failed: ${error.message}`);
        } else {
            console.log(`🔐 Autenticado: ${workerEmail}`);
        }
    }

    // ── Get company_id ──
    let companyId = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: member } = await supabase
            .from('members')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
        if (member) companyId = member.company_id;
    }

    if (!companyId) {
        console.error('❌ Não foi possível determinar company_id');
        process.exit(1);
    }
    console.log(`🏢 Company: ${companyId}\n`);

    // ── Clean existing test profiles ──
    if (FLAG_CLEAN || FLAG_CLEAN_ONLY) {
        console.log('🧹 Limpando perfis de teste anteriores...');

        // Find all test applicants
        const { data: testApplicants } = await supabase
            .from('applicants')
            .select('id, full_name')
            .like('full_name', `${TEST_PREFIX}%`)
            .eq('company_id', companyId);

        if (testApplicants && testApplicants.length > 0) {
            const ids = testApplicants.map(a => a.id);

            // Delete fill_logs
            const { error: flErr } = await supabase
                .from('fill_logs')
                .delete()
                .in('applicant_id', ids);
            if (!flErr) console.log(`   ✅ fill_logs deletados`);

            // Delete error_logs via applications
            const { data: apps } = await supabase
                .from('applications')
                .select('id')
                .in('applicant_id', ids);
            if (apps && apps.length > 0) {
                const appIds = apps.map(a => a.id);
                await supabase.from('error_logs').delete().in('application_id', appIds);
                console.log(`   ✅ error_logs deletados`);
            }

            // Delete applications
            const { error: appErr } = await supabase
                .from('applications')
                .delete()
                .in('applicant_id', ids);
            if (!appErr) console.log(`   ✅ applications deletadas`);

            // Delete applicant_data_backups
            await supabase.from('applicant_data_backups').delete().in('applicant_id', ids);

            // Delete applicants
            const { error: delErr } = await supabase
                .from('applicants')
                .delete()
                .in('id', ids);
            if (!delErr) {
                console.log(`   ✅ ${testApplicants.length} applicants deletados`);
            } else {
                console.error(`   ❌ Erro ao deletar: ${delErr.message}`);
            }
        } else {
            console.log('   📭 Nenhum perfil de teste encontrado');
        }

        if (FLAG_CLEAN_ONLY) {
            console.log('\n🏁 Limpeza completa.');
            process.exit(0);
        }
        console.log('');
    }

    // ── Determine which profiles to insert ──
    let profileKeys = Object.keys(PROFILES);

    if (FLAG_ONLY) {
        const onlyList = FLAG_ONLY.replace('--only=', '').split(',').map(s => s.trim());
        profileKeys = profileKeys.filter(k => onlyList.includes(k));
        if (profileKeys.length === 0) {
            console.error(`❌ Nenhum perfil encontrado com os nomes: ${onlyList.join(', ')}`);
            console.log('   Use --list para ver perfis disponíveis');
            process.exit(1);
        }
    }

    if (FLAG_BATCH) {
        const batchSize = parseInt(FLAG_BATCH.replace('--batch=', ''));
        profileKeys = profileKeys.slice(0, batchSize);
    }

    console.log(`📦 Inserindo ${profileKeys.length} perfis de teste...\n`);

    // ── Insert profiles ──
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < profileKeys.length; i++) {
        const key = profileKeys[i];
        const profile = PROFILES[key];
        const num = String(i + 1).padStart(2, '0');
        const fullName = `${TEST_PREFIX} P${num}-${key}`;

        // Build the applicant data
        const profileData = profile.data;

        // Extract name from profile data for passport
        const surname = profileData.personal1?.surname || 'TEST';
        const givenName = profileData.personal1?.givenName || 'USER';
        const passportNumber = profileData.passport?.number || `TEST${num}`;

        // Insert applicant
        const { data: applicant, error: insertErr } = await supabase
            .from('applicants')
            .insert({
                full_name: fullName,
                passport_number: passportNumber,
                data: profileData,
                stage: 'ds160',
                status: 'todo',
                company_id: companyId,
                sort_order: i + 1,
                priority: 'normal',
                notes: `TEST: ${profile.description}\nBranches: ${(profile.branches || []).join(', ')}`,
                email: `test-p${num}@test.com`,
            })
            .select()
            .single();

        if (insertErr) {
            console.error(`  ❌ P${num}-${key}: ${insertErr.message}`);
            errors++;
            continue;
        }

        // Create application
        const { error: appErr } = await supabase
            .from('applications')
            .insert({
                applicant_id: applicant.id,
                fill_status: 'pending',
                security_answer: profileData.securityAnswer || 'TESTPASSWORD',
            });

        if (appErr) {
            console.error(`  ⚠️ P${num}-${key}: applicant OK, application failed: ${appErr.message}`);
        }

        const branchCount = profile.branches?.length || 0;
        console.log(`  ✅ P${num}-${key} (${branchCount} branches)`);
        inserted++;
    }

    // ── Summary ──
    console.log('\n═══════════════════════════════════════');
    console.log(`  📊 Resultado: ${inserted} inseridos, ${errors} erros`);
    console.log('═══════════════════════════════════════');
    console.log(`\n💡 Próximo passo:`);
    console.log(`   LOCAL:  node automation/run.js`);
    console.log(`   CLOUD:  gcloud run jobs execute ds160-worker --tasks=${inserted} --parallelism=5 --region=us-central1 --wait`);
    console.log(`   LOGS:   gcloud run jobs executions list --job=ds160-worker --region=us-central1`);
    console.log(`   CHECK:  node scripts/check-test-results.js\n`);
}

main().catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
});
