// ============================================================
// DS-160 IA — Dashboard Pipeline Kanban
// ============================================================

const SB_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const sb = supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let isMaster = false;
let userCompanyId = null;
let userCompanyShortId = null;
let currentPage = 1;
let searchQuery = '';
const PAGE_SIZE = 15;

// Archived view state
let archivedPage = 1;
let archivedSearch = '';

const STAGES = {
    new: { label: 'Novo', color: '#3b82f6' },
    review: { label: 'Revisão', color: '#f59e0b' },
    approved: { label: 'Aprovado', color: '#8b5cf6' },
    doing: { label: 'Pendente', color: '#f97316' },
    done: { label: 'Concluído', color: '#22c55e' },
    archived: { label: 'Arquivado', color: '#64748b' }
};

const STAGE_ORDER = ['new', 'review', 'approved', 'doing', 'done', 'archived'];

const FILL_STAGES = {
    pending: { label: 'Aguardando', color: '#6b7280' },
    filling: { label: 'Preenchendo', color: '#3b82f6' },
    filled: { label: 'Preenchido', color: '#22c55e' },
    error: { label: 'Erro', color: '#ef4444' },
    needs_attention: { label: 'Atenção', color: '#f59e0b' },
};

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ============================================================
// AUTH
// ============================================================
async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        await setupApp();
    }
}

$('btn-login').onclick = async () => {
    const email = $('login-email').value.trim();
    const pass = $('login-password').value;
    $('login-error').textContent = '';
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) { $('login-error').textContent = error.message; return; }
    currentUser = data.user;
    await setupApp();
};

$('btn-logout').onclick = async () => {
    await sb.auth.signOut();
    location.reload();
};

async function setupApp() {
    $('auth-screen').style.display = 'none';
    $('app-screen').style.display = 'block';
    $('user-email').textContent = currentUser.email;

    const { data: masterData } = await sb.rpc('is_master');
    isMaster = !!masterData;
    $('user-role-display').textContent = isMaster ? 'MASTER' : 'MEMBRO';
    if (isMaster) $('nav-master').classList.remove('hidden');

    // Load user's company_id
    const { data: memberData } = await sb.from('members').select('company_id').eq('user_id', currentUser.id).single();
    if (memberData) {
        userCompanyId = memberData.company_id;
        // Load short_id
        const { data: companyData } = await sb.from('companies').select('short_id').eq('id', userCompanyId).single();
        if (companyData) userCompanyShortId = companyData.short_id;
    }

    loadPipeline();
}

// ============================================================
// NAVIGATION
// ============================================================
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById('view-' + viewId);
    if (view) view.classList.add('active');
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        showView(item.dataset.view);
        $('page-title').textContent = item.textContent.trim();
        $('page-subtitle').textContent = '';
        if (item.dataset.view === 'pipeline') loadPipeline();
        if (item.dataset.view === 'archived') loadArchived();
        if (item.dataset.view === 'errors') loadErrors();
        if (item.dataset.view === 'software') loadSoftwareInfo();
        if (item.dataset.view === 'master') {
            showMasterSub('agencies');
            loadAgencies();
            loadCapmonsterKey();
            loadLogs();
        }
    });
});



// Master Tabs
function showMasterSub(tabName) {
    document.querySelectorAll('.master-sub').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.master-tab').forEach(t => t.classList.remove('active'));
    const sub = document.getElementById('master-sub-' + tabName);
    if (sub) sub.classList.add('active');
    const tab = document.querySelector(`.master-tab[data-master-tab="${tabName}"]`);
    if (tab) tab.classList.add('active');
}

document.querySelectorAll('.master-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        showMasterSub(tab.dataset.masterTab);
    });
});

// Back from agency detail
$('btn-back-agencies').onclick = () => {
    showMasterSub('agencies');
};

// ============================================================
// SETTINGS — Load / Save default answers
// ============================================================
const SETTINGS_KEYS = ['security_question', 'security_answer'];

async function loadSettings() {
    const { data, error } = await sb.from('settings').select('key_name, key_value').in('key_name', SETTINGS_KEYS);
    if (error) { console.error('loadSettings error:', error); return; }
    (data || []).forEach(s => {
        if (s.key_name === 'security_question') {
            const el = $('setting-security-question');
            if (el) el.value = s.key_value || '4';
        }
        if (s.key_name === 'security_answer') {
            const el = $('setting-security-answer');
            if (el) el.value = s.key_value || '';
        }
    });
}

if ($('btn-save-settings')) {
    $('btn-save-settings').onclick = async () => {
        const question = $('setting-security-question')?.value || '4';
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

// Load settings when tab is opened
const origShowMasterSub = showMasterSub;
showMasterSub = function (tabName) {
    origShowMasterSub(tabName);
    if (tabName === 'settings') loadSettings();
};

// ============================================================
// PIPELINE — LOAD STATS + LIST
// ============================================================
async function loadPipeline() {
    // Stats: count by pipeline_status filtered by company
    let statsQuery = sb.from('applicants')
        .select('id, pipeline_status')
        .is('primary_applicant_id', null);
    if (userCompanyId) statsQuery = statsQuery.eq('company_id', userCompanyId);
    const { data: allApplicants } = await statsQuery;

    const counts = { new: 0, review: 0, approved: 0, doing: 0, done: 0 };
    (allApplicants || []).forEach(a => {
        if (counts[a.pipeline_status] !== undefined) counts[a.pipeline_status]++;
    });

    Object.keys(counts).forEach(k => {
        const el = $('stat-' + k);
        if (el) el.textContent = counts[k];
    });

    await loadPipelineList();
}

async function loadPipelineList() {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = sb.from('applicants')
        .select('id, full_name, data, passport_number, pipeline_status, updated_at')
        .is('primary_applicant_id', null)
        .neq('pipeline_status', 'archived');

    // Filter by organization only
    if (userCompanyId) query = query.eq('company_id', userCompanyId);

    if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,passport_number.ilike.%${searchQuery}%`);
    }

    query = query.order('updated_at', { ascending: false }).range(from, to);
    const { data: applicants, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    // Get dependent counts + completion for each primary
    const ids = (applicants || []).map(a => a.id);
    let dependentsMap = {};
    if (ids.length > 0) {
        const { data: deps } = await sb.from('applicants')
            .select('id, full_name, pipeline_status, primary_applicant_id')
            .in('primary_applicant_id', ids);
        (deps || []).forEach(d => {
            if (!dependentsMap[d.primary_applicant_id]) dependentsMap[d.primary_applicant_id] = [];
            dependentsMap[d.primary_applicant_id].push(d);
        });
    }

    // Render list
    const tbody = $('pipeline-list');
    tbody.innerHTML = (applicants || []).map(a => {
        const deps = dependentsMap[a.id] || [];
        const totalProcesses = 1 + deps.length;
        const doneProcesses = (a.pipeline_status === 'done' ? 1 : 0) +
            deps.filter(d => d.pipeline_status === 'done').length;
        const progressColor = doneProcesses === totalProcesses && totalProcesses > 0
            ? '#22c55e' : (doneProcesses > 0 ? '#f59e0b' : 'var(--text-muted)');

        const stage = STAGES[a.pipeline_status] || STAGES.new;
        const email = a.data?.addressPhone?.email || a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';

        return `<tr style="cursor:pointer" onclick="openApplicantDetail('${a.id}')">
            <td>
                <div style="font-weight:600">${a.full_name}</div>
                ${email ? `<div style="font-size:11px;color:var(--text-muted)">${email}</div>` : ''}
            </td>
            <td><span class="badge" style="background:${stage.color}22;color:${stage.color}">${stage.label}</span></td>
            <td>
                <span style="font-weight:700;font-size:15px;color:${progressColor}">${doneProcesses}/${totalProcesses}</span>
            </td>
            <td style="font-size:12px;color:var(--text-muted)">${updated}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted)">Nenhum solicitante nesta etapa</td></tr>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    $('app-prev').disabled = currentPage <= 1;
    $('app-next').disabled = !hasMore;
    $('app-page-info').textContent = `Página ${currentPage}`;
}

// ============================================================
// ARCHIVED VIEW
// ============================================================
async function loadArchived() {
    const from = (archivedPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = sb.from('applicants')
        .select('id, full_name, data, passport_number, pipeline_status, updated_at')
        .is('primary_applicant_id', null)
        .eq('pipeline_status', 'archived');

    // Filter by organization only
    if (userCompanyId) query = query.eq('company_id', userCompanyId);

    if (archivedSearch) {
        query = query.or(`full_name.ilike.%${archivedSearch}%,passport_number.ilike.%${archivedSearch}%`);
    }

    query = query.order('updated_at', { ascending: false }).range(from, to);
    const { data: applicants, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    const tbody = $('archived-list');
    tbody.innerHTML = (applicants || []).map(a => {
        const email = a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';
        return `<tr style="cursor:pointer" onclick="openApplicantDetail('${a.id}')">
            <td>
                <div style="font-weight:600">${a.full_name}</div>
                ${email ? `<div style="font-size:11px;color:var(--text-muted)">${email}</div>` : ''}
            </td>
            <td style="font-size:12px;color:var(--text-muted)">${a.passport_number || '—'}</td>
            <td style="font-size:12px;color:var(--text-muted)">${updated}</td>
            <td>
                <button class="btn-sm btn-view" onclick="event.stopPropagation();viewApplicantJson('${a.id}')" title="Ver JSON">Ver</button>
                <button class="btn-sm btn-queue" onclick="event.stopPropagation();movePipeline('${a.id}','new','${a.id}')" title="Restaurar">Restaurar</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted)">Nenhum solicitante arquivado</td></tr>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    $('arch-prev').disabled = archivedPage <= 1;
    $('arch-next').disabled = !hasMore;
    $('arch-page-info').textContent = `Página ${archivedPage}`;
}

// ============================================================
// PIPELINE CARDS — CLICK FILTER
// ============================================================
document.querySelectorAll('.pipeline-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.pipeline-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentFilter = card.dataset.filter;
        currentPage = 1;
        loadPipelineList();
    });
});

// ============================================================
// SEARCH + PAGINATION
// ============================================================
let searchTimeout;
$('search-applicants').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        loadPipelineList();
    }, 300);
});

$('app-prev').onclick = () => { if (currentPage > 1) { currentPage--; loadPipelineList(); } };
$('app-next').onclick = () => { currentPage++; loadPipelineList(); };

// Archived search + pagination
let archSearchTimeout;
const archSearch = $('search-archived');
if (archSearch) {
    archSearch.addEventListener('input', e => {
        clearTimeout(archSearchTimeout);
        archSearchTimeout = setTimeout(() => {
            archivedSearch = e.target.value.trim();
            archivedPage = 1;
            loadArchived();
        }, 300);
    });
}
const archPrev = $('arch-prev');
const archNext = $('arch-next');
if (archPrev) archPrev.onclick = () => { if (archivedPage > 1) { archivedPage--; loadArchived(); } };
if (archNext) archNext.onclick = () => { archivedPage++; loadArchived(); };

// ============================================================
// APPLICANT DETAIL — FULL PAGE
// ============================================================
async function openApplicantDetail(id) {
    // Fetch primary applicant
    const { data: applicant } = await sb.from('applicants').select('*').eq('id', id).single();
    if (!applicant) return;

    // Fetch dependents
    const { data: deps } = await sb.from('applicants').select('*').eq('primary_applicant_id', id);

    // Fetch applications for all
    const allIds = [id, ...(deps || []).map(d => d.id)];
    const { data: apps } = await sb.from('applications').select('*').in('applicant_id', allIds);
    const appsMap = {};
    (apps || []).forEach(a => {
        if (!appsMap[a.applicant_id]) appsMap[a.applicant_id] = [];
        appsMap[a.applicant_id].push(a);
    });

    // All processes
    const allProcesses = [applicant, ...(deps || [])];
    const doneCount = allProcesses.filter(p => p.pipeline_status === 'done').length;
    const totalCount = allProcesses.length;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    // Build header — compact, no redundancy
    const email = applicant.data?.addressPhone?.email || applicant.data?.personal?.email || '';
    const phone = applicant.data?.addressPhone?.phone || applicant.data?.contact?.phone || '';
    const passport = applicant.passport_number || '';

    // Info items — only show if they have values
    const infoItems = [email, phone, passport].filter(Boolean);

    let html = `
    <!-- Actions card -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:11px;color:var(--text-muted);font-weight:600">MOVER TODOS:</span>
                <select onchange="if(this.value){moveAllPipeline('${id}',this.value);this.value=''}" 
                    style="font-size:12px;padding:6px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;outline:none">
                    <option value="">Selecionar etapa...</option>
                    ${STAGE_ORDER.map(s => `<option value="${s}">${STAGES[s].label}</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
                <div style="text-align:right">
                    <span style="font-size:20px;font-weight:800;color:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : 'var(--text-muted)'}">${doneCount}/${totalCount}</span>
                    <span style="font-size:10px;color:var(--text-muted);margin-left:4px">concluídos</span>
                </div>
                <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
                    <div style="width:${progressPercent}%;height:100%;background:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : '#3b82f6'};border-radius:3px"></div>
                </div>
                <button onclick="showDeleteModal('${id}','${applicant.full_name.replace(/'/g, "\\\\'")}')" style="font-size:11px;padding:5px 12px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:5px;cursor:pointer">Excluir</button>
            </div>
        </div>
    </div>

    <!-- Processes list -->
    <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px;font-weight:600">Processos (${totalCount})</h3>
    <div style="display:grid;gap:10px">`;

    // Render each process card — compact
    allProcesses.forEach(p => {
        const isPrimary = !p.primary_applicant_id;
        const pStage = STAGES[p.pipeline_status] || STAGES.new;
        const pPassport = p.passport_number || '';
        const isDone = p.pipeline_status === 'done';
        const roleLabel = isPrimary ? 'Principal' : 'Dependente';

        // Application data
        const pApps = appsMap[p.id] || [];
        const pApp = pApps[0];
        const appId = pApp?.id ? pApp.id.substring(0, 8) : '';
        const fillStatus = pApp?.fill_status || '—';
        const fStage = FILL_STAGES[fillStatus] || { label: fillStatus, color: '#6b7280' };

        html += `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;${isDone ? 'opacity:.7;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="openProcessModal('${p.id}')">
                <div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-weight:700;font-size:14px">${p.full_name}</span>
                        ${appId ? `<span style="font-size:10px;color:var(--text-muted);background:var(--bg);padding:2px 6px;border-radius:4px;font-family:monospace">${appId}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                        <span style="font-size:11px;color:var(--text-muted)">${roleLabel}${pPassport ? ' · ' + pPassport : ''}</span>
                        ${fillStatus !== '—' ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${fStage.color}15;color:${fStage.color};font-weight:600">${fStage.label}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${pApp ? `<button onclick="event.stopPropagation();viewAppDetails('${p.id}')" style="font-size:10px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:5px;cursor:pointer;color:var(--text)">Detalhes</button>` : ''}
                    <select onclick="event.stopPropagation()" onchange="if(this.value){movePipeline('${p.id}',this.value,'${id}')}" 
                        style="font-size:11px;padding:5px 10px;background:${pStage.color}10;color:${pStage.color};border:1px solid ${pStage.color}30;border-radius:5px;cursor:pointer;outline:none;font-weight:600">
                        <option value="">${pStage.label}</option>
                        ${STAGE_ORDER.filter(s => s !== p.pipeline_status).map(s =>
            `<option value="${s}">${STAGES[s].label}</option>`
        ).join('')}
                    </select>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';

    $('applicant-detail-content').innerHTML = html;
    showView('applicant-detail');
    $('page-title').textContent = applicant.full_name;
    $('page-subtitle').textContent = email || '';
}

// ============================================================
// PROCESS MODAL (IFRAME - same form as user)
// ============================================================
async function openProcessModal(applicantId) {
    const { data: applicant } = await sb.from('applicants').select('full_name, pipeline_status').eq('id', applicantId).single();
    if (!applicant) return;

    const stage = STAGES[applicant.pipeline_status] || STAGES.new;
    $('process-modal-name').textContent = applicant.full_name;
    $('process-modal-sub').innerHTML = `<span style="background:${stage.color}18;color:${stage.color};padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600">${stage.label}</span>`;

    $('process-modal-iframe').src = `ds160/index.html?id=${applicantId}`;
    $('process-modal').style.display = 'flex';
}

function closeProcessModal() {
    $('process-modal').style.display = 'none';
    $('process-modal-iframe').src = 'about:blank';
}

// View Application Details Modal
async function viewAppDetails(applicantId) {
    const { data: applicant } = await sb.from('applicants').select('*').eq('id', applicantId).single();
    if (!applicant) return;
    const { data: apps } = await sb.from('applications').select('*').eq('applicant_id', applicantId).limit(1);
    const app = apps?.[0];

    const surname = (applicant.data?.personal1?.surname || applicant.full_name?.split(' ')[0] || '').toUpperCase();
    const surname5 = surname.substring(0, 5);
    const birthYear = applicant.data?.personal1?.dob?.year || '—';
    const securityAnswer = app?.security_answer || '—';
    const applicationId = app?.application_id || '—';
    const fillStatus = app?.fill_status || '—';
    const fillError = app?.fill_error || '';
    const fStage = FILL_STAGES[fillStatus] || { label: fillStatus, color: '#6b7280' };

    $('info-modal').classList.remove('hidden');
    $('modal-title').textContent = `Detalhes — ${applicant.full_name}`;
    $('modal-body').innerHTML = `
        <div style="display:grid;gap:12px;margin-bottom:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Application ID</div>
                    <div style="font-size:16px;font-weight:700;font-family:monospace;word-break:break-all">${applicationId}</div>
                </div>
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Security Answer</div>
                    <div style="font-size:16px;font-weight:700;font-family:monospace">${securityAnswer}</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Sobrenome (5)</div>
                    <div style="font-size:16px;font-weight:700">${surname5}</div>
                </div>
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Ano Nascimento</div>
                    <div style="font-size:16px;font-weight:700">${birthYear}</div>
                </div>
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px">
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Preenchimento</div>
                    <div style="font-size:14px;font-weight:700;color:${fStage.color}">${fStage.label}</div>
                </div>
            </div>
            ${fillError ? `<div style="background:#fef2f210;border:1px solid #ef444430;border-radius:8px;padding:12px">
                <div style="font-size:10px;color:#ef4444;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Último Erro</div>
                <div style="font-size:12px;color:var(--text)">${fillError}</div>
            </div>` : ''}
        </div>`;
}

// Listen for form-approved message from iframe
window.addEventListener('message', async (e) => {
    if (e.data?.type === 'form-approved') {
        closeProcessModal();
        // Refresh the view
        if (currentApplicant) {
            renderApplicantDetail(currentApplicant);
        } else {
            renderPipeline();
        }
    }
});


// ============================================================
// MOVE PIPELINE STATUS
// ============================================================
async function movePipeline(applicantId, newStatus, primaryId) {
    const { error } = await sb.from('applicants')
        .update({ pipeline_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicantId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(`Movido para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    // Reload the detail page
    openApplicantDetail(primaryId || applicantId);
    loadPipeline(); // Update counts in background
}

async function moveAllPipeline(primaryId, newStatus) {
    await sb.from('applicants')
        .update({ pipeline_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', primaryId);
    await sb.from('applicants')
        .update({ pipeline_status: newStatus, updated_at: new Date().toISOString() })
        .eq('primary_applicant_id', primaryId);
    toast(`Todos movidos para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    openApplicantDetail(primaryId);
    loadPipeline();
}

// ============================================================
// VIEW JSON (MODAL)
// ============================================================
async function viewApplicantJson(id) {
    const { data: applicant } = await sb.from('applicants').select('*').eq('id', id).single();
    if (!applicant) return;
    const { data: apps } = await sb.from('applications').select('*').eq('applicant_id', id).limit(1);

    $('info-modal').classList.remove('hidden');
    $('modal-title').textContent = applicant.full_name;

    const email = applicant.data?.personal?.email || applicant.data?.contact?.email || '—';
    const phone = applicant.data?.contact?.phone || applicant.data?.personal?.phone || '—';

    const combined = { ...applicant.data };
    if (apps && apps[0]?.form_data) combined._applicationFormData = apps[0].form_data;

    $('modal-body').innerHTML = `
        <div style="margin-bottom:16px">
            <div style="display:flex;gap:20px;margin-bottom:8px"><span style="color:var(--text-muted)">Email:</span> <span>${email}</span></div>
            <div style="display:flex;gap:20px"><span style="color:var(--text-muted)">Telefone:</span> <span>${phone}</span></div>
        </div>
        <pre style="font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px;max-height:400px;overflow:auto;white-space:pre-wrap">${JSON.stringify(combined, null, 2)}</pre>`;
}

$('modal-close')?.addEventListener('click', () => $('info-modal').classList.add('hidden'));
$('info-modal')?.addEventListener('click', e => {
    if (e.target === $('info-modal')) $('info-modal').classList.add('hidden');
});

// ============================================================
// DELETE APPLICANT
// ============================================================
let pendingDeleteId = null;
let pendingDeleteName = '';

function showDeleteModal(id, name) {
    pendingDeleteId = id;
    pendingDeleteName = name;
    $('delete-modal-name').textContent = name;
    $('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
    $('delete-modal').style.display = 'none';
    pendingDeleteId = null;
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    closeDeleteModal();
    const { data: deps } = await sb.from('applicants').select('id').eq('primary_applicant_id', id);
    const depIds = (deps || []).map(d => d.id);
    if (depIds.length > 0) await sb.from('applications').delete().in('applicant_id', depIds);
    await sb.from('applications').delete().eq('applicant_id', id);
    await sb.from('applicants').delete().eq('primary_applicant_id', id);
    const { error } = await sb.from('applicants').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Excluído com sucesso', 'success');
    showView('pipeline');
    $('page-title').textContent = 'Pipeline';
    $('page-subtitle').textContent = '';
    loadPipeline();
}

// ============================================================
// LOGS (Master only)
// ============================================================
async function loadLogs() {
    const { data } = await sb.from('error_logs').select('*').order('created_at', { ascending: false }).limit(50);
    const causeLabels = {
        browser_closed: 'Browser fechado', network_error: 'Internet', timeout: 'Timeout',
        field_error: 'Campo', 'field_error:select': 'Select vazio', 'field_error:missing': 'Dado ausente',
        captcha_failed: 'Captcha', validation_error: 'Validação DS-160', postback_stuck: 'Postback',
        page_stuck: 'Página travada', unknown: 'Desconhecido'
    };
    const causeBg = {
        browser_closed: '#7f1d1d', network_error: '#713f12', timeout: '#1e3a5f',
        field_error: '#4a1d7a', 'field_error:select': '#4a1d7a', 'field_error:missing': '#6b21a8',
        captcha_failed: '#92400e', validation_error: '#dc2626', postback_stuck: '#1e40af',
        page_stuck: '#374151', unknown: '#334155'
    };

    $('logs-list').innerHTML = (data || []).map((l, i) => `
        <tr style="cursor:pointer" onclick="document.getElementById('stack-${i}').style.display = document.getElementById('stack-${i}').style.display === 'none' ? 'table-row' : 'none'">
            <td style="font-size:12px;color:var(--text-muted)">${new Date(l.created_at).toLocaleString('pt-BR')}</td>
            <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;background:${causeBg[l.error_cause] || causeBg.unknown}">${causeLabels[l.error_cause] || l.error_cause || '—'}</span></td>
            <td style="font-size:12px">${l.page_name || '—'}</td>
            <td style="font-size:12px;color:#a78bfa">${l.field_name || '—'}</td>
            <td style="font-size:12px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.error_message || '—'}</td>
            <td style="text-align:center">${l.screenshot_url ? `<a href="${l.screenshot_url}" target="_blank" style="color:#60a5fa;text-decoration:underline;font-size:11px">📸 Ver</a>` : '—'}</td>
        </tr>
        <tr id="stack-${i}" style="display:none"><td colspan="6">
            ${l.validation_errors && l.validation_errors.length > 0 ? `<div style="margin-bottom:8px;padding:8px;background:#7f1d1d;border-radius:4px;font-size:12px"><strong>Erros do DS-160:</strong><ul style="margin:4px 0 0 16px">${l.validation_errors.map(v => `<li>${v}</li>`).join('')}</ul></div>` : ''}
            ${l.screenshot_url ? `<div style="margin-bottom:8px"><img src="${l.screenshot_url}" style="max-width:100%;max-height:300px;border-radius:4px;border:1px solid #333" onclick="window.open('${l.screenshot_url}','_blank')"></div>` : ''}
            <pre style="font-size:11px;color:var(--text-muted);white-space:pre-wrap;max-height:200px;overflow:auto;padding:8px;background:var(--bg);border-radius:4px">${l.error_stack || 'Sem stack trace'}</pre>
        </td></tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum log</td></tr>';
}

// ============================================================
// CAPMONSTER (Master only)
// ============================================================
async function loadCapmonsterKey() {
    const { data } = await sb.from('settings').select('key_value').eq('key_name', 'capmonster_key').single();
    if (data) $('capmonster-key').value = data.key_value || '';
}

const saveCapBtn = $('btn-save-capmonster');
if (saveCapBtn) {
    saveCapBtn.onclick = async () => {
        const val = $('capmonster-key').value.trim();
        const { error } = await sb.from('settings').upsert({ key_name: 'capmonster_key', key_value: val }, { onConflict: 'key_name' });
        if (error) { toast('Erro: ' + error.message, 'error'); return; }
        toast('API Key salva!', 'success');
    };
}

// ============================================================
// AGENCIES (Master only)
// ============================================================
async function loadAgencies() {
    const { data } = await sb.from('companies').select('*').order('name');
    $('agencies-list').innerHTML = (data || []).map(c => `
        <div onclick="openAgencyDetail('${c.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--surface-hover)'" onmouseout="this.style.background='transparent'">
            <div>
                <div style="font-weight:600;font-size:14px">${c.name}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${c.id}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:11px;padding:4px 10px;border-radius:6px;background:${c.active !== false ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'};color:${c.active !== false ? '#22c55e' : '#ef4444'}">
                    ${c.active !== false ? '✓ Ativa' : '✗ Inativa'}
                </span>
                <span style="color:var(--text-muted);font-size:14px">→</span>
            </div>
        </div>`).join('') || '<div style="padding:30px;text-align:center;color:var(--text-muted)">Nenhuma agência cadastrada</div>';
}

async function openAgencyDetail(companyId) {
    const { data: company } = await sb.from('companies').select('*').eq('id', companyId).single();
    if (!company) return;

    // Fetch members with email/name via view
    const { data: members } = await sb.from('members_view').select('*').eq('company_id', companyId);

    let memberDetails = (members || []).map(m => ({
        user_id: m.user_id,
        company_id: m.company_id,
        role: m.role,
        email: m.email || m.user_id,
        name: m.full_name || 'Assessor'
    }));

    let html = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
                <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">${company.name}</h2>
                <div style="font-size:11px;color:var(--text-muted)">ID: ${company.id}</div>
                ${company.cnpj ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">CNPJ: ${company.cnpj}</div>` : ''}
            </div>
            <button onclick="toggleCompany('${company.id}', ${!company.active})" 
                style="font-size:12px;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;background:${company.active !== false ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'};color:${company.active !== false ? '#22c55e' : '#ef4444'};border:1px solid ${company.active !== false ? '#22c55e44' : '#ef444444'}">
                ${company.active !== false ? '✓ Agência Ativa' : '✗ Agência Inativa'}
            </button>
            ${memberDetails.length === 0 ? `<button onclick="deleteCompany('${company.id}', '${company.name.replace(/'/g, "\\'")}')"
                style="font-size:12px;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid #ef444444;margin-left:8px">Excluir</button>` : ''}
        </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600">Assessores (${memberDetails.length})</h3>
        <button onclick="openAddAssessorModal('${companyId}')" style="font-size:12px;padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">+ Adicionar Assessor</button>
    </div>
    <div style="display:grid;gap:10px">`;

    if (memberDetails.length === 0) {
        html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:30px;text-align:center;color:var(--text-muted)">Nenhum assessor vinculado</div>';
    } else {
        memberDetails.forEach(m => {
            html += `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:12px">
                    <div style="width:38px;height:38px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700">${(m.name || 'A')[0].toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;font-size:14px">${m.name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${m.email}</div>
                    </div>
                </div>
                <span style="font-size:10px;padding:4px 10px;border-radius:6px;background:rgba(139,92,246,.15);color:#8b5cf6;font-weight:600;text-transform:uppercase">${m.role || 'membro'}</span>
            </div>`;
        });
    }

    html += '</div>';
    $('agency-detail-content').innerHTML = html;
    showMasterSub('agency-detail');
}

async function createAgency() {
    const btn = $('btn-create-agency');
    btn.disabled = true;
    btn.textContent = 'Criando...';
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
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar Organização';
    }
}

async function toggleCompany(id, active) {
    await sb.from('companies').update({ active }).eq('id', id);
    loadAgencies();
    openAgencyDetail(id);
}

async function deleteCompany(id, name) {
    const { data: members } = await sb.from('members').select('user_id').eq('company_id', id);
    if (members && members.length > 0) {
        toast('Não é possível excluir: existem ' + members.length + ' assessor(es) vinculado(s)', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir a organização "' + name + '"? Esta ação não pode ser desfeita.')) return;
    const { error } = await sb.from('companies').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Organização excluída!', 'success');
    showMasterSub('agencies');
    loadAgencies();
}

const createAgBtn = $('btn-create-agency');
if (createAgBtn) createAgBtn.onclick = createAgency;

// Add Assessor
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
            // Create user via Edge Function (admin API, no rate limit)
            const { data: { session } } = await sb.auth.getSession();
            const res = await fetch(SB_URL + '/functions/v1/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + session.access_token,
                    'apikey': SB_KEY,
                },
                body: JSON.stringify({
                    email,
                    password: pass,
                    full_name: name,
                    company_id: companyId,
                }),
            });

            const result = await res.json();
            if (!res.ok) {
                toast('Erro: ' + (result.error || 'Falha ao criar assessor'), 'error');
                return;
            }

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

function openAddAssessorModal(companyId) {
    $('assessor-company-id').value = companyId;
    $('assessor-name').value = '';
    $('assessor-email').value = '';
    $('assessor-password').value = '';
    $('modal-add-assessor').classList.remove('hidden');
}

// ============================================================
// COPY FORM LINK
// ============================================================
const copyBtn = $('btn-copy-form');
if (copyBtn) {
    copyBtn.onclick = () => {
        const base = location.href.replace(/dashboard\.html.*$/, '');
        const url = userCompanyShortId ? `${base}ds160/index.html?org=${userCompanyShortId}` : `${base}ds160/index.html`;
        navigator.clipboard.writeText(url);
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar link do formulário'; }, 2000);
    };
}

// ============================================================
// SOFTWARE PAGE — GitHub API + version.json
// ============================================================
const GH_OWNER = 'viniciussouzax';
const GH_REPO = 'visa';
const GH_BRANCH = 'main';

async function loadSoftwareInfo() {
    // 1) Fetch latest release from GitHub
    try {
        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.ok) {
            const release = await res.json();
            const version = release.tag_name || release.name || '—';
            const versionClean = version.replace(/^v/i, '');
            const releaseDate = release.published_at
                ? new Date(release.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                : '';
            const notes = release.body || '';

            // Find .exe asset
            const exeAsset = (release.assets || []).find(a => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'));

            $('sw-version').textContent = 'v' + versionClean;
            $('sw-version-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            $('sw-version-notes').textContent = notes.substring(0, 200);

            if (exeAsset) {
                $('sw-download-btn').href = exeAsset.browser_download_url;
                $('sw-download-version').textContent = 'v' + versionClean;
                const sizeMB = (exeAsset.size / (1024 * 1024)).toFixed(1);
                $('sw-download-size').textContent = sizeMB + ' MB';
                $('sw-download-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            } else {
                $('sw-download-btn').href = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest`;
                $('sw-download-version').textContent = 'v' + versionClean;
                $('sw-download-size').textContent = '';
                $('sw-download-date').textContent = releaseDate ? 'Publicado em ' + releaseDate : '';
            }
        } else {
            $('sw-version').textContent = '—';
            $('sw-version-date').textContent = 'Nenhum release publicado';
            $('sw-download-btn').href = `https://github.com/${GH_OWNER}/${GH_REPO}/releases`;
        }
    } catch (e) {
        console.warn('[Software] Erro ao buscar release:', e);
        $('sw-version').textContent = '—';
        $('sw-version-date').textContent = 'Erro ao carregar';
    }

    // 2) Fetch automation version from version.json
    try {
        const res = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}/ds160-filler/automation/version.json?t=${Date.now()}`);
        if (res.ok) {
            const ver = await res.json();
            $('sw-auto-version').textContent = 'v' + (ver.version || '—');
            $('sw-auto-date').textContent = ver.date ? 'Atualizado em ' + new Date(ver.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
            $('sw-auto-changelog').textContent = ver.changelog || '';
        } else {
            $('sw-auto-version').textContent = '—';
            $('sw-auto-date').textContent = 'Não encontrado';
        }
    } catch (e) {
        console.warn('[Software] Erro ao buscar version.json:', e);
        $('sw-auto-version').textContent = '—';
        $('sw-auto-date').textContent = 'Erro ao carregar';
    }
}

// ============================================================
// REFRESH
// ============================================================
$('btn-refresh').onclick = () => {
    // If on detail view, check if we have the detail open
    const detailView = $('view-applicant-detail');
    if (detailView.classList.contains('active')) {
        // Get the primary applicant id from the page
        const backBtn = $('btn-back-pipeline');
        // Just reload pipeline stats
        loadPipeline();
    } else {
        loadPipeline();
    }
    toast('Atualizado!', 'success');
};

// ============================================================
// ORG ID (Config)
// ============================================================
async function loadOrgId() {
    const { data } = await sb.from('members').select('company_id').eq('user_id', currentUser.id).single();
    if (data) {
        $('org-id-display').textContent = 'Org: ' + data.company_id.substring(0, 8) + '...';
        $('org-id-display').onclick = () => {
            navigator.clipboard.writeText(data.company_id);
            toast('ID copiado!', 'success');
        };
    }
}

// ============================================================
// ERROR LOGS — View & Archive
// ============================================================
async function loadErrors() {
    const tbody = $('errors-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Carregando...</td></tr>';

    const { data: errors, error } = await sb
        .from('error_logs')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444">Erro: ${error.message}</td></tr>`;
        return;
    }

    $('errors-count').textContent = `${errors.length} erro${errors.length !== 1 ? 's' : ''}`;

    if (!errors.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Nenhum erro registrado 🎉</td></tr>';
        return;
    }

    const causeLabels = {
        validation_error: { label: 'Validação', bg: 'rgba(245,158,11,.15)', color: '#f59e0b' },
        postback_stuck: { label: 'Postback', bg: 'rgba(239,68,68,.15)', color: '#ef4444' },
        browser_closed: { label: 'Browser', bg: 'rgba(107,114,128,.15)', color: '#6b7280' },
        timeout: { label: 'Timeout', bg: 'rgba(139,92,246,.15)', color: '#8b5cf6' },
        field_not_found: { label: 'Campo', bg: 'rgba(59,130,246,.15)', color: '#3b82f6' },
    };

    tbody.innerHTML = errors.map(e => {
        const dt = new Date(e.created_at);
        const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const cause = causeLabels[e.error_cause] || { label: e.error_cause || '—', bg: 'rgba(107,114,128,.15)', color: '#6b7280' };

        // Build validation errors list
        let fieldErrors = '—';
        if (e.validation_errors && e.validation_errors.length) {
            // De-duplicate and limit to 5
            const unique = [...new Set(e.validation_errors)];
            const shown = unique.slice(0, 5);
            fieldErrors = shown.map(v => `<div style="font-size:11px;color:var(--text-muted);margin:1px 0">• ${v}</div>`).join('');
            if (unique.length > 5) fieldErrors += `<div style="font-size:10px;color:var(--text-muted)">+${unique.length - 5} mais</div>`;
        } else if (e.field_name) {
            fieldErrors = `<div style="font-size:11px;color:var(--text-muted)">• ${e.field_name}</div>`;
        }

        const screenshot = e.screenshot_url
            ? `<a href="${e.screenshot_url}" target="_blank" style="color:var(--accent);font-size:12px;text-decoration:none">📸 Ver</a>`
            : '—';

        return `<tr>
            <td style="font-size:12px;white-space:nowrap">${dateStr}</td>
            <td style="font-size:12px;font-weight:600">${e.applicant_name || '—'}</td>
            <td><span style="font-size:11px;background:rgba(59,130,246,.1);color:var(--accent);padding:2px 8px;border-radius:10px">${e.page_name || '—'}</span></td>
            <td><span style="font-size:10px;padding:3px 8px;border-radius:10px;background:${cause.bg};color:${cause.color};font-weight:600;text-transform:uppercase">${cause.label}</span>${e.retry_number ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Retry #${e.retry_number}</div>` : ''}</td>
            <td style="max-width:250px">${fieldErrors}</td>
            <td>${screenshot}</td>
        </tr>`;
    }).join('');
}

async function archiveAllErrors() {
    if (!confirm('Arquivar todos os erros visíveis?')) return;
    const { error } = await sb
        .from('error_logs')
        .update({ archived: true })
        .eq('archived', false);

    if (error) {
        toast('Erro ao arquivar: ' + error.message, 'error');
    } else {
        toast('Erros arquivados', 'success');
        loadErrors();
    }
}

if ($('btn-archive-errors')) {
    $('btn-archive-errors').onclick = archiveAllErrors;
}

// ============================================================
// INIT
// ============================================================
init().then(() => { if (currentUser) loadOrgId(); });
