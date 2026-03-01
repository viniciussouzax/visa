#!/usr/bin/env node
// ============================================================
// SIDECAR — Node.js process spawned by Tauri
// Runs the DS-160 automation queue, communicating via stdout (JSON)
// Includes hot-reload: auto-updates automation scripts from GitHub
// ============================================================

// Global error boundary — catches module load errors and unhandled exceptions
// Emits error via stdout JSON so the Tauri frontend can display it
function emitFatalError(label, err) {
    const msg = { type: 'error', error: `[Sidecar ${label}] ${err?.message || err}` };
    try { process.stdout.write(JSON.stringify(msg) + '\n'); } catch { }
    console.error(`[Sidecar FATAL] ${label}:`, err);
    setTimeout(() => process.exit(1), 100); // give stdout time to flush
}
process.on('uncaughtException', (err) => emitFatalError('uncaughtException', err));
process.on('unhandledRejection', (err) => emitFatalError('unhandledRejection', err));

let createClient, checkForUpdates, getAutomationVersion;
try {
    ({ createClient } = require('@supabase/supabase-js'));
    ({ checkForUpdates, getAutomationVersion } = require('../automation/hot-reload'));
} catch (err) {
    emitFatalError('module-load', err);
    // emitFatalError already calls process.exit after flush
    // But we need to prevent the rest of the code from running
    return;
}

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

// ============================================================
// SMART CHECK FOR UPDATES (debounced — max once per 5 minutes)
// ============================================================
let lastUpdateCheck = 0;
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

global.smartCheckForUpdates = () => {
    const now = Date.now();
    if (now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return;
    lastUpdateCheck = now;

    // Non-blocking: check in background
    checkForUpdates().then(result => {
        if (result && typeof result === 'object') {
            const groups = Object.entries(result)
                .filter(([, v]) => v.updated)
                .map(([k]) => k);
            if (groups.length > 0) {
                console.log(`[HotReload] Updated groups: ${groups.join(', ')}`);
                emitStatus({
                    type: 'update',
                    message: `Scripts atualizados: ${groups.join(', ')}`
                });
            }
        }
    }).catch(e => {
        console.warn(`[HotReload] Check failed: ${e.message}`);
    });
};

async function main() {
    try {
        // 1. Check for updates BEFORE starting automation
        console.log('Checking for updates...');
        try {
            const result = await checkForUpdates();
            if (result && typeof result === 'object') {
                const groups = Object.entries(result)
                    .filter(([, v]) => v.updated)
                    .map(([k]) => k);
                if (groups.length > 0) {
                    console.log(`Updated groups on startup: ${groups.join(', ')}`);
                    emitStatus({
                        type: 'update',
                        message: `Scripts atualizados: ${groups.join(', ')}`
                    });
                }
            } else {
                console.log('All scripts up to date');
            }
        } catch (e) {
            console.warn(`Update check failed (continuing): ${e.message}`);
        }

        // 2. Authenticate with Supabase
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

        // Log automation version if available
        const autoVersion = getAutomationVersion();
        if (autoVersion) {
            console.log(`Automation version: ${autoVersion.version || 'unknown'}`);
        }

        // 3. Start the queue runner (uses hotRequire internally)
        const { QueueRunner } = require('../automation/queue');
        const runner = new QueueRunner(sb, null);

        runner.start((status) => {
            emitStatus(status);
        });

        console.log('Automation started');

        // Handle stdin for commands from Tauri
        process.stdin.setEncoding('utf-8');
        process.stdin.resume(); // Ensure stdin is in flowing mode (required when piped)
        process.stdin.on('data', (data) => {
            const raw = data.trim();
            console.log(`[Stdin] Received: ${raw}`);
            try {
                const cmd = JSON.parse(raw);
                if (cmd.action === 'refresh') {
                    console.log('[Stdin] Triggering queue refresh');
                    runner.triggerNow();
                } else if (cmd.action === 'stop') {
                    console.log('[Stdin] Stopping automation');
                    runner.stop().then(() => process.exit(0));
                }
            } catch (e) {
                console.warn(`[Stdin] Invalid JSON: ${raw}`);
            }
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
