// ==================================================================
// DS-160 & AIS Worker — Background Service Worker
// ==================================================================
const GITHUB_RAW = 'https://raw.githubusercontent.com/viniciussouzax/visa/main/extension';
const CHECK_INTERVAL_MIN = 2;

// Defaults — auto-configured on install (anon key is public, RLS protects data)
const DEFAULT_SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

let isRunning = false;
let currentTask = null;
let config = null; // { supabaseUrl, supabaseKey, settings: {} }

// ------------------------------------------------------------------
// Config: load Supabase URL/Key from chrome.storage + settings from DB
// ------------------------------------------------------------------
async function loadConfig() {
    const stored = await chrome.storage.local.get(['supabaseUrl', 'supabaseKey']);
    const supaUrl = stored.supabaseUrl || DEFAULT_SUPABASE_URL;
    const supaKey = stored.supabaseKey || DEFAULT_SUPABASE_KEY;

    // Auto-save defaults if not yet stored
    if (!stored.supabaseUrl || !stored.supabaseKey) {
        await chrome.storage.local.set({ supabaseUrl: supaUrl, supabaseKey: supaKey });
    }

    config = {
        supabaseUrl: supaUrl,
        supabaseKey: supaKey,
        settings: {},
    };

    // Buscar todas as settings do banco (capmonster_key, etc.)
    try {
        const rows = await supaFetch('settings?select=key_name,key_value');
        rows.forEach(r => config.settings[r.key_name] = r.key_value);
        console.log('[Worker] Settings carregadas:', Object.keys(config.settings).join(', '));
    } catch (err) {
        console.warn('[Worker] Erro ao carregar settings:', err.message);
    }

    return config;
}

// ------------------------------------------------------------------
// Supabase helpers (usa config dinâmico)
// ------------------------------------------------------------------
async function supaFetch(path, opts = {}) {
    if (!config) throw new Error('Config não carregada');
    const res = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
        headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': opts.prefer || 'return=representation',
            ...opts.headers,
        },
        method: opts.method || 'GET',
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
}

async function supaRpc(fn, params = {}) {
    if (!config) throw new Error('Config não carregada');
    const res = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`RPC ${fn} ${res.status}: ${await res.text()}`);
    return res.json();
}

async function supaStorage(bucket, path, blob) {
    if (!config) throw new Error('Config não carregada');
    const res = await fetch(`${config.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Content-Type': blob.type || 'application/octet-stream',
        },
        body: blob,
    });
    if (!res.ok) throw new Error(`Storage upload ${res.status}`);
    return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// ------------------------------------------------------------------
// Queue: find and claim tasks
// ------------------------------------------------------------------
async function checkQueue() {
    if (!isRunning || currentTask) return;
    if (!config) {
        config = await loadConfig();
        if (!config) return;
    }

    try {
        // DS-160: buscar applicants com stage=ds160, status=todo
        const ds160Items = await supaFetch(
            'applicants?stage=eq.ds160&status=eq.todo&order=sort_order.asc&limit=1'
        );

        if (ds160Items.length > 0) {
            await processDS160(ds160Items[0]);
            return;
        }

        // AIS: buscar applicants com stage=ais, status=todo
        const aisItems = await supaFetch(
            'applicants?stage=eq.ais&status=eq.todo&order=sort_order.asc&limit=1'
        );

        if (aisItems.length > 0) {
            await processAIS(aisItems[0]);
            return;
        }

        console.log('[Worker] Fila vazia');
    } catch (err) {
        console.error('[Worker] Erro ao verificar fila:', err.message);
    }
}

// ------------------------------------------------------------------
// DS-160 processing
// ------------------------------------------------------------------
async function processDS160(applicant) {
    currentTask = { type: 'ds160', applicant };

    try {
        await supaFetch(`applicants?id=eq.${applicant.id}`, {
            method: 'PATCH',
            body: { status: 'doing', updated_at: new Date().toISOString() },
        });

        await chrome.storage.local.set({
            currentTask: {
                type: 'ds160',
                applicantId: applicant.id,
                fullName: applicant.full_name,
                data: applicant.data,
                settings: config.settings,
            }
        });

        const tab = await chrome.tabs.create({
            url: 'https://ceac.state.gov/GenNIV/Default.aspx',
            active: false,
        });

        currentTask.tabId = tab.id;
        updateBadge('DS', '#4CAF50');

    } catch (err) {
        console.error('[Worker] Erro DS-160:', err.message);
        await supaFetch(`applicants?id=eq.${applicant.id}`, {
            method: 'PATCH',
            body: { status: 'error', updated_at: new Date().toISOString() },
        });
        currentTask = null;
    }
}

// ------------------------------------------------------------------
// AIS processing
// ------------------------------------------------------------------
async function processAIS(applicant) {
    currentTask = { type: 'ais', applicant };

    try {
        await supaFetch(`applicants?id=eq.${applicant.id}`, {
            method: 'PATCH',
            body: { status: 'doing', updated_at: new Date().toISOString() },
        });

        await chrome.storage.local.set({
            currentTask: {
                type: 'ais',
                applicantId: applicant.id,
                fullName: applicant.full_name,
                data: applicant.data,
                settings: config.settings,
            }
        });

        const subStatus = applicant.sub_status || 'signup';
        let url = 'https://ais.usvisa-info.com/pt-br/niv';
        if (subStatus === 'confirm') {
            url = applicant.data?._meta?.confirmationLink || url;
        }

        const tab = await chrome.tabs.create({ url, active: false });
        currentTask.tabId = tab.id;
        updateBadge('AIS', '#2196F3');

    } catch (err) {
        console.error('[Worker] Erro AIS:', err.message);
        await supaFetch(`applicants?id=eq.${applicant.id}`, {
            method: 'PATCH',
            body: { status: 'error', updated_at: new Date().toISOString() },
        });
        currentTask = null;
    }
}

// ------------------------------------------------------------------
// Message handler — content scripts report back here
// ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
        case 'TASK_COMPLETE':
            handleTaskComplete(msg);
            sendResponse({ ok: true });
            break;

        case 'TASK_ERROR':
            handleTaskError(msg);
            sendResponse({ ok: true });
            break;

        case 'TASK_PROGRESS':
            handleTaskProgress(msg);
            sendResponse({ ok: true });
            break;

        case 'SOLVE_CAPTCHA':
            solveCaptcha(msg.imageBase64).then(answer => sendResponse({ answer }))
                .catch(err => sendResponse({ error: err.message }));
            return true;

        case 'UPLOAD_FILE':
            uploadFile(msg.bucket, msg.path, msg.dataUrl).then(url => sendResponse({ url }))
                .catch(err => sendResponse({ error: err.message }));
            return true;

        case 'GET_STATUS':
            sendResponse({
                isRunning,
                configured: !!config,
                currentTask: currentTask ? {
                    type: currentTask.type,
                    name: currentTask.applicant?.full_name,
                } : null,
            });
            break;

        case 'TOGGLE':
            toggleWorker().then(state => sendResponse(state));
            return true;

        case 'SAVE_CONFIG':
            chrome.storage.local.set({
                supabaseUrl: msg.supabaseUrl,
                supabaseKey: msg.supabaseKey,
            }).then(() => {
                config = null; // force reload
                loadConfig().then(() => sendResponse({ ok: true }));
            });
            return true;
    }
});

async function toggleWorker() {
    if (!config) {
        config = await loadConfig();
        if (!config) return { isRunning: false, error: 'Supabase não configurado' };
    }

    isRunning = !isRunning;
    if (isRunning) {
        chrome.alarms.create('check-queue', { periodInMinutes: CHECK_INTERVAL_MIN });
        checkQueue();
    } else {
        chrome.alarms.clear('check-queue');
    }
    updateBadge(isRunning ? 'ON' : 'OFF', isRunning ? '#4CAF50' : '#999');
    return { isRunning };
}

async function handleTaskComplete(msg) {
    if (!currentTask) return;
    try {
        await supaFetch(`applicants?id=eq.${currentTask.applicant.id}`, {
            method: 'PATCH',
            body: { status: 'done', updated_at: new Date().toISOString() },
        });
        console.log(`[Worker] ✅ ${currentTask.applicant.full_name}`);
    } catch (err) {
        console.error('[Worker] Erro ao finalizar:', err.message);
    }
    if (msg.tabId) chrome.tabs.remove(msg.tabId).catch(() => {});
    currentTask = null;
    updateBadge('ON', '#4CAF50');
    setTimeout(checkQueue, 3000);
}

async function handleTaskError(msg) {
    if (!currentTask) return;
    try {
        await supaFetch(`applicants?id=eq.${currentTask.applicant.id}`, {
            method: 'PATCH',
            body: { status: 'error', updated_at: new Date().toISOString() },
        });
        await supaFetch('error_logs', {
            method: 'POST',
            body: {
                applicant_name: currentTask.applicant.full_name,
                error_message: msg.error,
                error_cause: msg.cause || 'extension_error',
                page_name: msg.page || 'unknown',
            },
        });
    } catch (err) {
        console.error('[Worker] Erro ao registrar falha:', err.message);
    }
    currentTask = null;
    updateBadge('ERR', '#F44336');
    setTimeout(checkQueue, 10000);
}

function handleTaskProgress(msg) {
    updateBadge(msg.page?.substring(0, 4) || '...', '#FF9800');
}

// ------------------------------------------------------------------
// Captcha solver via CapMonster (key from settings table)
// ------------------------------------------------------------------
async function solveCaptcha(imageBase64) {
    const apiKey = config?.settings?.capmonster_key;
    if (!apiKey) throw new Error('CapMonster key não configurada no settings');

    const createRes = await fetch('https://api.capmonster.cloud/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientKey: apiKey,
            task: { type: 'ImageToTextTask', body: imageBase64 },
        }),
    });
    const { taskId } = await createRes.json();

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch('https://api.capmonster.cloud/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: apiKey, taskId }),
        });
        const result = await res.json();
        if (result.status === 'ready') return result.solution.text;
    }
    throw new Error('Captcha timeout');
}

// ------------------------------------------------------------------
// File upload
// ------------------------------------------------------------------
async function uploadFile(bucket, path, dataUrl) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return supaStorage(bucket, path, blob);
}

// ------------------------------------------------------------------
// Badge
// ------------------------------------------------------------------
function updateBadge(text, color) {
    chrome.action.setBadgeText({ text: text || '' });
    chrome.action.setBadgeBackgroundColor({ color: color || '#999' });
}

// ------------------------------------------------------------------
// Auto-update from GitHub
// ------------------------------------------------------------------
async function checkForUpdates() {
    try {
        const res = await fetch(`${GITHUB_RAW}/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const remote = await res.json();
        const local = await chrome.storage.local.get('extensionVersion');

        if (local.extensionVersion === remote.version) return;

        console.log(`[Update] ${local.extensionVersion || '?'} → ${remote.version}`);
        if (remote.files) {
            for (const filePath of remote.files) {
                const fileRes = await fetch(`${GITHUB_RAW}/${filePath}?t=${Date.now()}`);
                if (fileRes.ok) {
                    const code = await fileRes.text();
                    await chrome.storage.local.set({ [`script_${filePath}`]: code });
                }
            }
        }
        await chrome.storage.local.set({ extensionVersion: remote.version });
    } catch (err) {
        console.warn('[Update] Falha:', err.message);
    }
}

// ------------------------------------------------------------------
// Startup
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
    updateBadge('OFF', '#999');
    checkForUpdates();
    loadConfig();
});

chrome.runtime.onStartup.addListener(() => {
    checkForUpdates();
    loadConfig();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'check-queue') checkQueue();
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (currentTask?.tabId === tabId) {
        currentTask = null;
        updateBadge(isRunning ? 'ON' : 'OFF', isRunning ? '#4CAF50' : '#999');
    }
});
