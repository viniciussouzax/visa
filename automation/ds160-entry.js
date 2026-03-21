#!/usr/bin/env node
// ============================================================
// ds160-entry.js - one-shot DS-160 worker entrypoint
// Default behavior on Fly.io: boot, claim the next applicant, fill, exit
// Optional batch envs remain available for controlled test runs
// ============================================================
const { createClient } = require('@supabase/supabase-js');

// -- ENV --
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const COMPANY_ID = process.env.COMPANY_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_KEY sao obrigatorios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Optional batch/test envs
const TASK_INDEX = parseInt(process.env.TASK_INDEX || '0', 10);
const TASK_COUNT = parseInt(process.env.TASK_COUNT || '1', 10);
// Optional direct-target override for manual/webhook starts
const TARGET_APPLICANT_ID = process.env.TARGET_APPLICANT_ID || null;

if (!process.env.HEADLESS) process.env.HEADLESS = 'false';

async function main() {
    const startTime = Date.now();
    console.log('=======================================');
    console.log('  DS-160 Worker (Fly Machine)');
    if (TARGET_APPLICANT_ID) {
        console.log(`  Mode: TARGET (${TARGET_APPLICANT_ID})`);
    } else if (process.env.TASK_INDEX) {
        console.log(`  Mode: BATCH (task ${TASK_INDEX + 1} / ${TASK_COUNT})`);
    } else {
        console.log('  Mode: QUEUE');
    }
    console.log(`  Start: ${new Date().toISOString()}`);
    console.log('=======================================\n');

    // -- AUTH --
    const workerEmail = process.env.WORKER_EMAIL;
    const workerPassword = process.env.WORKER_PASSWORD;
    if (workerEmail && workerPassword) {
        const { error } = await supabase.auth.signInWithPassword({
            email: workerEmail,
            password: workerPassword,
        });
        if (error) {
            console.error(`Auth falhou: ${error.message} - abortando`);
            process.exit(1);
        }
        console.log('Autenticado');
    }

    // -- PICK APPLICANT --
    let target;

    if (TARGET_APPLICANT_ID) {
        const { data: row, error: qErr } = await supabase
            .from('applicants')
            .select('id, full_name, status')
            .eq('id', TARGET_APPLICANT_ID)
            .single();

        if (qErr || !row) {
            console.log(`Applicant ${TARGET_APPLICANT_ID} nao encontrado`);
            process.exit(0);
        }
        target = row;
    } else {
        let query = supabase
            .from('applicants')
            .select('id, full_name, status')
            .eq('stage', 'ds160')
            .order('sort_order', { ascending: true });

        if (COMPANY_ID) query = query.eq('company_id', COMPANY_ID);
        query = query.range(TASK_INDEX, TASK_INDEX);

        const { data: rows, error: qErr } = await query;

        if (qErr || !rows || rows.length === 0) {
            console.log(`Fila vazia para a posicao ${TASK_INDEX}`);
            process.exit(0);
        }
        target = rows[0];
    }

    console.log(`Meu applicant: ${target.full_name} (status: ${target.status})`);

    const PROCESSABLE_STATUSES = ['todo', 'retry', 'doing', 'standby'];
    if (!PROCESSABLE_STATUSES.includes(target.status)) {
        console.log(`Ja processado (${target.status}) - saindo`);
        process.exit(0);
    }

    // -- ATOMIC CLAIM --
    const { data: claimed, error: claimErr } = await supabase
        .from('applicants')
        .update({ status: 'doing', updated_at: new Date().toISOString() })
        .eq('id', target.id)
        .in('status', PROCESSABLE_STATUSES)
        .select('id')
        .single();

    if (claimErr || !claimed) {
        console.log('Outro worker ja pegou este applicant - saindo');
        process.exit(0);
    }
    console.log(`Claimado: ${target.full_name}\n`);

    // -- GRACEFUL SHUTDOWN --
    let shuttingDown = false;
    const gracefulShutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n${signal} recebido - resetando status de ${target.full_name} para 'todo'`);
        try {
            await supabase.from('applicants').update({
                status: 'todo',
                updated_at: new Date().toISOString()
            }).eq('id', target.id).eq('status', 'doing');
            await supabase.from('applications').update({
                fill_status: 'todo',
                fill_worker_id: null
            }).eq('applicant_id', target.id).eq('fill_status', 'filling');
            console.log('Status resetado - applicant sera reprocessado na proxima trigger');
        } catch (e) {
            console.error('Falha ao resetar status:', e.message);
        }
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // -- PROCESS --
    const { QueueRunner } = require('./queue');
    const runner = new QueueRunner(supabase, 'capmonster');
    runner.companyId = COMPANY_ID;
    runner.running = true;

    try {
        const config = await runner._getConfig();

        const { data: fullApplicant } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', target.id)
            .single();

        if (!fullApplicant) {
            console.error('Applicant nao encontrado no banco');
            await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
            process.exit(1);
        }

        let { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('applicant_id', target.id)
            .single();

        if (!app) {
            console.log('Nenhuma application encontrada - criando');
            const { data: newApp, error: insertErr } = await supabase
                .from('applications')
                .insert({ applicant_id: target.id, fill_status: 'todo' })
                .select('*')
                .single();
            if (insertErr || !newApp) {
                console.error('Falha ao criar application:', insertErr?.message);
                await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
                process.exit(1);
            }
            app = newApp;
        }

        const { resolveProxyUrl, resolveProxyCountries } = require('./helpers/proxy-helper');
        let proxyUrl = null;
        let proxyCountries = 'us,br';

        if (app.proxy_session) {
            proxyUrl = app.proxy_session;
            console.log(`Proxy (retry): ${proxyUrl.replace(/\/\/.*@/, '//***@')}`);
        } else {
            const { data: proxySettings } = await supabase
                .from('settings')
                .select('key_name, key_value')
                .in('key_name', ['proxy_url', 'proxy_countries']);

            const urlRow = proxySettings?.find(r => r.key_name === 'proxy_url');
            const countriesRow = proxySettings?.find(r => r.key_name === 'proxy_countries');

            proxyUrl = resolveProxyUrl({ settingsRow: urlRow });
            proxyCountries = resolveProxyCountries({ settingsRow: countriesRow });

            if (proxyUrl) {
                await supabase.from('applications').update({
                    proxy_session: proxyUrl,
                    proxy_session_created_at: new Date().toISOString()
                }).eq('id', app.id);
                console.log(`Proxy: ${proxyUrl.replace(/\/\/.*@/, '//***@')} | countries: ${proxyCountries}`);
            } else {
                console.log('Sem proxy configurado - usando IP direto');
            }
        }

        if (proxyUrl) config.proxy_url = proxyUrl;
        config.proxy_countries = proxyCountries;

        console.log(`Application: ${app.id} (status: ${app.fill_status})`);

        await runner._fillWithRetry(app, fullApplicant, config);
    } catch (e) {
        console.error(`Erro fatal: ${e.message}`);
        await supabase.from('applicants').update({ status: 'error' }).eq('id', target.id);
        process.exit(1);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDuracao: ${elapsed}s`);
    console.log('Worker finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('Crash:', err);
    process.exit(1);
});
