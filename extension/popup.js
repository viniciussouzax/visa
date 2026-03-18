// Popup controller
const btnToggle = document.getElementById('btnToggle');
const btnSave = document.getElementById('btnSave');
const statusBox = document.getElementById('statusBox');
const taskInfo = document.getElementById('taskInfo');
const supaUrl = document.getElementById('supaUrl');
const supaKey = document.getElementById('supaKey');

// Load saved config
chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], (data) => {
    if (data.supabaseUrl) supaUrl.value = data.supabaseUrl;
    if (data.supabaseKey) supaKey.value = data.supabaseKey;
});

// Get current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (!res) return;
    updateUI(res);
});

// Toggle on/off
btnToggle.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE' }, (res) => {
        if (res) updateUI(res);
    });
});

// Save config
btnSave.addEventListener('click', () => {
    const url = supaUrl.value.trim();
    const key = supaKey.value.trim();
    if (!url || !key) return alert('Preencha URL e Key');

    chrome.runtime.sendMessage({
        type: 'SAVE_CONFIG',
        supabaseUrl: url,
        supabaseKey: key,
    }, (res) => {
        if (res?.ok) {
            btnSave.textContent = '✅ Salvo!';
            setTimeout(() => btnSave.textContent = '💾 Salvar Configuração', 2000);
        }
    });
});

function updateUI(state) {
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

    if (!state.configured) {
        statusBox.className = 'status err';
        statusBox.textContent = '⚠️ Configure o Supabase abaixo';
    }

    if (state.currentTask) {
        taskInfo.innerHTML = `📋 <strong>${state.currentTask.type.toUpperCase()}</strong>: ${state.currentTask.name}`;
    } else {
        taskInfo.textContent = '';
    }

    if (state.error) {
        statusBox.className = 'status err';
        statusBox.textContent = `❌ ${state.error}`;
    }
}
