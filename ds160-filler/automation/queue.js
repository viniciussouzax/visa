// Queue Runner — polls Supabase for queued applications and processes them
const { fillApplication } = require('./filler');

class QueueRunner {
    constructor(supabase, captchaMode) {
        this.supabase = supabase;
        this.captchaMode = captchaMode;
        this.running = false;
        this.statusCallback = null;
        this.workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    start(statusCallback) {
        this.running = true;
        this.statusCallback = statusCallback;
        this._loop();
    }

    async stop() {
        this.running = false;
    }

    emit(status) {
        if (this.statusCallback) this.statusCallback(status);
    }

    async _loop() {
        while (this.running) {
            try {
                // 1. Fetch config (captcha keys + check for code updates)
                const config = await this._getConfig();

                // 2. Claim next queued application
                const app = await this._claimNext();

                if (!app) {
                    this.emit({ type: 'queue-empty' });
                    // Wait 30s before checking again
                    await sleep(30000);
                    continue;
                }

                // 3. Fetch full applicant data
                const applicant = await this._getApplicant(app.applicant_id);
                if (!applicant) {
                    await this._markError(app.id, 'Dados do solicitante não encontrados');
                    continue;
                }

                this.emit({
                    type: 'filling',
                    applicantName: applicant.full_name,
                    page: 'Iniciando...'
                });

                // 4. Run the filler (Playwright - uses its OWN Chromium)
                const result = await fillApplication(applicant, app, config, this.captchaMode, (page) => {
                    this.emit({ type: 'filling', applicantName: applicant.full_name, page });
                });

                // 5. Update status
                if (result.success) {
                    await this._markDone(app.id, result.applicationId);
                    this.emit({ type: 'done', applicantName: applicant.full_name });
                } else {
                    await this._markError(app.id, result.error);
                    this.emit({ type: 'error', applicantName: applicant.full_name, error: result.error });
                }

            } catch (e) {
                console.error('Queue loop error:', e);
                this.emit({ type: 'error', applicantName: '—', error: e.message });
            }

            // Brief pause between items
            if (this.running) await sleep(3000);
        }
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
        // Get next queued application by priority
        const { data: items } = await this.supabase
            .from('applications')
            .select('id, applicant_id, application_id, security_answer, fill_priority')
            .eq('fill_status', 'queued')
            .order('fill_priority', { ascending: true })
            .order('fill_queued_at', { ascending: true })
            .limit(1);

        if (!items || items.length === 0) return null;

        const item = items[0];

        // Claim it (set filling + worker_id to avoid double-processing)
        const { error } = await this.supabase
            .from('applications')
            .update({
                fill_status: 'filling',
                fill_started_at: new Date().toISOString(),
                fill_worker_id: this.workerId
            })
            .eq('id', item.id)
            .eq('fill_status', 'queued'); // Optimistic lock

        if (error) return null; // Someone else claimed it
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
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { QueueRunner };
