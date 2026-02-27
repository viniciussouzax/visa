// ============================================================
// DS160 EXPRESSO — Layout Module (shared sidebar + header)
// ============================================================

// Current page detection from URL
const CURRENT_PAGE = (() => {
    const path = location.pathname;
    if (path.includes('archived')) return 'archived';
    if (path.includes('software')) return 'software';
    if (path.includes('master')) return 'master';
    if (path.includes('applicant')) return 'applicant';
    return 'pipeline';
})();

const PAGE_TITLES = {
    pipeline: 'Aplicações',
    archived: 'Arquivados',
    software: 'Software',
    master: 'Master',
    applicant: 'Detalhe'
};

function renderLayout() {
    // ===== SIDEBAR =====
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;

    const navItems = [
        { view: 'pipeline', label: 'Aplicações', href: 'index.html' },
        { view: 'archived', label: 'Arquivados', href: 'archived.html' },
        { view: 'software', label: 'Software', href: 'software.html' },
        { view: 'master', label: 'Master', href: 'master.html', masterOnly: true }
    ];

    sidebarEl.innerHTML = `
    <div class="min-w-fit">
        <div class="fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200"
            :class="sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'" aria-hidden="true" x-cloak></div>
        <div id="sidebar"
            class="flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:!w-64 shrink-0 bg-white dark:bg-gray-800 shadow-xs rounded-r-2xl p-4 transition-all duration-200 ease-in-out"
            :class="sidebarOpen ? 'translate-x-0' : '-translate-x-64'" @click.outside="sidebarOpen = false"
            @keydown.escape.window="sidebarOpen = false" x-cloak="lg">
            <div class="flex justify-between items-center px-4 pt-5 pb-2">
                <a class="block" href="index.html">
                    <span class="lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200"><img src="../images/logo-sends160.png" alt="SENDS160" style="height:22px;width:auto"></span>
                </a>
                <button class="lg:hidden text-gray-500 hover:text-gray-400" @click.stop="sidebarOpen = !sidebarOpen">
                    <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" /></svg>
                </button>
            </div>
            <nav class="mt-4 px-3">
                <ul class="space-y-1">
                    ${navItems.map(n => {
        if (n.masterOnly && !isMaster) return '';
        const isActive = CURRENT_PAGE === n.view;
        const cls = isActive
            ? 'nav-item active flex items-center p-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/20 transition'
            : 'nav-item flex items-center p-2 rounded-lg text-sm font-medium text-gray-500/90 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/20 transition';
        return `<li><a href="${n.href}" class="${cls}">
                            <span class="lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">${n.label}</span>
                        </a></li>`;
    }).join('')}
                </ul>
            </nav>
            <div class="mt-auto px-3 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                <div class="lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                    <label class="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Link do formulário</label>
                    <div class="flex items-center gap-1.5">
                        <input id="clone-url-input" type="text" readonly value="${window.location.origin + window.location.pathname.replace(/dashboard\/.*/, 'ds160/index.html')}" class="form-input text-xs bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 w-full py-1.5 px-2 rounded-lg cursor-text" style="font-size:11px"/>
                        <button onclick="navigator.clipboard.writeText(document.getElementById('clone-url-input').value);this.innerHTML='<svg class=\\'w-4 h-4 text-green-500\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M5 13l4 4L19 7\\'/></svg>';setTimeout(()=>{this.innerHTML='<svg class=\\'w-4 h-4\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><rect x=\\'9\\' y=\\'9\\' width=\\'13\\' height=\\'13\\' rx=\\'2\\' stroke-width=\\'2\\'/><path d=\\'M5 15V5a2 2 0 012-2h10\\' stroke-width=\\'2\\'/></svg>';},2000)" class="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Copiar link">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/><path d="M5 15V5a2 2 0 012-2h10" stroke-width="2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // ===== HEADER =====
    const headerEl = document.getElementById('header-container');
    if (!headerEl) return;

    const initials = (currentUser?.email || 'U')[0].toUpperCase();
    headerEl.innerHTML = `
    <header class="sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md before:bg-white/90 dark:before:bg-gray-800/90 lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90 before:-z-10 max-lg:shadow-xs z-30">
        <div class="px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16 lg:border-b border-gray-200 dark:border-gray-700/60">
                <div class="flex items-center gap-4">
                    <button class="text-gray-500 hover:text-gray-600 lg:hidden" @click.stop="sidebarOpen = !sidebarOpen">
                        <svg class="fill-current" width="16" height="16" viewBox="0 0 24 24"><path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                    </button>
                    <div>
                        <h1 id="page-title" class="text-xl font-bold text-gray-800 dark:text-gray-100">${PAGE_TITLES[CURRENT_PAGE] || 'Dashboard'}</h1>
                        <p id="page-subtitle" class="text-xs text-gray-500 dark:text-gray-400"></p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition" @click="$dispatch('open-search')" title="Buscar (Ctrl+K)">
                        <svg class="fill-current text-gray-500 dark:text-gray-400" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                            <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                        </svg>
                    </button>
                    <div class="relative inline-flex" x-data="{ open: false }">
                        <button class="inline-flex justify-center items-center" aria-haspopup="true" @click.prevent="open = !open" :aria-expanded="open">
                            <div class="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-violet-300 transition">${initials}</div>
                        </button>
                        <div class="origin-top-right z-10 absolute top-full right-0 min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1"
                            @click.outside="open = false" @keydown.escape.window="open = false" x-show="open"
                            x-transition:enter="transition ease-out duration-200 transform"
                            x-transition:enter-start="opacity-0 -translate-y-2"
                            x-transition:enter-end="opacity-100 translate-y-0"
                            x-transition:leave="transition ease-out duration-200"
                            x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0" x-cloak>
                            <div class="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
                                <div class="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">${currentUser?.email || ''}</div>
                                <div class="text-xs text-violet-500 italic">${isMaster ? 'Master' : 'Membro'}</div>
                            </div>
                            <ul>
                                ${isMaster ? '<li><a class="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3 cursor-pointer" href="master.html">Configurações</a></li>' : ''}
                                <li><a class="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3 cursor-pointer" onclick="logout()">Sair</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>`;

    // ===== GLOBAL SEARCH MODAL =====
    if (!document.getElementById('global-search-modal')) {
        const searchDiv = document.createElement('div');
        searchDiv.setAttribute('x-data', '{ searchOpen: false }');
        searchDiv.setAttribute('@open-search.window', "searchOpen = true; $nextTick(() => { document.getElementById('global-search-input')?.focus(); });");
        searchDiv.innerHTML = `
            <div class="fixed inset-0 bg-gray-900/30 z-50 transition-opacity" x-show="searchOpen"
                x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
                x-transition:leave="transition ease-out duration-100" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0" aria-hidden="true" x-cloak></div>
            <div id="global-search-modal" class="fixed inset-0 z-50 overflow-hidden flex items-start top-20 mb-4 justify-center px-4 sm:px-6"
                role="dialog" aria-modal="true" x-show="searchOpen"
                x-transition:enter="transition ease-in-out duration-200" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0"
                x-transition:leave="transition ease-in-out duration-200" x-transition:leave-start="opacity-100 translate-y-0" x-transition:leave-end="opacity-0 translate-y-4" x-cloak>
                <div class="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700/60 overflow-auto max-w-2xl w-full max-h-full rounded-lg shadow-lg"
                    @click.outside="searchOpen = false" @keydown.escape.window="searchOpen = false">
                    <form class="border-b border-gray-200 dark:border-gray-700/60" onsubmit="event.preventDefault();">
                        <div class="relative">
                            <label for="global-search-input" class="sr-only">Buscar</label>
                            <input id="global-search-input" class="w-full dark:text-gray-300 bg-white dark:bg-gray-800 border-0 focus:ring-transparent placeholder-gray-400 dark:placeholder-gray-500 appearance-none py-3 pl-10 pr-4"
                                type="search" placeholder="Buscar solicitante por nome ou passaporte…" />
                            <button class="absolute inset-0 right-auto group" type="submit" aria-label="Search">
                                <svg class="shrink-0 fill-current text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 ml-4 mr-2" width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                                    <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                                </svg>
                            </button>
                        </div>
                    </form>
                    <div class="py-4 px-2">
                        <div class="mb-3 last:mb-0">
                            <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 mb-2">Resultados</div>
                            <ul id="global-search-results" class="text-sm">
                                <li class="px-2 py-1 text-gray-400 dark:text-gray-500 text-xs italic">Digite para buscar…</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(searchDiv);
        setupGlobalSearch();
    }

    // Ctrl+K shortcut
    if (!window._globalSearchKeyBound) {
        window._globalSearchKeyBound = true;
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-search'));
            }
        });
    }
}

function setupGlobalSearch() {
    let timeout;
    const input = document.getElementById('global-search-input');
    if (!input) return;
    input.addEventListener('input', e => {
        clearTimeout(timeout);
        const q = e.target.value.trim();
        timeout = setTimeout(async () => {
            const resultsList = document.getElementById('global-search-results');
            if (!resultsList) return;
            if (!q) {
                resultsList.innerHTML = '<li class="px-2 py-1 text-gray-400 dark:text-gray-500 text-xs italic">Digite para buscar…</li>';
                return;
            }
            const safe = q.replace(/[%_'"\\]/g, '');
            let rq = sb.from('applicants')
                .select('id, full_name, passport_number, pipeline_status')
                .is('primary_applicant_id', null)
                .or(`full_name.ilike.%${safe}%,passport_number.ilike.%${safe}%`)
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
                        <div class="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold mr-3" style="background:#f3f4f6;color:#6b7280">${initials}</div>
                        <div class="truncate"><span class="font-medium">${a.full_name}</span></div>
                        <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style="background:${stage.color}22;color:${stage.color}">${stage.label}</span>
                    </a>
                </li>`;
            }).join('');
        }, 300);
    });
}
