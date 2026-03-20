// ============================================================
// AIS Account Confirmation — Clicks the confirmation URL
// The URL comes from email: ?confirmation_token=XXXXX
// ============================================================
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const { sleep } = require('../helpers/postback');

/**
 * Click the AIS confirmation URL to activate the account.
 * 
 * @param {object} options
 * @param {string} options.confirmationUrl - Full URL with ?confirmation_token=XXX
 * @param {boolean} [options.headless=true] - Browser headless mode
 * @param {string} [options.proxyUrl] - Optional proxy URL
 * @param {import('playwright').Browser} [options.existingBrowser] - Reuse browser
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function confirmAisAccount({
    confirmationUrl,
    headless = true,
    proxyUrl = null,
    existingBrowser = null,
}) {
    let browser, page;

    try {
        if (!confirmationUrl || !confirmationUrl.includes('confirmation_token')) {
            return { success: false, error: 'Invalid confirmation URL — missing confirmation_token' };
        }

        // ── 1) LAUNCH BROWSER ──
        if (existingBrowser) {
            browser = existingBrowser;
            const ctx = browser.contexts()[0] || await browser.newContext();
            page = await ctx.newPage();
        } else {
            const launchOpts = {
                headless,
                args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
            };
            if (proxyUrl) {
                const { buildProxyOpts } = require('../helpers/proxy-helper');
                launchOpts.proxy = buildProxyOpts(proxyUrl, { sessionId: `ais_confirm_${Date.now()}` });
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

        // ── 2) NAVIGATE TO CONFIRMATION URL ──
        console.log(`[AIS-Confirm] 1/3 Navigating to confirmation URL...`);
        console.log(`[AIS-Confirm] URL: ${confirmationUrl.substring(0, 80)}...`);
        
        await page.goto(confirmationUrl, { waitUntil: 'domcontentloaded' });
        await sleep(2000);

        // ── 3) CHECK RESULT ──
        const currentUrl = page.url();
        const bodyText = await page.textContent('body').catch(() => '');

        // Success indicators
        if (
            currentUrl.includes('sign_in') ||
            bodyText.includes('confirmada') ||
            bodyText.includes('confirmed') ||
            bodyText.includes('Acessar')
        ) {
            console.log(`[AIS-Confirm] 2/3 ✅ Account confirmed! Redirected to login.`);
            
            // Take screenshot as proof
            await page.screenshot({
                path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_confirmed.png'),
            });
            console.log(`[AIS-Confirm] 3/3 ✅ Screenshot saved`);
            
            return { success: true };
        }

        // Error indicators
        if (bodyText.includes('expired') || bodyText.includes('expirado')) {
            console.error(`[AIS-Confirm] ❌ Token expired`);
            return { success: false, error: 'Confirmation token expired' };
        }

        if (bodyText.includes('invalid') || bodyText.includes('inválido')) {
            console.error(`[AIS-Confirm] ❌ Token invalid`);
            return { success: false, error: 'Confirmation token invalid' };
        }

        console.warn(`[AIS-Confirm] ⚠️ Unknown state — URL: ${currentUrl}`);
        return { success: false, error: `Unknown confirmation state. URL: ${currentUrl}` };

    } catch (error) {
        console.error(`[AIS-Confirm] ❌ ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        if (!existingBrowser && browser) {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = { confirmAisAccount };
