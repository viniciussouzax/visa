import { login, logout, getSession } from './auth.js';

const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userInfo = document.getElementById('user-info');

// Inicialização: Verifica se já está logado
async function init() {
    const session = await getSession();
    if (session && session.user) {
        showApp(session.user);
    } else {
        showLogin();
    }
}

function showLogin() {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
}

function showApp(user) {
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    userInfo.innerText = `Logado como: ${user.email}`;
}

// Botão Login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Preencha todos os campos.");
        return;
    }

    try {
        const data = await login(email, password);
        // Redirect to Dashboard immediately (SPA behavior)
        chrome.tabs.create({ url: 'dashboard.html' });
        window.close(); // Close popup
    } catch (err) {
        alert("Erro no login: " + err.message);
    }
});

// Botão Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    showLogin();
});

init();
