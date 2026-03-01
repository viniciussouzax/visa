// ============================================================
// DS160 EXPRESSO — Archived Page JS
// ============================================================
let archivedPage = 1;
let archivedSearch = '';

(async () => {
    try {
        const ok = await initAuth();
        if (!ok) { hideLoader(); return; }
        renderLayout();
        showSkeleton('archived-list');
        await loadArchived();
        setupArchivedListeners();
    } catch (e) {
        console.error('[Archived] Init error:', e);
    } finally {
        hideLoader();
    }
})();

function setupArchivedListeners() {
    const searchInput = $('search-archived');
    let timeout;
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                archivedSearch = e.target.value.trim();
                archivedPage = 1;
                loadArchived();
            }, 300);
        });
    }
    if ($('arch-prev')) $('arch-prev').onclick = () => { if (archivedPage > 1) { archivedPage--; loadArchived(); } };
    if ($('arch-next')) $('arch-next').onclick = () => { archivedPage++; loadArchived(); };
}

async function loadArchived() {
    const from = (archivedPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = sb.from('applicants')
        .select('id, full_name, data, passport_number, pipeline_status, updated_at')
        .is('primary_applicant_id', null)
        .eq('pipeline_status', 'archived');

    if (userCompanyId) query = query.eq('company_id', userCompanyId);
    if (archivedSearch) query = query.or(`full_name.ilike.%${archivedSearch}%,passport_number.ilike.%${archivedSearch}%`);

    query = query.order('updated_at', { ascending: false }).range(from, to);
    const { data: applicants, error } = await query;
    if (error) { toast('Erro: ' + error.message, 'error'); return; }

    const container = $('archived-list');
    const stage = STAGES.archived;
    container.innerHTML = (applicants || []).map(a => {
        const email = a.data?.personal?.email || a.data?.contact?.email || '';
        const updated = a.updated_at ? new Date(a.updated_at).toLocaleDateString('pt-BR') : '—';
        const initials = (a.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return `<div class="bg-white dark:bg-gray-800 shadow-xs rounded-xl px-5 py-4 hover:shadow-md transition">
            <div class="md:flex justify-between items-center space-y-4 md:space-y-0 space-x-2">
                <a href="applicant.html?id=${a.id}" class="flex items-start space-x-3 md:space-x-4 cursor-pointer">
                    <div class="w-9 h-9 shrink-0 mt-1 rounded-full flex items-center justify-center text-xs font-bold" style="background:${stage.color}22;color:${stage.color}">${initials}</div>
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-100">${a.full_name}</div>
                        ${email ? `<div class="text-sm text-gray-500 dark:text-gray-400">${email}</div>` : ''}
                    </div>
                </a>
                <div class="flex items-center space-x-4 pl-10 md:pl-0 shrink-0">
                    ${a.passport_number ? `<div class="text-xs text-gray-400 dark:text-gray-500 font-mono">${a.passport_number}</div>` : ''}
                    <div class="text-sm text-gray-500 dark:text-gray-400 italic whitespace-nowrap">${updated}</div>
                    <div class="text-xs inline-flex rounded-full text-center px-2.5 py-1" style="background:${stage.color}22;color:${stage.color}">${stage.label}</div>
                    <div class="relative" x-data="{ open: false }">
                        <button @click.stop="open = !open" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition">
                            <svg class="w-5 h-5 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div x-show="open" @click.outside="open = false" x-transition class="origin-top-right absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg py-1 z-20" x-cloak>
                            <a href="applicant.html?id=${a.id}" @click="open=false" class="block w-full text-left px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30">Ver detalhes</a>
                            <button onclick="event.stopPropagation();restoreApplicant('${a.id}')" @click="open=false" class="w-full text-left px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10">Restaurar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('') || '<div class="text-center py-10 text-sm text-gray-400 dark:text-gray-500">Nenhum solicitante arquivado</div>';

    const hasMore = (applicants || []).length === PAGE_SIZE;
    if ($('arch-prev')) $('arch-prev').disabled = archivedPage <= 1;
    if ($('arch-next')) $('arch-next').disabled = !hasMore;
    const pagEl = $('archived-pagination');
    if (pagEl) pagEl.classList.toggle('hidden', archivedPage <= 1 && !hasMore);
}

async function restoreApplicant(id) {
    const now = new Date().toISOString();
    // Restore primary
    const { error } = await sb.from('applicants')
        .update({ pipeline_status: 'new', updated_at: now })
        .eq('id', id);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    // Restore dependents in cascade
    await sb.from('applicants')
        .update({ pipeline_status: 'new', updated_at: now })
        .eq('primary_applicant_id', id);
    toast('Restaurado para Novo (incluindo dependentes)', 'success');
    loadArchived();
}
