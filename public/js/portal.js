            const sbGet = AppCore.sbGet;
            const _params = new URLSearchParams(location.search);
            const _idParam = _params.get('id');
            const _orgParam = _params.get('org');

            let _companyId = null;
            let _orgName = '';
            let _email = '';
            let _forms = [];

            // ── ?id= resolve: try applicant ID first, then group_id ──
            if (_idParam) {
                (async () => {
                    try {
                        // Detect short_id vs UUID: short_id is ≤8 chars, no dashes
                        const isShortId = _idParam.length <= 8 && !_idParam.includes('-');
                        const filter = isShortId
                            ? 'short_id=eq.' + encodeURIComponent(_idParam)
                            : 'id=eq.' + encodeURIComponent(_idParam);

                        // 1) Try as individual applicant
                        const rows = await sbGet('applicants?' + filter + '&select=id,email,full_name,company_id,data,group_id,stage,status,sort_order,created_at&limit=1');
                        
                        if (rows && rows[0]) {
                            // ── INDIVIDUAL LINK: found applicant by ID ──
                            const app = rows[0];
                            _email = app.email || app.data?.personal1?.email || app.data?.contact?.email || '';

                            if (app.company_id) {
                                _companyId = app.company_id;
                                const orgs = await sbGet('companies?id=eq.' + app.company_id + '&select=short_id,name,logo_url,use_custom_logo,portal_bg_color,portal_btn_color,logo_max_width&limit=1');
                                if (orgs?.[0]) applyBranding(orgs[0]);
                            }

                            _forms = [app];

                            if (_email && _companyId) {
                                sessionStorage.setItem('portal_email', _email);
                                sessionStorage.setItem('portal_company_id', _companyId);
                            }

                            // Individual link → open form directly
                            AppCore.hideLoading();
                            openForm(app.id);
                            return;
                        }

                        // 2) Not found as applicant → try as group_id
                        const groupRows = await sbGet('applicants?group_id=eq.' + encodeURIComponent(_idParam) + '&select=id,email,full_name,company_id,data,group_id,stage,status,sort_order,created_at&order=sort_order.asc');

                        if (groupRows && groupRows.length > 0) {
                            // ── GROUP LINK: found members by group_id ──
                            const first = groupRows[0];
                            _email = first.email || first.data?.personal1?.email || first.data?.contact?.email || '';

                            if (first.company_id) {
                                _companyId = first.company_id;
                                const orgs = await sbGet('companies?id=eq.' + first.company_id + '&select=short_id,name,logo_url,use_custom_logo,portal_bg_color,portal_btn_color,logo_max_width&limit=1');
                                if (orgs?.[0]) applyBranding(orgs[0]);
                            }

                            _forms = groupRows;

                            // Group link → show member list
                            showView('list');
                            renderForms();
                            AppCore.hideLoading();
                            return;
                        }

                        // 3) Not found at all
                        document.getElementById('errorText').textContent = 'Solicitante ou grupo não encontrado.';
                        document.getElementById('errorMsg').classList.add('show');
                        showView('search');
                        AppCore.hideLoading();

                    } catch (e) {
                        console.error('[Portal] ID resolve error:', e);
                        document.getElementById('errorText').textContent = 'Erro ao buscar solicitante: ' + e.message;
                        document.getElementById('errorMsg').classList.add('show');
                        showView('search');
                        AppCore.hideLoading();
                    }
                })();
            }

            // ── Init portal ──
            async function initPortal() {
                if (!_orgParam) {
                    showOrgError();
                    showView('search');
                    AppCore.hideLoading();
                    return;
                }
                try {
                    const rows = await sbGet('companies?short_id=eq.' + encodeURIComponent(_orgParam) + '&select=id,name,logo_url,use_custom_logo,portal_bg_color,portal_btn_color,logo_max_width&limit=1');
                    if (!rows || !rows[0]) {
                        showOrgError();
                        showView('search');
                        AppCore.hideLoading();
                        return;
                    }
                    _companyId = rows[0].id;
                    _orgName = rows[0].name || _orgParam;
                    applyBranding(rows[0]);
                } catch (e) {
                    console.error('[Portal] Org resolve error:', e);
                    showOrgError();
                    showView('search');
                    AppCore.hideLoading();
                    return;
                }

                // Check for saved session (reload persistence)
                const savedEmail = sessionStorage.getItem('portal_email');
                const savedCompany = sessionStorage.getItem('portal_company_id');
                if (savedEmail && savedCompany && savedCompany === _companyId) {
                    _email = savedEmail;
                    // Fetch fresh data from DB
                    try {
                        let rows = await sbGet(
                            'applicants?company_id=eq.' + _companyId +
                            '&or=(email.ilike.' + encodeURIComponent(_email) +
                            ',data->personal1->>email.ilike.' + encodeURIComponent(_email) +
                            ')&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc,created_at.desc'
                        );
                        rows = rows || [];

                        // If any result belongs to a group, fetch ALL group members
                        const groupIds = [...new Set(rows.filter(r => r.group_id).map(r => r.group_id))];
                        for (const gid of groupIds) {
                            const gm = await sbGet('applicants?group_id=eq.' + gid + '&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc');
                            if (gm) gm.forEach(m => { if (!rows.find(r => r.id === m.id)) rows.push(m); });
                        }

                        _forms = rows;
                        showView('list');
                        renderForms();
                        AppCore.hideLoading();
                        return;
                    } catch (e) {
                        console.warn('[Portal] Session restore failed, showing search:', e);
                        sessionStorage.removeItem('portal_email');
                        sessionStorage.removeItem('portal_company_id');
                    }
                }
                showView('search');
                AppCore.hideLoading();
            }

            function applyBranding(org) {
                const logoMaxW = org.logo_max_width || 150;
                if (org.use_custom_logo && org.logo_url) {
                    document.querySelectorAll('#brandLogo, #navLogo').forEach(img => {
                        img.src = org.logo_url;
                        img.style.maxWidth = logoMaxW + 'px';
                    });
                }
                if (org.portal_bg_color) {
                    document.body.style.backgroundColor = org.portal_bg_color;
                    document.body.style.backgroundImage = 'none';
                }
                if (org.portal_btn_color) {
                    // Use CSS variable so all buttons (static + dynamic) inherit the color
                    document.body.style.setProperty('--accent', org.portal_btn_color);
                    document.body.style.setProperty('--accent-hover', org.portal_btn_color);
                }

                // Persist branding to sessionStorage for next pages (form, loading screen)
                if (org.use_custom_logo && org.logo_url) {
                    sessionStorage.setItem('client_org_logo', org.logo_url);
                    sessionStorage.setItem('client_org_use_logo', '1');
                    if (org.logo_max_width) sessionStorage.setItem('client_org_logo_width', org.logo_max_width);
                }
                if (org.portal_bg_color) {
                    sessionStorage.setItem('client_org_bg_color', org.portal_bg_color);
                }
            }

            function showOrgError() {
                document.getElementById('searchForm').style.display = 'none';
                document.getElementById('errorText').textContent = 'Link inválido. Este portal precisa ser acessado através do link fornecido pela sua organização.';
                document.getElementById('errorMsg').classList.add('show');
            }

            // ── View switcher ──
            function showView(view) {
                const searchEl = document.getElementById('viewSearch');
                const listEl = document.getElementById('viewList');
                if (view === 'list') {
                    searchEl.style.display = 'none';
                    listEl.style.display = 'flex';
                    document.getElementById('userEmail').textContent = _email;
                } else {
                    searchEl.style.display = '';
                    listEl.style.display = 'none';
                }
            }

            // ── Search ──
            async function searchByEmail(e) {
                e.preventDefault();
                const btn = document.getElementById('submitBtn');
                const errEl = document.getElementById('errorMsg');
                const email = document.getElementById('emailInput').value.trim().toLowerCase();
                if (!email || !_companyId) return;

                btn.disabled = true;
                btn.textContent = 'Buscando...';
                errEl.classList.remove('show');

                try {
                    let rows = await sbGet(
                        'applicants?company_id=eq.' + _companyId +
                        '&or=(email.ilike.' + encodeURIComponent(email) +
                        ',data->personal1->>email.ilike.' + encodeURIComponent(email) +
                        ')&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc,created_at.desc'
                    );
                    rows = rows || [];

                    // If any result belongs to a group, fetch ALL group members
                    const groupIds = [...new Set(rows.filter(r => r.group_id).map(r => r.group_id))];
                    if (groupIds.length > 0) {
                        for (const gid of groupIds) {
                            const groupMembers = await sbGet(
                                'applicants?group_id=eq.' + gid +
                                '&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc'
                            );
                            if (groupMembers) {
                                groupMembers.forEach(m => {
                                    if (!rows.find(r => r.id === m.id)) rows.push(m);
                                });
                            }
                        }
                    }

                    _email = email;
                    _forms = rows;
                    // Persist session for reload
                    sessionStorage.setItem('portal_email', _email);
                    sessionStorage.setItem('portal_company_id', _companyId);
                    showView('list');
                    renderForms();
                } catch (err) {
                    document.getElementById('errorText').textContent = 'Erro ao buscar: ' + err.message;
                    errEl.classList.add('show');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Confirmar';
                }
            }

            // ── Logout (back to search) ──
            function doLogout() {
                _email = '';
                _forms = [];
                sessionStorage.removeItem('portal_email');
                sessionStorage.removeItem('portal_company_id');
                document.getElementById('emailInput').value = '';
                document.getElementById('formList').innerHTML = '';
                document.getElementById('emptyState').style.display = 'none';
                document.getElementById('addNewBtnWrap').style.display = 'none';
                showView('search');
            }

            // ── Stage config ──
            const STAGE_LABELS = {
                screening: 'Triagem', analysis: 'Análise', ds160: 'DS-160',
                payment: 'Taxas', scheduling: 'Agendamento',
                interview: 'Entrevista', outcome: 'Resultado', archived: 'Arquivado'
            };
            const STATUS_LABELS = {
                todo: { label: 'Pendente', bg: '#f1f5f9', color: '#64748b' },
                doing: { label: 'Em execução', bg: '#dbeafe', color: '#2563eb' },
                done: { label: 'Concluído', bg: '#dcfce7', color: '#16a34a' },
                error: { label: 'Erro', bg: '#fef3c7', color: '#d97706' },
                retry: { label: 'Retry', bg: '#fff7ed', color: '#ea580c' },
                failed: { label: 'Falha', bg: '#fee2e2', color: '#dc2626' },
            };

            // ── Render ──
            function renderForms() {
                const container = document.getElementById('formList');
                const emptyEl = document.getElementById('emptyState');

                if (!_forms.length) {
                    container.innerHTML = '';
                    emptyEl.style.display = 'block';
                    document.getElementById('addNewBtnWrap').style.display = 'none';
                    return;
                }
                emptyEl.style.display = 'none';
                document.getElementById('addNewBtnWrap').style.display = 'block';

                let html = '<div class="table-wrap"><table class="form-table"><thead><tr>';
                html += '<th>Solicitante</th><th style="text-align:center">Etapa</th><th style="text-align:center">Status</th><th></th>';
                html += '</tr></thead><tbody>';

                _forms.forEach(form => {
                    const d = form.data || {};
                    const p1 = d.personal1 || {};
                    const given = titleCase(p1.givenName || '');
                    const sur = titleCase(p1.surname || '');
                    const shortGiven = given.split(/\s+/)[0] || '';
                    const shortSur = sur.split(/\s+/).pop() || '';
                    const displayName = shortGiven || shortSur ? (shortGiven + (shortSur ? ' ' + shortSur : '')) : titleCase((form.full_name || 'Sem nome').split(/\s+/).filter((_,i,a) => i===0||i===a.length-1).join(' '));
                    // DOB from data (translated to pt-BR)
                    const _monthsPt = {JAN:'jan',FEB:'fev',MAR:'mar',APR:'abr',MAY:'mai',JUN:'jun',JUL:'jul',AUG:'ago',SEP:'set',OCT:'out',NOV:'nov',DEC:'dez'};
                    let dobStr = '';
                    if (p1.dob && typeof p1.dob === 'object' && p1.dob.day) {
                        const mPt = _monthsPt[(p1.dob.month || '').toUpperCase()] || (p1.dob.month || '').toLowerCase();
                        dobStr = `${p1.dob.day} ${mPt} ${p1.dob.year || ''}`;
                    }
                    const stage = form.stage || 'screening';
                    const stageLabel = STAGE_LABELS[stage] || stage;
                    const status = form.status || 'todo';
                    const stCfg = STATUS_LABELS[status] || STATUS_LABELS.todo;
                    // Allow delete if entry has no meaningful data (just created by mistake)
                    const dataKeys = Object.keys(d).filter(k => typeof d[k] === 'object' && d[k] && Object.values(d[k]).some(v => v !== '' && v !== null && v !== undefined && v !== 'N/S'));
                    const canDelete = dataKeys.length <= 2 && stage === 'screening' && status === 'todo';
                    html += `<tr onclick="openForm('${form.id}')">
                    <td><div class="name-col">
                        <div class="name-info"><div class="name">${displayName}</div>${dobStr ? `<div class="sub">${dobStr}</div>` : ''}</div>
                    </div></td>
                    <td style="text-align:center"><span class="stage-badge ${stage}">${stageLabel}</span></td>
                    <td style="text-align:center"><span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;background:${stCfg.bg};color:${stCfg.color}">${stCfg.label}</span></td>
                    <td style="text-align:center;width:40px">${canDelete ? `<button onclick="event.stopPropagation();deletePortalApplicant('${form.id}','${displayName.replace(/'/g, "\\'")}')"
                        style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;padding:4px" title="Remover formulário">
                        <i class="iconoir-trash"></i></button>` : ''}</td>
                </tr>`;
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;
            }

            // Delete for orphaned/empty entries (solicitante can only delete untouched entries)
            async function deletePortalApplicant(id, name) {
                if (!confirm('Remover o formulário de "' + name + '"?\nEsta ação não pode ser desfeita.')) return;
                try {
                    await AppCore.sbFetch('applicants?id=eq.' + id, 'DELETE');
                    showToast('Formulário removido', 'success');
                    await reloadFormList();
                } catch (e) { showToast('Erro: ' + e.message, 'error'); }
            }
            window.deletePortalApplicant = deletePortalApplicant;

            function titleCase(s) { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }

            function showToast(msg, type) {
                const t = document.createElement('div');
                t.className = 'toast ' + type;
                t.textContent = msg;
                document.body.appendChild(t);
                setTimeout(() => t.remove(), 3000);
            }

            // ── Open form ──
            function openForm(id) {
                sessionStorage.setItem('client_app_id', id);
                let url = 'ds160-form.html?id=' + id + '&secure_entry=1';
                if (_orgParam) url += '&org=' + encodeURIComponent(_orgParam);
                // If accessed via direct link (?id=), mark as direct so form hides back button
                if (_idParam) url += '&direct=1';
                window.location.href = url;
            }

            // ── Create new ──
            let _modalPhoneItiCpf = null;
            let _modalPhoneItiManual = null;
            let _cpfData = null;
            let _modalHasCpf = null; // 'yes', 'no', 'later'

            function _hideAllModalSteps() {
                ['modalStep1','modalStepCpf','modalExtraFieldsCpf','modalExtraFieldsManual'].forEach(id => {
                    document.getElementById(id).style.display = 'none';
                });
            }

            function createNewForm() {
                if (!_companyId) { showToast('Erro: organização não identificada.', 'error'); return; }
                const modal = document.getElementById('newApplicantModal');
                // Reset fields
                document.getElementById('modalGivenName').value = '';
                document.getElementById('modalSurname').value = '';
                document.getElementById('modalCpf').value = '';
                document.getElementById('modalFullName').value = '';
                document.getElementById('modalPhoneCpf').value = '';
                document.getElementById('modalPhoneManual').value = '';
                document.getElementById('modalEmailCpf').value = _forms.length === 0 ? (_email || '') : '';
                document.getElementById('modalEmailManual').value = _forms.length === 0 ? (_email || '') : '';
                const hint = document.getElementById('cpfHint');
                if (hint) { hint.textContent = 'Digite o CPF completo e clique em Buscar.'; hint.style.color = 'var(--text-muted)'; }
                _cpfData = null;
                _modalHasCpf = null;
                _hideAllModalSteps();
                document.getElementById('modalStep1').style.display = 'block';
                modal.style.display = 'flex';

                // Init intl-tel-input
                if (typeof intlTelInput !== 'undefined') {
                    const itiOpts = { initialCountry: 'br', preferredCountries: ['br', 'us', 'pt'], separateDialCode: true, formatAsYouType: false, utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js' };
                    if (!_modalPhoneItiCpf) {
                        _modalPhoneItiCpf = intlTelInput(document.getElementById('modalPhoneCpf'), itiOpts);
                    }
                    if (!_modalPhoneItiManual) {
                        _modalPhoneItiManual = intlTelInput(document.getElementById('modalPhoneManual'), itiOpts);
                    }
                }
            }

            function closeNewModal() { document.getElementById('newApplicantModal').style.display = 'none'; }

            // Close modal on ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('newApplicantModal');
                    if (modal && modal.style.display !== 'none') closeNewModal();
                }
            });

            function modalReset() {
                _cpfData = null;
                if (_modalHasCpf === 'yes') {
                    document.getElementById('modalGivenName').value = '';
                    document.getElementById('modalSurname').value = '';
                    document.getElementById('modalCpf').value = '';
                    document.getElementById('modalExtraFieldsCpf').style.display = 'none';
                    const hint = document.getElementById('cpfHint');
                    hint.textContent = 'Digite o CPF completo e clique em Buscar.';
                    hint.style.color = 'var(--text-muted)';
                    document.getElementById('modalStepCpf').style.display = 'block';
                    const btn = document.getElementById('btnCpfSearch');
                    btn.disabled = false; btn.textContent = 'Buscar';
                    setTimeout(() => document.getElementById('modalCpf').focus(), 100);
                } else {
                    // 'no' ou 'later' → volta ao Step1
                    document.getElementById('modalFullName').value = '';
                    _hideAllModalSteps();
                    document.getElementById('modalStep1').style.display = 'block';
                }
            }

            function modalHasCpf(choice) {
                _modalHasCpf = choice;
                _hideAllModalSteps();
                if (choice === 'yes') {
                    document.getElementById('modalStepCpf').style.display = 'block';
                    setTimeout(() => document.getElementById('modalCpf').focus(), 100);
                } else {
                    // 'no' ou 'later' → formulário manual direto
                    document.getElementById('modalExtraFieldsManual').style.display = 'block';
                    setTimeout(() => document.getElementById('modalFullName').focus(), 100);
                }
            }

            let _cpfLookupRunning = false;
            async function lookupCpf() {
                const cpf = (document.getElementById('modalCpf').value || '').replace(/\D/g, '');
                if (cpf.length !== 11) { const h = document.getElementById('cpfHint'); h.textContent = 'CPF deve ter 11 dígitos.'; h.style.color = 'var(--danger)'; return; }
                if (_cpfLookupRunning) return;
                _cpfLookupRunning = true;
                const hint = document.getElementById('cpfHint');
                const btn = document.getElementById('btnCpfSearch');
                btn.disabled = true; btn.textContent = '...';
                hint.textContent = 'Buscando dados...';
                hint.style.color = 'var(--accent)';
                const extra = document.getElementById('modalExtraFieldsCpf');
                try {
                    const resp = await AppCore.callEdgeFunction('cpf-lookup', { cpf });
                    if (resp && resp.rateLimited) {
                        hint.textContent = 'Limite atingido. Preencha manualmente.';
                        hint.style.color = '#e67e22';
                    } else if (resp && resp.data && resp.data.nome) {
                        const d = resp.data;
                        _cpfData = d;
                        const { givenName, surname } = _splitBrazilianName(d.nome);
                        document.getElementById('modalGivenName').value = givenName.toUpperCase();
                        document.getElementById('modalSurname').value = surname.toUpperCase();
                        hint.textContent = '✓ ' + d.nome;
                        hint.style.color = 'var(--success)';
                    } else if (resp && resp.error) {
                        hint.textContent = resp.error + ' Preencha manualmente.';
                        hint.style.color = 'var(--danger)';
                    } else {
                        hint.textContent = 'CPF não encontrado. Preencha manualmente.';
                        hint.style.color = 'var(--danger)';
                    }
                } catch (e) {
                    console.warn('[CPF Lookup]', e);
                    hint.textContent = 'Erro na consulta. Preencha manualmente.';
                    hint.style.color = 'var(--danger)';
                } finally {
                    _cpfLookupRunning = false;
                    btn.disabled = false; btn.textContent = 'Buscar';
                    extra.style.display = 'block';
                }
            }

            // Split name following Brazilian passport convention (Polícia Federal)
            // 4+ words: last 2 = surname (ex: MARCOS VINICIUS → given, SOUZA SILVA → surname)
            // 3 words: last 1 = surname
            // Prepositions (da, de, dos, etc.) are attached to the surname
            function _splitBrazilianName(fullName) {
                const parts = fullName.trim().split(/\s+/);
                if (parts.length <= 1) return { givenName: parts[0] || '', surname: '' };
                if (parts.length === 2) return { givenName: parts[0], surname: parts[1] };
                if (parts.length === 3) return { givenName: parts.slice(0, 2).join(' '), surname: parts[2] };
                // 4+ words: last 2 are surname
                let splitAt = parts.length - 2;
                // If word before surname is a preposition, include it
                const preps = ['DA','DE','DO','DOS','DAS','E'];
                if (splitAt > 1 && preps.includes(parts[splitAt - 1].toUpperCase())) splitAt--;
                return { givenName: parts.slice(0, splitAt).join(' '), surname: parts.slice(splitAt).join(' ') };
            }

            // Convert YYYY-MM-DD to { day, month, year } format expected by form-engine
            function _apiDateToDs160(dateStr) {
                if (!dateStr) return null;
                const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
                const parts = dateStr.split('-');
                if (parts.length !== 3) return null;
                const [y, m, d] = parts;
                return { day: String(parseInt(d, 10)), month: months[parseInt(m, 10) - 1], year: y };
            }

            async function confirmNewApplicant() {
                let givenName, surname, fullName, phone, memberEmail;

                if (_modalHasCpf === 'yes') {
                    // Fluxo CPF: nome/sobrenome separados
                    givenName = document.getElementById('modalGivenName').value.trim().toUpperCase();
                    surname = document.getElementById('modalSurname').value.trim().toUpperCase();
                    if (!givenName) { showToast('Nome é obrigatório', 'error'); document.getElementById('modalGivenName').focus(); return; }
                    if (!surname) { showToast('Sobrenome é obrigatório', 'error'); document.getElementById('modalSurname').focus(); return; }
                    const cpf = document.getElementById('modalCpf').value.trim().replace(/\D/g, '');
                    if (!cpf) { showToast('CPF é obrigatório', 'error'); document.getElementById('modalCpf').focus(); return; }
                    fullName = givenName + ' ' + surname;
                    phone = _modalPhoneItiCpf ? _modalPhoneItiCpf.getNumber() : (document.getElementById('modalPhoneCpf').value.trim().replace(/[^\d+]/g, '') || '');
                    memberEmail = document.getElementById('modalEmailCpf').value.trim();
                } else {
                    // Fluxo manual: nome completo único
                    const raw = document.getElementById('modalFullName').value.trim().toUpperCase();
                    if (!raw) { showToast('Nome completo é obrigatório', 'error'); document.getElementById('modalFullName').focus(); return; }
                    const split = _splitBrazilianName(raw);
                    givenName = split.givenName;
                    surname = split.surname;
                    fullName = raw;
                    phone = _modalPhoneItiManual ? _modalPhoneItiManual.getNumber() : (document.getElementById('modalPhoneManual').value.trim().replace(/[^\d+]/g, '') || '');
                    memberEmail = document.getElementById('modalEmailManual').value.trim();
                }

                // Build pre-populated data
                const personal1 = { surname, givenName, email: _email || '' };
                personal1.fullNameNative = (givenName + ' ' + surname).trim();
                const personal2 = {};

                if (_modalHasCpf === 'yes') {
                    const cpf = document.getElementById('modalCpf').value.trim().replace(/\D/g, '');
                    personal2.nationalId = cpf;
                }

                // Pre-fill from CPF API data
                if (_cpfData) {
                    if (_cpfData.data_nascimento) {
                        const dob = _apiDateToDs160(_cpfData.data_nascimento);
                        if (dob) personal1.dob = dob;
                    }
                    if (_cpfData.genero) personal1.sex = _cpfData.genero;
                    personal1.countryOfBirth = 'BRAZIL';
                }

                closeNewModal();
                AppCore.showLoading();
                try {
                    if (_forms.length === 0) {
                        const data = { personal1, personal2, addressPhone: { phone: phone || '', email: _email || '' } };
                        const payload = {
                            full_name: fullName, data, email: _email || null, company_id: _companyId,
                            stage: 'screening', status: 'todo', result: 'pending', priority: 'normal'
                        };
                        const result = await AppCore.sbFetch('applicants', 'POST', payload);
                        if (!result?.[0]) { AppCore.hideLoading(); showToast('Erro: resposta inesperada', 'error'); return; }
                        showToast('Formulário criado!', 'success');
                        await reloadFormList();
                        return;
                    }

                    const existing = _forms[0];
                    let groupId = existing.group_id;

                    if (!groupId) {
                        const groupPayload = { nickname: existing.full_name || 'Grupo', email: _email || existing.email || '', company_id: _companyId };
                        const groupResult = await AppCore.sbFetch('groups', 'POST', groupPayload);
                        if (!groupResult?.[0]) { AppCore.hideLoading(); showToast('Erro ao criar grupo', 'error'); return; }
                        groupId = groupResult[0].id;
                        await AppCore.sbFetch('applicants?id=eq.' + existing.id, 'PATCH', { group_id: groupId, sort_order: 0, stage: 'screening' });
                    }

                    const maxSort = _forms.reduce((max, f) => Math.max(max, f.sort_order ?? 0), 0);
                    const newData = { personal1, personal2 };
                    if (phone) newData.addressPhone = { phone };
                    if (memberEmail) { newData.personal1.email = memberEmail; if (!newData.addressPhone) newData.addressPhone = {}; newData.addressPhone.email = memberEmail; }

                    const newPayload = {
                        full_name: fullName, data: newData, email: memberEmail || null, company_id: _companyId,
                        group_id: groupId, sort_order: maxSort + 1,
                        stage: 'screening', status: 'todo', result: 'pending', priority: 'normal'
                    };
                    const newResult = await AppCore.sbFetch('applicants', 'POST', newPayload);
                    if (!newResult?.[0]) { AppCore.hideLoading(); showToast('Erro: resposta inesperada', 'error'); return; }
                    showToast('Solicitante adicionado!', 'success');
                    await reloadFormList();
                } catch (e) {
                    console.error('[Forms] Create error:', e);
                    showToast('Erro ao criar: ' + e.message, 'error');
                    AppCore.hideLoading();
                }
            }

            // ── Reload form list from DB ──
            async function reloadFormList() {
                AppCore.showLoading();
                try {
                    let rows = await sbGet(
                        'applicants?company_id=eq.' + _companyId +
                        '&or=(email.ilike.' + encodeURIComponent(_email) +
                        ',data->personal1->>email.ilike.' + encodeURIComponent(_email) +
                        ')&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc,created_at.desc'
                    );
                    rows = rows || [];
                    const groupIds = [...new Set(rows.filter(r => r.group_id).map(r => r.group_id))];
                    for (const gid of groupIds) {
                        const gm = await sbGet('applicants?group_id=eq.' + gid + '&select=id,full_name,data,stage,status,group_id,sort_order,created_at&order=sort_order.asc');
                        if (gm) gm.forEach(m => { if (!rows.find(r => r.id === m.id)) rows.push(m); });
                    }
                    _forms = rows;
                    renderForms();
                } catch (e) {
                    console.error('[Portal] Reload error:', e);
                } finally {
                    AppCore.hideLoading();
                }
            }

            // ── Boot ──
            if (!_idParam) initPortal();