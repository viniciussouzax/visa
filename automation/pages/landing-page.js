// ============================================================
// Landing Page Handler — Select location, CAPTCHA, Start/Retrieve
// Extracted from filler.js STEP 1 (L196-354)
// ============================================================
const { solveCaptchaOnPage } = require('../helpers/captcha-handler');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function humanDelay(min = 800, max = 2500) { return sleep(min + Math.random() * (max - min)); }

/**
 * Handle the DS-160 Landing page.
 * Flow: 1) Select Location → 2) Wait postback → 3) Dismiss modal → 4) CAPTCHA → 5) Start/Retrieve
 *
 * @param {import('playwright').Page} page
 * @param {object} profile - Normalized applicant profile
 * @param {object} application - Application row (has application_id)
 * @param {object} config - automation_config row
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {boolean} useRetrieve - Use Retrieve instead of Start New
 * @param {function} onPage - Status callback
 * @param {function} waitForPostback - Helper
 * @param {function} waitForPageReady - Helper
 * @param {function} waitForUrlChange - Helper
 * @returns {Promise<{ success: boolean, error?: string, cause?: string }>}
 */
async function handleLandingPage(page, profile, application, config, captchaMode, useRetrieve, onPage, { waitForPostback, waitForPageReady, waitForUrlChange }) {
    onPage('Landing');
    const location = profile.location;

    // ── 1) SELECT LOCATION ──
    const locSelect = page.locator("select[id$='_ddlLocation']");
    try {
        await locSelect.waitFor({ state: 'visible', timeout: 15000 });
        await sleep(500); // small delay for options to populate
        await locSelect.selectOption(location);
        // Dispara evento change explicitamente para garantir que ASP.NET processa o postback
        await locSelect.dispatchEvent('change');
        console.log(`[Landing] 1/5 Location selected: ${location}`);
    } catch (e) {
        console.warn(`[Landing] ⚠️ Location select failed on first try: ${e.message?.substring(0, 80)}`);
        // Retry: wait a bit more and try again
        await sleep(2000);
        try {
            await locSelect.selectOption(location);
            await locSelect.dispatchEvent('change');
            console.log(`[Landing] 1/5 Location selected (retry): ${location}`);
        } catch (e2) {
            console.error(`[Landing] ❌ Location select FAILED: ${location} — ${e2.message?.substring(0, 80)}`);
        }
    }

    // ── 2) WAIT FOR LOADING (postback after location change) ──
    await humanDelay(300, 600); // reduced — CEAC has tight session timeout
    await waitForPostback(page);
    await waitForPageReady(page);
    console.log('[Landing] 2/5 Page loaded after location select');

    // ── 2.5) VERIFY Location didn't reset after postback ──
    const locValueAfter = await locSelect.inputValue().catch(() => '');
    if (locValueAfter !== location) {
        console.warn(`[Landing] ⚠️ Location perdeu valor após postback! Era: ${location}, Agora: ${locValueAfter} — re-selecionando...`);
        await locSelect.selectOption(location);
        await locSelect.dispatchEvent('change');
        await humanDelay(500, 1000);
        await waitForPostback(page);
        await waitForPageReady(page);
        const locValue2 = await locSelect.inputValue().catch(() => '');
        console.log(`[Landing] 2.5 Location após re-seleção: ${locValue2}`);
    } else {
        console.log(`[Landing] 2.5 Location confirmed: ${locValueAfter}`);
    }

    // ── 3) CHECK & CLOSE MODAL (if present) ──
    try {
        await page.waitForSelector('.modalBackground', { state: 'visible', timeout: 5000 });
        console.log('[Landing] 3/5 Modal detected — clicking Close (postback)...');
        const closeBtn = page.locator('[id*="lnkClose"]').first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click();
        }
        await page.waitForSelector('.modalBackground', { state: 'hidden', timeout: 10000 }).catch(() => { });
        await waitForPageReady(page);
        console.log('[Landing] 3/5 Modal closed via postback — page stable, new captcha ready');
    } catch {
        console.log('[Landing] 3/5 No modal — skipping');
    }

    // ── 4) SOLVE CAPTCHA ──
    await humanDelay(300, 500); // reduced — CEAC has tight session timeout
    const captchaResult = await solveCaptchaOnPage(page, captchaMode, config, {
        label: 'Landing',
        tmpFilename: 'captcha_landing.png',
        maxAttempts: 5,
    });
    if (!captchaResult.success) {
        return { success: false, error: 'Captcha não resolvido após 3 tentativas', cause: 'captcha_failed' };
    }

    // ── 4.5) PRE-CLICK: dismiss any modal that reappeared ──
    const preclickDismissed = await page.evaluate(() => {
        const bg = document.querySelector('.modalBackground');
        if (!bg || bg.style.display === 'none') return false;
        const rect = bg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        bg.style.display = 'none';
        const fg = bg.previousElementSibling || document.querySelector('[id*="modalConfirm_foregroundElement"]');
        if (fg) fg.style.display = 'none';
        return true;
    });
    if (preclickDismissed) {
        console.log('[Landing] 4.5 Modal hidden via DOM before click');
    }

    // ── 5) CLICK START or RETRIEVE ──
    if (useRetrieve) {
        return await _clickRetrieve(page, application, config, profile, { waitForPageReady, waitForUrlChange });
    } else {
        return await _clickStartNew(page, { waitForPageReady, waitForUrlChange });
    }
}

/**
 * Click "Retrieve Application" and validate.
 */
async function _clickRetrieve(page, application, config, profile, { waitForPageReady, waitForUrlChange }) {
    console.log(`[Landing] 5/5 Retrieve Application: ${application.application_id}`);

    const appIdInput = page.locator("input[id$='_tbxApplicationID']").first();
    if (await appIdInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await appIdInput.fill(application.application_id);
    }

    // Security month select
    const secMonthSelect = page.locator("select[id$='_ddlMonth']").first();
    if (await secMonthSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        const secMonth = config.security_month || '01';
        await secMonthSelect.selectOption(secMonth);
        console.log(`[Landing] 5/5 Security month: ${secMonth}`);
    }

    // Security day select  
    const secDaySelect = page.locator("select[id$='_ddlDay']").first();
    if (await secDaySelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        const secDay = config.security_day || '01';
        await secDaySelect.selectOption(secDay);
        console.log(`[Landing] 5/5 Security day: ${secDay}`);
    }

    // Security year input
    const secYearInput = page.locator("input[id$='_txtYear'], input[id$='_tbxYear']").first();
    if (await secYearInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const secYear = config.security_year || '2026';
        await secYearInput.fill(secYear);
        console.log(`[Landing] 5/5 Security year: ${secYear}`);
    }

    // Security answer
    const secAnswerInput = page.locator("input[id$='_txtAnswer']").first();
    if (await secAnswerInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const secAnswer = config.security_answer || profile.securityAnswer || '';
        await secAnswerInput.fill(secAnswer);
        console.log(`[Landing] 5/5 Security answer filled`);
    }

    // Surname (5 chars) — some Retrieve pages also ask this
    const surnameInput = page.locator("input[id$='_txbSurname']").first();
    if (await surnameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const surname5 = (profile.surname || '').substring(0, 5).toUpperCase();
        await surnameInput.fill(surname5);
        console.log(`[Landing] 5/5 Surname: ${surname5}`);
    }

    // Year of Birth — if visible
    const dobYearInput = page.locator("input[id$='_txbDOBYear']").first();
    if (await dobYearInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        const birthYear = profile.dob?.year || '';
        await dobYearInput.fill(String(birthYear));
        console.log(`[Landing] 5/5 DOB Year: ${birthYear}`);
    }

    const retrieveBtn = page.locator("a[id$='_lnkRetrieve'], input[id$='_btnRetrieve']").first();
    await retrieveBtn.click({ timeout: 15000 });
    await sleep(2000);
    await waitForPageReady(page);

    const currentUrl = page.url();
    if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
        return { success: false, error: 'Session expired after clicking Retrieve', cause: 'session_expired' };
    }

    const validationError = page.locator('[id*="ValidationSummary"]').first();
    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
    const stillOnLanding = currentUrl.includes('Default.aspx');

    if (hasError || stillOnLanding) {
        console.warn(`[Landing] 5/5 Retrieve failed — captcha wrong or invalid app_id`);
        return { success: false, error: 'Retrieve failed', cause: 'captcha_failed' };
    }

    console.log(`[Landing] 5/5 ✅ Retrieve successful`);
    return { success: true };
}

/**
 * Click "Start New Application" and validate.
 */
async function _clickStartNew(page, { waitForPageReady, waitForUrlChange }) {
    console.log(`[Landing] 5/5 Start New Application`);
    const startBtn = page.locator("a[id$='_lnkNew']").first();
    const box = await startBtn.boundingBox();
    if (box) {
        const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
        const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
        await page.mouse.move(targetX, targetY, { steps: 5 + Math.floor(Math.random() * 10) });
        await sleep(100 + Math.floor(Math.random() * 200));
    }
    await startBtn.click({ timeout: 15000 });
    await sleep(2000);
    await waitForPageReady(page);

    const currentUrl = page.url();
    if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
        return { success: false, error: 'Session expired after clicking Start', cause: 'session_expired' };
    }

    const validationError = page.locator('[id*="ValidationSummary"]').first();
    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
    const stillOnLanding = currentUrl.includes('Default.aspx') || (!currentUrl.includes('SecureQuestion') && !currentUrl.includes('ConfirmApplicationID') && !currentUrl.includes('complete_'));

    if (hasError || stillOnLanding) {
        // Capturar o TEXT REAL do erro para diagnóstico preciso
        const errorText = await validationError.innerText().catch(() => '');
        const isLocationError = /location.*not.*completed|local.*n[aã]o/i.test(errorText);
        const isCaptchaError = /characters.*do not match|captcha|verification/i.test(errorText);

        if (isLocationError) {
            console.error(`[Landing] 5/5 ❌ Location validation error: "${errorText.trim().substring(0, 100)}"`);
            // Tentar re-selecionar location e re-submeter
            const locSelect = page.locator("select[id$='_ddlLocation']");
            const currentLoc = await locSelect.inputValue().catch(() => '');
            console.warn(`[Landing] Location atual no select: "${currentLoc}"`);
            return { success: false, error: `Location validation: ${errorText.trim().substring(0, 100)}`, cause: 'location_error' };
        }

        console.warn(`[Landing] 5/5 Validation error — page didn't advance: "${errorText.trim().substring(0, 100)}"`);
        return { success: false, error: errorText.trim() || 'Page did not advance', cause: isCaptchaError ? 'captcha_failed' : 'validation_error' };
    }

    console.log(`[Landing] 5/5 ✅ Start successful`);
    return { success: true };
}

module.exports = { handleLandingPage };
