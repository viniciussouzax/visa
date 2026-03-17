// ============================================================
// Security Question Page Handler
// Extracted from filler.js STEP 2 (L357-424)
// ============================================================

/**
 * Handle the DS-160 Security Question Setup page.
 * Flow: Privacy checkbox → Select question → Fill answer → Continue → Capture App ID
 *
 * @param {import('playwright').Page} page
 * @param {object} profile - Normalized applicant profile
 * @param {object} application - Application row (mutated: application_id set here)
 * @param {object} config - automation_config row
 * @param {function} onPage - Status callback
 * @param {function} onAppId - Callback when app_id is captured
 * @param {function} waitForPageReady - Helper
 * @param {function} waitForUrlChange - Helper
 * @returns {Promise<void>}
 */
async function handleSecurityQuestionPage(page, profile, application, config, onPage, onAppId, { waitForPageReady, waitForUrlChange }) {
    onPage('SecurityQuestion');

    // Privacy Act checkbox
    const privacyCheck = page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct");
    if (await privacyCheck.isVisible().catch(() => false)) {
        await privacyCheck.check();
    }

    // Select security question (config.security_question = index from DB)
    const questionSelect = page.locator("select[id$='_ddlQuestions']");
    const isDisabled = await questionSelect.evaluate(el => el.disabled).catch(() => false);
    const secAnswer = config.security_answer || profile.securityAnswer || '';
    if (!isDisabled) {
        const questionIndex = parseInt(config.security_question || '0', 10);
        await questionSelect.selectOption({ index: questionIndex });
        await page.locator("input[id$='_txtAnswer']").fill(secAnswer);
        console.log(`[Filler] Security question index ${questionIndex}, answer: "${secAnswer}"`);
    } else {
        console.log('[Filler] Security question already set (disabled) — skipping');
        const answerInput = page.locator("input[id$='_txtAnswer']");
        const answerDisabled = await answerInput.evaluate(el => el.disabled).catch(() => true);
        if (!answerDisabled) {
            await answerInput.fill(secAnswer);
            console.log(`[Filler] Security answer filled: "${secAnswer}"`);
        }
    }

    // Persist security_answer to application for future Recovery
    if (secAnswer) {
        application.security_answer = secAnswer;
        console.log(`[Filler] Security answer saved to application object`);
    }

    // Click Continue/Next
    const urlBefore = page.url();
    const continueBtn = page.locator("input[id$='_btnContinue']:not([disabled])");
    const nextBtn = page.locator("input[type='submit'][value*='Next']:not([disabled])").first();
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueBtn.click();
    } else if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
    } else {
        const anySubmit = page.locator("input[type='submit']:not([disabled])").first();
        if (await anySubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
            await anySubmit.click();
        }
    }
    await waitForUrlChange(page, urlBefore);
    await waitForPageReady(page);

    // Confirm Application ID page
    const confirmBtn = page.locator("input[id$='_btnContinueApp']");
    if (await confirmBtn.isVisible().catch(() => false)) {
        // Priority: use specific lblAppID span, fallback to any text on page
        let appIdText = await page.locator("span[id$='_lblAppID']").first().innerText().catch(() => '');
        if (!appIdText) {
            appIdText = await page.locator("b").first().innerText().catch(() => '');
        }
        // DS-160 Application IDs: exactly AA followed by 8 alphanumeric chars (e.g. AA00FEIPFF)
        const appIdMatch = appIdText.match(/\bAA[0-9A-Z]{8}\b/);
        if (appIdMatch) {
            application.application_id = appIdMatch[0];
            console.log(`[Filler] Application ID: ${appIdMatch[0]}`);
            if (typeof onAppId === 'function') onAppId(appIdMatch[0]);
        } else {
            console.warn(`[Filler] ⚠️ Application ID NOT found in text: "${appIdText.substring(0, 50)}"`);
        }

        const urlBefore2 = page.url();
        await confirmBtn.click();
        await waitForUrlChange(page, urlBefore2);
        await waitForPageReady(page);
    }
}

module.exports = { handleSecurityQuestionPage };
