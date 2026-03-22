#!/usr/bin/env node
// ============================================================
// run.js - CLI runner para a automacao DS-160
// Usa service role quando disponivel; fallback para chave local
// Usage: node automation/run.js
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
const { QueueRunner } = require('./queue');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_KEY nao encontrados no .env');
    process.exit(1);
}

async function main() {
    console.log('DS-160 Automation Runner');
    console.log('='.repeat(50));
    console.log(`Supabase: ${SUPABASE_URL}`);
    console.log(`Headless: ${process.env.HEADLESS || 'false'}`);
    console.log(`Auth mode: ${SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'fallback key'}`);
    console.log('='.repeat(50));

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: queue } = await supabase
        .from('applicants')
        .select('id, full_name, sort_order')
        .eq('stage', 'ds160')
        .eq('status', 'todo');

    const { data: settings } = await supabase.from('settings').select('key_name, key_value');
    if (settings) {
        const headlessSetting = settings.find(s => s.key_name === 'headless');
        if (headlessSetting) {
            process.env.HEADLESS = headlessSetting.key_value;
            console.log(`Headless (from DB): ${headlessSetting.key_value}`);
        }
    }

    console.log(`\nDS-160 Queue: ${queue?.length || 0} applicant(s) waiting`);
    if (queue && queue.length > 0) {
        queue.forEach(a => console.log(`  -> ${a.full_name} [sort:${a.sort_order ?? '?'}]`));
    }

    const runner = new QueueRunner(supabase, 'capmonster');

    const emitter = (status) => {
        switch (status.type) {
            case 'queue-empty':
                console.log(`\nQueue vazia - proxima verificacao em ${status.nextCheck}s`);
                break;
            case 'doing':
                console.log(`Preenchendo: ${status.applicantName} - ${status.page}`);
                break;
            case 'done':
                console.log(`\nConcluido: ${status.applicantName}`);
                break;
            case 'error':
                console.error(`\nErro: ${status.applicantName} - ${status.error}`);
                break;
            case 'retrying':
                console.log(`Retry #${status.retryNumber}: ${status.applicantName} - aguardando ${status.delay}s`);
                break;
            case 'waiting':
                if (status.countdown % 30 === 0 && status.countdown > 0) {
                    console.log(status.message);
                }
                break;
            case 'paused':
                console.log(status.message);
                break;
            default:
                console.log(JSON.stringify(status));
        }
    };

    process.on('SIGINT', async () => {
        console.log('\nParando runner...');
        await runner.stop();
        console.log('Runner finalizado.');
        process.exit(0);
    });

    console.log('\nIniciando Queue Runner...\n');
    await runner.start(emitter);
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
