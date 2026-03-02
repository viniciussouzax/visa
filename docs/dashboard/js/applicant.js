// ============================================================
// DS160 EXPRESSO — Applicant Detail Page JS
// ============================================================

let currentApplicantId = null;

(async () => {
    try {
        const ok = await initAuth();
        if (!ok) { hideLoader(); return; }
        renderLayout();

        // Get applicant ID from URL
        const params = new URLSearchParams(location.search);
        currentApplicantId = params.get('id');
        if (!currentApplicantId) { hideLoader(); window.location.href = 'index.html'; return; }

        await openApplicantDetail(currentApplicantId);
        setupApplicantListeners();
    } catch (e) {
        console.error('[Applicant] Init error:', e);
    } finally {
        hideLoader();
    }
})();

function setupApplicantListeners() {
    $('modal-close')?.addEventListener('click', () => $('info-modal').classList.add('hidden'));

    window.addEventListener('message', async (e) => {
        if (e.data?.type === 'form-approved') {
            closeProcessModal();
            if (currentApplicantId) openApplicantDetail(currentApplicantId);
        }
    });
}

// ============================================================
// APPLICANT DETAIL
// ============================================================
async function openApplicantDetail(id) {
    const { data: applicant } = await sb.from('applicants').select('*').eq('id', id).single();
    if (!applicant) { $('applicant-detail-content').innerHTML = '<div class="text-center py-20 text-sm text-red-400">Solicitante não encontrado</div>'; return; }

    const { data: deps } = await sb.from('applicants').select('*').eq('primary_applicant_id', id);
    const allIds = [id, ...(deps || []).map(d => d.id)];
    const { data: apps } = await sb.from('applications').select('*').in('applicant_id', allIds);
    const appsMap = {};
    (apps || []).forEach(a => { if (!appsMap[a.applicant_id]) appsMap[a.applicant_id] = []; appsMap[a.applicant_id].push(a); });

    const allProcesses = [applicant, ...(deps || [])];
    const doneCount = allProcesses.filter(p => p.pipeline_status === 'done').length;
    const totalCount = allProcesses.length;
    const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    const email = applicant.data?.addressPhone?.email || applicant.data?.personal?.email || '';
    $('page-title').textContent = applicant.full_name;
    $('page-subtitle').textContent = email;

    let html = `
    <div class="ds-card" style="border-radius:12px;padding:18px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
                <span class="ds-col-header">Mover todos:</span>
                <select onchange="if(this.value){moveAllPipeline('${id}',this.value);this.value=''}" class="ds-btn-inline">
                    <option value="">Selecionar etapa...</option>
                    ${STAGE_ORDER.map(s => `<option value="${s}">${STAGES[s].label}</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
                <div style="text-align:right">
                    <span class="ds-stat-big" style="color:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : 'var(--text-muted)'}">${doneCount}/${totalCount}</span>
                    <span class="ds-stat-unit">concluídos</span>
                </div>
                <div class="ds-progress-bar">
                    <div class="ds-progress-fill" style="width:${progressPercent}%;background:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : '#3b82f6'}"></div>
                </div>
                <button onclick="showDeleteModal('${id}','${applicant.full_name.replace(/'/g, "\\\\'")}')" class="ds-btn-danger">Excluir</button>
            </div>
        </div>
    </div>

    <h3 class="ds-section-label">Processos (${totalCount})</h3>
    <div style="display:grid;gap:10px">`;

    allProcesses.forEach(p => {
        const isPrimary = !p.primary_applicant_id;
        const pStage = STAGES[p.pipeline_status] || STAGES.new;
        const pPassport = p.passport_number || '';
        const isDone = p.pipeline_status === 'done';
        const roleLabel = isPrimary ? 'Principal' : 'Dependente';

        const pApps = appsMap[p.id] || [];
        const pApp = pApps[0];
        const appId = pApp?.id ? pApp.id.substring(0, 8) : '';
        const fillStatus = pApp?.fill_status || '—';
        const fStage = FILL_STAGES[fillStatus] || { label: fillStatus, color: '#6b7280' };

        const pPrio = PRIORITIES[p.fill_priority] || PRIORITIES[0];
        const pPrioBadge = (p.fill_priority || 0) >= 2
            ? `<span class="ds-badge" style="font-size:10px;padding:1px 6px;background:${pPrio.color}15;color:${pPrio.color}">${pPrio.icon} ${pPrio.label}</span>` : '';

        html += `
        <div class="ds-process-card${isDone ? ' done' : ''}${(p.fill_priority || 0) >= 3 ? ' priority-high' : (p.fill_priority || 0) >= 2 ? ' priority-medium' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="openProcessModal('${p.id}')">
                <div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span class="ds-text-name" style="white-space:normal">${p.full_name}</span>
                        ${appId ? `<span class="ds-text-muted" style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:monospace">${appId}</span>` : ''}
                        ${pPrioBadge}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                        <span class="ds-text-muted">${roleLabel}${pPassport ? ' · ' + pPassport : ''}</span>
                        ${fillStatus !== '—' ? (() => {
                const isClickable = fillStatus === 'error' || fillStatus === 'needs_attention' || fillStatus === 'system_error';
                const clickAttr = isClickable ? `onclick="event.stopPropagation();openLogsModal('${p.id}')" style="cursor:pointer;font-size:10px;padding:1px 6px;background:${fStage.color}15;color:${fStage.color}"` : `style="font-size:10px;padding:1px 6px;background:${fStage.color}15;color:${fStage.color}"`;
                return `<span class="ds-badge" ${clickAttr}><span class="ds-badge-dot" style="background:${fStage.color}"></span>${fStage.label}</span>`;
            })() : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${pApp ? `<button onclick="event.stopPropagation();viewAppDetails('${p.id}')" class="ds-btn-inline">Detalhes</button>` : ''}
                    <select onclick="event.stopPropagation()" onchange="if(this.value!==''){setPriority('${p.id}',this.value,'${id}')}"
                        style="font-size:13px;padding:8px 14px;background:${pPrio.color}08;color:${pPrio.color};border:1px solid #d1d5db;border-radius:5px;cursor:pointer;outline:none;font-weight:500;font-family:inherit">
                        <option value="">${pPrio.icon} ${(p.fill_priority || 0) >= 2 ? pPrio.label : 'Prioridade'}</option>
                        <option value="0">Normal</option>
                        <option value="2">Urgente</option>
                        <option value="3">Emergência</option>
                    </select>
                    <select onclick="event.stopPropagation()" onchange="if(this.value){movePipeline('${p.id}',this.value,'${id}')}"
                        style="font-size:13px;padding:8px 14px;background:${pStage.color}08;color:${pStage.color};border:1px solid #d1d5db;border-radius:5px;cursor:pointer;outline:none;font-weight:600;font-family:inherit">
                        <option value="">${pStage.label}</option>
                        ${STAGE_ORDER.filter(s => s !== p.pipeline_status).map(s => `<option value="${s}">${STAGES[s].label}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
    $('applicant-detail-content').innerHTML = html;
}

// ============================================================
// PIPELINE ACTIONS
// ============================================================
async function movePipeline(applicantId, newStatus, primaryId) {
    const { error } = await sb.from('applicants')
        .update({ pipeline_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicantId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    if (newStatus === 'approved') await _resetApplicationForRefill(applicantId);
    toast(`Movido para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    openApplicantDetail(primaryId || applicantId);
}

async function moveAllPipeline(primaryId, newStatus) {
    const { data: deps } = await sb.from('applicants').select('id').eq('primary_applicant_id', primaryId);
    const allIds = [primaryId, ...(deps || []).map(d => d.id)];
    for (const aid of allIds) {
        await sb.from('applicants').update({ pipeline_status: newStatus, updated_at: new Date().toISOString() }).eq('id', aid);
        if (newStatus === 'approved') await _resetApplicationForRefill(aid);
    }
    toast(`Todos movidos para ${STAGES[newStatus]?.label || newStatus}`, 'success');
    openApplicantDetail(primaryId);
}

async function _resetApplicationForRefill(applicantId) {
    const { data: apps } = await sb.from('applications').select('id, fill_status, application_id').eq('applicant_id', applicantId);
    if (apps && apps.length > 0) {
        for (const app of apps) {
            if (app.fill_status === 'filled' || app.fill_status === 'error' || app.fill_status === 'needs_attention' || app.fill_status === 'system_error') {
                const updateData = {
                    fill_status: 'pending', fill_error: null, fill_worker_id: null,
                    fill_started_at: null, fill_finished_at: null, retry_count: 0,
                    last_page: null, last_error_at: null
                };
                // Preservar application_id se já existe (retomar via Recovery)
                if (!app.application_id) {
                    updateData.application_id = null;
                }
                await sb.from('applications').update(updateData).eq('id', app.id);
            }
        }
    }
}

async function setPriority(applicantId, priority, primaryId) {
    const { error } = await sb.from('applicants')
        .update({ fill_priority: parseInt(priority), updated_at: new Date().toISOString() })
        .eq('id', applicantId);
    if (error) { toast('Erro: ' + error.message, 'error'); return; }
    const prio = PRIORITIES[priority] || PRIORITIES[0];
    toast(`Prioridade: ${prio.icon} ${prio.label}`, 'success');
    openApplicantDetail(primaryId || applicantId);
}

// ============================================================
// PROCESS MODAL
// ============================================================
async function openProcessModal(applicantId) {
    const { data: applicant } = await sb.from('applicants').select('full_name, pipeline_status').eq('id', applicantId).single();
    if (!applicant) return;
    const stage = STAGES[applicant.pipeline_status] || STAGES.new;
    $('process-modal-name').textContent = applicant.full_name;
    $('process-modal-sub').innerHTML = `<span style="background:${stage.color}18;color:${stage.color};padding:2px 10px;border-radius:4px;font-size:11px;font-weight:400">${stage.label}</span>`;
    const { data: { session } } = await sb.auth.getSession();
    const tokenParam = session?.access_token ? `&auth=${session.access_token}` : '';
    $('process-modal-iframe').src = `../ds160/index.html?id=${applicantId}${userCompanyShortId ? '&org=' + userCompanyShortId : ''}${tokenParam}`;
    $('process-modal').style.display = 'flex';
}

function closeProcessModal() {
    $('process-modal').style.display = 'none';
    $('process-modal-iframe').src = 'about:blank';
}

// ============================================================
// VIEW APP DETAILS
// ============================================================
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
// DELETE
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
    window.location.href = 'index.html';
}

// ============================================================
// LOGS MODAL — Timeline de logs por processo
// ============================================================
async function openLogsModal(applicantId) {
    $('logs-modal').style.display = 'flex';
    $('logs-modal-body').innerHTML = '<div style="text-align:center;padding:32px 0;color:#9ca3af;font-size:14px">Carregando logs...</div>';

    // Get applications for this applicant
    const { data: apps } = await sb.from('applications').select('id').eq('applicant_id', applicantId);
    const appIds = (apps || []).map(a => a.id);

    if (appIds.length === 0) {
        $('logs-modal-body').innerHTML = '<div class="log-empty">Nenhuma application encontrada para este processo.</div>';
        return;
    }

    // Parallel queries: error_logs + fill_logs
    const [errRes, fillRes] = await Promise.all([
        sb.from('error_logs').select('*').in('application_id', appIds).order('created_at', { ascending: false }).limit(50),
        sb.from('fill_logs').select('*').in('application_id', appIds).order('created_at', { ascending: false }).limit(50)
    ]);

    const errorLogs = (errRes.data || []).map(e => ({ ...e, _type: 'error' }));
    const fillLogs = (fillRes.data || []).map(f => ({ ...f, _type: 'fill' }));

    // Merge and sort by created_at DESC
    const allLogs = [...errorLogs, ...fillLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (allLogs.length === 0) {
        $('logs-modal-body').innerHTML = '<div class="log-empty">Nenhum log encontrado para este processo.</div>';
        return;
    }

    let html = `<div class="logs-timeline">`;

    for (const log of allLogs) {
        const date = new Date(log.created_at);
        const timeStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
            date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (log._type === 'error') {
            // Error log entry
            const causeLabel = log.error_cause || 'unknown';
            const entryClass = causeLabel.includes('validation') || causeLabel === 'page_stuck'
                ? 'log-warning' : 'log-error';

            html += `<div class="log-entry ${entryClass}">`;
            html += `<div class="log-meta">`;
            html += `<span class="log-time">${timeStr}</span>`;
            if (log.page_name) html += `<span class="log-page-badge">${log.page_name}</span>`;
            html += `<span class="log-type-badge" style="background:#ef444415;color:#ef4444">🛑 ${causeLabel}</span>`;
            html += `</div>`;
            html += `<div class="log-message">${_escHtml(log.error_message || '')}</div>`;

            // Validation errors
            if (log.validation_errors && log.validation_errors.length > 0) {
                html += `<div class="log-details">`;
                log.validation_errors.forEach(v => { html += `<div>• ${_escHtml(v)}</div>`; });
                html += `</div>`;
            }

            // Field name
            if (log.field_name) {
                html += `<div class="log-details">Campo: <code>${_escHtml(log.field_name)}</code></div>`;
            }

            // Screenshot
            if (log.screenshot_url) {
                html += `<img class="log-screenshot" src="${log.screenshot_url}" onclick="expandScreenshot('${log.screenshot_url}')" alt="Screenshot" loading="lazy">`;
            }

            // Actions (master only: View HTML)
            if (isMaster && log.page_html) {
                html += `<div class="log-actions">`;
                html += `<button onclick="showPageHtml(this)" data-html="${btoa(unescape(encodeURIComponent(log.page_html)))}">📄 Ver HTML</button>`;
                html += `</div>`;
            }
            html += `</div>`;

        } else {
            // Fill log entry
            const navigated = log.navigated;
            const entryClass = !navigated ? 'log-warning'
                : (log.data_unused && log.data_unused.length > 0) ? 'log-info'
                    : 'log-success';

            const pct = log.fields_total > 0 ? Math.round((log.fields_filled / log.fields_total) * 100) : 0;

            html += `<div class="log-entry ${entryClass}">`;
            html += `<div class="log-meta">`;
            html += `<span class="log-time">${timeStr}</span>`;
            if (log.page_name) html += `<span class="log-page-badge">${log.page_name}</span>`;

            if (!navigated) {
                html += `<span class="log-type-badge" style="background:#f59e0b15;color:#f59e0b">⚠️ Stuck</span>`;
            } else {
                html += `<span class="log-type-badge" style="background:#22c55e15;color:#22c55e">✅ OK</span>`;
            }
            html += `</div>`;

            // Stats
            html += `<div class="log-stats">`;
            html += `<span class="log-stat">📝 ${log.fields_filled}/${log.fields_total} campos (${pct}%)</span>`;
            if (log.attempts > 1) html += `<span class="log-stat">🔄 ${log.attempts} tentativas</span>`;
            if (log.duration_ms) html += `<span class="log-stat">⏱️ ${(log.duration_ms / 1000).toFixed(1)}s</span>`;
            html += `</div>`;

            // Unmatched fields
            if (log.fields_unmatched && log.fields_unmatched.length > 0) {
                html += `<div class="log-details"><strong>Campos não reconhecidos:</strong>`;
                log.fields_unmatched.slice(0, 5).forEach(f => { html += ` <code>${_escHtml(f)}</code>`; });
                if (log.fields_unmatched.length > 5) html += ` +${log.fields_unmatched.length - 5}`;
                html += `</div>`;
            }

            // Unused data
            if (log.data_unused && log.data_unused.length > 0) {
                html += `<div class="log-details" style="color:#f59e0b"><strong>⚠️ Dados não utilizados:</strong>`;
                log.data_unused.slice(0, 5).forEach(f => { html += ` <code>${_escHtml(f)}</code>`; });
                if (log.data_unused.length > 5) html += ` +${log.data_unused.length - 5}`;
                html += `</div>`;
            }

            // Validation errors
            if (log.validation_errors && log.validation_errors.length > 0) {
                html += `<div class="log-details" style="color:#ef4444">`;
                log.validation_errors.forEach(v => { html += `<div>• ${_escHtml(v)}</div>`; });
                html += `</div>`;
            }

            // Screenshot (for stuck pages)
            if (log.screenshot_url) {
                html += `<img class="log-screenshot" src="${log.screenshot_url}" onclick="expandScreenshot('${log.screenshot_url}')" alt="Screenshot" loading="lazy">`;
            }

            html += `</div>`;
        }
    }

    html += `</div>`;
    $('logs-modal-body').innerHTML = html;
}

function closeLogsModal() {
    $('logs-modal').style.display = 'none';
}

function expandScreenshot(url) {
    $('screenshot-lightbox-img').src = url;
    $('screenshot-lightbox').classList.remove('hidden');
}

function showPageHtml(btn) {
    try {
        const encoded = btn.getAttribute('data-html');
        const html = decodeURIComponent(escape(atob(encoded)));
        $('html-viewer-body').textContent = html;
        $('html-viewer-modal').classList.remove('hidden');
    } catch (e) {
        toast('Erro ao decodificar HTML', 'error');
    }
}

function _escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
