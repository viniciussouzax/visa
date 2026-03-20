// ============================================================
// CAPTCHA Handler — unified screenshot → solve → fill pattern
// Eliminates 3 duplicate CAPTCHA blocks in filler.js
// ============================================================
const path = require('path');
const fs = require('fs');
const { solveCaptcha } = require('../captcha');

const TMP = path.join(__dirname, '..', '..', 'tmp');
// Ensure tmp directory exists (critical for Docker containers)
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Solve a CAPTCHA on a DS-160 page.
 * Pattern: locate image → screenshot → solve via API → fill input → return answer
 *
 * @param {import('playwright').Page} page - Playwright page
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {object} config - automation_config row (has capmonster_key, ai_vision_key)
 * @param {object} [options]
 * @param {number}  [options.maxAttempts=3] - Max solve attempts
 * @param {string}  [options.label='Captcha'] - Label for log messages
 * @param {string}  [options.tmpFilename='captcha.png'] - Temp screenshot filename
 * @param {number}  [options.imageTimeout=10000] - Timeout for image visibility
 * @param {number}  [options.settleDelay=300] - Delay after image visible (render settle)
 * @returns {Promise<{ success: boolean, answer?: string, error?: string }>}
 */
async function solveCaptchaOnPage(page, captchaMode, config, options = {}) {
    const {
        maxAttempts = 5,
        label = 'Captcha',
        tmpFilename = 'captcha.png',
        imageTimeout = 10000,
        settleDelay = 300,
    } = options;

    const keys = {
        capmonsterKey: config.capmonster_key,
        aiVisionKey: config.ai_vision_key,
    };

    // Standard DS-160 CAPTCHA selectors
    const IMG_SELECTOR = "img[id$='_CaptchaImage'], img[src*='captcha'], img[id$='c_default_ctl00_sitecontentplaceholder_uclocation_identifycaptcha1_captchaimage']";
    const INPUT_SELECTOR = "input[id$='_txtCodeTextBox'], input[id$='_CodeTextBox']";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // 1. Wait for CAPTCHA image to be visible
            const imgEl = page.locator(IMG_SELECTOR).first();
            await imgEl.waitFor({ state: 'visible', timeout: imageTimeout });
            await sleep(settleDelay);

            // 2. Screenshot → solve
            const imgPath = path.join(TMP, tmpFilename);
            await imgEl.screenshot({ path: imgPath });
            const answer = await solveCaptcha(imgPath, captchaMode, keys);

            console.log(`[${label}] Captcha answer (attempt ${attempt}/${maxAttempts}): ${answer}`);

            // 3. Fill input
            const input = page.locator(INPUT_SELECTOR).first();
            await input.fill('');
            await input.fill(answer);

            return { success: true, answer };
        } catch (e) {
            console.warn(`[${label}] Captcha attempt ${attempt}/${maxAttempts} failed:`, e.message);
            if (attempt < maxAttempts) {
                // Reload captcha image before retrying
                try {
                    const reloadBtn = page.locator('a[id*="ReloadLink"], a[id*="ReloadIcon"], img[id*="ReloadIcon"]').first();
                    if (await reloadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                        await reloadBtn.click();
                        await sleep(1500);
                        console.log('[' + label + '] Captcha image reloaded for retry');
                    }
                } catch { }
                await sleep(1000);
                continue;
            }
            return { success: false, error: e.message };
        }
    }

    return { success: false, error: 'Max attempts reached' };
}

/**
 * Check if a CAPTCHA is visible on the page.
 * @param {import('playwright').Page} page
 * @param {number} [timeout=3000]
 * @returns {Promise<boolean>}
 */
async function hasCaptchaOnPage(page, timeout = 3000) {
    const imgEl = page.locator("img[id$='_CaptchaImage'], img[src*='captcha']").first();
    return imgEl.isVisible({ timeout }).catch(() => false);
}

module.exports = { solveCaptchaOnPage, hasCaptchaOnPage };
