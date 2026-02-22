// Queue Runner — Resilient automation with retry, backoff, and smart updates
const { fillApplication } = require('./filler');

const POLL_INTERVAL = 1800; // 30 minutes between checks
const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [5, 10]; // 5sec, 10sec between retries
const GLOBAL_PAUSE = 15 * 60; // 15min pause after 3 consecutive global errors

class QueueRunner {
    constructor(supabase, captchaMode, companyId, userId) {
        this.supabase = supabase;
        this.captchaMode = captchaMode || 'capmonster';
        this.companyId = companyId;
        this.userId = userId;
        this.running = false;
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this._emitter = null;
        this._countdownTimer = null;
        this._countdown = 0;
        this._skipWait = false;
        this.consecutiveErrors = 0; // global consecutive error count

        // Single Browser Instance
        this.browser = null;
        this.browserContext = null;
        this.activePage = null;
    }

    start(emitter) {
        this._emitter = emitter;
        this.running = true;
        this._loop();
    }

    async stop() {
        this.running = false;
        this.running = false;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
        if (this.browser) {
            await this.browser.close().catch(() => { });
            this.browser = null;
            this.browserContext = null;
            this.activePage = null;
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
            let currentApp = null; // Track claimed app for error recovery
            try {
                // Smart update check before each cycle
                if (global.smartCheckForUpdates) global.smartCheckForUpdates();

                console.log('[Queue] Checking for items...');

                // 1. Fetch config
                const config = await this._getConfig();

                // 2. Claim next item (prioritize incomplete > pending)
                const app = await this._claimNext();
                currentApp = app; // Track for error recovery

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
                    currentApp = null; // Handled
                    continue;
                }

                // 4. Fill with retry logic
                await this._fillWithRetry(app, applicant, config);
                currentApp = null; // Successfully handled

            } catch (e) {
                console.error('Queue loop error:', e);

                // CRITICAL: Reset stuck app status if we have a claimed app
                if (currentApp && currentApp.id) {
                    console.error(`[Queue] Resetting stuck app ${currentApp.id} to 'error'`);
                    await this._markError(currentApp.id, `Loop error: ${e.message}`).catch(() => { });
                }

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
            page: app.current_page ? `Retomando de ${app.current_page}` : 'Iniciando...'
        });

        // Smart update check before fill
        if (global.smartCheckForUpdates) global.smartCheckForUpdates();

        // Determine captcha mode from config
        const captchaMode = config.captcha_mode || this.captchaMode || 'capmonster';

        let currentPage = app.current_page || '';

        // Ensure browser is running
        await this._ensureBrowser();
        await this.browserContext.clearCookies();

        let result;
        try {
            result = await fillApplication(applicant, app, config, captchaMode, this.activePage, (page) => {
                currentPage = page;
                this.emit({ type: 'filling', applicantName: applicant.full_name, page });
            });
        } catch (globalErr) {
            result = { success: false, error: globalErr.message, stack: globalErr.stack };
            await this._restartBrowser();
        }

        if (result.success) {
            // ✅ Success — reset counters (do NOT close browser)
            await this._markDone(app.id, result.applicationId, currentPage);
            this.emit({ type: 'done', applicantName: applicant.full_name });
            this.consecutiveErrors = 0;
            return;
        }

        // ❌ Error — log it
        console.error(`[Queue] Error on ${applicant.full_name} (attempt ${currentRetry}):`, result.error);

        const { errorClass, correlationId } = await this._logError(
            app, applicant, result.error, result.stack, currentPage, result.field, result.cause,
            currentRetry >= MAX_RETRIES ? result.activePage : null
        );

        // Salva o application_id no BD agressivamente caso já tenha sido emitido (AA00...) 
        if (result.applicationId) {
            await this.supabase.from('applications').update({ application_id: result.applicationId }).eq('id', app.id).then();
            if (app.applicant_id) {
                await this.supabase.from('applicants').update({ application_id: result.applicationId }).eq('id', app.applicant_id).then();
            }
        }

        await this._updateRetry(app.id, currentRetry, currentPage, result.error);

        this.consecutiveErrors++;

        if (currentRetry >= MAX_RETRIES) {
            // Max retries reached — state machine transition
            await this._restartBrowser(); // only close browser on hard fails to clear any bad state

            await this._transitionToFailed(app.id, errorClass, result.error, correlationId);

            if (app.applicant_id) {
                await this.supabase.from('applicants').update({ pipeline_status: 'needs_attention' }).eq('id', app.applicant_id).then();
            }

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
            if (refreshedApp && refreshedApp.status !== 'needs_attention') {
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
    // BROWSER LIFECYCLE MAINTAINER
    // ==============================================================
    async _ensureBrowser() {
        if (!this.browser || !this.browser.isConnected()) {
            console.log('[Queue] Launching single Playwright Chromium instance...');
            const { chromium } = require('playwright');

            this.browser = await chromium.launch({
                headless: false,
                channel: 'chrome', // Força o uso do Chrome Instalado no Windows do cliente
                args: ['--disable-blink-features=AutomationControlled']
            });
            this.browserContext = await this.browser.newContext({ viewport: { width: 1280, height: 900 } });
            this.activePage = await this.browserContext.newPage();
            this.activePage.setDefaultTimeout(15000);
            this.activePage.setDefaultNavigationTimeout(30000);
            this.activePage.on('dialog', async d => d.accept().catch(() => { }));
        }
    }

    async _restartBrowser() {
        console.log('[Queue] Restarting browser due to hard failure...');
        if (this.browser) await this.browser.close().catch(() => { });
        this.browser = null;
        this.browserContext = null;
        this.activePage = null;
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
        // Priority: incomplete fills (filling) > pending, sorted by priority + queue time
        let qFilling = this.supabase
            .from('applications')
            .select('*, applicants!inner(*)')
            .eq('status', 'filling')
            .eq('fill_worker_id', this.workerId);

        if (this.companyId) {
            qFilling = qFilling.eq('applicants.company_id', this.companyId);
        }
        if (this.userId) {
            qFilling = qFilling.eq('applicants.user_id', this.userId);
        }

        const { data: filling } = await qFilling.limit(1);

        if (filling && filling.length > 0) return filling[0];

        // Claim next pending
        let qpending = this.supabase
            .from('applications')
            .select('*, applicants!inner(*)')
            .eq('status', 'pending');

        if (this.companyId) {
            qpending = qpending.eq('applicants.company_id', this.companyId);
        }
        if (this.userId) {
            qpending = qpending.eq('applicants.user_id', this.userId);
        }

        const { data } = await qpending.limit(1);

        if (!data || data.length === 0) return null;

        const app = data[0];
        await this.supabase
            .from('applications')
            .update({
                status: 'filling',
                fill_started_at: new Date().toISOString(),
                fill_worker_id: this.workerId
            })
            .eq('id', app.id);

        // Update applicant pipeline_status to 'filling'
        if (app.applicant_id) {
            await this.supabase
                .from('applicants')
                .update({ pipeline_status: 'filling' })
                .eq('id', app.applicant_id);
        }

        return { ...app, status: 'filling' };
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
    async _markDone(appId, applicationId, currentPage) {
        await this.supabase
            .from('applications')
            .update({
                status: 'filled',
                fill_finished_at: new Date().toISOString(),
                application_id: applicationId || null,
                current_page: currentPage || null,
                fill_error: null
            })
            .eq('id', appId);

        // Update applicant pipeline_status to 'filled' and sync application_id
        const { data: app } = await this.supabase
            .from('applications')
            .select('applicant_id')
            .eq('id', appId)
            .single();
        if (app?.applicant_id) {
            let updatePayload = { pipeline_status: 'filled' };
            if (applicationId) updatePayload.application_id = applicationId;
            await this.supabase
                .from('applicants')
                .update(updatePayload)
                .eq('id', app.applicant_id);
        }
    }

    async _markError(appId, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                status: 'error',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
    }

    async _markNeedsAttention(appId, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                status: 'needs_attention',
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);

        // Update applicant pipeline_status
        const { data: app } = await this.supabase
            .from('applications')
            .select('applicant_id')
            .eq('id', appId)
            .single();
        if (app?.applicant_id) {
            await this.supabase
                .from('applicants')
                .update({ pipeline_status: 'needs_attention' })
                .eq('id', app.applicant_id);
        }
    }

    async _updateRetry(appId, retryCount, currentPage, errMsg) {
        await this.supabase
            .from('applications')
            .update({
                retry_count: retryCount,
                current_page: currentPage || null,
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);
    }

    // ==============================================================
    // ERROR LOGGING (to Supabase for developer monitoring)
    // ==============================================================
    async _logError(app, applicant, errorMessage, errorStack, pageName, fieldName, errorCause, activePage = null) {
        const correlationId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const step = pageName || 'SYSTEM';

        // Enforce rigid state machine error taxonomy
        const isHardFail = errorMessage.includes('VALIDATION_FAILED') ||
            errorMessage.includes('SELECTOR_NOT_FOUND') ||
            errorMessage.includes('DS160_LAYOUT_CHANGED') ||
            errorMessage.includes('PAGE_NAV_TIMEOUT');

        const errorClass = isHardFail ? 'failed_hard' : 'failed_soft';
        let screenshotBase64 = null;

        if (activePage) {
            try {
                // Tira um print compactado da tela no exato momento do erro letal
                const buffer = await activePage.screenshot({ type: 'jpeg', quality: 50, fullPage: true });
                screenshotBase64 = buffer.toString('base64');
                console.log(`📸 Screenshot capturado para erro ${correlationId}`);
            } catch (e) {
                console.warn('⚠️ Não foi possível capturar screenshot:', e.message);
            }
        }

        try {
            await this.supabase
                .from('error_logs')
                .insert({
                    worker_id: this.workerId,
                    application_id: app?.id || null,
                    page_name: step,
                    error_message: errorMessage,
                    error_stack: errorStack || null,
                    field_name: fieldName || null,
                    error_cause: errorCause || 'unknown',
                    applicant_name: (typeof applicant === 'string') ? applicant : (applicant?.full_name || null)
                    // (A tabela atual não tem coluna para captura de screenshot Base64, removeremos do JSON até o usuário decidir criar a coluna no BD)
                });
        } catch (e) {
            console.warn('Failed to log error to Supabase error_logs:', e.message);
        }

        return { errorClass, correlationId };
    }

    // New state transition methods matching strict Modo Operante
    async _transitionToFailed(appId, type, errMsg, correlationId = null) {
        if (!['failed_hard', 'failed_soft'].includes(type)) type = 'failed_hard';

        await this.supabase
            .from('applications')
            .update({
                status: type,
                fill_error: errMsg,
                last_error_at: new Date().toISOString()
            })
            .eq('id', appId);

        // Sync application_id if it exists, along with the failed status
        const { data: app } = await this.supabase.from('applications').select('applicant_id, application_id').eq('id', appId).single();
        if (app?.applicant_id) {
            let updatePayload = { pipeline_status: 'needs_attention' };
            if (app.application_id) updatePayload.application_id = app.application_id;
            await this.supabase.from('applicants').update(updatePayload).eq('id', app.applicant_id);
        }
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { QueueRunner };
