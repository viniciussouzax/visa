        // ==========================================
        // THEME
        // ==========================================
        function toggleTheme() { }
        function updateThemeUI() { }
        (function () { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('ds160-theme', 'light'); })();

        // ==========================================
        // SUPABASE CONFIG (via AppCore)
        // ==========================================
        const SUPABASE_URL = AppCore.SUPABASE_URL;
        const SUPABASE_KEY = AppCore.SUPABASE_KEY;
        let _authToken = AppCore.getAuth();
        let _orgParam = AppCore.getOrg();
        let resolvedCompanyId = null;
        let resolvedCompanyName = null;
        let sbFetch = AppCore.sbFetch;
        let sbGet = AppCore.sbGet;

        /** Build form URL: id + tab (assessor/solicitante) with auth/org */
        function buildUrl(id, tab) {
            const params = {};
            if (tab) params.tab = tab;
            if (_orgParam) params.org = _orgParam;
            return AppCore.buildFormUrl(id, params);
        }

        // ==========================================
        // STATUS MAPPING
        // ==========================================
        const AVATARS_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

        function calcProgress(data) {
            if (!data || typeof data !== 'object' || !window.DS160_SCHEMA) return 0;
            let total = 0, filled = 0;
            DS160_SCHEMA.sections.forEach(sec => {
                sec.fields.forEach(f => {
                    if (f.type === 'array') return; // skip arrays
                    total++;
                    const val = data[sec.id] && data[sec.id][f.id];
                    if (val !== undefined && val !== null && val !== '' && val !== 'N/S') filled++;
                });
            });
            return total > 0 ? Math.round((filled / total) * 100) : 0;
        }

        // #10 fix: XSS sanitization helper
        function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

        const MOJIBAKE_RE = /(?:[\u00c2\u00c3\u00e2\u00f0][\u0080-\u00ff]|\u00fffd)/;
        let _isNormalizingMojibake = false;
        let _mojibakeObserver = null;

        function decodeMojibakeText(input) {
            if (!input || typeof input !== 'string' || !MOJIBAKE_RE.test(input)) return input;
            let output = input;
            for (let i = 0; i < 4; i++) {
                try {
                    const bytes = Uint8Array.from([...output].map((ch) => ch.charCodeAt(0) & 0xff));
                    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                    if (!decoded || decoded === output) break;
                    output = decoded;
                } catch (_) {
                    break;
                }
            }
            return output
                .replace(/\u00c2\u00a0/g, ' ')
                .replace(/\u00e2\u0080\u0093/g, '\u2013')
                .replace(/\u00e2\u0080\u0094/g, '\u2014')
                .replace(/\u00e2\u0080\u00a6/g, '\u2026')
                .replace(/\u00e2\u0080\u0098/g, "'")
                .replace(/\u00e2\u0080\u0099/g, "'")
                .replace(/\u00e2\u0080\u009c/g, '"')
                .replace(/\u00e2\u0080\u009d/g, '"')
                .replace(/\u00e2\u0086\u0090/g, '\u2190')
                .replace(/\u00e2\u0086\u0092/g, '\u2192');
        }

        function normalizeDashboardText(root = document.body) {
            if (!root || _isNormalizingMojibake) return;
            _isNormalizingMojibake = true;
            try {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                const textNodes = [];
                while (walker.nextNode()) textNodes.push(walker.currentNode);
                textNodes.forEach((node) => {
                    const current = node.nodeValue || '';
                    const fixed = decodeMojibakeText(current);
                    if (fixed !== current) node.nodeValue = fixed;
                });
                const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll('*')] : [];
                elements.forEach((el) => {
                    ['title', 'aria-label', 'placeholder', 'alt'].forEach((attr) => {
                        const value = el.getAttribute && el.getAttribute(attr);
                        if (!value) return;
                        const fixed = decodeMojibakeText(value);
                        if (fixed !== value) el.setAttribute(attr, fixed);
                    });
                });
            } finally {
                _isNormalizingMojibake = false;
            }
        }

        function installDashboardTextNormalizer() {
            if (!document.body || _mojibakeObserver) return;
            normalizeDashboardText(document.body);
            _mojibakeObserver = new MutationObserver((mutations) => {
                if (_isNormalizingMojibake) return;
                for (const mutation of mutations) {
                    if (mutation.type === 'characterData' && mutation.target?.parentElement) {
                        normalizeDashboardText(mutation.target.parentElement);
                        continue;
                    }
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) normalizeDashboardText(node);
                        if (node.nodeType === Node.TEXT_NODE && node.parentElement) normalizeDashboardText(node.parentElement);
                    });
                }
            });
            _mojibakeObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', installDashboardTextNormalizer, { once: true });
        } else {
            installDashboardTextNormalizer();
        }

        // ==========================================
        // STATE
        // ==========================================
        let applicants = [];
        let currentPage = 'screening';
        let currentFilter = 'all';
        let selectedIds = new Set();
        let searchQuery = '';
        let sortField = 'created';
        let sortDir = 'desc';
        let expandedGroups = new Set();
        let currentAdminSection = 'orgs';
        let currentAdminOrgId = null;
        let canAccessAdminPanel = false;
        let isMasterUser = false;
        const LIST_BATCH_SIZE = 25;
        let visibleRowsCount = LIST_BATCH_SIZE;
        let _listObserver = null;

        const ADMIN_SECTIONS = ['orgs', 'capmonster', 'logs', 'settings'];
        const MASTER_EMAIL = 'bra920618@gmail.com';

        function parseDashboardHash() {
            const raw = (location.hash || '').replace('#', '').trim();
            if (!raw) return { page: 'overview', adminSection: 'orgs', adminOrgId: null };
            const [page, adminSection, adminOrgId] = raw.split(':');
            return {
                page: page || 'overview',
                adminSection: ADMIN_SECTIONS.includes(adminSection) ? adminSection : 'orgs',
                adminOrgId: adminOrgId || null
            };
        }

        function replaceDashboardHash(page, adminSection = currentAdminSection, adminOrgId = currentAdminOrgId) {
            let hash = page;
            if (page === 'admin' && ADMIN_SECTIONS.includes(adminSection)) {
                hash += ':' + adminSection;
                if (adminSection === 'orgs' && adminOrgId) hash += ':' + adminOrgId;
            }
            try { history.replaceState(null, '', location.pathname + location.search + '#' + hash); } catch (e) { }
        }

        function setAdminUiVisibility(visible) {
            canAccessAdminPanel = !!visible;
            const method = visible ? 'remove' : 'add';
            document.getElementById('adminLink')?.classList[method]('hidden');
            document.getElementById('kebabConfigItem')?.classList[method]('hidden');
            document.getElementById('adminNavBtn')?.classList[method]('hidden');
        }

        const STATUS_CONFIG = {
            todo: { label: 'Pendente', class: 'status-pendente' },
            doing: { label: 'Em execu\u00e7\u00e3o', class: 'status-automacao' },
            done: { label: 'Conclu\u00eddo', class: 'status-preenchido' },
            error: { label: 'Erro de dados', class: 'status-erro' },
            retry: { label: 'Repetir', class: 'status-retry' },
            fail: { label: 'Falha t\u00e9cnica', class: 'status-falha' },
            standby: { label: 'Em espera', class: 'status-standby' },
        };


        const RESULT_CONFIG = {
            pending: { label: 'Pendente', color: '#64748b' },
            approved: { label: 'Aprovado', color: '#22c55e' },
            denied: { label: 'Negado', color: '#ef4444' },
            new_interview: { label: 'Nova Entrevista', color: '#3b82f6' },
            additional_documents: { label: 'Docs. Complementares', color: '#f59e0b' },
            administrative: { label: 'Processo Adm.', color: '#8b5cf6' },
        };

        const STAGE_LABELS = {
            screening: 'Triagem', analysis: 'An\u00e1lise', ds160: 'DS-160',
            payment: 'Taxas', scheduling: 'Agendamento',
            interview: 'Entrevista', outcome: 'Resultado', archived: 'Arquivado'
        };

        const STAGE_ORDER = ['screening', 'analysis', 'ds160', 'payment', 'scheduling', 'interview', 'outcome', 'archived'];

        function getOutcomeValue(applicant) {
            if (!applicant) return 'pending';
            if (applicant.result && applicant.result !== 'pending') return applicant.result;
            if (applicant.stage === 'outcome' && RESULT_CONFIG[applicant.status]) return applicant.status;
            return applicant.result || 'pending';
        }

        function getStageIndex(stage) {
            return STAGE_ORDER.indexOf(stage);
        }

        function getNextStage(stage) {
            const idx = getStageIndex(stage);
            if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
            if (stage === 'interview') return null;
            return STAGE_ORDER[idx + 1];
        }

        function getPreviousStage(stage) {
            const idx = getStageIndex(stage);
            if (idx <= 0) return null;
            return STAGE_ORDER[idx - 1];
        }

        function getStageOptions(selectedStage) {
            return STAGE_ORDER
                .map(stage => `<option value="${stage}" ${stage === selectedStage ? 'selected' : ''}>${STAGE_LABELS[stage]}</option>`)
                .join('');
        }

        function getDefaultStatusForStage(stage) {
            if (stage === 'analysis') return 'doing';
            if (stage === 'outcome' || stage === 'archived') return 'done';
            return 'todo';
        }

        function getSortedGroupMembers(list) {
            return [...list].sort((a, b) =>
                (a.sort_order ?? 9999) - (b.sort_order ?? 9999) ||
                (a.created || '').localeCompare(b.created || '')
            );
        }

        function getGroupMembers(groupId, options = {}) {
            const { includeArchived = false, stage = null } = options;
            let members = applicants.filter(a => String(a.group_id) === String(groupId));
            if (!includeArchived) members = members.filter(a => a.stage !== 'archived');
            if (stage) members = members.filter(a => a.stage === stage);
            return getSortedGroupMembers(members);
        }

        function getGroupStageMembers(groupId, stage) {
            return getGroupMembers(groupId, { includeArchived: stage === 'archived', stage });
        }

        function getNextGroupSortOrder(groupId) {
            const members = getGroupMembers(groupId, { includeArchived: true });
            const maxSort = members.reduce((max, m) => Math.max(max, m.sort_order ?? 0), 0);
            return maxSort >= 10 ? maxSort + 10 : (maxSort || 0) + 10;
        }

        async function patchApplicantsLocallyAndRemotely(patches) {
            await Promise.all(patches.map(({ id, patch }) => sbFetch(`applicants?id=eq.${id}`, 'PATCH', patch)));
            patches.forEach(({ id, patch }) => {
                const app = applicants.find(x => x.id === id);
                if (app) Object.assign(app, patch);
            });
        }

        function getGroupJoinValidation(applicantStage, groupId) {
            const groupMembers = getGroupMembers(groupId);
            if (!groupMembers.length) return { ok: false, message: 'Grupo nÃ£o encontrado.' };
            const groupStage = groupMembers[0].stage || 'screening';
            if (groupStage !== applicantStage) {
                return {
                    ok: false,
                    message: `SÃ³ Ã© possÃ­vel vincular na mesma etapa. Grupo em ${STAGE_LABELS[groupStage]} e solicitante em ${STAGE_LABELS[applicantStage] || applicantStage}.`
                };
            }
            return { ok: true, groupStage };
        }

        async function linkApplicantToGroup(applicantId, groupId) {
            const applicant = applicants.find(x => x.id === applicantId);
            if (!applicant) throw new Error('Solicitante nÃ£o encontrado.');

            const validation = getGroupJoinValidation(applicant.stage, groupId);
            if (!validation.ok) throw new Error(validation.message);

            const applicantPatch = {
                group_id: groupId,
                updated_at: new Date().toISOString()
            };

            await patchApplicantsLocallyAndRemotely([{ id: applicantId, patch: applicantPatch }]);
            return { groupStage: validation.groupStage };
        }

        function getGroupAdvanceReadiness(groupId, stage, completedApplicantId) {
            const members = getGroupMembers(groupId);
            const sameStage = members.length > 0 && members.every(m => m.stage === stage);
            const allDone = sameStage && members.every(m => m.id === completedApplicantId || m.status === 'done');
            return { members, sameStage, allDone };
        }

        function getApplicantsForPage(page) {
            return applicants.filter(a => {
                if (a.stage !== page) return false;
                if (page === 'archived') return true;
                if (page === 'outcome') return a.status !== 'error' && a.status !== 'fail';
                return a.status !== 'error' && a.status !== 'fail' && a.status !== 'done';
            });
        }

        const PAGE_CONFIG = {
            overview: { title: 'Dashboard', subtitle: 'VisÃ£o Geral' },
            screening: { title: 'Triagem', subtitle: 'Triagem Inicial' },
            analysis: { title: 'AnÃ¡lise', subtitle: 'RevisÃ£o e EstratÃ©gia' },
            ds160: { title: 'DS-160', subtitle: 'Preenchimento Oficial' },
            payment: { title: 'Taxas', subtitle: 'Pagamento de Taxas' },
            scheduling: { title: 'Agendamento', subtitle: 'Agendar Entrevista' },
            interview: { title: 'Entrevista', subtitle: 'PreparaÃ§Ã£o e Entrevista' },
            outcome: { title: 'Resultado', subtitle: 'Resultado do Processo' },
            archived: { title: 'Arquivado', subtitle: 'Processo Encerrado' },
        };

        // ==========================================
        // DATA LOADING
        // ==========================================
        let _groups = []; // cached groups list
        async function loadGroups() {
            try {
                let q = 'groups?select=id,nickname,email,company_id,notes&order=id.asc';
                if (resolvedCompanyId) q += '&company_id=eq.' + resolvedCompanyId;
                _groups = (await sbGet(q)) || [];
            } catch (e) { _groups = []; }
        }
        function getGroupLabel(groupId) {
            return `#${(groupId || '').replace(/[^a-z0-9]/gi, '').substring(0, 5).toUpperCase()}`;
        }
        function getGroupNickname(groupId) {
            const g = _groups.find(x => x.id === groupId);
            return g ? g.nickname : `#${groupId}`;
        }
        async function loadApplicants() {
            try {
                await loadGroups();
                // Load security question from settings
                try { const sq = await sbGet('settings?key_name=eq.security_question&select=key_value&limit=1'); window._securityQuestion = sq?.[0]?.key_value || ''; } catch(e) { window._securityQuestion = ''; }
                let q = 'applicants?select=id,full_name,passport_number,data,stage,status,result,sort_order,created_at,updated_at,company_id,group_id,notes,email&order=sort_order.asc,created_at.desc';
                if (resolvedCompanyId) q += '&company_id=eq.' + resolvedCompanyId;
                const rows = await sbGet(q);
                if (!rows || !rows.length) { applicants = []; return; }
                // Load application IDs
                const appIds = rows.map(r => r.id);
                let appMap = {};
                try {
                    let appQuery = 'applications?select=applicant_id,application_id,fill_status,fill_error,security_answer,ds160_pdf_url,confirmation_pdf_url,confirmation_screenshot_url&order=created_at.desc';
                    if (appIds.length > 0 && appIds.length <= 200) appQuery += '&applicant_id=in.(' + appIds.join(',') + ')';
                    const apps = await sbGet(appQuery);
                    if (apps) apps.forEach(a => { if (!appMap[a.applicant_id]) appMap[a.applicant_id] = a; });
                } catch(e) { console.warn('Failed to load applications:', e); }
                // Load AIS accounts
                let aisMap = {};
                try {
                    let aisQuery = 'ais_accounts?select=applicant_id,email,password,ais_status,confirmed';
                    if (appIds.length > 0 && appIds.length <= 200) aisQuery += '&applicant_id=in.(' + appIds.join(',') + ')';
                    const aisRows = await sbGet(aisQuery);
                    if (aisRows) aisRows.forEach(a => { if (!aisMap[a.applicant_id]) aisMap[a.applicant_id] = a; });
                } catch(e) { console.warn('Failed to load ais_accounts:', e); }
                applicants = rows.map(row => ({
                    id: row.id, name: row.full_name || '(Sem nome)', passport: row.passport_number || '',
                    stage: row.stage || 'screening', status: row.status || 'todo',
                    result: (row.result && row.result !== 'pending')
                        ? row.result
                        : ((row.stage === 'outcome' && RESULT_CONFIG[row.status]) ? row.status : (row.result || 'pending')),
                    sort_order: row.sort_order || 0, progress: calcProgress(row.data),
                    created: row.created_at, updated_at: row.updated_at || row.created_at, data: row.data, group_id: row.group_id || null, notes: row.notes || '', email: row.email || '',
                    application_id: appMap[row.id]?.application_id || null,
                    fill_status: appMap[row.id]?.fill_status || null,
                    security_answer: appMap[row.id]?.security_answer || null,
                    ds160_pdf_url: appMap[row.id]?.ds160_pdf_url || null,
                    confirmation_pdf_url: appMap[row.id]?.confirmation_pdf_url || null,
                    confirmation_screenshot_url: appMap[row.id]?.confirmation_screenshot_url || null,
                    fill_error: appMap[row.id]?.fill_error || null,
                    ais_email: aisMap[row.id]?.email || null,
                    ais_password: aisMap[row.id]?.password || null,
                    ais_status: aisMap[row.id]?.ais_status || null,
                    ais_confirmed: aisMap[row.id]?.confirmed || false,
                }));
            } catch (e) { console.error('[Dashboard] Load error:', e); showToast('Erro ao carregar', 'error'); }
        }

        async function resolveOrg() {
            if (!_orgParam) { document.getElementById('orgFooter').textContent = 'Admin'; return; }
            try {
                const data = await sbGet('companies?short_id=eq.' + encodeURIComponent(_orgParam) + '&select=id,name&limit=1');
                if (data?.[0]) { resolvedCompanyId = data[0].id; resolvedCompanyName = data[0].name; document.getElementById('orgFooter').textContent = resolvedCompanyName; const navBtn = document.getElementById('portalLinkBtnNav'); if (navBtn) { navBtn.style.display = 'flex'; const urlInput = document.getElementById('portalUrlInput'); if (urlInput) urlInput.value = _orgParam; } }
                else { document.getElementById('orgFooter').textContent = 'NÃ£o encontrada'; }
            } catch (e) { document.getElementById('orgFooter').textContent = 'Erro'; }
        }

        function copyPortalLink() {
            if (!_orgParam) return;
            const url = AppCore.buildPortalUrl(_orgParam);
            navigator.clipboard.writeText(url).then(() => {
                // Feedback no Ã­cone do nav bar
                const copyIcon = document.querySelector('#portalLinkBtnNav .iconoir-copy');
                if (copyIcon) {
                    copyIcon.className = 'iconoir-check';
                    copyIcon.style.color = '#22c55e';
                    setTimeout(() => { copyIcon.className = 'iconoir-copy'; copyIcon.style.color = 'var(--text-secondary)'; }, 2000);
                }
                // Feedback no input
                const urlInput = document.getElementById('portalUrlInput');
                if (urlInput) { urlInput.style.color = '#22c55e'; setTimeout(() => { urlInput.style.color = 'var(--text-secondary)'; }, 2000); }
            }).catch(() => {
                prompt('Copie o link:', url);
            });
        }

        // ==========================================
        // NAVIGATION / FILTERS / SORT
        // ==========================================
        function navigateTo(page) {
            // Toggle admin panel vs normal content
            const adminPanel = document.getElementById('adminPanel');
            const normalEls = document.querySelectorAll('.main > .dashboard-nav, .main > .bulk-bar, .main > .table-container, .main > .list-sentinel');
            if (page === 'overview') {
                currentPage = 'overview';
                currentFilter = 'all';
                selectedIds.clear();
                searchQuery = '';
                resetVisibleRows();
                updateBulkBar();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = '';
                // Hide other pages, admin panel, loading overlay
                normalEls.forEach(el => el.style.display = 'none');
                if (adminPanel) adminPanel.style.display = 'none';
                admRestoreNav();
                const tblCont = document.getElementById('tableContainer');
                if (tblCont) tblCont.style.display = 'none';
                // Show dashboard page
                const dashPage = document.getElementById('dashboardPage');
                if (dashPage) dashPage.style.display = '';
                // Show dashboard-nav like stage pages
                const navEl = document.querySelector('.dashboard-nav');
                if (navEl) navEl.style.display = '';
                // Set title
                document.getElementById('pageTitle').textContent = 'Dashboard';
                const chips = document.getElementById('filterChips');
                if (chips) { chips.innerHTML = ''; chips.style.display = 'none'; }
                document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === 'overview'));
                replaceDashboardHash('overview');
                renderDashboard();
                return;
            }
            if (page === 'admin') {
                currentPage = 'admin';
                currentFilter = 'all';
                selectedIds.clear();
                searchQuery = '';
                resetVisibleRows();
                updateBulkBar();
                // Guard: sÃ³ permite acesso se o botÃ£o admin estiver visÃ­vel (role verificada no showDashboard)
                if (!canAccessAdminPanel) { navigateTo('overview'); return; }
                normalEls.forEach(el => el.style.display = 'none');
                const dashPage3 = document.getElementById('dashboardPage');
                if (dashPage3) dashPage3.style.display = 'none';
                const tblCont = document.getElementById('tableContainer');
                if (tblCont) tblCont.style.display = 'none';
                if (adminPanel) { adminPanel.style.display = 'block'; admInitPanel(); admShowSection(currentAdminSection || 'orgs'); }
                // Show dashboard-nav for admin with proper content
                const dashNav = document.querySelector('.dashboard-nav');
                if (dashNav) dashNav.style.display = 'flex';
                document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === 'admin'));
                replaceDashboardHash('admin');
                return;
            }
            // Hide admin panel + dashboard, show normal
            if (adminPanel) adminPanel.style.display = 'none';
            admRestoreNav();
            const dashPage2 = document.getElementById('dashboardPage');
            if (dashPage2) dashPage2.style.display = 'none';
            normalEls.forEach(el => el.style.display = '');
            currentPage = page; currentFilter = 'all'; selectedIds.clear(); searchQuery = ''; resetVisibleRows();
            // Persist active page in URL hash for reload
            replaceDashboardHash(page);
            document.getElementById('searchInput').value = '';
            document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
            const pcfg = PAGE_CONFIG[page];
            if (!pcfg) return; // guard against invalid pages
            document.getElementById('pageTitle').textContent = pcfg.title;
            const chips = document.getElementById('filterChips');
            if (chips) chips.style.display = 'none';
            // subtitle removed
            // info column removed
            renderFilters(); renderTable(); updateBadges();
        }

        function renderFilters() {
            const el = document.getElementById('filterChips');
            if (!el) return;
            currentFilter = 'all';
            el.innerHTML = '';
            el.style.display = 'none';
        }

        function resetVisibleRows() { visibleRowsCount = LIST_BATCH_SIZE; }
        function setupListObserver(hasMore) {
            const sentinel = document.getElementById('listSentinel');
            if (!sentinel) return;
            sentinel.classList.toggle('hidden', !hasMore);
            if (!hasMore) {
                if (_listObserver) _listObserver.disconnect();
                return;
            }
            if (!_listObserver) {
                _listObserver = new IntersectionObserver((entries) => {
                    if (!entries[0]?.isIntersecting) return;
                    const total = getFiltered().length;
                    if (visibleRowsCount >= total) return;
                    visibleRowsCount = Math.min(visibleRowsCount + LIST_BATCH_SIZE, total);
                    renderTable();
                }, { rootMargin: '240px 0px' });
            } else if (!eligibleGroups.length) {
                html += `<div style="padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--bg-body);font-size:12px;color:var(--text-muted);line-height:1.5">
                    Nenhum grupo compatÃ­vel nesta etapa. O vÃ­nculo sÃ³ aparece quando o grupo e o solicitante estÃ£o na mesma etapa.
                </div>`;
            } else {
                _listObserver.disconnect();
            }
            _listObserver.observe(sentinel);
        }
        function setFilter(f) { currentFilter = f; resetVisibleRows(); renderFilters(); renderTable(); }
        function filterList() { searchQuery = document.getElementById('searchInput').value.toLowerCase(); resetVisibleRows(); renderTable(); }
        function sortBy(field) { if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc'; else { sortField = field; sortDir = 'desc'; } resetVisibleRows(); renderTable(); }

        // Etapas: mostra apenas trabalho ativo (retry, doing, todo)
        // done â†’ avanÃ§ar etapa | error/failed â†’ Processos com Problemas
        function getFilteredByPage() { return getApplicantsForPage(currentPage); }
        function getFiltered() {
                        let items = getFilteredByPage();
            if (currentFilter !== 'all') {
                if (currentPage === 'outcome' || currentPage === 'archived') items = items.filter(a => getOutcomeValue(a) === currentFilter);
                else items = items.filter(a => a.status === currentFilter);
            }
            if (searchQuery) items = items.filter(a => a.name.toLowerCase().includes(searchQuery) || a.passport.toLowerCase().includes(searchQuery) || a.id.toString().toLowerCase().includes(searchQuery) || (a.email || '').toLowerCase().includes(searchQuery) || (a.group_id || '').toLowerCase().includes(searchQuery));
            // Prioridade: retry(0) > doing(1) > todo(2) > done(3)
            const STATUS_PRIORITY = { retry: 0, standby: 1, doing: 2, todo: 3 };
            items.sort((a, b) => {
                const pa = STATUS_PRIORITY[a.status] ?? 9, pb = STATUS_PRIORITY[b.status] ?? 9;
                if (pa !== pb) return pa - pb;
                // Dentro do mesmo status: sort_order (drag & drop), depois created_at
                const sa = a.sort_order ?? 9999, sb = b.sort_order ?? 9999;
                if (sa !== sb) return sa - sb;
                const ca = a.created_at || '', cb = b.created_at || '';
                if (ca < cb) return -1; if (ca > cb) return 1;
                return 0;
            });
            return items;
        }

        function titleCase(s) { return (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
        function shortName(s) { const p = (s || '').trim().split(/\s+/); return p.length <= 2 ? titleCase(s) : titleCase(p[0] + ' ' + p[p.length - 1]); }
        function getInitials(name) {
            const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
            if (!parts.length) return '--';
            const first = parts[0]?.[0] || '';
            const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
            return (first + last).toUpperCase().slice(0, 2) || '--';
        }

        function toggleGroup(code) { if (_wasDragging) return; expandedGroups.has(code) ? expandedGroups.delete(code) : expandedGroups.add(code); renderTable(); }

        // â”€â”€ Credential Modal â”€â”€
        window.openCredModal = function(appId) {
            const a = applicants.find(x => x.id === appId);
            if (!a) return;
            const old = document.getElementById('credModal');
            if (old) old.remove();

            let sections = '';

            // DS-160 section
            if (a.application_id) {
                const surname5 = (a.data?.personal1?.surname || a.name?.split(' ').pop() || '').substring(0,5).toUpperCase();
                const birthYear = a.data?.personal1?.dob?.year || '';
                const secQ = window._securityQuestion || '';
                const SEC_QUESTIONS = {
                    '0': "What is your mother's maiden name?",
                    '1': "What is your father's middle name?",
                    '2': 'In what city were you born?',
                    '3': 'What high school did you attend?',
                    '4': 'What city were your parents married?'
                };
                const secQLabel = SEC_QUESTIONS[secQ] || secQ || 'NÃ£o definida';
                const cpBtn = (v) => `<td><button class="cred-copy-btn" title="Copiar" onclick="navigator.clipboard.writeText('${v}');this.innerHTML='<i class=\\'iconoir-check\\'></i>';setTimeout(()=>this.innerHTML='<i class=\\'iconoir-copy\\'></i>',1200)"><i class="iconoir-copy"></i></button></td>`;
                sections += `
                    <div class="cred-card">
                        <div class="cred-card-header">
                            <div class="cred-card-icon ds160"><i class="iconoir-page"></i></div>
                            <div class="cred-card-title">DS-160</div>
                        </div>
                        <div class="cred-card-body">
                            <table class="cred-table">
                                <tr><td>App ID</td><td class="mono">${a.application_id}</td>${cpBtn(a.application_id)}</tr>
                                <tr><td>Sobrenome</td><td class="mono">${surname5 || '-'}</td>${surname5 ? cpBtn(surname5) : '<td></td>'}</tr>
                                <tr><td>Nascimento</td><td>${birthYear || '-'}</td>${birthYear ? cpBtn(birthYear) : '<td></td>'}</tr>
                                <tr><td>Pergunta</td><td class="small">${secQLabel}</td><td></td></tr>
                                <tr><td>Resposta</td><td class="mono">${a.security_answer || '-'}</td>${a.security_answer ? cpBtn(a.security_answer) : '<td></td>'}</tr>
                            </table>
                            <div class="cred-downloads">
                                ${a.ds160_pdf_url ? `<a href="${a.ds160_pdf_url}" target="_blank" class="cred-dl-btn"><i class="iconoir-download" style="font-size:13px"></i> DS-160 Completo</a>` : `<span class="cred-dl-btn disabled"><i class="iconoir-download" style="font-size:13px"></i> DS-160 Completo</span>`}
                                ${a.confirmation_pdf_url ? `<a href="${a.confirmation_pdf_url}" target="_blank" class="cred-dl-btn"><i class="iconoir-download" style="font-size:13px"></i> Confirma\u00e7\u00e3o</a>` : `<span class="cred-dl-btn disabled"><i class="iconoir-download" style="font-size:13px"></i> Confirma\u00e7\u00e3o</span>`}
                            </div>
                        </div>
                    </div>`;
            }

            // AIS section
            if (a.ais_email) {
                const statusMap = {confirmed:{l:'Confirmado',d:'confirmed'},waiting_confirmation:{l:'Aguardando',d:'pending'},confirmation_failed:{l:'Falhou',d:'fail'},email_created:{l:'Email criado',d:'pending'}};
                const st = statusMap[a.ais_status] || {l:a.ais_status||'-',d:'pending'};
                if (a.ais_confirmed) { st.l = 'Confirmado'; st.d = 'confirmed'; }
                const cpBtn = (v) => `<td><button class="cred-copy-btn" title="Copiar" onclick="navigator.clipboard.writeText('${v}');this.innerHTML='<i class=\\'iconoir-check\\'></i>';setTimeout(()=>this.innerHTML='<i class=\\'iconoir-copy\\'></i>',1200)"><i class="iconoir-copy"></i></button></td>`;
                sections += `
                    <div class="cred-card">
                        <div class="cred-card-header">
                            <div class="cred-card-icon ais"><i class="iconoir-globe"></i></div>
                            <div class="cred-card-title">AIS</div>
                            <div class="cred-card-status ${st.d}"><span class="dot ${st.d}"></span>${st.l}</div>
                        </div>
                        <div class="cred-card-body">
                            <table class="cred-table">
                                <tr><td>Email</td><td class="mono">${a.ais_email}</td>${cpBtn(a.ais_email)}</tr>
                                <tr><td>Senha</td><td class="mono">${a.ais_password}</td>${cpBtn(a.ais_password)}</tr>
                            </table>
                            <div class="cred-downloads">
                                ${a.ais_payment_url ? `<a href="${a.ais_payment_url}" target="_blank" class="cred-dl-btn"><i class="iconoir-download" style="font-size:13px"></i> Comprovante</a>` : `<span class="cred-dl-btn disabled"><i class="iconoir-download" style="font-size:13px"></i> Comprovante</span>`}
                                ${a.ais_schedule_url ? `<a href="${a.ais_schedule_url}" target="_blank" class="cred-dl-btn"><i class="iconoir-download" style="font-size:13px"></i> Agendamento</a>` : `<span class="cred-dl-btn disabled"><i class="iconoir-download" style="font-size:13px"></i> Agendamento</span>`}
                            </div>
                        </div>
                    </div>`;
            }

            if (!sections) sections = '<div style="padding:12px;color:var(--text-muted);text-align:center">Nenhuma credencial disponÃ­vel</div>';

            const html = `<div id="credModal" class="modal-overlay" onclick="document.getElementById('credModal').remove()">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:360px;padding:16px">
                    <div class="modal-header" style="margin-bottom:12px">
                        <h3 class="modal-title" style="font-size:14px">Credenciais - ${shortName(a.name)}</h3>
                        <button class="modal-close" onclick="document.getElementById('credModal').remove()">&times;</button>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px">${sections}</div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        };


        function renderTable() {
            const allItems = getFiltered();
            const tbody = document.getElementById('tableBody');
            const empty = document.getElementById('emptyState');
            const tableContainer = document.getElementById('tableContainer');
            const sentinel = document.getElementById('listSentinel');
            // Guard: na overview ou admin, tableContainer e sentinela devem ficar ocultos
            if (currentPage === 'overview' || document.getElementById('adminPanel')?.style.display === 'block') {
                if (tableContainer) tableContainer.style.display = 'none';
                if (sentinel) sentinel.classList.add('hidden');
                if (_listObserver) _listObserver.disconnect();
                return;
            }
            if (tableContainer) tableContainer.style.display = '';



            if (!allItems.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); setupListObserver(false); return; }
            empty.classList.add('hidden');

            const items = allItems.slice(0, visibleRowsCount);
            setupListObserver(visibleRowsCount < allItems.length);


            const groupMap = {}; const solos = [];
            items.forEach(a => {
                if (a.group_id) {
                    if (!groupMap[a.group_id]) {
                        const stageMembers = getGroupStageMembers(a.group_id, currentPage);
                        groupMap[a.group_id] = stageMembers.length ? stageMembers : getGroupMembers(a.group_id, { includeArchived: currentPage === 'archived' });
                    }
                } else {
                    solos.push(a);
                }
            });
            Object.values(groupMap).forEach(members => members.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)));
            // #5 fix: ensure groupMap members are sorted for consistent principal display



            function buildRow(a, extraClass, treeOpts) {
                treeOpts = treeOpts || {};
                const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.todo;
                const nextStage = getNextStage(a.stage);
                const previousStage = getPreviousStage(a.stage);
                const sel = selectedIds.has(a.id);
                const pc = a.progress >= 100 ? '#22c55e' : a.progress > 50 ? '#3b82f6' : '#f59e0b';
                const isSubRow = (extraClass || '').includes('sub-row');
                const isPrincipal = isSubRow && treeOpts.memberIndex === 0;
                const nameIcon = `<span class="applicant-icon"><i class="iconoir-${isPrincipal ? 'user-star' : 'user'}"></i></span>`;
                const treeBranch = treeOpts.isSubRow ? `<span class="tree-branch ${treeOpts.isLast ? 'tree-last' : ''}"></span>` : '';
                                return `<tr class="${extraClass || ''} ${sel ? 'selected' : ''}" draggable="true" data-id="${a.id}" ondblclick="openReview('${a.id}')" ondragstart="handleDragStart(event,'${a.id}')" ondragover="handleDragOver(event)" ondragleave="event.currentTarget.classList.remove('drag-over','drag-above','drag-below')" ondrop="handleDrop(event,'${a.id}')">
                    <td class="check-col"><div class="custom-check ${sel ? 'checked' : ''}" onclick="event.stopPropagation();toggleSelect('${a.id}')"><i class="iconoir-check"></i></div></td>
                    <td onclick="openReview('${a.id}')"><div class="name-col">${treeBranch}${nameIcon}<div class="name-info"><div class="name">${shortName(a.name)}</div><div class="passport">${isSubRow ? (a.data?.relation || a.passport || '') : (a.email || 'Sem email')}</div></div></div></td>
                    <td>${(() => {
                        if (a.stage === 'interview') {
                            return '<span class="status-badge status-pendente">Pendente</span>';
                        } else if (a.stage === 'outcome') {
                            const outcomeValue = getOutcomeValue(a);
                            const rcfg = RESULT_CONFIG[outcomeValue] || { label: outcomeValue, color: '#64748b' };
                            return `<span class="status-badge" style="background:${rcfg.color}18;color:${rcfg.color}">${rcfg.label}</span>`;
                        }
                        return `<span class="status-badge ${cfg.class}">${cfg.label}</span>`;
                    })()}</td>
                    <td>${a.application_id ? `<span class="cred-chip" onclick="event.stopPropagation();openCredModal('${a.id}')">${(a.application_id||'').substring(0,12)}</span>` : '-'}</td>
                    <td>${a.ais_email ? `<span class="cred-chip" onclick="event.stopPropagation();openCredModal('${a.id}')"><span class="cred-dot ${a.ais_confirmed?'confirmed':a.ais_status==='confirmation_failed'?'fail':'pending'}"></span>${a.ais_email.split('@')[0]}</span>` : '-'}</td>
                    <td onclick="event.stopPropagation();openApplicantNotesModal('${a.id}')" style="cursor:pointer" title="Ver anota\u00e7\u00f5es"><div class="notes-preview">${a.notes ? a.notes.substring(0, 140) : '<span class="app-placeholder">Adicionar nota</span>'}</div></td>

                    <td><div class="row-actions">
                        ${previousStage ? `<button class="row-btn row-btn-icon row-btn-muted" onclick="event.stopPropagation();openStageActionModal('${a.id}','back')" title="Voltar etapa" aria-label="Voltar etapa"><i class="iconoir-nav-arrow-left"></i></button>` : ''}
                        ${nextStage ? `<button class="row-btn row-btn-icon row-btn-primary" onclick="event.stopPropagation();openStageActionModal('${a.id}','forward')" title="Avan\u00e7ar etapa" aria-label="Avan\u00e7ar etapa"><i class="iconoir-nav-arrow-right"></i></button>` : ''}
                        <button class="row-btn" onclick="event.stopPropagation();openWhatsApp('${a.id}')" title="WhatsApp"><i class="iconoir-whatsapp"></i></button>
                        <button class="row-btn" onclick="event.stopPropagation();copyApplicantLink('${a.id}')" title="Copiar link do portal"><i class="iconoir-copy"></i></button>
                        <button class="row-btn row-btn-more" onclick="event.stopPropagation();showManageMenu(event,'${a.id}')" title="Mais op\u00e7\u00f5es" aria-label="Mais op\u00e7\u00f5es"><i class="iconoir-more-vert"></i></button>
                    </div></td></tr>`;
            }

            let html = ''; const rendered = new Set();
            items.forEach(a => {
                if (rendered.has(a.id)) return;
                if (a.group_id && groupMap[a.group_id]) {
                    const members = groupMap[a.group_id];
                    if (rendered.has('g_' + a.group_id)) return;
                    rendered.add('g_' + a.group_id);
                    members.forEach(m => rendered.add(m.id));
                    const isOpen = expandedGroups.has(String(a.group_id));
                    const avgProgress = Math.round(members.reduce((s, m) => s + m.progress, 0) / members.length);
                    const pc = avgProgress >= 100 ? '#22c55e' : avgProgress > 50 ? '#3b82f6' : '#f59e0b';
                    const groupLabel = getGroupLabel(a.group_id);
                                        const allSelected = members.every(m => selectedIds.has(m.id));
                    html += `<tr class="group-row" draggable="true" data-group="${a.group_id}" onclick="toggleGroup('${a.group_id}')" ondragstart="handleDragStart(event,'group_${a.group_id}')" ondragover="handleDragOver(event)" ondragleave="event.currentTarget.classList.remove('drag-over','drag-above','drag-below')" ondrop="handleDrop(event,'group_${a.group_id}')">
                        <td class="check-col"><div class="custom-check ${allSelected ? 'checked' : ''}" onclick="event.stopPropagation();toggleGroupSelect('${a.group_id}')"><i class="iconoir-check"></i></div></td>
                        <td><div class="name-col"><span class="group-icon"><i class="iconoir-group"></i></span><div class="name-info"><div class="name">${groupLabel}</div><div class="passport">${members[0]?.email || 'Sem email'}</div></div></div></td>
                        <td><span class="status-badge" style="background:#f1f5f9;color:#64748b">${members.length} ${members.length === 1 ? 'membro' : 'membros'}</span></td>
                        <td></td>
                        <td></td>
                        <td onclick="event.stopPropagation();openGroupNotesModal('${a.group_id}')" style="cursor:pointer" title="Notas do grupo"><div class="notes-preview">${(() => { const g = _groups.find(x => x.id === a.group_id); return g && g.notes ? g.notes.substring(0, 140) : '<span class="app-placeholder">Adicionar nota</span>'; })()}</div></td>

                        <td><div class="row-actions"><button class="row-btn" onclick="event.stopPropagation();openGroupConfig('${a.group_id}')" title="ConfiguraÃ§Ãµes do grupo"><i class="iconoir-settings"></i></button><button class="row-btn" onclick="event.stopPropagation();openWhatsApp(null,'${a.group_id}')" title="WhatsApp do grupo"><i class="iconoir-whatsapp"></i></button><button class="row-btn" onclick="event.stopPropagation();copyGroupLink('${a.group_id}')" title="Copiar link do grupo"><i class="iconoir-copy"></i></button></div></td></tr>`;
                    if (isOpen) {
                        members.forEach((m, idx) => { html += buildRow(m, 'sub-row', { isSubRow: true, isLast: false, memberIndex: idx }); });
                    }
                } else { rendered.add(a.id); html += buildRow(a, ''); }
            });
            tbody.innerHTML = html; updateBulkBar();
        }

        // ==========================================
        // DRAG AND DROP
        // ==========================================
        let _dragId = null;
        let _dragEl = null;
        let _wasDragging = false;
        function handleDragStart(e, id) {
            _dragId = id;
            _wasDragging = true;
            _dragEl = e.currentTarget;
            _dragEl.style.opacity = '0.4';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            _dragEl.addEventListener('dragend', handleDragEnd, { once: true });
        }
        function handleDragEnd() {
            if (_dragEl) { _dragEl.style.opacity = ''; _dragEl = null; }
            document.querySelectorAll('.drag-over,.drag-above,.drag-below').forEach(el => {
                el.classList.remove('drag-over', 'drag-above', 'drag-below');
            });
            setTimeout(() => { _wasDragging = false; }, 100);
        }
        function handleDragOver(e) {
            e.preventDefault(); e.dataTransfer.dropEffect = 'move';
            const tr = e.currentTarget;
            // Suppress visual feedback for same-group drops (blocked action)
            const targetId = tr.dataset.id || (tr.dataset.group ? 'group_' + tr.dataset.group : null);
            if (_dragId && targetId) {
                const dragApp = !isGroupDragId(_dragId) ? applicants.find(a => a.id === _dragId) : null;
                const tgtApp = !isGroupDragId(targetId) ? applicants.find(a => a.id === targetId) : null;
                const dragGid = dragApp ? dragApp.group_id : (isGroupDragId(_dragId) ? getGroupIdFromDrag(_dragId) : null);
                const tgtGid = tgtApp ? tgtApp.group_id : (isGroupDragId(targetId) ? targetId.replace('group_', '') : null);
                if (dragGid && tgtGid && String(dragGid) === String(tgtGid)) {
                    e.dataTransfer.dropEffect = 'none';
                    return; // no visual cues for blocked intra-group reorder
                }
            }
            tr.classList.add('drag-over');
            const rect = tr.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            tr.classList.toggle('drag-above', e.clientY < midY);
            tr.classList.toggle('drag-below', e.clientY >= midY);
        }
        function isGroupDragId(rawId) { return rawId && String(rawId).startsWith('group_'); }
        function getGroupIdFromDrag(rawId) { return rawId ? String(rawId).replace('group_', '') : null; }
        function resolveId(rawId) {
            if (isGroupDragId(rawId)) {
                const gid = getGroupIdFromDrag(rawId);
                const member = applicants.find(a => a.group_id === gid);
                return member ? member.id : null;
            }
            return rawId;
        }
        async function handleDrop(e, targetId) {
            e.preventDefault(); e.currentTarget.classList.remove('drag-over', 'drag-above', 'drag-below');
            if (!_dragId || _dragId === targetId) { _dragId = null; return; }

            const dragApplicant = !isGroupDragId(_dragId) ? applicants.find(a => a.id === _dragId) : null;
            const targetIsGroup = isGroupDragId(targetId);
            const targetApplicant = !targetIsGroup ? applicants.find(a => a.id === targetId) : null;

            // â”€â”€â”€ CASE 1: Solo dropped onto group member (open) or group row (closed) â†’ LINK â”€â”€â”€
            if (dragApplicant && !dragApplicant.group_id) {
                let linkGroupId = null;
                if (targetApplicant && targetApplicant.group_id) linkGroupId = targetApplicant.group_id;
                else if (targetIsGroup) linkGroupId = getGroupIdFromDrag(targetId);

                if (linkGroupId) {
                    showConfirmModal('Vincular ao Grupo',
                        `Deseja vincular <strong>${dragApplicant.name}</strong> ao grupo <strong>${getGroupLabel(linkGroupId)}</strong>?`,
                        async () => {
                            try {
                                await linkApplicantToGroup(dragApplicant.id, linkGroupId);
                                renderTable(); updateBadges();
                                showToast('Vinculado ao grupo!', 'success');
                            } catch (err) { showToast('Erro: ' + err.message, 'error'); }
                        });
                    _dragId = null; return;
                }
            }

            // â”€â”€â”€ CASE 2: Group member dropped onto solo area â†’ UNLINK â”€â”€â”€
            if (dragApplicant && dragApplicant.group_id && targetApplicant && !targetApplicant.group_id) {
                const gid = dragApplicant.group_id;
                const groupMembers = applicants.filter(a => a.group_id === gid);
// dissolveGroupIfNeeded handles auto-dissolve after unlink
                // Block unlinking the principal (lowest sort_order)
                const sorted = [...groupMembers].sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
                if (sorted[0] && sorted[0].id === dragApplicant.id) {
                    showToast('NÃ£o Ã© possÃ­vel desvincular o principal. Troque o principal nas configuraÃ§Ãµes do grupo (âš™).', 'error');
                    _dragId = null; return;
                }
                showUnlinkModal(dragApplicant);
                _dragId = null; return;
            }

            // â”€â”€â”€ Block ALL reorder within same group (only via modal âš™) â”€â”€â”€
            {
                const dragGid = dragApplicant ? dragApplicant.group_id : (isGroupDragId(_dragId) ? getGroupIdFromDrag(_dragId) : null);
                const targetGid = targetApplicant ? targetApplicant.group_id : (targetIsGroup ? targetId.replace('group_', '') : null);
                if (dragGid && targetGid && String(dragGid) === String(targetGid)) {
                    showToast('Use as configuraÃ§Ãµes do grupo (âš™) para alterar a ordem.', 'info');
                    _dragId = null; return;
                }
            }

            // â”€â”€â”€ CASE 3: Reorder â€” insert at position + renumber all â”€â”€â”€
            try {
                // Build ordered list of "blocks" for current stage
                // A block is either a solo applicant or a group (all members as one unit)
                const stageItems = applicants.filter(a => a.stage === currentPage)
                    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || (a.created_at || '').localeCompare(b.created_at || ''));
                const blocks = []; const seenGroups = new Set();
                stageItems.forEach(a => {
                    if (a.group_id) {
                        if (seenGroups.has(a.group_id)) return;
                        seenGroups.add(a.group_id);
                        blocks.push({ type: 'group', key: 'group_' + a.group_id, ids: stageItems.filter(x => x.group_id === a.group_id).map(x => x.id) });
                    } else {
                        blocks.push({ type: 'solo', key: a.id, ids: [a.id] });
                    }
                });

                // Identify drag block and target block
                const dragKey = isGroupDragId(_dragId) ? _dragId : _dragId;
                const tgtKey = isGroupDragId(targetId) ? targetId : targetId;
                const dragBlockIdx = blocks.findIndex(b => b.key === dragKey || b.ids.includes(dragKey));
                const tgtBlockIdx = blocks.findIndex(b => b.key === tgtKey || b.ids.includes(tgtKey));

                if (dragBlockIdx !== -1 && tgtBlockIdx !== -1 && dragBlockIdx !== tgtBlockIdx) {
                    // Remove drag block from list
                    const [dragBlock] = blocks.splice(dragBlockIdx, 1);
                    // Find new target index (may have shifted after splice)
                    const newTgtIdx = blocks.findIndex(b => b.key === tgtKey || b.ids.includes(tgtKey));
                    // Insert before or after target based on drag direction
                    const insertIdx = dragBlockIdx < tgtBlockIdx ? newTgtIdx + 1 : newTgtIdx;
                    blocks.splice(insertIdx, 0, dragBlock);

                    // Renumber all blocks sequentially (10, 20, 30...)
                    let sortNum = 10;
                    const patches = [];
                    blocks.forEach(block => {
                        block.ids.forEach(id => {
                            const app = applicants.find(a => a.id === id);
                            if (app && app.sort_order !== sortNum) {
                                patches.push({ id, sort_order: sortNum });
                                app.sort_order = sortNum;
                            }
                            sortNum += 10;
                        });
                    });
                    // Batch PATCH only changed items
                    await Promise.all(patches.map(p => sbFetch(`applicants?id=eq.${p.id}`, 'PATCH', { sort_order: p.sort_order })));
                    renderTable();
                }
            } catch (err) { showToast('Erro ao reordenar: ' + err.message, 'error'); }
            _dragId = null;
        }

        // â”€â”€â”€ UNLINK MODAL (simplified) â”€â”€â”€
        function showUnlinkModal(applicant) {
            const hasEmail = !!applicant.email;
            const modalId = 'unlinkModal';
            const existing = document.getElementById(modalId); if (existing) existing.remove();
            let html = `<div id="${modalId}" class="modal-overlay">
            <div class="modal-box">
                <h3 class="modal-title">Desvincular do Grupo</h3>
                <p class="modal-body">Deseja remover <strong>${applicant.name}</strong> do grupo <strong>${getGroupLabel(applicant.group_id)}</strong>?</p>
                ${!hasEmail ? `<div style="margin-top:8px">
                    <label class="modal-label">E-mail do solicitante <span style="color:#ef4444">*</span></label>
                    <input type="email" id="unlinkEmailInput" class="modal-input" placeholder="Ex: solicitante@email.com" style="width:100%">
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">NecessÃ¡rio para acesso individual ao portal.</div>
                </div>` : ''}
                <div class="modal-actions">
                    <button class="modal-btn" id="btnCancelUnlink">Cancelar</button>
                    <button class="modal-btn danger" id="btnConfirmUnlink">Desvincular</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(modalId);
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.remove(); });
            document.getElementById('btnCancelUnlink').addEventListener('click', () => modalEl.remove());
            document.getElementById('btnConfirmUnlink').addEventListener('click', async () => {
                let email = applicant.email;
                if (!hasEmail) {
                    email = document.getElementById('unlinkEmailInput')?.value.trim();
                    if (!email || !email.includes('@')) {
                        showToast('Informe um e-mail vÃ¡lido para o solicitante', 'error');
                        return;
                    }
                }
                try {
                    const patch = { group_id: null };
                    if (!hasEmail) patch.email = email.toLowerCase();
                    await sbFetch(`applicants?id=eq.${applicant.id}`, 'PATCH', patch);
                    const oldGroupId = applicant.group_id;
                    applicant.group_id = null;
                    if (!hasEmail) applicant.email = email.toLowerCase();
                    modalEl.remove();
                    await dissolveGroupIfNeeded(oldGroupId);
                    renderTable(); updateBadges();
                    showToast(`${applicant.name} desvinculado!`, 'success');
                } catch (err) { showToast('Erro: ' + err.message, 'error'); }
            });
        }


        // â”€â”€â”€ AUTO-DISSOLVE: se grupo ficou com 1 membro, desvincular o Ãºltimo â”€â”€â”€
        async function dissolveGroupIfNeeded(groupId) {
            const remaining = applicants.filter(a => a.group_id === groupId);
            if (remaining.length !== 1) return; // 0 = already gone, 2+ = still group
            const last = remaining[0];
            // Auto-unlink the last member
            await sbFetch(`applicants?id=eq.${last.id}`, 'PATCH', { group_id: null });
            last.group_id = null;
            // Delete the group record
            try { await sbFetch(`groups?id=eq.${groupId}`, 'DELETE'); } catch(e) { console.warn('[Groups] Delete failed:', e); }
            _groups = _groups.filter(g => g.id !== groupId);
            console.log('[Groups] Grupo', groupId, 'dissolvido (1 membro restante)');
            showToast('Grupo dissolvido automaticamente (restava 1 membro)', 'info');
        }

        // â”€â”€â”€ GROUP CONFIG MODAL â”€â”€â”€
        function openGroupConfig(groupId) {
            const members = applicants.filter(a => String(a.group_id) === String(groupId))
                .sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
            if (!members.length) { showToast('Grupo nÃ£o encontrado.', 'error'); return; }

            const principal = members[0]; // sort_order = smallest = principal
            const allArchived = members.every(m => m.stage === 'archived');
            const group = _groups.find(g => g.id === groupId);
            const groupLabel = getGroupLabel(groupId);

            const modalId = 'groupConfigModal';
            const existing = document.getElementById(modalId); if (existing) existing.remove();

            const memberOptions = members.map(m =>
                `<option value="${m.id}" ${m.id === principal.id ? 'selected' : ''}>${titleCase(m.name)}</option>`
            ).join('');

            let html = `<div id="${modalId}" class="modal-overlay">
            <div class="modal-box" style="max-width:460px">
                <h3 class="modal-title"><i class="iconoir-settings" style="margin-right:6px"></i> ConfiguraÃ§Ãµes do Grupo</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:-4px 0 16px">${groupLabel} &middot; ${members.length} membro(s)</p>

                <div style="margin-bottom:16px">
                    <label class="modal-label">Solicitante Principal</label>
                    <select id="gcPrincipalSelect" class="modal-input" style="width:100%">${memberOptions}</select>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">O principal aparece primeiro e Ã© o ponto de contato no portal.</div>
                </div>

                <div style="margin-bottom:20px">
                    <label class="modal-label">Email do Grupo (Portal)</label>
                    <input type="email" id="gcEmailInput" class="modal-input" style="width:100%" value="${principal.email || ''}" placeholder="email@exemplo.com">
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Email usado pelo solicitante para acessar o grupo no portal.</div>
                </div>

                <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
                    <p style="font-size:12px;font-weight:700;color:#ef4444;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px">Zona de Risco</p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <button class="modal-btn" id="gcArchiveBtn" style="background:#f59e0b;color:#fff;flex:1;font-size:13px" ${allArchived ? 'disabled style="opacity:.5;background:#f59e0b;color:#fff;flex:1;font-size:13px;cursor:not-allowed"' : ''}>
                            <i class="iconoir-archive" style="margin-right:4px"></i> Arquivar Grupo
                        </button>
                        <button class="modal-btn" id="gcDeleteBtn" style="background:${allArchived ? '#ef4444' : '#e5e7eb'};color:${allArchived ? '#fff' : '#9ca3af'};flex:1;font-size:13px;${allArchived ? '' : 'cursor:not-allowed'}" ${allArchived ? '' : 'disabled'}>
                            <i class="iconoir-trash" style="margin-right:4px"></i> Excluir Grupo
                        </button>
                    </div>
                    ${!allArchived ? '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">Para excluir, primeiro arquive todos os membros.</div>' : '<div style="font-size:11px;color:#ef4444;margin-top:6px">Todos arquivados - exclus\u00e3o s\u00f3 \u00e9 poss\u00edvel manualmente.</div>'}
                </div>

                <div class="modal-actions" style="margin-top:20px">
                    <button class="modal-btn" id="gcCancelBtn">Cancelar</button>
                    <button class="modal-btn modal-btn-primary" id="gcSaveBtn">Salvar</button>
                </div>
            </div></div>`;

            document.body.insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(modalId);
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.remove(); });
            document.getElementById('gcCancelBtn').addEventListener('click', () => modalEl.remove());

            // â”€â”€ Save: update principal + email â”€â”€
            document.getElementById('gcSaveBtn').addEventListener('click', async () => {
                const newPrincipalId = document.getElementById('gcPrincipalSelect').value;
                const newEmail = document.getElementById('gcEmailInput').value.trim();

                if (!newEmail || !newEmail.includes('@')) {
                    showToast('Informe um e-mail vÃ¡lido.', 'error'); return;
                }

                try {
                    const oldPrincipal = principal;
                    const newPrincipal = members.find(m => m.id === newPrincipalId);

                    if (newPrincipalId !== oldPrincipal.id && newPrincipal) {
                        // Swap sort_order: new principal gets 1, old principal gets new's position
                        const oldSort = oldPrincipal.sort_order || 1;
                        const newSort = newPrincipal.sort_order || 2;
                        await sbFetch(`applicants?id=eq.${newPrincipalId}`, 'PATCH', { sort_order: oldSort, email: newEmail.toLowerCase() });
                        await sbFetch(`applicants?id=eq.${oldPrincipal.id}`, 'PATCH', { sort_order: newSort });
                        // Update local data
                        newPrincipal.sort_order = oldSort;
                        newPrincipal.email = newEmail.toLowerCase();
                        oldPrincipal.sort_order = newSort;
                        showToast(`${titleCase(newPrincipal.name)} Ã© agora o principal!`, 'success');
                    } else {
                        // Same principal, just update email
                        if (newEmail.toLowerCase() !== (oldPrincipal.email || '').toLowerCase()) {
                            await sbFetch(`applicants?id=eq.${oldPrincipal.id}`, 'PATCH', { email: newEmail.toLowerCase() });
                            oldPrincipal.email = newEmail.toLowerCase();
                            showToast('Email do grupo atualizado!', 'success');
                        } else {
                            showToast('Nenhuma alteraÃ§Ã£o.', 'info');
                        }
                    }

                    modalEl.remove();
                    renderTable();
                } catch (err) {
                    showToast('Erro ao salvar: ' + err.message, 'error');
                }
            });

            // â”€â”€ Archive group â”€â”€
            document.getElementById('gcArchiveBtn').addEventListener('click', () => {
                if (allArchived) return;
                showConfirmModal('Arquivar Grupo',
                    `Deseja mover <strong>todos os ${members.length} membros</strong> do grupo <strong>${groupLabel}</strong> para "Arquivado"?`,
                    async () => {
                        try {
                            for (const m of members) {
                                await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { stage: 'archived', status: 'done' });
                                m.stage = 'archived';
                                m.status = 'done';
                            }
                            modalEl.remove();
                            renderTable(); updateBadges();
                            showToast(`Grupo ${groupLabel} arquivado!`, 'success');
                        } catch (err) { showToast('Erro: ' + err.message, 'error'); }
                    });
            });

            // â”€â”€ Delete group â”€â”€
            document.getElementById('gcDeleteBtn').addEventListener('click', () => {
                if (!allArchived) return;
                showConfirmModal('Excluir Grupo Permanentemente',
                    `<span style="color:#ef4444;font-weight:700">ATENÃ‡ÃƒO:</span> Todos os <strong>${members.length} membros</strong> e seus dados serÃ£o <strong>excluÃ­dos permanentemente</strong>. Esta aÃ§Ã£o nÃ£o pode ser desfeita.`,
                    async () => {
                        try {
                            // Delete group record
                            if (group) await sbFetch(`groups?id=eq.${groupId}`, 'DELETE', null);
                            // Delete all members and related data
                            for (const m of members) {
                                await purgeApplicantData(m.id);
                            }
                            // Remove from local array
                            members.forEach(m => {
                                const idx = applicants.findIndex(a => a.id === m.id);
                                if (idx >= 0) applicants.splice(idx, 1);
                            });
                            modalEl.remove();
                            renderTable(); updateBadges();
                            showToast(`Grupo ${groupLabel} excluÃ­do!`, 'success');
                        } catch (err) { showToast('Erro: ' + err.message, 'error'); }
                    });
            });
        }

        // ==========================================
        // SELECTION
        // ==========================================
        function toggleSelect(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); renderTable(); }
        function toggleGroupSelect(groupId) {
            const members = applicants.filter(a => String(a.group_id) === String(groupId));
            const allSelected = members.every(m => selectedIds.has(m.id));
            members.forEach(m => { allSelected ? selectedIds.delete(m.id) : selectedIds.add(m.id); });
            renderTable();
        }
        function toggleAll() { const items = getFiltered(); const all = items.every(a => selectedIds.has(a.id)); if (all) selectedIds.clear(); else items.forEach(a => selectedIds.add(a.id)); document.getElementById('checkAll').classList.toggle('checked', !all); renderTable(); }
        function clearSelection() { selectedIds.clear(); document.getElementById('checkAll').classList.remove('checked'); renderTable(); }
        function updateBulkBar() { const bar = document.getElementById('bulkBar'); if (selectedIds.size > 0) { bar.classList.remove('hidden'); document.getElementById('selectedCount').textContent = selectedIds.size; } else bar.classList.add('hidden'); }

        function buildUrl(id, tab) {
            const params = {};
            if (tab) params.tab = tab;
            if (_orgParam) params.org = _orgParam;
            return AppCore.buildFormUrl(id, params);
        }
        function _formUrl(id, tab = null) {
            const params = { secure_entry: 1 };
            if (tab) params.tab = tab;
            if (_orgParam) params.org = _orgParam;
            return AppCore.buildFormUrl(id, params);
        }
        function _portalUrl(id) {
            const params = { id };
            return _orgParam ? AppCore.buildPortalUrl(_orgParam, params) : AppCore.buildPublicUrl('portal.html', params);
        }
        function _portalGroupUrl(groupId) {
            return _portalUrl(groupId);
        }
        function openReview(id) {
            const a = applicants.find(x => x.id === id);
            const url = new URL(_formUrl(id), location.href);
            if (a?.stage) url.searchParams.set('from', a.stage);
            window.open(url.toString(), '_blank');
        }
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const topModal = document.querySelector('.modal-overlay');
                if (topModal) { topModal.remove(); return; }
                document.getElementById('userDropdown')?.classList.remove('open');
            }
        });
        document.addEventListener('click', e => { if (!e.target.closest('.kebab-menu')) document.getElementById('userDropdown')?.classList.remove('open'); });
        function openForm(id) { window.open(_formUrl(id), '_blank'); }

        function copyGroupLink(groupId) {
            const members = getGroupMembers(groupId, { includeArchived: true });
            if (!members.length) { showToast('Grupo sem membros', 'error'); return; }
            const url = _portalGroupUrl(groupId);
            navigator.clipboard.writeText(url).then(() => showToast('Link do grupo copiado!', 'success')).catch(() => showToast('Erro ao copiar', 'error'));
        }
        function copyApplicantLink(id) {
            const formUrlBase = new URL(_formUrl(id, null), location.href).href;
            navigator.clipboard.writeText(formUrlBase).then(() => showToast('Link do solicitante copiado!', 'success')).catch(() => showToast('Erro ao copiar', 'error'));
        }

        function openDownloadModal(id) {
            const a = applicants.find(x => x.id === id);
            if (!a) return;
            const modalId = 'downloadModal';
            const existing = document.getElementById(modalId); if (existing) existing.remove();

            const docs = [];
            if (a.ds160_pdf_url) docs.push({ label: 'DS-160 Completo', url: a.ds160_pdf_url, icon: 'iconoir-page', color: '#3b82f6' });
            if (a.confirmation_pdf_url) docs.push({ label: 'ConfirmaÃ§Ã£o', url: a.confirmation_pdf_url, icon: 'iconoir-check-circle', color: '#22c55e' });
            if (a.confirmation_screenshot_url) docs.push({ label: 'Screenshot ConfirmaÃ§Ã£o', url: a.confirmation_screenshot_url, icon: 'iconoir-camera', color: '#8b5cf6' });

            if (!docs.length) { showToast('Nenhum documento disponÃ­vel', 'info'); return; }

            const docItems = docs.map(d => `
                <a href="${d.url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);text-decoration:none;color:var(--text-primary);transition:all .15s ease" onmouseover="this.style.borderColor='${d.color}';this.style.boxShadow='0 2px 8px ${d.color}18'" onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow='none'">
                    <div style="width:40px;height:40px;border-radius:10px;background:${d.color}14;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <i class="${d.icon}" style="font-size:20px;color:${d.color}"></i>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:14px">${d.label}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Clique para abrir / baixar</div>
                    </div>
                    <i class="iconoir-download" style="font-size:18px;color:var(--text-muted);flex-shrink:0"></i>
                </a>
            `).join('');

            const html = `<div id="${modalId}" class="modal-overlay">
                <div class="modal-box" style="max-width:420px">
                    <h3 class="modal-title"><i class="iconoir-download" style="margin-right:6px"></i> Documentos DS-160</h3>
                    <p style="font-size:13px;color:var(--text-muted);margin:-4px 0 16px">${titleCase(a.name)} &middot; ${a.application_id || '-'}</p>
                    <div style="display:flex;flex-direction:column;gap:8px">${docItems}</div>
                    <div class="modal-actions" style="margin-top:20px">
                        <button class="modal-btn" onclick="document.getElementById('${modalId}').remove()">Fechar</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(modalId);
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.remove(); });
        }

        function openWhatsApp(id, groupId) {
            let phone = '';
            let targetId = id;
            if (id) {
                const a = applicants.find(x => x.id === id);
                phone = a?.data?.addressPhone?.phone || a?.data?.phone || '';
            } else if (groupId) {
                const members = getGroupMembers(groupId, { includeArchived: true });
                phone = members[0]?.data?.addressPhone?.phone || members[0]?.data?.phone || '';
                targetId = groupId;
            }
            phone = phone.replace(/\D/g, '');
            if (!phone) {
                showToast('Nenhum telefone cadastrado', 'error');
                return;
            }
            const portalUrl = groupId ? _portalGroupUrl(targetId || groupId) : _portalUrl(targetId || id);
            const msg = encodeURIComponent('OlÃ¡! Segue o link para preencher seu formulÃ¡rio DS-160:\n' + portalUrl);
            window.open('https://wa.me/' + phone + '?text=' + msg, '_blank');
        }

        async function createNew() {
            const id = 'createModal';
            const existing = document.getElementById(id); if (existing) existing.remove();
            let memberCount = 0;
            const html = `<div id="${id}" class="modal-overlay" onclick="document.getElementById('${id}').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:400px;display:flex;flex-direction:column;max-height:85vh">
                <h3 class="modal-title" style="flex-shrink:0">Novo Solicitante</h3>
                <div style="overflow-y:auto;flex:1;padding-right:4px">
                    <div id="membersContainer">
                        <div class="member-entry" data-index="0">
                            <label class="modal-label">Nome completo</label>
                            <input type="text" class="modal-input member-name" placeholder="Ex: JOAO DA SILVA" autofocus>
                            <label class="modal-label">E-mail <span class="modal-hint">(acesso ao portal)</span></label>
                            <input type="email" class="modal-input member-email" placeholder="Ex: joao@email.com">
                        </div>
                    </div>
                    <button type="button" class="add-member-btn" style="margin:10px 0" id="addAnotherBtn" onclick="addAnotherMember()">
                        <i class="iconoir-plus"></i> Adicionar outro solicitante
                    </button>
                </div>
                <div id="createError" style="color:#ef4444;font-size:12px;margin-top:4px;display:none;flex-shrink:0"></div>
                <div class="modal-actions" style="flex-shrink:0">
                    <button class="modal-btn" onclick="document.getElementById('${id}').remove()">Cancelar</button>
                    <button class="modal-btn primary" id="createConfirm">Criar</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            memberCount = 1;
            setTimeout(() => document.querySelector('.member-name')?.focus(), 100);

            window.addAnotherMember = () => {
                memberCount++;
                const container = document.getElementById('membersContainer');
                const entry = document.createElement('div');
                entry.className = 'member-entry';
                entry.dataset.index = memberCount - 1;
                entry.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light)">
                        <span style="font-size:11px;color:var(--text-muted);font-weight:600">Solicitante ${memberCount}</span>
                        <button type="button" class="row-btn" onclick="this.closest('.member-entry').remove()" title="Remover" style="font-size:14px;color:var(--text-muted)"><i class="iconoir-xmark"></i></button>
                    </div>
                    <label class="modal-label">Nome completo</label>
                    <input type="text" class="modal-input member-name" placeholder="Ex: MARIA DA SILVA">`;
                container.appendChild(entry);
                entry.querySelector('.member-name').focus();
                entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            };

            const errEl = document.getElementById('createError');
            const doCreate = async () => {
                errEl.style.display = 'none';
                const allEntries = Array.from(document.querySelectorAll('#createModal .member-entry'));
                const members = [];
                for (let idx = 0; idx < allEntries.length; idx++) {
                    const entry = allEntries[idx];
                    const name = entry.querySelector('.member-name')?.value.trim();
                    const email = entry.querySelector('.member-email')?.value.trim() || '';
                    if (!name) { errEl.textContent = 'Informe o nome de todos os solicitantes'; errEl.style.display = 'block'; return; }
                    if (idx === 0 && !email) { errEl.textContent = 'Informe o e-mail do solicitante principal'; errEl.style.display = 'block'; return; }
                    members.push({ name: name.toUpperCase(), email: email ? email.toLowerCase() : '' });
                }

                let groupId = null;
                if (members.length > 1) {
                    try {
                        const gData = { nickname: members[0].name, email: members[0].email };
                        if (resolvedCompanyId) gData.company_id = resolvedCompanyId;
                        const gRes = await sbFetch('groups', 'POST', gData);
                        if (gRes?.[0]) { groupId = gRes[0].id; _groups.push(gRes[0]); }
                        else throw new Error('Erro ao criar grupo');
                    } catch (e) { errEl.textContent = 'Erro ao criar grupo: ' + e.message; errEl.style.display = 'block'; return; }
                }

                document.getElementById(id).remove();
                try {
                    for (let i = 0; i < members.length; i++) {
                        const m = members[i];
                        const p = { full_name: m.name, passport_number: null, data: {}, stage: 'screening', status: 'todo', result: 'pending', sort_order: i * 10 };
                        if (m.email) p.email = m.email;
                        if (resolvedCompanyId) p.company_id = resolvedCompanyId;
                        if (groupId) p.group_id = groupId;
                        await sbFetch('applicants', 'POST', p);
                    }
                    showToast(members.length > 1 ? `Grupo criado com ${members.length} solicitantes` : 'Solicitante criado', 'success');
                    await loadApplicants();
            navigateTo(currentPage);
                } catch (e) { showToast('Erro: ' + e.message, 'error'); }
            };
            document.querySelector('.member-name')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doCreate(); } });
            document.getElementById('createConfirm').addEventListener('click', doCreate);
        }


        function showInputModal(title, label, onConfirm) {
            const id = 'inputModal';
            const existing = document.getElementById(id); if (existing) existing.remove();
            let html = `<div id="${id}" class="modal-overlay">
            <div class="modal-box">
                <h3 class="modal-title">${title}</h3>
                <label class="modal-label">${label}</label>
                <input type="text" id="inputModalValue" class="modal-input" autofocus>
                <div class="modal-actions">
                    <button class="modal-btn" id="btnCancelInput">Cancelar</button>
                    <button class="modal-btn primary" id="btnOkInput">Confirmar</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(id);
            const input = document.getElementById('inputModalValue');
            setTimeout(() => input.focus(), 100);
            const triggerConfirm = () => { const val = input.value.trim(); modalEl.remove(); if (val && onConfirm) onConfirm(val); };
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.remove(); });
            document.getElementById('btnCancelInput').addEventListener('click', () => modalEl.remove());
            document.getElementById('btnOkInput').addEventListener('click', triggerConfirm);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); triggerConfirm(); } });
        }

        function showConfirmModal(title, message, onConfirm) {
            const id = 'confirmModal';
            const existing = document.getElementById(id); if (existing) existing.remove();
            let html = `<div id="${id}" class="modal-overlay">
            <div class="modal-box">
                <h3 class="modal-title">${title}</h3>
                <p class="modal-body">${message}</p>
                <div class="modal-actions">
                    <button class="modal-btn" id="btnCancelConfirm">Cancelar</button>
                    <button class="modal-btn danger" id="btnOkConfirm">Confirmar</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            const modalEl = document.getElementById(id);
            modalEl.addEventListener('click', (e) => { if (e.target === modalEl) modalEl.remove(); });
            document.getElementById('btnCancelConfirm').addEventListener('click', () => modalEl.remove());
            document.getElementById('btnOkConfirm').addEventListener('click', async () => { modalEl.remove(); if (onConfirm) await onConfirm(); });
        }

        function closeActionModal(id = 'stageActionModal') {
            document.getElementById(id)?.remove();
        }

        function setStageActionSelection(stage, label) {
            const select = document.getElementById('stageActionSelect');
            const hint = document.getElementById('stageActionHint');
            if (select) select.value = stage;
            if (hint) hint.textContent = label || '';
        }

        function openStageActionModal(id, direction) {
            const applicant = applicants.find(x => x.id === id);
            if (!applicant) return;
            const defaultStage = direction === 'back' ? getPreviousStage(applicant.stage) : getNextStage(applicant.stage);
            if (!defaultStage) {
                showToast(direction === 'back' ? 'N\u00e3o h\u00e1 etapa anterior.' : 'N\u00e3o h\u00e1 pr\u00f3xima etapa autom\u00e1tica.', 'info');
                return;
            }
            const modalId = 'stageActionModal';
            closeActionModal(modalId);
            const title = direction === 'back' ? 'Voltar Etapa' : 'Avan\u00e7ar Etapa';
            const helper = direction === 'back'
                ? 'A etapa anterior foi preselecionada. Voc\u00ea pode trocar se precisar.'
                : 'A pr\u00f3xima etapa foi preselecionada. Voc\u00ea pode trocar se precisar.';
            const confirmLabel = direction === 'back' ? 'Confirmar retorno' : 'Confirmar avan\u00e7o';
            const html = `<div id="${modalId}" class="modal-overlay" onclick="closeActionModal('${modalId}')">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" onclick="closeActionModal('${modalId}')">&times;</button>
                    </div>
                    <div class="modal-subtitle">${escapeHTML(applicant.name)}</div>
                    <p class="modal-body" style="margin-top:0">${helper}</p>
                    <div class="manage-section-label">Etapa de destino</div>
                    <select id="stageActionSelect" class="manage-select">${getStageOptions(defaultStage)}</select>
                    <div id="stageActionHint" style="font-size:12px;color:var(--text-muted);margin-top:6px">${direction === 'back' ? 'Use para reabrir uma etapa anterior.' : 'Use para seguir o fluxo normal com confirma\u00e7\u00e3o.'}</div>
                    <div class="modal-actions" style="margin-top:16px">
                        <button class="modal-btn" onclick="closeActionModal('${modalId}')">Cancelar</button>
                        <button class="modal-btn primary" onclick="confirmStageAction('${id}','${direction}')">${confirmLabel}</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function confirmStageAction(id, direction) {
            const applicant = applicants.find(x => x.id === id);
            const select = document.getElementById('stageActionSelect');
            if (!applicant || !select) return;
            const targetStage = select.value;
            closeActionModal('stageActionModal');
            if (!targetStage) return;
            await updateField(id, 'stage', targetStage);
        }

        function openResolveProblemModal(id) {
            const applicant = applicants.find(x => x.id === id);
            if (!applicant) return;
            const modalId = 'resolveProblemModal';
            closeActionModal(modalId);
            const continueLabel = applicant.status === 'fail'
                ? 'Tentar novamente nesta etapa'
                : 'Continuar desta etapa';
            const html = `<div id="${modalId}" class="modal-overlay" onclick="closeActionModal('${modalId}')">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:460px">
                    <div class="modal-header">
                        <h3 class="modal-title">Resolver Problema</h3>
                        <button class="modal-close" onclick="closeActionModal('${modalId}')">&times;</button>
                    </div>
                    <div class="modal-subtitle">${escapeHTML(applicant.name)}</div>
                    <p class="modal-body" style="margin-top:0">Escolha a a&ccedil;&atilde;o recomendada para este erro. O sistema preseleciona uma etapa, mas voc&ecirc; pode ajustar antes de confirmar.</p>
                    <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:12px">
                        <button class="manage-btn" style="justify-content:center;font-weight:600;color:#2563eb" onclick="setStageActionSelection('${applicant.stage}','Retoma a etapa atual ap\u00f3s corrigir o problema.')">${continueLabel}</button>
                        <button class="manage-btn" style="justify-content:center;font-weight:600;color:#d97706" onclick="setStageActionSelection('analysis','Volta para revis\u00e3o manual quando o erro pode esconder outros dados inconsistentes.')">Voltar para an&aacute;lise</button>
                        <button class="manage-btn" style="justify-content:center;font-weight:600;color:#64748b" onclick="setStageActionSelection('screening','Reabre o processo desde o in\u00edcio quando a base precisa ser revisada por completo.')">Reiniciar do zero</button>
                        ${applicant.stage === 'ds160' ? `<button class="manage-btn" style="justify-content:center;font-weight:600;color:#8b5cf6" onclick="closeActionModal('${modalId}');confirmNewDS160('${id}','${applicant.name.replace(/'/g, "\\\&#39;")}')">Novo DS-160</button>` : ''}
                    </div>
                    <div class="manage-section-label">Etapa de destino</div>
                    <select id="stageActionSelect" class="manage-select">${getStageOptions(applicant.stage)}</select>
                    <div id="stageActionHint" style="font-size:12px;color:var(--text-muted);margin-top:6px">A etapa atual foi preselecionada para continuar ap&oacute;s corrigir o problema.</div>
                    <div class="modal-actions" style="margin-top:16px">
                        <button class="modal-btn" onclick="closeActionModal('${modalId}')">Cancelar</button>
                        <button class="modal-btn primary" onclick="confirmProblemResolution('${id}')">Confirmar decis&atilde;o</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function confirmProblemResolution(id) {
            const targetStage = document.getElementById('stageActionSelect')?.value;
            closeActionModal('resolveProblemModal');
            if (!targetStage) return;
            await updateField(id, 'stage', targetStage);
        }

        function viewJSON(id) { const a = applicants.find(x => x.id === id); if (a?.data) { navigator.clipboard.writeText(JSON.stringify(a.data, null, 2)); showToast('JSON copiado!', 'success'); } else showToast('Sem dados', 'error'); }
        function bulkExport() { const d = applicants.filter(a => selectedIds.has(a.id)).map(a => a.data || {}); navigator.clipboard.writeText(JSON.stringify(d, null, 2)); showToast('Exportado!', 'success'); }

        // Individual delete/archive with protection
        async function deleteApplicant(id, name) {
            const a = applicants.find(x => x.id === id);
            const hasFilled = a && a.progress > 0;

            if (hasFilled) {
                // Cannot delete â€” offer archive instead
                showConfirmModal('Arquivar Solicitante',
                    `<strong>${name}</strong> j\u00e1 preencheu dados no formul\u00e1rio e n\u00e3o pode ser exclu\u00eddo.<br><small style="color:var(--text-muted)">Deseja arquivar em vez de excluir?</small>`,
                    async () => {
                        try {
                            await sbFetch(`applicants?id=eq.${id}`, 'PATCH', { stage: 'archived', status: 'done' });
                            if (a) { a.stage = 'archived'; a.status = 'done'; }
                            renderTable(); renderFilters(); updateBadges();
                            showToast('Solicitante arquivado.', 'success');
                        } catch (e) { showToast('Erro: ' + e.message, 'error'); }
                    });
                return;
            }

            showConfirmModal('Excluir Solicitante', `Tem certeza que deseja excluir <strong>${name}</strong>?<br><small style="color:var(--text-muted)">Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.</small>`, async () => {
                try {
                    // #8 fix: if member of group, check if principal
                    if (a?.group_id) {
                        const groupMembers = applicants.filter(x => x.group_id === a.group_id).sort((x,y) => (x.sort_order??999) - (y.sort_order??999));
                        const isPrincipal = groupMembers[0]?.id === id;
                        if (isPrincipal && groupMembers.length > 1) {
                            showToast('NÃ£o Ã© possÃ­vel excluir o solicitante principal enquanto houver outros membros no grupo. Desvincule-os primeiro.', 'error');
                            return;
                        }
                    }
                    await sbFetch(`applicants?id=eq.${id}`, 'DELETE');
                    applicants = applicants.filter(x => x.id !== id);
                    selectedIds.delete(id);
                    renderTable(); renderFilters(); updateBadges();
                    showToast('Solicitante excluÃ­do.', 'success');
                } catch (e) { showToast('Erro ao excluir: ' + e.message, 'error'); }
            });
        }
        async function bulkDelete() {
            showConfirmModal('Excluir Solicitantes', `Tem certeza que deseja excluir ${selectedIds.size} solicitante(s)?`, async () => {
                const selectedApplicants = applicants.filter(a => selectedIds.has(a.id));
                const filledApplicants = selectedApplicants.filter(a => a.progress > 0);
                if (filledApplicants.length > 0) {
                    showToast(`NÃ£o Ã© possÃ­vel excluir solicitantes com dados preenchidos: ${filledApplicants.map(a => shortName(a.name)).join(', ')}`, 'error');
                    return;
                }

                const blockedPrincipals = selectedApplicants.filter(a => {
                    if (!a.group_id) return false;
                    const groupMembers = applicants
                        .filter(x => x.group_id === a.group_id)
                        .sort((x, y) => (x.sort_order ?? 999) - (y.sort_order ?? 999));
                    return groupMembers.length > 1 && groupMembers[0]?.id === a.id;
                });
                if (blockedPrincipals.length > 0) {
                    showToast(`NÃ£o Ã© possÃ­vel excluir o principal de grupos ativos: ${blockedPrincipals.map(a => shortName(a.name)).join(', ')}`, 'error');
                    return;
                }

                let errors = 0;
                for (const id of selectedIds) { try { await sbFetch(`applicants?id=eq.${id}`, 'DELETE'); } catch (e) { errors++; } }
                await loadApplicants(); clearSelection(); navigateTo(currentPage);
                if (errors > 0) showToast(`Erro ao excluir ${errors} iten(s)`, 'error');
                else showToast('ExcluÃ­do(s) com sucesso!', 'success');
            });
        }

        async function archiveApplicantRecord(id) {
            await sbFetch(`applicants?id=eq.${id}`, 'PATCH', { stage: 'archived', status: 'done' });
            const a = applicants.find(x => x.id === id);
            if (a) {
                a.stage = 'archived';
                a.status = 'done';
            }
        }

        async function purgeApplicantData(id) {
            const applicant = applicants.find(x => x.id === id);
            const oldGroupId = applicant?.group_id || null;
            const cleanupEndpoints = [
                `ais_accounts?applicant_id=eq.${id}`,
                `applications?applicant_id=eq.${id}`,
                `applicant_data_backups?applicant_id=eq.${id}`
            ];

            for (const endpoint of cleanupEndpoints) {
                try {
                    await sbFetch(endpoint, 'DELETE');
                } catch (e) {
                    console.warn('[ApplicantPurge] Cleanup skipped:', endpoint, e.message);
                }
            }

            await sbFetch(`applicants?id=eq.${id}`, 'DELETE');
            applicants = applicants.filter(x => x.id !== id);
            selectedIds.delete(id);

            if (oldGroupId) {
                const remaining = getGroupMembers(oldGroupId, { includeArchived: true });
                if (remaining.length === 0) {
                    try { await sbFetch(`groups?id=eq.${oldGroupId}`, 'DELETE'); } catch (_) { }
                    _groups = _groups.filter(g => String(g.id) !== String(oldGroupId));
                } else if (remaining.length === 1) {
                    const loneMember = remaining[0];
                    await sbFetch(`applicants?id=eq.${loneMember.id}`, 'PATCH', { group_id: null });
                    loneMember.group_id = null;
                    try { await sbFetch(`groups?id=eq.${oldGroupId}`, 'DELETE'); } catch (_) { }
                    _groups = _groups.filter(g => String(g.id) !== String(oldGroupId));
                }
            }
        }

        deleteApplicant = async function(id, name) {
            const a = applicants.find(x => x.id === id);
            if (!a) return;

            if (a.stage !== 'archived') {
                showConfirmModal('Arquivar Solicitante',
                    `Deseja arquivar <strong>${name}</strong>?<br><small style="color:var(--text-muted)">Ele sairÃ¡ da operaÃ§Ã£o ativa e poderÃ¡ ser excluÃ­do permanentemente depois, se necessÃ¡rio.</small>`,
                    async () => {
                        try {
                            await archiveApplicantRecord(id);
                            renderTable(); renderFilters(); updateBadges();
                            showToast('Solicitante arquivado.', 'success');
                        } catch (e) { showToast('Erro: ' + e.message, 'error'); }
                    });
                return;
            }

            showConfirmModal('Excluir Permanentemente',
                `Deseja apagar <strong>${name}</strong> definitivamente?<br><small style="color:var(--text-muted)">Todos os dados vinculados serÃ£o removidos do banco.</small>`,
                async () => {
                    try {
                        if (a.group_id) {
                            const groupMembers = getGroupMembers(a.group_id, { includeArchived: true });
                            const isPrincipal = groupMembers[0]?.id === id;
                            if (isPrincipal && groupMembers.length > 1) {
                                showToast('NÃ£o Ã© possÃ­vel excluir o principal enquanto houver outros membros vinculados ao grupo.', 'error');
                                return;
                            }
                        }
                        await purgeApplicantData(id);
                        renderTable(); renderFilters(); updateBadges();
                        showToast('Solicitante excluÃ­do permanentemente.', 'success');
                    } catch (e) { showToast('Erro ao excluir: ' + e.message, 'error'); }
                });
        };

        bulkDelete = async function() {
            const selectedApplicants = applicants.filter(a => selectedIds.has(a.id));
            if (!selectedApplicants.length) return;

            const activeApplicants = selectedApplicants.filter(a => a.stage !== 'archived');
            const archivedApplicants = selectedApplicants.filter(a => a.stage === 'archived');
            const activeLabel = activeApplicants.length ? `${activeApplicants.length} arquivamento(s)` : null;
            const archivedLabel = archivedApplicants.length ? `${archivedApplicants.length} exclusÃ£o(Ãµes) permanente(s)` : null;
            const summary = [activeLabel, archivedLabel].filter(Boolean).join(' e ');

            showConfirmModal('Confirmar aÃ§Ã£o',
                `Deseja processar ${summary || `${selectedApplicants.length} solicitante(s)`}?<br><small style="color:var(--text-muted)">Ativos serÃ£o arquivados. Arquivados serÃ£o excluÃ­dos definitivamente.</small>`,
                async () => {
                    try {
                        for (const applicant of activeApplicants) {
                            await archiveApplicantRecord(applicant.id);
                        }

                        for (const applicant of archivedApplicants) {
                            if (applicant.group_id) {
                                const groupMembers = getGroupMembers(applicant.group_id, { includeArchived: true });
                                const isPrincipal = groupMembers[0]?.id === applicant.id;
                                if (isPrincipal && groupMembers.length > 1) {
                                    showToast(`NÃ£o Ã© possÃ­vel excluir o principal ${shortName(applicant.name)} enquanto houver outros membros vinculados.`, 'error');
                                    continue;
                                }
                            }
                            await purgeApplicantData(applicant.id);
                        }

                        await loadApplicants();
                        clearSelection();
                        navigateTo(currentPage);
                        showToast('AÃ§Ã£o concluÃ­da com sucesso!', 'success');
                    } catch (e) {
                        showToast('Erro: ' + e.message, 'error');
                    }
                });
        };

        // ==========================================
        // MANAGE MENU
        // ==========================================
        let _manageMenuId = null;
        function showManageMenu(evt, id) {
            if (typeof evt === 'string') { id = evt; evt = null; }
            if (evt) evt.stopPropagation(); _manageMenuId = id;
            const a = applicants.find(x => x.id === id); if (!a) return;
            const existing = document.getElementById('managePopup'); if (existing) existing.remove();
            const stages = ['screening', 'analysis', 'ds160', 'payment', 'scheduling', 'interview', 'outcome', 'archived'];
            const nextStage = getNextStage(a.stage);
            const previousStage = getPreviousStage(a.stage);
            const eligibleGroups = _groups.filter(g => {
                const members = applicants.filter(x => x.group_id === g.id);
                if (!members.length) return false;
                const groupStage = members[0]?.stage || 'screening';
                return members.every(m => m.stage === groupStage) && groupStage === a.stage;
            });
            const backActionAttrs = previousStage ? `onclick="closeManageMenu();openStageActionModal('${id}','back')"` : 'disabled';
            const backActionStyle = previousStage ? 'justify-content:center;gap:6px;font-weight:600' : 'justify-content:center;gap:6px;font-weight:600;opacity:.45;cursor:not-allowed';
            const forwardActionAttrs = nextStage ? `onclick="closeManageMenu();openStageActionModal('${id}','forward')"` : 'disabled';
            const forwardActionStyle = nextStage ? 'justify-content:center;gap:6px;font-weight:600;color:#2563eb' : 'justify-content:center;gap:6px;font-weight:600;color:#2563eb;opacity:.45;cursor:not-allowed';

            let html = `<div id="managePopup" class="modal-overlay" onclick="closeManageMenu()">
            <div class="modal-box modal-manage" onclick="event.stopPropagation()">
                <div class="modal-header"><h3 class="modal-title">Gerenciar Solicitante</h3><button class="modal-close" onclick="closeManageMenu()">&times;</button></div>
                <div class="modal-subtitle">${a.name}</div>
                <div class="manage-section-label">A&ccedil;&otilde;es r&aacute;pidas</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
                    <button class="manage-btn" ${backActionAttrs} style="${backActionStyle}">
                        <i class="iconoir-nav-arrow-left" style="font-size:14px"></i> Voltar
                    </button>
                    <button class="manage-btn" ${forwardActionAttrs} style="${forwardActionStyle}">
                        <i class="iconoir-nav-arrow-right" style="font-size:14px"></i> Avan&ccedil;ar
                    </button>
                </div>
                ${a.status === 'error' || a.status === 'fail'
                    ? `<button class="manage-btn" style="width:100%;justify-content:center;gap:6px;font-weight:600;color:#d97706;margin-bottom:12px" onclick="closeManageMenu();openResolveProblemModal('${id}')">
                        <i class="iconoir-warning-triangle" style="font-size:14px"></i> Resolver problema
                      </button>`
                    : ''}

                <div class="manage-section-label">Grupo</div>`;

            if (a.group_id) {
                html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
                    <span style="font-size:12px;color:var(--text-muted)"><i class="iconoir-folder"></i> ${getGroupLabel(a.group_id)}</span>
                    <button class="manage-btn" style="color:#ef4444;font-size:11px;padding:2px 8px" onclick="unlinkFromGroup('${id}')">Desvincular</button>
                </div>`;
            } else {
                html += `<div style="position:relative">
                    <input type="text" id="groupSearchInput" class="manage-select" placeholder="Buscar grupo por nome ou ID..." oninput="filterGroupResults()" onfocus="openGroupSearchResults()" autocomplete="off">
                    <div id="groupSearchResults" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:160px;overflow-y:auto;background:var(--bg-main,#fff);border:1px solid var(--border-light,#e2e8f0);border-radius:0 0 8px 8px;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,.1)">
                        ${eligibleGroups.map(g => {
                            const members = applicants.filter(x => x.group_id === g.id);
                            const stage = members[0]?.stage || 'screening';
                            return `<div class="group-search-item" data-gid="${g.id}" onclick="linkToSearchedGroup('${id}','${g.id}')" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border-light,#f1f5f9);display:flex;justify-content:space-between;align-items:center">
                                <span><i class="iconoir-group" style="margin-right:4px"></i> ${g.nickname || getGroupLabel(g.id)}</span>
                                <span style="color:var(--text-muted);font-size:11px">${STAGE_LABELS[stage]} &middot; ${members.length} membros</span>
                            </div>`;
                        }).join('')}
                        ${_groups.length === 0 ? '<div style="padding:8px 12px;font-size:12px;color:var(--text-muted)">Nenhum grupo dispon&iacute;vel</div>' : ''}
                    </div>
                </div>`;
            }

            html += `
                <details style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">
                <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em">Mais op&ccedil;&otilde;es</summary>
                <div class="manage-section-label" style="margin-top:12px">Etapa</div>
                <select class="manage-select" onchange="updateField('${id}','stage',this.value)">
                    ${stages.map(s => `<option value="${s}" ${a.stage === s ? 'selected' : ''}>${STAGE_LABELS[s]}</option>`).join('')}
                </select>


                <div class="manage-section-label">Status</div>
                ${(() => {
                    if (a.stage === 'interview') {
                        // Interview: status manuais + select de resultado para avanÃ§ar
                        const manualStatuses = ['todo', 'doing', 'retry'];
                        return `<select class="manage-select" onchange="updateField('${id}','status',this.value)">
                                ${manualStatuses.map(k => { const v = STATUS_CONFIG[k]; return `<option value="${k}" ${a.status === k ? 'selected' : ''}>${v.label}</option>`; }).join('')}
                            </select>
                            <div class="manage-section-label">Resultado da Entrevista</div>
                            <select class="manage-select" onchange="updateField('${id}','result_advance',this.value)">
                                <option value="" selected disabled>Selecionar resultado...</option>
                                ${Object.entries(RESULT_CONFIG).filter(([k]) => k !== 'pending').map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                            </select>`;
                    } else if (a.stage === 'outcome') {
                        // Outcome: status = opÃ§Ãµes de resultado (sem pending)
                        const outcomeStatuses = { approved: 'Aprovado', denied: 'Negado', new_interview: 'Nova Entrevista', additional_documents: 'Docs. Complementares', administrative: 'Processo Adm.' };
                        return `<select class="manage-select" onchange="updateField('${id}','result',this.value)">
                            ${Object.entries(outcomeStatuses).map(([k, v]) => `<option value="${k}" ${getOutcomeValue(a) === k ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>`;
                    } else if (a.stage === 'analysis') {
                        // Analysis: conclusÃ£o manual do assessor
                        const manualStatuses = ['todo', 'doing', 'done', 'retry'];
                        return `<select class="manage-select" onchange="updateField('${id}','status',this.value)">
                            ${manualStatuses.map(k => { const v = STATUS_CONFIG[k]; return `<option value="${k}" ${a.status === k ? 'selected' : ''}>${v.label}</option>`; }).join('')}
                        </select>`;
                    } else {
                        // Normal stages: status manuais (error/failed/standby sÃ£o controlados pela automaÃ§Ã£o)
                        const manualStatuses = ['todo', 'doing', 'retry'];
                        return `<select class="manage-select" onchange="updateField('${id}','status',this.value)">
                            ${manualStatuses.map(k => { const v = STATUS_CONFIG[k]; return `<option value="${k}" ${a.status === k ? 'selected' : ''}>${v.label}</option>`; }).join('')}
                        </select>`;
                    }
                })()}

                <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px;display:flex;flex-direction:column;gap:8px">
                    <button class="manage-btn" style="color:#3b82f6;width:100%;justify-content:center;gap:6px;font-weight:600" onclick="closeManageMenu();confirmNewDS160('${id}','${a.name.replace(/'/g, "\\\&#39;")}')">
                        <i class="iconoir-refresh-double" style="font-size:14px"></i> Novo DS-160
                    </button>
                    ${a.stage === 'archived'
                        ? `<button class="manage-btn" style="color:#ef4444;width:100%;justify-content:center;gap:6px;font-weight:600" onclick="closeManageMenu();deleteApplicant('${id}','${a.name.replace(/'/g, "\\\&#39;")}')">
                            <i class="iconoir-trash" style="font-size:14px"></i> Excluir permanentemente
                          </button>`
                        : `<button class="manage-btn" style="color:#f59e0b;width:100%;justify-content:center;gap:6px;font-weight:600" onclick="archiveFromManage('${id}')">
                            <i class="iconoir-archive" style="font-size:14px"></i> Arquivar Solicitante
                          </button>`
                    }
                </div>
                </details>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);

            // Close search results when clicking outside
            const popup = document.getElementById('managePopup');
            popup?.addEventListener('click', (e) => {
                const withinGroupSearch = e.target.closest('#groupSearchInput') || e.target.closest('#groupSearchResults');
                if (!withinGroupSearch) closeGroupSearchResults();
            });
        }

        function openGroupSearchResults() {
            const sr = document.getElementById('groupSearchResults');
            if (!sr) return;
            if (!document.querySelector('.group-search-item')) {
                sr.style.display = 'none';
                return;
            }
            sr.style.display = 'block';
            filterGroupResults();
        }

        function closeGroupSearchResults() {
            const sr = document.getElementById('groupSearchResults');
            if (!sr) return;
            sr.style.display = 'none';
        }

        function filterGroupResults() {
            const q = (document.getElementById('groupSearchInput')?.value || '').toLowerCase();
            const items = document.querySelectorAll('.group-search-item');
            if (!items.length) {
                closeGroupSearchResults();
                return;
            }
            let visibleCount = 0;
            items.forEach(el => {
                const text = el.textContent.toLowerCase();
                const gid = el.dataset.gid?.toLowerCase() || '';
                const visible = text.includes(q) || gid.includes(q);
                el.style.display = visible ? '' : 'none';
                if (visible) visibleCount++;
            });
            const sr = document.getElementById('groupSearchResults');
            if (!sr) return;
            const emptyStateId = 'groupSearchEmptyState';
            let emptyState = document.getElementById(emptyStateId);
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.id = emptyStateId;
                emptyState.style.cssText = 'padding:8px 12px;font-size:12px;color:var(--text-muted);display:none';
                emptyState.textContent = 'Nenhum grupo encontrado';
                sr.appendChild(emptyState);
            }
            emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
            sr.style.display = 'block';
        }

        async function linkToSearchedGroup(applicantId, groupId) {
            try {
                await linkApplicantToGroup(applicantId, groupId);
                closeGroupSearchResults();
                closeManageMenu(); renderTable(); renderFilters(); updateBadges();
                showToast(`Vinculado ao ${getGroupLabel(groupId)}!`, 'success');
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function linkToSelectedGroup(id) {
            const select = document.getElementById('groupSelect');
            const gid = select?.value || null;
            if (!gid) { showToast('Selecione um grupo', 'error'); return; }
            await linkToSearchedGroup(id, gid);
        }

        function unlinkFromGroup(id) {
            const a = applicants.find(x => x.id === id);
            if (!a) return;
            closeManageMenu();
            showUnlinkModal(a);
        }

        async function archiveFromManage(id) {
            const a = applicants.find(x => x.id === id);
            if (!a) return;
            closeManageMenu();
            showConfirmModal('Arquivar Solicitante',
                `Tem certeza que deseja arquivar <strong>${a.name}</strong>?<br><small style="color:var(--text-muted)">O solicitante serÃ¡ movido para Arquivado.</small>`,
                async () => {
                    try {
                        await sbFetch(`applicants?id=eq.${id}`, 'PATCH', { stage: 'archived', status: 'done' });
                        a.stage = 'archived'; a.status = 'done';
                        renderTable(); renderFilters(); updateBadges();
                        showToast('Solicitante arquivado.', 'success');
                    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
                });
        }

        function closeManageMenu() { const p = document.getElementById('managePopup'); if (p) p.remove(); }

        // â”€â”€â”€ GROUP MENU â”€â”€â”€
        function showGroupMenu(evt, groupId) {
            evt.stopPropagation();
            const existing = document.getElementById('groupMenu'); if (existing) existing.remove();
            const members = applicants.filter(a => a.group_id === groupId);
            const label = getGroupLabel(groupId);

            const html = `<div id="groupMenu" class="modal-overlay" onclick="document.getElementById('groupMenu').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:320px">
                <h3 class="modal-title">Gerenciar Grupo</h3>
                <div class="modal-subtitle"><i class="iconoir-folder"></i> ${label} (${members.length} membros)</div>
                <button class="modal-btn" style="background:#3b82f6;color:#fff;margin-top:12px" onclick="document.getElementById('groupMenu').remove();openAddMemberModal('${groupId}')">+ Adicionar Membro</button>
        <button class="modal-btn" onclick="document.getElementById('groupMenu').remove()">Fechar</button>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        function openApplicantNotesModal(appId) {
            const existing = document.getElementById('appNotesModal'); if (existing) existing.remove();
            const app = applicants.find(x => x.id === appId);
            const currentNotes = app?.notes || '';
            const html = `<div id="appNotesModal" class="modal-overlay" onclick="document.getElementById('appNotesModal').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">
                <h3 class="modal-title">Notas - ${app ? titleCase(app.name) : 'Solicitante'}</h3>
                <textarea id="appNotesText" style="width:100%;min-height:120px;padding:10px;border-radius:6px;border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;resize:vertical;font-family:inherit;margin-bottom:12px" placeholder="Escreva uma nota...">${currentNotes}</textarea>
                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button class="modal-btn" onclick="document.getElementById('appNotesModal').remove()">Cancelar</button>
                    <button class="modal-btn" style="background:var(--accent);color:#fff" onclick="saveApplicantNotes('${appId}')">Salvar</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            const ta = document.getElementById('appNotesText'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
        }

        async function saveApplicantNotes(appId) {
            const notes = document.getElementById('appNotesText')?.value || '';
            try {
                await sbFetch('applicants?id=eq.' + appId, 'PATCH', { notes });
                const app = applicants.find(x => x.id === appId);
                if (app) app.notes = notes;
                document.getElementById('appNotesModal')?.remove();
                showToast('Nota salva');
                renderTable();
            } catch (e) { console.error(e); showToast('Erro ao salvar nota', 'error'); }
        }

        function openAddMemberModal(groupId) {
            const existing = document.getElementById('addMemberModal'); if (existing) existing.remove();
            const html = `<div id="addMemberModal" class="modal-overlay" onclick="document.getElementById('addMemberModal').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:380px">
                <h3 class="modal-title">Adicionar Solicitante</h3>
                <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Informe o nome completo do solicitante para vincular ao grupo.</p>
                <input type="text" id="newMemberName" class="modal-input" placeholder="Nome completo" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;margin-bottom:12px" autofocus>
                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button class="modal-btn" onclick="document.getElementById('addMemberModal').remove()">Cancelar</button>
                    <button class="modal-btn" style="background:var(--accent);color:#fff" onclick="addMemberToGroup('${groupId}')">Adicionar</button>
                </div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            document.getElementById('newMemberName').focus();
            document.getElementById('newMemberName').addEventListener('keydown', e => { if (e.key === 'Enter') addMemberToGroup(groupId); });
        }

        async function addMemberToGroup(groupId) {
            const input = document.getElementById('newMemberName');
            const name = (input?.value || '').trim();
            if (!name) { showToast('Informe o nome', 'error'); return; }
            try {
                const validation = getGroupJoinValidation('screening', groupId);
                if (!validation.ok) throw new Error(validation.message);

                const body = {
                    full_name: name,
                    group_id: groupId,
                    stage: 'screening',
                    status: 'todo',
                    sort_order: getNextGroupSortOrder(groupId),
                    result: 'pending',
                    data: {}
                };
                if (resolvedCompanyId) body.company_id = resolvedCompanyId;
                const res = await sbFetch('applicants', 'POST', body);
                document.getElementById('addMemberModal')?.remove();
                expandedGroups.add(String(groupId));
                showToast(`Solicitante adicionado ao ${getGroupLabel(groupId)}!`);
                await loadApplicants(); renderTable(); updateBadges();
            } catch (e) { console.error(e); showToast('Erro ao adicionar', 'error'); }
        }

        function openGroupNotesModal(groupId) {
            const existing = document.getElementById('groupNotesModal'); if (existing) existing.remove();
            const g = _groups.find(x => x.id === groupId);
            const currentNotes = g ? (g.notes || '') : '';
            const label = getGroupLabel(groupId);
            const html = `<div id="groupNotesModal" class="modal-overlay" onclick="document.getElementById('groupNotesModal').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:420px">
                <h3 class="modal-title">Notas do Grupo</h3>
                <div class="modal-subtitle"><i class="iconoir-folder"></i> ${label}</div>
                <textarea id="groupNotesTextarea" rows="5" style="width:100%;margin:12px 0;padding:10px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;font-family:inherit;resize:vertical;background:var(--bg-main);color:var(--text-primary)">${currentNotes}</textarea>
                <button class="modal-btn" style="background:#3b82f6;color:#fff" onclick="saveGroupNotes('${groupId}')">Salvar</button>
                <button class="modal-btn" onclick="document.getElementById('groupNotesModal').remove()">Cancelar</button>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            setTimeout(() => document.getElementById('groupNotesTextarea').focus(), 100);
        }

        async function saveGroupNotes(groupId) {
            const textarea = document.getElementById('groupNotesTextarea');
            const notes = textarea ? textarea.value.trim() : '';
            try {
                await sbFetch(`groups?id=eq.${groupId}`, 'PATCH', { notes });
                const g = _groups.find(x => x.id === groupId);
                if (g) g.notes = notes;
                const modal = document.getElementById('groupNotesModal'); if (modal) modal.remove();
                renderTable();
                showToast('Notas do grupo salvas!', 'success');
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function legacyUpdateField(id, field, value) {
            try {
                const patch = { [field]: value };
                const a = applicants.find(x => x.id === id);

                // === GROUP STAGE RULES ===
                if (field === 'stage' && a && a.group_id) {
                    const groupMembers = applicants.filter(x => x.group_id === a.group_id && x.stage !== 'archived');
                    const stageOrder = ['screening', 'analysis', 'ds160', 'payment', 'scheduling', 'interview', 'outcome', 'archived'];
                    const currentIdx = stageOrder.indexOf(a.stage);
                    const targetIdx = stageOrder.indexOf(value);
                    const isAdvancing = targetIdx > currentIdx;

                    // #3 fix: validate pre-conditions only on advance
                    if (isAdvancing) {
                        const allSameStage = groupMembers.every(m => m.stage === a.stage);
                        if (!allSameStage) {
                            showToast('Grupo: todos precisam estar na mesma etapa para avanÃ§ar.', 'error');
                            return;
                        }

                        // Screening â†’ Analysis: todos precisam ter 100% preenchido
                        if (a.stage === 'screening' && value === 'analysis') {
                            const incomplete = groupMembers.filter(m => m.progress < 100);
                            if (incomplete.length > 0) {
                                showToast(`FormulÃ¡rios incompletos: ${incomplete.map(m => m.name).join(', ')}`, 'error');
                                return;
                            }
                        }

                        // Analysis â†’ DS-160: todos precisam estar done
                        if (a.stage === 'analysis' && value === 'ds160') {
                            const notDone = groupMembers.filter(m => m.status !== 'done');
                            if (notDone.length > 0) {
                                showToast(`Ainda nÃ£o concluÃ­dos: ${notDone.map(m => m.name).join(', ')}`, 'error');
                                return;
                            }
                        }
                    }

                    // Move all group members together (advance or retreat)
                    for (const m of groupMembers) {
                        if (m.id !== id) {
                            const memberPatch = { stage: value, status: getDefaultStatusForStage(value) };
                            if (value === 'outcome' && !m.result) memberPatch.result = getOutcomeValue(m);
                            await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', memberPatch);
                            m.stage = value;
                            m.status = memberPatch.status;
                            if (memberPatch.result) m.result = memberPatch.result;
                        }
                    }
                }

                // Special: entering interview â†’ status=pending, entering analysis â†’ status=doing
                if (field === 'stage' && a) {
                    patch.status = getDefaultStatusForStage(value);
                    if (value === 'outcome' && !patch.result) patch.result = getOutcomeValue(a);
                }

                // AUTO-ADVANCE: status done â†’ avanÃ§a para prÃ³xima etapa com status todo
                // Regras por etapa:
                //   triagem â†’ anÃ¡lise (form 100% auto-seta done)
                //   anÃ¡lise â†’ ds160 (assessor manual)
                //   ds160 â†’ taxas â†’ agendamento â†’ entrevista (done avanÃ§a)
                //   entrevista â†’ resultado (via result_advance, NÃƒO via done)
                if (field === 'status' && value === 'done' && a && a.stage !== 'interview' && a.stage !== 'outcome') {
                    const stageOrder = ['screening', 'analysis', 'ds160', 'payment', 'scheduling', 'interview'];
                    const curIdx = stageOrder.indexOf(a.stage);
                    if (curIdx >= 0 && curIdx < stageOrder.length - 1) {
                        const nextStage = stageOrder[curIdx + 1];
                        patch.stage = nextStage;
                        patch.status = 'todo';
                        // Grupo: avanÃ§ar todos os membros juntos
                        if (a.group_id) {
                            const groupMembers = applicants.filter(x => x.group_id === a.group_id && x.stage === a.stage);
                            for (const m of groupMembers) {
                                if (m.id !== id) {
                                    await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { stage: nextStage, status: 'todo' });
                                    m.stage = nextStage;
                                    m.status = 'todo';
                                }
                            }
                        }
                    }
                }
                // === RESULT ADVANCE: interview â†’ outcome ===
                if (field === 'result_advance' && a) {
                    patch.stage = 'outcome';
                    patch.status = 'done';
                    patch.result = value;
                    delete patch.result_advance;
                    // Group: move all members
                    if (a.group_id) {
                        const groupMembers = applicants.filter(x => x.group_id === a.group_id && x.stage !== 'archived');
                        for (const m of groupMembers) {
                            if (m.id !== id) {
                                await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { stage: 'outcome', status: 'done', result: value });
                                m.stage = 'outcome';
                                m.status = 'done';
                                m.result = value;
                            }
                        }
                    }
                }
                if (field === 'result' && a) {
                    patch.result = value;
                    patch.status = 'done';
                    if (a.group_id) {
                        const groupMembers = applicants.filter(x => x.group_id === a.group_id && x.stage === 'outcome');
                        for (const m of groupMembers) {
                            if (m.id !== id) {
                                await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { result: value, status: 'done' });
                                m.result = value;
                                m.status = 'done';
                            }
                        }
                    }
                }
                await sbFetch(`applicants?id=eq.${id}`, 'PATCH', patch);
                const origStage = a?.stage;
                if (a) Object.assign(a, patch);
                const autoMsg = patch.stage && patch.stage !== origStage ? ` â†’ ${STAGE_LABELS[patch.stage]}` : '';
                showToast('Atualizado!' + autoMsg, 'success');

                // Keep modal open â€” refresh selects in place
                renderTable(); renderFilters(); updateBadges();
                const popup = document.getElementById('managePopup');
                if (popup) {
                    // Re-open modal with updated data
                    closeManageMenu();
                    showManageMenu(id);
                }
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function updateField(id, field, value) {
            try {
                const patch = { [field]: value };
                const a = applicants.find(x => x.id === id);

                if (field === 'stage' && a && a.group_id) {
                    const groupMembers = getGroupMembers(a.group_id);
                    const currentIdx = STAGE_ORDER.indexOf(a.stage);
                    const targetIdx = STAGE_ORDER.indexOf(value);
                    const isAdvancing = targetIdx > currentIdx;

                    if (isAdvancing) {
                        const allSameStage = groupMembers.every(m => m.stage === a.stage);
                        if (!allSameStage) {
                            showToast('Grupo: todos precisam estar na mesma etapa para avanÃ§ar.', 'error');
                            return;
                        }

                        if (a.stage === 'screening' && value === 'analysis') {
                            const incomplete = groupMembers.filter(m => m.progress < 100);
                            if (incomplete.length > 0) {
                                showToast(`FormulÃ¡rios incompletos: ${incomplete.map(m => m.name).join(', ')}`, 'error');
                                return;
                            }
                        }

                        if (a.stage === 'analysis' && value === 'ds160') {
                            const notDone = groupMembers.filter(m => m.status !== 'done');
                            if (notDone.length > 0) {
                                showToast(`Ainda nÃ£o concluÃ­dos: ${notDone.map(m => m.name).join(', ')}`, 'error');
                                return;
                            }
                        }
                    }

                    for (const m of groupMembers) {
                        if (m.id !== id) {
                            const memberPatch = { stage: value, status: getDefaultStatusForStage(value) };
                            if (value === 'outcome' && !m.result) memberPatch.result = getOutcomeValue(m);
                            await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', memberPatch);
                            m.stage = value;
                            m.status = memberPatch.status;
                            if (memberPatch.result) m.result = memberPatch.result;
                        }
                    }
                }

                if (field === 'stage' && a) {
                    patch.status = getDefaultStatusForStage(value);
                    if (value === 'outcome' && !patch.result) patch.result = getOutcomeValue(a);
                }

                if (field === 'status' && value === 'done' && a && a.stage !== 'interview' && a.stage !== 'outcome') {
                    const curIdx = STAGE_ORDER.indexOf(a.stage);
                    const interviewIdx = STAGE_ORDER.indexOf('interview');
                    if (curIdx >= 0 && curIdx < interviewIdx) {
                        const nextStage = STAGE_ORDER[curIdx + 1];
                        if (a.group_id) {
                            const readiness = getGroupAdvanceReadiness(a.group_id, a.stage, id);
                            if (readiness.sameStage && readiness.allDone) {
                                patch.stage = nextStage;
                                patch.status = 'todo';
                                for (const m of readiness.members) {
                                    if (m.id !== id) {
                                        await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { stage: nextStage, status: 'todo' });
                                        m.stage = nextStage;
                                        m.status = 'todo';
                                    }
                                }
                            } else {
                                patch.status = 'done';
                                if (!readiness.sameStage) {
                                    showToast('O grupo precisa estar inteiro na mesma etapa para avanÃ§ar.', 'info');
                                }
                            }
                        } else {
                            patch.stage = nextStage;
                            patch.status = 'todo';
                        }
                    }
                }

                if (field === 'result_advance' && a) {
                    patch.stage = 'outcome';
                    patch.status = 'done';
                    patch.result = value;
                    delete patch.result_advance;
                    if (a.group_id) {
                        const groupMembers = getGroupMembers(a.group_id);
                        for (const m of groupMembers) {
                            if (m.id !== id) {
                                await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { stage: 'outcome', status: 'done', result: value });
                                m.stage = 'outcome';
                                m.status = 'done';
                                m.result = value;
                            }
                        }
                    }
                }

                if (field === 'result' && a) {
                    patch.result = value;
                    patch.status = 'done';
                    if (a.group_id) {
                        const groupMembers = getGroupMembers(a.group_id, { stage: 'outcome' });
                        for (const m of groupMembers) {
                            if (m.id !== id) {
                                await sbFetch(`applicants?id=eq.${m.id}`, 'PATCH', { result: value, status: 'done' });
                                m.result = value;
                                m.status = 'done';
                            }
                        }
                    }
                }

                await sbFetch(`applicants?id=eq.${id}`, 'PATCH', patch);
                const origStage = a?.stage;
                if (a) Object.assign(a, patch);
                const autoMsg = patch.stage && patch.stage !== origStage ? ` â†’ ${STAGE_LABELS[patch.stage]}` : '';
                showToast('Atualizado!' + autoMsg, 'success');

                renderTable(); renderFilters(); updateBadges();
                const popup = document.getElementById('managePopup');
                if (popup) {
                    closeManageMenu();
                    showManageMenu(id);
                }
            } catch (e) {
                showToast('Erro: ' + e.message, 'error');
            }
        }

        async function saveNotes(id) {
            try {
                const notes = document.getElementById('notesField')?.value || '';
                await sbFetch(`applicants?id=eq.${id}`, 'PATCH', { notes });
                const a = applicants.find(x => x.id === id);
                if (a) a.notes = notes;
                showToast('AnotaÃ§Ãµes salvas!', 'success');
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        // ==========================================
        // NOVO DS-160 (confirmation + execution)
        // ==========================================
        function confirmNewDS160(id, name) {
            const existing = document.getElementById('confirmDS160Modal');
            if (existing) existing.remove();
            const html = `<div id="confirmDS160Modal" class="modal-overlay" onclick="document.getElementById('confirmDS160Modal').remove()">
                <div class="modal-box" style="max-width:420px" onclick="event.stopPropagation()">
                    <div class="modal-header"><h3 class="modal-title">Novo DS-160</h3><button class="modal-close" onclick="document.getElementById('confirmDS160Modal').remove()">&times;</button></div>
                    <div style="padding:16px 20px;font-size:14px;color:var(--text-secondary)">
                        <p style="margin:0 0 12px">Criar um <strong>novo DS-160</strong> para <strong>${name}</strong>?</p>
                        <p style="margin:0;font-size:12px;color:var(--text-muted)">O application ID anterior serÃ¡ apagado. O solicitante voltarÃ¡ para a fila DS-160 .</p>
                    </div>
                    <div style="display:flex;gap:8px;padding:12px 20px;justify-content:flex-end;border-top:1px solid var(--border)">
                        <button class="manage-btn" style="padding:8px 16px" onclick="document.getElementById('confirmDS160Modal').remove()">Cancelar</button>
                        <button class="manage-btn" style="padding:8px 16px;background:#3b82f6;color:#fff;border-radius:6px;font-weight:600" onclick="executeNewDS160('${id}')">Confirmar</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function executeNewDS160(id) {
            document.getElementById('confirmDS160Modal')?.remove();
            try {
                // 1. Resetar application (apagar application_id, limpar errors)
                const appsRes = await sbGet(`applications?applicant_id=eq.${id}&order=created_at.desc&limit=1`);
                if (appsRes && appsRes.length > 0) {
                    await sbFetch(`applications?id=eq.${appsRes[0].id}`, 'PATCH', {
                        fill_status: 'todo',
                        fill_error: null,
                        fill_worker_id: null,
                        fill_started_at: null,
                        fill_finished_at: null,
                        retry_count: 0,
                        last_page: null,
                        application_id: null,
                        last_error_at: null
                    });
                }

                // 2. Atualizar solicitante: stage=ds160, status=todo
                await sbFetch(`applicants?id=eq.${id}`, 'PATCH', {
                    stage: 'ds160',
                    status: 'todo',
                                        updated_at: new Date().toISOString()
                });

                // 3. Atualizar local
                const a = applicants.find(x => x.id === id);
                if (a) { a.stage = 'ds160'; a.status = 'todo'; a.application_id = null; }

                showToast('Novo DS-160 criado - na fila', 'success');
                renderTable(); renderFilters(); updateBadges();
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        // ==========================================
        // BADGES + HELPERS
        // ==========================================
        // Badges: contam apenas trabalho ativo (exclui done, error, failed)
        function updateBadges() { Object.keys(PAGE_CONFIG).forEach(p => { const c = getApplicantsForPage(p).length; const el = document.getElementById('badge-' + p); if (el) el.textContent = c; }); }

        function formatDate(iso) {
            if (!iso) return '-';
            const d = new Date(iso);
            const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }

        function openSearchModal() {
            document.getElementById('searchModal').classList.remove('hidden');
            const input = document.getElementById('searchInput');
            input.value = '';
            document.getElementById('searchResults').innerHTML = '';
            setTimeout(() => input.focus(), 100);
        }
        function closeSearchModal() {
            document.getElementById('searchModal').classList.add('hidden');
            document.getElementById('searchInput').value = '';
            filterList(); // Reset filter
        }
        function updateSearchResults() {
            const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
            const container = document.getElementById('searchResults');
            if (!q) { container.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">Digite para buscar...</div>'; filterList(); return; }
            // Filter applicants
            const results = applicants.filter(a => {
                const name = (a.name || '').toLowerCase();
                const email = (a.email || '').toLowerCase();
                const passport = (a.passport || '').toLowerCase();
                const id = (a.id || '').toLowerCase();
                const groupLabel = a.group_id ? getGroupLabel(a.group_id).toLowerCase() : '';
                const groupId = (a.group_id || '').toLowerCase();
                const groupNickname = a.group_id ? (getGroupNickname(a.group_id) || '').toLowerCase() : '';
                return name.includes(q) || email.includes(q) || passport.includes(q) || id.includes(q) || groupLabel.includes(q) || groupId.includes(q) || groupNickname.includes(q);
            }).slice(0, 15);
            if (results.length === 0) {
                container.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">Nenhum resultado encontrado</div>';
                return;
            }
            container.innerHTML = results.map(a => {
                const groupMeta = a.group_id ? `<span style="font-size:11px;color:var(--text-muted)"> &middot; ${getGroupLabel(a.group_id)}</span>` : '';
                return `<div onclick="selectSearchResult('${a.id}')" style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--border-light)'" onmouseout="this.style.background='transparent'">
                    <span class="applicant-icon" style="flex-shrink:0"><i class="iconoir-user"></i></span>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${titleCase(a.name)}</div>
                        <div style="font-size:11px;color:var(--text-muted)">${a.email || a.passport || 'Sem info'}${groupMeta}</div>
                    </div>
                </div>`;
            }).join('');
            // Also filter the background table
            filterList();
        }
        function selectSearchResult(id) {
            closeSearchModal();
            const a = applicants.find(x => x.id === id);
            if (!a) return;
            if (a.stage !== currentPage) navigateTo(a.stage);
            if (a.group_id && !expandedGroups.has(String(a.group_id))) expandedGroups.add(String(a.group_id));
            const filteredItems = getFiltered();
            const targetIndex = filteredItems.findIndex(item => item.id === id);
            if (targetIndex >= 0) {
                visibleRowsCount = Math.max(visibleRowsCount, targetIndex + 1);
                renderTable();
            }
            setTimeout(() => {
                document.querySelectorAll('#tableBody tr.selected').forEach(row => row.classList.remove('selected'));
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (row) {
                    row.classList.add('selected');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => row.classList.remove('selected'), 2200);
                }
            }, 50);
        }

        function showToast(msg, type) {
            let t = document.getElementById('dashboard-toast');
            if (!t) { t = document.createElement('div'); t.id = 'dashboard-toast'; t.className = 'app-toast'; document.body.appendChild(t); }
            t.className = 'app-toast ' + (type === 'error' ? 'toast-error' : 'toast-success') + ' show';
            t.textContent = msg;
            setTimeout(() => { t.classList.remove('show'); }, 2500);
        }

        // ==========================================
        // SUPABASE AUTH CLIENT
        // ==========================================
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        let _currentUser = null;
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session?.access_token) {
                window._sessionToken = session.access_token;
                AppCore.setSession(session.access_token, null);
            }
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                _currentUser = null;
                AppCore.handleAuthFailure(event.toLowerCase());
            }
        });

        async function checkAuth() {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) { _currentUser = session.user; window._sessionToken = session.access_token; AppCore.setSession(session.access_token, null); return true; }
            return false;
        }

        async function handleLogin(e) {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const errEl = document.getElementById('loginError');
            btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Entrando...';
            errEl.classList.remove('show');
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                errEl.textContent = error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message;
                errEl.classList.add('show'); btn.disabled = false; btn.innerHTML = 'Entrar'; return;
            }
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) { _currentUser = session.user; window._sessionToken = session.access_token; AppCore.setSession(session.access_token, null); }
            const loginOvEl = document.getElementById('loginOverlay');
            if (loginOvEl) { loginOvEl.style.transition = 'opacity .4s'; loginOvEl.style.opacity = '0'; setTimeout(() => loginOvEl.style.display = 'none', 400); }
            await showDashboard();
        }

        async function handleForgotPassword(e) {
            if (e) e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            if (!email || !email.includes('@')) {
                const errEl = document.getElementById('loginError');
                errEl.textContent = 'Digite seu e-mail acima para recuperar a senha';
                errEl.classList.add('show');
                return;
            }
            const redirectTo = AppCore.buildPublicUrl('update-password.html');
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) {
                const errEl = document.getElementById('loginError');
                errEl.textContent = 'Erro: ' + error.message;
                errEl.classList.add('show');
                return;
            }
            const errEl = document.getElementById('loginError');
            errEl.textContent = 'ðŸ“§ Link de recuperaÃ§Ã£o enviado! Verifique seu e-mail.';
            errEl.style.color = '#16a34a';
            errEl.classList.add('show');
            setTimeout(() => { errEl.style.color = ''; }, 5000);
        }

        function confirmLogout() {
            const existing = document.getElementById('logoutConfirm'); if (existing) existing.remove();
            const html = `<div id="logoutConfirm" class="modal-overlay" onclick="document.getElementById('logoutConfirm').remove()">
            <div class="modal-box" onclick="event.stopPropagation()" style="max-width:320px;text-align:center">
                <i class="iconoir-log-out" style="font-size:32px;color:#ef4444;margin-bottom:8px"></i>
                <h3 class="modal-title">Deseja sair?</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px">VocÃª serÃ¡ desconectado da sua conta.</p>
                <button class="modal-btn" style="background:#ef4444;color:#fff" onclick="document.getElementById('logoutConfirm').remove();handleLogout()">Sair</button>
                <button class="modal-btn" onclick="document.getElementById('logoutConfirm').remove()">Cancelar</button>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function handleLogout() {
            await supabaseClient.auth.signOut(); _currentUser = null; window._sessionToken = null; AppCore.clearSession();
            isMasterUser = false;
            currentAdminSection = 'orgs';
            currentAdminOrgId = null;
            setAdminUiVisibility(false);
            const overlay = document.getElementById('loginOverlay');
            overlay.style.display = 'flex'; overlay.classList.remove('fade-out');
            document.querySelector('.sidebar').style.display = 'none'; document.querySelector('.main').style.display = 'none';
        }

        async function showDashboard() {
            _authToken = AppCore.getAuth(); _orgParam = AppCore.getOrg();
            AppCore.showLoading();
            const overlay = document.getElementById('loginOverlay');
            overlay.classList.add('fade-out'); setTimeout(() => overlay.style.display = 'none', 300);
            document.querySelector('.sidebar').style.display = 'flex'; document.querySelector('.main').style.display = 'block';
            await resolveOrg(); await loadApplicants();
            setupRealtime();
            if (_currentUser?.email) {
                isMasterUser = _currentUser.email.toLowerCase() === MASTER_EMAIL;
                // Generate 4-digit numeric ID from user_id
                let numId = '0001';
                if (_currentUser.id) {
                    let hash = 0;
                    for (let i = 0; i < _currentUser.id.length; i++) hash = ((hash << 5) - hash) + _currentUser.id.charCodeAt(i);
                    numId = String(Math.abs(hash) % 10000).padStart(4, '0');
                }
                window._userNumId = numId;
                // Display name: try user_metadata.full_name, fallback to email prefix
                const meta = _currentUser.user_metadata || {};
                const fullName = meta.full_name || meta.name || _currentUser.email.split('@')[0];
                document.getElementById('userDisplayName').textContent = fullName;
                const avatar = document.getElementById('userAvatar');
                if (avatar) avatar.textContent = getInitials(fullName);
            }
            setAdminUiVisibility(isMasterUser);
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user?.id) {
                    const bearer = session.access_token || SUPABASE_KEY;
                    const res = await fetch(SUPABASE_URL + '/rest/v1/members?user_id=eq.' + session.user.id + '&limit=1', { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + bearer } });
                    const m = await res.json();
                    if (m && m.length > 0) {
                        if (isMasterUser || m[0].role === 'admin') setAdminUiVisibility(true);
                        const roleLabels = { admin: 'Administrador', assessor: 'Assessor', viewer: 'Visualizador' };
                        const roleText = isMasterUser ? 'Administrador Master' : (roleLabels[m[0].role] || m[0].role);
                        document.getElementById('orgFooter').textContent = `${roleText} #${window._userNumId || '0001'}`;
                        // Se nÃ£o tem _orgParam, resolver pelo company_id do membro
                        if (!isMasterUser && !_orgParam && m[0].company_id) {
                            try {
                                const cRes = await fetch(SUPABASE_URL + '/rest/v1/companies?id=eq.' + m[0].company_id + '&select=short_id,name&limit=1', { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + bearer } });
                                const cData = await cRes.json();
                                if (cData?.[0]?.short_id) {
                                    _orgParam = cData[0].short_id;
                                    resolvedCompanyId = m[0].company_id;
                                    resolvedCompanyName = cData[0].name;
                                    const navBtn = document.getElementById('portalLinkBtnNav');
                                    if (navBtn) { navBtn.style.display = 'flex'; const urlInput = document.getElementById('portalUrlInput'); if (urlInput) urlInput.value = _orgParam; }
                                }
                            } catch { }
                        }
                    } else if (isMasterUser) {
                        document.getElementById('orgFooter').textContent = `Administrador Master #${window._userNumId || '0001'}`;
                    }
                }
            } catch { }
            // Restore saved page from URL hash after role resolution
            const hashState = parseDashboardHash();
            const _validPages = Object.keys(PAGE_CONFIG).concat(['admin']);
            currentAdminSection = hashState.adminSection;
            currentAdminOrgId = hashState.adminOrgId;
            navigateTo(_validPages.includes(hashState.page) ? hashState.page : 'overview');
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            AppCore.hideLoading();
        }

        // ==========================================

        // ==========================================
        // DASHBOARD OVERVIEW
        // ==========================================
        let _stageChart = null;

        function renderDashboard() {
            const active = applicants.filter(a => a.stage !== 'archived');
            const stages = ['screening', 'analysis', 'ds160', 'payment', 'scheduling', 'interview', 'outcome'];
            // 2-color: OK vs Problems



            // Chart data: 3 segments â€” Verde (OK), Amarelo (error), Vermelho (fail)
            const okData = stages.map(st => applicants.filter(a => a.stage === st && !['error', 'fail', 'standby'].includes(a.status)).length);
            const errorData = stages.map(st => applicants.filter(a => a.stage === st && a.status === 'error').length);
            const failData = stages.map(st => applicants.filter(a => a.stage === st && a.status === 'fail').length);
            const standbyData = stages.map(st => applicants.filter(a => a.stage === st && a.status === 'standby').length);
            const datasets = [
                {
                    label: 'Sob controle',
                    data: okData,
                    backgroundColor: '#22c55e',
                    borderColor: '#22c55e',
                    borderWidth: 0,
                    borderRadius: 6,
                },
                {
                    label: 'Erro de dados',
                    data: errorData,
                    backgroundColor: '#f59e0b',
                    borderColor: '#f59e0b',
                    borderWidth: 0,
                    borderRadius: 6,
                },
                {
                    label: 'Falha t\u00e9cnica',
                    data: failData,
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    borderWidth: 0,
                    borderRadius: 6,
                },
                {
                    label: 'Em espera',
                    data: standbyData,
                    backgroundColor: '#818cf8',
                    borderColor: '#818cf8',
                    borderWidth: 0,
                    borderRadius: 6,
                },
            ];

            const ctx = document.getElementById('stageChart');
            if (!ctx) return;

            if (_stageChart) {
                _stageChart.data.datasets = datasets;
                _stageChart.update('none');
            } else {
                Chart.register(ChartDataLabels);
                _stageChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: stages.map(s => STAGE_LABELS[s] || s),
                        datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            datalabels: {
                                display: function(ctx) {
                                    // Only show label on top-most segment
                                    const dsCount = ctx.chart.data.datasets.length;
                                    return ctx.datasetIndex === dsCount - 1;
                                },
                                formatter: function(value, ctx) {
                                    let total = 0;
                                    ctx.chart.data.datasets.forEach(ds => { total += ds.data[ctx.dataIndex] || 0; });
                                    return total > 0 ? total : '';
                                },
                                anchor: 'end',
                                align: 'end',
                                offset: 2,
                                font: { size: 14, weight: '800', family: 'Inter' },
                                color: '#1e293b',
                            },
                            legend: {
                                position: 'bottom',
                                labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, family: 'Inter' } }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(15,23,42,.92)',
                                borderColor: 'rgba(255,255,255,.1)',
                                borderWidth: 1,
                                titleFont: { family: 'Inter', weight: '600' },
                                bodyFont: { family: 'Inter' },
                                padding: 10,
                                cornerRadius: 8,
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                                grid: { display: false },
                                ticks: { font: { size: 11, family: 'Inter', weight: '600' } }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                ticks: { stepSize: 1, font: { size: 11, family: 'Inter' } },
                                grid: { color: 'rgba(0,0,0,.04)' },
                                suggestedMax: Math.max(...okData.map((v,i) => v + (errorData[i]||0) + (failData[i]||0) + (standbyData[i]||0))) + 1,
                            }
                        },
                        interaction: { intersect: false, mode: 'index' },
                        animation: { duration: 600, easing: 'easeOutQuart' },
                        layout: { padding: { top: 28 } },
                    }
                });
            }

            // Problems list
            const problems = applicants.filter(a => a.status === 'error' || a.status === 'fail');
            const tbody = document.getElementById('problemsBody');
            const emptyEl = document.getElementById('problemsEmpty');
            const tableWrap = document.getElementById('problemsTableWrap');

            if (!problems.length) {
                tbody.innerHTML = '';
                if (emptyEl) emptyEl.classList.remove('hidden');
                if (tableWrap) tableWrap.style.display = 'none';
                return;
            }
            if (emptyEl) emptyEl.classList.add('hidden');
            if (tableWrap) tableWrap.style.display = '';

            // Ordenar: error(0) acima de failed(1), dentro do mesmo: sort_order, created_at
            const PROBLEM_PRIORITY = { error: 0, fail: 1 };
            problems.sort((a, b) => {
                const pa = PROBLEM_PRIORITY[a.status] ?? 9, pb = PROBLEM_PRIORITY[b.status] ?? 9;
                if (pa !== pb) return pa - pb;
                const sa = a.sort_order ?? 9999, sb2 = b.sort_order ?? 9999;
                if (sa !== sb2) return sa - sb2;
                const ca = a.created_at || '', cb = b.created_at || '';
                if (ca < cb) return -1; if (ca > cb) return 1;
                return 0;
            });

            // Layout idÃªntico Ã s tabelas de etapas
            tbody.innerHTML = problems.map(a => {
                const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.todo;
                return `<tr ondblclick="openReview('${a.id}')" style="cursor:pointer">
                    <td onclick="openReview('${a.id}')"><div class="name-col"><span class="applicant-icon"><i class="iconoir-user"></i></span><div class="name-info"><div class="name">${shortName(a.name)}</div><div class="passport">${a.email || 'Sem email'}</div></div></div></td>
                    <td><span class="status-badge ${cfg.class}" onclick="event.stopPropagation();openErrorLogsModal('${a.id}')" style="cursor:pointer" title="Ver logs de erro">${cfg.label}</span></td>
                    <td>${a.application_id ? `<span class="cred-chip" onclick="event.stopPropagation();openCredModal('${a.id}')">${(a.application_id||'').substring(0,12)}</span>` : '-'}</td>
                    <td>${a.ais_email ? `<span class="cred-chip" onclick="event.stopPropagation();openCredModal('${a.id}')"><span class="cred-dot ${a.ais_confirmed?'confirmed':a.ais_status==='confirmation_failed'?'fail':'pending'}"></span>${a.ais_email.split('@')[0]}</span>` : '-'}</td>
                    <td onclick="event.stopPropagation();openApplicantNotesModal('${a.id}')" style="cursor:pointer" title="Ver anota\u00e7\u00f5es"><div class="notes-preview">${a.notes ? a.notes.substring(0, 80) : '<span class="app-placeholder">Adicionar nota</span>'}</div></td>
                    <td><div class="row-actions">
                        <button class="row-btn row-btn-icon row-btn-warning" onclick="event.stopPropagation();openResolveProblemModal('${a.id}')" title="Resolver problema" aria-label="Resolver problema"><i class="iconoir-warning-triangle"></i></button>
                        <button class="row-btn" onclick="event.stopPropagation();openWhatsApp('${a.id}')" title="WhatsApp"><i class="iconoir-whatsapp"></i></button>
                        <button class="row-btn" onclick="event.stopPropagation();copyApplicantLink('${a.id}')" title="Copiar link"><i class="iconoir-copy"></i></button>
                        <button class="row-btn row-btn-more" onclick="event.stopPropagation();showManageMenu(event,'${a.id}')" title="Mais op\u00e7\u00f5es" aria-label="Mais op\u00e7\u00f5es"><i class="iconoir-more-vert"></i></button>
                    </div></td>
                </tr>`;
            }).join('');
        }

        // ==========================================
        // ERROR LOGS MODAL (acessÃ­vel para assessores)
        // ==========================================
        const _errorCauseLabels = { browser_closed: 'Browser fechado', network_error: 'Erro de rede', timeout: 'Timeout', field_error: 'Erro no campo', 'field_error:select': 'Select vazio', 'field_error:missing': 'Dado ausente', captcha_failed: 'Captcha falhou', validation_error: 'Validação DS-160', postback_stuck: 'Postback travado', page_stuck: 'Página travada', script_error: 'Erro de script', unknown: 'Desconhecido' };

        async function openErrorLogsModal(applicantId) {
            const applicant = applicants.find(x => x.id === applicantId);
            const applicantName = applicant?.name || 'Solicitante';
            const applicationId = applicant?.application_id || null;
            const fallbackError = applicant?.fill_error || null;
            const statusLabel = STATUS_CONFIG[applicant?.status]?.label || 'Problema';
            const problemGuidance = applicant?.status === 'fail'
                ? 'Falha t\u00e9cnica: revise o log e a imagem. Reenvie a etapa apenas depois de corrigir a causa t\u00e9cnica.'
                : 'Erro de dados: revise a p\u00e1gina ou o campo apontado no log, corrija o formul\u00e1rio e retome a etapa.';
            const old = document.getElementById('errorLogsModal'); if (old) old.remove();
            // Show loading
            const loadingHtml = `<div id="errorLogsModal" class="modal-overlay" onclick="document.getElementById('errorLogsModal').remove()">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:700px;width:95vw;max-height:85vh;display:flex;flex-direction:column">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                        <h3 class="modal-title" style="margin:0"><i class="iconoir-warning-triangle" style="color:var(--warning);margin-right:6px"></i>Logs de Erro</h3>
                        <button onclick="document.getElementById('errorLogsModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">&times;</button>
                    </div>
                    <p style="font-size:13px;color:var(--text-muted);margin:0 0 8px">${escapeHTML(applicantName)} &middot; ${escapeHTML(statusLabel)}</p>
                    <div style="display:grid;gap:6px;margin:0 0 14px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg-body)">
                        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                            <span style="padding:3px 8px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700">${escapeHTML(applicant?.stage || '-')}</span>
                            ${applicationId ? `<span style="font-size:11px;color:var(--text-muted)">App ID: <span class="mono" style="font-size:11px">${escapeHTML(applicationId)}</span></span>` : '<span style="font-size:11px;color:var(--text-muted)">Sem App ID salvo</span>'}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);line-height:1.45">${escapeHTML(problemGuidance)}</div>
                    </div>
                    <div style="text-align:center;padding:30px;color:var(--text-muted)"><div class="spinner"></div> Carregando logs...</div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', loadingHtml);

            try {
                let logs = [];
                if (applicationId) {
                    logs = await sbGet(`error_logs?application_id=eq.${encodeURIComponent(applicationId)}&archived=eq.false&order=created_at.desc&limit=10&select=id,application_id,error_cause,page_name,field_name,error_message,created_at,retry_number,screenshot_url,video_url,validation_errors`) || [];
                }
                if ((!logs || logs.length === 0) && applicantName) {
                    logs = await sbGet(`error_logs?applicant_name=ilike.*${encodeURIComponent(applicantName.replace(/[\[\]]/g,''))}*&archived=eq.false&order=created_at.desc&limit=10&select=id,application_id,error_cause,page_name,field_name,error_message,created_at,retry_number,screenshot_url,video_url,validation_errors`) || [];
                }
                if ((!logs || logs.length === 0) && fallbackError) {
                    logs = [{
                        id: `fallback-${applicantId}`,
                        application_id: applicationId,
                        error_cause: applicant?.status === 'fail' ? 'system_error' : 'field_error',
                        page_name: null,
                        field_name: null,
                        error_message: fallbackError,
                        created_at: applicant?.updated_at || applicant?.created || null,
                        retry_number: null,
                        screenshot_url: null,
                        video_url: null,
                        validation_errors: null,
                        _source: 'fill_error'
                    }];
                }
                const modal = document.getElementById('errorLogsModal');
                if (!modal) return;
                const content = modal.querySelector('.modal-box');
                // Remove loading spinner
                const spinner = content.querySelector('.spinner')?.parentElement;
                if (spinner) spinner.remove();

                if (logs.length === 0) {
                    content.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:20px;color:var(--text-muted)"><i class="iconoir-check-circle" style="font-size:24px;color:var(--success)"></i><p>Nenhum log estruturado encontrado para este solicitante.</p><p style="font-size:12px">Se o problema persistir, reenfileire a etapa e acompanhe a nova tentativa.</p></div>');
                    return;
                }

                let listHtml = '<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px">';
                logs.forEach((l) => {
                    const causeLabel = _errorCauseLabels[l.error_cause] || l.error_cause || '-';
                    const dt = l.created_at
                        ? new Date(l.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
                        : 'Sem hor\u00e1rio';
                    const retryBadge = l.retry_number != null ? `<span style="background:#dbeafe;color:#2563eb;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin-left:6px">#${l.retry_number}</span>` : '';
                    const screenshotBtn = l.screenshot_url
                        ? `<button class="btn-new" onclick="event.stopPropagation();viewLogScreenshot('${l.screenshot_url.replace(/'/g,"\\'")}','${escapeHTML(causeLabel)}')" style="background:#3b82f6;font-size:10px;padding:2px 8px;margin-left:auto;flex-shrink:0">Imagem</button>`
                        : '';
                    listHtml += `<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg-body)">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                            <span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:#fee2e2;color:#dc2626">${causeLabel}</span>
                            ${l.page_name ? '<span style="font-size:11px;color:var(--text-muted)">P\u00e1g: ' + escapeHTML(l.page_name) + '</span>' : ''}
                            ${l.field_name ? '<span style="font-size:11px;color:var(--accent);font-family:monospace">' + escapeHTML(l.field_name) + '</span>' : ''}
                            ${retryBadge}
                            <span style="font-size:10px;color:var(--text-muted);margin-left:auto">${dt}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px">
                            <p style="font-size:12px;color:var(--text-primary);margin:0;line-height:1.4;flex:1;word-break:break-word">${escapeHTML(l.error_message || '-')}</p>
                            ${screenshotBtn}
                        </div>
                    </div>`;
                });
                listHtml += '</div>';
                content.insertAdjacentHTML('beforeend', listHtml);
            } catch (e) {
                const modal = document.getElementById('errorLogsModal');
                if (modal) {
                    const content = modal.querySelector('.modal-box');
                    const spinner = content.querySelector('.spinner')?.parentElement;
                    if (spinner) spinner.innerHTML = '<p style="color:#ef4444">Erro ao carregar logs: ' + escapeHTML(e.message) + '</p>';
                }
            }
        }

        function viewLogScreenshot(url, cause) {
            const old = document.getElementById('logScreenshotModal'); if (old) old.remove();
            const html = `<div id="logScreenshotModal" class="modal-overlay" onclick="document.getElementById('logScreenshotModal').remove()" style="z-index:10012;background:rgba(0,0,0,.85)">
                <div onclick="event.stopPropagation()" style="max-width:90vw;max-height:90vh;position:relative">
                    <button onclick="document.getElementById('logScreenshotModal').remove()" style="position:absolute;top:-12px;right:-12px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;z-index:1">&times;</button>
                    <img src="${url}" style="max-width:90vw;max-height:85vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4)" onerror="this.outerHTML='<div style=\'color:#fff;padding:40px\'>Imagem nÃ£o encontrada</div>'">
                    <div style="color:#fff;font-size:12px;text-align:center;margin-top:8px;opacity:.7">${cause}</div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        // ==========================================
        // SUPABASE REALTIME
        // ==========================================
        let _realtimeChannel = null;
        let _realtimeTimer = null;

        function setupRealtime() {
            // Cleanup canal anterior para evitar duplicaÃ§Ã£o
            if (_realtimeChannel) {
                try { supabaseClient.removeChannel(_realtimeChannel); } catch(e) {}
                _realtimeChannel = null;
            }
            try {
                _realtimeChannel = supabaseClient.channel('applicants-changes')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'applicants' }, (payload) => {
                        console.log('[Realtime] Change detected:', payload.eventType);
                        // Debounce: agrupa eventos em 500ms para evitar cascata de queries
                        clearTimeout(_realtimeTimer);
                        _realtimeTimer = setTimeout(async () => {
                            await loadApplicants();
                            if (currentPage === 'overview') renderDashboard();
                            else { renderFilters(); renderTable(); updateBadges(); }
                        }, 500);
                    })
                    .subscribe((status) => {
                        const dot = document.getElementById('rtDot');
                        const label = document.getElementById('rtLabel');
                        if (status === 'SUBSCRIBED') {
                            if (dot) dot.classList.add('connected');
                            if (label) label.textContent = 'Ao vivo';
                        } else {
                            if (dot) dot.classList.remove('connected');
                            if (label) label.textContent = status === 'CHANNEL_ERROR' ? 'Desconectado' : 'Conectando...';
                        }
                    });
            } catch (e) {
                console.warn('[Realtime] Setup failed:', e);
            }
        }

        // ADMIN MASTER (integrated)
        // ==========================================
        let _admOrgs = []; let _admSelectedOrg = null; let _admEmailMap = {};

        function admGenShortId() { return Math.random().toString(36).substring(2, 7); }
        function admFmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'; }

        async function admFetchEmails() {
            try {
                const res = await fetch(SUPABASE_URL + '/functions/v1/list-users', { headers: { 'Authorization': 'Bearer ' + (window._sessionToken || SUPABASE_KEY), 'apikey': SUPABASE_KEY } });
                if (res.ok) { const data = await res.json(); data.forEach(u => _admEmailMap[u.id] = u.email); }
            } catch { }
        }

        async function admLoadOrgs() {
            _admOrgs = await sbGet('companies?select=*&order=created_at.asc') || [];
            const members = await sbGet('members?select=company_id') || [];
            const counts = {}; members.forEach(m => counts[m.company_id] = (counts[m.company_id] || 0) + 1);
            _admOrgs.forEach(o => o._memberCount = counts[o.id] || 0);
            admRenderOrgGrid();
        }

        function admRenderOrgGrid() {
            document.getElementById('admOrgCount').textContent = `(${_admOrgs.length})`;
            admUpdateNav('orgs');
            const grid = document.getElementById('admOrgGrid');
            if (_admOrgs.length === 0) { grid.innerHTML = '<p style="color:var(--text-muted)">Nenhuma organizaÃ§Ã£o cadastrada.</p>'; return; }
            let h = '<div class="table-container" style="margin-top:0"><table style="width:100%"><thead><tr><th>Organização</th><th>Short ID</th><th>CNPJ</th><th style="text-align:center">Assessores</th><th style="text-align:center">Status</th><th>Criada</th></tr></thead><tbody>';
            _admOrgs.forEach(o => {
                const sc = o.active ? '#22c55e' : '#ef4444', sl = o.active ? 'Ativa' : 'Inativa';
                h += `<tr onclick="admOpenOrgDetail('${o.id}')" style="cursor:pointer"><td style="font-weight:600">${o.name}</td><td style="color:var(--text-muted);font-family:monospace;font-size:12px">${o.short_id || '-'}</td><td style="color:var(--text-muted)">${o.cnpj || '-'}</td><td style="text-align:center">${o._memberCount}</td><td style="text-align:center"><span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${sc}18;color:${sc}">${sl}</span></td><td style="color:var(--text-muted);font-size:12px">${admFmtDate(o.created_at)}</td></tr>`;
            });
            h += '</tbody></table></div>'; grid.innerHTML = h;
        }

        function admGetFormUrl() {
            if (!_admSelectedOrg) return '';
            return AppCore.buildPortalUrl(_admSelectedOrg.short_id || '');
        }
        function admCopyFormUrl() { navigator.clipboard.writeText(admGetFormUrl()).then(() => showToast('URL copiada!', 'success')).catch(() => showToast('Erro', 'error')); }

        // ---- Logo da OrganizaÃ§Ã£o ----
        function admRefreshLogoUI() {
            const preview = document.getElementById('admLogoPreview');
            const removeBtn = document.getElementById('admRemoveLogoBtn');
            const toggle = document.getElementById('admUseCustomLogo');
            const slider = document.getElementById('admToggleSlider');
            const track = slider?.previousElementSibling;
            if (!_admSelectedOrg) return;
            const hasLogo = !!_admSelectedOrg.logo_url;
            if (hasLogo) {
                preview.innerHTML = `<img src="${_admSelectedOrg.logo_url}" style="max-width:100%;max-height:100%;object-fit:contain">`;
                removeBtn.style.display = 'inline-flex';
            } else {
                preview.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">Sem logo</span>';
                removeBtn.style.display = 'none';
            }
            toggle.checked = !!_admSelectedOrg.use_custom_logo;
            if (track) track.style.background = toggle.checked ? '#3b82f6' : '#cbd5e1';
            if (slider) slider.style.transform = toggle.checked ? 'translateX(16px)' : 'translateX(0)';
            // Portal colors
            const bgInput = document.getElementById('admPortalBgColor');
            const btnInput = document.getElementById('admPortalBtnColor');
            if (bgInput) bgInput.value = _admSelectedOrg.portal_bg_color || '';
            if (btnInput) btnInput.value = _admSelectedOrg.portal_btn_color || '';
            // Logo max width
            const lwInput = document.getElementById('admLogoMaxWidth');
            if (lwInput) lwInput.value = _admSelectedOrg.logo_max_width || 150;
        }

        async function admSavePortalColor(field, value) {
            if (!_admSelectedOrg) return;
            let hex = value.trim().replace(/\s/g, '');
            if (!hex) {
                // Limpar cor
                try {
                    await sbFetch('companies?id=eq.' + _admSelectedOrg.id, 'PATCH', { [field]: null });
                    _admSelectedOrg[field] = null;
                    showToast('Cor removida', 'success');
                } catch (e) { showToast('Erro ao salvar', 'error'); }
                return;
            }
            // Adiciona # se nÃ£o tiver
            if (!hex.startsWith('#')) hex = '#' + hex;
            // Valida formato
            if (!/^#[0-9a-fA-F]{6}$/.test(hex)) { showToast('Formato invÃ¡lido. Ex: #1a2b3c ou 1a2b3c', 'error'); return; }
            hex = hex.toLowerCase();
            try {
                await sbFetch('companies?id=eq.' + _admSelectedOrg.id, 'PATCH', { [field]: hex });
                _admSelectedOrg[field] = hex;
                // Atualiza input com valor normalizado
                const inputId = field === 'portal_bg_color' ? 'admPortalBgColor' : 'admPortalBtnColor';
                const inp = document.getElementById(inputId);
                if (inp) inp.value = hex;
                showToast('Cor salva!', 'success');
            } catch (e) { showToast('Erro ao salvar cor', 'error'); }
        }

        async function admSaveLogoMaxWidth(value) {
            if (!_admSelectedOrg) return;
            const px = parseInt(value) || 150;
            if (px < 40 || px > 300) { showToast('Valor entre 40 e 300px', 'error'); return; }
            try {
                await sbFetch('companies?id=eq.' + _admSelectedOrg.id, 'PATCH', { logo_max_width: px });
                _admSelectedOrg.logo_max_width = px;
                showToast('Tamanho salvo!', 'success');
            } catch (e) { showToast('Erro ao salvar', 'error'); }
        }

        async function admUploadLogo(input) {
            const file = input.files[0]; if (!file) return;
            if (file.size > 500 * 1024) { showToast('Arquivo muito grande (mÃ¡x 500KB)', 'error'); input.value = ''; return; }
            if (!_admSelectedOrg) return;
            const orgId = _admSelectedOrg.id;
            const ext = file.name.split('.').pop().toLowerCase();
            const path = `${orgId}/logo.${ext}`;
            try {
                // Upload to Supabase Storage via REST
                const formData = new FormData();
                formData.append('', file);
                const storageUrl = SUPABASE_URL + '/storage/v1/object/org-logos/' + path;
                const res = await fetch(storageUrl, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + window._sessionToken },
                    body: file
                });
                if (!res.ok) {
                    // Try upsert
                    const res2 = await fetch(storageUrl, {
                        method: 'PUT',
                        headers: { 'Authorization': 'Bearer ' + window._sessionToken },
                        body: file
                    });
                    if (!res2.ok) throw new Error('Falha no upload');
                }
                const publicUrl = SUPABASE_URL + '/storage/v1/object/public/org-logos/' + path + '?t=' + Date.now();
                await sbFetch(`companies?id=eq.${orgId}`, 'PATCH', { logo_url: publicUrl });
                _admSelectedOrg.logo_url = publicUrl;
                admRefreshLogoUI();
                showToast('Logo enviado!', 'success');
            } catch (e) { showToast('Erro no upload: ' + e.message, 'error'); }
            input.value = '';
        }

        async function admRemoveLogo() {
            if (!_admSelectedOrg) return;
            try {
                await sbFetch(`companies?id=eq.${_admSelectedOrg.id}`, 'PATCH', { logo_url: null, use_custom_logo: false });
                _admSelectedOrg.logo_url = null;
                _admSelectedOrg.use_custom_logo = false;
                admRefreshLogoUI();
                showToast('Logo removido', 'success');
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function admToggleCustomLogo(checked) {
            if (!_admSelectedOrg) return;
            const slider = document.getElementById('admToggleSlider');
            const track = slider?.previousElementSibling;
            if (track) track.style.background = checked ? '#3b82f6' : '#cbd5e1';
            if (slider) slider.style.transform = checked ? 'translateX(16px)' : 'translateX(0)';
            try {
                await sbFetch(`companies?id=eq.${_admSelectedOrg.id}`, 'PATCH', { use_custom_logo: checked });
                _admSelectedOrg.use_custom_logo = checked;
                showToast(checked ? 'Logo customizado ativado' : 'Logo customizado desativado', 'success');
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function admOpenOrgDetail(orgId) {
            _admSelectedOrg = _admOrgs.find(o => o.id === orgId); if (!_admSelectedOrg) return;
            currentAdminSection = 'orgs';
            currentAdminOrgId = orgId;
            ['admTab-orgs', 'admTab-capmonster', 'admTab-logs', 'admTab-settings'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('active', id === 'admTab-orgs');
            });
            document.getElementById('adm-view-list').style.display = 'none';
            document.getElementById('adm-view-detail').style.display = 'block';
            document.getElementById('admDetailOrgName').textContent = _admSelectedOrg.name;
            const tb = document.getElementById('admToggleActiveBtn');
            tb.textContent = _admSelectedOrg.active ? 'Desativar' : 'Ativar';
            tb.style.background = _admSelectedOrg.active ? '#ef4444' : '#22c55e';
            document.getElementById('admOrgInfoCards').innerHTML = `
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600">Nome</div><div style="font-size:14px;font-weight:600;margin-top:4px">${_admSelectedOrg.name}</div></div>
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600">Short ID</div><div style="font-size:14px;font-family:monospace;margin-top:4px">${_admSelectedOrg.short_id || '-'}</div></div>
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600">CNPJ</div><div style="font-size:14px;margin-top:4px">${_admSelectedOrg.cnpj || '-'}</div></div>
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600">Status</div><div style="margin-top:4px"><span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${_admSelectedOrg.active ? '#dcfce7' : '#fee2e2'};color:${_admSelectedOrg.active ? '#16a34a' : '#dc2626'}">${_admSelectedOrg.active ? 'Ativa' : 'Inativa'}</span></div></div>`;
            document.getElementById('admFormUrlDisplay').textContent = admGetFormUrl();
            admRefreshLogoUI();
            admUpdateNav('orgs');
            if (currentPage === 'admin') replaceDashboardHash('admin', 'orgs', orgId);
            await admLoadOrgUsers(orgId);
        }

        async function admLoadOrgUsers(orgId) {
            const members = await sbGet(`members_view?company_id=eq.${orgId}&select=user_id,role,email,full_name`) || [];
            const delBtn = document.getElementById('admDeleteOrgBtn');
            if (delBtn) delBtn.style.display = members.length === 0 ? 'inline-flex' : 'none';
            const tbody = document.getElementById('admOrgUsersTable');
            if (members.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">Nenhum assessor vinculado</td></tr>'; return; }
            tbody.innerHTML = members.map(m => `<tr><td><strong>${m.email || m.user_id.substring(0, 12) + '...'}</strong>${m.full_name ? '<br><span style="font-size:12px;color:var(--text-muted)">' + m.full_name + '</span>' : ''}</td><td><span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${m.role === 'admin' ? '#dbeafe' : '#f1f5f9'};color:${m.role === 'admin' ? '#2563eb' : '#64748b'}">${m.role}</span></td><td><button class="btn-new" onclick="event.stopPropagation();admRemoveMember('${m.user_id}','${orgId}')" style="background:#ef4444;font-size:11px;padding:4px 10px">Remover</button></td></tr>`).join('');
        }

        function admShowOrgList() {
            _admSelectedOrg = null;
            currentAdminSection = 'orgs';
            currentAdminOrgId = null;
            document.getElementById('adm-view-detail').style.display = 'none';
            document.getElementById('adm-view-list').style.display = 'block';
            ['admTab-orgs', 'admTab-capmonster', 'admTab-logs', 'admTab-settings'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('active', id === 'admTab-orgs');
            });
            admUpdateNav('orgs');
            if (currentPage === 'admin') replaceDashboardHash('admin', 'orgs');
        }

        function admShowSection(section) {
            currentAdminSection = ADMIN_SECTIONS.includes(section) ? section : 'orgs';
            if (currentAdminSection !== 'orgs') currentAdminOrgId = null;
            ['adm-view-list', 'adm-view-detail', 'adm-view-capmonster', 'adm-view-logs', 'adm-view-settings'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
            ['admTab-orgs', 'admTab-capmonster', 'admTab-logs', 'admTab-settings'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('active'); });
            if (currentAdminSection === 'orgs') {
                if (_admSelectedOrg && currentAdminOrgId) document.getElementById('adm-view-detail').style.display = 'block';
                else document.getElementById('adm-view-list').style.display = 'block';
                document.getElementById('admTab-orgs').classList.add('active');
            }
            else if (currentAdminSection === 'capmonster') { document.getElementById('adm-view-capmonster').style.display = 'block'; document.getElementById('admTab-capmonster').classList.add('active'); admLoadCapmonster(); }
            else if (currentAdminSection === 'logs') { document.getElementById('adm-view-logs').style.display = 'block'; document.getElementById('admTab-logs').classList.add('active'); admLoadLogs(); }
            else if (currentAdminSection === 'settings') { document.getElementById('adm-view-settings').style.display = 'block'; document.getElementById('admTab-settings').classList.add('active'); admLoadSettings(); }
            admUpdateNav(currentAdminSection);
            if (currentPage === 'admin') replaceDashboardHash('admin', currentAdminSection);
        }

        // Update the dashboard-nav toolbar for admin sections
        function admUpdateNav(section) {
            const titleEl = document.getElementById('pageTitle');
            const stageItems = document.getElementById('stageNavItems');
            const admActions = document.getElementById('admNavActions');
            if (!section) {
                // Determine active section from tabs
                const activeTab = document.querySelector('.adm-subnav .chip.active');
                if (activeTab) {
                    const id = activeTab.id || '';
                    if (id.includes('orgs')) section = 'orgs';
                    else if (id.includes('capmonster')) section = 'capmonster';
                    else if (id.includes('logs')) section = 'logs';
                    else if (id.includes('settings')) section = 'settings';
                } else section = 'orgs';
            }
            const admOrgCount = document.getElementById('admOrgCount');
            const admLogsCount = document.getElementById('admLogsCount');
            const titles = { orgs: 'OrganizaÃ§Ãµes', capmonster: 'IntegraÃ§Ãµes', logs: 'Erros', settings: 'ConfiguraÃ§Ãµes' };
            let subtitle = '';
            if (section === 'orgs' && admOrgCount) subtitle = ' ' + admOrgCount.textContent;
            if (section === 'logs' && admLogsCount) subtitle = ' ' + admLogsCount.textContent;
            if (titleEl) titleEl.innerHTML = (titles[section] || 'Admin') + (subtitle ? '<span class="nav-count">' + subtitle + '</span>' : '');
            // Toggle stage vs admin action buttons
            if (stageItems) stageItems.style.display = 'none';
            if (admActions) {
                admActions.style.display = 'flex';
                let actionsHtml = '';
                if (section === 'orgs') actionsHtml = '<button class="btn-new" onclick="admOpenOrgModal()">Nova Organização</button>';
                else if (section === 'logs') actionsHtml = '<button class="btn-new btn-danger" onclick="admArchiveAllLogs()" style="font-size:12px">Arquivar Todos</button>';
                admActions.innerHTML = actionsHtml;
            }
        }
        // Restore dashboard-nav to normal stage mode
        function admRestoreNav() {
            const stageItems = document.getElementById('stageNavItems');
            const admActions = document.getElementById('admNavActions');
            if (stageItems) stageItems.style.display = 'flex';
            if (admActions) { admActions.style.display = 'none'; admActions.innerHTML = ''; }
        }

        // IntegraÃ§Ãµes (CapMonster + API CPF + addy.io + Proxy)
        async function admLoadCapmonster() {
            try {
                const d = await sbGet('settings?key_name=in.(capmonster_key,cpf_api_key,addy_io_token,addy_io_domain,proxy_url)&select=key_name,key_value');
                (d || []).forEach(s => {
                    if (s.key_name === 'capmonster_key') document.getElementById('admCapmonsterKey').value = s.key_value || '';
                    if (s.key_name === 'cpf_api_key') document.getElementById('admCpfApiKey').value = s.key_value || '';
                    if (s.key_name === 'addy_io_token') document.getElementById('admAddyToken').value = s.key_value || '';
                    if (s.key_name === 'addy_io_domain') document.getElementById('admAddyDomain').value = s.key_value || '';
                    if (s.key_name === 'proxy_url') document.getElementById('admProxyUrl').value = s.key_value || '';
                });
            } catch { }
        }
        async function admSaveCapmonster() { const v = document.getElementById('admCapmonsterKey').value.trim(); try { await sbFetch('settings?key_name=eq.capmonster_key', 'PATCH', { key_value: v }); showToast('API Key salva!', 'success'); } catch { try { await sbFetch('settings', 'POST', { key_name: 'capmonster_key', key_value: v, description: 'CapMonster API Key' }); showToast('API Key salva!', 'success'); } catch (e2) { showToast('Erro: ' + e2.message, 'error'); } } }
        async function admSaveCpfApiKey() { const v = document.getElementById('admCpfApiKey').value.trim(); try { await sbFetch('settings?key_name=eq.cpf_api_key', 'PATCH', { key_value: v }); showToast('API CPF Key salva!', 'success'); } catch { try { await sbFetch('settings', 'POST', { key_name: 'cpf_api_key', key_value: v, description: 'API CPF Key (apicpf.com)' }); showToast('API CPF Key salva!', 'success'); } catch (e2) { showToast('Erro: ' + e2.message, 'error'); } } }
        async function _admSaveSetting(keyName, value, description) { try { await sbFetch(`settings?key_name=eq.${keyName}`, 'PATCH', { key_value: value }); return true; } catch { try { await sbFetch('settings', 'POST', { key_name: keyName, key_value: value, description }); return true; } catch (e2) { showToast('Erro: ' + e2.message, 'error'); return false; } } }
        async function admSaveAddy() {
            const token = document.getElementById('admAddyToken').value.trim();
            const domain = document.getElementById('admAddyDomain').value.trim() || 'anonaddy.me';
            const ok1 = await _admSaveSetting('addy_io_token', token, 'addy.io API Token');
            const ok2 = await _admSaveSetting('addy_io_domain', domain, 'addy.io Default Domain');
            if (ok1 && ok2) showToast('addy.io configurado!', 'success');
        }
        async function admSaveProxy() {
            const url = document.getElementById('admProxyUrl').value.trim();
            if (url && !url.startsWith('http')) { showToast('Formato: http://user:pass@host:port', 'error'); return; }
            const ok = await _admSaveSetting('proxy_url', url, 'Proxy Residencial URL');
            if (ok) showToast('Proxy salvo!', 'success');
        }

        // Logs
        const admCauseLabels = { browser_closed: 'Browser fechado', network_error: 'Erro de rede', timeout: 'Timeout', field_error: 'Campo inv\u00e1lido', 'field_error:select': 'Select vazio', 'field_error:missing': 'Dado ausente', captcha_failed: 'Captcha falhou', validation_error: 'Valida\u00e7\u00e3o DS-160', postback_stuck: 'Postback travado', page_stuck: 'P\u00e1gina travada', missing_data: 'Dados incompletos', missing_applicant: 'Solicitante n\u00e3o encontrado', system_error: 'Erro do sistema', select_mismatch: 'Op\u00e7\u00e3o n\u00e3o encontrada', invalid_field_value: 'Valor inv\u00e1lido', session_expired: 'Sess\u00e3o expirada', challenge_detected: 'Challenge detectado', landing_dom_mismatch: 'DOM inicial divergente', recovery_dom_mismatch: 'DOM de recupera\u00e7\u00e3o divergente', unknown: 'Desconhecido' };
        const admLogStatusMeta = {
            error: { label: 'Erro de dados', help: 'Precisa corre\u00e7\u00e3o humana' },
            standby: { label: 'Em espera', help: 'Retorno controlado por cooldown' },
            fail: { label: 'Falha t\u00e9cnica', help: 'Bloqueado at\u00e9 revis\u00e3o t\u00e9cnica' }
        };
        function admClassifyLogStatus(log) {
            if (log._fromApp) return log._appStatus === 'fail' ? 'fail' : 'error';
            const cause = log.error_cause || 'unknown';
            const standbyCauses = ['timeout', 'network_error', 'page_stuck', 'postback_stuck', 'captcha_failed', 'session_expired', 'challenge_detected', 'landing_dom_mismatch', 'recovery_dom_mismatch'];
            const failCauses = ['browser_closed', 'system_error'];
            if (failCauses.includes(cause)) return 'fail';
            if (standbyCauses.includes(cause)) return 'standby';
            return 'error';
        }
        function admGetCompanyName(companyId) {
            if (!companyId) return 'Sem organiza\u00e7\u00e3o';
            return (_admOrgs.find(o => o.id === companyId)?.name) || 'Organiza\u00e7\u00e3o desconhecida';
        }
        function admRenderLogsSummary(logs) {
            const host = document.getElementById('admLogsSummary');
            if (!host) return;
            const counts = { total: logs.length, error: 0, standby: 0, fail: 0 };
            logs.forEach(log => { counts[log._status] = (counts[log._status] || 0) + 1; });
            host.innerHTML = `
                <div class="adm-log-summary-card">
                    <span class="adm-log-summary-label">Ativos</span>
                    <strong class="adm-log-summary-value">${counts.total}</strong>
                    <span class="adm-log-summary-help">Logs abertos para revis\u00e3o</span>
                </div>
                <div class="adm-log-summary-card">
                    <span class="adm-log-summary-label">Erro de dados</span>
                    <strong class="adm-log-summary-value">${counts.error}</strong>
                    <span class="adm-log-summary-help">${admLogStatusMeta.error.help}</span>
                </div>
                <div class="adm-log-summary-card">
                    <span class="adm-log-summary-label">Em espera</span>
                    <strong class="adm-log-summary-value">${counts.standby}</strong>
                    <span class="adm-log-summary-help">${admLogStatusMeta.standby.help}</span>
                </div>
                <div class="adm-log-summary-card">
                    <span class="adm-log-summary-label">Falha t\u00e9cnica</span>
                    <strong class="adm-log-summary-value">${counts.fail}</strong>
                    <span class="adm-log-summary-help">${admLogStatusMeta.fail.help}</span>
                </div>`;
        }
        async function admLoadLogs() {
            try {
                // 1. Buscar logs estruturados da tabela error_logs
                const logs = await sbGet('error_logs?archived=eq.false&order=created_at.desc&limit=50&select=id,application_id,company_id,error_cause,page_name,field_name,error_message,applicant_name,created_at,retry_number,screenshot_url,page_html,video_url') || [];

                // 2. TambÃ©m buscar erros de applications (fill_error) que podem nÃ£o ter log estruturado
                let appErrors = [];
                try {
                    appErrors = await sbGet('applications?fill_status=in.(error,fail)&fill_error=not.is.null&order=last_error_at.desc&limit=50&select=id,applicant_id,fill_status,fill_error,last_error_at,last_page') || [];
                    // Enriquecer com nome do applicant
                    if (appErrors.length > 0) {
                        const appIds = [...new Set(appErrors.map(a => a.applicant_id).filter(Boolean))];
                        if (appIds.length > 0) {
                            const names = await sbGet('applicants?id=in.(' + appIds.join(',') + ')&select=id,full_name,company_id') || [];
                            const applicantMap = {}; names.forEach(n => applicantMap[n.id] = n);
                            appErrors.forEach(a => {
                                a._applicant_name = applicantMap[a.applicant_id]?.full_name || '-';
                                a._company_id = applicantMap[a.applicant_id]?.company_id || null;
                            });
                        }
                    }
                } catch(e2) { console.warn('Failed to load app errors:', e2); }

                // 3. Merge: combinar error_logs + app_errors (sem duplicatas)
                const loggedAppIds = new Set(logs.map(l => l.application_id).filter(Boolean));
                const extraErrors = appErrors.filter(a => !loggedAppIds.has(a.id)).map(a => ({
                    id: 'app_' + a.id,
                    application_id: a.id,
                    company_id: a._company_id || null,
                    error_cause: a.fill_status === 'fail' ? 'system_error' : 'field_error',
                    page_name: a.last_page || null,
                    field_name: null,
                    error_message: a.fill_error,
                    applicant_name: a._applicant_name || '-',
                    created_at: a.last_error_at,
                    retry_number: null,
                    screenshot_url: null,
                    page_html: null,
                    video_url: null,
                    _appStatus: a.fill_status,
                    _fromApp: true
                }));
                const allLogs = [...logs, ...extraErrors]
                    .map((log) => ({
                        ...log,
                        _status: admClassifyLogStatus(log),
                        _companyName: admGetCompanyName(log.company_id),
                        _causeLabel: admCauseLabels[log.error_cause] || log.error_cause || '-'
                    }))
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

                const ce = document.getElementById('admLogsCount'); if (ce) ce.textContent = `(${allLogs.length})`;
                const be = document.getElementById('admLogsBadge'); if (be) { be.textContent = allLogs.length; be.style.display = allLogs.length > 0 ? 'inline' : 'none'; }
                admUpdateNav('logs');
                admRenderLogsSummary(allLogs);
                const tb = document.getElementById('admLogsTable');
                if (allLogs.length === 0) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">Nenhum log ativo no momento.</td></tr>'; return; }
                // Store logs for modal access
                window._admLogs = allLogs;
                tb.innerHTML = allLogs.map((l, idx) => {
                    const ds = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
                    const retryBadge = l.retry_number != null ? `<span class="adm-log-source">Tentativa #${l.retry_number}</span>` : `<span class="adm-log-source">${l._fromApp ? 'applications.fill_error' : 'error_logs'}</span>`;
                    const screenshotBtn = l.screenshot_url
                        ? `<button class="btn-new" onclick="admViewScreenshot(${idx})" style="background:#3b82f6;font-size:11px;padding:3px 6px" title="Ver screenshot">Imagem</button>`
                        : '<span style="color:var(--text-muted);font-size:11px">-</span>';
                    const htmlBtn = l.page_html
                        ? `<button class="btn-new" onclick="admViewHtml(${idx})" style="background:#8b5cf6;font-size:11px;padding:3px 6px" title="Ver HTML da p\u00e1gina">HTML</button>`
                        : '';
                    const videoBtn = l.video_url
                        ? `<a class="btn-new" href="${l.video_url}" target="_blank" rel="noopener" style="background:#0f766e;font-size:11px;padding:3px 6px">Vídeo</a>`
                        : '';
                    const archiveBtn = l._fromApp
                        ? '<span style="color:var(--text-muted);font-size:11px">Manual</span>'
                        : `<button class="btn-new" onclick="admArchiveLog('${l.id}')" style="background:#ef4444;font-size:11px;padding:4px 8px">Arquivar</button>`;
                    return `<tr>
                        <td><span class="adm-log-status" data-status="${l._status}">${admLogStatusMeta[l._status]?.label || l._status}</span></td>
                        <td>
                            <div class="adm-log-name">
                                <strong>${escapeHTML(l._companyName)}</strong>
                                <span>${escapeHTML(l.applicant_name || '-')}</span>
                                ${retryBadge}
                            </div>
                        </td>
                        <td>
                            <div class="adm-log-context">
                                <span class="adm-log-context-main">${escapeHTML(l._causeLabel)}</span>
                                <span class="adm-log-context-sub">${escapeHTML(l.page_name || 'Sem página')}${l.field_name ? ' &middot; ' + escapeHTML(l.field_name) : ''}</span>
                            </div>
                        </td>
                        <td><div class="adm-log-message" title="${escapeHTML(l.error_message || '')}">${escapeHTML(l.error_message || '-')}</div></td>
                        <td><div class="adm-log-media">${screenshotBtn}${htmlBtn ? ' ' + htmlBtn : ''}${videoBtn ? ' ' + videoBtn : ''}</div></td>
                        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap">${ds}</td>
                        <td><div class="adm-log-actions"><button class="btn-new" onclick="admOpenLogDetail(${idx})" style="font-size:11px;padding:4px 8px">Detalhes</button>${archiveBtn}</div></td>
                    </tr>`;
                }).join('');
            } catch (e) { document.getElementById('admLogsTable').innerHTML = '<tr><td colspan="7" style="color:#ef4444">' + e.message + '</td></tr>'; }
        }

        function admOpenLogDetail(idx) {
            const log = window._admLogs?.[idx]; if (!log) return;
            const old = document.getElementById('admLogDetailModal'); if (old) old.remove();
            const statusLabel = admLogStatusMeta[log._status]?.label || log._status;
            const html = `<div id="admLogDetailModal" class="modal-overlay" onclick="document.getElementById('admLogDetailModal').remove()">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:760px">
                    <div class="modal-header">
                        <div>
                            <h3 class="modal-title">Log de automação</h3>
                            <div class="modal-subtitle">${escapeHTML(log._companyName)} &middot; ${escapeHTML(log.applicant_name || '-')}</div>
                        </div>
                        <button class="modal-close" onclick="document.getElementById('admLogDetailModal').remove()">&times;</button>
                    </div>
                    <div class="adm-info-grid" style="margin-top:8px">
                        <div class="adm-card"><div class="adm-label">Status</div><div style="margin-top:6px"><span class="adm-log-status" data-status="${log._status}">${statusLabel}</span></div></div>
                        <div class="adm-card"><div class="adm-label">Causa</div><div style="margin-top:6px;font-weight:600">${escapeHTML(log._causeLabel)}</div></div>
                        <div class="adm-card"><div class="adm-label">Página / Campo</div><div style="margin-top:6px">${escapeHTML(log.page_name || '-')}${log.field_name ? ' &middot; <span style="font-family:monospace">' + escapeHTML(log.field_name) + '</span>' : ''}</div></div>
                        <div class="adm-card"><div class="adm-label">Quando</div><div style="margin-top:6px">${log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}</div></div>
                    </div>
                    <div class="adm-card" style="margin-top:14px">
                        <div class="adm-label">Mensagem</div>
                        <div style="margin-top:8px;font-size:13px;line-height:1.6;color:var(--text-primary)">${escapeHTML(log.error_message || '-')}</div>
                    </div>
                    <div class="modal-actions" style="margin-top:16px">
                        ${log.screenshot_url ? `<button class="btn-new" onclick="admViewScreenshot(${idx})">Ver imagem</button>` : ''}
                        ${log.page_html ? `<button class="btn-new" onclick="admViewHtml(${idx})" style="background:#8b5cf6">Ver HTML</button>` : ''}
                        ${log.video_url ? `<a class="btn-new" href="${log.video_url}" target="_blank" rel="noopener" style="background:#0f766e">Ver vídeo</a>` : ''}
                        ${log._fromApp ? '' : `<button class="btn-new btn-danger" onclick="admArchiveLog('${log.id}');document.getElementById('admLogDetailModal').remove()">Arquivar</button>`}
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        function admViewScreenshot(idx) {
            const log = window._admLogs?.[idx]; if (!log?.screenshot_url) return;
            const old = document.getElementById('screenshotModal'); if (old) old.remove();
            const html = `<div id="screenshotModal" class="modal-overlay" onclick="document.getElementById('screenshotModal').remove()" style="z-index:10010;background:rgba(0,0,0,.85)">
                <div onclick="event.stopPropagation()" style="max-width:90vw;max-height:90vh;position:relative">
                    <button onclick="document.getElementById('screenshotModal').remove()" style="position:absolute;top:-12px;right:-12px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:28px;height:28px;font-size:16px;cursor:pointer;z-index:1">&times;</button>
                    <img src="${log.screenshot_url}" style="max-width:90vw;max-height:85vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4)" onerror="this.outerHTML='<div style=\\'color:#fff;padding:40px\\'>Imagem nÃ£o encontrada</div>'">
                    <div style="color:#fff;font-size:12px;text-align:center;margin-top:8px;opacity:.7">${escapeHTML(log.applicant_name || '-')} &middot; ${escapeHTML(log.page_name || '-')} &middot; ${escapeHTML(log.error_cause || '')}</div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        function admViewHtml(idx) {
            const log = window._admLogs?.[idx]; if (!log?.page_html) return;
            const old = document.getElementById('htmlModal'); if (old) old.remove();
            const html = `<div id="htmlModal" class="modal-overlay" onclick="document.getElementById('htmlModal').remove()" style="z-index:10010">
                <div class="modal-box" onclick="event.stopPropagation()" style="max-width:900px;width:95vw;max-height:90vh;display:flex;flex-direction:column;padding:0">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
                        <h3 style="margin:0;font-size:14px">HTML da Página - ${escapeHTML(log.page_name || '-')}</h3>
                        <div style="display:flex;gap:8px">
                            <button class="btn-new" onclick="admCopyHtml(${idx})" style="font-size:11px;padding:4px 10px">ðŸ“‹ Copiar</button>
                            <button class="btn-new" onclick="admRenderHtml(${idx})" style="font-size:11px;padding:4px 10px;background:#8b5cf6">ðŸ‘ Renderizar</button>
                            <button onclick="document.getElementById('htmlModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">&times;</button>
                        </div>
                    </div>
                    <div id="htmlModalContent" style="flex:1;overflow:auto;padding:16px">
                        <pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;font-family:'Fira Code',monospace;line-height:1.5;margin:0;color:var(--text-primary)">${escapeHTML(log.page_html)}</pre>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        function admCopyHtml(idx) {
            const log = window._admLogs?.[idx]; if (!log?.page_html) return;
            navigator.clipboard.writeText(log.page_html).then(() => showToast('HTML copiado!', 'success')).catch(() => showToast('Erro ao copiar', 'error'));
        }

        function admRenderHtml(idx) {
            const log = window._admLogs?.[idx]; if (!log?.page_html) return;
            const container = document.getElementById('htmlModalContent');
            if (!container) return;
            // Toggle: se jÃ¡ tem iframe, volta pra pre
            if (container.querySelector('iframe')) {
                container.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;font-family:'Fira Code',monospace;line-height:1.5;margin:0;color:var(--text-primary)">${escapeHTML(log.page_html)}</pre>`;
                return;
            }
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'width:100%;height:70vh;border:1px solid var(--border);border-radius:8px;background:#fff';
            iframe.sandbox = 'allow-same-origin';
            container.innerHTML = '';
            container.appendChild(iframe);
            iframe.contentDocument.open();
            iframe.contentDocument.write(log.page_html);
            iframe.contentDocument.close();
        }

        async function admArchiveLog(id) { await sbFetch('error_logs?id=eq.' + id, 'PATCH', { archived: true }); showToast('Log arquivado', 'success'); admLoadLogs(); }
        async function admArchiveAllLogs() { if (!confirm('Arquivar todos os logs estruturados?')) return; await sbFetch('error_logs?archived=eq.false', 'PATCH', { archived: true }); showToast('Logs estruturados arquivados', 'success'); admLoadLogs(); }

        // Settings
        async function admLoadSettings() { try { const d = await sbGet('settings?key_name=in.(security_question,security_answer)&select=key_name,key_value'); (d || []).forEach(s => { if (s.key_name === 'security_question') { const el = document.getElementById('admSecurityQuestion'); if (el) el.value = s.key_value || '0'; } if (s.key_name === 'security_answer') { const el = document.getElementById('admSecurityAnswer'); if (el) el.value = s.key_value || ''; } }); } catch { } }
        async function admSaveSettings() { const q = document.getElementById('admSecurityQuestion').value, a = document.getElementById('admSecurityAnswer').value.trim(); try { await sbFetch('settings?key_name=eq.security_question', 'PATCH', { key_value: q }); await sbFetch('settings?key_name=eq.security_answer', 'PATCH', { key_value: a }); showToast('Configurações salvas!', 'success'); } catch (e) { showToast('Erro: ' + e.message, 'error'); } }

        // Org CRUD
        function admOpenOrgModal(editId = null) {
            const id = 'admOrgModal'; const ex = document.getElementById(id); if (ex) ex.remove();
            const org = editId ? _admOrgs.find(o => o.id === editId) : null;
            const html = `<div id="${id}" class="modal-overlay" onclick="document.getElementById('${id}').remove()"><div class="modal-box" onclick="event.stopPropagation()"><h3 class="modal-title">${editId ? 'Editar' : 'Nova'} Organização</h3>
                <label class="modal-label">Nome</label><input type="text" id="admOrgName" class="modal-input" value="${org?.name || ''}" placeholder="Ex: Empresa ABC">
                <label class="modal-label">Short ID</label><input type="text" id="admOrgShortId" class="modal-input" value="${org?.short_id || admGenShortId()}" maxlength="10">
                <label class="modal-label">CNPJ (opcional)</label><input type="text" id="admOrgCnpj" class="modal-input" value="${org?.cnpj || ''}" placeholder="00.000.000/0001-00">
                <div class="modal-actions" style="margin-top:14px"><button class="modal-btn" onclick="document.getElementById('${id}').remove()">Cancelar</button><button class="modal-btn primary" onclick="admSaveOrg('${editId || ''}')">Salvar</button></div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function admSaveOrg(editId) {
            const name = document.getElementById('admOrgName').value.trim(), short_id = document.getElementById('admOrgShortId').value.trim(), cnpj = document.getElementById('admOrgCnpj').value.trim();
            if (!name) { showToast('Nome é obrigatório', 'error'); return; }
            try {
                if (editId) { await sbFetch(`companies?id=eq.${editId}`, 'PATCH', { name, short_id, cnpj }); showToast('Organização atualizada', 'success'); }
                else { await sbFetch('companies', 'POST', { name, short_id: short_id || admGenShortId(), cnpj, active: true }); showToast('Organização criada', 'success'); }
                const m = document.getElementById('admOrgModal'); if (m) m.remove();
                await admLoadOrgs(); if (_admSelectedOrg && editId) await admOpenOrgDetail(editId);
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function admToggleActive() {
            if (!_admSelectedOrg) return;
            try { await sbFetch(`companies?id=eq.${_admSelectedOrg.id}`, 'PATCH', { active: !_admSelectedOrg.active }); showToast(_admSelectedOrg.active ? 'Desativada' : 'Ativada', 'success'); await admLoadOrgs(); await admOpenOrgDetail(_admSelectedOrg.id); } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function admDeleteOrg(orgId) {
            const m = await sbGet('members?company_id=eq.' + orgId + '&select=user_id'); if (m && m.length > 0) { showToast('Existem ' + m.length + ' assessor(es) vinculado(s)', 'error'); return; }
            const apps = await sbGet('applicants?company_id=eq.' + orgId + '&select=id&limit=1'); if (apps && apps.length > 0) { showToast('Existem solicitantes vinculados. Remova ou transfira-os primeiro.', 'error'); return; }
            if (!confirm('Excluir organização?')) return; await sbFetch('companies?id=eq.' + orgId, 'DELETE', null); showToast('Excluída!', 'success'); await admLoadOrgs(); admShowOrgList();
        }

        // User CRUD
        function admOpenUserModal() {
            const id = 'admUserModal'; const ex = document.getElementById(id); if (ex) ex.remove();
            const html = `<div id="${id}" class="modal-overlay" onclick="document.getElementById('${id}').remove()"><div class="modal-box" onclick="event.stopPropagation()"><h3 class="modal-title">Adicionar Assessor</h3>
                <label class="modal-label">E-mail</label><input type="email" id="admUserEmail" class="modal-input" placeholder="assessor@empresa.com">
                <label class="modal-label">Senha</label><input type="password" id="admUserPassword" class="modal-input" placeholder="MÃ­nimo 6 caracteres">
                <label class="modal-label">Perfil</label><select id="admUserRole" class="modal-input"><option value="assessor">Assessor</option><option value="admin">Administrador</option></select>
                <div class="modal-actions" style="margin-top:14px"><button class="modal-btn" onclick="document.getElementById('${id}').remove()">Cancelar</button><button class="modal-btn primary" id="admUserSaveBtn" onclick="admCreateUser()">Criar</button></div>
            </div></div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function admCreateUser() {
            const email = document.getElementById('admUserEmail').value.trim(), pw = document.getElementById('admUserPassword').value, role = document.getElementById('admUserRole').value;
            if (!email || !pw) { showToast('Preencha todos os campos', 'error'); return; }
            if (pw.length < 6) { showToast('Senha: mÃ­nimo 6 caracteres', 'error'); return; }
            const btn = document.getElementById('admUserSaveBtn'); btn.disabled = true; btn.textContent = 'Criando...';
            try {
                const tok = window._sessionToken || SUPABASE_KEY;
                const res = await fetch(SUPABASE_URL + '/functions/v1/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, 'apikey': SUPABASE_KEY }, body: JSON.stringify({ email, password: pw, company_id: _admSelectedOrg.id, role }) });
                const data = await res.json(); if (!res.ok || data.error) throw new Error(data.error || 'Erro ao criar');
                showToast(`Assessor ${email} criado`, 'success'); const m = document.getElementById('admUserModal'); if (m) m.remove();
                await admLoadOrgs(); await admLoadOrgUsers(_admSelectedOrg.id);
            } catch (e) { showToast('Erro: ' + e.message, 'error'); } finally { btn.disabled = false; btn.textContent = 'Criar'; }
        }

        async function admRemoveMember(userId, companyId) {
            if (!confirm('Remover assessor?')) return;
            try {
                // Verificar se Ã© o Ãºltimo admin da organizaÃ§Ã£o
                const admins = await sbGet(`members?company_id=eq.${companyId}&role=eq.admin&select=user_id`) || [];
                const isAdmin = admins.some(m => m.user_id === userId);
                if (isAdmin && admins.length <= 1) { showToast('NÃ£o Ã© possÃ­vel remover o Ãºltimo administrador da organizaÃ§Ã£o.', 'error'); return; }
                await sbFetch(`members?user_id=eq.${userId}&company_id=eq.${companyId}`, 'DELETE'); showToast('Removido', 'success'); await admLoadOrgs(); await admLoadOrgUsers(companyId);
            } catch (e) { showToast('Erro: ' + e.message, 'error'); }
        }

        async function admInitPanel() {
            await admLoadOrgs();
            if (currentAdminSection === 'orgs' && currentAdminOrgId) {
                await admOpenOrgDetail(currentAdminOrgId);
            }
            try {
                const d = await sbGet('error_logs?archived=eq.false&select=id&limit=100');
                const be = document.getElementById('admLogsBadge');
                if (be && d && d.length > 0) { be.textContent = d.length; be.style.display = 'inline'; }
            } catch { }
        }

        // ==========================================
        // INIT
        // ==========================================
        (async function init() {
            updateThemeUI(document.documentElement.getAttribute('data-theme') || 'dark');
            document.querySelector('.sidebar').style.display = 'none'; document.querySelector('.main').style.display = 'none';
            if (_authToken && _authToken !== SUPABASE_KEY) {
                window._sessionToken = _authToken;
                try {
                    await AppCore.sbFetch('applicants?select=id&limit=1', 'GET');
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session?.user) _currentUser = session.user;
                    else { try { const payload = JSON.parse(atob(_authToken.split('.')[1])); _currentUser = { email: payload.email || payload.sub || '' }; } catch { } }
                    await showDashboard(); return;
                } catch (err) {
                    // Token from URL may be expired â€” try Supabase session refresh before giving up
                    console.warn('[Dashboard] URL token failed, trying session refresh:', err.message);
                    window._sessionToken = null;
                    AppCore.clearSession();
                }
            }
            const isAuth = await checkAuth();
            if (isAuth) { await showDashboard(); return; }
            AppCore.hideLoading();
            const loginOv = document.getElementById('loginOverlay');
            if (loginOv) loginOv.style.display = 'flex';
        })();
