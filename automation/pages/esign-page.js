// ============================================================
// E-Sign Page Handler — Passport + CAPTCHA + Sign & Submit
// DS-160 Sign page: signtheapplication.aspx?node=SignCertify
// ============================================================
const { solveCaptchaOnPage, hasCaptchaOnPage } = require('../helpers/captcha-handler');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Handle the DS-160 E-Sign page.
 * Flow:
 *   1) "Preparer" radio → No (default, but ensure)
 *   2) Fill passport number (PPTNumTbx)
 *   3) Solve CAPTCHA (CodeTextBox)
 *   4) Click "Sign and Submit Application" (btnSignApp)
 *   5) Wait for "Next: Confirmation" to become enabled
 *   6) Click "Next: Confirmation" (UpdateButton3)
 *
 * @param {import('playwright').Page} page
 * @param {object} profile - Normalized applicant profile
 * @param {object} config - automation_config row
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {function} waitForPageReady - Helper
 * @param {function} waitForUrlChange - Helper
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function handleESignPage(page, profile, config, captchaMode, { waitForPageReady, waitForUrlChange }) {
    console.log('[ESign] ✍️ Sign page — preenchendo passport, captcha e assinando');
    await waitForPageReady(page);

    // 1. Preparer radio — ensure "No" is selected (default)
    const prepNo = page.locator("input[id$='rblPREP_IND_1']").first();
    if (await prepNo.isVisible({ timeout: 2000 }).catch(() => false)) {
        const checked = await prepNo.isChecked().catch(() => false);
        if (!checked) {
            await prepNo.click();
            console.log('[ESign] Preparer → No');
            await sleep(500);
        }
    }

    // 2. Passport number field (PPTNumTbx)
    const passportNum = profile.passport?.number || profile.passportNumber || '';
    const passportInput = page.locator("input[id$='_PPTNumTbx']").first();
    if (await passportInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await passportInput.fill(passportNum);
        console.log(`[ESign] Passport number preenchido: ${passportNum.substring(0, 3)}***`);
    } else {
        console.warn('[ESign] ⚠️ Campo PPTNumTbx não encontrado');
    }

    // 3. Solve CAPTCHA (CodeTextBox)
    if (await hasCaptchaOnPage(page, 3000)) {
        const captchaResult = await solveCaptchaOnPage(page, captchaMode, config, {
            label: 'ESign',
            tmpFilename: 'captcha_esign.png',
            maxAttempts: 5,
        });
        if (!captchaResult.success) {
            return { success: false, error: 'ESign: CAPTCHA não resolvido após 3 tentativas', cause: 'captcha_failed' };
        }
        console.log('[ESign] CAPTCHA resolvido');
    }

    // 4. Click "Sign and Submit Application" (btnSignApp)
    const signBtn = page.locator("input[id$='_btnSignApp']").first();
    if (await signBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[ESign] ✍️ Clicando "Sign and Submit Application"...');
        await signBtn.click();
        await sleep(2000);
        await waitForPageReady(page);

        // Check for validation errors
        const valSummary = page.locator("div[id$='_ValidationSummary1']").first();
        const hasValError = await valSummary.isVisible({ timeout: 1000 }).catch(() => false);
        if (hasValError) {
            const errText = await valSummary.innerText().catch(() => '');
            if (errText.trim()) {
                console.warn(`[ESign] ⚠️ Validation error: ${errText.trim().substring(0, 200)}`);
                return { success: false, error: `ESign validation: ${errText.trim().substring(0, 200)}`, cause: 'validation_error' };
            }
        }

        console.log('[ESign] ✅ Aplicação assinada');
    } else {
        console.warn('[ESign] ⚠️ Botão btnSignApp não encontrado');
        return { success: false, error: 'Sign and Submit button not found' };
    }

    // 5. Wait for "Next: Confirmation" to become enabled
    const nextBtn = page.locator("input[id$='_UpdateButton3']").first();
    try {
        await page.waitForFunction(() => {
            const btn = document.querySelector("input[id$='_UpdateButton3']");
            return btn && !btn.disabled;
        }, { timeout: 10000 });
        console.log('[ESign] ✅ Botão "Next: Confirmation" habilitado');
    } catch {
        console.warn('[ESign] ⚠️ Botão Next não habilitou em 10s — tentando clicar mesmo assim');
    }

    // 6. Click "Next: Confirmation"
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const urlBefore = page.url();
        console.log('[ESign] Clicando "Next: Confirmation"...');
        
        // Remove disabled attribute via JS if still disabled
        await page.evaluate(() => {
            const btn = document.querySelector("input[id$='_UpdateButton3']");
            if (btn && btn.disabled) btn.disabled = false;
        }).catch(() => {});
        
        await nextBtn.click({ timeout: 15000 });
        await waitForUrlChange(page, urlBefore);
        await waitForPageReady(page);
        console.log('[ESign] ✅ Navegou para Confirmation');
        return { success: true };
    }

    return { success: false, error: 'Next: Confirmation button not found after sign' };
}

module.exports = { handleESignPage };
