// ============================================================
// AIS Schedule — Create appointment + download receipts
// Requires active session from ais-login.js
// Runs AFTER payment is confirmed
// ============================================================
const { loginAIS } = require('./ais-login');
const { sleep } = require('../helpers/postback');
const path = require('path');

/**
 * Schedule a visa appointment and download confirmation documents.
 *
 * @param {object} options
 * @param {string} options.email - AIS account email
 * @param {string} options.password - AIS account password
 * @param {boolean} [options.headless=true]
 * @param {string} [options.proxyUrl]
 * @param {string} [options.capmonsterKey]
 * @param {object} [options.preferences] - Scheduling preferences
 * @param {string} [options.preferences.location] - Preferred CASV location
 * @param {string} [options.preferences.earliestDate] - Earliest acceptable date
 * @returns {Promise<{
 *   success: boolean,
 *   scheduleDate?: string,
 *   scheduleTime?: string,
 *   scheduleLocation?: string,
 *   paymentReceiptUrl?: string,
 *   confirmationUrl?: string,
 *   error?: string
 * }>}
 */
async function scheduleAIS({
    email,
    password,
    headless = true,
    proxyUrl = null,
    capmonsterKey = null,
    preferences = {},
}) {
    let browser = null;

    try {
        // ── 1) LOGIN ──
        console.log(`[AIS-Schedule] 📅 Iniciando agendamento para ${email}...`);

        const loginResult = await loginAIS({
            email,
            password,
            headless,
            proxyUrl,
            capmonsterKey,
        });

        if (!loginResult.success) {
            return { success: false, error: `Login failed: ${loginResult.error}` };
        }

        browser = loginResult.browser;
        const page = loginResult.page;

        // ── 2) NAVIGATE TO SCHEDULE ──
        console.log(`[AIS-Schedule] 1/5 Navegando para agendamento...`);

        // TODO: Navigate to schedule page
        // Need to identify: URL, date picker, time slots, location selector

        await sleep(2000);

        // ── 3) SELECT DATE/TIME/LOCATION ──
        console.log(`[AIS-Schedule] 2/5 Selecionando data/horário/local...`);

        // TODO: Select first available slot or use preferences
        // preferences.location → filter by CASV location
        // preferences.earliestDate → skip dates before this

        // ── 4) CONFIRM SCHEDULE ──
        console.log(`[AIS-Schedule] 3/5 Confirmando agendamento...`);

        // TODO: Click confirm button

        // ── 5a) DOWNLOAD PAYMENT RECEIPT ──
        console.log(`[AIS-Schedule] 4/5 Baixando comprovante de pagamento...`);

        // TODO: Find and download payment receipt PDF
        // const downloadReceipt = await page.waitForEvent('download', ...);
        // const receiptPath = path.join(__dirname, '..', '..', 'tmp', `ais_receipt_${Date.now()}.pdf`);
        // await downloadReceipt.saveAs(receiptPath);

        // ── 5b) DOWNLOAD SCHEDULE CONFIRMATION ──
        console.log(`[AIS-Schedule] 5/5 Baixando confirmação de agendamento...`);

        // TODO: Find and download schedule confirmation PDF
        // Upload both to Supabase Storage and return URLs

        // Screenshot for debugging
        await page.screenshot({
            path: path.join(__dirname, '..', '..', 'tmp', 'ais_schedule.png'),
        }).catch(() => {});

        // Placeholder return
        console.warn(`[AIS-Schedule] ⚠️ Módulo ainda não implementado — aguardando mapeamento AIS`);
        return {
            success: false,
            error: 'Module not yet implemented — awaiting AIS mapping',
            needsMapping: true,
        };

    } catch (error) {
        console.error(`[AIS-Schedule] ❌ ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = { scheduleAIS };
