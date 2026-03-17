// Queue Runner â€” Resilient automation with retry, backoff, and smart updates
function getFiller() {
    // Clear caches to pick up any code changes (modular architecture)
    const base = require('path').join(__dirname);
    const pagesBase = require('path').join(__dirname, '..', 'pages');
    Object.keys(require.cache).forEach(k => {
        if (k.startsWith(base) || k.startsWith(pagesBase)) delete require.cache[k];
    });
    return require('./filler');
}
const path = require('path');

const POLL_INTERVAL = 30; // 30 seconds fallback (Realtime handles instant detection)
const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [2 * 60, 4 * 60, 6 * 60, 8 * 60]; // 2min, 4min, 6min, 8min between retries
const GLOBAL_PAUSE = 15 * 60; // 15min pause after 3 consecutive global errors
const STALE_FILLING_TIMEOUT = 10 * 60; // 10min â€” if filling for longer, consider stale
const RE_QUEUE_DELAY = 15 * 60; // 15min â€” wait before retrying after max retries exhausted

class QueueRunner {
    constructor(supabase, captchaMode) {
        this.supabase = supabase;
        this.captchaMode = captchaMode || 'capmonster';
        this.running = false;
        this.companyId = null; // loaded on start â€” filters by organization
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this._emitter = null;
        this._countdownTimer = null;
        this._countdown = 0;
        this._skipWait = false;
        this.consecutiveErrors = 0; // global consecutive error count
        this._lastCleanup = 0; // timestamp of last periodic cleanup
    }

    async start(emitter) {
        this._emitter = emitter;
        this.running = true;

        // Load the company_id for the logged-in user
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            const { data: member } = await this.supabase
                .from('members')
                .select('company_id')
                .eq('user_id', user.id)
                .single();
            if (member) {
                this.companyId = member.company_id;
                console.log('[Queue] Filtering by organization:', this.companyId);
            }
        }

        // Realtime: instant detection when applicant moves to ds160 + todo
        this._realtimeChannel = this.supabase
            .channel('queue-trigger')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'applicants', filter: 'stage=eq.ds160' },
                (payload) => {
                    if (payload.new?.status === 'todo') {
                        console.log(`[DS160] âš¡ Realtime: nova solicitaÃ§Ã£o â†’ ${payload.new?.full_name || payload.new?.id}`);
                        this.triggerNow();
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log('[Queue] \u2705 Realtime connected â€” instant queue detection active');
            });

        this._loop();
    }

    async stop() {
        this.running = false;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
        if (this._realtimeChannel) {
            this.supabase.removeChannel(this._realtimeChannel);
        }
    }

    triggerNow() {
        // Called when user clicks "Verificar fila agora"
        console.log('[Queue] triggerNow() called');
        if (global.smartCheckForUpdates) global.smartCheckForUpdates();
        this._skipWait = true;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
        // Resolve the pending wait promise so the loop continues
        if (this._resolveWait) {
            this._resolveWait();
            this._resolveWait = null;
        }
    }

    emit(status) {
        if (this._emitter) this._emitter(status);
    }

    /**
     * Periodic cleanup — runs max once every 24h.
     * Removes local download backups older than 7 days.
     * Supabase Storage files are NOT deleted (referenced by DB).
     */
    async _periodicCleanup() {
        const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24h
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - this._lastCleanup < CLEANUP_INTERVAL) return;
        this._lastCleanup = Date.now();

        try {
            const fs = require('fs');
            const downloadsDir = path.join(__dirname, '..', 'downloads');
            if (!fs.existsSync(downloadsDir)) return;

            let removedDirs = 0;
            let removedFiles = 0;
            const entries = fs.readdirSync(downloadsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const dirPath = path.join(downloadsDir, entry.name);
                const stat = fs.statSync(dirPath);
                if (Date.now() - stat.mtimeMs > MAX_AGE) {
                    const files = fs.readdirSync(dirPath);
                    for (const f of files) {
                        fs.unlinkSync(path.join(dirPath, f));
                        removedFiles++;
                    }
                    fs.rmdirSync(dirPath);
                    removedDirs++;
                }
            }
            if (removedDirs > 0) {
                console.log(`[Queue] 🧹 Cleanup: ${removedDirs} folders, ${removedFiles} files removed (>7 days old)`);
            }
        } catch (e) { /* ignore cleanup errors */ }
    }

    // ==============================================================
    // MAIN LOOP
    // ==============================================================
    async _loop() {
        while (this.running) {
            try {
                // Smart update check before each cycle

                console.log('[Queue] Checking for items...');

                // 1. Fetch config
                const config = await this._getConfig();

                // 2. Claim next item (prioritize incomplete > queued)
                const app = await this._claimNext();

                if (!app) {
                    await this._periodicCleanup();
                    console.log('[Queue] Queue empty, waiting', POLL_INTERVAL, 'seconds');
                    this.emit({ type: 'queue-empty', nextCheck: POLL_INTERVAL });
                    await this._waitWithCountdown(POLL_INTERVAL);
                    continue;
                }

                console.log('[Queue] Found item:', app.id, '- claiming...');

                // 3. Fetch applicant data
                const applicant = await this._getApplicant(app.applicant_id);
                if (!applicant) {
                    const errMsg = 'Dados do solicitante nÃ£o encontrados';
                    await this._markError(app.id, errMsg, app.applicant_id);
                    await this._logError(app, null, errMsg, null, null, null);
                    continue;
                }

                // 4. Mark applicant as 'doing' (syncs with dashboard)
                await this.supabase.from('applicants').update({
                    status: 'doing',
                    updated_at: new Date().toISOString()
                }).eq('id', app.applicant_id);

                // 5. Fill with retry logic
                await this._fillWithRetry(app, applicant, config);

            } catch (e) {
                console.error('Queue loop error:', e);
                await this._logError(null, null, e.message, e.stack, null, null);
                this.emit({ type: 'error', applicantName: 'â€”', error: e.message });
                this.consecutiveErrors++;

                // BUG FIX: Se temos o applicant_id, marcar como fail no dashboard
                // Sem isso o solicitante ficava preso em 'doing' para sempre
                if (app?.applicant_id) {
                    await this.supabase.from('applicants').update({
                        status: 'failed',
                        updated_at: new Date().toISOString()
                    }).eq('id', app.applicant_id).catch(() => {});
                    console.log(`[Queue] âŒ Applicant ${app.applicant_id} marcado como failed (exception no loop)`);
                }

                if (this.consecutiveErrors >= 3) {
                    console.log(`[Queue] ${this.consecutiveErrors} consecutive errors â€” pausing ${GLOBAL_PAUSE / 60}min`);
                    this.emit({ type: 'paused', message: `Pausado: ${this.consecutiveErrors} erros consecutivos` });
                    await this._waitWithCountdown(GLOBAL_PAUSE);
                    this.consecutiveErrors = 0;
                }
            }

            if (this.running) await sleep(5000); // 5s before next item
        }
    }

    // ==============================================================
    // FILL WITH RETRY (up to MAX_RETRIES attempts) â€” ITERATIVE LOOP
    // Bug 3 fix: loop iterativo ao invÃ©s de recursÃ£o (evita stack overflow)
    // Bug 5 fix: verifica se page/browser estÃ£o vivos antes de reutilizar
    // ==============================================================
    async _fillWithRetry(app, applicant, config, existingBrowser, existingPage) {
        let currentRetry = (app.retry_count || 0);
        let currentBrowser = existingBrowser || null;
        let currentPage = existingPage || null;
        let currentApplicant = applicant;
        let currentConfig = config;
        let currentApp = app;

        while (currentRetry < MAX_RETRIES && this.running) {
            currentRetry++;

            this.emit({
                type: 'filling',
                applicantName: currentApplicant.full_name,
                page: currentApp.last_page ? `Retomando de ${currentApp.last_page}` : 'Iniciando...'
            });

            if (global.smartCheckForUpdates) global.smartCheckForUpdates();

            const captchaMode = currentConfig.captcha_mode || this.captchaMode || 'capmonster';
            let lastPage = currentApp.last_page || '';

            // Bug 5: Verificar se page/browser estÃ£o vivos antes de reutilizar
            if (currentPage) {
                try {
                    if (currentPage.isClosed()) {
                        console.log('[Queue] âš ï¸ Page morta â€” fechando browser, criando novo');
                        if (currentBrowser) await currentBrowser.close().catch(() => {});
                        currentBrowser = null;
                        currentPage = null;
                    }
                } catch {
                    console.log('[Queue] âš ï¸ Page check falhou â€” browser morto');
                    currentBrowser = null;
                    currentPage = null;
                }
            }

            // Hot-reload: recarrega filler para pegar mudanças em field-map
            const { fillApplication } = getFiller();

            // Cleanup old storage files for this applicant before new filling
            try {
                const folder = `ds160/${currentApplicant.id}`;
                const { data: oldFiles } = await this.supabase.storage.from('screenshots').list(folder);
                if (oldFiles && oldFiles.length > 0) {
                    const paths = oldFiles.map(f => `${folder}/${f.name}`);
                    await this.supabase.storage.from('screenshots').remove(paths);
                    console.log(`[Queue] 🧹 Storage cleanup: ${paths.length} old files removed`);
                }
            } catch (e) { /* ignore cleanup errors */ }

            const onAppId = async (appId) => {
                try {
                    const updateData = { application_id: appId };
                    // Also persist security_answer if set by security-question-page
                    if (currentApp.security_answer) {
                        updateData.security_answer = currentApp.security_answer;
                    }
                    await this.supabase.from('applications').update(updateData).eq('id', currentApp.id);
                    console.log(`[Queue] 🆔 Application ID saved to DB: ${appId}${currentApp.security_answer ? ' + security_answer' : ''}`);
                } catch (e) { console.warn('[Queue] Failed to persist app_id:', e.message); }
            };

            const result = await fillApplication(currentApplicant, currentApp, onAppId, currentConfig, captchaMode, (page) => {
                lastPage = page;
                this.emit({ type: 'filling', applicantName: currentApplicant.full_name, page });
            }, async (pageStats) => {
                try {
                    await this.supabase.from('fill_logs').insert({
                        application_id: currentApp.id,
                        applicant_id: currentApp.applicant_id,
                        page_name: pageStats.pageName || 'Unknown',
                        fields_filled: pageStats.fieldsFilled || 0,
                        fields_total: pageStats.fieldsTotal || 0,
                        fields_unmatched: pageStats.emptyFields?.length > 0 ? pageStats.emptyFields : null,
                        validation_errors: pageStats.validationErrors?.length > 0 ? pageStats.validationErrors : null,
                        navigated: pageStats.navigated !== false,
                        attempts: pageStats.attempt || pageStats.passes || 1,
                        duration_ms: Math.round((pageStats.elapsed || 0) * 1000),
                        worker_id: this.workerId,
                    });
                } catch (e) { console.warn('[Queue] fill_log insert failed:', e.message); }
            }, currentBrowser, currentPage);

            // ✅ SUCCESS
            if (result.success) {
                // Upload documents to Supabase Storage
                const docUrls = {};
                if (result.documents && result.documents.length > 0) {
                    console.log(`[Queue] 📤 Uploading ${result.documents.length} documents to storage...`);
                    for (const doc of result.documents) {
                        try {
                            const { data: upload, error: uploadErr } = await this.supabase.storage
                                .from('screenshots')
                                .upload(doc.filename, doc.buffer, { 
                                    contentType: doc.contentType, 
                                    upsert: true 
                                });
                            if (upload && !uploadErr) {
                                const { data: pub } = this.supabase.storage
                                    .from('screenshots')
                                    .getPublicUrl(doc.filename);
                                docUrls[doc.type] = pub?.publicUrl || null;
                                console.log(`[Queue] ✅ ${doc.type}: ${doc.filename} (${(doc.buffer.length / 1024).toFixed(0)}KB)`);
                            } else {
                                console.warn(`[Queue] ⚠️ Upload ${doc.type} failed:`, uploadErr?.message);
                            }
                        } catch (e) { console.warn(`[Queue] Upload ${doc.type} error:`, e.message); }
                    }

                    // Save document URLs to applications table
                    if (Object.keys(docUrls).length > 0) {
                        try {
                            await this.supabase.from('applications').update({
                                ds160_pdf_url: docUrls.application || null,
                                confirmation_pdf_url: docUrls.confirmation || null,
                                confirmation_screenshot_url: docUrls.screenshot || null,
                            }).eq('id', currentApp.id);
                            console.log(`[Queue] 💾 Document URLs saved to DB`);
                        } catch (e) {
                            console.warn('[Queue] Doc URLs save failed:', e.message);
                        }
                    }

                    // Cleanup local files after successful upload
                    try {
                        const path = require('path');
                        const fs = require('fs');
                        const localDir = path.join(__dirname, '..', 'downloads', currentApplicant.id);
                        if (fs.existsSync(localDir)) {
                            const files = fs.readdirSync(localDir);
                            for (const f of files) {
                                fs.unlinkSync(path.join(localDir, f));
                            }
                            fs.rmdirSync(localDir);
                            console.log(`[Queue] 🧹 Local cleanup: ${files.length} files removed`);
                        }
                    } catch (e) { /* ignore cleanup errors */ }
                }

                if (result.browser) await result.browser.close().catch(() => {});
                await this._markDone(currentApp.id, result.applicationId, lastPage);
                this.emit({ type: 'done', applicantName: currentApplicant.full_name });
                this.consecutiveErrors = 0;
                return;
            }

            // âš ï¸ MISSING DATA â†’ error imediato
            if (result.cause === 'missing_data') {
                if (result.browser) await result.browser.close().catch(() => {});
                const missingList = result.missingFields?.join(', ') || 'campos nÃ£o identificados';
                await this._logError(currentApp, currentApplicant, result.error, null, 'Validation', null, 'missing_data', null, result.missingFields?.map(f => `Campo faltante: ${f}`));
                await this._markNeedsAttention(currentApp.id, `Dados incompletos: ${missingList}`);
                await this.supabase.from('applicants').update({
                    status: 'error', updated_at: new Date().toISOString()
                }).eq('id', currentApp.applicant_id);
                console.log(`[DS160] âŒ ERROR: ${currentApplicant.full_name} â€” dados incompletos`);
                this.emit({ type: 'error', applicantName: currentApplicant.full_name, error: `Dados incompletos: ${missingList}` });
                return;
            }

            // âŒ ERROR â€” capturar screenshot
            console.error(`[Queue] Error on ${currentApplicant.full_name} (attempt ${currentRetry}):`, result.error);

            let screenshotUrl = null;
            let pageHtml = null;
            const pageAlive = result.activePage && !result.activePage.isClosed?.();
            if (pageAlive) {
                try { pageHtml = await result.activePage.content().catch(() => null); } catch {}
                try {
                    const buf = await result.activePage.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
                    const filename = `errors/${currentApp.id}_${Date.now()}.jpg`;
                    const { data: upload, error: uploadErr } = await this.supabase.storage
                        .from('screenshots').upload(filename, buf, { contentType: 'image/jpeg', upsert: false });
                    if (upload && !uploadErr) {
                        const { data: pub } = this.supabase.storage.from('screenshots').getPublicUrl(filename);
                        screenshotUrl = pub?.publicUrl || null;
                    }
                } catch (e) { console.warn('[Queue] Screenshot failed:', e.message); }
            }

            await this._logError(currentApp, currentApplicant, result.error, result.stack, lastPage, result.field, result.cause, screenshotUrl, result.validationErrors, pageHtml);
            this.consecutiveErrors++;

            // ── CLASSIFY ERROR ──
            const dataErrorCauses = ['missing_data', 'validation_error', 'select_mismatch', 'invalid_field_value'];
            const retryableCauses = ['captcha_failed', 'network_error', 'session_expired', 'browser_closed', 'postback_stuck', 'page_stuck'];
            const hasValidationErrors = result.validationErrors && result.validationErrors.length > 0;
            const isDataError = dataErrorCauses.includes(result.cause) || hasValidationErrors;
            const isRetryable = retryableCauses.includes(result.cause) && !hasValidationErrors;

            const errDetail = hasValidationErrors ? result.validationErrors.join('; ') : result.error;
            await this._updateRetry(currentApp.id, currentRetry, lastPage, errDetail);

            // ── DATA ERROR → stop immediately, no retry ──
            // Erros de dados (nome inválido, campo rejeitado pelo DS-160) NÃO resolvem com retry.
            // O usuário precisa corrigir os dados no formulário clone.
            if (isDataError) {
                if (result.browser) await result.browser.close().catch(() => {});
                await this._markNeedsAttention(currentApp.id, errDetail);
                await this.supabase.from('applicants').update({
                    status: 'error', updated_at: new Date().toISOString()
                }).eq('id', currentApp.applicant_id);
                console.log(`[DS160] ❌ DATA ERROR: ${currentApplicant.full_name} — ${errDetail.slice(0, 120)}`);
                console.log(`[DS160] ⏸️  Aguardando correção dos dados pelo usuário`);
                this.emit({ type: 'error', applicantName: currentApplicant.full_name, error: `Erro de dados: ${errDetail}` });
                return;
            }

            // ── FATAL → stop immediately ──
            const fatalCauses = ['browser_closed'];
            if (fatalCauses.includes(result.cause)) {
                if (result.browser) await result.browser.close().catch(() => {});
                await this._markSystemError(currentApp.id, result.error, currentApp.applicant_id);
                console.log(`[DS160] 💥 FAIL: ${currentApplicant.full_name} — ${result.cause}`);
                this.emit({ type: 'error', applicantName: currentApplicant.full_name, error: `${result.error} (${result.cause})` });
                return;
            }

            // ── MAX RETRIES → stop ──
            if (currentRetry >= MAX_RETRIES) {
                if (result.browser) await result.browser.close().catch(() => {});
                await this._reQueue(currentApp.id, result.error);
                console.log(`[DS160] ♻️ ${currentApplicant.full_name} → re-queued (${currentRetry}/${MAX_RETRIES})`);
                this.emit({ type: 'error', applicantName: currentApplicant.full_name, error: `${errDetail} (${currentRetry}/${MAX_RETRIES})` });
                return;
            }

            // —— RETRY: wait, re-read data, loop again ——
            const isCaptchaRetry = result.cause === 'captcha_failed';
            const delay = isCaptchaRetry ? 5 : (isDataError ? 30 : (BACKOFF_DELAYS[currentRetry - 1] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1]));
            const retryType = isCaptchaRetry ? 'captcha-reload' : (isDataError ? 'hot-reload' : 'backoff');
            console.log(`[DS160] ♻️ Retry #${currentRetry} (${retryType}) — aguardando ${delay}s`);
            this.emit({
                type: 'retrying', applicantName: currentApplicant.full_name,
                retryNumber: currentRetry, delay,
                error: `${retryType} retry: ${errDetail.slice(0, 100)}`
            });

            if (global.smartCheckForUpdates) global.smartCheckForUpdates();
            await this._waitWithCountdown(delay);

            if (!this.running) {
                if (result.browser) await result.browser.close().catch(() => {});
                return;
            }

            // Re-read fresh data
            const freshApplicant = await this._getApplicant(currentApp.applicant_id);
            if (!freshApplicant) {
                if (result.browser) await result.browser.close().catch(() => {});
                return;
            }

            // Carry browser/page for next iteration
            // ⚠️ Se Session expired/timeout → FECHAR browser para criar sessão limpa
            const isSessionExpired = (result.cause === 'timeout' || /session.*expired|timed out/i.test(result.error || ''));
            if (isSessionExpired && result.browser) {
                console.log('[Queue] 🔄 Session expired → fechando browser para criar sessão limpa no retry');
                await result.browser.close().catch(() => {});
                currentBrowser = null;
                currentPage = null;
            } else {
                currentBrowser = result.browser || null;
                currentPage = result.activePage || null;
            }
            currentApplicant = freshApplicant;
            currentConfig = await this._getConfig();
            currentApp = { ...currentApp, retry_count: currentRetry, last_page: lastPage };
        }

        // Safety net
        if (currentBrowser) await currentBrowser.close().catch(() => {});
    }

    // ==============================================================
    // COUNTDOWN TIMER (interruptible)
    // ==============================================================
    _waitWithCountdown(seconds) {
        return new Promise(resolve => {
            this._countdown = seconds;
            this._skipWait = false;
            this._resolveWait = resolve; // Store so triggerNow() can resolve

            this._countdownTimer = setInterval(() => {
                if (!this.running || this._skipWait) {
                    clearInterval(this._countdownTimer);
                    this._countdownTimer = null;
                    this._skipWait = false;
                    resolve();
                    return;
                }

                this._countdown--;
                const mins = Math.floor(this._countdown / 60);
                const secs = this._countdown % 60;
                const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                this.emit({
                    type: 'waiting',
                    countdown: this._countdown,
                    display: display,
                    message: `PrÃ³xima verificaÃ§Ã£o em ${display}`
                });

                if (this._countdown <= 0) {
                    clearInterval(this._countdownTimer);
                    this._countdownTimer = null;
                    resolve();
                }
            }, 1000);
        });
    }

    // ==============================================================
    // CONFIG
    // ==============================================================
    async _getConfig() {
        const { data } = await this.supabase
            .from('automation_config')
            .select('*')
            .single();
        const config = data || {};

        // Merge default settings (security_answer, security_question, etc.)
        const { data: settings } = await this.supabase
            .from('settings')
            .select('key_name, key_value');
        if (settings) {
            settings.forEach(s => { config[s.key_name] = s.key_value; });
        }
        return config;
    }

    // CLAIM / QUERY (filtered by organization)
    // Order: sort_order ASC (drag & drop backlog)
    // Resume-first: applicants with existing application_id come first
    // Auto-reset: if application is 'filled', reset to 'pending'
    // Auto-create: if no application exists, create one
    // ==============================================================
    async _claimNext() {
        // Get applicant IDs belonging to this organization
        let applicantIds = null;
        if (this.companyId) {
            const { data: orgApplicants } = await this.supabase
                .from('applicants')
                .select('id')
                .eq('company_id', this.companyId);
            applicantIds = (orgApplicants || []).map(a => a.id);
            if (applicantIds.length === 0) return null;
        }

        // 0. Recovery: reset stale fills (>10min, stuck from crashes)
        const staleThreshold = new Date(Date.now() - STALE_FILLING_TIMEOUT * 1000).toISOString();
        let staleQuery = this.supabase
            .from('applications')
            .select('id')
            .eq('fill_status', 'filling')
            .neq('fill_worker_id', this.workerId)
            .lt('fill_started_at', staleThreshold);
        if (applicantIds) staleQuery = staleQuery.in('applicant_id', applicantIds);
        const { data: stale } = await staleQuery;
        if (stale && stale.length > 0) {
            for (const s of stale) {
                await this.supabase.from('applications').update({
                    fill_status: 'pending',
                    fill_worker_id: null,
                }).eq('id', s.id);
                console.log(`[Queue] Recovered stale: ${s.id}`);
            }
        }

        // 0b. Recovery: reset orphaned fills (filling but no started_at â€” crashed before start)
        let orphanQuery = this.supabase
            .from('applications')
            .select('id')
            .eq('fill_status', 'filling')
            .is('fill_started_at', null);
        if (applicantIds) orphanQuery = orphanQuery.in('applicant_id', applicantIds);
        const { data: orphans } = await orphanQuery;
        if (orphans && orphans.length > 0) {
            for (const o of orphans) {
                await this.supabase.from('applications').update({
                    fill_status: 'pending',
                    fill_worker_id: null,
                }).eq('id', o.id);
                console.log(`[Queue] Recovered orphan: ${o.id}`);
            }
        }

        // 1. PRIORITY: ds160 applicants with fill_status != filled/pending (resume incomplete)
        //    These are applicants being actively processed (filling, error, needs_attention)
        let resumeQuery = this.supabase
            .from('applicants')
            .select('id')
            .eq('stage', 'ds160')
            .in('status', ['todo', 'doing']);
        if (applicantIds) resumeQuery = resumeQuery.in('id', applicantIds);
        const { data: resumeApplicants } = await resumeQuery;

        if (resumeApplicants && resumeApplicants.length > 0) {
            const resumeIds = resumeApplicants.map(a => a.id);
            const { data: resumeApps } = await this.supabase
                .from('applications')
                .select('*')
                .in('applicant_id', resumeIds)
                .in('fill_status', ['filling', 'error', 'needs_attention', 'queued', 'pending'])
                .limit(1);

            if (resumeApps && resumeApps.length > 0) {
                const app = resumeApps[0];
                await this.supabase.from('applications').update({
                    fill_status: 'filling',
                    fill_started_at: new Date().toISOString(),
                    fill_worker_id: this.workerId
                }).eq('id', app.id);
                console.log('[Queue] Resuming:', app.id);
                return { ...app, fill_status: 'filling' };
            }
        }

        // 2. DS160 TODO: ordered by sort_order (drag & drop backlog)
        //    Resume-first: applicants with existing application_id come first
        let approvedQuery = this.supabase
            .from('applicants')
            .select('id, sort_order')
            .eq('stage', 'ds160')
            .in('status', ['todo', 'retry'])
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: true });
        if (applicantIds) approvedQuery = approvedQuery.in('id', applicantIds);
        const { data: approvedApplicants, error: approvedErr } = await approvedQuery.limit(20);

        
        if (!approvedApplicants || approvedApplicants.length === 0) return null;

        // Check which candidates have existing application_id (resume-first)
        const candidateIds = approvedApplicants.map(a => a.id);
        const { data: appsWithId } = await this.supabase
            .from('applications')
            .select('applicant_id')
            .in('applicant_id', candidateIds)
            .not('application_id', 'is', null)
            .eq('fill_status', 'pending');

        const resumeSet = new Set((appsWithId || []).map(a => a.applicant_id));

        // Sorted by sort_order from DB query (drag & drop backlog)
        const sorted = [
            ...approvedApplicants.filter(a => resumeSet.has(a.id)),
            ...approvedApplicants.filter(a => !resumeSet.has(a.id))
        ];

        // Try each applicant (resume-first, then sort_order) until one is claimable
        for (const candidate of sorted) {
            const result = await this._ensureAndClaimApp(candidate.id);
            if (result) {
                if (resumeSet.has(candidate.id)) {
                    console.log(`[Queue] ðŸ”„ Priorizando retomada: ${candidate.id} (jÃ¡ tem application_id)`);
                }
                return result;
            }
        }

        return null;
    }

    // ==============================================================
    // ENSURE APPLICATION EXISTS + CLAIM
    // Auto-reset filled applications, auto-create missing ones
    // ==============================================================
    async _ensureAndClaimApp(applicantId) {
        // Find ALL applications for this applicant
        const { data: allApps } = await this.supabase
            .from('applications')
            .select('*')
            .eq('applicant_id', applicantId)
            .order('created_at', { ascending: false })
            .limit(1);

        let app = allApps && allApps[0] ? allApps[0] : null;

        if (!app) {
            // No application exists â€” create one
            console.log(`[Queue] No application for ${applicantId} â€” creating`);
            const { data: newApp, error: createErr } = await this.supabase
                .from('applications')
                .insert({ applicant_id: applicantId, fill_status: 'pending' })
                .select()
                .single();
            if (createErr) {
                console.error('[Queue] Failed to create application:', createErr.message);
                return null;
            }
            app = newApp;
        } else if (app.fill_status === 'filled') {
            // Application exists but was already filled â€” auto-reset for re-fill
            console.log(`[Queue] Auto-resetting filled application ${app.id} for re-fill`);
            const { error: resetErr } = await this.supabase.from('applications').update({
                fill_status: 'pending',
                fill_error: null,
                fill_worker_id: null,
                fill_started_at: null,
                fill_finished_at: null,
                retry_count: 0,
                last_page: null,
                // Bug 4 fix: manter application_id para retomada do mesmo DS-160
                last_error_at: null
            }).eq('id', app.id);
            if (resetErr) {
                console.error('[Queue] Failed to reset application:', resetErr.message);
                return null;
            }
            app.fill_status = 'pending';
        } else if (app.fill_status === 'filling') {
            // Already being filled by another worker â€” skip
            return null;
        } else if (app.fill_status === 'system_error') {
            // System error â€” requires dev/AI fix, skip until manually released
            return null;
        } else if (app.fill_status === 'queued' || app.fill_status === 'needs_attention' || app.fill_status === 'error') {
            // Reset to pending so it can be claimed
            console.log(`[Queue] Resetting ${app.fill_status} application ${app.id} to pending`);
            const { error: resetErr } = await this.supabase.from('applications').update({
                fill_status: 'pending',
                fill_error: null,
                fill_worker_id: null,
                fill_started_at: null,
                retry_count: 0,
                last_error_at: null
            }).eq('id', app.id);
            if (resetErr) {
                console.error('[Queue] Failed to reset application:', resetErr.message);
                return null;
            }
            app.fill_status = 'pending';
        }

        // Claim: use RPC (SECURITY DEFINER, bypasses RLS)
        const { data: claimed, error: claimErr } = await this.supabase
            .rpc('claim_application', { app_id: app.id, worker: this.workerId });

        if (!claimed || claimErr) {
            console.warn(`[Queue] Claim failed for ${app.id}: ${claimErr?.message || 'already claimed'}`);
            return null;
        }

        // Pipeline stays 'approved' during filling (fill_status shows progress)
                console.log(`[Queue] Claimed ${app.id} -> filling [sort:${app.sort_order || '?'}]`);

        return { ...claimed, fill_status: 'filling' };
    }

    async _getApp(appId) {
        const { data } = await this.supabase
            .from('applications')
            .select('*')
            .eq('id', appId)
            .single();
        return data;
    }

    async _getApplicant(applicantId) {
        const { data } = await this.supabase
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single();
        return data;
    }

    // ==============================================================
    // STATUS UPDATES
    // ==============================================================
    async _markDone(appId, applicationId, lastPage) {
        // Update application status
        const { data: appData } = await this.supabase
            .from('applications')
            .update({
                fill_status: 'filled',
                fill_finished_at: new Date().toISOString(),
                application_id: applicationId || null,
                last_page: lastPage || null,
                fill_error: null
            })
            .eq('id', appId)
            .select('applicant_id')
            .single();

        if (!appData) return;

        const applicantId = appData.applicant_id;

        // Fetch the applicant to check for group
        const { data: applicant } = await this.supabase
            .from('applicants')
            .select('id, group_id, stage')
            .eq('id', applicantId)
            .single();

        if (!applicant) return;

        if (applicant.group_id) {
            // ── GROUP: mark individual as done, check if all group members finished ──
            await this.supabase
                .from('applicants')
                .update({ status: 'done', updated_at: new Date().toISOString() })
                .eq('id', applicantId);

            // Check all group members in ds160 stage
            const { data: groupMembers } = await this.supabase
                .from('applicants')
                .select('id, status')
                .eq('group_id', applicant.group_id)
                .eq('stage', 'ds160');

            const allDone = groupMembers && groupMembers.every(m => m.status === 'done' || m.id === applicantId);

            if (allDone) {
                // All done → advance entire group to payment
                await this.supabase
                    .from('applicants')
                    .update({ stage: 'payment', status: 'todo', updated_at: new Date().toISOString() })
                    .eq('group_id', applicant.group_id)
                    .eq('stage', 'ds160');
                console.log(`[DS160] ✅ GROUP DONE: ${applicant.group_id} → all members advancing to payment`);
            } else {
                const doneCount = groupMembers.filter(m => m.status === 'done' || m.id === applicantId).length;
                console.log(`[DS160] ✅ DONE: ${applicantId} (group ${applicant.group_id}: ${doneCount}/${groupMembers.length} done)`);
            }
        } else {
            // ── SOLO: advance immediately ──
            await this.supabase
                .from('applicants')
                .update({ status: 'todo', stage: 'payment', updated_at: new Date().toISOString() })
                .eq('id', applicantId);
            console.log(`[DS160] ✅ DONE: ${applicantId} → advancing to payment`);
        }
    }

    async _markError(appId, errMsg, applicantId) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'error',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);

        // BUG FIX: TambÃ©m atualizar applicants.status para refletir no dashboard
        if (applicantId) {
            await this.supabase.from('applicants').update({
                status: 'error',
                updated_at: new Date().toISOString()
            }).eq('id', applicantId);
        }
    }

    async _markNeedsAttention(appId, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'needs_attention',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
    }

    // System error â€” requires dev fix, software will NOT retry until manually released
        async _markSystemError(appId, errMsg, applicantId) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'system_error',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);

                // Sync applicant status to 'failed' (technical failure, dev resolves)
        if (applicantId) {
            await this.supabase.from('applicants').update({
                status: 'failed',
                updated_at: new Date().toISOString()
            }).eq('id', applicantId);
        }
        console.log(`[DS160] ðŸ’¥ FAIL: ${appId} â€” priority set to retry, awaiting dev fix`);
    }

    // Re-queue: reset application + set applicant status to 'retry'
    async _reQueue(appId, errMsg) {
        const { data: appData } = await this.supabase
            .from('applications')
            .update({
                fill_status: 'pending',
                fill_worker_id: null,
                retry_count: 0,
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId)
            .select('applicant_id')
            .single();

        // Sync applicant status to 'retry' (will be picked up again by sort_order)
        if (appData?.applicant_id) {
            await this.supabase.from('applicants').update({
                status: 'retry',
                updated_at: new Date().toISOString()
            }).eq('id', appData.applicant_id);
        }
        console.log(`[Queue] Re-queued ${appId} with status=retry`);
    }

    async _updateRetry(appId, retryCount, lastPage, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                retry_count: retryCount,
                last_page: lastPage || null,
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
    }

    // ==============================================================
    // ERROR LOGGING (to Supabase for developer monitoring)
    // ==============================================================
    async _logError(app, applicant, errorMessage, errorStack, pageName, fieldName, errorCause, screenshotUrl, validationErrors, pageHtml) {
        try {
            await this.supabase
                .from('error_logs')
                .insert({
                    worker_id: this.workerId,
                    application_id: app?.id || null,
                    applicant_name: (typeof applicant === 'string') ? applicant : (applicant?.full_name || null),
                    error_message: errorMessage,
                    error_stack: errorStack || null,
                    page_name: pageName || null,
                    retry_number: app?.retry_count ? (app.retry_count + 1) : 1,
                    software_version: global.softwareVersion || 'dev',
                    field_name: fieldName || null,
                    error_cause: errorCause || 'unknown',
                    screenshot_url: screenshotUrl || null,
                    validation_errors: validationErrors && validationErrors.length > 0 ? validationErrors : null,
                    user_id: (typeof applicant === 'object') ? (applicant?.user_id || null) : null,
                    company_id: (typeof applicant === 'object') ? (applicant?.company_id || null) : null,
                    page_html: pageHtml || null
                });
        } catch (e) {
            console.warn('Failed to log error to Supabase:', e.message);
        }
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { QueueRunner };
