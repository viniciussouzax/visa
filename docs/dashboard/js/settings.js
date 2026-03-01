// ============================================================
// SENDS160 — Settings Page JS
// ============================================================

(async () => {
    try {
        const ok = await initAuth();
        if (!ok) { hideLoader(); return; }
        renderLayout();
        await Promise.all([loadOrgData(), loadMembers(), loadAutomationConfig(), loadSecuritySettings()]);
        setupSettingsListeners();
    } catch (e) {
        console.error('[Settings] Init error:', e);
    } finally {
        hideLoader();
    }
})();

// ============================================================
// TABS
// ============================================================
function showSettingsSub(tabName) {
    document.querySelectorAll('.settings-sub').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    const sub = document.getElementById('settings-sub-' + tabName);
    if (sub) { sub.style.display = 'block'; sub.classList.add('active'); }
    const tab = document.querySelector(`.settings-tab[data-settings-tab="${tabName}"]`);
    if (tab) tab.classList.add('active');
}

// ============================================================
// ORG DATA
// ============================================================
async function loadOrgData() {
    if (!userCompanyId) return;
    const { data } = await sb.from('companies').select('*').eq('id', userCompanyId).single();
    if (!data) return;
    const name = $('org-name');
    const cnpj = $('org-cnpj');
    const shortId = $('org-short-id');
    const active = $('org-active');
    if (name) name.value = data.name || '';
    if (cnpj) cnpj.value = data.cnpj || '';
    if (shortId) shortId.value = data.short_id || data.id.substring(0, 8);
    if (active) active.checked = data.active !== false;
}

// ============================================================
// MEMBERS
// ============================================================
async function loadMembers() {
    if (!userCompanyId) return;
    const el = $('members-list');
    if (!el) return;
    showSkeleton('members-list', 2);

    const { data: members } = await sb.from('members_view').select('*').eq('company_id', userCompanyId);
    if (!members || members.length === 0) {
        el.innerHTML = '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum membro encontrado</div>';
        return;
    }

    el.innerHTML = members.map(m => {
        const name = m.full_name || 'Membro';
        const email = m.email || m.user_id;
        const role = m.role || 'assessor';
        const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const isMasterRole = role === 'master';
        const roleBadge = isMasterRole
            ? '<span class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">Master</span>'
            : '<span class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">Assessor</span>';

        return `
        <div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 shrink-0 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-500">${initials}</div>
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-100 text-sm">${name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${email}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    ${roleBadge}
                    ${!isMasterRole && isMaster ? `<button onclick="removeMember('${m.user_id}')" class="text-xs text-red-500 hover:text-red-600 font-medium">Remover</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function removeMember(userId) {
    if (!confirm('Remover este membro da organização?')) return;
    const { error } = await sb.from('members').delete().eq('user_id', userId).eq('company_id', userCompanyId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Membro removido', 'success');
    loadMembers();
}

// ============================================================
// AUTOMATION CONFIG
// ============================================================
async function loadAutomationConfig() {
    // CapMonster key from settings
    const { data: settingsData } = await sb.from('settings').select('key_name, key_value').eq('key_name', 'capmonster_key');
    if (settingsData && settingsData.length) {
        const capEl = $('auto-capmonster-key');
        if (capEl) capEl.value = settingsData[0].key_value || '';
    }

    // Automation config
    const { data: config } = await sb.from('automation_config').select('*').limit(1).single();
    if (config) {
        const ver = $('auto-version');
        const mode = $('auto-captcha-mode');
        const updated = $('auto-updated-at');
        if (ver) ver.textContent = config.version || '—';
        if (mode) mode.textContent = config.captcha_mode || '—';
        if (updated) updated.textContent = config.updated_at ? new Date(config.updated_at).toLocaleString('pt-BR') : '—';
    }
}

// ============================================================
// SECURITY SETTINGS
// ============================================================
const SEC_KEYS = ['security_question', 'security_answer'];
async function loadSecuritySettings() {
    const { data } = await sb.from('settings').select('key_name, key_value').in('key_name', SEC_KEYS);
    (data || []).forEach(s => {
        if (s.key_name === 'security_question') {
            const el = $('sec-question');
            if (el) el.value = s.key_value || '0';
        }
        if (s.key_name === 'security_answer') {
            const el = $('sec-answer');
            if (el) el.value = s.key_value || '';
        }
    });
}

// ============================================================
// LISTENERS
// ============================================================
function setupSettingsListeners() {
    // Tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => showSettingsSub(tab.dataset.settingsTab));
    });

    // Save Org
    const saveOrgBtn = $('btn-save-org');
    if (saveOrgBtn) {
        saveOrgBtn.onclick = async () => {
            if (!userCompanyId) { toast('Organização não encontrada', 'error'); return; }
            const name = $('org-name')?.value.trim();
            const cnpj = $('org-cnpj')?.value.trim();
            const active = $('org-active')?.checked;
            if (!name) { toast('Nome é obrigatório', 'error'); return; }

            saveOrgBtn.disabled = true;
            saveOrgBtn.textContent = 'Salvando...';
            const { error } = await sb.from('companies').update({ name, cnpj: cnpj || null, active }).eq('id', userCompanyId);
            const status = $('org-save-status');
            if (error) {
                toast('Erro: ' + error.message, 'error');
                if (status) { status.textContent = '❌ Erro'; status.style.color = 'var(--error)'; status.style.display = 'inline'; }
            } else {
                toast('Organização atualizada!', 'success');
                if (status) { status.textContent = '✅ Salvo!'; status.style.color = 'var(--success)'; status.style.display = 'inline'; }
            }
            saveOrgBtn.disabled = false;
            saveOrgBtn.textContent = 'Salvar Alterações';
            if (status) setTimeout(() => { status.style.display = 'none'; }, 3000);
        };
    }

    // Save CapMonster
    const saveCapBtn = $('btn-save-capmonster');
    if (saveCapBtn) {
        saveCapBtn.onclick = async () => {
            const val = $('auto-capmonster-key')?.value.trim();
            const { error } = await sb.from('settings').upsert({ key_name: 'capmonster_key', key_value: val }, { onConflict: 'key_name' });
            const status = $('capmonster-save-status');
            if (error) {
                toast('Erro: ' + error.message, 'error');
            } else {
                toast('API Key salva!', 'success');
                if (status) { status.textContent = '✅ Salvo!'; status.style.color = 'var(--success)'; status.style.display = 'inline'; setTimeout(() => { status.style.display = 'none'; }, 3000); }
            }
        };
    }

    // Save Security
    const secBtn = $('btn-save-security');
    if (secBtn) {
        secBtn.onclick = async () => {
            const question = $('sec-question')?.value || '0';
            const answer = $('sec-answer')?.value || '';
            const upserts = [
                { key_name: 'security_question', key_value: question, description: 'Índice da pergunta de segurança DS-160' },
                { key_name: 'security_answer', key_value: answer, description: 'Resposta padrão da pergunta de segurança' }
            ];
            const { error } = await sb.from('settings').upsert(upserts, { onConflict: 'key_name' });
            const status = $('security-save-status');
            if (error) {
                toast('Erro: ' + error.message, 'error');
                if (status) { status.textContent = '❌ Erro'; status.style.color = 'var(--error)'; status.style.display = 'inline'; }
            } else {
                toast('Configurações de segurança salvas!', 'success');
                if (status) { status.textContent = '✅ Salvo!'; status.style.color = 'var(--success)'; status.style.display = 'inline'; }
            }
            if (status) setTimeout(() => { status.style.display = 'none'; }, 3000);
        };
    }

    // Add Member
    const addMemberBtn = $('btn-add-member');
    if (addMemberBtn) {
        addMemberBtn.onclick = async () => {
            const name = $('member-name')?.value.trim();
            const email = $('member-email')?.value.trim();
            const pass = $('member-password')?.value;
            if (!name || !email || !pass) { toast('Preencha todos os campos', 'error'); return; }
            if (pass.length < 6) { toast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

            addMemberBtn.disabled = true;
            addMemberBtn.textContent = 'Adicionando...';
            try {
                const { data: { session } } = await sb.auth.getSession();
                const res = await fetch(SB_URL + '/functions/v1/create-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + session.access_token,
                        'apikey': SB_KEY,
                    },
                    body: JSON.stringify({ email, password: pass, full_name: name, company_id: userCompanyId }),
                });
                const result = await res.json();
                if (!res.ok) { toast('Erro: ' + (result.error || 'Falha ao criar membro'), 'error'); return; }

                $('member-name').value = '';
                $('member-email').value = '';
                $('member-password').value = '';
                $('modal-add-member').classList.add('hidden');
                toast('Membro adicionado!', 'success');
                loadMembers();
            } finally {
                addMemberBtn.disabled = false;
                addMemberBtn.textContent = 'Adicionar';
            }
        };
    }
}
