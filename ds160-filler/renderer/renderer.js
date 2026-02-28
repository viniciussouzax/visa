// Renderer logic for SENDS160 — Tauri v2 version
// Adapted from Electron IPC to Tauri invoke/listen
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = id => document.getElementById(id);

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tab = document.getElementById('tab-' + btn.dataset.tab);
        if (tab) tab.classList.add('active');
    });
});

// Clear logs button
const clearBtn = $('btn-clear-logs');
if (clearBtn) {
    clearBtn.addEventListener('click', () => { $('log').innerHTML = ''; });
}

// ============================================================
// SUPABASE (direct from frontend — no IPC needed)
// ============================================================
const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

let supabaseClient = null;

// Lazy-load supabase-js from CDN (no bundler needed)
async function getSupabase() {
    if (supabaseClient) return supabaseClient;
    // supabase-js is loaded via <script> tag in HTML
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return supabaseClient;
    }
    return null;
}

// ============================================================
// AUTO-LOGIN: Try saved session on load
// ============================================================
(async () => {
    const session = await invoke('get_saved_session');
    if (session && session.email && session.password) {
        $('email').value = session.email;
        $('password').value = session.password;
        $('remember').checked = true;
        $('btn-login').textContent = 'Conectando...';
        $('btn-login').disabled = true;

        try {
            const result = await invoke('login', { email: session.email, password: session.password });
            if (result.success) {
                showMain(result.user);
                return;
            }
        } catch (e) { /* ignore auto-login errors */ }

        $('btn-login').textContent = 'Entrar';
        $('btn-login').disabled = false;
        $('login-error').textContent = 'Sessão expirada. Faça login novamente.';
    }
})();

// ============================================================
// LOGIN
// ============================================================
$('btn-login').addEventListener('click', async () => {
    const email = $('email').value.trim();
    const password = $('password').value.trim();
    if (!email || !password) { $('login-error').textContent = 'Preencha email e senha'; return; }

    $('btn-login').disabled = true;
    $('btn-login').textContent = 'Entrando...';

    try {
        const result = await invoke('login', { email, password });
        if (result.success) {
            showMain(result.user);
        } else {
            $('login-error').textContent = result.error || 'Erro desconhecido';
            $('btn-login').disabled = false;
            $('btn-login').textContent = 'Entrar';
        }
    } catch (e) {
        $('login-error').textContent = e.toString();
        $('btn-login').disabled = false;
        $('btn-login').textContent = 'Entrar';
    }
});

$('password').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });

function showMain(userEmail) {
    $('login-section').style.display = 'none';
    const main = $('main-section');
    main.classList.remove('hidden');
    main.style.display = 'flex';
    $('user-email').textContent = userEmail;
    log('✅ Conectado — automação ativa');

    // Get version from Tauri backend
    invoke('get_version').then(v => {
        const versionEl = document.querySelector('.version');
        if (versionEl) versionEl.textContent = `v${v}`;
    }).catch(() => { });
}

// ============================================================
// LOGOUT
// ============================================================
$('btn-logout').addEventListener('click', async () => {
    await invoke('logout');
    const main = $('main-section');
    main.style.display = 'none';
    main.classList.add('hidden');
    $('login-section').style.display = 'flex';
    $('email').value = '';
    $('password').value = '';
    $('login-error').textContent = '';
    $('btn-login').disabled = false;
    $('btn-login').textContent = 'Entrar';
    $('log').innerHTML = '';
    setCircle('stopped', 'Desconectado', '');
});

// ============================================================
// TIMER — countdown inside the sync button
// ============================================================
function showTimer(display) {
    // Show countdown in the sync button text (e.g. "⏱ 28:55")
    if (!syncBusy) {
        const text = typeof display === 'number'
            ? `⏱ ${Math.floor(display / 60)}:${String(display % 60).padStart(2, '0')}`
            : `⏱ ${display}`;
        $('btn-sync-text').textContent = text;
        // Hide sync icon during countdown
        const svg = $('btn-sync').querySelector('svg');
        if (svg) svg.style.display = 'none';
    }
}

function hideTimer() {
    if (!syncBusy) {
        $('btn-sync-text').textContent = 'Sincronizar';
        // Show sync icon
        const svg = $('btn-sync').querySelector('svg');
        if (svg) svg.style.display = '';
    }
}

// ============================================================
// STATUS CIRCLE
// ============================================================
const STATUS_ICONS = {
    idle: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    running: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
    error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
    stopped: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
};

function setCircle(state, label, detail) {
    const circle = $('status-circle');
    circle.className = 'status-circle ' + state;
    circle.innerHTML = STATUS_ICONS[state] || STATUS_ICONS.idle;
    $('status-text').textContent = label || 'Ativo';
    if (detail !== undefined) $('status-detail').textContent = detail;
}

function setStatus(state, text) {
    const detailMap = {
        running: 'Processando fila de preenchimento',
        idle: 'Monitorando fila de preenchimento',
        error: 'Verifique os logs para mais detalhes',
        stopped: '',
    };
    setCircle(state, text, detailMap[state] || '');
}

// ============================================================
// LOG
// ============================================================
function log(msg) {
    const el = $('log');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="time">[${time}]</span>${msg}`;
    el.prepend(line);
    while (el.children.length > 200) el.removeChild(el.lastChild);
}

// ============================================================
// STATUS UPDATES (from Tauri sidecar via events)
// ============================================================
listen('automation-status', (event) => {
    const status = event.payload;

    if (status.type === 'searching') {
        setCircle('idle', 'Buscando...', 'Verificando fila de preenchimento');
        hideTimer();
    } else if (status.type === 'claimed') {
        setCircle('running', 'Encontrado', status.applicantName || 'Preparando...');
        log(`📋 ${status.applicantName} — ${status.page || 'Preparando...'}`);
        hideTimer();
    } else if (status.type === 'filling') {
        setCircle('running', 'Preenchendo...', `${status.applicantName} — ${status.page || ''}`);
    } else if (status.type === 'done') {
        log(`✅ ${status.applicantName} concluído`);
        setCircle('idle', 'Concluído', `${status.applicantName} — finalizado`);
    } else if (status.type === 'error') {
        log(`❌ ${status.applicantName || ''} — ${status.error || 'Erro desconhecido'}`);
        setCircle('error', 'Erro', status.applicantName || 'Verifique os logs');
    } else if (status.type === 'queue-empty') {
        setCircle('idle', 'Aguardando', 'Nenhum item na fila');
        if (status.nextCheck) showTimer(status.nextCheck);
    } else if (status.type === 'waiting') {
        showTimer(status.display || status.countdown);
    } else if (status.type === 'retrying') {
        setCircle('running', `Retentativa ${status.retryNumber}/5`, status.applicantName || '');
        log(`🔄 ${status.applicantName} — tentativa ${status.retryNumber}, aguardando ${Math.round(status.delay / 60)}min`);
    } else if (status.type === 'paused') {
        setCircle('error', 'Pausado', status.message || 'Muitos erros seguidos');
        log(`⚠️ ${status.message}`);
    } else if (status.type === 'update') {
        log(`🔄 ${status.message || 'Scripts atualizados'}`);
    }
});

// ============================================================
// SYNC BUTTON (check update → refresh queue) — single unified button
// ============================================================
let syncBusy = false;

$('btn-sync').addEventListener('click', async () => {
    if (syncBusy) return; // Anti-double-click
    syncBusy = true;
    $('btn-sync-text').textContent = 'Sincronizando...';
    $('btn-sync').disabled = true;

    try {
        // Step 1: Check for updates
        const { check } = window.__TAURI__.updater;
        const update = await check();
        if (update) {
            log(`📦 Nova versão ${update.version} — instalando...`);
            $('btn-sync-text').textContent = 'Atualizando...';
            await update.downloadAndInstall();
            log('✅ Atualização instalada! Reiniciando...');
            const { relaunch } = window.__TAURI__.process;
            await relaunch();
            return;
        }
    } catch { /* updater may fail in dev — continue to refresh */ }

    // Step 2: Refresh queue
    try {
        log('⚡ Buscando fila...');
        $('btn-sync-text').textContent = 'Buscando...';
        await invoke('refresh_queue');
    } catch (e) {
        log(`⚠️ ${e}`);
    }

    log('✅ Sincronizado');
    $('btn-sync-text').textContent = 'Sincronizar';

    // Cooldown 5s — prevent rapid clicks
    setTimeout(() => {
        syncBusy = false;
        $('btn-sync').disabled = false;
    }, 5000);
});

// Auto-check for updates on startup (after 5 seconds)
setTimeout(async () => {
    try {
        const { check } = window.__TAURI__.updater;
        const update = await check();
        if (update) {
            log(`📦 Nova versão ${update.version} disponível — clique em Sincronizar`);
            $('btn-sync').style.borderColor = '#3fb950';
            $('btn-sync-text').textContent = `Atualizar`;
        }
    } catch { /* silently ignore in dev mode */ }
}, 5000);
