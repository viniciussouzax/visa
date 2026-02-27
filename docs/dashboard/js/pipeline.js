// ============================================================
// DS160 EXPRESSO — Pipeline Page JS (with Drag & Drop)
// ============================================================
let currentPage = 1;
let searchQuery = '';
let currentFilter = '';
let draggedEl = null;

// Sanitize search input to prevent injection
function sanitizeSearch(str) {
    return str.replace(/[%_'"\\]/g, '');
}

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
    if (searchQuery) {
        const safe = sanitizeSearch(searchQuery);
        query = query.or(`full_name.ilike.%${safe}%,passport_number.ilike.%${safe}%`);
    }

    // Order: priority DESC (emergency first), then sort_order ASC (manual order)
    query = query.order('fill_priority', { ascending: false })
        .order('sort_order', { ascending: true })
        .range(from, to);
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

    // Column header
    const headerHtml = (applicants && applicants.length > 0) ? `
        <div class="pipeline-header ds-pipeline-grid ds-pipeline-header">
            <span></span><span></span>
            <span class="ds-col-header">Solicitante</span>
            <span class="ds-col-header">Prioridade</span>
            <span class="ds-col-header">Etapa</span>
            <span class="ds-col-header">Status</span>
            <span class="ds-col-header" style="text-align:center">Proc.</span>
        </div>` : '';

    // Group applicants by priority for dividers
    const priorityGroups = { 3: [], 2: [], low: [] };
    (applicants || []).forEach(a => {
        const p = a.fill_priority || 0;
        if (p >= 3) priorityGroups[3].push(a);
        else if (p >= 2) priorityGroups[2].push(a);
        else priorityGroups.low.push(a);
    });

    function buildRow(a) {
        const deps = dependentsMap[a.id] || [];
        const totalProcesses = 1 + deps.length;
        const doneProcesses = (a.pipeline_status === 'done' ? 1 : 0) + deps.filter(d => d.pipeline_status === 'done').length;
        const progressColor = doneProcesses === totalProcesses && totalProcesses > 0 ? '#22c55e' : (doneProcesses > 0 ? '#f59e0b' : '#9ca3af');

        const stage = STAGES[a.pipeline_status] || STAGES.new;
        const email = a.data?.addressPhone?.email || a.data?.personal?.email || a.data?.contact?.email || '';
        const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

        const prio = PRIORITIES[a.fill_priority] || PRIORITIES[0];
        const prioBadge = a.fill_priority >= 2
            ? `<span class="ds-badge" style="background:${prio.color}15;color:${prio.color}">${prio.icon} ${prio.label}</span>`
            : `<span class="ds-text-muted">—</span>`;

        const appData = appsMap[a.id];
        const fillStatus = appData?.fill_status || '';
        const fStage = FILL_STAGES[fillStatus];
        const fillBadge = fStage && fillStatus !== 'pending'
            ? `<span class="ds-badge" style="background:${fStage.color}15;color:${fStage.color}"><span class="ds-badge-dot" style="background:${fStage.color}"></span>${fStage.label}</span>`
            : `<span class="ds-text-muted">—</span>`;

        const prioGroup = (a.fill_priority || 0) >= 3 ? '3' : (a.fill_priority || 0) >= 2 ? '2' : '0';

        return `<div class="pipeline-item bg-white dark:bg-gray-800 shadow-xs rounded-xl hover:shadow-md transition ds-pipeline-grid"
                     data-id="${a.id}" data-priority-group="${prioGroup}" draggable="true">
            <div class="drag-handle shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400" title="Arrastar para reordenar">
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                    <circle cx="3" cy="2" r="1.5"/><circle cx="9" cy="2" r="1.5"/>
                    <circle cx="3" cy="6" r="1.5"/><circle cx="9" cy="6" r="1.5"/>
                    <circle cx="3" cy="10" r="1.5"/><circle cx="9" cy="10" r="1.5"/>
                    <circle cx="3" cy="14" r="1.5"/><circle cx="9" cy="14" r="1.5"/>
                </svg>
            </div>
            <div class="ds-avatar ds-avatar-md">${initials}</div>
            <a href="applicant.html?id=${a.id}" style="min-width:0;overflow:hidden">
                <div class="ds-text-name">${a.full_name}</div>
                ${email ? `<div class="ds-text-sub">${email}</div>` : ''}
            </a>
            <div>${prioBadge}</div>
            <div><span class="ds-badge" style="background:${stage.color}15;color:${stage.color}"><span class="ds-badge-dot" style="background:${stage.color}"></span>${stage.label}</span></div>
            <div>${fillBadge}</div>
            <div style="text-align:center"><span style="font-size:13px;font-weight:700;color:${progressColor}">${doneProcesses}/${totalProcesses}</span></div>
        </div>`;
    }

    function buildDivider(label) {
        return `<div class="priority-divider ds-divider" data-divider="true">
            <span class="ds-divider-label">${label}</span>
            <div class="ds-divider-line"></div>
        </div>`;
    }

    let rowsHtml = '';
    const hasAny = (applicants || []).length > 0;

    if (hasAny) {
        // Emergência
        if (priorityGroups[3].length > 0) {
            rowsHtml += buildDivider('Emergência');
            rowsHtml += priorityGroups[3].map(buildRow).join('');
        }
        // Urgência
        if (priorityGroups[2].length > 0) {
            rowsHtml += buildDivider('Urgência');
            rowsHtml += priorityGroups[2].map(buildRow).join('');
        }
        // Sem prioridade
        if (priorityGroups.low.length > 0) {
            rowsHtml += buildDivider('Indefinido');
            rowsHtml += priorityGroups.low.map(buildRow).join('');
        }
    } else {
        rowsHtml = '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum solicitante nesta etapa</div>';
    }

    container.innerHTML = headerHtml + rowsHtml;

    // Setup drag and drop (restricted to priority group)
    setupDragAndDrop();

    const hasMore = (applicants || []).length === PAGE_SIZE;
    const paginationEl = $('pagination-container');
    if (paginationEl) paginationEl.classList.toggle('hidden', currentPage <= 1 && !hasMore);
    if ($('app-prev')) $('app-prev').disabled = currentPage <= 1;
    if ($('app-next')) $('app-next').disabled = !hasMore;
}

// ============================================================
// DRAG & DROP (restricted to same priority group)
// ============================================================
function setupDragAndDrop() {
    const container = $('pipeline-list');
    const items = container.querySelectorAll('.pipeline-item');

    items.forEach(item => {
        const handle = item.querySelector('.drag-handle');

        handle.addEventListener('mousedown', () => {
            item.setAttribute('draggable', 'true');
        });

        item.addEventListener('dragstart', e => {
            draggedEl = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.id);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.pipeline-item').forEach(el => {
                el.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            draggedEl = null;
            saveSortOrder();
        });

        item.addEventListener('dragover', e => {
            e.preventDefault();
            if (item === draggedEl) return;

            // Restrict drag to same priority group
            if (draggedEl && item.dataset.priorityGroup !== draggedEl.dataset.priorityGroup) {
                e.dataTransfer.dropEffect = 'none';
                return;
            }

            e.dataTransfer.dropEffect = 'move';
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const isAbove = e.clientY < midY;

            item.classList.toggle('drag-over-top', isAbove);
            item.classList.toggle('drag-over-bottom', !isAbove);
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        item.addEventListener('drop', e => {
            e.preventDefault();
            if (!draggedEl || item === draggedEl) return;

            // Block drop across priority groups
            if (item.dataset.priorityGroup !== draggedEl.dataset.priorityGroup) return;

            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const isAbove = e.clientY < midY;

            if (isAbove) {
                container.insertBefore(draggedEl, item);
            } else {
                container.insertBefore(draggedEl, item.nextSibling);
            }

            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
    });
}

async function saveSortOrder() {
    const items = $('pipeline-list').querySelectorAll('.pipeline-item');
    const updates = [];
    items.forEach((item, index) => {
        updates.push({ id: item.dataset.id, sort_order: index + 1 });
    });

    const promises = updates.map(u =>
        sb.from('applicants').update({ sort_order: u.sort_order }).eq('id', u.id)
    );
    await Promise.all(promises);
    toast('Ordem atualizada', 'success');
}

// ============================================================
// PROCESS MODAL
// ============================================================
async function openProcessModal(applicantId) {
    const { data: applicant } = await sb.from('applicants').select('full_name, pipeline_status').eq('id', applicantId).single();
    if (!applicant) return;
    const stage = STAGES[applicant.pipeline_status] || STAGES.new;
    $('process-modal-name').textContent = applicant.full_name;
    $('process-modal-sub').innerHTML = `<span class="ds-badge" style="background:${stage.color}18;color:${stage.color}">${stage.label}</span>`;
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
            <div class="ds-info-row"><span class="ds-info-label">Email:</span> <span>${email}</span></div>
            <div class="ds-info-row"><span class="ds-info-label">Telefone:</span> <span>${phone}</span></div>
        </div>
        <pre class="ds-json-preview">${JSON.stringify(combined, null, 2)}</pre>`;
}

// ============================================================
// DELETE APPLICANT (with loading state)
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
    const btn = $('delete-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Excluindo...'; }
    try {
        const { data: deps } = await sb.from('applicants').select('id').eq('primary_applicant_id', id);
        const depIds = (deps || []).map(d => d.id);
        if (depIds.length > 0) await sb.from('applications').delete().in('applicant_id', depIds);
        await sb.from('applications').delete().eq('applicant_id', id);
        await sb.from('applicants').delete().eq('primary_applicant_id', id);
        const { error } = await sb.from('applicants').delete().eq('id', id);
        if (error) { toast('Erro: ' + error.message, 'error'); return; }
        toast('Excluído com sucesso', 'success');
        closeDeleteModal();
        loadPipeline();
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Excluir'; }
    }
}
