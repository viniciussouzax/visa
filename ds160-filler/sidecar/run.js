#!/usr/bin/env node
// ============================================================
// SIDECAR — Node.js process spawned by Tauri
// Runs the DS-160 automation queue, communicating via stdout (JSON)
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

// Get credentials from command line args
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('[Sidecar] Missing email/password arguments');
    process.exit(1);
}

// Helper: send status to Tauri (via stdout JSON)
function emitStatus(status) {
    try {
        process.stdout.write(JSON.stringify(status) + '\n');
    } catch (e) {
        // stdout closed, exit gracefully
        process.exit(0);
    }
}

// Override console.log to prefix with [Sidecar] and NOT interfere with JSON stdout
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => _origErr('[Sidecar]', ...args);
console.warn = (...args) => _origErr('[Sidecar:WARN]', ...args);

async function main() {
    try {
        // Authenticate with Supabase
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            emitStatus({ type: 'error', error: `Login falhou: ${error.message}` });
            process.exit(1);
        }

        console.log(`Authenticated as ${data.user.email}`);

        // Make software version available globally
        try {
            const pkg = require('../package.json');
            global.softwareVersion = pkg.version;
        } catch { global.softwareVersion = 'unknown'; }

        // Start the queue runner
        const { QueueRunner } = require('../automation/queue');
        const runner = new QueueRunner(sb, null);

        runner.start((status) => {
            emitStatus(status);
        });

        console.log('Automation started');

        // Handle stdin for commands from Tauri
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', (data) => {
            try {
                const cmd = JSON.parse(data.trim());
                if (cmd.action === 'refresh') {
                    runner.triggerNow();
                } else if (cmd.action === 'stop') {
                    runner.stop().then(() => process.exit(0));
                }
            } catch { /* ignore invalid input */ }
        });

        // Keep process alive
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM, stopping...');
            await runner.stop();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('Received SIGINT, stopping...');
            await runner.stop();
            process.exit(0);
        });

    } catch (e) {
        emitStatus({ type: 'error', error: `Erro fatal: ${e.message}` });
        console.error('Fatal error:', e);
        process.exit(1);
    }
}

main();
