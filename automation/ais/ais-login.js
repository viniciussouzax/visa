// ============================================================
// AIS Login — Authenticates into AIS and returns active session
// Reusable: returns { browser, page } for next steps
// ============================================================
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { sleep } = require('../helpers/postback');

const AIS_LOGIN_URL = 'https://ais.usvisa-info.com/pt-br/niv/users/sign_in';

/**
 * Login to AIS and return an active session.
 *
 * @param {object} options
 * @param {string} options.email
 * @param {string} options.password
 * @param {boolean} [options.headless=true]
 * @param {string}  [options.proxyUrl]
 * @param {string}  [options.capmonsterKey] - For hCaptcha if present
 * @param {import('playwright').Browser} [options.existingBrowser]
 * @returns {Promise<{ success: boolean, browser?, page?, error?: string }>}
 */
async function loginAIS({
    email,
    password,
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
                try {
                    const parsed = new URL(proxyUrl);
                    launchOpts.proxy = {
                        server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
                        username: decodeURIComponent(parsed.username),
                        password: decodeURIComponent(parsed.password),
                    };
                } catch (e) {
                    console.warn(`[AIS-Login] ⚠️ Proxy inválido: ${e.message}`);
                }
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

        // ── 2) NAVIGATE TO LOGIN ──
        console.log(`[AIS-Login] 1/4 Navegando para ${AIS_LOGIN_URL}`);
        await page.goto(AIS_LOGIN_URL, { waitUntil: 'domcontentloaded' });
        await sleep(1000 + Math.random() * 1000);

        // ── 3) FILL CREDENTIALS ──
        console.log(`[AIS-Login] 2/4 Preenchendo credenciais...`);

        // Email
        await page.locator('#user_email').click();
        await page.locator('#user_email').fill('');
        await sleep(200 + Math.random() * 300);
        await page.locator('#user_email').type(email, { delay: 30 + Math.random() * 50 });
        await sleep(500 + Math.random() * 500);

        // Password
        await page.locator('#user_password').click();
        await page.locator('#user_password').fill('');
        await sleep(200 + Math.random() * 200);
        await page.locator('#user_password').type(password, { delay: 40 + Math.random() * 60 });
        await sleep(500 + Math.random() * 500);

        // Check privacy checkbox if present
        const policyBox = page.locator('#policy_confirmed');
        const hasPolicy = await policyBox.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasPolicy) {
            const isChecked = await policyBox.isChecked().catch(() => false);
            if (!isChecked) {
                const wrapper = policyBox.locator('xpath=ancestor::div[contains(@class,"icheckbox")]');
                await wrapper.click().catch(async () => {
                    await policyBox.check({ force: true });
                });
                await sleep(500);
                console.log(`[AIS-Login]    Política aceita ✅`);
            }
        }

        console.log(`[AIS-Login] 2/4 ✅ Credenciais preenchidas`);

        // ── 4) HANDLE hCAPTCHA ──
        const hasCaptcha = await page.locator('.h-captcha, [data-hcaptcha-widget-id], iframe[src*="hcaptcha"]')
            .isVisible({ timeout: 3000 }).catch(() => false);

        if (hasCaptcha) {
            console.log(`[AIS-Login] 3/4 🔐 hCaptcha detectado`);
            if (!capmonsterKey) {
                console.warn(`[AIS-Login] 3/4 ⚠️ CapMonster key não configurada`);
                return { success: false, error: 'CapMonster key required for hCaptcha', cause: 'captcha_no_key', browser, page };
            }
            try {
                const siteKey = await page.locator('.h-captcha').getAttribute('data-sitekey')
                    || await page.locator('[data-hcaptcha-widget-id]').getAttribute('data-sitekey');
                if (!siteKey) throw new Error('Could not find hCaptcha sitekey');

                const { solveHCaptcha } = require('../captcha');
                const token = await solveHCaptcha(AIS_LOGIN_URL, siteKey, capmonsterKey);

                await page.evaluate((tkn) => {
                    document.querySelectorAll('[name="h-captcha-response"], [name="g-recaptcha-response"]')
                        .forEach(el => { el.value = tkn; });
                    if (window.hcaptcha) window.hcaptcha.execute();
                }, token);

                console.log(`[AIS-Login] 3/4 ✅ hCaptcha resolvido`);
                await sleep(500);
            } catch (captchaErr) {
                console.error(`[AIS-Login] 3/4 ❌ hCaptcha error: ${captchaErr.message}`);
                return { success: false, error: captchaErr.message, cause: 'captcha_failed', browser, page };
            }
        } else {
            console.log(`[AIS-Login] 3/4 Sem hCaptcha`);
        }

        // ── 5) SUBMIT ──
        console.log(`[AIS-Login] 4/4 Submetendo login...`);

        await Promise.all([
            page.waitForURL('**/niv/**', { timeout: 30000 }).catch(() => null),
            page.locator('input[name="commit"]').click(),
        ]);

        await sleep(2000);

        // ── 6) CHECK RESULT ──
        const currentUrl = page.url();
        const bodyText = await page.textContent('body').catch(() => '');

        // Success: redirected to dashboard or groups page
        if (
            currentUrl.includes('/groups') ||
            currentUrl.includes('/account') ||
            currentUrl.includes('/niv') && !currentUrl.includes('sign_in')
        ) {
            console.log(`[AIS-Login] ✅ Login bem-sucedido! URL: ${currentUrl}`);

            // Screenshot
            await page.screenshot({
                path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_login_success.png'),
            }).catch(() => {});

            return { success: true, browser, page };
        }

        // Check for error messages
        const errorMsg = await page.locator('.flash_error, .alert-box.alert, .field_with_errors')
            .first().textContent().catch(() => '');

        if (errorMsg) {
            console.error(`[AIS-Login] ❌ Erro: ${errorMsg.trim().substring(0, 300)}`);
            return { success: false, error: errorMsg.trim(), browser, page };
        }

        console.warn(`[AIS-Login] ⚠️ Estado desconhecido — URL: ${currentUrl}`);
        return { success: false, error: `Unknown state: ${currentUrl}`, browser, page };

    } catch (error) {
        console.error(`[AIS-Login] ❌ ${error.message}`);
        return { success: false, error: error.message, browser, page };
    }
}

module.exports = { loginAIS, AIS_LOGIN_URL };
