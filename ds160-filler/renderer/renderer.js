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
// (Supabase is used only in the sidecar, not in the renderer)

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

    // Show spinner immediately while sidecar boots up
    setCircle('active', '', 'Verificando aplicações...');
    const ct = $('circle-timer');
    if (ct) ct.innerHTML = '<div class="circle-spinner"></div>';

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
    setCircle('stopped', '', '');
    const ct = $('circle-timer');
    if (ct) ct.textContent = 'Desconectado';
});

// ============================================================
// TIMER — countdown inside the sync button
// ============================================================
const SPINNER_HTML = '<div class="circle-spinner"></div>';

function showTimer(display) {
    const text = typeof display === 'number'
        ? `${Math.floor(display / 60)}:${String(display % 60).padStart(2, '0')}`
        : display;
    const ct = $('circle-timer');
    if (ct) ct.textContent = text;
}

function hideTimer() {
    // No text = show spinner (never leave blank)
    const ct = $('circle-timer');
    if (ct) ct.innerHTML = SPINNER_HTML;
}

// ============================================================
// STATUS CIRCLE
// ============================================================
const STATUS_ICONS = {
    idle: '',
    running: '',
    error: '',
    warning: '',
    stopped: '',
    sync: '',
};

function setCircle(state, label, detail) {
    const circle = $('status-circle');
    circle.className = 'status-circle ' + state;
    // Always reset timer to spinner — callers set specific text AFTER calling setCircle
    circle.innerHTML = (STATUS_ICONS[state] || STATUS_ICONS.idle) + '<span id="circle-timer" class="circle-timer">' + SPINNER_HTML + '</span>';
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
// SYNC STATE (declared before event listener that uses it)
// ============================================================
let syncBusy = false;

// ============================================================
// STATUS UPDATES (from Tauri sidecar via events)
// ============================================================
listen('automation-status', (event) => {
    const status = event.payload;
    // Any sidecar event clears syncBusy so spinner transitions smoothly
    syncBusy = false;

    if (status.type === 'searching' || status.type === 'queue-empty' || status.type === 'done') {
        // 🔵 AZUL — Ativo e aguardando
        setCircle('idle', '', 'Ativo e aguardando');
        if (status.type === 'queue-empty' && status.nextCheck) showTimer(status.nextCheck);
        if (status.type === 'done') log(`✅ ${status.applicantName} concluído`);
        if (status.type === 'searching') hideTimer();
    } else if (status.type === 'claimed' || status.type === 'filling') {
        // 🟢 VERDE — Preenchendo
        const page = status.page || '';
        const name = status.applicantName || '';
        setCircle('running', '', `Página ${page} do solicitante ${name}`);
        const ct = $('circle-timer');
        if (ct) ct.textContent = 'Preenchendo';
        if (status.type === 'claimed') {
            log(`📋 ${name} — ${page || 'Preparando...'}`);
        }
    } else if (status.type === 'retrying') {
        // 🟡 ÂMBAR — Retentando
        setCircle('warning', '', `Página ${status.page || ''} do solicitante ${status.applicantName || ''}`);
        const ct = $('circle-timer');
        if (ct) ct.textContent = 'Retentando';
        log(`🔄 ${status.applicantName} — tentativa ${status.retryNumber}`);
    } else if (status.type === 'error' || status.type === 'paused') {
        // 🔴 VERMELHO — Erro
        const errMsg = (status.error || status.message || '').toLowerCase();
        const isConnectionError = errMsg.includes('fetch') || errMsg.includes('network') ||
            errMsg.includes('timeout') || errMsg.includes('enotfound') ||
            errMsg.includes('econnrefused') || errMsg.includes('internet') ||
            errMsg.includes('offline') || errMsg.includes('socket');
        if (isConnectionError) {
            setCircle('error', '', 'Sem conexão com a internet');
        } else {
            setCircle('error', '', 'Notificando suporte técnico');
        }
        const ct = $('circle-timer');
        if (ct) ct.textContent = 'Erro';
        if (status.type === 'error') log(`❌ ${status.applicantName || ''} — ${status.error || 'Erro'}`);
        if (status.type === 'paused') log(`⚠️ ${status.message}`);
    } else if (status.type === 'waiting') {
        showTimer(status.display || status.countdown);
    } else if (status.type === 'update') {
        log(`🔄 ${status.message || 'Scripts atualizados'}`);
    } else if (status.type === 'log') {
        // Sidecar stderr — visible in Logs tab for debugging
        log(`🔧 ${status.message || ''}`);
    } else if (status.type === 'disconnected') {
        // ⚫ CINZA — Sidecar morreu
        setCircle('stopped', '', 'Automação desconectada');
        const ct = $('circle-timer');
        if (ct) ct.textContent = 'Desconectado';
        log('⚠️ Sidecar encerrado — faça logout e login novamente');
    }
});

// ============================================================
// SYNC — clicking the circle triggers sync
// ============================================================

$('status-circle').addEventListener('click', async () => {
    // Só permite sync quando está em estado idle (azul)
    const circle = $('status-circle');
    const isIdle = circle.classList.contains('idle');
    if (!isIdle || syncBusy) return;
    syncBusy = true;
    const ct = $('circle-timer');
    if (ct) ct.innerHTML = '<div class="circle-spinner"></div>';

    try {
        const { check } = window.__TAURI__.updater;
        const update = await check();
        if (update) {
            log(`📦 Nova versão ${update.version} — instalando...`);
            if (ct) ct.innerHTML = '<div class="circle-spinner"></div>';
            await update.downloadAndInstall();
            log('✅ Atualização instalada! Reiniciando...');
            const { relaunch } = window.__TAURI__.process;
            await relaunch();
            return;
        }
    } catch { }

    try {
        log('⚡ Buscando fila...');
        if (ct) ct.innerHTML = '<div class="circle-spinner"></div>';
        await invoke('refresh_queue');
    } catch (e) {
        log(`⚠️ ${e}`);
    }

    // Don't reset circle here — let the next sidecar event set the real state
    // The spinner will stay visible until the sidecar responds with a status update
    log('✅ Sincronizado');
    setTimeout(() => {
        syncBusy = false;
        // Only reset if still showing spinner after 10s (fallback)
        const ct2 = $('circle-timer');
        if (ct2 && ct2.querySelector('.circle-spinner')) {
            setCircle('idle', '', 'Ativo e aguardando');
        }
    }, 10000);
});

// Auto-check for updates on startup + every hour
async function checkForAppUpdate() {
    try {
        const { check } = window.__TAURI__.updater;
        const update = await check();
        if (update) {
            log(`📦 Nova versão ${update.version} disponível — clique no círculo`);
        }
    } catch (e) { console.warn('[Update] Check failed:', e); }
}
setTimeout(checkForAppUpdate, 5000);
setInterval(checkForAppUpdate, 60 * 60 * 1000); // Check every hour
