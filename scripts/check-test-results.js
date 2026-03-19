#!/usr/bin/env node
// ============================================================
// check-test-results.js — Relatório de resultados dos testes
// Consulta Supabase e mostra status de cada perfil de teste
//
// Uso:
//   node scripts/check-test-results.js          → relatório completo
//   node scripts/check-test-results.js --fails  → apenas falhas
//   node scripts/check-test-results.js --errors  → mostra detalhes dos erros
//   node scripts/check-test-results.js --reseed  → imprime comando --only para re-testar fails
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const FLAG_FAILS = args.includes('--fails');
const FLAG_ERRORS = args.includes('--errors');
const FLAG_RESEED = args.includes('--reseed');

const TEST_PREFIX = '[TEST]';

async function main() {
    // Auth
    const workerEmail = process.env.WORKER_EMAIL;
    const workerPassword = process.env.WORKER_PASSWORD;
    if (workerEmail && workerPassword) {
        await supabase.auth.signInWithPassword({
            email: workerEmail, password: workerPassword,
        });
    }

    // Get company_id
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

    // Fetch test applicants
    let query = supabase
        .from('applicants')
        .select('id, full_name, stage, status, notes, sort_order, updated_at')
        .like('full_name', `${TEST_PREFIX}%`)
        .order('sort_order', { ascending: true });

    if (companyId) query = query.eq('company_id', companyId);

    const { data: applicants, error: fetchErr } = await query;

    if (fetchErr) {
        console.error('❌ Erro ao buscar:', fetchErr.message);
        process.exit(1);
    }

    if (!applicants || applicants.length === 0) {
        console.log('📭 Nenhum perfil de teste encontrado.');
        console.log('   Execute: node scripts/seed-test-profiles.js');
        process.exit(0);
    }

    // Fetch applications for these applicants
    const ids = applicants.map(a => a.id);
    const { data: applications } = await supabase
        .from('applications')
        .select('applicant_id, fill_status, fill_error, last_page, retry_count, application_id, fill_started_at, fill_finished_at')
        .in('applicant_id', ids);

    const appMap = {};
    (applications || []).forEach(app => { appMap[app.applicant_id] = app; });

    // Fetch error logs summary
    let errorMap = {};
    if (FLAG_ERRORS) {
        const appIds = (applications || []).map(a => a.id).filter(Boolean);
        if (appIds.length > 0) {
            // Get via applicant join
            const { data: errors } = await supabase
                .from('error_logs')
                .select('application_id, error_message, page_name, error_cause, screenshot_url, validation_errors, created_at')
                .in('application_id', (applications || []).map(a => a.id).filter(Boolean))
                .order('created_at', { ascending: false });
            
            if (errors) {
                // Group by applicant via app
                const appToApplicant = {};
                (applications || []).forEach(a => { appToApplicant[a.id] = a.applicant_id; });
                errors.forEach(e => {
                    const applicantId = appToApplicant[e.application_id];
                    if (applicantId && !errorMap[applicantId]) {
                        errorMap[applicantId] = e; // most recent
                    }
                });
            }
        }
    }

    // ── Classify ──
    const results = {
        done: [],
        error: [],
        doing: [],
        todo: [],
        other: [],
    };

    applicants.forEach(a => {
        const app = appMap[a.id];
        const fillStatus = app?.fill_status || 'unknown';
        const entry = {
            name: a.full_name.replace(TEST_PREFIX + ' ', ''),
            status: a.status,
            fillStatus,
            error: app?.fill_error,
            lastPage: app?.last_page,
            retries: app?.retry_count || 0,
            applicationId: app?.application_id,
            duration: null,
            id: a.id,
        };

        // Calculate duration
        if (app?.fill_started_at && app?.fill_finished_at) {
            const ms = new Date(app.fill_finished_at) - new Date(app.fill_started_at);
            entry.duration = `${(ms / 1000).toFixed(0)}s`;
        }

        if (fillStatus === 'done' || a.status === 'done') {
            results.done.push(entry);
        } else if (['error', 'fail'].includes(fillStatus) || a.status === 'error' || a.status === 'fail') {
            results.error.push(entry);
        } else if (fillStatus === 'doing' || a.status === 'doing') {
            results.doing.push(entry);
        } else if (a.status === 'todo' || fillStatus === 'todo') {
            results.todo.push(entry);
        } else {
            results.other.push(entry);
        }
    });

    // ── Print Report ──
    const total = applicants.length;
    const now = new Date().toISOString().split('T')[0];

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log(`  🧪 DS-160 Batch Test Results — ${now}`);
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ ${results.done.length}/${total} perfis concluídos`);
    console.log(`  ❌ ${results.error.length}/${total} perfis com erro`);
    console.log(`  🔄 ${results.doing.length}/${total} perfis em progresso`);
    console.log(`  ⏳ ${results.todo.length}/${total} perfis na fila`);
    if (results.other.length > 0) {
        console.log(`  ❓ ${results.other.length}/${total} outro status`);
    }
    console.log('═══════════════════════════════════════════════');

    // ── Done ──
    if (!FLAG_FAILS && results.done.length > 0) {
        console.log('\n  ✅ CONCLUÍDOS:');
        results.done.forEach(e => {
            const dur = e.duration ? ` (${e.duration})` : '';
            const appId = e.applicationId ? ` → ${e.applicationId}` : '';
            console.log(`  │ ${e.name}${dur}${appId}`);
        });
    }

    // ── Errors ──
    if (results.error.length > 0) {
        console.log('\n  ❌ FALHAS:');
        results.error.forEach(e => {
            const page = e.lastPage ? ` em ${e.lastPage}` : '';
            const retries = e.retries > 0 ? ` (${e.retries} retries)` : '';
            const errMsg = e.error ? ` → ${e.error.slice(0, 120)}` : ` → ${e.fillStatus}`;
            console.log(`  ├─ ${e.name}${page}${retries}`);
            console.log(`  │  ${errMsg}`);

            if (FLAG_ERRORS && errorMap[e.id]) {
                const err = errorMap[e.id];
                if (err.error_cause) console.log(`  │  Causa: ${err.error_cause}`);
                if (err.validation_errors?.length) {
                    err.validation_errors.forEach(v => console.log(`  │  ⚠️ ${v}`));
                }
                if (err.screenshot_url) console.log(`  │  📸 ${err.screenshot_url}`);
            }
        });
    }

    // ── In progress ──
    if (results.doing.length > 0) {
        console.log('\n  🔄 EM PROGRESSO:');
        results.doing.forEach(e => {
            const page = e.lastPage ? ` — ${e.lastPage}` : '';
            console.log(`  │ ${e.name}${page}`);
        });
    }

    // ── Todo ──
    if (!FLAG_FAILS && results.todo.length > 0) {
        console.log('\n  ⏳ NA FILA:');
        results.todo.forEach(e => {
            console.log(`  │ ${e.name}`);
        });
    }

    console.log('');

    // ── Reseed command for fails ──
    if (FLAG_RESEED || (results.error.length > 0 && !FLAG_FAILS)) {
        const failNames = results.error.map(e => {
            // Extract profile key from name like "P08-divorced-prev-spouses"
            return e.name.replace(/^P\d+-/, '');
        });
        if (failNames.length > 0) {
            console.log('  💡 Para re-testar apenas os fails:');
            console.log(`  node scripts/seed-test-profiles.js --clean --only=${failNames.join(',')}`);
            console.log(`  gcloud run jobs execute ds160-worker --tasks=${failNames.length} --parallelism=${Math.min(failNames.length, 5)} --region=us-central1 --wait\n`);
        }
    }

    // ── Fill logs summary for errors ──
    if (FLAG_ERRORS && results.error.length > 0) {
        console.log('  📋 FILL LOGS das falhas (últimas páginas preenchidas):');
        for (const e of results.error) {
            const { data: logs } = await supabase
                .from('fill_logs')
                .select('page_name, fields_filled, fields_total, validation_errors, navigated')
                .eq('applicant_id', e.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (logs && logs.length > 0) {
                console.log(`\n  ┌─ ${e.name}:`);
                logs.forEach(l => {
                    const ratio = `${l.fields_filled}/${l.fields_total}`;
                    const nav = l.navigated ? '✅' : '❌';
                    const val = l.validation_errors?.length ? ` ⚠️${l.validation_errors.length}` : '';
                    console.log(`  │  ${nav} ${l.page_name} — ${ratio} campos${val}`);
                });
            }
        }
        console.log('');
    }
}

main().catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
});
