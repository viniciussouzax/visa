// ============================================================
// DS160 EXPRESSO — Dashboard Pipeline Kanban
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
let currentFilter = '';
const PAGE_SIZE = 25;

// Archived view state
let archivedPage = 1;
let archivedSearch = '';

// View cache — avoids redundant fetches on tab switch
const viewLoaded = { pipeline: false, archived: false, software: false, master: false };

// Loading skeleton helper
function showSkeleton(containerId, count = 3) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = Array.from({ length: count }, () =>
        `<div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 animate-pulse">
            <div class="flex items-center space-x-4">
                <div class="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div class="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-1/2"></div>
                </div>
                <div class="h-5 bg-gray-100 dark:bg-gray-700/50 rounded-full w-16"></div>
            </div>
        </div>`
    ).join('');
}

const STAGES = {
    new: { label: 'Novo', color: '#3b82f6' },
    review: { label: 'Revisão', color: '#f59e0b' },
    approved: { label: 'Aprovado', color: '#6366f1' },
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

const PRIORITIES = {
    0: { label: '—', icon: '', color: '#6b7280' },
    1: { label: 'Normal', icon: '📋', color: '#3b82f6' },
    2: { label: 'Urgente', icon: '⚡', color: '#f97316' },
    3: { label: 'Emergência', icon: '🚨', color: '#ef4444' },
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
    // Diagnóstico: verificar localStorage primeiro
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    console.log('[AUTH] localStorage sb key:', sbKey || 'NÃO ENCONTRADA');
    if (sbKey) {
        try {
            const stored = JSON.parse(localStorage.getItem(sbKey));
            console.log('[AUTH] localStorage sessão:', stored?.user?.email || 'sem user', '| expires:', stored?.expires_at ? new Date(stored.expires_at * 1000).toLocaleString() : 'N/A');
        } catch (e) { console.log('[AUTH] localStorage parse error:', e); }
    }

    const { data: { session }, error } = await sb.auth.getSession();
    console.log('[AUTH] getSession:', session ? 'OK (' + session.user.email + ')' : 'NULL', error ? 'ERRO: ' + error.message : '');

    if (session) {
        currentUser = session.user;
        await setupApp();
    } else {
        // Sem sessão — mostra tela de login
        $('auth-screen').style.display = '';
        $('app-screen').style.display = 'none';
    }

    // Listener para mudanças de auth
    sb.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] stateChange:', event);
        if (event === 'SIGNED_IN' && !currentUser && session) {
            currentUser = session.user;
            setupApp();
        }
        if (event === 'TOKEN_REFRESHED' && session) {
            currentUser = session.user;
        }
    });
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
    localStorage.removeItem('ds160_dashboard_view');
    await sb.auth.signOut();
    location.reload();
};

async function setupApp() {
    $('auth-screen').style.display = 'none';
    $('app-screen').style.display = 'flex';
    $('user-email').textContent = currentUser.email;

    const { data: masterData } = await sb.rpc('is_master');
    isMaster = !!masterData;
    $('user-role-display').textContent = isMaster ? 'MASTER' : 'MEMBRO';
    if (isMaster) $('nav-master').classList.remove('hidden');

    // Load user's company_id
    const { data: memberData } = await sb.from('members').select('company_id').eq('user_id', currentUser.id).single();
    if (memberData) {
        userCompanyId = memberData.company_id;
        const { data: companyData } = await sb.from('companies').select('short_id').eq('id', userCompanyId).single();
        if (companyData) userCompanyShortId = companyData.short_id;
    }

    // Restore view from localStorage (primary) or hash (fallback) or 'pipeline' (default)
    const saved = localStorage.getItem('ds160_dashboard_view') || location.hash.replace('#', '') || 'pipeline';
    const parts = saved.split(':');
    const savedView = parts[0];
    const savedParam = parts.slice(1).join(':') || '';

    console.log('[Dashboard] Restoring view:', saved, '→ view:', savedView, 'param:', savedParam);

    if (savedView === 'applicant-detail' && savedParam) {
        openApplicantDetail(savedParam);
    } else if (savedView === 'master') {
        const navItem = document.querySelector('.nav-item[data-view="master"]');
        if (navItem) {
            navItem.click();
            if (savedParam) setTimeout(() => showMasterSub(savedParam), 150);
        } else {
            navigateTo('pipeline');
        }
    } else {
        const navItem = document.querySelector(`.nav-item[data-view="${savedView}"]`);
        if (navItem) {
            navItem.click();
        } else {
            navigateTo('pipeline');
        }
    }
}

// ============================================================
// NAVIGATION — Centralized persistence via localStorage + hash
// ============================================================
function navigateTo(viewKey) {
    // viewKey examples: 'pipeline', 'archived', 'software', 'master:agencies', 'applicant-detail:UUID'
    localStorage.setItem('ds160_dashboard_view', viewKey);
    try { history.replaceState(null, '', '#' + viewKey); } catch (e) { }
    console.log('[Dashboard] navigateTo:', viewKey);
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById('view-' + viewId);
    if (view) view.classList.add('active');
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
        const view = item.dataset.view;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        showView(view);
        $('page-title').textContent = item.textContent.trim();
        $('page-subtitle').textContent = '';

        // Persist current view
        navigateTo(view);

        // Lazy load — only fetch on first visit or force refresh
        if (view === 'pipeline') {
            if (!viewLoaded.pipeline) { showSkeleton('pipeline-list'); }
            loadPipeline();
            viewLoaded.pipeline = true;
        }
        if (view === 'archived') {
            if (!viewLoaded.archived) { showSkeleton('archived-list'); }
            loadArchived();
            viewLoaded.archived = true;
        }
        if (view === 'software') {
            if (!viewLoaded.software) loadSoftwareInfo();
            viewLoaded.software = true;
        }
        if (view === 'master') {
            showMasterSub('agencies');
            if (!viewLoaded.master) {
                showSkeleton('agencies-list');
                showSkeleton('logs-list');
            }
            loadAgencies();
            loadCapmonsterKey();
            loadLogs();
            viewLoaded.master = true;
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
    // Persist master sub-tab
    navigateTo('master:' + tabName);
}

document.querySelectorAll('.master-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        showMasterSub(tab.dataset.masterTab);
        if (tab.dataset.masterTab === 'logs') loadLogs();
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
        .select('id, full_name, data, passport_number, pipeline_status, updated_at, fill_priority, sort_order')
        .is('primary_applicant_id', null)
        .neq('pipeline_status', 'archived');

    // Filter by pipeline stage if a stage card is selected
    if (currentFilter) query = query.eq('pipeline_status', currentFilter);

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
    let appsMap = {};
    if (ids.length > 0) {
        const { data: deps } = await sb.from('applicants')
            .select('id, full_name, pipeline_status, primary_applicant_id')
            .in('primary_applicant_id', ids);
        (deps || []).forEach(d => {
            if (!dependentsMap[d.primary_applicant_id]) dependentsMap[d.primary_applicant_id] = [];
            dependentsMap[d.primary_applicant_id].push(d);
        });
        // Fetch fill_status for each primary from applications
        const { data: appsList } = await sb.from('applications')
            .select('applicant_id, fill_status')
            .in('applicant_id', ids);
        (appsList || []).forEach(app => { appsMap[app.applicant_id] = app; });
    }

    // Render list (card style like job-listing)
    const container = $('pipeline-list');
    container.innerHTML = (applicants || []).map(a => {
        const deps = dependentsMap[a.id] || [];
        const totalProcesses = 1 + deps.length;
        const doneProcesses = (a.pipeline_status === 'done' ? 1 : 0) +
            deps.filter(d => d.pipeline_status === 'done').length;
        const progressColor = doneProcesses === totalProcesses && totalProcesses > 0
            ? '#22c55e' : (doneProcesses > 0 ? '#f59e0b' : 'var(--text-muted)');

        const stage = STAGES[a.pipeline_status] || STAGES.new;
        const email = a.data?.addressPhone?.email || a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';
        const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const avatarBg = stage.color + '22';

        // Priority badge
        const prio = PRIORITIES[a.fill_priority] || PRIORITIES[0];
        const prioBadge = a.fill_priority >= 2
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${prio.color}15;color:${prio.color};font-weight:700">${prio.icon} ${prio.label}</span>`
            : '';

        // Fill status badge
        const appData = appsMap[a.id];
        const fillStatus = appData?.fill_status || '';
        const fStage = FILL_STAGES[fillStatus];
        const fillBadge = fStage && fillStatus !== 'pending'
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${fStage.color}15;color:${fStage.color};font-weight:600"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${fStage.color};margin-right:4px;vertical-align:middle"></span>${fStage.label}</span>`
            : '';

        return `<div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 cursor-pointer hover:shadow-md transition" onclick="openApplicantDetail('${a.id}')">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <!-- Left side -->
                <div class="flex items-start space-x-3 md:space-x-4">
                    <div class="w-9 h-9 shrink-0 mt-1 rounded-full flex items-center justify-center text-xs font-bold" style="background:${avatarBg};color:${stage.color}">${initials}</div>
                    <div>
                        <div class="inline-flex font-semibold text-gray-800 dark:text-gray-100">${a.full_name}</div>
                        ${email ? `<div class="text-sm text-gray-500 dark:text-gray-400">${email}</div>` : ''}
                    </div>
                </div>
                <!-- Right side -->
                <div class="flex items-center space-x-3 pl-10 md:pl-0">
                    ${prioBadge}
                    ${fillBadge}
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic whitespace-nowrap">${updated}</div>
                    <div class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1" style="background:${stage.color}22;color:${stage.color}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${stage.color};margin-right:5px;vertical-align:middle"></span>${stage.label}</div>
                    <span class="text-sm font-bold" style="color:${progressColor}">${doneProcesses}/${totalProcesses}</span>
                </div>
            </div>
        </div>`;
    }).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum solicitante nesta etapa</div>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    const paginationEl = $('pagination-container');
    if (paginationEl) {
        if (currentPage > 1 || hasMore) {
            paginationEl.classList.remove('hidden');
        } else {
            paginationEl.classList.add('hidden');
        }
    }
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

    const container = $('archived-list');
    const stage = STAGES.archived;
    container.innerHTML = (applicants || []).map(a => {
        const email = a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';
        const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return `<div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 cursor-pointer hover:shadow-md transition" onclick="openApplicantDetail('${a.id}')">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <div class="flex items-start space-x-3 md:space-x-4">
                    <div class="w-9 h-9 shrink-0 mt-1 rounded-full flex items-center justify-center text-xs font-bold" style="background:${stage.color}22;color:${stage.color}">${initials}</div>
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-100">${a.full_name}</div>
                        ${email ? `<div class="text-sm text-gray-500 dark:text-gray-400">${email}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center space-x-4 pl-10 md:pl-0 shrink-0">
                    ${a.passport_number ? `<div class="text-xs text-gray-400 dark:text-gray-500 font-mono">${a.passport_number}</div>` : ''}
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic whitespace-nowrap">${updated}</div>
                    <div class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1" style="background:${stage.color}22;color:${stage.color}">${stage.label}</div>
                    <div class="relative" x-data="{ open: false }">
                        <button @click.stop="open = !open" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                            <svg class="w-5 h-5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div x-show="open" @click.outside="open = false" x-transition class="origin-top-right absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg py-1 z-20" x-cloak>
                            <button onclick="event.stopPropagation();openApplicantDetail('${a.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver detalhes</button>
                            <button onclick="event.stopPropagation();viewApplicantJson('${a.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver JSON</button>
                            <button onclick="event.stopPropagation();movePipeline('${a.id}','new','${a.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10">Restaurar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum solicitante arquivado</div>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    const total = (applicants || []).length;
    $('arch-prev').disabled = archivedPage <= 1;
    $('arch-next').disabled = !hasMore;
    $('arch-page-info').textContent = `Página ${archivedPage}`;
    // Show/hide pagination
    const pagEl = $('archived-pagination');
    if (pagEl) pagEl.classList.toggle('hidden', archivedPage <= 1 && !hasMore);
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

// Pagination buttons
if ($('app-prev')) {
    $('app-prev').addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; loadPipelineList(); }
    });
}
if ($('app-next')) {
    $('app-next').addEventListener('click', () => {
        currentPage++; loadPipelineList();
    });
}

// ============================================================
// SEARCH + PAGINATION
// ============================================================
let searchTimeout;
$('search-applicants').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    const q = e.target.value.trim();
    searchTimeout = setTimeout(async () => {
        searchQuery = q;
        currentPage = 1;
        loadPipelineList();

        // Render results inside modal
        const resultsList = $('search-results-list');
        if (!resultsList) return;
        if (!q) {
            resultsList.innerHTML = '<li class="px-2 py-1 text-gray-400 dark:text-gray-500 text-xs italic">Digite para buscar…</li>';
            return;
        }
        let rq = sb.from('applicants')
            .select('id, full_name, data, passport_number, pipeline_status')
            .is('primary_applicant_id', null)
            .or(`full_name.ilike.%${q}%,passport_number.ilike.%${q}%`)
            .order('updated_at', { ascending: false }).limit(8);
        if (userCompanyId) rq = rq.eq('company_id', userCompanyId);
        const { data: results } = await rq;
        if (!results || results.length === 0) {
            resultsList.innerHTML = '<li class="px-2 py-1 text-gray-400 dark:text-gray-500 text-xs italic">Nenhum resultado encontrado</li>';
            return;
        }
        resultsList.innerHTML = results.map(a => {
            const stage = STAGES[a.pipeline_status] || STAGES.new;
            const email = a.data?.addressPhone?.email || a.data?.personal?.email || a.data?.contact?.email || '';
            const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return `<li>
                <a class="flex items-center p-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg cursor-pointer" onclick="openApplicantDetail('${a.id}')">
                    <div class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold mr-3" style="background:${stage.color}22;color:${stage.color}">${initials}</div>
                    <div class="truncate">
                        <span class="font-medium">${a.full_name}</span>
                        ${email ? ` <span class="text-gray-400 dark:text-gray-500">· ${email}</span>` : ''}
                    </div>
                    <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style="background:${stage.color}22;color:${stage.color}">${stage.label}</span>
                </a>
            </li>`;
        }).join('');
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
                <span style="font-size:13px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Mover todos:</span>
                <select onchange="if(this.value){moveAllPipeline('${id}',this.value);this.value=''}" 
                    style="font-size:13px;padding:8px 14px;background:#fff;border:1px solid #d1d5db;border-radius:5px;color:#374151;cursor:pointer;outline:none;font-family:inherit;font-weight:500">
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
                <button onclick="showDeleteModal('${id}','${applicant.full_name.replace(/'/g, "\\\\'")}')" style="font-size:13px;padding:8px 14px;background:rgba(239,68,68,.06);color:#ef4444;border:1px solid rgba(239,68,68,.25);border-radius:5px;cursor:pointer;font-weight:500;font-family:inherit;transition:all .2s">Excluir</button>
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

        // Priority
        const pPrio = PRIORITIES[p.fill_priority] || PRIORITIES[0];
        const pPrioBadge = (p.fill_priority || 0) >= 2
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${pPrio.color}15;color:${pPrio.color};font-weight:700">${pPrio.icon} ${pPrio.label}</span>`
            : '';

        html += `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;${isDone ? 'opacity:.7;' : ''}${(p.fill_priority || 0) >= 3 ? 'border-left:3px solid #ef4444;' : (p.fill_priority || 0) >= 2 ? 'border-left:3px solid #f97316;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="openProcessModal('${p.id}')">
                <div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-weight:700;font-size:14px">${p.full_name}</span>
                        ${appId ? `<span style="font-size:10px;color:var(--text-muted);background:var(--bg);padding:2px 6px;border-radius:4px;font-family:monospace">${appId}</span>` : ''}
                        ${pPrioBadge}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                        <span style="font-size:11px;color:var(--text-muted)">${roleLabel}${pPassport ? ' · ' + pPassport : ''}</span>
                        ${fillStatus !== '—' ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${fStage.color}15;color:${fStage.color};font-weight:600"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${fStage.color};margin-right:4px;vertical-align:middle"></span>${fStage.label}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${pApp ? `<button onclick="event.stopPropagation();viewAppDetails('${p.id}')" style="font-size:13px;padding:8px 14px;background:#fff;border:1px solid #d1d5db;border-radius:5px;cursor:pointer;color:#374151;font-weight:500;transition:all .2s;font-family:inherit">Detalhes</button>` : ''}
                    <select onclick="event.stopPropagation()" onchange="if(this.value!==''){setPriority('${p.id}',this.value,'${id}')}"
                        style="font-size:13px;padding:8px 14px;background:${pPrio.color}08;color:${pPrio.color};border:1px solid #d1d5db;border-radius:5px;cursor:pointer;outline:none;font-weight:500;font-family:inherit">
                        <option value="">${pPrio.icon} ${(p.fill_priority || 0) >= 1 ? pPrio.label : 'Prioridade'}</option>
                        <option value="1">📋 Normal</option>
                        <option value="2">⚡ Urgente</option>
                        <option value="3">🚨 Emergência</option>
                    </select>
                    <select onclick="event.stopPropagation()" onchange="if(this.value){movePipeline('${p.id}',this.value,'${id}')}" 
                        style="font-size:13px;padding:8px 14px;background:${pStage.color}08;color:${pStage.color};border:1px solid #d1d5db;border-radius:5px;cursor:pointer;outline:none;font-weight:600;font-family:inherit">
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
    navigateTo('applicant-detail:' + id);
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

    // Auto-reset application when moving to 'approved' (enables re-fill)
    if (newStatus === 'approved') {
        await _resetApplicationForRefill(applicantId);
    }

    toast(`Movido para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    openApplicantDetail(primaryId || applicantId);
    loadPipeline();
}

async function moveAllPipeline(primaryId, newStatus) {
    // Get all IDs (primary + dependents)
    const { data: deps } = await sb.from('applicants')
        .select('id').eq('primary_applicant_id', primaryId);
    const allIds = [primaryId, ...(deps || []).map(d => d.id)];

    for (const aid of allIds) {
        await sb.from('applicants')
            .update({ pipeline_status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', aid);
        if (newStatus === 'approved') {
            await _resetApplicationForRefill(aid);
        }
    }

    toast(`Todos movidos para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    openApplicantDetail(primaryId);
    loadPipeline();
}

// Auto-reset application fill_status when moving to approved (enables re-fill)
async function _resetApplicationForRefill(applicantId) {
    const { data: apps } = await sb.from('applications')
        .select('id, fill_status').eq('applicant_id', applicantId);
    if (apps && apps.length > 0) {
        for (const app of apps) {
            if (app.fill_status === 'filled' || app.fill_status === 'error' || app.fill_status === 'needs_attention') {
                await sb.from('applications').update({
                    fill_status: 'pending',
                    fill_error: null,
                    fill_worker_id: null,
                    fill_started_at: null,
                    fill_finished_at: null,
                    retry_count: 0,
                    last_page: null,
                    application_id: null,
                    last_error_at: null
                }).eq('id', app.id);
            }
        }
    }
}

// Set priority for an applicant
async function setPriority(applicantId, priority, primaryId) {
    const { error } = await sb.from('applicants')
        .update({ fill_priority: parseInt(priority), updated_at: new Date().toISOString() })
        .eq('id', applicantId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    const prio = PRIORITIES[priority] || PRIORITIES[0];
    toast(`Prioridade: ${prio.icon} ${prio.label}`, 'success');
    openApplicantDetail(primaryId || applicantId);
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
    navigateTo('pipeline');
    $('page-title').textContent = 'Pipeline';
    $('page-subtitle').textContent = '';
    loadPipeline();
}

// ============================================================
// LOGS (Master only)
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

// Archive all logs
if ($('btn-archive-logs')) {
    $('btn-archive-logs').onclick = async () => {
        if (!confirm('Arquivar todos os erros?')) return;
        const { error } = await sb.from('error_logs').update({ archived: true }).eq('archived', false);
        if (error) toast('Erro: ' + error.message, 'error');
        else { toast('Erros arquivados', 'success'); loadLogs(); }
    };
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
async function toggleAgencyStatus(companyId, isCurrentlyActive) {
    const newStatus = !isCurrentlyActive;
    const { error } = await sb.from('companies').update({ active: newStatus }).eq('id', companyId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast(newStatus ? 'Organização ativada' : 'Organização desativada');
    loadAgencies();
}
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

async function removeMember(userId, companyId) {
    if (!confirm('Remover este assessor?')) return;
    const { error } = await sb.from('members').delete().eq('user_id', userId).eq('company_id', companyId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    toast('Assessor removido');
    openAgencyDetail(companyId);
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
                    class="text-xs font-semibold px-4 py-2 rounded-lg transition ${company.active !== false ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 hover:bg-green-200 dark:hover:bg-green-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/30'}">
                    ${company.active !== false ? '✓ Ativa' : '✗ Inativa'}
                </button>
                ${memberDetails.length === 0 ? `<button onclick="deleteCompany('${company.id}', '${company.name.replace(/'/g, "\\\\'")}')"
                    class="text-xs font-semibold px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition">Excluir</button>` : ''}
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
// INIT
// ============================================================
init().then(() => { if (currentUser) loadOrgId(); });
