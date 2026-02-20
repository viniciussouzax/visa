
// ============================================================
// DS-160 AI - Dashboard Logic (Standalone SPA)
// ============================================================

const SUPABASE_URL = "https://zcpvknzktfmotvrybxdf.supabase.co";
const ANON_KEY = "sb_publishable_nnTiqMnGmFv1U2NWVu5Izw_MG3O_tkF";
const PAGE_SIZE = 10;

// State
let state = {
    companyId: null,
    userRole: 'assessor',
    userId: null,
    selectedApp: null, // Full applicant object
    currentAppPage: 0,
    currentCompanyPage: 0,
    selectedCompanyMaster: null,
    userEmail: null
};

// --- DOM Elements ---
const dom = {
    views: document.querySelectorAll('.view'),
    navItems: document.querySelectorAll('.nav-item'),
    userEmail: document.getElementById('user-email'),
    userRole: document.getElementById('user-role'),
    orgName: document.getElementById('org-name'),
    btnLogout: document.getElementById('btn-logout'),
    loadingOverlay: document.getElementById('loading-overlay'),

    // Login
    loginContainer: document.getElementById('login-container'),
    loginEmail: document.getElementById('login-email'),
    loginPass: document.getElementById('login-pass'),
    btnLogin: document.getElementById('btn-login'),
    loginMsg: document.getElementById('login-msg'),
    sidebar: document.getElementById('sidebar'), // Hide on login
    main: document.getElementById('main'),       // Hide on login

    // Apps View
    listApps: document.getElementById('list-apps'),
    inpSearch: document.getElementById('app-search'),
    btnPrevApp: document.getElementById('app-prev'),
    btnNextApp: document.getElementById('app-next'),
    txtPageApp: document.getElementById('app-page-txt'),

    // Action Panel
    selName: document.getElementById('sel-name'),
    btnFill: document.getElementById('btn-fill'),

    // Master View
    listCompanies: document.getElementById('list-companies'),
    listStaff: document.getElementById('list-master-staff'),
    btnPrevMaster: document.getElementById('master-prev'),
    btnNextMaster: document.getElementById('master-next'),
    txtPageMaster: document.getElementById('master-page-txt'),

    // Master Actions
    inpNewOrg: document.getElementById('new-org-name'),
    inpNewCnpj: document.getElementById('new-org-cnpj'),
    btnCreateOrg: document.getElementById('btn-create-org'),

    // Invites
    boxInvite: document.getElementById('box-invite-member'),
    inpInvName: document.getElementById('invite-name'),
    inpInvEmail: document.getElementById('invite-email'),
    inpInvPass: document.getElementById('invite-pass'),
    btnSendInvite: document.getElementById('btn-send-invite'),

    // Global Settings
    inpCapmonster: document.getElementById('capmonster-key'),
    btnSaveSettings: document.getElementById('btn-save-settings'),

    // Toasts
    toasts: document.getElementById('toast-container')
};

// --- API Service ---
async function api(path, method = 'GET', body = null) {
    try {
        const session = await getSession();
        if (!session) {
            handleLogout(); // Show Login
            return null;
        }

        const options = {
            method,
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, options);
        const data = await res.json();

        if (!res.ok || (data && data.error)) {
            if (res.status === 401) {
                notify("Sessão expirada.", "error");
                handleLogout();
                return null;
            }
            const msg = (data && (data.message || data.error_description)) || "Erro na operação";
            notify(msg, "error");
            console.error("API Error:", data);
            return null;
        }
        return data;
    } catch (e) {
        console.error(e);
        notify("Erro de conexão.", "error");
        return null;
    }
}

async function invokeFunction(name, body) {
    try {
        const session = await getSession();
        if (!session) {
            handleLogout();
            return null;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) {
                handleLogout();
                return null;
            }
            const errMsg = data.error || (data.details ? JSON.stringify(data.details) : "Erro na função.");
            notify(`Erro: ${errMsg}`, "error"); // Show specific error
            console.error("Function Error:", data);
            return null;
        }
        return data;
    } catch (e) {
        console.error(e);
        notify(`Erro: ${e.message}`, "error");
        return null;
    }
}

// --- Auth Helpers ---
async function getSession() {
    return new Promise(r => chrome.storage.local.get(['session'], res => r(res.session)));
}

async function login(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error.message);

    await chrome.storage.local.set({ session: data, user: data.user });
    return data;
}

// --- Init & View Logic ---
async function init() {
    const session = await getSession();

    if (!session) {
        showLogin();
        return;
    }

    showAppUI();

    state.userId = session.user.id;
    state.userEmail = session.user.email;
    dom.userEmail.innerText = state.userEmail;

    // Fetch Role/Company
    const members = await api(`members?user_id=eq.${state.userId}&select=company_id,role,companies(name,active)`);

    if ((members && members.length > 0) || state.userEmail === 'bra920618@gmail.com') {
        if (!members || members.length === 0) {
            // Master Fallback (Super Admin has no company)
            state.userRole = 'master';
            dom.orgName.innerText = "MASTER ADMIN";
            dom.orgName.classList.add('role-master');
            notify("Modo Master Ativado", "success");
        } else {
            const company = members[0].companies;

            // SECURITY CHECK: Company Active?
            if (company && company.active === false) {
                dom.loadingOverlay.innerHTML = `
                    <div style="text-align:center; color:#ef4444;">
                        <h3>🚫 Acesso Bloqueado</h3>
                        <p>Sua organização está inativa.</p>
                        <button onclick="handleLogout()" class="btn-secondary" style="margin-top:10px;">Voltar</button>
                    </div>
                `;
                return;
            }

            state.companyId = members[0].company_id;
            state.userRole = members[0].role;
            dom.orgName.innerText = company?.name || "Agência";
        }

        dom.userRole.innerText = state.userRole.toUpperCase();

        // Reveal Master Tab
        if (state.userRole === 'master' || state.userEmail === 'bra920618@gmail.com') {
            document.getElementById('nav-master').classList.remove('hide');
        }

        dom.loadingOverlay.style.display = 'none';
        document.querySelector('.view.active') ? null : showView('view-apps');
        loadApps();
        loadGlobalSettings();
    } else {
        dom.loadingOverlay.innerHTML = '<p>Usuário sem organização vinculada.</p>';
        notify("Conta sem vínculo.", "error");
    }
}

function showLogin() {
    dom.loginContainer.style.display = 'flex';
    dom.sidebar.classList.add('hide'); // Helper class needed or direct style
    dom.sidebar.style.display = 'none';
    dom.main.style.display = 'none';
}

function showAppUI() {
    dom.loginContainer.style.display = 'none';
    dom.sidebar.classList.remove('hide'); // Fix: remove hide class if present
    dom.sidebar.style.display = 'flex';
    dom.main.classList.remove('hide'); // consistency
    dom.main.style.display = 'flex';
}

function handleLogout() {
    chrome.storage.local.remove(['session'], () => {
        state = { ...state, userId: null, companyId: null };
        showLogin();
    });
}

// Login Event
dom.btnLogin.onclick = async () => {
    const email = dom.loginEmail.value.trim();
    const pass = dom.loginPass.value.trim();
    if (!email || !pass) return;

    dom.btnLogin.disabled = true;
    dom.btnLogin.innerText = "Entrando...";
    dom.loginMsg.innerText = "";

    try {
        await login(email, pass);
        // Success
        init();
    } catch (e) {
        dom.loginMsg.innerText = "Erro: " + e.message;
    } finally {
        dom.btnLogin.disabled = false;
        dom.btnLogin.innerText = "Entrar";
    }
}

dom.btnLogout.onclick = () => {
    if (confirm("Deseja sair?")) handleLogout();
};

// --- Navigation ---
dom.navItems.forEach(item => {
    item.onclick = () => {
        dom.navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        showView(item.dataset.view);
    };
});

function showView(viewId) {
    dom.views.forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    const titleMap = {
        'view-apps': 'Solicitantes',
        'view-import': 'Importar Solicitantes',
        'view-master': 'Painel Master'
    };
    document.getElementById('page-title').innerText = titleMap[viewId] || viewId;

    if (viewId === 'view-master') loadCompanies();
    if (viewId === 'view-import') loadOrphans();
}

// ============================================================
// FEATURE: APPLICANTS
// ============================================================
async function loadApps(query = "") {
    dom.listApps.innerHTML = '<div class="loader"></div>';

    const offset = state.currentAppPage * PAGE_SIZE;
    let path = `applicants?company_id=eq.${state.companyId}&select=*&primary_applicant_id=is.null&order=full_name&limit=${PAGE_SIZE}&offset=${offset}`;

    if (query) {
        path += `&or=(full_name.ilike.*${query}*,passport_number.ilike.*${query}*)`;
    }

    const data = await api(path);
    dom.listApps.innerHTML = '';

    if (!data || data.length === 0) {
        dom.listApps.innerHTML = '<div class="empty-state">Nenhum registro encontrado.</div>';
        return;
    }

    data.forEach(a => {
        const el = document.createElement('div');
        el.className = 'list-item';

        // Try to find email in data, duplicate full_name if not found for now
        const email = a.data?.addressPhone?.email || a.data?.contact?.email || 'Sem Email';

        el.innerHTML = `
            <div>
                <div class="primary-text">${a.full_name}</div>
                <div class="meta-text">${email}</div>
            </div>
            <div style="font-size:11px; opacity:0.5;">➡️</div>
        `;
        el.onclick = () => selectApp(a, el);
        dom.listApps.appendChild(el);
    });

    dom.txtPageApp.innerText = `Pg ${state.currentAppPage + 1}`;
    dom.btnPrevApp.disabled = state.currentAppPage === 0;
    dom.btnNextApp.disabled = data.length < PAGE_SIZE;
}

// ============================================================
// FEATURE: APPLICATIONS (DS-160)
// ============================================================

// DOM Elements for Apps
const domApps = {
    list: document.getElementById('list-applications'),
    btnNew: document.getElementById('btn-new-app'),
    actions: document.getElementById('app-actions'),
    selId: document.getElementById('sel-app-id'),
    btnFill: document.getElementById('btn-fill'),
    btnCopy: document.getElementById('btn-copy-id'),
    btnDel: document.getElementById('btn-del-app')
};

// Search & Pagination
let debounce;
dom.inpSearch.oninput = (e) => {
    clearTimeout(debounce);
    const q = e.target.value.trim();
    debounce = setTimeout(() => {
        state.currentAppPage = 0;
        loadApps(q);
    }, 400);
};
dom.btnNextApp.onclick = () => { state.currentAppPage++; loadApps(dom.inpSearch.value.trim()); };
dom.btnPrevApp.onclick = () => { state.currentAppPage--; loadApps(dom.inpSearch.value.trim()); };

// Select Applicant -> Load Applications
function selectApp(app, el) {
    document.querySelectorAll('#list-apps .list-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedApp = app;
    state.selectedApplication = null;
    state.effectiveApplicant = app; // Reset effective to primary initially

    // domApps.btnNew.disabled = false; // Disabled by user request
    domApps.actions.style.display = 'none';
    loadApplications(app.id);
}

async function loadApplications(applicantId) {
    domApps.list.innerHTML = '<div class="loader"></div>';

    // 1. Fetch Primary Apps
    const apps = await api(`applications?applicant_id=eq.${applicantId}&order=created_at.desc`);

    // 2. Fetch Dependents (and their applications if possible, or we fetch later)
    // We'll fetch dependents first, then their apps. 
    // Optimization: filtering applicants with primary_applicant_id.
    const dependents = await api(`applicants?primary_applicant_id=eq.${applicantId}&select=id,full_name,passport_number,data`);

    domApps.list.innerHTML = '';
    let hasContent = false;

    // Render Primary Apps
    if (apps && apps.length > 0) {
        const title = document.createElement('div');
        title.className = 'list-header';
        title.innerHTML = '📋 Aplicações (Principal)';
        title.style.cssText = 'padding:10px; font-weight:bold; background:#e2e8f0; margin-bottom:5px; border-radius:4px; font-size:12px;';
        domApps.list.appendChild(title);

        apps.forEach(app => renderApplicationItem(app, state.selectedApp));
        hasContent = true;
    } else {
        // Option to create new for primary
        const btn = document.createElement('button');
        btn.innerText = 'Criar Aplicação (Principal)';
        btn.className = 'btn-secondary';
        btn.style.width = '100%';
        btn.style.marginBottom = '10px';
        btn.onclick = () => createApplicationFor(state.selectedApp);
        domApps.list.appendChild(btn);
    }

    // Render Dependents
    if (dependents && dependents.length > 0) {
        const title = document.createElement('div');
        title.className = 'list-header';
        title.innerHTML = '👨‍👩‍👧 Dependentes';
        title.style.cssText = 'padding:10px; font-weight:bold; background:#e2e8f0; margin-top:15px; margin-bottom:5px; border-radius:4px; font-size:12px;';
        domApps.list.appendChild(title);

        for (const dep of dependents) {
            // Fetch apps for this dependent
            const depApps = await api(`applications?applicant_id=eq.${dep.id}&order=created_at.desc`);

            const depContainer = document.createElement('div');
            depContainer.style.cssText = 'border-left: 3px solid #cbd5e1; padding-left: 10px; margin-bottom: 10px;';

            const depHeader = document.createElement('div');
            depHeader.innerText = `${dep.full_name}`;
            depHeader.style.cssText = 'font-weight:bold; font-size:13px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;';

            // Add 'New App' button for dependent small
            const btnNewDep = document.createElement('button');
            btnNewDep.innerText = '+ Nova';
            btnNewDep.style.cssText = 'font-size:10px; padding:2px 6px; cursor:pointer;';
            btnNewDep.onclick = (e) => { e.stopPropagation(); createApplicationFor(dep); };
            depHeader.appendChild(btnNewDep);

            depContainer.appendChild(depHeader);

            if (depApps && depApps.length > 0) {
                depApps.forEach(app => {
                    const el = createApplicationElement(app, dep);
                    depContainer.appendChild(el);
                });
            } else {
                const empty = document.createElement('div');
                empty.innerText = 'Sem aplicações';
                empty.style.cssText = 'font-size:11px; color:#64748b; font-style:italic;';
                depContainer.appendChild(empty);
            }
            domApps.list.appendChild(depContainer);
        }
        hasContent = true;
    }

    if (!hasContent && (!apps || apps.length === 0)) {
        domApps.list.innerHTML = '<div class="empty-state">Nenhuma aplicação encontrada.</div>';
    }
}

// Helper to create the DOM element for an application
function createApplicationElement(app, applicant) {
    const el = document.createElement('div');
    el.className = 'list-item';

    const statusColors = {
        'pending': '#fbbf24',
        'in_progress': '#3b82f6',
        'completed': '#22c55e',
        'error': '#ef4444'
    };
    const color = statusColors[app.status] || '#94a3b8';
    const date = new Date(app.created_at).toLocaleDateString('pt-BR');
    const aaId = app.application_id || 'AA--------';

    // Passport info from the passed applicant object
    const passport = applicant.passport_number ||
        applicant.data?.passport?.number ||
        applicant.data?.personal?.passport ||
        'Sem Passaporte';

    el.innerHTML = `
        <div style="flex:1;">
            <div class="meta-text" style="font-family:monospace; font-size:12px;">ID: ${aaId}</div>
            <div class="meta-text" style="font-size:10px;">${date}</div>
        </div>
        <div style="text-align:right;">
             <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:${color}20; color:${color}; border:1px solid ${color};">
                ${app.status === 'in_progress' ? 'Andamento' : (app.status === 'completed' ? 'Concluído' : 'Pendente')}
            </span>
        </div>
    `;
    el.onclick = () => selectApplication(app, el, applicant);
    return el;
}

// Stub for creating new app (since we removed btnNew logic partially)
async function createApplicationFor(applicant) {
    if (!confirm(`Criar nova aplicação DS-160 para ${applicant.full_name}?`)) return;

    // Create App logic refactored from btnNew
    notify("Criando aplicação...", "info");
    const res = await api('applications', 'POST', {
        applicant_id: applicant.id,
        status: 'pending',
        ds160_city: 'SPL' // Default
    });

    if (res && res.length > 0) {
        notify("Aplicação criada!", "success");
        loadApplications(state.selectedApp.id); // Reload all
    }
}

// Replaces the old loop renderer
function renderApplicationItem(app, applicant) {
    const el = createApplicationElement(app, applicant);
    domApps.list.appendChild(el);
}

function selectApplication(application, el, applicantOverride = null) {
    document.querySelectorAll('#list-applications .list-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedApplication = application;
    state.effectiveApplicant = applicantOverride || state.selectedApp;

    domApps.actions.style.display = 'block';
    domApps.selId.innerText = application.application_id || "Novo Processo";

    const ownerName = state.effectiveApplicant.full_name.split(' ')[0];
    domApps.btnFill.innerHTML = application.application_id ? `▶ Continuar (${ownerName})` : `🚀 Iniciar (${ownerName})`;
}

// Actions
domApps.btnCopy.onclick = () => {
    if (state.selectedApplication?.application_id) {
        navigator.clipboard.writeText(state.selectedApplication.application_id);
        notify("ID copiado!", "success");
    }
};

domApps.btnDel.onclick = async () => {
    if (!state.selectedApplication) return;

    // Safety Check
    const appId = state.selectedApplication.application_id || 'Novo (Sem ID)';
    if (!confirm(`Tem certeza que deseja EXCLUIR a aplicação [${appId}]?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    notify("Excluindo aplicação...", "info");

    const res = await api(`applications?id=eq.${state.selectedApplication.id}`, 'DELETE');

    if (res || res === null) { // DELETE often returns null body or 204
        notify("Aplicação excluída com sucesso.", "success");
        state.selectedApplication = null;
        domApps.actions.style.display = 'none';
        loadApplications(state.selectedApp.id);
    }
};

// AUTOMATION TRIGGER (Smart Tab Management)
domApps.btnFill.onclick = async () => {
    const applicant = state.effectiveApplicant || state.selectedApp;
    if (!applicant || !state.selectedApplication) {
        notify("Selecione um solicitante e uma aplicação primeiro.", "error");
        return;
    }

    notify("⏳ Iniciando automação...", "info");

    // Persist status for auto-resume after reloads/navigation
    await chrome.storage.local.set({
        active_applicant: applicant,
        active_application: state.selectedApplication,
        automation_enabled: true
    });

    const DS160_URL = "https://ceac.state.gov/GenNIV/Default.aspx";
    // Using glob to match any DS-160 page
    const tabs = await chrome.tabs.query({ url: "*://ceac.state.gov/GenNIV/*" });
    let targetTab = tabs.length > 0 ? tabs[0] : null;
    let needsLoad = false;

    if (targetTab) {
        console.log("Existing tab found:", targetTab.id);
        // Switch to existing tab
        await chrome.tabs.update(targetTab.id, { active: true });
        await chrome.windows.update(targetTab.windowId, { focused: true });
    } else {
        console.log("Creating new tab...");
        // Create new tab
        notify("Abrindo nova aba do DS-160...", "info");
        targetTab = await chrome.tabs.create({ url: DS160_URL, active: true });
        needsLoad = true;
    }

    // Function to communicate with content script
    const executeAutomation = () => {
        const payload = {
            action: "FILL_FORM",
            applicant: state.effectiveApplicant || state.selectedApp,
            application: state.selectedApplication
        };

        console.log("Sending payload to tab:", targetTab.id, payload);
        notify("🔄 Conectando ao formulário...", "info");

        let attempts = 0;
        const maxAttempts = 15;

        const send = () => {
            chrome.tabs.sendMessage(targetTab.id, payload, (response) => {
                if (chrome.runtime.lastError) {
                    attempts++;
                    console.warn(`Attempt ${attempts}/${maxAttempts}: Content Script not ready.`, chrome.runtime.lastError.message);
                    if (attempts < maxAttempts) {
                        // On 3rd attempt, try injecting content script programmatically
                        if (attempts === 3) {
                            console.log("Injecting content script programmatically...");
                            chrome.scripting?.executeScript?.({
                                target: { tabId: targetTab.id },
                                files: ['content.js']
                            }).catch(e => console.warn("Injection failed:", e.message));
                        }
                        setTimeout(send, 2000); // Retry every 2s
                    } else {
                        console.error("Max attempts reached.");
                        alert("ERRO: Não foi possível conectar ao formulário DS-160.\n\n1. Verifique se a página carregou completamente.\n2. Tente recarregar a página do DS-160 manualmente.\n3. Clique em 'Preencher' novamente.");
                    }
                } else {
                    console.log("Response received:", response);
                    notify(`✅ Automação iniciada!`, "success");

                    // Update status if pending
                    if (state.selectedApplication.status === 'pending') {
                        api(`applications?id=eq.${state.selectedApplication.id}`, 'PATCH', { status: 'in_progress' })
                            .then(() => loadApplications(state.selectedApp.id));
                    }
                }
            });
        };
        send();
    };

    if (needsLoad) {
        // Wait for tab to finish loading
        const listener = (tabId, info) => {
            if (tabId === targetTab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                console.log("Tab load complete. Waiting 3s for script init...");
                notify("Aguardando carregamento da página...", "info");
                // Give a generous buffer for content script to init
                setTimeout(executeAutomation, 3000);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    } else {
        // Already open, run immediately
        console.log("Tab already open, executing immediately.");
        executeAutomation();
    }
};

// ============================================================
// FEATURE: IMPORT ORPHAN APPLICANTS
// ============================================================
async function loadOrphans() {
    const list = document.getElementById('list-orphans');
    if (!list) return;
    list.innerHTML = '<div class="loader"></div>';

    const data = await api('applicants?company_id=is.null&primary_applicant_id=is.null&select=*&order=created_at.desc&limit=50');
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum solicitante pendente de vinculação.</div>';
        return;
    }

    data.forEach(a => {
        const email = a.data?.addressPhone?.email || 'Sem email';
        const passport = a.passport_number || 'Sem passaporte';
        const createdAt = a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '';

        const el = document.createElement('div');
        el.className = 'list-item';
        el.style.cursor = 'default';
        el.innerHTML = `
            <div style="flex:1">
                <div class="primary-text">${a.full_name}</div>
                <div class="meta-text">${email} · ${passport} · ${createdAt}</div>
            </div>
            <button class="btn btn-primary" style="padding:6px 14px; font-size:12px; white-space:nowrap;"
                onclick="claimApplicant('${a.id}', this)">✅ Vincular</button>
        `;
        list.appendChild(el);
    });
}

async function claimApplicant(applicantId, btn) {
    if (!state.companyId) {
        notify('Empresa não identificada. Faça login novamente.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳...';

    // 1. Update the primary applicant
    const res = await api(`applicants?id=eq.${applicantId}`, 'PATCH', {
        company_id: state.companyId,
        responsible_id: state.userId
    });

    if (res) {
        // 2. Also update any dependents linked to this primary
        await api(`applicants?primary_applicant_id=eq.${applicantId}`, 'PATCH', {
            company_id: state.companyId,
            responsible_id: state.userId
        });

        notify('Solicitante vinculado com sucesso!', 'success');
        loadOrphans();
        loadApps(); // Refresh main list
    } else {
        btn.disabled = false;
        btn.textContent = '✅ Vincular';
    }
}

// Wire up refresh button
document.getElementById('btn-refresh-orphans')?.addEventListener('click', loadOrphans);

// ============================================================
// FEATURE: MASTER ADMIN
// ============================================================
async function loadCompanies() {
    dom.listCompanies.innerHTML = '<div class="loader"></div>';
    const offset = state.currentCompanyPage * PAGE_SIZE;
    const data = await api(`companies?select=*&order=name&limit=${PAGE_SIZE}&offset=${offset}`);

    dom.listCompanies.innerHTML = '';

    if (!data || data.length === 0) {
        dom.listCompanies.innerHTML = '<div class="empty-state">Nenhuma organização.</div>';
        return;
    }

    data.forEach(c => {
        const el = document.createElement('div');
        el.className = 'list-item';

        // Status Check
        const isActive = c.active !== false; // Default true if null

        // Build UI elements securely
        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';

        infoDiv.innerHTML = `
            <div class="primary-text" style="${!isActive ? 'opacity:0.5' : ''}">
                ${c.name}
                ${!isActive ? '<span class="status-badge status-inactive">Inativa</span>' : ''}
            </div>
            <div class="meta-text">${c.cnpj || 'Sem CNPJ'}</div>
        `;

        const actionDiv = document.createElement('div');
        actionDiv.style.display = 'flex';
        actionDiv.style.alignItems = 'center';
        actionDiv.style.gap = '10px';

        const label = document.createElement('label');
        label.className = 'switch';
        label.onclick = (e) => e.stopPropagation();

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isActive;
        checkbox.onchange = (e) => toggleCompanyVerified(c.id, e.target.checked);

        const slider = document.createElement('span');
        slider.className = 'slider';

        label.appendChild(checkbox);
        label.appendChild(slider);
        actionDiv.appendChild(label);

        el.appendChild(infoDiv);
        el.appendChild(actionDiv);

        el.onclick = () => selectCompany(c, el);
        dom.listCompanies.appendChild(el);
    });
}

async function toggleCompanyVerified(id, status) {
    const res = await api(`companies?id=eq.${id}`, 'PATCH', { active: status });
    if (res) {
        notify(`Empresa ${status ? 'Ativada' : 'Desativada'}`, "success");
        loadCompanies(); // Refresh UI
    }
}

function selectCompany(company, el) {
    document.querySelectorAll('#list-companies .list-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedCompanyMaster = company;

    dom.boxInvite.style.display = 'block';
    loadStaff(company.id);
}

async function loadStaff(cid) {
    dom.listStaff.innerHTML = '<div class="loader"></div>';
    const data = await api(`rpc/get_company_members`, 'POST', { target_company_id: cid });
    dom.listStaff.innerHTML = '';

    if (!data || data.length === 0) {
        dom.listStaff.innerHTML = '<div class="empty-state">Nenhum membro.</div>';
        return;
    }

    data.forEach(m => {
        const el = document.createElement('div');
        el.className = 'list-item';

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.innerHTML = `
            <span style="font-family:monospace; display:block; font-size:12px;">${m.email || 'ID:' + m.user_id.substr(0, 8)}</span>
            <span style="font-size:10px; padding:2px 8px; background:#e2e8f0; border-radius:10px;">${m.role}</span>
        `;

        const btnRemove = document.createElement('button');
        btnRemove.className = 'btn-icon-sm';
        btnRemove.title = 'Remover Membro';
        btnRemove.innerText = '🗑️';
        btnRemove.onclick = (e) => {
            e.stopPropagation();
            removeMember(m.user_id, cid);
        };

        el.appendChild(infoDiv);
        el.appendChild(btnRemove);
        dom.listStaff.appendChild(el);
    });
}

async function removeMember(uid, cid) {
    if (!confirm("Tem certeza que deseja remover este membro da agência?")) return;

    // Delete from members table
    const res = await api(`members?user_id=eq.${uid}&company_id=eq.${cid}`, 'DELETE');

    if (res) {
        notify("Membro removido com sucesso.", "success");
        loadStaff(cid); // Refresh list
    }
}

// Master Buttons
dom.btnCreateOrg.onclick = async () => {
    const name = dom.inpNewOrg.value.trim();
    const cnpj = dom.inpNewCnpj.value.trim();
    if (!name) return notify("Nome obrigatório.", "error");

    const res = await api('companies', 'POST', { name, cnpj });
    if (res) {
        notify("Agência criada!", "success");
        dom.inpNewOrg.value = '';
        dom.inpNewCnpj.value = '';
        loadCompanies();
    }
};

dom.btnSendInvite.onclick = async () => {
    const name = dom.inpInvName.value.trim();
    const email = dom.inpInvEmail.value.trim();
    const pass = dom.inpInvPass.value.trim();

    if (!name || !email || !pass) return notify("Preencha todos os campos.", "error");

    notify("Criando usuário...", "info");

    const res = await invokeFunction('invite-user', {
        name, email, password: pass,
        company_id: state.selectedCompanyMaster.id,
        role: 'assessor'
    });

    if (res) {
        notify("Usuário criado com sucesso!", "success");
        dom.inpInvName.value = '';
        dom.inpInvEmail.value = '';
        dom.inpInvPass.value = '';
        loadStaff(state.selectedCompanyMaster.id);
    }
};

// --- Settings Management ---
async function loadGlobalSettings() {
    const data = await api(`settings?key_name=eq.capmonster_key&select=key_value`);
    if (data && data.length > 0) {
        if (dom.inpCapmonster) dom.inpCapmonster.value = data[0].key_value;
        // Sync to local storage for content script
        chrome.storage.local.set({ capmonster_key: data[0].key_value });
    }
}

dom.btnSaveSettings.onclick = async () => {
    const key = dom.inpCapmonster.value.trim();
    if (!key) return notify("Chave obrigatória.", "error");

    notify("Salvando configurações...", "info");

    // Upsert logic: check if exists
    const existing = await api(`settings?key_name=eq.capmonster_key`);
    let res;
    if (existing && existing.length > 0) {
        res = await api(`settings?id=eq.${existing[0].id}`, 'PATCH', { key_value: key });
    } else {
        res = await api(`settings`, 'POST', { key_name: 'capmonster_key', key_value: key });
    }

    if (res || res === null) {
        notify("Configurações salvas!", "success");
        chrome.storage.local.set({ capmonster_key: key });
    }
};

// --- Notifications ---
function notify(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span> <span>&times;</span>`;
    toast.onclick = () => toast.remove();
    dom.toasts.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Start
init();
