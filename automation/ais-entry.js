#!/usr/bin/env node
// ============================================================
// ais-entry.js - one-shot AIS worker entrypoint
// Processes one AIS lifecycle pass, then exits
// Suitable for Fly Machines or local/manual runs
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_KEY sao obrigatorios');
    process.exit(1);
}

process.env.HEADLESS = 'true';
process.env.AIS_SUPABASE_URL = SUPABASE_URL;
process.env.AIS_SUPABASE_KEY = SUPABASE_KEY;

async function main() {
    const startTime = Date.now();
    console.log('=======================================');
    console.log('  AIS Worker (Fly Machine)');
    console.log(`  Supabase: ${SUPABASE_URL}`);
    console.log(`  Start:    ${new Date().toISOString()}`);
    console.log('=======================================\n');

    const {
        processPendingSignups,
        processPendingConfirmations,
        processConfirmedAccounts,
        processWaitingPayment,
        processPaymentConfirmed,
        loadSettings,
    } = require('./ais/ais-runner');

    await loadSettings();

    console.log('\n-- Phase 1: Pending Signups --');
    await processPendingSignups();

    console.log('\n-- Phase 2: Pending Confirmations --');
    await processPendingConfirmations();

    console.log('\n-- Phase 3: Confirmed -> Add Applicants --');
    await processConfirmedAccounts();

    console.log('\n-- Phase 4: Check Payments --');
    await processWaitingPayment();

    console.log('\n-- Phase 5: Schedule --');
    await processPaymentConfirmed();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDuracao: ${elapsed}s`);
    console.log('AIS worker finalizado');
    process.exit(0);
}

main().catch(err => {
    console.error('Crash:', err);
    process.exit(1);
});
