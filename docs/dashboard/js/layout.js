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
    pipeline: 'Solicitante',
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
        { view: 'pipeline', label: 'Solicitante', href: 'index.html', icon: '<path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" /><path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />' },
        { view: 'archived', label: 'Arquivados', href: 'archived.html', icon: '<path d="M2 0a2 2 0 0 0-2 2v2h16V2a2 2 0 0 0-2-2H2ZM0 6v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6H0Zm5 2h6a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Z" />' },
        { view: 'software', label: 'Software', href: 'software.html', icon: '<path d="M3.414 2L9 7.586V16H7V8.414l-5-5V6H0V0h6v2H3.414ZM15 0v6h-2V3.414l-3.172 3.172-1.414-1.414L11.586 2H9V0h6Z" />' },
        { view: 'master', label: 'Master', href: 'master.html', masterOnly: true, icon: '<path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8Zm4 11H4V9h8v2Zm0-4H4V5h8v2Z" />' }
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
                    <span class="text-lg font-bold text-violet-500">DS160 Expresso</span>
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
                            <svg class="shrink-0 fill-current ${isActive ? 'text-violet-500' : ''}" width="16" height="16" viewBox="0 0 16 16">${n.icon}</svg>
                            <span class="ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">${n.label}</span>
                        </a></li>`;
    }).join('')}
                </ul>
            </nav>
            <div class="mt-auto px-3 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                <div class="flex items-center justify-between mb-2">
                    <div class="truncate">
                        <span id="user-email" class="text-xs font-medium text-gray-500 dark:text-gray-400 truncate block lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">${currentUser?.email || ''}</span>
                        <span id="user-role-display" class="text-[10px] font-bold text-violet-500 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">${isMaster ? 'MASTER' : 'MEMBRO'}</span>
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
                <div class="flex items-center gap-3">
                    <button class="text-gray-500 hover:text-gray-600 lg:hidden" @click.stop="sidebarOpen = !sidebarOpen">
                        <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
                    </button>
                    <div>
                        <h1 id="page-title" class="text-xl font-bold text-gray-800 dark:text-gray-100">${PAGE_TITLES[CURRENT_PAGE] || 'Dashboard'}</h1>
                        <p id="page-subtitle" class="text-xs text-gray-500 dark:text-gray-400"></p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
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
}
