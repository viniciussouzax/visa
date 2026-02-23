// Renderer logic for DS-160 Filler UI — Simplified
const $ = id => document.getElementById(id);

// ============================================================
// AUTO-LOGIN: Try saved session on load
// ============================================================
(async () => {
    const session = await window.api.getSavedSession();
    if (session && session.email && session.password) {
        $('email').value = session.email;
        $('password').value = session.password;
        $('remember').checked = true;
        // Auto-login
        $('btn-login').textContent = 'Conectando...';
        $('btn-login').disabled = true;
        const result = await window.api.login(session.email, session.password);
        if (result.success) {
            showMain(result.user);
            return;
        }
        // Session expired, show login
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
    const result = await window.api.login(email, password);

    if (result.success) {
        showMain(result.user);
    } else {
        $('login-error').textContent = result.error;
        $('btn-login').disabled = false;
        $('btn-login').textContent = 'Entrar';
    }
});

$('password').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });

function showMain(userEmail) {
    $('login-section').style.display = 'none';
    $('main-section').style.display = 'flex';
    $('user-email').textContent = userEmail;
    log('✅ Conectado — automação ativa');
    refreshQueue();
}

// ============================================================
// LOGOUT
// ============================================================
$('btn-logout').addEventListener('click', async () => {
    await window.api.logout();
    $('main-section').style.display = 'none';
    $('login-section').style.display = 'flex';
    $('email').value = '';
    $('password').value = '';
    $('login-error').textContent = '';
    $('btn-login').disabled = false;
    $('btn-login').textContent = 'Entrar';
    $('log').textContent = '';
});

// ============================================================
// REFRESH (debounce: 1 click per 5s)
// ============================================================
let refreshCooldown = false;
$('btn-refresh').addEventListener('click', async () => {
    if (refreshCooldown) return;
    refreshCooldown = true;
    $('btn-refresh').disabled = true;
    $('btn-refresh').style.opacity = '0.5';

    await window.api.refreshQueue();
    log('⚡ Verificação imediata');
    hideTimer();
    refreshQueue();

    setTimeout(() => {
        refreshCooldown = false;
        $('btn-refresh').disabled = false;
        $('btn-refresh').style.opacity = '1';
    }, 5000);
});

async function refreshQueue() {
    const result = await window.api.fetchQueue();
    if (result.success) {
        $('queue-count').textContent = `${result.queue.length} pendentes`;
    }
}

// ============================================================
// TIMER
// ============================================================
function showTimer(display) {
    $('timer-row').style.display = 'flex';
    $('timer-text').textContent = typeof display === 'number' ? `${display}s` : display;
}

function hideTimer() {
    $('timer-row').style.display = 'none';
}

// ============================================================
// STATUS UPDATES (from main process)
// ============================================================
window.api.onStatus((status) => {
    if (status.type === 'filling') {
        setStatus('running', 'Preenchendo...');
        $('current-task').textContent = status.applicantName || '—';
        $('current-page').textContent = status.page || '—';
        hideTimer();
    } else if (status.type === 'done') {
        $('current-task').textContent = '—';
        $('current-page').textContent = '—';
        log(`✅ ${status.applicantName} concluído`);
        refreshQueue();
    } else if (status.type === 'error') {
        log(`❌ ${status.applicantName} — ${status.error}`);
    } else if (status.type === 'queue-empty') {
        setStatus('idle', 'Aguardando novos itens');
        $('queue-count').textContent = '0 pendentes';
        $('current-task').textContent = '—';
        $('current-page').textContent = '—';
        if (status.nextCheck) showTimer(status.nextCheck);
    } else if (status.type === 'waiting') {
        const display = status.display || `${status.countdown}s`;
        showTimer(display);
    } else if (status.type === 'checking') {
        setStatus('running', 'Verificando fila...');
        hideTimer();
    } else if (status.type === 'retrying') {
        setStatus('running', `Retentativa ${status.retryNumber}/${3}...`);
        log(`🔄 ${status.applicantName} — tentativa ${status.retryNumber}, aguardando ${Math.round(status.delay / 60)}min`);
    } else if (status.type === 'paused') {
        setStatus('error', 'Pausado — muitos erros');
        log(`⚠️ ${status.message}`);
    }
});

// ============================================================
// HELPERS
// ============================================================
function setStatus(state, text) {
    const dotClass = { running: 'dot-yellow', idle: 'dot-green', stopped: 'dot-gray', error: 'dot-red' }[state] || 'dot-gray';
    $('status-text').innerHTML = `<span class="dot ${dotClass}"></span>${text}`;
}

function log(msg) {
    const el = $('log');
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    el.textContent = `[${time}] ${msg}\n` + el.textContent;
}

// ============================================================
// FORCE UPDATE & RESTART
// ============================================================
$('btn-update').addEventListener('click', async () => {
    $('btn-update').disabled = true;
    $('btn-update').textContent = '⏳ Atualizando...';
    log('🔄 Forçando atualização e reinício...');

    const result = await window.api.forceUpdateRestart();
    if (result && !result.success) {
        log(`❌ Falha: ${result.error}`);
        $('btn-update').disabled = false;
        $('btn-update').textContent = '🔄 Fechar e Atualizar';
    }
    // If success, app will restart — no need to reset button
});

// ============================================================
// AUTO-UPDATE NOTIFICATIONS
// ============================================================
window.api.onUpdate((status) => {
    if (status.type === 'checking') {
        log('🔍 Verificando atualizações...');
    } else if (status.type === 'available') {
        log(`🔄 Atualização v${status.version} encontrada, baixando...`);
    } else if (status.type === 'progress') {
        if (status.percent % 25 === 0) {
            log(`⬇ Baixando atualização: ${status.percent}%`);
        }
    } else if (status.type === 'downloaded') {
        log(`✅ v${status.version} pronta! Reiniciando automaticamente em 3s...`);
    }
});
