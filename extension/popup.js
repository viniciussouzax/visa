// Popup controller — with Supabase Auth login
const loginSection = document.getElementById('loginSection');
const workerSection = document.getElementById('workerSection');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const btnToggle = document.getElementById('btnToggle');
const statusBox = document.getElementById('statusBox');
const taskInfo = document.getElementById('taskInfo');
const userInfo = document.getElementById('userInfo');
const loginError = document.getElementById('loginError');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

// Check auth state on open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (!res) return;
    if (res.user) {
        showWorkerSection(res);
    } else {
        showLoginSection();
    }
});

// Login
btnLogin.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
        loginError.textContent = 'Preencha email e senha';
        return;
    }
    
    loginError.textContent = '';
    btnLogin.textContent = '⏳ Entrando...';
    btnLogin.disabled = true;

    chrome.runtime.sendMessage({
        type: 'LOGIN',
        email,
        password,
    }, (res) => {
        btnLogin.textContent = '🔐 Entrar';
        btnLogin.disabled = false;

        if (res?.error) {
            loginError.textContent = res.error;
        } else if (res?.user) {
            showWorkerSection(res);
        }
    });
});

// Logout
btnLogout.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
        showLoginSection();
    });
});

// Toggle on/off
btnToggle.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE' }, (res) => {
        if (res) updateWorkerUI(res);
    });
});

// Enter key on password field
loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
});

function showLoginSection() {
    loginSection.classList.remove('hidden');
    workerSection.classList.add('hidden');
}

function showWorkerSection(state) {
    loginSection.classList.add('hidden');
    workerSection.classList.remove('hidden');
    
    if (state.user) {
        userInfo.textContent = `👤 ${state.user.email}`;
    }
    updateWorkerUI(state);
}

function updateWorkerUI(state) {
    if (state.isRunning) {
        statusBox.className = 'status on';
        statusBox.textContent = '🟢 Ligado — monitorando fila';
        btnToggle.textContent = '⏹ Desligar';
        btnToggle.className = 'btn-toggle running';
    } else {
        statusBox.className = 'status off';
        statusBox.textContent = '⏸ Desligado';
        btnToggle.textContent = '▶ Ligar';
        btnToggle.className = 'btn-toggle';
    }

    if (state.currentTask) {
        taskInfo.innerHTML = `📋 <strong>${state.currentTask.type?.toUpperCase()}</strong>: ${state.currentTask.name}`;
    } else {
        taskInfo.textContent = '';
    }

    if (state.error) {
        statusBox.className = 'status err';
        statusBox.textContent = `❌ ${state.error}`;
    }
}
