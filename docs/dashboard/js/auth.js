// ============================================================
// DS160 EXPRESSO — Auth Module (shared)
// ============================================================
const SB_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
const sb = supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);

// Inject page loader
(function () {
    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = '<img src="../images/logo-sends160.png" class="logo-pulse" alt="SENDS160">';
    document.body.prepend(loader);
})();

// ============================================================
// STATE
// ============================================================
let currentUser = null;
let isMaster = false;
let userCompanyId = null;
let userCompanyShortId = null;

// ============================================================
// CONSTANTS
// ============================================================
const STAGES = {
    new: { label: 'Novo', color: '#9ca3af' },
    review: { label: 'Revisão', color: '#f59e0b' },
    approved: { label: 'Aprovado', color: '#3b82f6' },
    done: { label: 'Concluído', color: '#22c55e' },
    archived: { label: 'Arquivado', color: '#4b5563' }
};

const STAGE_ORDER = ['new', 'review', 'approved', 'done', 'archived'];

const FILL_STAGES = {
    pending: { label: 'Aguardando', color: '#6b7280' },
    filling: { label: 'Preenchendo', color: '#3b82f6' },
    filled: { label: 'Preenchido', color: '#22c55e' },
    error: { label: '🛑 Erro', color: '#ef4444' },
    needs_attention: { label: '⚠️ Atenção', color: '#f59e0b' },
    system_error: { label: '🔧 Erro Sistema', color: '#7c3aed' },
};

const PRIORITIES = {
    0: { label: 'Normal', icon: '', color: '#22c55e' },
    1: { label: 'Normal', icon: '', color: '#22c55e' },
    2: { label: 'Urgente', icon: '', color: '#f59e0b' },
    3: { label: 'Emergência', icon: '', color: '#ef4444' },
};

const PAGE_SIZE = 25;

// ============================================================
// HELPERS
// ============================================================
function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

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

function hideLoader() {
    const loader = $('page-loader');
    if (loader) loader.classList.add('hidden');
}

// ============================================================
// AUTH GUARD — checks session, redirects to login if needed
// ============================================================
async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        // Redirect to login page
        window.location.href = 'login.html';
        return false;
    }
    currentUser = session.user;

    // Load role
    const { data: masterData } = await sb.rpc('is_master');
    isMaster = !!masterData;

    // Load company
    const { data: memberData } = await sb.from('members').select('company_id').eq('user_id', currentUser.id).single();
    if (memberData) {
        userCompanyId = memberData.company_id;
        const { data: companyData } = await sb.from('companies').select('short_id').eq('id', userCompanyId).single();
        if (companyData) userCompanyShortId = companyData.short_id;
    }

    // Keep session alive
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) currentUser = session.user;
        if (event === 'SIGNED_OUT') window.location.href = 'login.html';
    });

    return true;
}

async function logout() {
    await sb.auth.signOut();
    window.location.href = 'login.html';
}
