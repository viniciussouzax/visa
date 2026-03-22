#!/usr/bin/env node
// ============================================================
// ds160-entry.js - one-shot DS-160 worker entrypoint
// Default behavior on Fly.io: boot, claim the next applicant, fill, exit
// Optional batch envs remain available for controlled test runs
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const {
    APPLICANT_ACTIVE_STATUS,
    APPLICANT_CLAIMABLE_STATUSES,
    isStandbyEligible,
} = require('./status-contract');

// -- ENV --
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

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

    console.log(`Auth mode: ${SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'fallback_key'}`);

    // -- PICK APPLICANT --
    let target;
    let claimedApp = null;
    let previousApplicantStatus = 'todo';

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
        previousApplicantStatus = row.status || previousApplicantStatus;
    } else {
        let query = supabase
            .from('applicants')
            .select('id, full_name, status, updated_at')
            .eq('stage', 'ds160')
            .in('status', APPLICANT_CLAIMABLE_STATUSES)
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: true });

        query = query.limit(Math.max(TASK_INDEX + 25, 50));

        const { data: rows, error: qErr } = await query;
        const eligibleRows = (rows || []).filter((row) => {
            if (row.status !== 'standby') return true;
            return isStandbyEligible(row.updated_at);
        });

        if (qErr || eligibleRows.length === 0) {
            console.log(`Fila vazia para a posicao ${TASK_INDEX}`);
            process.exit(0);
        }
        target = eligibleRows[TASK_INDEX];
        if (!target) {
            console.log(`Fila processavel insuficiente para a posicao ${TASK_INDEX}`);
            process.exit(0);
        }
        previousApplicantStatus = target.status || previousApplicantStatus;
    }

    console.log(`Meu applicant: ${target.full_name} (status: ${target.status})`);

    if (!APPLICANT_CLAIMABLE_STATUSES.includes(target.status)) {
        console.log(`Ja processado (${target.status}) - saindo`);
        process.exit(0);
    }

    // -- ATOMIC CLAIM --
    const { data: claimed, error: claimErr } = await supabase
        .from('applicants')
        .update({ status: APPLICANT_ACTIVE_STATUS, updated_at: new Date().toISOString() })
        .eq('id', target.id)
        .in('status', APPLICANT_CLAIMABLE_STATUSES)
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
        console.log(`\n${signal} recebido - resetando status de ${target.full_name} para '${previousApplicantStatus}'`);
        try {
            await supabase.from('applicants').update({
                status: previousApplicantStatus,
                updated_at: new Date().toISOString()
            }).eq('id', target.id).eq('status', APPLICANT_ACTIVE_STATUS);
            await supabase.from('applications').update({
                fill_status: 'todo',
                fill_worker_id: null
            }).eq('applicant_id', target.id).eq('fill_status', APPLICANT_ACTIVE_STATUS);
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
    runner.running = true;
    const markFatalFailure = async (message) => {
        if (!target?.id) return;
        if (claimedApp?.id) {
            await runner._markSystemError(claimedApp.id, message, target.id);
            return;
        }
        await supabase.from('applicants').update({
            status: 'fail',
            updated_at: new Date().toISOString()
        }).eq('id', target.id).eq('status', APPLICANT_ACTIVE_STATUS);
    };

    try {
        const config = await runner._getConfig();

        const { data: fullApplicant } = await supabase
            .from('applicants')
            .select('*')
            .eq('id', target.id)
            .single();

        if (!fullApplicant) {
            console.error('Applicant nao encontrado no banco');
            await markFatalFailure('Applicant nao encontrado no banco apos claim');
            process.exit(1);
        }

        claimedApp = await runner._ensureAndClaimApp(target.id);
        if (!claimedApp) {
            console.error('Falha ao claimar application para execucao');
            await supabase.from('applicants').update({
                status: previousApplicantStatus,
                updated_at: new Date().toISOString()
            }).eq('id', target.id).eq('status', APPLICANT_ACTIVE_STATUS);
            process.exit(1);
        }

        const { buildResolvedProxyConfig } = require('./helpers/proxy-helper');
        const { data: proxySettings } = await supabase
            .from('settings')
            .select('key_name, key_value')
            .in('key_name', [
                'proxy_provider',
                'proxy_url',
                'proxy_countries',
                'apify_proxy_password',
                'apify_proxy_groups',
                'apify_proxy_country',
            ]);

        const settingsMap = Object.fromEntries((proxySettings || []).map(row => [row.key_name, row.key_value]));
        const selectedProvider = String(settingsMap.proxy_provider || process.env.PROXY_PROVIDER || 'dataimpulse').trim().toLowerCase();
        const legacyProxyUrl = selectedProvider !== 'apify' && claimedApp.proxy_session && /^https?:\/\//i.test(claimedApp.proxy_session)
            ? claimedApp.proxy_session
            : null;
        const sessionId = legacyProxyUrl
            ? null
            : (claimedApp.proxy_session || `app_${String(claimedApp.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}_${Date.now()}`);

        const resolvedProxy = buildResolvedProxyConfig({
            settingsMap,
            override: legacyProxyUrl || undefined,
            sessionId,
        });

        if (!resolvedProxy) {
            throw new Error('Proxy obrigatorio para DS-160, mas nenhuma configuracao valida foi encontrada');
        }

        if (!claimedApp.proxy_session || legacyProxyUrl || selectedProvider === 'apify') {
            await supabase.from('applications').update({
                proxy_session: resolvedProxy.sessionId,
                proxy_session_created_at: new Date().toISOString(),
            }).eq('id', claimedApp.id);
        }

        config.proxy_provider = resolvedProxy.provider;
        config.proxy_session_id = resolvedProxy.sessionId;
        config.proxy_countries = resolvedProxy.countries || settingsMap.proxy_countries || process.env.PROXY_COUNTRIES || 'us,br';
        if (resolvedProxy.provider === 'apify') {
            config.apify_proxy_password = resolvedProxy.password;
            config.apify_proxy_groups = resolvedProxy.groups;
            config.apify_proxy_country = resolvedProxy.country;
            console.log(`Proxy: apify | groups=${resolvedProxy.groups} | country=${resolvedProxy.country || 'auto'} | session=${resolvedProxy.sessionId}`);
        } else {
            config.proxy_url = resolvedProxy.url;
            console.log(`Proxy: dataimpulse | countries=${resolvedProxy.countries} | session=${resolvedProxy.sessionId}`);
        }

        console.log(`Application: ${claimedApp.id} (status: ${claimedApp.fill_status})`);

        await runner._fillWithRetry(claimedApp, fullApplicant, config);
    } catch (e) {
        console.error(`Erro fatal: ${e.message}`);
        await markFatalFailure(e.message);
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
