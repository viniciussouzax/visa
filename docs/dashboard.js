// ============================================================
// DS-160 IA — Dashboard Logic
// ============================================================

const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const PAGE_SIZE = 15;

// State
let currentUser = null;
let companyId = null;
let userRole = 'assessor';
let selectedApplicant = null;
let selectedMasterCompany = null;
let appPage = 0;
let appSearch = '';

const $ = id => document.getElementById(id);

// ============================================================
// AUTH
// ============================================================
$('btn-login').onclick = async () => {
    const email = $('login-email').value.trim();
    const pw = $('login-password').value;
    if (!email || !pw) { $('login-error').textContent = 'Preencha email e senha'; return; }
    $('btn-login').disabled = true;
    $('btn-login').textContent = 'Entrando...';
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) {
        $('login-error').textContent = error.message;
        $('btn-login').disabled = false;
        $('btn-login').textContent = 'Entrar';
        return;
    }
    currentUser = data.user;
    await initApp();
};

$('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-login').click(); });

$('btn-logout').onclick = async () => {
    await sb.auth.signOut();
    location.reload();
};

// Auto-login
sb.auth.getSession().then(({ data }) => {
    if (data.session) {
        currentUser = data.session.user;
        initApp();
    }
});

// ============================================================
// APP INIT
// ============================================================
async function initApp() {
    $('auth-screen').style.display = 'none';
    $('app-screen').style.display = 'block';
    $('user-email').textContent = currentUser.email;

    // Get company & role
    const { data: member } = await sb.from('members').select('company_id, role').eq('user_id', currentUser.id).single();
    if (member) {
        companyId = member.company_id;
        userRole = member.role;
    }

    // Check master
    const isMaster = userRole === 'master' || currentUser.email === 'bra920618@gmail.com';
    if (isMaster) {
        $('nav-master').classList.remove('hidden');
        userRole = 'master';
    }
    $('user-role-display').textContent = userRole.toUpperCase();

    // Short ID & form link
    if (companyId) {
        const { data: company } = await sb.from('companies').select('short_id').eq('id', companyId).single();
        const shortId = company?.short_id || companyId;
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
        const formUrl = baseUrl + '/ds160/?id=' + shortId;
        $('form-link').textContent = formUrl;
        $('form-link').onclick = () => { navigator.clipboard.writeText(formUrl); toast('Link copiado!', 'success'); };
        $('org-id-display').textContent = shortId;
        $('btn-copy-form').onclick = () => {
            navigator.clipboard.writeText(formUrl);
            const btn = $('btn-copy-form');
            btn.classList.add('copied');
            btn.textContent = '✅ Link copiado!';
            setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '📋 Copiar link do formulário'; }, 2000);
            toast('Link copiado!', 'success');
        };
    }

    loadDashboard();
}

// ============================================================
// NAVIGATION
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        item.classList.add('active');
        const viewId = 'view-' + item.dataset.view;
        $(viewId).classList.add('active');
        $('page-title').textContent = item.textContent.trim();

        if (item.dataset.view === 'dashboard') loadDashboard();
        if (item.dataset.view === 'applicants') loadApplicants();
        if (item.dataset.view === 'master') { loadMasterOrgs(); loadCapmonsterKey(); loadLogs(); }
    };
});

$('btn-refresh').onclick = () => {
    const active = document.querySelector('.nav-item.active')?.dataset.view;
    if (active === 'dashboard') loadDashboard();
    if (active === 'applicants') loadApplicants();
    if (active === 'master') { loadMasterOrgs(); loadCapmonsterKey(); loadLogs(); }
    toast('Dados atualizados', 'success');
};

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
    const { data: apps } = await sb.from('applications')
        .select('*, applicants(full_name, passport_number)')
        .order('created_at', { ascending: false });

    if (!apps) return;
    $('stat-total').textContent = apps.length;
    $('stat-queued').textContent = apps.filter(a => a.fill_status === 'queued').length;
    $('stat-filled').textContent = apps.filter(a => a.fill_status === 'filled').length;
    $('stat-errors').textContent = apps.filter(a => a.fill_status === 'error').length;

    $('dashboard-list').innerHTML = apps.map(a => `
        <tr>
            <td><strong>${a.applicants?.full_name || '—'}</strong></td>
            <td><span class="badge badge-${a.fill_status || 'draft'}">${a.fill_status || 'draft'}</span></td>
            <td style="font-size:11px;font-family:monospace;max-width:120px;overflow:hidden;text-overflow:ellipsis" title="${a.application_id || ''}">${a.application_id || '—'}</td>
            <td>${new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
                ${a.fill_status === 'draft' ? `<button class="btn-sm btn-queue" onclick="addToQueue('${a.id}')">📋 Fila</button>` : ''}
                ${a.fill_status === 'error' ? `<button class="btn-sm btn-queue" onclick="addToQueue('${a.id}')">🔄 Refazer</button>` : ''}
                ${a.fill_status === 'filled' && a.application_id ? `<button class="btn-sm btn-danger" onclick="clearAppId('${a.id}')">🗑 Limpar ID</button>` : ''}
                ${a.fill_status === 'filled' ? `<button class="btn-sm btn-queue" onclick="addToQueue('${a.id}')">🔄 Refazer</button>` : ''}
                ${['queued', 'filling'].includes(a.fill_status) ? `<button class="btn-sm btn-danger" onclick="removeFromQueue('${a.id}')">✖ Remover</button>` : ''}
                <button class="btn-sm btn-view" onclick="viewApplicationInfo('${a.id}')">👁</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Nenhuma aplicação encontrada</td></tr>';
}

// ============================================================
// APPLICANTS (with search, pagination, detail panel)
// ============================================================
let searchDebounce;
$('search-applicants').oninput = (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => { appPage = 0; appSearch = e.target.value.trim(); loadApplicants(); }, 400);
};
$('app-prev').onclick = () => { if (appPage > 0) { appPage--; loadApplicants(); } };
$('app-next').onclick = () => { appPage++; loadApplicants(); };

async function loadApplicants() {
    let query = sb.from('applicants')
        .select('*')
        .is('primary_applicant_id', null)
        .order('full_name')
        .range(appPage * PAGE_SIZE, (appPage + 1) * PAGE_SIZE - 1);

    if (companyId) query = query.eq('company_id', companyId);
    if (appSearch) query = query.or(`full_name.ilike.%${appSearch}%,passport_number.ilike.%${appSearch}%`);

    const { data } = await query;

    $('applicants-list').innerHTML = (data || []).map(a => {
        const email = a.data?.addressPhone?.email || a.data?.contact?.email || '';
        return `
        <tr onclick="selectApplicant('${a.id}')" style="cursor:pointer" id="row-${a.id}" class="${selectedApplicant?.id === a.id ? 'selected' : ''}">
            <td><strong>${a.full_name}</strong>${email ? `<br><span style="font-size:11px;color:var(--text-muted)">${email}</span>` : ''}</td>
            <td style="font-family:monospace;font-size:12px">${a.passport_number || '—'}</td>
            <td style="font-size:12px">${new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
            <td style="display:flex;gap:4px">
                <button class="btn-sm btn-view" onclick="event.stopPropagation();viewApplicantInfo('${a.id}')">👁</button>
                <button class="btn-sm btn-danger" onclick="event.stopPropagation();deleteApplicant('${a.id}','${a.full_name.replace(/'/g, "\\'")}')">🗑</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhum solicitante</td></tr>';

    $('app-page-info').textContent = `Página ${appPage + 1}`;
    $('app-prev').disabled = appPage === 0;
    $('app-next').disabled = !data || data.length < PAGE_SIZE;
}

// Select Applicant -> Load detail panel
async function selectApplicant(id) {
    // Highlight row
    document.querySelectorAll('#applicants-list tr').forEach(r => r.classList.remove('selected'));
    const row = $('row-' + id);
    if (row) row.classList.add('selected');

    // Fetch full data
    const { data: applicant } = await sb.from('applicants').select('*').eq('id', id).single();
    if (!applicant) return;
    selectedApplicant = applicant;

    // Show detail panel
    $('detail-panel').style.display = 'flex';

    // Name
    $('detail-name').textContent = applicant.full_name;

    // Info fields
    const email = applicant.data?.addressPhone?.email || applicant.data?.contact?.email || '—';
    const passport = applicant.passport_number || '—';
    $('detail-info').innerHTML = `
        <h4>Informações</h4>
        <div class="detail-field"><span class="label">Email</span><span>${email}</span></div>
        <div class="detail-field"><span class="label">Passaporte</span><span style="font-family:monospace">${passport}</span></div>
        <div class="detail-field"><span class="label">Criado em</span><span>${new Date(applicant.created_at).toLocaleDateString('pt-BR')}</span></div>
    `;

    // Load applications
    const { data: apps } = await sb.from('applications')
        .select('*')
        .eq('applicant_id', id)
        .order('created_at', { ascending: false });

    $('detail-applications').innerHTML = (apps || []).length > 0
        ? apps.map(a => `
            <div class="app-item" onclick="viewApplicationInfo('${a.id}')">
                <div>
                    <div style="font-family:monospace;font-size:12px;font-weight:600">${a.application_id || 'Sem ID'}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${new Date(a.created_at).toLocaleDateString('pt-BR')} · <span class="badge badge-${a.fill_status || 'draft'}" style="font-size:10px">${a.fill_status || 'draft'}</span></div>
                </div>
                <div style="display:flex;gap:4px">
                    ${a.fill_status === 'draft' ? `<button class="btn-sm btn-queue" onclick="event.stopPropagation();addToQueue('${a.id}')" style="font-size:10px;padding:4px 8px">📋 Fila</button>` : ''}
                    ${a.fill_status === 'error' ? `<button class="btn-sm btn-queue" onclick="event.stopPropagation();addToQueue('${a.id}')" style="font-size:10px;padding:4px 8px">🔄</button>` : ''}
                </div>
            </div>
        `).join('')
        : '<div style="padding:14px;color:var(--text-muted);font-size:13px;text-align:center">Nenhuma aplicação</div>';

    // Load dependents
    const { data: deps } = await sb.from('applicants')
        .select('*, applications(*)')
        .eq('primary_applicant_id', id);

    if (deps && deps.length > 0) {
        $('detail-dependents-section').style.display = 'block';
        $('detail-dependents').innerHTML = deps.map(d => {
            const depApps = d.applications || [];
            return `
                <div style="border-left:3px solid var(--border);padding-left:12px;margin-bottom:12px">
                    <div style="font-weight:600;font-size:13px;margin-bottom:4px">${d.full_name}</div>
                    ${depApps.length > 0 ? depApps.map(a => `
                        <div class="app-item" style="padding:6px 0;border:none" onclick="viewApplicationInfo('${a.id}')">
                            <span style="font-family:monospace;font-size:11px">${a.application_id || 'Sem ID'}</span>
                            <span class="badge badge-${a.fill_status || 'draft'}" style="font-size:10px">${a.fill_status || 'draft'}</span>
                        </div>
                    `).join('') : '<div style="font-size:11px;color:var(--text-muted);font-style:italic">Sem aplicações</div>'}
                </div>
            `;
        }).join('');
    } else {
        $('detail-dependents-section').style.display = 'none';
    }
}

// View full applicant info in modal
async function viewApplicantInfo(id) {
    const { data: a } = await sb.from('applicants').select('*').eq('id', id).single();
    if (!a) return;
    $('modal-title').textContent = a.full_name;
    const d = a.data || {};
    const fields = [
        ['Passaporte', a.passport_number],
        ['Email', d.addressPhone?.email || d.contact?.email],
        ['Telefone', d.addressPhone?.phone],
        ['Nacionalidade', d.personal?.nationality || d.personalInfo?.nationality],
        ['Data Nasc.', d.personal?.birthDate || d.personalInfo?.birthDate],
        ['Gênero', d.personal?.gender || d.personalInfo?.gender],
        ['Estado Civil', d.personal?.maritalStatus || d.personalInfo?.maritalStatus],
        ['Endereço', d.addressPhone?.street || d.address?.street],
        ['Cidade', d.addressPhone?.city || d.address?.city],
        ['País', d.addressPhone?.country || d.address?.country],
        ['Ocupação', d.workEducation?.occupation || d.work?.occupation],
        ['Empregador', d.workEducation?.employer || d.work?.employer],
    ];
    $('modal-body').innerHTML = `
        <div class="modal-info-grid">
            ${fields.filter(f => f[1]).map(f => `
                <div class="modal-info-item">
                    <div class="label">${f[0]}</div>
                    <div class="value">${f[1]}</div>
                </div>
            `).join('')}
        </div>
        <div style="margin-top:16px">
            <h4 style="font-size:12px;color:var(--text-muted);margin-bottom:8px">DADOS BRUTOS (JSON)</h4>
            <pre style="background:var(--bg);padding:12px;border-radius:8px;font-size:11px;max-height:200px;overflow:auto;color:var(--text-muted)">${JSON.stringify(d, null, 2)}</pre>
        </div>
    `;
    $('info-modal').classList.remove('hidden');
}

// View application info in modal
async function viewApplicationInfo(id) {
    const { data: a } = await sb.from('applications').select('*, applicants(full_name, passport_number)').eq('id', id).single();
    if (!a) return;
    $('modal-title').textContent = `Aplicação — ${a.applicants?.full_name || 'N/A'}`;
    const fields = [
        ['Application ID', a.application_id || '—'],
        ['Solicitante', a.applicants?.full_name],
        ['Passaporte', a.applicants?.passport_number],
        ['Status Geral', a.status],
        ['Fill Status', a.fill_status],
        ['Fill Priority', a.fill_priority],
        ['Página Atual', a.current_page || a.last_page],
        ['Worker ID', a.fill_worker_id],
        ['Security Answer', a.security_answer],
        ['Criado em', a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '—'],
        ['Na Fila desde', a.fill_queued_at ? new Date(a.fill_queued_at).toLocaleString('pt-BR') : '—'],
        ['Iniciado em', a.fill_started_at ? new Date(a.fill_started_at).toLocaleString('pt-BR') : '—'],
        ['Finalizado em', a.fill_finished_at ? new Date(a.fill_finished_at).toLocaleString('pt-BR') : '—'],
        ['Retry Count', a.retry_count],
        ['Último Erro', a.fill_error],
    ];
    $('modal-body').innerHTML = `
        <div class="modal-info-grid">
            ${fields.filter(f => f[1] !== null && f[1] !== undefined).map(f => `
                <div class="modal-info-item">
                    <div class="label">${f[0]}</div>
                    <div class="value">${f[1]}</div>
                </div>
            `).join('')}
        </div>
    `;
    $('info-modal').classList.remove('hidden');
}

// Delete Applicant
async function deleteApplicant(id, name) {
    if (!confirm(`⚠️ ATENÇÃO!\n\nTem certeza que deseja EXCLUIR o solicitante "${name}" e TODAS as suas aplicações?\n\nEsta ação não pode ser desfeita.`)) return;
    // Delete applications first
    await sb.from('applications').delete().eq('applicant_id', id);
    // Delete dependents' applications
    const { data: deps } = await sb.from('applicants').select('id').eq('primary_applicant_id', id);
    if (deps) {
        for (const d of deps) {
            await sb.from('applications').delete().eq('applicant_id', d.id);
        }
    }
    // Delete dependents
    await sb.from('applicants').delete().eq('primary_applicant_id', id);
    // Delete applicant
    const { error } = await sb.from('applicants').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Solicitante excluído com sucesso', 'success');
    selectedApplicant = null;
    $('detail-panel').style.display = 'none';
    loadApplicants();
}

// Create new application for selected applicant
$('btn-new-application').onclick = async () => {
    if (!selectedApplicant) { toast('Selecione um solicitante primeiro', 'error'); return; }
    if (!confirm(`Criar nova aplicação DS-160 para ${selectedApplicant.full_name}?`)) return;
    const { error } = await sb.from('applications').insert({
        applicant_id: selectedApplicant.id,
        status: 'pending',
        fill_status: 'draft'
    });
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Aplicação criada!', 'success');
    selectApplicant(selectedApplicant.id);
    loadDashboard();
};

$('btn-create-app').onclick = () => {
    if (!selectedApplicant) { toast('Selecione um solicitante primeiro na lista', 'error'); return; }
    $('btn-new-application').click();
};

$('btn-view-full').onclick = () => {
    if (selectedApplicant) viewApplicantInfo(selectedApplicant.id);
};

$('btn-delete-applicant').onclick = () => {
    if (selectedApplicant) deleteApplicant(selectedApplicant.id, selectedApplicant.full_name);
};



// ============================================================
// LOGS
// ============================================================
async function loadLogs() {
    const { data } = await sb.from('error_logs').select('*').order('created_at', { ascending: false }).limit(50);
    const causeLabels = { browser_closed: '🔴 Browser fechado', network_error: '🌐 Internet', timeout: '⏱ Timeout', field_error: '📝 Campo', unknown: '❓ Desconhecido' };
    const causeBg = { browser_closed: '#7f1d1d', network_error: '#713f12', timeout: '#1e3a5f', field_error: '#4a1d7a', unknown: '#334155' };

    $('logs-list').innerHTML = (data || []).map((l, i) => `
        <tr style="cursor:pointer" onclick="document.getElementById('stack-${i}').style.display = document.getElementById('stack-${i}').style.display === 'none' ? 'table-row' : 'none'">
            <td style="font-size:11px;white-space:nowrap">${new Date(l.created_at).toLocaleString('pt-BR')}</td>
            <td>${l.applicant_name || '—'}</td>
            <td><span class="badge badge-queued">${l.page_name || '—'}</span></td>
            <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis">${l.error_message || '—'}</td>
            <td><span style="background:${causeBg[l.error_cause] || causeBg.unknown};padding:2px 8px;border-radius:6px;font-size:11px">${causeLabels[l.error_cause] || causeLabels.unknown}</span></td>
            <td>${l.retry_number || '—'}</td>
            <td style="font-size:11px;color:#888">${l.software_version || '—'}</td>
        </tr>
        <tr id="stack-${i}" style="display:none">
            <td colspan="7" style="background:#0f172a;padding:12px">
                ${l.field_name ? '<strong style="color:#e94560">Campo:</strong> ' + l.field_name + '<br><br>' : ''}
                <pre style="font-size:11px;color:#94a3b8;white-space:pre-wrap;margin:0;max-height:200px;overflow-y:auto">${l.error_stack || 'Sem stack trace'}</pre>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Nenhum erro registrado 🎉</td></tr>';
}

// ============================================================
// ACTIONS (Queue management)
// ============================================================
async function addToQueue(appId) {
    const { error } = await sb.from('applications').update({
        fill_status: 'queued', fill_priority: 3, fill_queued_at: new Date().toISOString(),
        fill_error: null, fill_started_at: null, fill_finished_at: null, fill_worker_id: null
    }).eq('id', appId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Adicionado à fila!', 'success');
    loadDashboard();
}

async function clearAppId(appId) {
    if (!confirm('Tem certeza que deseja limpar o Application ID? Isso permitirá refazer o preenchimento.')) return;
    const { error } = await sb.from('applications').update({
        application_id: null, fill_status: 'draft', fill_error: null,
        fill_started_at: null, fill_finished_at: null, fill_worker_id: null
    }).eq('id', appId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Application ID limpo!', 'success');
    loadDashboard();
}

async function removeFromQueue(appId) {
    if (!confirm('Remover esta aplicação da fila?')) return;
    const { error } = await sb.from('applications').update({
        fill_status: 'draft', fill_queued_at: null, fill_started_at: null,
        fill_finished_at: null, fill_worker_id: null, fill_error: null
    }).eq('id', appId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Removido da fila!', 'success');
    loadDashboard();
}

// ============================================================
// CAPMONSTER CONFIG
// ============================================================
async function loadCapmonsterKey() {
    const { data } = await sb.from('settings').select('key_value').eq('key_name', 'capmonster_key').single();
    if (data) $('capmonster-key').value = data.key_value;
}

$('btn-save-capmonster').onclick = async () => {
    const key = $('capmonster-key').value.trim();
    if (!key) { toast('Chave obrigatória', 'error'); return; }
    const { data: existing } = await sb.from('settings').select('id').eq('key_name', 'capmonster_key').single();
    let error;
    if (existing) {
        ({ error } = await sb.from('settings').update({ key_value: key }).eq('id', existing.id));
    } else {
        ({ error } = await sb.from('settings').insert({ key_name: 'capmonster_key', key_value: key }));
    }
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Configurações salvas!', 'success');
};

// ============================================================
// MASTER PANEL
// ============================================================
async function loadMasterOrgs() {
    const { data } = await sb.from('companies').select('*').order('name');
    $('master-orgs-list').innerHTML = (data || []).map(c => {
        const isActive = c.active !== false;
        return `
        <div class="app-item" onclick="selectMasterCompany('${c.id}')" id="org-${c.id}" style="${selectedMasterCompany?.id === c.id ? 'background:var(--surface-hover)' : ''}">
            <div>
                <div style="font-weight:600;${!isActive ? 'opacity:.5' : ''}">${c.name} ${!isActive ? '<span class="badge badge-draft">Inativa</span>' : ''}</div>
                <div style="font-size:11px;color:var(--text-muted)">${c.cnpj || 'Sem CNPJ'} · ${c.short_id || ''}</div>
            </div>
            <label class="switch" onclick="event.stopPropagation()">
                <input type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleCompany('${c.id}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>`;
    }).join('') || '<div style="padding:30px;text-align:center;color:var(--text-muted)">Nenhuma organização</div>';
}

async function toggleCompany(id, active) {
    const { error } = await sb.from('companies').update({ active }).eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(`Empresa ${active ? 'ativada' : 'desativada'}`, 'success');
    loadMasterOrgs();
}

async function selectMasterCompany(id) {
    const { data } = await sb.from('companies').select('*').eq('id', id).single();
    if (!data) return;
    selectedMasterCompany = data;
    $('invite-form-container').style.display = 'block';
    loadMasterOrgs(); // refresh highlight
    loadStaff(id);
}

async function loadStaff(companyId) {
    // Use RPC if available, otherwise manual join
    const { data } = await sb.rpc('get_company_members', { target_company_id: companyId });
    if (!data || data.length === 0) {
        // Fallback: direct query
        const { data: members } = await sb.from('members').select('user_id, role').eq('company_id', companyId);
        $('master-staff-list').innerHTML = (members || []).map(m => `
            <div class="app-item">
                <div>
                    <div style="font-family:monospace;font-size:12px">${m.user_id.substring(0, 8)}...</div>
                    <span class="badge badge-queued">${m.role}</span>
                </div>
                <button class="btn-sm btn-danger" onclick="removeMember('${m.user_id}', '${companyId}')">🗑</button>
            </div>
        `).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">Nenhum membro</div>';
        return;
    }

    $('master-staff-list').innerHTML = data.map(m => `
        <div class="app-item">
            <div>
                <div style="font-size:13px">${m.email || m.user_id.substring(0, 8)}</div>
                <span class="badge badge-queued">${m.role}</span>
            </div>
            <button class="btn-sm btn-danger" onclick="removeMember('${m.user_id}', '${companyId}')">🗑</button>
        </div>
    `).join('');
}

async function removeMember(userId, cId) {
    if (!confirm('Remover este membro da agência?')) return;
    const { error } = await sb.from('members').delete().eq('user_id', userId).eq('company_id', cId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Membro removido', 'success');
    loadStaff(cId);
}

$('btn-create-org').onclick = async () => {
    const name = $('new-org-name').value.trim();
    const cnpj = $('new-org-cnpj').value.trim();
    if (!name) { toast('Nome obrigatório', 'error'); return; }
    const { error } = await sb.from('companies').insert({ name, cnpj });
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Agência criada!', 'success');
    $('new-org-name').value = ''; $('new-org-cnpj').value = '';
    loadMasterOrgs();
};

$('btn-invite').onclick = async () => {
    const name = $('invite-name').value.trim();
    const email = $('invite-email').value.trim();
    const pass = $('invite-pass').value.trim();
    if (!name || !email || !pass) { toast('Preencha todos os campos', 'error'); return; }
    if (!selectedMasterCompany) { toast('Selecione uma agência primeiro', 'error'); return; }

    toast('Criando usuário...', 'success');
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${(await sb.auth.getSession()).data.session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password: pass, company_id: selectedMasterCompany.id, role: 'assessor' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');
        toast('Usuário criado!', 'success');
        $('invite-name').value = ''; $('invite-email').value = ''; $('invite-pass').value = '';
        loadStaff(selectedMasterCompany.id);
    } catch (e) {
        toast('Erro: ' + e.message, 'error');
    }
};

// ============================================================
// HELPERS
// ============================================================
function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}
