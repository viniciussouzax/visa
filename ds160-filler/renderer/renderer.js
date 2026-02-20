// Renderer logic for DS-160 Filler UI
const $ = id => document.getElementById(id);

let isRunning = false;

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
        $('login-section').style.display = 'none';
        $('main-section').style.display = 'flex';
        log(`✅ Logado como ${result.user}`);
        refreshQueue();
    } else {
        $('login-error').textContent = result.error;
        $('btn-login').disabled = false;
        $('btn-login').textContent = 'Entrar';
    }
});

// Enter key on password
$('password').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });

// ============================================================
// QUEUE & AUTOMATION
// ============================================================
$('btn-refresh').addEventListener('click', async () => {
    if (isRunning) {
        // Trigger immediate check + process
        await window.api.refreshQueue();
        log('⚡ Verificação imediata solicitada');
        hideTimer();
    } else {
        refreshQueue();
    }
});

$('btn-start').addEventListener('click', async () => {
    const result = await window.api.startAutomation();
    if (result.success) {
        isRunning = true;
        $('btn-start').style.display = 'none';
        $('btn-stop').style.display = 'block';
        setStatus('running', 'Processando fila...');
        log('▶ Automação iniciada');
    } else {
        log('❌ Erro: ' + result.error);
    }
});

$('btn-stop').addEventListener('click', async () => {
    await window.api.stopAutomation();
    isRunning = false;
    $('btn-start').style.display = 'none'; // show btn-row
    document.querySelector('.btn-row').style.display = 'flex';
    $('btn-stop').style.display = 'none';
    setStatus('stopped', 'Parado');
    hideTimer();
    log('⏹ Automação parada');
});

async function refreshQueue() {
    const result = await window.api.fetchQueue();
    if (result.success) {
        $('queue-count').textContent = `${result.queue.length} pendentes`;
        log(`↻ Fila atualizada: ${result.queue.length} itens`);
    } else {
        log('❌ Erro ao buscar fila: ' + result.error);
    }
}

// ============================================================
// TIMER
// ============================================================
function showTimer(seconds) {
    $('timer-row').style.display = 'flex';
    $('timer-text').textContent = `${seconds}s`;
}

function hideTimer() {
    $('timer-row').style.display = 'none';
    $('timer-text').textContent = '—';
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
        log(`❌ Erro: ${status.applicantName} — ${status.error}`);
    } else if (status.type === 'idle') {
        setStatus('idle', 'Aguardando fila...');
        $('current-task').textContent = '—';
        $('current-page').textContent = '—';
    } else if (status.type === 'queue-empty') {
        setStatus('idle', 'Fila vazia — aguardando');
        $('queue-count').textContent = '0 pendentes';
        if (status.nextCheck) showTimer(status.nextCheck);
    } else if (status.type === 'waiting') {
        showTimer(status.countdown);
    } else if (status.type === 'checking') {
        setStatus('running', 'Verificando fila...');
        hideTimer();
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
