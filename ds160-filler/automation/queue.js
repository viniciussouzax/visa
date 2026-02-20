// Queue Runner — polls Supabase for queued applications and processes them
// Features: countdown timer, immediate refresh, error logging to Supabase
const { fillApplication } = require('./filler');

const POLL_INTERVAL = 30; // seconds between checks

class QueueRunner {
    constructor(supabase, captchaMode) {
        this.supabase = supabase;
        this.captchaMode = captchaMode;
        this.running = false;
        this.statusCallback = null;
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this._countdown = 0;
        this._countdownTimer = null;
        this._skipWait = false; // flag for immediate execution
    }

    start(statusCallback) {
        this.running = true;
        this.statusCallback = statusCallback;
        this._loop();
    }

    async stop() {
        this.running = false;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
    }

    // Called when user clicks "Refresh" — skip wait and process immediately
    triggerNow() {
        this._skipWait = true;
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
        this.emit({ type: 'checking', message: 'Verificando fila agora...' });
    }

    emit(status) {
        if (this.statusCallback) this.statusCallback(status);
    }

    async _loop() {
        while (this.running) {
            try {
                // 1. Fetch config (captcha keys)
                const config = await this._getConfig();

                // 2. Claim next queued application
                const app = await this._claimNext();

                if (!app) {
                    this.emit({ type: 'queue-empty', nextCheck: POLL_INTERVAL });
                    // Start countdown
                    await this._waitWithCountdown(POLL_INTERVAL);
                    continue;
                }

                // 3. Fetch full applicant data
                const applicant = await this._getApplicant(app.applicant_id);
                if (!applicant) {
                    const errMsg = 'Dados do solicitante não encontrados';
                    await this._markError(app.id, errMsg);
                    await this._logError(app.id, null, errMsg, null, null);
                    continue;
                }

                this.emit({
                    type: 'filling',
                    applicantName: applicant.full_name,
                    page: 'Iniciando...'
                });

                // 4. Run the filler (Playwright — opens Chromium visually)
                // captchaMode comes from automation_config (set by admin in dashboard)
                let currentPage = '';
                const captchaMode = config.captcha_mode || this.captchaMode || 'capmonster';
                const result = await fillApplication(applicant, app, config, captchaMode, (page) => {
                    currentPage = page;
                    this.emit({ type: 'filling', applicantName: applicant.full_name, page });
                });

                // 5. Update status
                if (result.success) {
                    await this._markDone(app.id, result.applicationId);
                    this.emit({ type: 'done', applicantName: applicant.full_name });
                } else {
                    await this._markError(app.id, result.error);
                    await this._logError(app.id, applicant.full_name, result.error, result.stack, currentPage);
                    this.emit({ type: 'error', applicantName: applicant.full_name, error: result.error });
                }

            } catch (e) {
                console.error('Queue loop error:', e);
                await this._logError(null, null, e.message, e.stack, null);
                this.emit({ type: 'error', applicantName: '—', error: e.message });
            }

            // Brief pause between items
            if (this.running) await sleep(3000);
        }
    }

    // Wait with visible countdown, can be interrupted by triggerNow()
    _waitWithCountdown(seconds) {
        return new Promise(resolve => {
            this._countdown = seconds;
            this._skipWait = false;

            this._countdownTimer = setInterval(() => {
                if (!this.running || this._skipWait) {
                    clearInterval(this._countdownTimer);
                    this._countdownTimer = null;
                    this._skipWait = false;
                    resolve();
                    return;
                }

                this._countdown--;
                this.emit({
                    type: 'waiting',
                    countdown: this._countdown,
                    message: `Próxima verificação em ${this._countdown}s`
                });

                if (this._countdown <= 0) {
                    clearInterval(this._countdownTimer);
                    this._countdownTimer = null;
                    resolve();
                }
            }, 1000);
        });
    }

    async _getConfig() {
        const { data } = await this.supabase
            .from('automation_config')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
        return data || { captcha_mode: 'capmonster' };
    }

    async _claimNext() {
        const { data: items } = await this.supabase
            .from('applications')
            .select('id, applicant_id, application_id, security_answer, fill_priority')
            .eq('fill_status', 'queued')
            .order('fill_priority', { ascending: true })
            .order('fill_queued_at', { ascending: true })
            .limit(1);

        if (!items || items.length === 0) return null;

        const item = items[0];

        // Claim with optimistic lock
        const { error } = await this.supabase
            .from('applications')
            .update({
                fill_status: 'filling',
                fill_started_at: new Date().toISOString(),
                fill_worker_id: this.workerId
            })
            .eq('id', item.id)
            .eq('fill_status', 'queued');

        if (error) return null;
        return item;
    }

    async _getApplicant(applicantId) {
        const { data } = await this.supabase
            .from('applicants')
            .select('*')
            .eq('id', applicantId)
            .single();
        return data;
    }

    async _markDone(appId, applicationId) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'filled',
                fill_finished_at: new Date().toISOString(),
                application_id: applicationId || undefined
            })
            .eq('id', appId);
    }

    async _markError(appId, error) {
        await this.supabase
            .from('applications')
            .update({
                fill_status: 'error',
                fill_error: error,
                fill_finished_at: new Date().toISOString()
            })
            .eq('id', appId);
    }

    // Log errors to Supabase for developer visibility
    async _logError(applicationId, applicantName, errorMessage, errorStack, pageName) {
        try {
            await this.supabase
                .from('error_logs')
                .insert({
                    worker_id: this.workerId,
                    application_id: applicationId,
                    applicant_name: applicantName,
                    error_message: errorMessage,
                    error_stack: errorStack || null,
                    page_name: pageName || null
                });
        } catch (e) {
            console.warn('Failed to log error to Supabase:', e.message);
        }
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { QueueRunner };
