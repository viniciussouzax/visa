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
    new: { label: '📥 Novos', color: '#3b82f6' },
    review: { label: '🔍 Revisão', color: '#f59e0b' },
    todo: { label: '📋 A Fazer', color: '#8b5cf6' },
    filling: { label: '⚙️ Fazendo', color: '#f97316' },
    done: { label: '✅ Feito', color: '#22c55e' },
    archived: { label: '📦 Arquivado', color: '#64748b' }
};

const STAGE_ORDER = ['new', 'review', 'todo', 'filling', 'done', 'archived'];

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
        if (item.dataset.view === 'pipeline') loadPipeline();
        if (item.dataset.view === 'archived') loadArchived();
        if (item.dataset.view === 'master') {
            showMasterSub('agencies');
            loadAgencies();
            loadCapmonsterKey();
            loadLogs();
        }
    });
});

// Back button from detail view
$('btn-back-pipeline').onclick = () => {
    showView('pipeline');
    $('page-title').textContent = '📊 Pipeline';
};

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
// PIPELINE — LOAD STATS + LIST
// ============================================================
async function loadPipeline() {
    // Stats: count by pipeline_status filtered by company
    let statsQuery = sb.from('applicants')
        .select('id, pipeline_status')
        .is('primary_applicant_id', null);
    if (userCompanyId) statsQuery = statsQuery.eq('company_id', userCompanyId);
    const { data: allApplicants } = await statsQuery;

    const counts = { new: 0, review: 0, todo: 0, filling: 0, done: 0 };
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
        const email = a.data?.personal?.email || a.data?.contact?.email || '';
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
            <td>
                <button class="btn-sm btn-view" onclick="event.stopPropagation();viewApplicantJson('${a.id}')" title="Ver JSON">👁</button>
                <button class="btn-sm btn-danger" onclick="event.stopPropagation();deleteApplicant('${a.id}','${a.full_name.replace(/'/g, "\\'")}')" title="Excluir">🗑</button>
            </td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Nenhum solicitante nesta etapa</td></tr>';

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
                <button class="btn-sm btn-view" onclick="event.stopPropagation();viewApplicantJson('${a.id}')" title="Ver JSON">👁</button>
                <button class="btn-sm btn-queue" onclick="event.stopPropagation();movePipeline('${a.id}','new','${a.id}')" title="Restaurar">↩️</button>
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

    // Build header
    const email = applicant.data?.personal?.email || applicant.data?.contact?.email || '—';
    const phone = applicant.data?.contact?.phone || applicant.data?.personal?.phone || '—';
    const stage = STAGES[applicant.pipeline_status] || STAGES.new;

    let html = `
    <!-- Header card -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
            <div>
                <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">${applicant.full_name}</h2>
                <div style="font-size:13px;color:var(--text-muted);display:flex;gap:16px;flex-wrap:wrap">
                    <span>📧 ${email}</span>
                    <span>📱 ${phone}</span>
                    <span>🛂 ${applicant.passport_number || 'Sem passaporte'}</span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px">
                <!-- Progress circle -->
                <div style="text-align:center">
                    <div style="font-size:28px;font-weight:800;color:${doneCount === totalCount ? '#22c55e' : '#f59e0b'}">${doneCount}/${totalCount}</div>
                    <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">concluídos</div>
                </div>
                <!-- Progress bar -->
                <div style="width:120px;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
                    <div style="width:${progressPercent}%;height:100%;background:${doneCount === totalCount ? '#22c55e' : '#f59e0b'};border-radius:4px;transition:width .3s"></div>
                </div>
            </div>
        </div>
        <!-- Move all actions -->
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--text-muted);font-weight:600">MOVER TODOS:</span>
            ${STAGE_ORDER.map(s =>
        `<button onclick="moveAllPipeline('${id}','${s}')" 
                    style="font-size:11px;padding:5px 12px;background:${STAGES[s].color}15;color:${STAGES[s].color};border:1px solid ${STAGES[s].color}33;border-radius:6px;cursor:pointer;font-weight:600;transition:all .15s"
                    onmouseover="this.style.background='${STAGES[s].color}30'" 
                    onmouseout="this.style.background='${STAGES[s].color}15'">${STAGES[s].label}</button>`
    ).join('')}
        </div>
        <!-- Actions -->
        <div style="margin-top:12px;display:flex;gap:8px">
            <button onclick="viewApplicantJson('${id}')" style="font-size:12px;padding:6px 14px;background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.3);border-radius:6px;cursor:pointer">👁 Ver JSON</button>
            <button onclick="deleteApplicant('${id}','${applicant.full_name.replace(/'/g, "\\'")}')" style="font-size:12px;padding:6px 14px;background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer">🗑 Excluir Todos</button>
        </div>
    </div>

    <!-- Processes list -->
    <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px;font-weight:600">Processos (${totalCount})</h3>
    <div style="display:grid;gap:12px">`;

    // Render each process card
    allProcesses.forEach(p => {
        const isPrimary = !p.primary_applicant_id;
        const pStage = STAGES[p.pipeline_status] || STAGES.new;
        const pApps = appsMap[p.id] || [];
        const appId = pApps.length > 0 ? (pApps[0].application_id || 'Sem ID') : 'Sem aplicação';
        const fillStatus = pApps.length > 0 ? pApps[0].fill_status : '—';
        const pEmail = p.data?.personal?.email || p.data?.contact?.email || '—';
        const isDone = p.pipeline_status === 'done';

        html += `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;border-left:4px solid ${pStage.color};transition:all .15s;${isDone ? 'opacity:.85' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:20px">${isPrimary ? '👤' : '👥'}</span>
                    <div>
                        <div style="font-weight:700;font-size:15px">${p.full_name}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${isPrimary ? 'Solicitante Principal' : 'Dependente'} · ${pEmail}</div>
                    </div>
                </div>
                <span class="badge" style="background:${pStage.color}22;color:${pStage.color};font-size:11px;padding:5px 14px">${pStage.label}</span>
            </div>
            <div style="display:flex;gap:20px;font-size:12px;color:var(--text-muted);margin-bottom:12px">
                <span>📋 App ID: <strong style="color:var(--text)">${appId}</strong></span>
                <span>📝 Fill: <strong style="color:var(--text)">${fillStatus}</strong></span>
                <span>🛂 Passaporte: <strong style="color:var(--text)">${p.passport_number || '—'}</strong></span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${STAGE_ORDER.filter(s => s !== p.pipeline_status).map(s =>
            `<button onclick="movePipeline('${p.id}','${s}','${id}')" 
                        style="font-size:10px;padding:4px 10px;background:${STAGES[s].color}15;color:${STAGES[s].color};border:1px solid ${STAGES[s].color}33;border-radius:5px;cursor:pointer;transition:all .15s"
                        onmouseover="this.style.background='${STAGES[s].color}30'" 
                        onmouseout="this.style.background='${STAGES[s].color}15'">${STAGES[s].label}</button>`
        ).join('')}
                <button onclick="viewApplicantJson('${p.id}')" 
                    style="font-size:10px;padding:4px 10px;background:rgba(59,130,246,.1);color:#3b82f6;border:1px solid rgba(59,130,246,.2);border-radius:5px;cursor:pointer">👁 JSON</button>
            </div>
        </div>`;
    });

    html += '</div>';

    $('applicant-detail-content').innerHTML = html;
    showView('applicant-detail');
    $('page-title').textContent = applicant.full_name;
}

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
async function deleteApplicant(id, name) {
    if (!confirm(`Excluir "${name}" e todos os dependentes/aplicações?`)) return;
    const { data: deps } = await sb.from('applicants').select('id').eq('primary_applicant_id', id);
    const depIds = (deps || []).map(d => d.id);
    if (depIds.length > 0) await sb.from('applications').delete().in('applicant_id', depIds);
    await sb.from('applications').delete().eq('applicant_id', id);
    await sb.from('applicants').delete().eq('primary_applicant_id', id);
    const { error } = await sb.from('applicants').delete().eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Excluído com sucesso', 'success');
    showView('pipeline');
    $('page-title').textContent = '📊 Pipeline';
    loadPipeline();
}

// ============================================================
// LOGS (Master only)
// ============================================================
async function loadLogs() {
    const { data } = await sb.from('error_logs').select('*').order('created_at', { ascending: false }).limit(50);
    const causeLabels = { browser_closed: '🔴 Browser fechado', network_error: '🌐 Internet', timeout: '⏱ Timeout', field_error: '📝 Campo', unknown: '❓ Desconhecido' };
    const causeBg = { browser_closed: '#7f1d1d', network_error: '#713f12', timeout: '#1e3a5f', field_error: '#4a1d7a', unknown: '#334155' };

    $('logs-list').innerHTML = (data || []).map((l, i) => `
        <tr style="cursor:pointer" onclick="document.getElementById('stack-${i}').style.display = document.getElementById('stack-${i}').style.display === 'none' ? 'table-row' : 'none'">
            <td style="font-size:12px;color:var(--text-muted)">${new Date(l.created_at).toLocaleString('pt-BR')}</td>
            <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;background:${causeBg[l.cause] || causeBg.unknown}">${causeLabels[l.cause] || l.cause}</span></td>
            <td style="font-size:12px">${l.page || '—'}</td>
            <td style="font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.message || '—'}</td>
        </tr>
        <tr id="stack-${i}" style="display:none"><td colspan="4"><pre style="font-size:11px;color:var(--text-muted);white-space:pre-wrap;max-height:200px;overflow:auto;padding:8px;background:var(--bg);border-radius:4px">${l.stack || 'Sem stack trace'}</pre></td></tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum log</td></tr>';
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
                style="font-size:12px;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid #ef444444;margin-left:8px">🗑 Excluir</button>` : ''}
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
        const base = location.href.replace(/dashboard\.html.*$/, 'ds160/');
        const url = userCompanyShortId ? `${base}?org=${userCompanyShortId}` : base;
        navigator.clipboard.writeText(url);
        copyBtn.textContent = '✅ Copiado!';
        setTimeout(() => { copyBtn.textContent = '📋 Copiar link do formulário'; }, 2000);
    };
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
// INIT
// ============================================================
init().then(() => { if (currentUser) loadOrgId(); });
