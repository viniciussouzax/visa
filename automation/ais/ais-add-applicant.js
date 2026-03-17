// ============================================================
// AIS Add Applicant — Fills the "Novo Solicitante" form
// URL: /pt-br/niv/schedule/:id/applicants/new
// Requires active session from ais-login.js
// ============================================================
const path = require('path');
const { sleep } = require('../helpers/postback');
const { ds160CountryToAIS, ds160VisaToAIS } = require('./ais-country-map');

// ====================================================================
// AIS Applicant Form Selectors (from AISmap)
// ====================================================================
const FORM = {
    firstName:       '#applicant_first_name',
    lastName:        '#applicant_last_name',
    passportCountry: '#applicant_passport_country_code',          // ISO2 UPPER
    birthCountry:    '#applicant_birth_country_code',             // ISO2 UPPER
    residencyCountry:'#applicant_permanent_residency_country_code', // ISO2 lower!
    passportNumber:  '#applicant_passport_number',
    ds160Number:     '#applicant_ds160_number',
    visaClass:       '#applicant_visa_class_id',                  // Numeric internal
    dobDay:          '#applicant_date_of_birth_3i',
    dobMonth:        '#applicant_date_of_birth_2i',
    dobYear:         '#applicant_date_of_birth_1i',
    submit:          'input[name="commit"]',
};

/**
 * Parse "YYYY-MM-DD" or "DD/MM/YYYY" into { day, month, year }.
 * Day and month returned as plain numbers (no leading zero).
 */
function parseDOB(dob) {
    if (!dob) return null;
    let y, m, d;
    if (dob.includes('-')) {
        // YYYY-MM-DD
        [y, m, d] = dob.split('-');
    } else if (dob.includes('/')) {
        // DD/MM/YYYY
        [d, m, y] = dob.split('/');
    } else {
        return null;
    }
    return {
        day:   String(parseInt(d, 10)),   // "5" not "05"
        month: String(parseInt(m, 10)),   // "3" not "03"
        year:  String(parseInt(y, 10)),   // "1990"
    };
}

/**
 * Human-like text input: click → clear → type with random delay.
 */
async function humanType(page, selector, value, label) {
    await page.locator(selector).click();
    await page.locator(selector).fill('');
    await sleep(200 + Math.random() * 300);
    await page.locator(selector).type(value, { delay: 40 + Math.random() * 60 });
    await sleep(600 + Math.random() * 500);
    if (label) console.log(`[AIS-AddApplicant]    → ${label}: ${value}`);
}

/**
 * Select a value in a <select> dropdown.
 */
async function humanSelect(page, selector, value, label) {
    await page.locator(selector).selectOption(value);
    await sleep(400 + Math.random() * 400);
    if (label) console.log(`[AIS-AddApplicant]    → ${label}: ${value}`);
}

/**
 * Add an applicant to the AIS account.
 * Requires an active logged-in page from ais-login.js.
 *
 * @param {object} options
 * @param {import('playwright').Page} options.page - Active logged-in page
 * @param {import('playwright').Browser} options.browser - Active browser
 * @param {object} options.applicantData - Applicant info
 * @param {string} options.applicantData.firstName
 * @param {string} options.applicantData.lastName
 * @param {string} options.applicantData.passportNumber
 * @param {string} options.applicantData.passportCountry - ISO2 or DS-160 label
 * @param {string} options.applicantData.birthCountry - ISO2 or DS-160 label
 * @param {string} options.applicantData.residencyCountry - ISO2 or DS-160 label
 * @param {string} options.applicantData.ds160Number - DS-160 barcode
 * @param {string} options.applicantData.visaClassId - AIS numeric ID or DS-160 code
 * @param {string} options.applicantData.purposeOfTrip - DS-160 visa code (fallback)
 * @param {string} [options.applicantData.dob] - "YYYY-MM-DD" or "DD/MM/YYYY"
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<{ success: boolean, error?: string, needsMapping?: boolean }>}
 */
async function addApplicantAIS({ page, browser, applicantData, dryRun = false }) {
    try {
        const a = applicantData;
        console.log(`[AIS-AddApplicant] 🆕 Adicionando: ${a.firstName} ${a.lastName}`);

        // ── 1) NAVIGATE TO ADD APPLICANT ──
        console.log(`[AIS-AddApplicant] 1/5 Navegando para formulário de novo solicitante...`);

        const currentUrl = page.url();
        console.log(`[AIS-AddApplicant]    URL atual: ${currentUrl}`);

        // Strategy: find the "Continue" or "Add Applicant" link
        // After login, page is at /account or /groups or /schedule/:id/continue
        let navigated = false;

        // Try clicking "Continue" button/link first
        const continueBtn = page.locator('a.button, a:has-text("Continue"), a:has-text("Continuar")').first();
        if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`[AIS-AddApplicant]    Clicando "Continue"...`);
            await continueBtn.click();
            await sleep(2000 + Math.random() * 1000);
            navigated = true;
        }

        // Look for "Add Applicant" / "Adicionar Solicitante" link
        const addBtn = page.locator('a:has-text("Add Applicant"), a:has-text("Adicionar"), a[href*="applicants/new"]').first();
        if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`[AIS-AddApplicant]    Clicando "Add Applicant"...`);
            await addBtn.click();
            await sleep(2000 + Math.random() * 1000);
            navigated = true;
        }

        // If we couldn't navigate by clicking, try finding the URL pattern
        if (!navigated || !page.url().includes('applicants/new')) {
            // Extract schedule ID from current URL or page links
            const scheduleMatch = page.url().match(/schedule\/(\d+)/);
            if (scheduleMatch) {
                const scheduleId = scheduleMatch[1];
                const directUrl = `https://ais.usvisa-info.com/pt-br/niv/schedule/${scheduleId}/applicants/new`;
                console.log(`[AIS-AddApplicant]    Navegando direto: ${directUrl}`);
                await page.goto(directUrl, { waitUntil: 'domcontentloaded' });
                await sleep(1500 + Math.random() * 1000);
                navigated = true;
            } else {
                // Scan all links for schedule pattern
                const links = await page.locator('a[href*="schedule"]').all();
                for (const link of links) {
                    const href = await link.getAttribute('href').catch(() => '');
                    const match = href.match(/schedule\/(\d+)/);
                    if (match) {
                        const directUrl = `https://ais.usvisa-info.com/pt-br/niv/schedule/${match[1]}/applicants/new`;
                        console.log(`[AIS-AddApplicant]    Encontrou schedule ${match[1]}, navegando...`);
                        await page.goto(directUrl, { waitUntil: 'domcontentloaded' });
                        await sleep(1500 + Math.random() * 1000);
                        navigated = true;
                        break;
                    }
                }
            }
        }

        // Verify we're on the right page
        const formExists = await page.locator('#applicant-creation-form, #applicant_first_name').isVisible({ timeout: 5000 }).catch(() => false);
        if (!formExists) {
            const bodyText = await page.textContent('body').catch(() => '');
            console.error(`[AIS-AddApplicant] ❌ Não está na página do formulário`);
            console.error(`[AIS-AddApplicant]    URL: ${page.url()}`);
            await page.screenshot({ path: path.join(__dirname, '..', '..', 'tmp', 'ais_add_nav_error.png') }).catch(() => {});
            return { success: false, error: `Could not navigate to applicant form. URL: ${page.url()}` };
        }

        console.log(`[AIS-AddApplicant] 1/5 ✅ No formulário de novo solicitante`);

        // ── 2) FILL FORM FIELDS ──
        console.log(`[AIS-AddApplicant] 2/5 Preenchendo dados do solicitante...`);

        // Text fields — human-like typing
        await humanType(page, FORM.firstName, a.firstName, 'Nome');
        await humanType(page, FORM.lastName, a.lastName, 'Sobrenome');

        // Select fields — country selects
        const passportISO = ds160CountryToAIS(a.passportCountry, false);
        const birthISO = ds160CountryToAIS(a.birthCountry, false);
        const residencyISO = ds160CountryToAIS(a.residencyCountry, true); // lowercase!

        await humanSelect(page, FORM.passportCountry, passportISO, 'País Passaporte');
        await humanSelect(page, FORM.birthCountry, birthISO, 'País Nascimento');
        await humanSelect(page, FORM.residencyCountry, residencyISO, 'País Residência (lower)');

        // Passport number
        if (a.passportNumber) {
            await humanType(page, FORM.passportNumber, a.passportNumber, 'Nº Passaporte');
        }

        // DS-160 barcode number
        if (a.ds160Number) {
            await humanType(page, FORM.ds160Number, a.ds160Number, 'Nº DS-160');
        } else {
            console.warn(`[AIS-AddApplicant]    ⚠️ DS-160 number missing!`);
        }

        // Visa class — convert DS-160 code to AIS numeric
        const visaId = a.visaClassId || ds160VisaToAIS(a.purposeOfTrip);
        await humanSelect(page, FORM.visaClass, visaId, 'Classe Visto');

        // Date of birth — 3 separate selects
        const dob = parseDOB(a.dob);
        if (dob) {
            await humanSelect(page, FORM.dobDay, dob.day, 'DOB Dia');
            await humanSelect(page, FORM.dobMonth, dob.month, 'DOB Mês');
            await humanSelect(page, FORM.dobYear, dob.year, 'DOB Ano');
        } else {
            console.warn(`[AIS-AddApplicant]    ⚠️ DOB missing or invalid: "${a.dob}"`);
        }

        console.log(`[AIS-AddApplicant] 2/5 ✅ Todos os campos preenchidos`);

        // ── 3) SCREENSHOT PRE-SUBMIT ──
        await page.screenshot({
            path: path.join(__dirname, '..', '..', 'tmp', 'ais_add_before_submit.png'),
        }).catch(() => {});

        // ── 4) SUBMIT ──
        if (dryRun) {
            console.log(`[AIS-AddApplicant] 3/5 🧪 DRY RUN — NÃO submetendo`);
            console.log(`[AIS-AddApplicant] 5/5 ✅ Dry run completo — screenshot salvo`);
            return { success: true, dryRun: true };
        }

        console.log(`[AIS-AddApplicant] 3/5 Submetendo formulário...`);

        await Promise.all([
            page.waitForNavigation({ timeout: 30000 }).catch(() => null),
            page.locator(FORM.submit).click(),
        ]);

        await sleep(2000 + Math.random() * 1000);

        // ── 5) CHECK RESULT ──
        console.log(`[AIS-AddApplicant] 4/5 Verificando resultado...`);

        const resultUrl = page.url();
        const resultText = await page.textContent('body').catch(() => '');

        await page.screenshot({
            path: path.join(__dirname, '..', '..', 'tmp', 'ais_add_after_submit.png'),
        }).catch(() => {});

        // Check for validation errors on the form
        const hasErrors = await page.locator('.field_with_errors, .error-message, .flash_error, .alert-box.alert').first()
            .isVisible({ timeout: 2000 }).catch(() => false);

        if (hasErrors) {
            const errorText = await page.locator('.field_with_errors, .error-message, .flash_error, .alert-box.alert').first()
                .textContent().catch(() => 'Unknown error');
            console.error(`[AIS-AddApplicant] ❌ Erro no formulário: ${errorText.trim().substring(0, 300)}`);
            return { success: false, error: errorText.trim() };
        }

        // Check if we moved past the form (success)
        if (!resultUrl.includes('applicants/new')) {
            console.log(`[AIS-AddApplicant] 5/5 ✅ Solicitante adicionado com sucesso!`);
            console.log(`[AIS-AddApplicant]    URL pós-submit: ${resultUrl}`);

            // Try to find boleto/MRV payment link
            let boletoUrl = null;
            const boletoLink = page.locator('a[href*="payment"], a[href*="boleto"], a:has-text("MRV"), a:has-text("pagamento")').first();
            if (await boletoLink.isVisible({ timeout: 3000 }).catch(() => false)) {
                boletoUrl = await boletoLink.getAttribute('href').catch(() => null);
                if (boletoUrl && !boletoUrl.startsWith('http')) {
                    boletoUrl = `https://ais.usvisa-info.com${boletoUrl}`;
                }
                console.log(`[AIS-AddApplicant]    💰 Boleto URL: ${boletoUrl}`);
            }

            return { success: true, boletoUrl };
        }

        // Still on the form — might be an undetected error
        console.warn(`[AIS-AddApplicant] ⚠️ Ainda na página do formulário após submit`);
        return { success: false, error: `Still on form after submit. URL: ${resultUrl}` };

    } catch (error) {
        console.error(`[AIS-AddApplicant] ❌ ${error.message}`);

        // Screenshot on error
        if (page) {
            await page.screenshot({
                path: path.join(__dirname, '..', '..', 'tmp', 'ais_add_applicant_error.png'),
            }).catch(() => {});
        }

        return { success: false, error: error.message };
    }
}

module.exports = { addApplicantAIS, FORM, parseDOB };
