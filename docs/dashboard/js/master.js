// ============================================================
// DS160 EXPRESSO — Master Page JS
// ============================================================

(async () => {
    try {
        const ok = await initAuth();
        if (!ok) { hideLoader(); return; }
        if (!isMaster) { hideLoader(); window.location.href = 'index.html'; return; }
        renderLayout();
        showSkeleton('agencies-list');
        showSkeleton('logs-list');
        await Promise.all([loadAgencies(), loadCapmonsterKey(), loadLogs()]);
        setupMasterListeners();
    } catch (e) {
        console.error('[Master] Init error:', e);
    } finally {
        hideLoader();
    }
})();

// ============================================================
// TABS
// ============================================================
function showMasterSub(tabName) {
    document.querySelectorAll('.master-sub').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.master-tab').forEach(t => t.classList.remove('active'));
    const sub = document.getElementById('master-sub-' + tabName);
    if (sub) sub.classList.add('active');
    const tab = document.querySelector(`.master-tab[data-master-tab="${tabName}"]`);
    if (tab) tab.classList.add('active');
    if (tabName === 'settings') loadSettings();
}

function setupMasterListeners() {
    document.querySelectorAll('.master-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            showMasterSub(tab.dataset.masterTab);
            if (tab.dataset.masterTab === 'logs') loadLogs();
        });
    });

    $('btn-back-agencies').onclick = () => showMasterSub('agencies');

    // CapMonster save
    const saveCapBtn = $('btn-save-capmonster');
    if (saveCapBtn) {
        saveCapBtn.onclick = async () => {
            const val = $('capmonster-key').value.trim();
            const { error } = await sb.from('settings').upsert({ key_name: 'capmonster_key', key_value: val }, { onConflict: 'key_name' });
            if (error) { toast('Erro: ' + error.message, 'error'); return; }
            toast('API Key salva!', 'success');
        };
    }

    // Settings save
    if ($('btn-save-settings')) {
        $('btn-save-settings').onclick = async () => {
            const question = $('setting-security-question')?.value || '0';
            const answer = $('setting-security-answer')?.value || '';
            const upserts = [
                { key_name: 'security_question', key_value: question, description: 'Índice da pergunta de segurança DS-160' },
                { key_name: 'security_answer', key_value: answer, description: 'Resposta padrão da pergunta de segurança' }
            ];
            const { error } = await sb.from('settings').upsert(upserts, { onConflict: 'key_name' });
            const status = $('settings-status');
            if (error) {
                status.textContent = '❌ Erro ao salvar: ' + error.message;
                status.style.color = 'var(--error)';
            } else {
                status.textContent = '✅ Configurações salvas com sucesso!';
                status.style.color = 'var(--success)';
            }
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 3000);
        };
    }

    // Archive all logs
    if ($('btn-archive-logs')) {
        $('btn-archive-logs').onclick = async () => {
            if (!confirm('Arquivar todos os erros?')) return;
            const { error } = await sb.from('error_logs').update({ archived: true }).eq('archived', false);
            if (error) toast('Erro: ' + error.message, 'error');
            else { toast('Erros arquivados', 'success'); loadLogs(); }
        };
    }

    // Create agency
    const createAgBtn = $('btn-create-agency');
    if (createAgBtn) createAgBtn.onclick = createAgency;

    // Add assessor
    const addAssessorBtn = $('btn-add-assessor');
    if (addAssessorBtn) {
        addAssessorBtn.onclick = async () => {
            const name = $('assessor-name').value.trim();
            const email = $('assessor-email').value.trim();
            const pass = $('assessor-password').value;
            const companyId = $('assessor-company-id').value;

            if (!name || !email || !pass) { toast('Preencha todos os campos', 'error'); return; }
            if (pass.length < 6) { toast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

            addAssessorBtn.disabled = true;
            addAssessorBtn.textContent = 'Adicionando...';
            try {
                const { data: { session } } = await sb.auth.getSession();
                const res = await fetch(SB_URL + '/functions/v1/create-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + session.access_token,
                        'apikey': SB_KEY,
                    },
                    body: JSON.stringify({ email, password: pass, full_name: name, company_id: companyId }),
                });
                const result = await res.json();
                if (!res.ok) { toast('Erro: ' + (result.error || 'Falha ao criar assessor'), 'error'); return; }

                $('assessor-name').value = '';
                $('assessor-email').value = '';
                $('assessor-password').value = '';
                $('modal-add-assessor').classList.add('hidden');
                toast('Assessor adicionado!', 'success');
                openAgencyDetail(companyId);
            } finally {
                addAssessorBtn.disabled = false;
                addAssessorBtn.textContent = 'Adicionar';
            }
        };
    }
}

// ============================================================
// SETTINGS
// ============================================================
const SETTINGS_KEYS = ['security_question', 'security_answer'];

async function loadSettings() {
    const { data, error } = await sb.from('settings').select('key_name, key_value').in('key_name', SETTINGS_KEYS);
    if (error) { console.error('loadSettings error:', error); return; }
    (data || []).forEach(s => {
        if (s.key_name === 'security_question') {
            const el = $('setting-security-question');
            if (el) el.value = s.key_value || '0';
        }
        if (s.key_name === 'security_answer') {
            const el = $('setting-security-answer');
            if (el) el.value = s.key_value || '';
        }
    });
}

// ============================================================
// AGENCIES
// ============================================================
async function loadAgencies() {
    const { data } = await sb.from('companies').select('*').order('name');
    $('agencies-list').innerHTML = (data || []).map(c => `
        <div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 hover:shadow-md transition">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <div class="flex items-start space-x-3 md:space-x-4 cursor-pointer" onclick="openAgencyDetail('${c.id}')">
                    <div class="w-9 h-9 shrink-0 mt-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-500">${(c.name || 'O')[0].toUpperCase()}</div>
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-100">${c.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 font-mono">${c.id.substring(0, 8)}...</div>
                    </div>
                </div>
                <div class="flex items-center space-x-4 pl-10 md:pl-0 shrink-0">
                    <span class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1 ${c.active !== false ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}">
                        ${c.active !== false ? '✓ Ativa' : '✗ Inativa'}
                    </span>
                    <div class="relative" x-data="{ open: false }">
                        <button @click.stop="open = !open" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                            <svg class="w-5 h-5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div x-show="open" @click.outside="open = false" x-transition class="origin-top-right absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg py-1 z-20" x-cloak>
                            <button onclick="openAgencyDetail('${c.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver detalhes</button>
                            <button onclick="toggleAgencyStatus('${c.id}', ${c.active !== false})" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm ${c.active !== false ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'}">${c.active !== false ? 'Desativar' : 'Ativar'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhuma organização cadastrada</div>';
}

async function toggleAgencyStatus(companyId, isCurrentlyActive) {
    const newStatus = !isCurrentlyActive;
    const { error } = await sb.from('companies').update({ active: newStatus }).eq('id', companyId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(newStatus ? 'Organização ativada' : 'Organização desativada');
    loadAgencies();
}

async function openAgencyDetail(companyId) {
    const { data: company } = await sb.from('companies').select('*').eq('id', companyId).single();
    if (!company) return;

    const { data: members } = await sb.from('members_view').select('*').eq('company_id', companyId);
    let memberDetails = (members || []).map(m => ({
        user_id: m.user_id, company_id: m.company_id, role: m.role,
        email: m.email || m.user_id, name: m.full_name || 'Assessor'
    }));

    let html = `
    <div class="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 mb-6">
        <div class="flex justify-between items-start">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                    <span class="text-lg font-bold text-violet-500">${(company.name || 'O')[0].toUpperCase()}</span>
                </div>
                <div>
                    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">${company.name}</h2>
                    <div class="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">ID: ${company.id}</div>
                    ${company.cnpj ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">CNPJ: ${company.cnpj}</div>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="toggleCompany('${company.id}', ${!company.active})"
                    class="text-xs font-semibold px-4 py-2 rounded-lg transition ${company.active !== false ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30'}">
                    ${company.active !== false ? '✓ Ativa' : '✗ Inativa'}
                </button>
                ${memberDetails.length === 0 ? `<button onclick="deleteCompany('${company.id}', '${company.name.replace(/'/g, "\\\\'")}')"
                    class="text-xs font-semibold px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/20">Excluir</button>` : ''}
            </div>
        </div>
    </div>

    <div class="flex justify-between items-center mb-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Assessores (${memberDetails.length})</h3>
        <button onclick="openAddAssessorModal('${companyId}')" class="btn-sm bg-violet-500 hover:bg-violet-600 text-white text-xs">+ Adicionar Assessor</button>
    </div>
    <div class="space-y-2">`;

    if (memberDetails.length === 0) {
        html += '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum assessor vinculado</div>';
    } else {
        memberDetails.forEach(m => {
            html += `
            <div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 hover:shadow-md transition">
                <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                    <div class="flex items-start space-x-3 md:space-x-4">
                        <div class="w-9 h-9 shrink-0 mt-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-500">${(m.name || 'A')[0].toUpperCase()}</div>
                        <div>
                            <div class="font-semibold text-gray-800 dark:text-gray-100">${m.name}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${m.email}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4 pl-10 md:pl-0 shrink-0">
                        <span class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 uppercase">${m.role || 'membro'}</span>
                        <div class="relative" x-data="{ open: false }">
                            <button @click.stop="open = !open" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                                <svg class="w-5 h-5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                            </button>
                            <div x-show="open" @click.outside="open = false" x-transition class="origin-top-right absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg py-1 z-20" x-cloak>
                                <button onclick="removeMember('${m.user_id}','${m.company_id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">Remover</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        });
    }

    html += '</div>';
    $('agency-detail-content').innerHTML = html;
    showMasterSub('agency-detail');
}

async function removeMember(userId, companyId) {
    if (!confirm('Remover este assessor?')) return;
    const { error } = await sb.from('members').delete().eq('user_id', userId).eq('company_id', companyId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Assessor removido');
    openAgencyDetail(companyId);
}

async function createAgency() {
    const btn = $('btn-create-agency');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
        const name = $('new-agency-name').value.trim();
        const cnpj = $('new-agency-cnpj').value.trim();
        const active = $('new-agency-active').checked;
        if (!name) { toast('Informe o nome', 'error'); return; }
        const { error } = await sb.from('companies').insert({ name, cnpj: cnpj || null, active });
        if (error) { toast('Erro: ' + error.message, 'error'); return; }
        $('new-agency-name').value = '';
        $('new-agency-cnpj').value = '';
        $('new-agency-active').checked = true;
        $('modal-create-agency').classList.add('hidden');
        toast('Organização criada!', 'success');
        loadAgencies();
    } finally { btn.disabled = false; btn.textContent = 'Criar Organização'; }
}

async function toggleCompany(id, active) {
    await sb.from('companies').update({ active }).eq('id', id);
    loadAgencies();
    openAgencyDetail(id);
}

async function deleteCompany(id, name) {
    const { data: members } = await sb.from('members').select('user_id').eq('company_id', id);
    if (members && members.length > 0) { toast('Não é possível excluir: existem ' + members.length + ' assessor(es) vinculado(s)', 'error'); return; }
    if (!confirm('Tem certeza que deseja excluir a organização "' + name + '"?')) return;
    const { error } = await sb.from('companies').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Organização excluída!', 'success');
    showMasterSub('agencies');
    loadAgencies();
}

function openAddAssessorModal(companyId) {
    $('assessor-company-id').value = companyId;
    $('assessor-name').value = '';
    $('assessor-email').value = '';
    $('assessor-password').value = '';
    $('modal-add-assessor').classList.remove('hidden');
}

// ============================================================
// CAPMONSTER
// ============================================================
async function loadCapmonsterKey() {
    const { data } = await sb.from('settings').select('key_value').eq('key_name', 'capmonster_key').single();
    if (data) $('capmonster-key').value = data.key_value || '';
}

// ============================================================
// LOGS
// ============================================================
async function archiveLog(id) {
    await sb.from('error_logs').update({ archived: true }).eq('id', id);
    loadLogs();
    toast('Erro arquivado');
}

async function loadLogs() {
    const { data, error: fetchErr } = await sb.from('error_logs').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(50);
    if (fetchErr) { $('logs-list').innerHTML = `<div class="text-sm text-red-500 px-4 py-3">${fetchErr.message}</div>`; return; }
    const causeLabels = {
        browser_closed: 'Browser fechado', network_error: 'Internet', timeout: 'Timeout',
        field_error: 'Campo', 'field_error:select': 'Select vazio', 'field_error:missing': 'Dado ausente',
        captcha_failed: 'Captcha', validation_error: 'Validação DS-160', postback_stuck: 'Postback',
        page_stuck: 'Página travada', unknown: 'Desconhecido'
    };
    const causeColors = {
        browser_closed: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        network_error: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
        timeout: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400',
        field_error: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
        'field_error:select': 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
        'field_error:missing': 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
        captcha_failed: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
        validation_error: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
        postback_stuck: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
        page_stuck: 'bg-gray-100 dark:bg-gray-600/30 text-gray-600 dark:text-gray-400',
        unknown: 'bg-gray-100 dark:bg-gray-600/30 text-gray-500 dark:text-gray-400'
    };

    const logs = data || [];
    if ($('logs-count')) $('logs-count').textContent = logs.length;
    if ($('logs-badge')) $('logs-badge').textContent = logs.length;

    $('logs-list').innerHTML = logs.map((l, i) => {
        const label = causeLabels[l.error_cause] || l.error_cause || '—';
        const colors = causeColors[l.error_cause] || causeColors.unknown;
        const dateStr = new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `<div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 hover:shadow-md transition">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <div class="flex items-start space-x-3 md:space-x-4 min-w-0">
                    <span class="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 mt-0.5 ${colors}">${label}</span>
                    <div class="min-w-0">
                        <div class="font-semibold text-gray-800 dark:text-gray-100 truncate">${l.page_name || '—'}${l.field_name ? ` <span class="text-xs font-mono text-violet-500">${l.field_name}</span>` : ''}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 truncate">${l.error_message || 'Sem mensagem'}</div>
                    </div>
                </div>
                <div class="flex items-center space-x-4 pl-10 md:pl-0 shrink-0">
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic whitespace-nowrap">${dateStr}</div>
                    <div class="relative" x-data="{ open: false }">
                        <button @click.stop="open = !open" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                            <svg class="w-5 h-5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div x-show="open" @click.outside="open = false" x-transition class="origin-top-right absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg py-1 z-20" x-cloak>
                            <button onclick="document.getElementById('log-body-${i}').classList.toggle('hidden')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver detalhes</button>
                            ${l.screenshot_url ? `<a href="${l.screenshot_url}" target="_blank" @click="open=false" class="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver screenshot</a>` : ''}
                            <button onclick="archiveLog('${l.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">Arquivar</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="log-body-${i}" class="hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60 space-y-3">
                ${l.validation_errors && l.validation_errors.length > 0 ? `<div class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3"><p class="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Erros do DS-160:</p><ul class="text-xs text-red-500 dark:text-red-400 list-disc ml-4 space-y-0.5">${l.validation_errors.map(v => `<li>${v}</li>`).join('')}</ul></div>` : ''}
                <pre class="text-[11px] text-gray-400 dark:text-gray-500 whitespace-pre-wrap max-h-40 overflow-auto p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg font-mono">${l.error_stack || 'Sem stack trace'}</pre>
            </div>
        </div>`;
    }).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum erro ativo 🎉</div>';
}
