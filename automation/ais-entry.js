#!/usr/bin/env node
// ============================================================
// ais-entry.js — Cloud Run Job entrypoint for AIS
// Processa 1 ciclo AIS (signup/confirm/add/payment/schedule) e sai
// Container sobe → processa pendentes → morre
// ============================================================

// ── ENV ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios');
    process.exit(1);
}

// Force headless in cloud
process.env.HEADLESS = 'true';

// Patch the hardcoded values in ais-runner to use env vars
process.env.AIS_SUPABASE_URL = SUPABASE_URL;
process.env.AIS_SUPABASE_KEY = SUPABASE_KEY;

async function main() {
    const startTime = Date.now();
    console.log('═══════════════════════════════════════');
    console.log('  🏛️  AIS Worker (Cloud Run Job)');
    console.log('═══════════════════════════════════════');
    console.log(`  Supabase: ${SUPABASE_URL}`);
    console.log(`  Start:    ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════\n');

    // ais-runner.js exporta as funções de processamento
    // Para o Cloud Run Job, executamos cada fase uma vez e saímos
    // As funções já estão implementadas no ais-runner.js

    // Dynamic import since ais-runner has hardcoded Supabase config
    // TODO: refactor ais-runner to use env vars instead of hardcoded values
    const {
        processPendingSignups,
        processPendingConfirmations,
        processConfirmedAccounts,
        processWaitingPayment,
        processPaymentConfirmed,
        loadSettings,
    } = require('./ais/ais-runner');

    await loadSettings();

    // Process each phase once
    console.log('\n── Phase 1: Pending Signups ──');
    await processPendingSignups();

    console.log('\n── Phase 2: Pending Confirmations ──');
    await processPendingConfirmations();

    console.log('\n── Phase 3: Confirmed → Add Applicants ──');
    await processConfirmedAccounts();

    console.log('\n── Phase 4: Check Payments ──');
    await processWaitingPayment();

    console.log('\n── Phase 5: Schedule ──');
    await processPaymentConfirmed();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️ Duração: ${elapsed}s`);
    console.log('🏁 AIS Job finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('💥 Crash:', err);
    process.exit(1);
});
