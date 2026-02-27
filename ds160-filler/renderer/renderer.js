// Renderer logic for SENDS160 — Redesigned dark UI
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
// AUTO-LOGIN: Try saved session on load
// ============================================================
(async () => {
    const session = await window.api.getSavedSession();
    if (session && session.email && session.password) {
        $('email').value = session.email;
        $('password').value = session.password;
        $('remember').checked = true;
        $('btn-login').textContent = 'Conectando...';
        $('btn-login').disabled = true;
        const result = await window.api.login(session.email, session.password);
        if (result.success) {
            showMain(result.user);
            return;
        }
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
    const main = $('main-section');
    main.classList.remove('hidden');
    main.style.display = 'flex';
    $('user-email').textContent = userEmail;
    log('✅ Conectado — automação ativa');
    refreshQueue();
}

// ============================================================
// LOGOUT
// ============================================================
$('btn-logout').addEventListener('click', async () => {
    await window.api.logout();
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
// REFRESH
// ============================================================
let refreshCooldown = false;
$('btn-refresh').addEventListener('click', async () => {
    if (refreshCooldown) return;
    refreshCooldown = true;
    $('btn-refresh').disabled = true;

    await window.api.refreshQueue();
    log('⚡ Verificação imediata');
    hideTimer();
    refreshQueue();

    setTimeout(() => {
        refreshCooldown = false;
        $('btn-refresh').disabled = false;
    }, 5000);
});

async function refreshQueue() {
    try {
        const result = await window.api.fetchQueue();
        if (result.success && result.queue) {
            const count = result.queue.length;
            if (count > 0) {
                setCircle('running', `${count} pendente${count > 1 ? 's' : ''}`, 'Processando fila de preenchimento');
            }
        }
    } catch (e) { /* ignore */ }
}

// ============================================================
// TIMER
// ============================================================
function showTimer(display) {
    const row = $('timer-row');
    row.classList.add('visible');
    $('timer-text').textContent = typeof display === 'number' ? `${display}s` : display;
}

function hideTimer() {
    $('timer-row').classList.remove('visible');
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

// Backward compat
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
// STATUS UPDATES (from main process)
// ============================================================
window.api.onStatus((status) => {
    if (status.type === 'filling') {
        setCircle('running', 'Preenchendo...', status.applicantName || 'Processando formulário');
        hideTimer();
    } else if (status.type === 'done') {
        log(`✅ ${status.applicantName} concluído`);
        refreshQueue();
    } else if (status.type === 'error') {
        log(`❌ ${status.applicantName} — ${status.error}`);
    } else if (status.type === 'queue-empty') {
        setCircle('idle', 'Aguardando', 'Nenhum item na fila');
        if (status.nextCheck) showTimer(status.nextCheck);
    } else if (status.type === 'waiting') {
        const display = status.display || `${status.countdown}s`;
        showTimer(display);
    } else if (status.type === 'checking') {
        setCircle('running', 'Verificando fila...', 'Consultando novos itens');
        hideTimer();
    } else if (status.type === 'retrying') {
        setCircle('running', `Retentativa ${status.retryNumber}/3`, status.applicantName || '');
        log(`🔄 ${status.applicantName} — tentativa ${status.retryNumber}, aguardando ${Math.round(status.delay / 60)}min`);
    } else if (status.type === 'paused') {
        setCircle('error', 'Pausado', status.message || 'Muitos erros seguidos');
        log(`⚠️ ${status.message}`);
    }
});

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
    // Keep max 200 lines
    while (el.children.length > 200) el.removeChild(el.lastChild);
}

// ============================================================
// FORCE UPDATE & RESTART
// ============================================================
$('btn-update').addEventListener('click', async () => {
    $('btn-update').disabled = true;
    log('🔄 Forçando atualização e reinício...');

    const result = await window.api.forceUpdateRestart();
    if (result && !result.success) {
        log(`❌ Falha: ${result.error}`);
        $('btn-update').disabled = false;
    }
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
