// ============================================================
// DS160 EXPRESSO — Pipeline Page JS
// ============================================================
let currentPage = 1;
let searchQuery = '';
let currentFilter = '';

// ============================================================
// INIT
// ============================================================
(async () => {
    const ok = await initAuth();
    if (!ok) return;
    renderLayout();
    showSkeleton('pipeline-list');
    await loadPipeline();
    setupListeners();
    hideLoader();
})();

function setupListeners() {
    // Pipeline card filters
    document.querySelectorAll('.pipeline-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.pipeline-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentFilter = card.dataset.filter;
            currentPage = 1;
            loadPipelineList();
        });
    });

    // Pagination
    if ($('app-prev')) $('app-prev').onclick = () => { if (currentPage > 1) { currentPage--; loadPipelineList(); } };
    if ($('app-next')) $('app-next').onclick = () => { currentPage++; loadPipelineList(); };

    // Search
    let searchTimeout;
    const searchInput = $('search-applicants');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            clearTimeout(searchTimeout);
            const q = e.target.value.trim();
            searchTimeout = setTimeout(async () => {
                searchQuery = q;
                currentPage = 1;
                loadPipelineList();

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
                    const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return `<li>
                        <a class="flex items-center p-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 rounded-lg cursor-pointer" href="applicant.html?id=${a.id}">
                            <div class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold mr-3" style="background:${stage.color}22;color:${stage.color}">${initials}</div>
                            <div class="truncate"><span class="font-medium">${a.full_name}</span></div>
                            <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style="background:${stage.color}22;color:${stage.color}">${stage.label}</span>
                        </a>
                    </li>`;
                }).join('');
            }, 300);
        });
    }

    // Ctrl+K to open search
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('open-search'));
        }
    });

    // Modal close
    $('modal-close')?.addEventListener('click', () => $('info-modal').classList.add('hidden'));

    // Listen for form-approved message from iframe
    window.addEventListener('message', async (e) => {
        if (e.data?.type === 'form-approved') {
            closeProcessModal();
            loadPipeline();
        }
    });
}

// ============================================================
// PIPELINE — LOAD STATS + LIST
// ============================================================
async function loadPipeline() {
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

    if (currentFilter) query = query.eq('pipeline_status', currentFilter);
    if (userCompanyId) query = query.eq('company_id', userCompanyId);
    if (searchQuery) query = query.or(`full_name.ilike.%${searchQuery}%,passport_number.ilike.%${searchQuery}%`);

    query = query.order('updated_at', { ascending: false }).range(from, to);
    const { data: applicants, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

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
        const { data: appsList } = await sb.from('applications')
            .select('applicant_id, fill_status')
            .in('applicant_id', ids);
        (appsList || []).forEach(app => { appsMap[app.applicant_id] = app; });
    }

    const container = $('pipeline-list');
    container.innerHTML = (applicants || []).map(a => {
        const deps = dependentsMap[a.id] || [];
        const totalProcesses = 1 + deps.length;
        const doneProcesses = (a.pipeline_status === 'done' ? 1 : 0) + deps.filter(d => d.pipeline_status === 'done').length;
        const progressColor = doneProcesses === totalProcesses && totalProcesses > 0 ? '#22c55e' : (doneProcesses > 0 ? '#f59e0b' : 'var(--text-muted)');

        const stage = STAGES[a.pipeline_status] || STAGES.new;
        const email = a.data?.addressPhone?.email || a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';
        const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const avatarBg = stage.color + '22';

        const prio = PRIORITIES[a.fill_priority] || PRIORITIES[0];
        const prioBadge = a.fill_priority >= 2
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${prio.color}15;color:${prio.color};font-weight:700">${prio.icon} ${prio.label}</span>` : '';

        const appData = appsMap[a.id];
        const fillStatus = appData?.fill_status || '';
        const fStage = FILL_STAGES[fillStatus];
        const fillBadge = fStage && fillStatus !== 'pending'
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${fStage.color}15;color:${fStage.color};font-weight:600"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${fStage.color};margin-right:4px;vertical-align:middle"></span>${fStage.label}</span>` : '';

        return `<a href="applicant.html?id=${a.id}" class="block bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 cursor-pointer hover:shadow-md transition">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <div class="flex items-start space-x-3 md:space-x-4">
                    <div class="w-9 h-9 shrink-0 mt-1 rounded-full flex items-center justify-center text-xs font-bold" style="background:${avatarBg};color:${stage.color}">${initials}</div>
                    <div>
                        <div class="inline-flex font-semibold text-gray-800 dark:text-gray-100">${a.full_name}</div>
                        ${email ? `<div class="text-sm text-gray-500 dark:text-gray-400">${email}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center space-x-3 pl-10 md:pl-0">
                    ${prioBadge}
                    ${fillBadge}
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic whitespace-nowrap">${updated}</div>
                    <div class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1" style="background:${stage.color}22;color:${stage.color}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${stage.color};margin-right:5px;vertical-align:middle"></span>${stage.label}</div>
                    <span class="text-sm font-bold" style="color:${progressColor}">${doneProcesses}/${totalProcesses}</span>
                </div>
            </div>
        </a>`;
    }).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum solicitante nesta etapa</div>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    const paginationEl = $('pagination-container');
    if (paginationEl) paginationEl.classList.toggle('hidden', currentPage <= 1 && !hasMore);
    if ($('app-prev')) $('app-prev').disabled = currentPage <= 1;
    if ($('app-next')) $('app-next').disabled = !hasMore;
}

// ============================================================
// PROCESS MODAL
// ============================================================
async function openProcessModal(applicantId) {
    const { data: applicant } = await sb.from('applicants').select('full_name, pipeline_status').eq('id', applicantId).single();
    if (!applicant) return;
    const stage = STAGES[applicant.pipeline_status] || STAGES.new;
    $('process-modal-name').textContent = applicant.full_name;
    $('process-modal-sub').innerHTML = `<span style="background:${stage.color}18;color:${stage.color};padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600">${stage.label}</span>`;
    $('process-modal-iframe').src = `../ds160/index.html?id=${applicantId}`;
    $('process-modal').style.display = 'flex';
}

function closeProcessModal() {
    $('process-modal').style.display = 'none';
    $('process-modal-iframe').src = 'about:blank';
}

// ============================================================
// VIEW JSON
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

// ============================================================
// DELETE APPLICANT
// ============================================================
let pendingDeleteId = null;

function showDeleteModal(id, name) {
    pendingDeleteId = id;
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
    loadPipeline();
}
