// ============================================================
// AIS Signup Automation — Fills the registration form
// URL: https://ais.usvisa-info.com/pt-br/niv/signup
// Uses playwright-extra with stealth (same as DS-160 filler)
// ============================================================
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { sleep } = require('../helpers/postback');

// ====================================================================
// AIS Signup Form IDs (from AISmap)
// ====================================================================
const FORM_FIELDS = {
    firstName:          '#user_first_name',
    lastName:           '#user_last_name',
    email:              '#user_email',
    emailConfirmation:  '#user_email_confirmation',
    password:           '#user_password',
    passwordConfirm:    '#user_password_confirmation',
    policyCheckbox:     '#policy_confirmed',
    mobileAlerts:       '#user_mobile_alerts',
    submitButton:       'input[name="commit"][value="Criar conta"]',
};

const AIS_SIGNUP_URL = 'https://ais.usvisa-info.com/pt-br/niv/signup';

/**
 * Fill the AIS signup form.
 * 
 * @param {object} options
 * @param {string} options.firstName - Applicant first name
 * @param {string} options.lastName - Applicant last name
 * @param {string} options.email - Email alias (from addy.io)
 * @param {string} options.password - Generated password (≥16 chars)
 * @param {boolean} [options.dryRun=false] - If true, fill but don't submit
 * @param {boolean} [options.headless=true] - Browser headless mode
 * @param {string} [options.proxyUrl] - Optional proxy URL
 * @param {string} [options.capmonsterKey] - CapMonster API key for hCaptcha
 * @param {import('playwright').Browser} [options.existingBrowser] - Reuse browser
 * @returns {Promise<{ success: boolean, error?: string, browser?, page? }>}
 */
async function fillAisSignup({
    firstName,
    lastName,
    email,
    password,
    dryRun = false,
    headless = true,
    proxyUrl = null,
    capmonsterKey = null,
    existingBrowser = null,
}) {
    let browser, page;
    
    try {
        // ── 1) LAUNCH BROWSER ──
        if (existingBrowser) {
            browser = existingBrowser;
            const ctx = browser.contexts()[0] || await browser.newContext();
            page = await ctx.newPage();
        } else {
            const launchOpts = {
                headless,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                ],
            };
            if (proxyUrl) {
                const { buildProxyOpts } = require('../helpers/proxy-helper');
                launchOpts.proxy = buildProxyOpts(proxyUrl, { sessionId: `ais_signup_${Date.now()}` });
            }
            browser = await chromium.launch(launchOpts);
            const context = await browser.newContext({
                locale: 'pt-BR',
                timezoneId: 'America/Sao_Paulo',
            });
            page = await context.newPage();
        }
        
        page.setDefaultTimeout(15000);
        page.setDefaultNavigationTimeout(30000);
        
        // ── 2) NAVIGATE TO SIGNUP ──
        console.log(`[AIS-Signup] 1/5 Navigating to ${AIS_SIGNUP_URL}`);
        await page.goto(AIS_SIGNUP_URL, { waitUntil: 'domcontentloaded' });
        await sleep(1000 + Math.random() * 1000);
        
        // Verify we're on the signup page
        const pageTitle = await page.locator('h1.text').textContent().catch(() => '');
        if (!pageTitle.includes('Registrar')) {
            console.error(`[AIS-Signup] ❌ Not on signup page. Title: "${pageTitle}"`);
            return { success: false, error: `Not on signup page: ${pageTitle}`, browser, page };
        }
        console.log(`[AIS-Signup] 1/5 ✅ On signup page`);
        
        // ── 3) FILL FORM FIELDS ──
        console.log(`[AIS-Signup] 2/5 Filling form fields...`);
        
        // First Name — human-like: click → clear → type
        await page.locator(FORM_FIELDS.firstName).click();
        await page.locator(FORM_FIELDS.firstName).fill('');
        await sleep(200 + Math.random() * 300);
        await page.locator(FORM_FIELDS.firstName).type(firstName, { delay: 50 + Math.random() * 80 });
        await sleep(800 + Math.random() * 700);
        console.log(`[AIS-Signup] → Nome: ${firstName}`);
        
        // Last Name
        await page.locator(FORM_FIELDS.lastName).click();
        await page.locator(FORM_FIELDS.lastName).fill('');
        await sleep(200 + Math.random() * 300);
        await page.locator(FORM_FIELDS.lastName).type(lastName, { delay: 50 + Math.random() * 80 });
        await sleep(800 + Math.random() * 700);
        console.log(`[AIS-Signup] → Sobrenome: ${lastName}`);
        
        // Email
        await page.locator(FORM_FIELDS.email).click();
        await page.locator(FORM_FIELDS.email).fill('');
        await sleep(200 + Math.random() * 200);
        await page.locator(FORM_FIELDS.email).type(email, { delay: 30 + Math.random() * 50 });
        await sleep(800 + Math.random() * 700);
        console.log(`[AIS-Signup] → Email: ${email}`);
        
        // Email Confirmation
        await page.locator(FORM_FIELDS.emailConfirmation).click();
        await page.locator(FORM_FIELDS.emailConfirmation).fill('');
        await sleep(200 + Math.random() * 200);
        await page.locator(FORM_FIELDS.emailConfirmation).type(email, { delay: 30 + Math.random() * 50 });
        await sleep(800 + Math.random() * 700);
        console.log(`[AIS-Signup] → Email confirmação: ✅`);
        
        // Password
        await page.locator(FORM_FIELDS.password).click();
        await page.locator(FORM_FIELDS.password).fill('');
        await sleep(200 + Math.random() * 200);
        await page.locator(FORM_FIELDS.password).type(password, { delay: 40 + Math.random() * 60 });
        await sleep(600 + Math.random() * 500);
        
        // Password Confirmation
        await page.locator(FORM_FIELDS.passwordConfirm).click();
        await page.locator(FORM_FIELDS.passwordConfirm).fill('');
        await sleep(200 + Math.random() * 200);
        await page.locator(FORM_FIELDS.passwordConfirm).type(password, { delay: 40 + Math.random() * 60 });
        await sleep(600 + Math.random() * 500);
        console.log(`[AIS-Signup] → Senha: ********** (${password.length} chars)`);
        
        // Uncheck mobile alerts — click the iCheck wrapper (human-like)
        const smsWrapper = page.locator('#user_mobile_alerts').locator('xpath=ancestor::div[contains(@class,"icheckbox")]');
        const smsChecked = await page.locator('#user_mobile_alerts').isChecked().catch(() => true);
        if (smsChecked) {
            await smsWrapper.scrollIntoViewIfNeeded();
            await sleep(300 + Math.random() * 400);
            await smsWrapper.click();
            await sleep(800 + Math.random() * 500);
            console.log(`[AIS-Signup] → SMS alerts: unchecked ✅`);
        }
        
        // Check privacy policy — click the iCheck wrapper (human-like)
        const policyWrapper = page.locator('#policy_confirmed').locator('xpath=ancestor::div[contains(@class,"icheckbox")]');
        const policyChecked = await page.locator('#policy_confirmed').isChecked().catch(() => false);
        if (!policyChecked) {
            await policyWrapper.scrollIntoViewIfNeeded();
            await sleep(300 + Math.random() * 400);
            await policyWrapper.click();
            await sleep(800 + Math.random() * 500);
            console.log(`[AIS-Signup] → Política: checked ✅`);
        }
        
        console.log(`[AIS-Signup] 2/5 ✅ All fields filled`);
        
        // ── 4) DETECT hCAPTCHA ──
        const hasCaptcha = await page.locator('.h-captcha, [data-hcaptcha-widget-id], iframe[src*="hcaptcha"]').isVisible({ timeout: 3000 }).catch(() => false);
        if (hasCaptcha) {
            console.log(`[AIS-Signup] 3/5 🔐 hCaptcha detected`);
            if (dryRun) {
                console.log(`[AIS-Signup] 3/5 DRY RUN — skipping hCaptcha`);
            } else if (!capmonsterKey) {
                console.warn(`[AIS-Signup] 3/5 ⚠️ CapMonster key não configurada — não é possível resolver`);
                return { success: false, error: 'CapMonster key required for hCaptcha', cause: 'captcha_no_key', browser, page };
            } else {
                try {
                    const siteKey = await page.locator('.h-captcha').getAttribute('data-sitekey')
                        || await page.locator('[data-hcaptcha-widget-id]').getAttribute('data-sitekey');
                    if (!siteKey) throw new Error('Could not find hCaptcha sitekey');
                    const { solveHCaptcha } = require('../captcha');
                    const token = await solveHCaptcha(AIS_SIGNUP_URL, siteKey, capmonsterKey);
                    await page.evaluate((tkn) => {
                        document.querySelectorAll('[name="h-captcha-response"], [name="g-recaptcha-response"]').forEach(el => { el.value = tkn; });
                        if (window.hcaptcha) window.hcaptcha.execute();
                    }, token);
                    console.log(`[AIS-Signup] 3/5 ✅ hCaptcha solved and injected`);
                    await sleep(500);
                } catch (captchaErr) {
                    console.error(`[AIS-Signup] 3/5 ❌ hCaptcha error: ${captchaErr.message}`);
                    return { success: false, error: captchaErr.message, cause: 'captcha_failed', browser, page };
                }
            }
        } else {
            console.log(`[AIS-Signup] 3/5 No hCaptcha detected`);
        }
        
        // ── 5) SUBMIT ──
        if (dryRun) {
            console.log(`[AIS-Signup] 4/5 🧪 DRY RUN — NOT submitting`);
            await page.screenshot({ path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_signup_dryrun.png') });
            console.log(`[AIS-Signup] 5/5 ✅ Dry run complete — screenshot saved`);
            return { success: true, dryRun: true, browser, page };
        }
        
        // Screenshot before submit for debugging
        await page.screenshot({ path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_signup_before_submit.png') }).catch(() => {});
        
        console.log(`[AIS-Signup] 4/5 Submitting form...`);
        
        // Click submit and wait for navigation
        await Promise.all([
            page.waitForURL('**/account/inactive**', { timeout: 30000 }).catch(() => null),
            page.locator(FORM_FIELDS.submitButton).click(),
        ]);
        
        // Wait a bit for page to stabilize
        await sleep(2000);
        
        // Take screenshot after submit
        await page.screenshot({ path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_signup_after_submit.png') }).catch(() => {});
        
        // Check result
        const currentUrl = page.url();
        const pageContent = await page.textContent('body').catch(() => '');
        
        console.log(`[AIS-Signup] 5/5 Post-submit URL: ${currentUrl}`);
        
        if (currentUrl.includes('inactive') || pageContent.includes('Ativar Sua Conta')) {
            console.log(`[AIS-Signup] 5/5 ✅ Account created! Waiting for email confirmation.`);
            return { success: true, browser, page };
        }
        
        // Check for errors on the page
        const errorMsg = await page.locator('.field_with_errors, .error, .alert-box.alert, .flash_error').first().textContent().catch(() => '');
        if (errorMsg) {
            console.error(`[AIS-Signup] 5/5 ❌ Error: ${errorMsg.trim().substring(0, 300)}`);
            return { success: false, error: errorMsg.trim(), browser, page };
        }
        
        console.warn(`[AIS-Signup] 5/5 ⚠️ Unknown state — URL: ${currentUrl}`);
        return { success: false, error: `Unknown state: ${currentUrl}`, browser, page };
        
    } catch (error) {
        console.error(`[AIS-Signup] ❌ ${error.message}`);
        return { success: false, error: error.message, browser, page };
    }
}

module.exports = { fillAisSignup, FORM_FIELDS, AIS_SIGNUP_URL };
