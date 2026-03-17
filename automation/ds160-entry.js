#!/usr/bin/env node
// ============================================================
// ds160-entry.js — Cloud Run Job entrypoint
// Processa 1 solicitante da fila e sai (não é loop)
// Container sobe → claim → preenche → morre
// ============================================================
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── ENV ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Force headless in cloud
process.env.HEADLESS = 'true';

async function main() {
    const startTime = Date.now();
    console.log('═══════════════════════════════════════');
    console.log('  🏛️  DS-160 Worker (Cloud Run Job)');
    console.log('═══════════════════════════════════════');
    console.log(`  Supabase: ${SUPABASE_URL}`);
    console.log(`  Start:    ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════\n');

    // Authenticate worker if credentials provided
    const workerEmail = process.env.WORKER_EMAIL;
    const workerPassword = process.env.WORKER_PASSWORD;
    if (workerEmail && workerPassword) {
        const { error } = await supabase.auth.signInWithPassword({
            email: workerEmail, password: workerPassword,
        });
        if (error) console.warn(`⚠️ Auth failed: ${error.message} — continuando como anon`);
        else console.log(`🔐 Worker autenticado`);
    }

    // Load settings from DB
    const { data: settings } = await supabase.from('settings').select('key_name, key_value');
    if (settings) {
        settings.forEach(s => { process.env[`SETTING_${s.key_name}`] = s.key_value; });
    }

    // ── CHECK QUEUE ──
    const { data: queue } = await supabase
        .from('applicants')
        .select('id, full_name')
        .eq('stage', 'ds160')
        .in('status', ['todo', 'retry'])
        .order('sort_order', { ascending: true })
        .limit(1);

    if (!queue || queue.length === 0) {
        console.log('📭 Fila vazia — nada para processar');
        process.exit(0); // Clean exit, no work to do
    }

    console.log(`📋 Próximo: ${queue[0].full_name} (${queue[0].id})\n`);

    // ── PROCESS ──
    const { QueueRunner } = require('./queue');
    const runner = new QueueRunner(supabase, 'capmonster');

    // Override: process only 1 then exit
    let processed = false;
    const emitter = (status) => {
        switch (status.type) {
            case 'filling':
                console.log(`🔄 ${status.applicantName} — ${status.page}`);
                break;
            case 'done':
                console.log(`\n✅ Concluído: ${status.applicantName}`);
                processed = true;
                break;
            case 'error':
                console.error(`\n❌ Erro: ${status.applicantName} — ${status.error}`);
                processed = true;
                break;
            case 'retrying':
                console.log(`♻️ Retry #${status.retryNumber}: ${status.applicantName}`);
                break;
            case 'queue-empty':
                processed = true; // Force exit after processing
                break;
        }
    };

    // Start and process one cycle
    runner._emitter = emitter;
    runner.running = true;

    // Load company_id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: member } = await supabase
            .from('members')
            .select('company_id')
            .eq('user_id', user.id)
            .single();
        if (member) runner.companyId = member.company_id;
    }

    // Run ONE cycle of the loop
    try {
        const config = await runner._getConfig();
        const app = await runner._claimNext();

        if (!app) {
            console.log('📭 Nenhum item claimável');
            process.exit(0);
        }

        const applicant = await runner._getApplicant(app.applicant_id);
        if (!applicant) {
            console.warn('⚠️ Applicant não encontrado');
            process.exit(1);
        }

        // Process the applicant (existing queue logic)
        await runner._fillWithRetry(app, applicant, config);

    } catch (e) {
        console.error(`💥 Erro fatal: ${e.message}`);
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
