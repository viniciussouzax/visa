// Queue Runner — Resilient automation with retry, backoff, and smart updates
const { hotRequire } = require('./hot-reload');
function getFiller() {
    // Clear field-map cache too (indirect dependency of filler)
    const fieldMapPath = require.resolve('./field-map');
    delete require.cache[fieldMapPath];
    return hotRequire('filler.js');
}
const path = require('path');

const POLL_INTERVAL = 1800; // 30 minutes between checks
const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [2 * 60, 4 * 60, 6 * 60, 8 * 60]; // 2min, 4min, 6min, 8min between retries
const GLOBAL_PAUSE = 15 * 60; // 15min pause after 3 consecutive global errors
const STALE_FILLING_TIMEOUT = 10 * 60; // 10min — if filling for longer, consider stale
const RE_QUEUE_DELAY = 15 * 60; // 15min — wait before retrying after max retries exhausted

class QueueRunner {
    constructor(supabase, captchaMode) {
        this.supabase = supabase;
        this.captchaMode = captchaMode || 'capmonster';
        this.running = false;
        this.companyId = null; // loaded on start — filters by organization
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this._emitter = null;
        this._countdownTimer = null;
        this._countdown = 0;
        this._skipWait = false;
        this.consecutiveErrors = 0; // global consecutive error count
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

        this._loop();
    }

    async stop() {
        this.running = false;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
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

    // ==============================================================
    // MAIN LOOP
    // ==============================================================
    async _loop() {
        while (this.running) {
            try {
                // Smart update check before each cycle
                if (global.smartCheckForUpdates) global.smartCheckForUpdates();

                console.log('[Queue] Checking for items...');

                // 1. Fetch config
                const config = await this._getConfig();

                // 2. Claim next item (prioritize incomplete > queued)
                const app = await this._claimNext();

                if (!app) {
                    console.log('[Queue] Queue empty, waiting', POLL_INTERVAL, 'seconds');
                    this.emit({ type: 'queue-empty', nextCheck: POLL_INTERVAL });
                    await this._waitWithCountdown(POLL_INTERVAL);
                    continue;
                }

                console.log('[Queue] Found item:', app.id, '- claiming...');

                // 3. Fetch applicant data
                const applicant = await this._getApplicant(app.applicant_id);
                if (!applicant) {
                    const errMsg = 'Dados do solicitante não encontrados';
                    await this._markError(app.id, errMsg);
                    await this._logError(app, null, errMsg, null, null, null);
                    continue;
                }

                // 4. Fill with retry logic
                await this._fillWithRetry(app, applicant, config);

            } catch (e) {
                console.error('Queue loop error:', e);
                await this._logError(null, null, e.message, e.stack, null, null);
                this.emit({ type: 'error', applicantName: '—', error: e.message });
                this.consecutiveErrors++;

                if (this.consecutiveErrors >= 3) {
                    console.log(`[Queue] ${this.consecutiveErrors} consecutive errors — pausing ${GLOBAL_PAUSE / 60}min`);
                    this.emit({ type: 'paused', message: `Pausado: ${this.consecutiveErrors} erros consecutivos` });
                    if (global.smartCheckForUpdates) global.smartCheckForUpdates();
                    await this._waitWithCountdown(GLOBAL_PAUSE);
                    this.consecutiveErrors = 0;
                }
            }

            if (this.running) await sleep(5000); // 5s before next item
        }
    }

    // ==============================================================
    // FILL WITH RETRY (up to MAX_RETRIES attempts)
    // ==============================================================
    async _fillWithRetry(app, applicant, config, existingBrowser, existingPage) {
        const currentRetry = (app.retry_count || 0) + 1;

        this.emit({
            type: 'filling',
            applicantName: applicant.full_name,
            page: app.last_page ? `Retomando de ${app.last_page}` : 'Iniciando...'
        });

        // Smart update check before fill
        if (global.smartCheckForUpdates) global.smartCheckForUpdates();

        // Determine captcha mode from config
        const captchaMode = config.captcha_mode || this.captchaMode || 'capmonster';

        let lastPage = app.last_page || '';
        const { fillApplication } = getFiller();
        // P6: Persist application_id to DB immediately when captured
        const onAppId = async (appId) => {
            try {
                await this.supabase.from('applications').update({ application_id: appId }).eq('id', app.id);
                console.log(`[Queue] 🆔 Application ID saved to DB: ${appId}`);
            } catch (e) { console.warn('[Queue] Failed to persist app_id:', e.message); }
        };
        const result = await fillApplication(applicant, app, onAppId, config, captchaMode, (page) => {
            lastPage = page;
            this.emit({ type: 'filling', applicantName: applicant.full_name, page });
        }, existingBrowser, existingPage);

        if (result.success) {
            // ✅ Success — close browser, reset counters
            if (result.browser) await result.browser.close().catch(() => { });
            await this._markDone(app.id, result.applicationId, lastPage);
            this.emit({ type: 'done', applicantName: applicant.full_name });
            this.consecutiveErrors = 0;
            return;
        }
        // ⚠️ Missing data — close browser, re-queue (data may be corrected)
        if (result.cause === 'missing_data') {
            if (result.browser) await result.browser.close().catch(() => { });
            console.warn(`[Queue] ⚠️ ${applicant.full_name}: dados faltantes — ${result.error}`);
            await this._logError(app, applicant, result.error, null, 'Validation', null, 'missing_data', null, result.missingFields?.map(f => `Campo faltante: ${f}`));
            await this._reQueue(app.id, result.error);
            this.emit({
                type: 'error',
                applicantName: applicant.full_name,
                error: `Dados incompletos: ${result.missingFields?.join(', ')} — tentará novamente em ${RE_QUEUE_DELAY / 60}min`
            });
            return;
        }

        // ❌ Error — capture screenshot but DON'T close browser yet
        console.error(`[Queue] Error on ${applicant.full_name} (attempt ${currentRetry}):`, result.error);

        let screenshotUrl = null;
        let pageHtml = null;
        if (result.activePage) {
            try {
                pageHtml = await result.activePage.content().catch(() => null);
            } catch { }
            try {
                const buf = await result.activePage.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
                const filename = `errors/${app.id}_${Date.now()}.jpg`;
                const { data: upload, error: uploadErr } = await this.supabase.storage
                    .from('screenshots')
                    .upload(filename, buf, { contentType: 'image/jpeg', upsert: false });
                if (upload && !uploadErr) {
                    const { data: pub } = this.supabase.storage
                        .from('screenshots')
                        .getPublicUrl(filename);
                    screenshotUrl = pub?.publicUrl || null;
                    console.log(`[Queue] Screenshot saved: ${screenshotUrl}`);
                } else {
                    console.warn('[Queue] Screenshot upload failed:', uploadErr?.message);
                }
            } catch (e) {
                console.warn('[Queue] Screenshot capture failed:', e.message);
            }
        }

        await this._logError(app, applicant, result.error, result.stack, lastPage, result.field, result.cause, screenshotUrl, result.validationErrors, pageHtml);
        await this._updateRetry(app.id, currentRetry, lastPage, result.error);

        this.consecutiveErrors++;

        // Fatal errors — close browser, no retry possible
        const fatalCauses = ['browser_closed', 'network_error'];
        if (fatalCauses.includes(result.cause) || currentRetry >= MAX_RETRIES) {
            if (result.browser) await result.browser.close().catch(() => { });

            if (currentRetry >= MAX_RETRIES) {
                await this._reQueue(app.id, result.error);
                this.emit({
                    type: 'error',
                    applicantName: applicant.full_name,
                    error: `${result.error} (${MAX_RETRIES} tentativas — reagendado)`
                });
            } else {
                this.emit({
                    type: 'error',
                    applicantName: applicant.full_name,
                    error: `${result.error} (${result.cause})`
                });
            }
            return;
        }

        // ⏳ Retryable error — keep browser open, backoff then retry with SAME browser
        const delay = BACKOFF_DELAYS[currentRetry - 1] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
        this.emit({
            type: 'retrying',
            applicantName: applicant.full_name,
            retryNumber: currentRetry,
            delay: delay,
            error: result.error
        });

        if (global.smartCheckForUpdates) global.smartCheckForUpdates();
        await this._waitWithCountdown(delay);

        // Re-claim the same app and retry — PASS BROWSER so it's reused
        if (this.running) {
            const refreshedApp = await this._getApp(app.id);
            if (refreshedApp && refreshedApp.fill_status === 'filling') {
                // Re-fetch applicant data (user may have corrected data between retries)
                const freshApplicant = await this._getApplicant(refreshedApp.applicant_id) || applicant;
                const dataChanged = JSON.stringify(freshApplicant.data) !== JSON.stringify(applicant.data);
                console.log(`[Queue] Re-fetched applicant data for retry — ${dataChanged ? '📝 DADOS ATUALIZADOS' : '♻️ dados iguais'} (${freshApplicant.full_name}, updated_at: ${freshApplicant.updated_at || 'N/A'})`);
                await this._fillWithRetry(refreshedApp, freshApplicant, await this._getConfig(), result.browser, result.activePage);
            } else {
                // App status changed — close browser
                if (result.browser) await result.browser.close().catch(() => { });
            }
        } else {
            if (result.browser) await result.browser.close().catch(() => { });
        }
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
                const display = mins > 0 ? `${mins}m${secs.toString().padStart(2, '0')}s` : `${secs}s`;
                this.emit({
                    type: 'waiting',
                    countdown: this._countdown,
                    display: display,
                    message: `Próxima verificação em ${display}`
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

    // ==============================================================
    // CLAIM / QUERY (filtered by organization)
    // Priority order: emergency (3) > urgent (2) > normal (1/0)
    // Within same priority: sort_order ASC, updated_at ASC
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

        // 1. PRIORITY: applicants with pipeline_status='doing' (resume incomplete)
        let doingQuery = this.supabase
            .from('applicants')
            .select('id')
            .eq('pipeline_status', 'doing');
        if (applicantIds) doingQuery = doingQuery.in('id', applicantIds);
        const { data: doingApplicants } = await doingQuery;

        if (doingApplicants && doingApplicants.length > 0) {
            const doingIds = doingApplicants.map(a => a.id);
            const { data: doingApps } = await this.supabase
                .from('applications')
                .select('*')
                .in('applicant_id', doingIds)
                .neq('fill_status', 'filled')
                .limit(1);

            if (doingApps && doingApps.length > 0) {
                const app = doingApps[0];
                await this.supabase.from('applications').update({
                    fill_status: 'filling',
                    fill_started_at: new Date().toISOString(),
                    fill_worker_id: this.workerId
                }).eq('id', app.id);
                console.log('[Queue] Resuming doing:', app.id);
                return { ...app, fill_status: 'filling' };
            }
        }

        // 2. APPROVED: ordered by fill_priority DESC, sort_order ASC, updated_at ASC
        let approvedQuery = this.supabase
            .from('applicants')
            .select('id, fill_priority, sort_order')
            .eq('pipeline_status', 'approved')
            .order('fill_priority', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: true });
        if (applicantIds) approvedQuery = approvedQuery.in('id', applicantIds);
        const { data: approvedApplicants, error: approvedErr } = await approvedQuery.limit(10);

        // Fallback if fill_priority/sort_order columns don't exist yet
        if (approvedErr && approvedErr.message.includes('column')) {
            console.warn('[Queue] fill_priority/sort_order columns missing, using fallback order');
            let fallbackQuery = this.supabase
                .from('applicants')
                .select('id')
                .eq('pipeline_status', 'approved')
                .order('updated_at', { ascending: true });
            if (applicantIds) fallbackQuery = fallbackQuery.in('id', applicantIds);
            const { data: fallbackApplicants } = await fallbackQuery.limit(10);
            if (!fallbackApplicants || fallbackApplicants.length === 0) return null;
            return await this._ensureAndClaimApp(fallbackApplicants[0].id);
        }

        if (!approvedApplicants || approvedApplicants.length === 0) return null;

        // Try each approved applicant (in priority order) until one is claimable
        for (const candidate of approvedApplicants) {
            const result = await this._ensureAndClaimApp(candidate.id);
            if (result) return result;
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
            // No application exists — create one
            console.log(`[Queue] No application for ${applicantId} — creating`);
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
            // Application exists but was already filled — auto-reset for re-fill
            console.log(`[Queue] Auto-resetting filled application ${app.id} for re-fill`);
            const { error: resetErr } = await this.supabase.from('applications').update({
                fill_status: 'pending',
                fill_error: null,
                fill_worker_id: null,
                fill_started_at: null,
                fill_finished_at: null,
                retry_count: 0,
                last_page: null,
                application_id: null,
                last_error_at: null
            }).eq('id', app.id);
            if (resetErr) {
                console.error('[Queue] Failed to reset application:', resetErr.message);
                return null;
            }
            app.fill_status = 'pending';
        } else if (app.fill_status === 'filling') {
            // Already being filled by another worker — skip
            return null;
        }

        // Claim: set application to filling
        await this.supabase.from('applications').update({
            fill_status: 'filling',
            fill_started_at: new Date().toISOString(),
            fill_worker_id: this.workerId
        }).eq('id', app.id);

        // Pipeline: approved → doing
        await this.supabase.from('applicants').update({
            pipeline_status: 'doing',
            updated_at: new Date().toISOString()
        }).eq('id', applicantId);

        const priority = app.fill_priority || 0;
        const priorityLabel = priority >= 3 ? '🚨 III - EMERGÊNCIA' : priority >= 2 ? '⚡ II - URGÊNCIA' : 'I - Indefinido';
        console.log(`[Queue] Claimed ${app.id} → doing (${priorityLabel})`);

        return { ...app, fill_status: 'filling' };
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

        // Sync pipeline status → 'done'
        if (appData) {
            await this.supabase
                .from('applicants')
                .update({ pipeline_status: 'done', updated_at: new Date().toISOString() })
                .eq('id', appData.applicant_id);
            console.log('[Queue] Pipeline status → done for', appData.applicant_id);
        }
    }

    async _markError(appId, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'error',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
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

    // Re-queue: reset fill_status (pipeline_status stays 'doing' so it'll be retried)
    async _reQueue(appId, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'pending',
                fill_worker_id: null,
                retry_count: 0,
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
        console.log(`[Queue] Re-queued ${appId} for retry`);
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
