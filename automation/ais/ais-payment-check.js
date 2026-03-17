// ============================================================
// AIS Payment Check — Polls AIS to verify MRV payment status
// Designed for periodic execution (payment is NOT immediate)
// ============================================================
const { loginAIS } = require('./ais-login');
const { sleep } = require('../helpers/postback');

/**
 * Check if MRV payment has been confirmed on AIS.
 * This opens a browser, logs in, checks status, and closes.
 *
 * @param {object} options
 * @param {string} options.email - AIS account email
 * @param {string} options.password - AIS account password
 * @param {boolean} [options.headless=true]
 * @param {string} [options.proxyUrl]
 * @param {string} [options.capmonsterKey]
 * @returns {Promise<{ paid: boolean, error?: string }>}
 */
async function checkPaymentAIS({
    email,
    password,
    headless = true,
    proxyUrl = null,
    capmonsterKey = null,
}) {
    let browser = null;

    try {
        // ── 1) LOGIN ──
        console.log(`[AIS-PaymentCheck] 🔍 Verificando pagamento para ${email}...`);

        const loginResult = await loginAIS({
            email,
            password,
            headless,
            proxyUrl,
            capmonsterKey,
        });

        if (!loginResult.success) {
            return { paid: false, error: `Login failed: ${loginResult.error}` };
        }

        browser = loginResult.browser;
        const page = loginResult.page;

        // ── 2) NAVIGATE TO PAYMENT STATUS ──
        console.log(`[AIS-PaymentCheck] 🔍 Navegando para status de pagamento...`);

        // TODO: Navigate to the correct page that shows payment status
        // This is typically on the applicant group page or payment receipt page
        // Need to identify: URL pattern, success indicators (badge, text, etc.)

        await sleep(2000);

        // ── 3) CHECK STATUS ──
        // TODO: Read the page to determine payment status
        // Look for: paid indicator, receipt available, schedule button enabled
        // const bodyText = await page.textContent('body').catch(() => '');
        // const isPaid = bodyText.includes('Pago') || bodyText.includes('Confirmado');

        // Screenshot for debugging
        await page.screenshot({
            path: require('path').join(__dirname, '..', '..', 'tmp', 'ais_payment_check.png'),
        }).catch(() => {});

        // Placeholder return
        console.warn(`[AIS-PaymentCheck] ⚠️ Módulo ainda não implementado — aguardando mapeamento AIS`);
        return {
            paid: false,
            error: 'Module not yet implemented — awaiting AIS mapping',
            needsMapping: true,
        };

    } catch (error) {
        console.error(`[AIS-PaymentCheck] ❌ ${error.message}`);
        return { paid: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = { checkPaymentAIS };
