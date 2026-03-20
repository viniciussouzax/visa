#!/usr/bin/env node
// ============================================================
// ds160-entry.js — Cloud Run Job entrypoint
// ESCALÁVEL: cada container recebe CLOUD_RUN_TASK_INDEX (0..N-1)
// e pega o applicant na posição fixa sort_order = index + 1
// Containers são 100% independentes — sem dependência entre eles
// Nasce → pega seu applicant → preenche → morre
// ============================================================
const { createClient } = require('@supabase/supabase-js');

// ── ENV ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const COMPANY_ID = process.env.COMPANY_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Cloud Run injeta automaticamente essas vars
const TASK_INDEX = parseInt(process.env.CLOUD_RUN_TASK_INDEX || '0', 10);
const TASK_COUNT = parseInt(process.env.CLOUD_RUN_TASK_COUNT || '1', 10);
// Webhook override: trigger-ds160 Edge Function passes specific applicant ID
const TARGET_APPLICANT_ID = process.env.TARGET_APPLICANT_ID || null;

if (!process.env.HEADLESS) process.env.HEADLESS = 'true';

async function main() {
    const startTime = Date.now();
    console.log('═══════════════════════════════════════');
    console.log('  🏛️  DS-160 Worker (Cloud Run Job)');
    if (TARGET_APPLICANT_ID) {
        console.log(`  Mode: WEBHOOK (target: ${TARGET_APPLICANT_ID})`);
    } else {
        console.log(`  Mode: BATCH (task ${TASK_INDEX + 1} / ${TASK_COUNT})`);
    }
    console.log(`  Start: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════\n');

    // ── AUTH ──
    const workerEmail = process.env.WORKER_EMAIL;
    const workerPassword = process.env.WORKER_PASSWORD;
    if (workerEmail && workerPassword) {
        const { error } = await supabase.auth.signInWithPassword({
            email: workerEmail, password: workerPassword,
        });
        if (error) {
            console.error(`❌ Auth falhou: ${error.message} — abortando (RLS pode bloquear queries sem auth)`);
            process.exit(1);
        }
        console.log('🔐 Autenticado');
    }

    // ── PEGAR APPLICANT ──
    let target;

    if (TARGET_APPLICANT_ID) {
        // WEBHOOK MODE: buscar applicant específico pelo ID
        const { data: row, error: qErr } = await supabase
            .from('applicants')
            .select('id, full_name, status')
            .eq('id', TARGET_APPLICANT_ID)
            .single();

        if (qErr || !row) {
            console.log(`📭 Applicant ${TARGET_APPLICANT_ID} não encontrado`);
            process.exit(0);
        }
        target = row;
    } else {
        // BATCH MODE: buscar por posição (TASK_INDEX)
        let query = supabase
            .from('applicants')
            .select('id, full_name, status')
            .eq('stage', 'ds160')
            .order('sort_order', { ascending: true });

        if (COMPANY_ID) query = query.eq('company_id', COMPANY_ID);
        query = query.range(TASK_INDEX, TASK_INDEX);

        const { data: rows, error: qErr } = await query;

        if (qErr || !rows || rows.length === 0) {
            console.log(`📭 Task ${TASK_INDEX}: nenhum applicant nesta posição`);
            process.exit(0);
        }
        target = rows[0];
    }

    console.log(`📋 Meu applicant: ${target.full_name} (status: ${target.status})`);

    // Se já foi processado ou está sendo processado, sair
    if (!['todo', 'retry'].includes(target.status)) {
        console.log(`⏭️ Já processado (${target.status}) — saindo`);
        process.exit(0);
    }

    // ── CLAIM ATÔMICO ──
    const { data: claimed, error: claimErr } = await supabase
        .from('applicants')
        .update({ status: 'doing' })
        .eq('id', target.id)
        .in('status', ['todo', 'retry'])
        .select('id')
        .single();

    if (claimErr || !claimed) {
        console.log('⚠️ Outro worker já pegou este applicant — saindo');
        process.exit(0);
    }
    console.log(`🔒 Claimado: ${target.full_name}\n`);

    // ── PROCESSAR ──
    // Cloud Run Job: cada container é INDEPENDENTE e processa apenas SEU applicant.
    // NÃO usar runner._claimNext() (que é para modo dashboard/fila contínua).
    // O applicant já foi claimado atomicamente acima (L80-86).
    const { QueueRunner } = require('./queue');
    const runner = new QueueRunner(supabase, 'capmonster');
    runner.companyId = COMPANY_ID;
    runner.running = true;

    try {
        const config = await runner._getConfig();

        // Buscar dados completos do applicant
        const { data: fullApplicant } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', target.id)
            .single();

        if (!fullApplicant) {
            console.error('❌ Applicant não encontrado no banco');
            await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
            process.exit(1);
        }

        // Buscar ou criar application para este applicant
        let { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('applicant_id', target.id)
            .single();

        if (!app) {
            console.log('📝 Nenhuma application encontrada — criando');
            const { data: newApp, error: insertErr } = await supabase
                .from('applications')
                .insert({ applicant_id: target.id, fill_status: 'todo' })
                .select('*')
                .single();
            if (insertErr || !newApp) {
                console.error('❌ Falha ao criar application:', insertErr?.message);
                await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
                process.exit(1);
            }
            app = newApp;
        }

        // ── PROXY: ler de settings.proxy_url (mesma fonte que AIS/dashboard) ──
        let proxyUrl = null;

        if (app.proxy_session) {
            // Retry: reutilizar proxy salvo
            proxyUrl = app.proxy_session;
            console.log(`🔒 Proxy (retry): ${proxyUrl.replace(/\/\/.*@/, '//***@')}`);
        } else {
            const { data: proxySetting } = await supabase
                .from('settings')
                .select('key_value')
                .eq('key_name', 'proxy_url')
                .single();

            proxyUrl = proxySetting?.key_value || process.env.PROXY_URL || null;

            if (proxyUrl) {
                // Salvar na application para retry futuro
                await supabase.from('applications').update({
                    proxy_session: proxyUrl,
                    proxy_session_created_at: new Date().toISOString()
                }).eq('id', app.id);
                console.log(`🔒 Proxy: ${proxyUrl.replace(/\/\/.*@/, '//***@')}`);
            } else {
                console.log('🌐 Sem proxy configurado — usando IP direto');
            }
        }

        // Injetar proxy_url no config para o filler.js usar
        if (proxyUrl) config.proxy_url = proxyUrl;

        console.log(`🔧 Application: ${app.id} (status: ${app.fill_status})`);

        // Processar — _fillWithRetry cuida de retry, error logging, etc.
        await runner._fillWithRetry(app, fullApplicant, config);

    } catch (e) {
        console.error(`💥 Erro fatal: ${e.message}`);
        await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
        process.exit(1);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️ Duração: ${elapsed}s`);
    console.log('🏁 Job finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Crash:', err);
    process.exit(1);
});
