// Queue Runner — Resilient automation with retry, backoff, and smart updates
const { fillApplication } = require('./filler');

const POLL_INTERVAL = 1800; // 30 minutes between checks
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [2 * 60, 5 * 60]; // 2min, 5min between retries
const GLOBAL_PAUSE = 15 * 60; // 15min pause after 3 consecutive global errors

class QueueRunner {
    constructor(supabase, captchaMode) {
        this.supabase = supabase;
        this.captchaMode = captchaMode || 'capmonster';
        this.running = false;
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this._emitter = null;
        this._countdownTimer = null;
        this._countdown = 0;
        this._skipWait = false;
        this.consecutiveErrors = 0; // global consecutive error count
    }

    start(emitter) {
        this._emitter = emitter;
        this.running = true;
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
    async _fillWithRetry(app, applicant, config) {
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
        const result = await fillApplication(applicant, app, config, captchaMode, (page) => {
            lastPage = page;
            this.emit({ type: 'filling', applicantName: applicant.full_name, page });
        });

        if (result.success) {
            // ✅ Success — close browser, reset counters
            if (result.browser) await result.browser.close().catch(() => { });
            await this._markDone(app.id, result.applicationId, lastPage);
            this.emit({ type: 'done', applicantName: applicant.full_name });
            this.consecutiveErrors = 0;
            return;
        }

        // ❌ Error — log it
        console.error(`[Queue] Error on ${applicant.full_name} (attempt ${currentRetry}):`, result.error);

        await this._logError(app, applicant, result.error, result.stack, lastPage, result.field, result.cause);
        await this._updateRetry(app.id, currentRetry, lastPage, result.error);

        this.consecutiveErrors++;

        if (currentRetry >= MAX_RETRIES) {
            // Max retries reached — close browser, mark needs_attention
            if (result.browser) await result.browser.close().catch(() => { });
            await this._markNeedsAttention(app.id, result.error);
            this.emit({
                type: 'error',
                applicantName: applicant.full_name,
                error: `${result.error} (${MAX_RETRIES} tentativas esgotadas)`
            });
            return;
        }

        // Backoff before retry
        const delay = BACKOFF_DELAYS[currentRetry - 1] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
        this.emit({
            type: 'retrying',
            applicantName: applicant.full_name,
            retryNumber: currentRetry,
            delay: delay,
            error: result.error
        });

        // Check for update during backoff
        if (global.smartCheckForUpdates) global.smartCheckForUpdates();
        await this._waitWithCountdown(delay);

        // Re-claim the same app and retry
        if (this.running) {
            const refreshedApp = await this._getApp(app.id);
            if (refreshedApp && refreshedApp.fill_status !== 'needs_attention') {
                await this._fillWithRetry(refreshedApp, applicant, await this._getConfig());
            }
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
        return data || {};
    }

    // ==============================================================
    // CLAIM / QUERY
    // ==============================================================
    async _claimNext() {
        // Priority: incomplete fills (filling) > queued, sorted by priority + queue time
        const { data: filling } = await this.supabase
            .from('applications')
            .select('*')
            .eq('fill_status', 'filling')
            .eq('fill_worker_id', this.workerId)
            .limit(1);

        if (filling && filling.length > 0) return filling[0];

        // Claim next queued
        const { data } = await this.supabase
            .from('applications')
            .select('*')
            .eq('fill_status', 'queued')
            .order('fill_priority', { ascending: true })
            .order('fill_queued_at', { ascending: true })
            .limit(1);

        if (!data || data.length === 0) return null;

        const app = data[0];
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'filling',
                fill_started_at: new Date().toISOString(),
                fill_worker_id: this.workerId
            })
            .eq('id', app.id);

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
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'filled',
                fill_finished_at: new Date().toISOString(),
                application_id: applicationId || null,
                last_page: lastPage || null,
                fill_error: null
            })
            .eq('id', appId);
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
    async _logError(app, applicant, errorMessage, errorStack, pageName, fieldName, errorCause) {
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
                    user_id: (typeof applicant === 'object') ? (applicant?.user_id || null) : null,
                    company_id: (typeof applicant === 'object') ? (applicant?.company_id || null) : null
                });
        } catch (e) {
            console.warn('Failed to log error to Supabase:', e.message);
        }
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { QueueRunner };
