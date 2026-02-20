import SUPABASE_CONFIG from './config.js';

// Função auxiliar para chamadas Supabase Auth
async function supabaseRequest(endpoint, body) {
    const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/${endpoint}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return response.json();
}

export async function login(email, password) {
    const data = await supabaseRequest('token?grant_type=password', {
        email,
        password
    });

    if (data.error) throw new Error(data.error_description || data.error);

    // Salva sessão localmente
    await chrome.storage.local.set({
        session: data,
        user: data.user
    });

    return data;
}

export async function logout() {
    await chrome.storage.local.remove(['session', 'user']);
}

export async function getSession() {
    const result = await chrome.storage.local.get(['session']);
    return result.session || null;
}
