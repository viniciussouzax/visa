// ============================================================
// Recovery Page Handler — Retrieve a DS-160 Application
// Extracted from filler.js Fill Loop Recovery section (L759-869)
// ============================================================
const { solveCaptchaOnPage } = require('../helpers/captcha-handler');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Handle the DS-160 Recovery page (Recovery.aspx).
 * Phase 1: App ID + CAPTCHA → click Retrieve
 * Phase 2: Surname (5 letters) + Year of Birth + Security Answer → click Retrieve
 *
 * @param {import('playwright').Page} page
 * @param {object} profile - Normalized applicant profile
 * @param {object} application - Application row (has application_id)
 * @param {object} config - automation_config row
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {function} waitForPageReady - Helper
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function handleRecoveryPage(page, profile, application, config, captchaMode, { waitForPageReady }) {
    console.log(`[Filler] 🔄 Recovery.aspx detectada — recuperando aplicação`);

    for (let rAttempt = 1; rAttempt <= 5; rAttempt++) {
        await waitForPageReady(page);

        // Detect which phase we're in
        const surnameField = page.locator("input[id$='_txbSurname']").first();
        const dobYearField = page.locator("input[id$='_txbDOBYear']").first();
        const secAnswerField = page.locator("input[id$='_txbAnswer']").first();
        const captchaImg = page.locator("img[id$='_CaptchaImage'], img[src*='captcha']").first();
        const appIdInput = page.locator("input[id$='_tbxApplicationID'], input[id*='ApplicationID']").first();

        const hasSurname = await surnameField.isVisible({ timeout: 1500 }).catch(() => false);
        const hasCaptcha = await captchaImg.isVisible({ timeout: 1500 }).catch(() => false);

        if (hasSurname) {
            // ====== PHASE 2: Security Questions ======
            console.log(`[Filler] Recovery FASE 2: Security Questions (tentativa ${rAttempt})`);

            const surname5 = (profile.surname || '').substring(0, 5).toUpperCase();
            await surnameField.fill(surname5);
            console.log(`[Filler] Recovery: Surname preenchido: ${surname5}`);

            if (await dobYearField.isVisible({ timeout: 1000 }).catch(() => false)) {
                const birthYear = profile.dob?.year || '';
                await dobYearField.fill(String(birthYear));
                console.log(`[Filler] Recovery: Year of Birth preenchido: ${birthYear}`);
            }

            // Security month select
            const secMonthSelect = page.locator("select[id$='_ddlMonth']").first();
            if (await secMonthSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
                const secMonth = config.security_month || '01';
                await secMonthSelect.selectOption(secMonth);
                console.log(`[Filler] Recovery: Security month: ${secMonth}`);
            }

            // Security day select
            const secDaySelect = page.locator("select[id$='_ddlDay']").first();
            if (await secDaySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
                const secDay = config.security_day || '01';
                await secDaySelect.selectOption(secDay);
                console.log(`[Filler] Recovery: Security day: ${secDay}`);
            }

            // Security year input
            const secYearInput = page.locator("input[id$='_txtYear'], input[id$='_tbxYear']").first();
            if (await secYearInput.isVisible({ timeout: 1000 }).catch(() => false)) {
                const secYear = config.security_year || '2026';
                await secYearInput.fill(secYear);
                console.log(`[Filler] Recovery: Security year: ${secYear}`);
            }

            if (await secAnswerField.isVisible({ timeout: 1000 }).catch(() => false)) {
                const secAnswer = config.security_answer || profile.securityAnswer || '';
                await secAnswerField.fill(secAnswer);
                console.log(`[Filler] Recovery: Security answer preenchido`);
            }
        } else if (hasCaptcha) {
            // ====== PHASE 1: App ID + Captcha ======
            console.log(`[Filler] Recovery FASE 1: App ID + Captcha (tentativa ${rAttempt})`);

            if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                const isEnabled = await appIdInput.isEnabled().catch(() => false);
                if (isEnabled) {
                    await appIdInput.fill(application.application_id || '');
                    console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                }
            }

            const captchaResult = await solveCaptchaOnPage(page, captchaMode, config, {
                label: `Recovery(${rAttempt})`,
                tmpFilename: 'captcha_recovery.png',
                maxAttempts: 1,
            });
            if (!captchaResult.success) {
                console.warn(`[Filler] Recovery captcha error:`, captchaResult.error);
            }
        } else {
            // ====== PHASE 1 (sem captcha): apenas App ID ======
            console.log(`[Filler] Recovery FASE 1: App ID sem captcha (tentativa ${rAttempt})`);
            if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                const isEnabled = await appIdInput.isEnabled().catch(() => false);
                if (isEnabled) {
                    await appIdInput.fill(application.application_id || '');
                    console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                }
            }
        }

        // Click Retrieve Application button
        const retrieveBtn = page.locator("input[id$='_btnRetrieve'], a[id$='_lnkRetrieve'], input[value*='Retrieve']").first();
        if (await retrieveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await retrieveBtn.click();
            console.log('[Filler] Recovery: clicou Retrieve Application');
        } else {
            console.warn('[Filler] Recovery: botão Retrieve não encontrado');
        }

        await sleep(3000);
        await waitForPageReady(page);

        const newUrl = page.url();
        if (!newUrl.includes('Recovery.aspx')) {
            console.log(`[Filler] ✅ Recovery bem-sucedido — navegou para: ${newUrl}`);
            return { success: true };
        }

        const errorText = await page.locator('[id*="ValidationSummary"], [id*="lblError"]').first().innerText().catch(() => '');
        if (errorText) {
            console.warn(`[Filler] Recovery erro: ${errorText.substring(0, 100)}`);
        }

        console.warn(`[Filler] Recovery tentativa ${rAttempt} falhou — ainda em Recovery.aspx`);
    }

    return { success: false, error: 'Recovery.aspx: falhou 5x ao tentar recuperar aplicação' };
}

module.exports = { handleRecoveryPage };
