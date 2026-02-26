// ============================================================
// DS160 EXPRESSO — Applicant Detail Page JS
// ============================================================

let currentApplicantId = null;

(async () => {
    const ok = await initAuth();
    if (!ok) return;
    renderLayout();

    // Get applicant ID from URL
    const params = new URLSearchParams(location.search);
    currentApplicantId = params.get('id');
    if (!currentApplicantId) { window.location.href = 'index.html'; return; }

    await openApplicantDetail(currentApplicantId);
    setupApplicantListeners();
    hideLoader();
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
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:13px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Mover todos:</span>
                <select onchange="if(this.value){moveAllPipeline('${id}',this.value);this.value=''}"
                    style="font-size:13px;padding:8px 14px;background:#fff;border:1px solid #d1d5db;border-radius:5px;color:#374151;cursor:pointer;outline:none;font-family:inherit;font-weight:500">
                    <option value="">Selecionar etapa...</option>
                    ${STAGE_ORDER.map(s => `<option value="${s}">${STAGES[s].label}</option>`).join('')}
                </select>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
                <div style="text-align:right">
                    <span style="font-size:20px;font-weight:800;color:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : 'var(--text-muted)'}">${doneCount}/${totalCount}</span>
                    <span style="font-size:10px;color:var(--text-muted);margin-left:4px">concluídos</span>
                </div>
                <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
                    <div style="width:${progressPercent}%;height:100%;background:${doneCount === totalCount && totalCount > 0 ? '#22c55e' : '#3b82f6'};border-radius:3px"></div>
                </div>
                <button onclick="showDeleteModal('${id}','${applicant.full_name.replace(/'/g, "\\\\'")}')" style="font-size:13px;padding:8px 14px;background:rgba(239,68,68,.06);color:#ef4444;border:1px solid rgba(239,68,68,.25);border-radius:5px;cursor:pointer;font-weight:500;font-family:inherit;transition:all .2s">Excluir</button>
            </div>
        </div>
    </div>

    <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:10px;font-weight:600">Processos (${totalCount})</h3>
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
            ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${pPrio.color}15;color:${pPrio.color};font-weight:700">${pPrio.icon} ${pPrio.label}</span>` : '';

        html += `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;${isDone ? 'opacity:.7;' : ''}${(p.fill_priority || 0) >= 3 ? 'border-left:3px solid #ef4444;' : (p.fill_priority || 0) >= 2 ? 'border-left:3px solid #f97316;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="openProcessModal('${p.id}')">
                <div>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-weight:700;font-size:14px">${p.full_name}</span>
                        ${appId ? `<span style="font-size:10px;color:var(--text-muted);background:var(--bg);padding:2px 6px;border-radius:4px;font-family:monospace">${appId}</span>` : ''}
                        ${pPrioBadge}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                        <span style="font-size:11px;color:var(--text-muted)">${roleLabel}${pPassport ? ' · ' + pPassport : ''}</span>
                        ${fillStatus !== '—' ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${fStage.color}15;color:${fStage.color};font-weight:600"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${fStage.color};margin-right:4px;vertical-align:middle"></span>${fStage.label}</span>` : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                    ${pApp ? `<button onclick="event.stopPropagation();viewAppDetails('${p.id}')" style="font-size:13px;padding:8px 14px;background:#fff;border:1px solid #d1d5db;border-radius:5px;cursor:pointer;color:#374151;font-weight:500;transition:all .2s;font-family:inherit">Detalhes</button>` : ''}
                    <select onclick="event.stopPropagation()" onchange="if(this.value!==''){setPriority('${p.id}',this.value,'${id}')}"
                        style="font-size:13px;padding:8px 14px;background:${pPrio.color}08;color:${pPrio.color};border:1px solid #d1d5db;border-radius:5px;cursor:pointer;outline:none;font-weight:500;font-family:inherit">
                        <option value="">${pPrio.icon} ${(p.fill_priority || 0) >= 1 ? pPrio.label : 'Prioridade'}</option>
                        <option value="1">📋 Normal</option>
                        <option value="2">⚡ Urgente</option>
                        <option value="3">🚨 Emergência</option>
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
    const { data: apps } = await sb.from('applications').select('id, fill_status').eq('applicant_id', applicantId);
    if (apps && apps.length > 0) {
        for (const app of apps) {
            if (app.fill_status === 'filled' || app.fill_status === 'error' || app.fill_status === 'needs_attention') {
                await sb.from('applications').update({
                    fill_status: 'pending', fill_error: null, fill_worker_id: null,
                    fill_started_at: null, fill_finished_at: null, retry_count: 0,
                    last_page: null, application_id: null, last_error_at: null
                }).eq('id', app.id);
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
    $('process-modal-sub').innerHTML = `<span style="background:${stage.color}18;color:${stage.color};padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600">${stage.label}</span>`;
    $('process-modal-iframe').src = `../ds160/index.html?id=${applicantId}`;
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
