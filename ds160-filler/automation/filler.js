// DS-160 Filler — extracted from the working Playwright test
// Uses Playwright's OWN Chromium (not user's Chrome)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { solveCaptcha, solveCaptchaBase64 } = require('./captcha');

// ====================================================================
// FIELD MAP — loaded directly (no cache)
// ====================================================================
const { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } = require('./field-map');

const TMP = path.join(__dirname, '..', 'tmp');

// ====================================================================
// MAIN ENTRY POINT
// ====================================================================
/**
 * Fill a DS-160 application using Playwright's Chromium.
 * @param {object} applicant - Row from 'applicants' table (has .data JSON)
 * @param {object} application - Row from 'applications' table
 * @param {function} onAppId - Callback when application_id is captured (for immediate DB persist)
 * @param {object} config - From automation_config table
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {function} onPage - Callback(pageName) for status updates
 * @param {function} [onPageFilled] - Callback(pageStats) for fill_logs — called after each page is filled
 * @param {object} [existingBrowser] - Reuse this browser instead of creating new
 * @param {object} [existingPage] - Reuse this page instead of creating new
 * @returns {{ success: boolean, applicationId?: string, error?: string, browser, activePage }}
 */
async function fillApplication(applicant, application, onAppId, config, captchaMode, onPage, onPageFilled, existingBrowser, existingPage) {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

    // Build field map from applicant data
    const profile = normalizeProfile(applicant.data);
    const fieldMap = buildDynamicFieldMap(profile);
    console.log(`[Filler] Profile: ${applicant.full_name} | Fields: ${fieldMap.length} | hasSpecificPlans: ${profile.hasSpecificPlans}`);

    // === PRE-FILL VALIDATION: Check required fields exist in JSON ===
    const missingFields = [];
    // Personal 1
    if (!profile.surname) missingFields.push('personal1.surname');
    if (!profile.givenName) missingFields.push('personal1.givenName');
    if (!profile.sex) missingFields.push('personal1.sex');
    if (!profile.maritalStatus) missingFields.push('personal1.maritalStatus');
    if (!profile.dob?.day || !profile.dob?.month || !profile.dob?.year) missingFields.push('personal1.dob');
    if (!profile.cityOfBirth) missingFields.push('personal1.cityOfBirth');
    if (!profile.countryOfBirth) missingFields.push('personal1.countryOfBirth');
    // Personal 2
    if (!profile.nationality) missingFields.push('personal2.nationality');
    // Travel
    if (!profile.purposeOfTrip) missingFields.push('travel.purposeOfTrip');
    if (!profile.travel?.arrivalDate) missingFields.push('travel.arrivalDate');
    if (!profile.travel?.lengthOfStay?.value) missingFields.push('travel.lengthOfStay');
    if (!profile.travel?.usAddress) missingFields.push('travel.usAddress');
    if (!profile.payingForTrip) missingFields.push('travel.payingForTrip');
    // Passport
    if (!profile.passport?.number) missingFields.push('passport.number');
    // Contact
    if (!profile.phone) missingFields.push('addressPhone.phone');
    if (!profile.email) missingFields.push('addressPhone.email');

    if (missingFields.length > 0) {
        console.warn(`[Filler] ⚠️ DADOS FALTANTES (${missingFields.length}): ${missingFields.join(', ')}`);
        return {
            success: false,
            error: `Dados faltantes no formulário: ${missingFields.join(', ')}`,
            cause: 'missing_data',
            missingFields
        };
    }

    let browser, page;
    const visited = []; // Declared outside try so catch can access it

    try {
        if (existingBrowser) {
            // Reuse existing browser instance
            browser = existingBrowser;
            try {
                // Check if browser is still connected
                const contexts = browser.contexts();
                if (contexts.length > 0 && existingPage && !existingPage.isClosed()) {
                    // Reuse existing page
                    page = existingPage;
                    console.log('[Filler] Reutilizando browser e página existentes');
                } else {
                    // Browser alive but page gone — create new page
                    const ctx = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });
                    page = await ctx.newPage();
                    page.setDefaultTimeout(15000);
                    page.setDefaultNavigationTimeout(30000);
                    page.on('dialog', async d => d.accept().catch(() => { }));
                    console.log('[Filler] Reutilizando browser, nova página');
                }
            } catch {
                // Browser crashed — create new one
                existingBrowser = null;
                browser = null;
            }
        }

        if (!browser) {
            // Launch fresh Playwright Chromium
            browser = await chromium.launch({
                headless: false,
                args: ['--disable-blink-features=AutomationControlled']
            });
            const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            page = await context.newPage();
            page.setDefaultTimeout(15000);
            page.setDefaultNavigationTimeout(30000);
            page.on('dialog', async d => d.accept().catch(() => { }));
            console.log('[Filler] Novo browser criado');
        }

        // Anti-detection: hide webdriver flag
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Block unnecessary resources (analytics, tracking) for faster page loads
        await page.route('**/{google-analytics.com,googletagmanager.com,ssl.google-analytics.com,eum.state.gov}/**', route => route.abort());
        await page.route('**/*.{woff,woff2,ttf,otf}', route => route.abort()); // Block fonts (not needed for form filling)

        // =============================================================
        // SMART SESSION DETECTION — decide best action
        // =============================================================
        let skipToFilling = false;  // Skip Landing/Captcha/Security, go straight to fill loop
        let useRetrieve = false;    // Use "Retrieve Application" instead of "Start New"

        if (existingPage && page === existingPage) {
            const currentUrl = page.url();
            const currentPageName = identifyPage(currentUrl);
            console.log(`[Filler] 🔍 Sessão existente detectada — URL: ${currentUrl}, Página: ${currentPageName}`);

            // Scenario A: Already at Review/Confirmation → mark as done immediately
            if (currentPageName === 'Review' || currentPageName === 'Confirmation') {
                console.log(`[Filler] ✅ Sessão já está no ${currentPageName} — marcando como concluído`);
                // Try to capture application_id from page
                const headerAppId = await page.locator("span[id$='_lblAppID'], span[id$='_lblBarcode']").first().innerText().catch(() => '');
                const appMatch = headerAppId.match(/[A-Z]{2}[A-Z0-9]{8,}/);
                if (appMatch) application.application_id = appMatch[0];
                return { success: true, applicationId: application.application_id || null, browser, activePage: page };
            }

            // Scenario B: Active form page → continue from where we left off
            const isTimedOut = currentUrl.includes('TimedOut') || currentUrl.includes('SessionTimedOut');
            const isOnLanding = currentUrl.includes('Default.aspx');
            let sessionExpired = isTimedOut;

            // If on SessionTimedOut page, click OK to dismiss and go back to Landing
            if (isTimedOut) {
                console.log('[Filler] ⏰ Session timeout detectado — clicando OK para voltar ao Landing');
                const okBtn = page.getByRole('button', { name: 'OK' });
                if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await okBtn.click();
                    await page.waitForLoadState('domcontentloaded').catch(() => { });
                    await waitForPageReady(page);
                    console.log('[Filler] ✅ OK clicado, redirecionado para:', page.url());
                }
            }

            if (!isTimedOut && !isOnLanding) {
                // Check page text for session expiry indicators
                const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
                sessionExpired = /timeout|session.*expired|timed out|idle.*too long/i.test(bodyText);
            }

            if (!sessionExpired && !isOnLanding && currentPageName !== 'Unknown' && currentPageName !== 'Landing') {
                console.log(`[Filler] ♻️ Sessão ativa na página: ${currentPageName} — continuando preenchimento`);
                skipToFilling = true;
                await waitForPageReady(page);
            }
            // Scenario C: Session expired/Landing BUT we have an application_id → use Retrieve
            else if (application.application_id) {
                console.log(`[Filler] 🔄 Sessão expirada mas app_id existe (${application.application_id}) — usando Retrieve Application`);
                useRetrieve = true;
            }
            // Scenario D: No app_id → start fresh
            else {
                console.log(`[Filler] 🆕 Sem app_id — iniciando nova aplicação`);
            }
        }
        // No existing page but we have an app_id → also use Retrieve
        else if (application.application_id) {
            console.log(`[Filler] 🔄 Novo browser mas app_id existe (${application.application_id}) — usando Retrieve Application`);
            useRetrieve = true;
        }

        if (!skipToFilling) {
            // Navigate to DS-160 Landing (needed for both Start New and Retrieve)
            await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });
            await waitForPageReady(page);
        }

        if (!skipToFilling) {
            // ============================================================
            // STEP 1: Landing page — location + modal + captcha + Start
            // ============================================================
            onPage('Landing');
            const location = profile.location;

            // 1) Select location — this triggers a postback and may show a modal
            const locSelect = page.locator("select[id$='_ddlLocation']");
            if (await locSelect.isVisible().catch(() => false)) {
                await locSelect.selectOption(location);
                console.log(`[Filler] Location selected: ${location}`);
                await waitForPostback(page);
                await sleep(2000); // Wait for modal to appear after postback
            }

            // 2) Dismiss location info modal if present
            //    Some consulates (e.g. Recife/Brazil) show "Additional Location Information"
            //    modal AFTER selecting location. Must close BEFORE solving captcha.
            const modalOverlay = page.locator('.modalBackground')
                .or(page.locator('[id*="ModalPanel"]'))
                .or(page.locator('[id*="pnlPopup"]'))
                .or(page.locator('[id*="pnlModal"]'))
                .first();
            if (await modalOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('[Filler] Location info modal detected — clicking Close...');
                const closeBtn = page.locator('a:text("Close")')
                    .or(page.locator('a:text("close")'))
                    .or(page.locator('[id*="btnClose"]'))
                    .or(page.locator('[id*="lnkClose"]'))
                    .or(page.locator('input[value="Close"]'))
                    .or(page.locator('input[value="OK"]'))
                    .or(page.locator('.modalPopup a'))
                    .or(page.locator('.modalPopup input[type="button"]'));
                const firstClose = closeBtn.first();
                if (await firstClose.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log('[Filler] Clicking modal close button');
                    await firstClose.click();
                    await sleep(1000);
                }
                await modalOverlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
                await waitForPageReady(page);
                console.log('[Filler] Modal dismissed — page ready for captcha');
            }

            // 3) Solve captcha + click Start or Retrieve (retry if captcha was wrong)
            let landingPassed = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                // Solve captcha — screenshot the captcha element
                try {
                    const keys = { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key };
                    const imgEl = page.locator("img[id$='_CaptchaImage'], img[src*='captcha'], img[id$='c_default_ctl00_sitecontentplaceholder_uclocation_identifycaptcha1_captchaimage']").first();
                    await imgEl.waitFor({ state: 'visible', timeout: 10000 });
                    const imgPath = path.join(TMP, 'captcha.png');
                    await imgEl.screenshot({ path: imgPath });
                    const answer = await solveCaptcha(imgPath, captchaMode, keys);

                    console.log(`[Filler] Captcha answer (attempt ${attempt}): ${answer}`);

                    const input = page.locator("input[id$='_txtCodeTextBox']").first();
                    await input.fill('');
                    await input.fill(answer);
                } catch (e) {
                    console.warn(`[Filler] Captcha attempt ${attempt} failed:`, e.message);
                    if (attempt < 3) { await sleep(2000); continue; }
                    return { success: false, error: 'Captcha não resolvido após 3 tentativas' };
                }

                // Dismiss any modal that might be covering buttons
                const modalBg = page.locator('.modalBackground').first();
                if (await modalBg.isVisible({ timeout: 1000 }).catch(() => false)) {
                    console.log('[Filler] Modal covering buttons — dismissing...');
                    const closeBtns = page.locator('a:text("Close"), a:text("close"), [id*="btnClose"], [id*="lnkClose"], input[value="Close"], input[value="OK"], .modalPopup a, .modalPopup input[type="button"]');
                    const closeBtn = closeBtns.first();
                    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await closeBtn.click();
                        await sleep(1000);
                    }
                    await modalBg.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
                    await waitForPageReady(page);
                    console.log('[Filler] Modal dismissed');
                }

                if (useRetrieve) {
                    // ====== RETRIEVE APPLICATION FLOW ======
                    console.log(`[Filler] 🔄 Usando Retrieve Application para ${application.application_id}`);

                    // Fill Application ID field
                    const appIdInput = page.locator("input[id$='_tbxApplicationID']").first();
                    if (await appIdInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await appIdInput.fill(application.application_id);
                    }

                    // Fill security answer
                    const secAnswerInput = page.locator("input[id$='_txtAnswer']").first();
                    if (await secAnswerInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                        const secAnswer = config.security_answer || profile.securityAnswer || '';
                        await secAnswerInput.fill(secAnswer);
                    }

                    // Click Retrieve button
                    const retrieveBtn = page.locator("a[id$='_lnkRetrieve'], input[id$='_btnRetrieve']").first();
                    const urlBefore = page.url();
                    await retrieveBtn.click({ timeout: 15000 });
                    await sleep(2000);
                    await waitForPageReady(page);

                    const currentUrl = page.url();
                    if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
                        throw new Error('Session expired after clicking Retrieve');
                    }

                    // Check if we left Landing
                    const validationError = page.locator('[id*="ValidationSummary"]').first();
                    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
                    const stillOnLanding = currentUrl.includes('Default.aspx');

                    if (hasError || stillOnLanding) {
                        console.warn(`[Filler] Retrieve failed (attempt ${attempt}) — captcha wrong or invalid app_id`);
                        if (attempt < 3) { await sleep(1000); continue; }
                        // Fallback: try Start New on last attempt
                        console.log('[Filler] Retrieve falhou 3x — tentando Start New como fallback');
                        useRetrieve = false;
                        continue;
                    }

                    console.log(`[Filler] ✅ Retrieve bem-sucedido — retomando formulário`);
                    landingPassed = true;
                    break;
                } else {
                    // ====== START NEW APPLICATION FLOW ======
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
                        throw new Error('Session expired after clicking Start');
                    }

                    const validationError = page.locator('[id*="ValidationSummary"]').first();
                    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
                    const stillOnLanding = currentUrl.includes('Default.aspx') || (!currentUrl.includes('SecureQuestion') && !currentUrl.includes('ConfirmApplicationID') && !currentUrl.includes('complete_'));

                    if (hasError || stillOnLanding) {
                        console.warn(`[Filler] Captcha likely wrong (attempt ${attempt}) — page didn't advance. Retrying...`);
                        if (attempt < 3) await sleep(1000);
                        continue;
                    }

                    // Successfully left Landing
                    landingPassed = true;
                    break;
                } // end else (Start New)
            } // end for (captcha attempts)
            if (!landingPassed) {
                return { success: false, error: 'Failed to pass Landing after 3 captcha attempts', cause: 'captcha_failed', browser, activePage: page };
            }
            await waitForPageReady(page);

            // ============================================================
            // STEP 2: Security Question Setup
            // ============================================================
            let currentPage = identifyPage(page.url());
            if (currentPage === 'SecurityQuestion') {
                onPage('SecurityQuestion');

                const privacyCheck = page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct");
                if (await privacyCheck.isVisible().catch(() => false)) {
                    await privacyCheck.check();
                }

                // Select security question from settings (config.security_question = index from DB)
                const questionIndex = parseInt(config.security_question || '0', 10);
                await page.locator("select[id$='_ddlQuestions']").selectOption({ index: questionIndex });
                // Security answer: config (from settings/dashboard) takes priority, profile as fallback
                const secAnswer = config.security_answer || profile.securityAnswer || '';
                await page.locator("input[id$='_txtAnswer']").fill(secAnswer);

                const urlBefore = page.url();
                await page.locator("input[id$='_btnContinue']").click();
                await waitForUrlChange(page, urlBefore);
                await waitForPageReady(page);

                // Confirm Application ID page
                const continueBtn = page.locator("input[id$='_btnContinueApp']");
                if (await continueBtn.isVisible().catch(() => false)) {
                    // Capture application ID
                    const appIdText = await page.locator("span[id$='_lblAppID'], b").first().innerText().catch(() => '');
                    const appIdMatch = appIdText.match(/[A-Z]{2}[A-Z0-9]{8,}/);
                    if (appIdMatch) {
                        application.application_id = appIdMatch[0];
                        console.log(`[Filler] Application ID: ${appIdMatch[0]}`);
                        if (typeof onAppId === 'function') onAppId(appIdMatch[0]);
                    }

                    const urlBefore2 = page.url();
                    await continueBtn.click();
                    await waitForUrlChange(page, urlBefore2);
                    await waitForPageReady(page);
                }
            }
        } // end if (!skipToFilling)

        // ============================================================
        // STEP 3: Fill all pages until Review
        // ============================================================
        let pageCount = 0;
        const MAX_PAGES = 30;
        let lastUrl = '';
        let stuckCount = 0;

        while (pageCount < MAX_PAGES) {
            pageCount++;
            const url = page.url();
            const pageName = identifyPage(url);

            if (isFinalPage(pageName)) {
                visited.push(pageName);
                onPage(pageName);
                break;
            }

            if (url === lastUrl) {
                stuckCount++;
                if (stuckCount >= 2) {
                    const { navigated } = await clickNextAndWait(page);
                    if (!navigated) break;
                    stuckCount = 0;
                    continue;
                }
            } else {
                stuckCount = 0;
            }
            lastUrl = url;

            onPage(pageName);
            visited.push(pageName);

            // Capture application_id — the ID format is AA00XXXXXX (2 letters + 8+ alphanumeric)
            // e.g. AA00FCUFGX — contains LETTERS after the initial prefix, NOT just digits!
            if (!application.application_id) {
                // Strategy 0: #content-main — the Application ID is visible on EVERY DS-160 page
                try {
                    const contentMain = page.locator('#content-main');
                    const mainText = await contentMain.innerText({ timeout: 2000 }).catch(() => '');
                    const contentMatch = mainText.match(/\b([A-Z]{2}[A-Z0-9]{8,})\b/);
                    if (contentMatch) {
                        application.application_id = contentMatch[1];
                        console.log(`[Filler] 🆔 Application ID (from #content-main): ${contentMatch[1]}`);
                        if (typeof onAppId === 'function') onAppId(contentMatch[1]);
                    }
                } catch { }

                // Strategy 1: Header selectors (Application bar at top of DS-160 pages)
                if (!application.application_id) {
                    const headerSelectors = [
                        "span[id$='_lblAppID']",
                        "span[id$='_lblBarcode']",
                        "span[id*='AppID']",
                        "span[id*='Barcode']",
                        "#ctl00_ucApplicationBar_lblAppID",
                        "#ctl00_ucApplicationBar_lblBarcode",
                        "[id*='ucApplicationBar'] span",
                        "[id*='pnlAppID'] span",
                    ];
                    for (const sel of headerSelectors) {
                        if (application.application_id) break;
                        try {
                            const els = await page.locator(sel).all();
                            for (const el of els) {
                                const text = await el.innerText().catch(() => '');
                                const match = text.match(/[A-Z]{2}[A-Z0-9]{8,}/);
                                if (match) {
                                    application.application_id = match[0];
                                    console.log(`[Filler] 🆔 Application ID (from header "${sel}"): ${match[0]}`);
                                    if (typeof onAppId === 'function') onAppId(match[0]);
                                    break;
                                }
                            }
                        } catch { }
                    }
                }

                // Strategy 2: URL query parameters or path
                if (!application.application_id) {
                    const urlAppIdMatch = url.match(/[?&](?:c|appId|applicationId)=([A-Z]{2}[A-Z0-9]{8,})/i)
                        || url.match(/\/([A-Z]{2}[A-Z0-9]{8,})\//);
                    if (urlAppIdMatch) {
                        application.application_id = urlAppIdMatch[1];
                        console.log(`[Filler] 🆔 Application ID (from URL): ${urlAppIdMatch[1]}`);
                        if (typeof onAppId === 'function') onAppId(urlAppIdMatch[1]);
                    }
                }

                // Strategy 3: Full page text search (last resort)
                if (!application.application_id) {
                    try {
                        const bodyText = await page.evaluate(() => {
                            const allText = document.body?.innerText || '';
                            const m = allText.match(/Application\s*(?:ID|Id|id)[:\s]*([A-Z]{2}[A-Z0-9]{8,})/i)
                                || allText.match(/\b([A-Z]{2}[A-Z0-9]{8,})\b/);
                            return m ? m[1] || m[0] : '';
                        });
                        if (bodyText) {
                            application.application_id = bodyText;
                            console.log(`[Filler] 🆔 Application ID (from page text): ${bodyText}`);
                            if (typeof onAppId === 'function') onAppId(bodyText);
                        }
                    } catch { }
                }
            }

            // ====== RECOVERY PAGE: Retrieve a DS-160 Application ======
            // Phase 1: App ID + Captcha → click Retrieve
            // Phase 2: App ID (disabled) + Surname (5 letters) + Year of Birth + Security Answer → click Retrieve
            if (pageName === 'Recovery') {
                console.log(`[Filler] 🔄 Recovery.aspx detectada — recuperando aplicação`);
                onPage('Recovery');

                let recoveryDone = false;
                for (let rAttempt = 1; rAttempt <= 5; rAttempt++) {
                    await waitForPageReady(page);

                    // Detect which phase we're in
                    const surnameField = page.locator("input[id$='_txbSurname']").first();
                    const dobYearField = page.locator("input[id$='_txbDOBYear']").first();
                    const secAnswerField = page.locator("input[id$='_txbAnswer']").first();
                    const captchaImg = page.locator("img[id$='_CaptchaImage'], img[src*='captcha']").first();
                    const appIdInput = page.locator("input[id$='_tbxApplicationID'], input[id*='ApplicationID']").first();

                    const hasSurname = await surnameField.isVisible({ timeout: 1500 }).catch(() => false);
                    const hasCaptcha = await captchaImg.isVisible({ timeout: 1500 }).catch(() => false);

                    if (hasSurname) {
                        // ====== PHASE 2: Security Questions ======
                        console.log(`[Filler] Recovery FASE 2: Security Questions (tentativa ${rAttempt})`);

                        // Surname — first 5 letters, uppercase
                        const surname5 = (profile.surname || '').substring(0, 5).toUpperCase();
                        await surnameField.fill(surname5);
                        console.log(`[Filler] Recovery: Surname preenchido: ${surname5}`);

                        // Year of Birth
                        if (await dobYearField.isVisible({ timeout: 1000 }).catch(() => false)) {
                            const birthYear = profile.dob?.year || '';
                            await dobYearField.fill(String(birthYear));
                            console.log(`[Filler] Recovery: Year of Birth preenchido: ${birthYear}`);
                        }

                        // Security Answer
                        if (await secAnswerField.isVisible({ timeout: 1000 }).catch(() => false)) {
                            const secAnswer = config.security_answer || profile.securityAnswer || '';
                            await secAnswerField.fill(secAnswer);
                            console.log(`[Filler] Recovery: Security answer preenchido`);
                        }

                    } else if (hasCaptcha) {
                        // ====== PHASE 1: App ID + Captcha ======
                        console.log(`[Filler] Recovery FASE 1: App ID + Captcha (tentativa ${rAttempt})`);

                        // Fill Application ID (only if enabled)
                        if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                            const isEnabled = await appIdInput.isEnabled().catch(() => false);
                            if (isEnabled) {
                                await appIdInput.fill(application.application_id || '');
                                console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                            }
                        }

                        // Solve captcha
                        try {
                            const keys = { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key };
                            const imgPath = path.join(TMP, 'captcha_recovery.png');
                            await captchaImg.screenshot({ path: imgPath });
                            const answer = await solveCaptcha(imgPath, captchaMode, keys);
                            console.log(`[Filler] Recovery captcha (attempt ${rAttempt}): ${answer}`);
                            const captchaInput = page.locator("input[id$='_txtCodeTextBox']").first();
                            await captchaInput.fill('');
                            await captchaInput.fill(answer);
                        } catch (e) {
                            console.warn(`[Filler] Recovery captcha error:`, e.message);
                        }

                    } else {
                        // ====== PHASE 1 (sem captcha): apenas App ID ======
                        console.log(`[Filler] Recovery FASE 1: App ID sem captcha (tentativa ${rAttempt})`);
                        if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                            const isEnabled = await appIdInput.isEnabled().catch(() => false);
                            if (isEnabled) {
                                await appIdInput.fill(application.application_id || '');
                                console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                            }
                        }
                    }

                    // Click Retrieve Application button
                    const retrieveBtn = page.locator("input[id$='_btnRetrieve'], a[id$='_lnkRetrieve'], input[value*='Retrieve']").first();
                    if (await retrieveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await retrieveBtn.click();
                        console.log('[Filler] Recovery: clicou Retrieve Application');
                    } else {
                        console.warn('[Filler] Recovery: botão Retrieve não encontrado');
                    }

                    await sleep(3000);
                    await waitForPageReady(page);

                    const newUrl = page.url();
                    if (!newUrl.includes('Recovery.aspx')) {
                        console.log(`[Filler] ✅ Recovery bem-sucedido — navegou para: ${newUrl}`);
                        recoveryDone = true;
                        break;
                    }

                    // Check for validation errors
                    const errorText = await page.locator('[id*="ValidationSummary"], [id*="lblError"]').first().innerText().catch(() => '');
                    if (errorText) {
                        console.warn(`[Filler] Recovery erro: ${errorText.substring(0, 100)}`);
                    }

                    console.warn(`[Filler] Recovery tentativa ${rAttempt} falhou — ainda em Recovery.aspx`);
                }

                if (!recoveryDone) {
                    throw new Error('Recovery.aspx: falhou 5x ao tentar recuperar aplicação');
                }
                continue; // Re-enter loop to identify the new page
            }

            // Detectar páginas desconhecidas e tentar recovery
            if (pageName === 'Unknown') {
                console.warn(`[Filler] ⚠️ Página desconhecida: ${url}`);

                // Verificar se é timeout/session expired
                const pageText = await page.locator('body').innerText().catch(() => '');
                const isTimeout = /timeout|session.*expired|timed out|idle/i.test(pageText);
                const isWarning = /warning|continue.*application|recover/i.test(pageText);

                if (isTimeout) {
                    console.warn('[Filler] ⏰ Session timeout detectado na página — clicando OK');
                    // Try to click OK button to dismiss timeout dialog
                    const okBtn = page.getByRole('button', { name: 'OK' });
                    if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await okBtn.click();
                        await page.waitForLoadState('domcontentloaded').catch(() => { });
                        await waitForPageReady(page);
                        console.log('[Filler] ✅ OK clicado, redirecionado para:', page.url());
                        continue; // Re-enter loop to handle the new page (Landing)
                    }
                    // If no OK button found, throw
                    console.error('[Filler] 🔴 Session expirada sem botão OK');
                    throw new Error('Session expired: ' + url);
                }

                if (isWarning) {
                    console.warn('[Filler] ⚠️ Página de warning — tentando continuar');
                    // Tentar clicar em botões de continuação/recovery
                    const recoveryBtns = [
                        "input[value*='Continue']",
                        "input[value*='OK']",
                        "input[id*='btnContinue']",
                        "a[id*='Continue']",
                        "input[id*='btnOk']",
                    ];
                    let recovered = false;
                    for (const sel of recoveryBtns) {
                        const btn = page.locator(sel).first();
                        if (await btn.isVisible().catch(() => false)) {
                            console.log(`[Filler] Clicando recovery: ${sel}`);
                            const urlBefore = page.url();
                            await btn.click();
                            await waitForUrlChange(page, urlBefore);
                            recovered = true;
                            break;
                        }
                    }
                    if (recovered) continue;
                }

                // Se chegou aqui, página desconhecida sem recovery
                console.error(`[Filler] 🔴 Página desconhecida sem recovery: ${url}`);
                throw new Error(`Unknown page: ${url}`);
            }

            // Security pages: fill from field-map first (user may have answered "Y"),
            // then default remaining unanswered radios to "No"
            if (isSecurityPage(url)) {
                await waitForPageReady(page);
                // Step 1: Fill any security fields that have actual data from the user's JSON
                await fillPageCompletely(page, fieldMap);
                // Step 2: Default remaining unanswered radios to "No"
                let noRadios = page.locator("input[type=radio][id$='_1']");
                let count = await noRadios.count();
                for (let i = 0; i < count; i++) {
                    const radio = noRadios.nth(i);
                    // Only click "No" if neither Yes nor No is already selected
                    const radioName = await radio.getAttribute('name').catch(() => '');
                    if (radioName) {
                        const anyChecked = await page.locator(`input[type=radio][name="${radioName}"]:checked`).count().catch(() => 0);
                        if (anyChecked === 0 && await radio.isVisible().catch(() => false)) {
                            await radio.click();
                        }
                    }
                }
                // Log Security responses summary
                const answeredYes = await page.locator("input[type=radio][id$='_0']:checked").count().catch(() => 0);
                const answeredNo = await page.locator("input[type=radio][id$='_1']:checked").count().catch(() => 0);
                const totalRadioGroups = answeredYes + answeredNo;
                if (answeredYes > 0) {
                    // Identify which questions were answered Yes
                    const yesRadios = await page.locator("input[type=radio][id$='_0']:checked").all().catch(() => []);
                    const yesIds = [];
                    for (const r of yesRadios) {
                        const id = await r.getAttribute('id').catch(() => '');
                        if (id) yesIds.push(id.replace(/_0$/, ''));
                    }
                    console.warn(`[Filler] ⚠️ SECURITY: ${answeredYes} respostas YES: ${yesIds.join(', ')}`);
                }
                console.log(`[Filler] Security: ${answeredYes} Yes, ${answeredNo} No (${totalRadioGroups} perguntas)`);
                // Report security page stats via callback
                if (onPageFilled) {
                    try { onPageFilled({ pageName, fieldsFilled: totalRadioGroups, fieldsTotal: totalRadioGroups, emptyFields: [], elapsed: 0, passes: 1 }); } catch { }
                }
                await clickNextAndWait(page);
                continue;
            }

            // Fill page with retry
            let fillResult = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                fillResult = await fillPageCompletely(page, fieldMap);
                const { navigated } = await clickNextAndWait(page);
                if (navigated) {
                    // Report page fill stats via callback
                    if (onPageFilled && fillResult) {
                        try {
                            onPageFilled({
                                pageName,
                                fieldsFilled: fillResult.passes > 0 ? fillResult.passes : 0, // approx
                                fieldsTotal: 0, // filled inside fillPageCompletely
                                emptyFields: fillResult.emptyFields || [],
                                elapsed: fillResult.elapsed || 0,
                                passes: fillResult.passes || 1,
                                attempt,
                                navigated: true
                            });
                        } catch { }
                    }
                    break;
                }

                // Capture validation errors from DS-160 form
                const validationErrors = await page.locator('.error-message li').allTextContents().catch(() => []);
                if (validationErrors.length > 0) {
                    console.warn(`[Filler] Validation errors on ${pageName}:`, validationErrors);
                }

                if (attempt === 3 && !navigated) {
                    // Report failed page stats
                    if (onPageFilled && fillResult) {
                        try {
                            onPageFilled({
                                pageName,
                                emptyFields: fillResult.emptyFields || [],
                                elapsed: fillResult.elapsed || 0,
                                passes: fillResult.passes || 1,
                                attempt,
                                navigated: false,
                                validationErrors
                            });
                        } catch { }
                    }
                    const errDetail = validationErrors.length > 0 ? validationErrors.join('; ') : 'Page stuck after 3 attempts';
                    throw new Error(`${pageName}: ${errDetail}`);
                }
                await waitForPageReady(page);
            }
        }

        console.log(`[Filler] Done: ${visited.join(' -> ')}`);
        return { success: true, applicationId: application.application_id, browser };

    } catch (e) {
        console.error('[Filler] Error:', e);
        // Extract field name
        let field = null;
        const selectorMatch = e.message?.match(/#([\w_]+)/);
        if (selectorMatch) field = selectorMatch[1];
        const currentPage = visited.length > 0 ? visited[visited.length - 1] : 'Unknown';

        // Capture validation errors from DS-160 if page is still alive
        let validationErrors = [];
        try {
            if (page && !page.isClosed()) {
                validationErrors = await page.locator('.error-message li, .aspNetValidator, [id*="validator"]')
                    .allTextContents().catch(() => []);
                validationErrors = validationErrors.filter(v => v.trim().length > 0);
            }
        } catch { /* page may be gone */ }

        // Classify error cause with granular sub-causes
        let cause = 'unknown';
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('browser has been closed') || msg.includes('target closed') || msg.includes('context or browser')) {
            cause = 'browser_closed';
        } else if (msg.includes('net::err_') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound')) {
            cause = 'network_error';
        } else if (msg.includes('captcha')) {
            cause = 'captcha_failed';
        } else if (validationErrors.length > 0) {
            cause = 'validation_error';
        } else if (msg.includes('timeout') || msg.includes('waiting for')) {
            cause = msg.includes('postback') ? 'postback_stuck' : 'timeout';
        } else if (msg.includes('selectoption') || msg.includes('no option')) {
            cause = 'field_error:select';
        } else if (field) {
            cause = msg.includes('not found') || msg.includes('missing') ? 'field_error:missing' : 'field_error';
        } else if (msg.includes('stuck after')) {
            cause = 'page_stuck';
        }

        return { success: false, error: e.message, stack: e.stack, field, page: currentPage, cause, validationErrors, browser, activePage: page };
    }
    // NOTE: browser is NOT closed here — caller (queue.js) decides when to close
}

// ====================================================================
// HELPERS (extracted from working test)
// ====================================================================

function identifyPage(url) {
    if (url.includes('Default.aspx')) return 'Landing';
    if (url.includes('Recovery.aspx')) return 'Recovery';
    if (url.includes('ConfirmApplicationID') || url.includes('SecureQuestion')) return 'SecurityQuestion';
    const file = url.split('/').pop()?.split('?')[0] || '';
    const node = (url.match(/node=(\w+)/) || [])[1] || '';
    if (file.includes('complete_personal') && node === 'Personal1') return 'Personal1';
    if (file.includes('complete_personal') && node === 'Personal2') return 'Personal2';
    if (file.includes('complete_travel.aspx')) return 'Travel';
    if (file.includes('complete_travelcompanions')) return 'TravelCompanions';
    if (file.includes('complete_previousustravel')) return 'PreviousUSTravel';
    if (file.includes('complete_addressphone') || file.includes('complete_contact')) return 'AddressPhone';
    if (file.includes('complete_pptvisa') || file.includes('Passport_Visa')) return 'Passport';
    if (file.includes('complete_uscontact')) return 'USContact';
    if (file.includes('complete_family1')) return 'Family1';
    if (file.includes('complete_family2')) return 'Family2';
    if (file.includes('complete_family4') || node === 'PrevSpouse') return 'PrevSpouse';
    if (file.includes('complete_workeducation1')) return 'WorkEducation1';
    if (file.includes('complete_workeducation2')) return 'WorkEducation2';
    if (file.includes('complete_workeducation3')) return 'WorkEducation3';
    if (file.includes('complete_addlworkeducation')) return 'AdditionalWork';
    if (url.includes('SecurityandBackground')) return 'Security';
    if (url.includes('UploadPhoto')) return 'Photo';
    if (url.includes('ReviewPage') || url.includes('Review')) return 'Review';
    if (url.includes('Confirmation')) return 'Confirmation';
    return node || 'Unknown';
}

function isFinalPage(name) { return ['Review', 'Photo', 'Confirmation'].includes(name); }
function isSecurityPage(url) { return url.includes('SecurityandBackground'); }
function isSelectEmpty(val) {
    if (!val) return true;
    const v = val.trim();
    return v === '' || v === '-1' || v === '0' || v === 'SONE' || v.toUpperCase().includes('SELECT');
}

async function waitForPostback(page) {
    const start = Date.now();
    // Wait for ASP.NET postback manager to finish
    await page.waitForFunction(() => {
        const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return !mgr || !mgr.get_isInAsyncPostBack();
    }, { timeout: 8000 }).catch(() => { });

    await sleep(150);

    // Quick field count stabilization check
    const countFields = () => page.evaluate(() => {
        let c = 0;
        document.querySelectorAll('select, input:not([type="hidden"]), textarea').forEach(el => {
            if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
        });
        return c;
    }).catch(() => 0);

    const initial = await countFields();
    let last = initial, stable = 0;
    while (Date.now() - start < 3000) {
        await sleep(150);
        const cur = await countFields();
        if (cur !== initial && cur === last) { stable += 150; if (stable >= 300) break; }
        else if (cur === initial && Date.now() - start > 800) break;
        else stable = 0;
        last = cur;
    }
}

async function waitForPageReady(page, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        // Scroll to force lazy elements to render
        await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); window.scrollTo(0, 0); }).catch(() => { });
        const count = await page.evaluate(() => {
            let c = 0;
            document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach(el => {
                if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
            });
            return c;
        }).catch(() => 0);
        if (count > 0) {
            const inPB = await page.evaluate(() => {
                const m = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
                return m?.get_isInAsyncPostBack?.() || false;
            }).catch(() => false);
            if (!inPB && (count >= 3 || Date.now() - start > 1500)) return count;
        }
        await sleep(200);
    }
    return 0;
}

async function waitForUrlChange(page, urlBefore, timeout = 10000) {
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < timeout) {
        await sleep(300);
    }
    await waitForPageReady(page);
}

async function fillPageCompletely(page, fieldMap) {
    await waitForPageReady(page);
    const pageStart = Date.now();
    let pass = 0, needsRescan = true;
    const postbackLog = [];
    const addAnotherClicked = new Set(); // Track "list:idx" to prevent infinite Add Another
    while (needsRescan && pass < 10) {
        const result = await autoFillPass(page, fieldMap, pass, addAnotherClicked);
        needsRescan = result.needsRescan;
        if (result.postbackField) {
            postbackLog.push(result.postbackField);
        }
        pass++;
    }
    const elapsed = ((Date.now() - pageStart) / 1000).toFixed(1);
    if (postbackLog.length > 0) {
        console.log(`[Filler] Postback triggers nesta página: ${postbackLog.join(' → ')}`);
    }
    // Detect empty fields that should have been filled — helps diagnose validation errors
    const emptyFields = await page.evaluate(() => {
        const empty = [];
        document.querySelectorAll("select, input[type='text'], textarea").forEach(el => {
            if (el.offsetParent !== null && !el.value && !el.disabled && el.id
                && !/HelpButton|btnWarning|btnRecover|btnCancel|btnClient|btnNextPage/.test(el.id)) {
                empty.push(el.id.split('_').pop());
            }
        });
        return empty;
    }).catch(() => []);
    if (emptyFields.length > 0) {
        console.warn(`[Filler] ⚠️ ${emptyFields.length} campos vazios após preenchimento: ${emptyFields.slice(0, 8).join(', ')}`);
    }
    console.log(`[Filler] Página preenchida em ${pass} pass(es) [${elapsed}s]${emptyFields.length > 0 ? ` — ${emptyFields.length} vazios` : ''}`);
    return { passes: pass, postbackLog, elapsed: parseFloat(elapsed), emptyFields };
}

async function autoFillPass(page, fieldMap, passNum = 0, addAnotherClicked = new Set()) {
    // Scroll page to ensure all elements are rendered (DS-160 lazy-loads some fields)
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); }).catch(() => { });
    await sleep(200);
    await page.evaluate(() => { window.scrollTo(0, 0); }).catch(() => { });
    await sleep(200);
    const fields = await discoverFields(page);
    const visible = fields.filter(f => f.visible && f.id);
    let postbackNeeded = false, filled = 0;
    let postbackField = null;
    const unmatched = [];
    const fieldsBeforeCount = visible.length;

    // PRIORITY ORDER: postback triggers first, then non-postback, then text last
    // This prevents filling text fields that get hidden/reset by postbacks

    // Phase 1: Clicks/radios that trigger postback (e.g. SpecificTravel, WhoIsPaying, LostPPT)
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;
        const match = fieldMap.find(m => m.pattern.test(field.id));
        if (!match) continue;
        if (match.type !== 'click') continue;
        if (!isPostbackClick(field.id, field.type)) continue;
        if (field.checked) continue;

        const loc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);
        try {
            const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
            if (!isVis) continue;
            await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
            await loc.click();
            filled++;
            postbackNeeded = true;
            postbackField = field.id;
            break; // One postback at a time
        } catch (e) { console.warn(`[Filler] Phase1 click error: ${field.id}`, e.message); }
    }

    // Phase 2: Selects with postback (e.g. WhoIsPaying dropdown, ddlLocation)
    if (!postbackNeeded) {
        for (const field of visible) {
            if (!field.id || field.tag !== 'select') continue;
            if (!isPostbackSelect(field.id)) continue;
            const match = fieldMap.find(m => m.pattern.test(field.id));
            if (!match) continue;
            if (!isSelectEmpty(field.value)) continue;

            const loc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);
            try {
                const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
                if (!isVis) continue;
                await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                if (match.type === 'select-label') {
                    try { await loc.selectOption({ label: match.value }); }
                    catch {
                        // Fallback: fuzzy match by option text
                        const opts = await loc.evaluate(sel => Array.from(sel.options).map(o => ({ v: o.value, t: o.text })));
                        let found = opts.find(o => o.t.trim().toUpperCase() === match.value.trim().toUpperCase());
                        if (!found) found = opts.find(o => o.t.toUpperCase().includes(match.value.trim().toUpperCase()));
                        if (found) {
                            await loc.selectOption(found.v);
                            console.warn(`[Filler] ⚠️ SELECT FUZZY: ${field.id} — "${match.value}" → "${found.t}"`);
                        } else {
                            console.warn(`[Filler] ❌ SELECT SEM MATCH: ${field.id} — valor "${match.value}" não encontrado. Opções: ${opts.slice(0, 5).map(o => o.t).join(', ')}...`);
                            continue;
                        }
                    }
                } else if (match.type === 'select-search') {
                    const allOpts = await loc.evaluate(sel =>
                        Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
                    );
                    // Exact match first, then partial
                    let found = allOpts.find(o => o.t.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.t.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase().includes(match.value.toUpperCase()));
                    if (found) {
                        await loc.selectOption(found.v);
                    } else {
                        console.warn(`[Filler] ❌ SELECT-SEARCH SEM MATCH: ${field.id} — valor "${match.value}" não encontrado. Opções: ${allOpts.slice(0, 5).map(o => o.t).join(', ')}...`);
                        continue;
                    }
                } else {
                    try { await loc.selectOption(match.value); }
                    catch { try { await loc.selectOption({ label: match.value }); } catch { continue; } }
                }
                filled++;
                postbackNeeded = true;
                postbackField = field.id;
                break;
            } catch (e) { console.warn(`[Filler] Phase2 select error: ${field.id}`, e.message); }
        }
    }

    // If postback needed, stop here and rescan after postback
    if (postbackNeeded) {
        if (unmatched.length > 0) console.warn(`[Filler] Pass ${passNum} — ${unmatched.length} campos sem match:`, unmatched.slice(0, 10).join(', '));
        console.log(`[Filler] Pass ${passNum} — ${filled}/${visible.length} preenchidos, ⏳ postback: ${postbackField}`);

        await waitForPostback(page);
        const fieldsAfter = await discoverFields(page);
        const visibleAfter = fieldsAfter.filter(f => f.visible && f.id).length;
        const delta = visibleAfter - fieldsBeforeCount;
        if (delta !== 0) console.log(`[Filler] Postback ${postbackField}: ${delta > 0 ? '+' : ''}${delta} campos`);

        // Wait-and-Verify: se postback não gerou campos novos, aguarda estabilização extra
        if (delta === 0) {
            await waitForPageReady(page, 1500);
            const recheck = await discoverFields(page);
            const recheckCount = recheck.filter(f => f.visible && f.id).length;
            const delta2 = recheckCount - fieldsBeforeCount;
            if (delta2 !== 0) {
                console.log(`[Filler] Postback tardio ${postbackField}: +${delta2} campos após espera extra`);
            } else {
                console.log(`[Filler] Postback ${postbackField}: sem novos campos (postback de opções)`);
            }
        }

        return { needsRescan: true, postbackField };
    }

    // Phase 2.5: "Add Another" — DS-160 DataList multi-entry mechanism
    // Based on real DS-160 behavior (3 tested patterns):
    // - Other Names: Fill ctl00 → "Add Another" link → Fill ctl01 → InsertButton ctl01 → Fill ctl02
    // - Other Nationalities: Fill ctl00 → "Add Another" link → Fill ctl01 → InsertButton ctl01 → Fill ctl02
    // - Permanent Resident: Fill ctl00 → InsertButton ctl00 → Fill ctl01 → InsertButton ctl01 → Fill ctl02
    // SAFETY: max 5 Add Another per list, tracked by addAnotherClicked Set
    const addAnotherEntries = fieldMap.filter(m => m.addAnother);
    if (addAnotherEntries.length > 0) {
        // Group by list name, process lowest pending index first
        const pendingByList = {};
        for (const entry of addAnotherEntries) {
            const listName = entry.addAnother.list;
            const trackKey = `${listName}:${entry.addAnother.idx}`;
            if (addAnotherClicked.has(trackKey)) continue;
            const fieldExists = visible.some(f => f.id && entry.pattern.test(f.id));
            if (!fieldExists) {
                if (!pendingByList[listName] || entry.addAnother.idx < pendingByList[listName].addAnother.idx) {
                    pendingByList[listName] = entry;
                }
            }
        }

        for (const [listName, entry] of Object.entries(pendingByList)) {
            const trackKey = `${listName}:${entry.addAnother.idx}`;

            const listClickCount = [...addAnotherClicked].filter(k => k.startsWith(listName + ':')).length;
            if (listClickCount >= 5) {
                console.warn(`[Filler] ⚠️ Limite de Add Another atingido para "${listName}" (max 5)`);
                addAnotherClicked.add(trackKey);
                continue;
            }

            // Check if the PREVIOUS entry's fields are filled (guard against clicking InsertButton on empty entries)
            // For idx=1, check ctl00; for idx=2, check ctl01; etc.
            const prevIdx = entry.addAnother.idx - 1;
            const prevCtl = `_ctl${String(prevIdx).padStart(2, '0')}_`;
            const prevFieldsFilled = visible.some(f => f.id && f.id.includes(listName) && f.id.includes(prevCtl) &&
                ((f.tag === 'select' && !isSelectEmpty(f.value)) || (f.tag === 'input' && f.value && f.value.trim())));

            if (!prevFieldsFilled) {
                // Previous entry fields are empty — they need to be filled first by Phase 3/4
                // Don't click Add Another or InsertButton yet
                continue;
            }

            console.log(`[Filler] 📋 Add Another necessário para "${listName}" (entry idx ${entry.addAnother.idx})`);

            let clicked = false;

            // Strategy 1: Find "Add Another" link by text near the DataList
            try {
                const addLinks = await page.locator(`a:has-text("Add Another")`).all().catch(() => []);
                for (const link of addLinks) {
                    const vis = await link.isVisible({ timeout: 500 }).catch(() => false);
                    if (!vis) continue;
                    const nearList = await link.evaluate((el, ln) => {
                        let parent = el.parentElement;
                        for (let i = 0; i < 10 && parent; i++) {
                            if (parent.querySelector(`[id*="${ln}"]`)) return true;
                            parent = parent.parentElement;
                        }
                        return false;
                    }, listName).catch(() => false);

                    if (nearList) {
                        await link.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                        await link.click();
                        console.log(`[Filler] ✅ Clicou "Add Another" link para "${listName}" (por texto)`);
                        await waitForPostback(page);
                        clicked = true;
                        break;
                    }
                }
            } catch (e) {
                console.warn(`[Filler] ⚠️ Add Another link search falhou:`, e.message);
            }

            // Strategy 2: InsertButton within the DataList
            // Permanent Resident uses InsertButton directly (no "Add Another" link)
            // Other lists use InsertButton for ctl01+ entries
            if (!clicked) {
                try {
                    const insertBtns = await page.locator(`[id*="${listName}"][id*="InsertButton"]`).all().catch(() => []);
                    // Click the LAST visible InsertButton (the one for the most recent entry)
                    for (let i = insertBtns.length - 1; i >= 0; i--) {
                        const btn = insertBtns[i];
                        const vis = await btn.isVisible({ timeout: 500 }).catch(() => false);
                        if (vis) {
                            await btn.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                            await btn.click();
                            const btnId = await btn.getAttribute('id').catch(() => '');
                            console.log(`[Filler] ✅ Clicou InsertButton para "${listName}" (${btnId})`);
                            await waitForPostback(page);
                            clicked = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.warn(`[Filler] ⚠️ InsertButton search falhou:`, e.message);
                }
            }

            // Strategy 3: Generic "Add Another" link (last resort)
            if (!clicked) {
                try {
                    const genericAdd = page.getByRole('link', { name: 'Add Another' }).first();
                    if (await genericAdd.isVisible({ timeout: 500 }).catch(() => false)) {
                        await genericAdd.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                        await genericAdd.click();
                        console.log(`[Filler] ✅ Clicou "Add Another" genérico para "${listName}"`);
                        await waitForPostback(page);
                        clicked = true;
                    }
                } catch (e) {
                    console.warn(`[Filler] ⚠️ Generic Add Another falhou:`, e.message);
                }
            }

            addAnotherClicked.add(trackKey);

            if (!clicked) {
                console.error(`[Filler] ❌ Add Another/InsertButton não encontrado para "${listName}" — pulando`);
                continue;
            }

            // Wait for the target field to appear using Playwright's native waitForSelector
            // Much faster and more reliable than polling loop (16×500ms + discoverFields)
            try {
                const targetIdx = entry.addAnother.idx;
                const targetCtl = `_ctl${String(targetIdx).padStart(2, '0')}_`;
                const targetSelector = `[id*="${listName}"][id*="${targetCtl}"]`;

                try {
                    await page.waitForSelector(targetSelector, { state: 'visible', timeout: 4000 });
                    console.log(`[Filler] ✅ Novo entry (${targetCtl}) detectado para "${listName}"`);
                } catch {
                    // Retry: re-clica o último InsertButton/Add Another e tenta novamente
                    console.warn(`[Filler] ⚠️ Timeout esperando ${targetSelector} — retry`);

                    // Tenta re-clicar InsertButton
                    const retryBtn = page.locator(`[id*="${listName}"][id*="InsertButton"]`).last();
                    if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                        await retryBtn.click();
                    } else {
                        // Fallback: re-clica Add Another link genérico
                        const retryLink = page.getByRole('link', { name: 'Add Another' }).first();
                        if (await retryLink.isVisible({ timeout: 500 }).catch(() => false)) {
                            await retryLink.click();
                        }
                    }
                    await waitForPostback(page);

                    // Segunda tentativa de esperar o campo
                    await page.waitForSelector(targetSelector, { state: 'visible', timeout: 4000 })
                        .then(() => console.log(`[Filler] ✅ Retry bem-sucedido: ${targetCtl} para "${listName}"`))
                        .catch(() => console.error(`[Filler] ❌ Add Another falhou após retry: ${targetSelector}`));
                }
            } catch (e) { console.warn(`[Filler] Add Another wait error: ${listName}`, e.message); }

            return { needsRescan: true, postbackField: `AddAnother:${listName}` };
        }
    }



    // Phase 3: Non-postback selects, clicks, checkboxes
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;
        const match = fieldMap.find(m => m.pattern.test(field.id));
        if (!match) { unmatched.push(field.id + '(' + field.type + ')'); continue; }
        if (match.type === 'text') continue; // Done in Phase 4
        if (match.type === 'click' && field.checked) continue;
        if ((match.type === 'select' || match.type === 'select-label' || match.type === 'select-search') && !isSelectEmpty(field.value)) continue;
        if (match.type === 'checkbox-check' && field.checked) continue;

        const loc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);
        try {
            const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
            if (!isVis) continue;
            await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });

            switch (match.type) {
                case 'select':
                    try { await loc.selectOption(match.value); }
                    catch { try { await loc.selectOption({ label: match.value }); } catch { await loc.selectOption({ index: 1 }).catch(() => { }); } }
                    filled++;
                    break;
                case 'select-label':
                    try { await loc.selectOption({ label: match.value }); }
                    catch {
                        const opts = await loc.evaluate(sel => Array.from(sel.options).map(o => ({ v: o.value, t: o.text })));
                        let found = opts.find(o => o.t.trim().toUpperCase() === match.value.trim().toUpperCase());
                        if (!found) found = opts.find(o => o.t.toUpperCase().includes(match.value.trim().toUpperCase()));
                        if (found) {
                            await loc.selectOption(found.v);
                            console.warn(`[Filler] ⚠️ SELECT-LABEL FUZZY: ${field.id} — "${match.value}" → "${found.t}"`);
                        } else {
                            console.warn(`[Filler] ❌ SELECT-LABEL SEM MATCH: ${field.id} — valor "${match.value}" não encontrado`);
                        }
                    }
                    filled++;
                    break;
                case 'select-search': {
                    const allOpts = await loc.evaluate(sel =>
                        Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
                    );
                    // Exact match first, then partial — prevents BAHAMAS→BANGLADESH
                    let found = allOpts.find(o => o.t.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.t.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v && o.v !== '' && o.v !== '-1' && !o.t.toUpperCase().includes('SELECT'));
                    if (found) { await loc.selectOption(found.v); filled++; }
                    break;
                }
                case 'click':
                    await loc.click();
                    filled++;
                    break;
                case 'checkbox-check':
                    await loc.check();
                    filled++;
                    break;
                case 'radio': {
                    // Radio: field.id is the radio's name pattern from field-map
                    // DS-160 radios: id$='_0' = Yes, id$='_1' = No
                    // match.value = 'Y' → click Yes (_0), 'N' or anything else → click No (_1)
                    const suffix = match.value === 'Y' ? '_0' : '_1';
                    // Find the actual radio by appending suffix to the matched field's base name
                    const baseId = field.id.replace(/_(0|1)$/, '');
                    const targetId = baseId + suffix;
                    const radioLoc = page.locator(`#${targetId.replace(/\$/g, '\\$')}`);
                    const radioVis = await radioLoc.isVisible({ timeout: 300 }).catch(() => false);
                    if (radioVis) {
                        const alreadyChecked = await radioLoc.isChecked().catch(() => false);
                        if (!alreadyChecked) {
                            await radioLoc.click();
                        }
                        filled++;
                    }
                    break;
                }
            }
        } catch (e) { console.warn(`[Filler] Phase3 error: ${field.id}`, e.message); }
    }

    // Phase 4: Fill text fields — hybrid approach
    // Critical fields (address, phone, etc.) use locator.fill() for ASP.NET validator support
    // Normal fields use batch evaluate for performance
    const textBatch = [];
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;
        const match = fieldMap.find(m => m.pattern.test(field.id));
        if (!match) continue;
        if (match.type === 'text' && (!field.value || field.value.trim() === '') && match.value != null) {
            textBatch.push({ id: field.id, value: String(match.value).trim() });
        }
    }

    if (textBatch.length > 0) {
        // Separate critical fields that need Playwright native fill (dispara blur/validators ASP.NET)
        const CRITICAL = /Address|Street|City|Phone|Payer|Employer|Salary|Income|Occupation/i;
        const criticalBatch = textBatch.filter(f => CRITICAL.test(f.id));
        const normalBatch = textBatch.filter(f => !CRITICAL.test(f.id));

        // Critical fields: Playwright locator.fill() — triggers blur, change, validators
        for (const { id, value } of criticalBatch) {
            try {
                const loc = page.locator(`#${id.replace(/\$/g, '\\$')}`);
                const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
                if (isVis) {
                    await loc.fill(value);
                    filled++;
                }
            } catch (e) { console.warn(`[Filler] Phase4 critical fill error: ${id}`, e.message); }
        }
        if (criticalBatch.length > 0) {
            console.log(`[Filler] Phase4 critical: ${criticalBatch.length} campos via locator.fill()`);
        }

        // Normal fields: batch evaluate (fast, single round-trip)
        if (normalBatch.length > 0) {
            const batchFilled = await page.evaluate((batch) => {
                let count = 0;
                batch.forEach(({ id, value }) => {
                    const el = document.getElementById(id);
                    if (el && (!el.value || el.value.trim() === '')) {
                        try {
                            const proto = el.tagName === 'TEXTAREA'
                                ? window.HTMLTextAreaElement.prototype
                                : window.HTMLInputElement.prototype;
                            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                            if (setter) setter.call(el, value);
                            else el.value = value;
                        } catch { el.value = value; }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        count++;
                    }
                });
                return count;
            }, normalBatch);
            filled += batchFilled;
            console.log(`[Filler] Phase4 batch: ${batchFilled} campos via evaluate()`);
        }
    }

    if (unmatched.length > 0) console.warn(`[Filler] Pass ${passNum} — ${unmatched.length} sem match:`, unmatched.slice(0, 10).join(', '));
    console.log(`[Filler] Pass ${passNum} — ${filled}/${visible.length} preenchidos`);
    return { needsRescan: false, postbackField: null };
}

async function discoverFields(page) {
    return page.evaluate(() => {
        const fields = [];
        document.querySelectorAll('select').forEach(sel => {
            if (sel.id.includes('ddlLanguage')) return;
            fields.push({ tag: 'select', id: sel.id, visible: sel.offsetParent !== null, value: sel.value, optCount: sel.options.length });
        });
        document.querySelectorAll('input').forEach(inp => {
            if (inp.type === 'hidden') return;
            fields.push({ tag: 'input', id: inp.id, type: inp.type, visible: inp.offsetParent !== null || inp.type === 'radio' || inp.type === 'checkbox', value: inp.value, checked: inp.checked });
        });
        document.querySelectorAll('textarea').forEach(ta => {
            fields.push({ tag: 'textarea', id: ta.id, visible: ta.offsetParent !== null, value: ta.value });
        });
        return fields;
    });
}

async function clickNextAndWait(page) {
    const urlBefore = page.url();

    // === MODAL DISMISS: Close any DS-160 modal overlays that block Next ===
    // DS-160 uses modals like: modalNationalityWarning, modalIncompleteApp, etc.
    // These have a modalBackground div that intercepts pointer events
    try {
        const modalBg = page.locator('div[id*="modalBackground"], div.modalBackground').first();
        if (await modalBg.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log('[Filler] 🔔 Modal detectado — tentando fechar...');

            // Try clicking OK/Continue/Yes buttons inside modal panels
            const modalBtns = [
                'div[id*="modal"] input[type="button"][value*="OK"]',
                'div[id*="modal"] input[type="button"][value*="Yes"]',
                'div[id*="modal"] input[type="button"][value*="Continue"]',
                'div[id*="modal"] input[type="submit"][value*="OK"]',
                'div[id*="modal"] a[id*="btnOk"]',
                'div[id*="modal"] a[id*="btnYes"]',
                // Specific known modals
                'input[id*="btnOkWarning"]',
                'input[id*="btnOKWarning"]',
                'input[id*="btnContinueWarning"]',
                'a[id*="btnOkWarning"]',
                'a[id*="btnOKWarning"]',
            ];

            let dismissed = false;
            for (const sel of modalBtns) {
                const btn = page.locator(sel).first();
                try {
                    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                        await btn.click({ force: true });
                        console.log(`[Filler] ✅ Modal fechado via: ${sel}`);
                        await sleep(500);
                        await waitForPostback(page);
                        dismissed = true;
                        break;
                    }
                } catch { }
            }

            // Fallback: remove modal overlay via JavaScript
            if (!dismissed) {
                console.log('[Filler] ⚡ Removendo modal overlay via JS');
                await page.evaluate(() => {
                    document.querySelectorAll('div[id*="modalBackground"], div.modalBackground').forEach(el => {
                        el.style.display = 'none';
                        el.remove();
                    });
                    // Also hide any modal popup panels
                    document.querySelectorAll('div[id*="modal_foreground"], div[id*="ModalPanel"]').forEach(el => {
                        el.style.display = 'none';
                    });
                }).catch(() => { });
                await sleep(300);
            }
        }
    } catch (e) {
        console.warn('[Filler] Modal check error:', e.message);
    }

    const next = page.locator("input[type=submit][value*='Next']").first();

    // Use waitForResponse to detect navigation instead of polling
    const [response] = await Promise.all([
        page.waitForResponse(
            r => r.url().includes('.aspx') && r.status() === 200,
            { timeout: 15000 }
        ).catch(() => null),
        next.click()
    ]);

    // Also wait for URL change as fallback
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 5000) {
        await sleep(300);
    }
    await waitForPageReady(page);
    return { navigated: page.url() !== urlBefore, newPage: identifyPage(page.url()) };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ====================================================================
// NORMALIZE — convert Supabase applicant.data to field-map profile format
// Handles both camelCase (JS form) and snake_case (DB) keys
// ====================================================================
function normalizeProfile(data) {
    // If already flat with surname at top level, return as-is
    if (data.surname && data.givenName) return data;

    // Otherwise map from nested structure (clone form) to flat profile
    const p1 = data.personal1 || data.personal || {};
    const p2 = data.personal2 || {};
    const addr = data.addressPhone || {};
    const trav = data.travel || {};
    const tc = data.travelCompanions || {};
    const prev = data.previousUSTravel || {};
    const fam1 = data.family1 || {};
    const fam2 = data.family2 || {};
    const ppt = data.passport || {};
    const we1 = data.workEducation1 || {};
    const we2 = data.workEducation2 || {};
    const we3 = data.workEducation3 || {};

    // Helper: prefer camelCase, fallback to snake_case
    const g = (obj, camel, snake) => obj[camel] || obj[snake] || '';
    // Helper: convert 'N/A', 'DNA', empty strings to null (for checkbox-check fields)
    const na = (v) => (!v || v === 'N/A' || v === 'n/a' || v === 'DNA') ? null : v;

    return {
        // === PERSONAL 1 ===
        surname: g(p1, 'surname', 'surname'),
        givenName: g(p1, 'givenName', 'given_name'),
        fullNameNative: g(p1, 'fullNameNative', 'full_name_native'),
        otherNamesUsed: p1.otherNamesUsed === 'Y' || p1.other_names_used === 'Y',
        otherNames: (p1.otherNames || p1.other_names || []).map(n => ({
            surname: (n.surname || '').replace(/[^A-Za-z ]/g, '').trim(),
            givenName: (n.givenName || '').replace(/[^A-Za-z ]/g, '').trim(),
        })).filter(n => n.surname || n.givenName),
        telecode: p1.telecode === 'Y' || p1.telecode_question === 'Y',
        telecodeSurname: g(p1, 'telecodeSurname', 'telecode_surname'),
        telecodeGivenName: g(p1, 'telecodeGivenName', 'telecode_given_name'),
        sex: g(p1, 'sex', 'sex') || null,
        maritalStatus: g(p1, 'maritalStatus', 'marital_status') || null,
        otherMaritalStatusText: g(p1, 'otherMaritalStatusText', 'other_marital_status_text'),
        dob: p1.dob || { day: '', month: '', year: '' },
        cityOfBirth: g(p1, 'cityOfBirth', 'city_of_birth'),
        stateOfBirth: g(p1, 'stateOfBirth', 'state_of_birth'),
        countryOfBirth: g(p1, 'countryOfBirth', 'country_of_birth') || null,

        // === PERSONAL 2 ===
        nationality: g(p2, 'nationality', 'nationality') || null,
        otherNationality: (() => {
            const flag = p2.otherNationality === 'Y' || p2.other_nationality === 'Y';
            if (!flag && (p2.otherNationalities || p2.other_nationalities || []).length > 0) return true;
            return flag;
        })(),
        // Full array of other nationalities (for Add Another support)
        otherNationalities: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            return (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
        })(),
        // Legacy single-entry (first item) for backward compatibility
        otherNationalityCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.country;
        })(),
        otherNationalityPassport: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.hasPassport === 'Y';
        })(),
        otherNationalityPassportNumber: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.passportNumber;
        })(),
        permanentResidentOtherCountry: (() => {
            const flag = p2.permanentResident === 'Y' || p2.permanent_resident === 'Y'
                || p2.permanentResidentOtherCountry === 'Y' || p2.permanent_resident_other_country === 'Y'
                || p2.hasPermanentResident === 'Y' || p2.has_permanent_resident === 'Y';
            // Auto-detect: if array has entries, flag should be true
            if (!flag && (p2.permanentResidentCountries || p2.permanent_resident_countries || []).length > 0) {
                return true;
            }
            return flag;
        })(),
        // Full array of perm resident countries (for Add Another support)
        permanentResidentCountries: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            return (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
                .filter(c => c.country && c.country !== nat)
                .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i);
        })(),
        // Legacy single-entry (first item)
        permanentResidentCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const countries = (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
                .filter(c => c.country && c.country !== nat)
                .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i);
            return countries[0]?.country;
        })(),
        nationalId: g(p2, 'nationalId', 'national_id'),
        usSsn: p2.ssn && p2.ssn !== 'N/A' && p2.ssn !== 'DNA' ? p2.ssn.replace(/-/g, '') : null,
        usTaxpayerId: p2.taxId && p2.taxId !== 'N/A' && p2.taxId !== 'DNA' ? p2.taxId : null,

        // === TRAVEL ===
        purposeOfTrip: (() => {
            const pt = g(trav, 'purposeOfTrip', 'purpose_of_trip');
            return (pt && pt !== 'N/A') ? pt : null;
        })(),
        purposeCategory: g(trav, 'purposeCategory', 'purpose_category') || null,
        purposeSubCategory: g(trav, 'purposeSubCategory', 'purpose_sub_category') || null,
        hasSpecificPlans: trav.hasSpecificPlans === 'Y' || trav.hasSpecificPlans === true || trav.has_specific_plans === 'Y',
        travel: {
            arrivalDate: (() => {
                // Use arrivalDate if specific plans, or nonSpecificArrival otherwise
                const d = trav.arrivalDate || trav.arrival_date || trav.nonSpecificArrival || trav.non_specific_arrival;
                if (d && d.day && d.month && d.year) return d;
                return null;
            })(),
            departureDate: trav.departureDate || trav.departure_date,
            arrivalFlight: trav.arrivalFlight || trav.arrival_flight,
            arrivalCity: trav.arrivalCity || trav.arrival_city,
            departureFlight: trav.departureFlight || trav.departure_flight,
            departureCity: trav.departureCity || trav.departure_city,
            location: trav.specificLocation || trav.specific_location,
            lengthOfStay: {
                value: (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.value : trav.lengthOfStay) || trav.length_of_stay || null,
                unit: (typeof trav.lengthOfStayUnit === 'string' ? trav.lengthOfStayUnit : (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.unit : null)) || trav.length_of_stay_unit || null
            },
            usAddress: (() => {
                const ua = trav.usAddress || trav.us_address || {};
                if (!ua.street1 && !ua.city && !ua.state) return null; // Missing — will be caught by validation
                return { street1: ua.street1 || '', street2: ua.street2 || '', city: ua.city || '', state: ua.state || '', zip: ua.zip || ua.postalCode || '' };
            })()
        },
        // Specific locations array for dtlTravelLoc addAnother support
        specificLocations: (() => {
            const locs = trav.specificLocations || trav.specific_locations;
            if (Array.isArray(locs) && locs.length) return locs;
            const single = trav.specificLocation || trav.specific_location;
            if (single) return [single];
            return [];
        })(),
        payingForTrip: trav.whoIsPaying || trav.who_is_paying || null,
        payer: (() => {
            const p = trav.payer;
            if (!p) return null;
            const addr = p.address || {};
            return {
                ...p,
                street1: p.street1 || addr.street1 || '',
                street2: p.street2 || addr.street2 || '',
                city: p.city || addr.city || '',
                state: p.state || addr.state || '',
                postalCode: p.postalCode || addr.postalCode || '',
                country: p.country || addr.country || '',
            };
        })(),

        // === TRAVEL COMPANIONS ===
        travelingWithOthers: tc.travelingWithOthers === 'Y' || tc.traveling_with_others === 'Y',
        companions: (() => {
            const comps = tc.companions || [];
            // Deduplicate by surname+givenName (DS-160 rejects duplicates)
            const seen = new Set();
            return comps.filter(c => {
                const key = `${(c.surname || '').toUpperCase()}|${(c.givenName || '').toUpperCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        })(),
        partOfGroup: tc.partOfGroup === 'Y' || tc.part_of_group === 'Y',
        groupName: tc.groupName || tc.group_name || '',

        // === PREVIOUS US TRAVEL ===
        hasBeenInUS: prev.hasBeenInUS === 'Y' || prev.has_been_in_us === 'Y',
        // Full array for multiple visits (field-map forEach + addAnother)
        previousVisits: (() => {
            const visits = prev.previousVisits || prev.previous_visits || [];
            return visits.map(v => ({
                arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year },
                lengthOfStay: v.lengthOfStay || v.length_of_stay || '',
                lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D',
            }));
        })(),
        // Legacy singular fallback
        previousUSVisit: (() => {
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (!visits.length) return null;
            const v = visits[0];
            return {
                arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year },
                lengthOfStay: v.lengthOfStay || v.length_of_stay || '',
                lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D',
            };
        })(),
        previousUSDriversLicense: prev.hasDriversLicense === 'Y' || prev.has_drivers_license === 'Y',
        // Full array for multiple licenses (field-map forEach + addAnother)
        driversLicenses: (prev.driversLicenses || prev.drivers_licenses || []).map(dl => ({
            number: dl.number || '', state: dl.state || '',
        })),
        // Legacy singular fallback
        previousUSDriversLicenseNumber: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.number,
        previousUSDriversLicenseState: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.state,
        hasUSVisa: prev.hasUSVisa === 'Y' || prev.has_us_visa === 'Y',
        previousVisa: (() => {
            const visa = prev.previousVisa || prev.previous_visa;
            if (!visa) return null;
            return {
                issueDate: visa.issueDate || visa.issue_date || { day: '', month: '', year: '' },
                number: visa.number || '',
                numberNA: !visa.number,
                sameType: visa.sameType === 'Y' || visa.same_type === 'Y',
                sameCountry: visa.sameCountry === 'Y' || visa.same_country === 'Y',
                tenPrint: visa.tenPrint === 'Y' || visa.ten_print === 'Y',
                lost: visa.lost === 'Y',
                cancelled: visa.cancelled === 'Y',
            };
        })(),
        visaRefused: prev.visaRefused === 'Y' || prev.visa_refused === 'Y',
        visaRefusedExplanation: prev.visaRefusedExplanation || prev.visa_refused_explanation || '',
        immigrantPetition: prev.immigrantPetition === 'Y' || prev.immigrant_petition === 'Y',
        immigrantPetitionExplanation: prev.immigrantPetitionExplanation || prev.immigrant_petition_explanation || '',
        permanentResident: prev.permanentResident === 'Y' || prev.permanent_resident === 'Y',
        permanentResidentExplanation: prev.permanentResidentExplanation || prev.permanent_resident_explanation || '',
        vwpDenial: prev.vwpDenial === 'Y' || prev.vwp_denial === 'Y',
        vwpDenialExplanation: prev.vwpDenialExplanation || prev.vwp_denial_explanation || '',

        // === ADDRESS & PHONE ===
        homeAddress: addr.homeAddress || addr.home_address || {},
        mailingAddressSame: addr.mailingAddressSame !== false && addr.mailing_address_same !== false,
        mailingAddress: addr.mailingAddress || addr.mailing_address || null,
        phone: g(addr, 'phone', 'phone'),
        mobilePhone: na(addr.mobilePhone || addr.mobile_phone) || null,
        businessPhone: na(addr.businessPhone || addr.business_phone) || null,
        email: g(addr, 'email', 'email'),
        additionalPhones: addr.additionalPhones === 'Y' || addr.additional_phones === 'Y' || false,
        additionalPhoneNumbers: addr.additionalPhoneNumbers || addr.additional_phone_numbers || [],
        additionalEmails: addr.additionalEmails === 'Y' || addr.additional_emails === 'Y' || false,
        additionalEmailAddresses: addr.additionalEmailAddresses || addr.additional_email_addresses || [],
        socialMedia: addr.socialMedia || addr.social_media || [],
        additionalSocialMedia: addr.additionalSocialMedia === 'Y' || addr.additional_social_media === 'Y',
        additionalSocialMediaAccounts: addr.additionalSocialMediaAccounts || addr.additional_social_media_accounts || [],

        // === PASSPORT ===
        passport: {
            type: g(ppt, 'type', 'type') || null,
            typeExplanation: ppt.typeExplanation || ppt.type_explanation,
            number: g(ppt, 'number', 'number'),
            bookNumber: na(ppt.bookNumber || ppt.book_number),
            issuingCountry: g(ppt, 'issuingCountry', 'issuing_country') || null,
            issuedCity: g(ppt, 'issuedCity', 'issued_city'),
            issuedState: g(ppt, 'issuedState', 'issued_state'),
            issuedCountry: g(ppt, 'issuedCountry', 'issued_country') || null,
            issuanceDate: ppt.issuanceDate || ppt.issuance_date,
            expirationDate: ppt.expirationDate || ppt.expiration_date,
            lostOrStolen: ppt.lostOrStolen === 'Y' || ppt.lost_or_stolen === 'Y',
            lostPassports: ppt.lostPassports || ppt.lost_passports || [],
            // Legacy single-entry fallback
            lostPassport: (ppt.lostPassports || ppt.lost_passports || [])[0] || null,
        },

        // === US CONTACT ===
        usContact: (() => {
            const uc = data.usContact || data.us_contact || data.travel?.usContact || data.travel?.us_contact || {};
            const ucAddr = uc.address || {};
            const sn = na(uc.surname) || '';
            const gn = na(uc.givenName || uc.given_name) || '';
            const nameNA = uc.nameDoNotKnow || uc.name_do_not_know || (!sn && !gn);
            const orgNA = uc.orgDoNotKnow || uc.org_do_not_know || false;
            return {
                surname: sn,
                givenName: gn,
                nameDoNotKnow: nameNA,
                organization: na(uc.organization) || '',
                orgDoNotKnow: orgNA,
                relationship: uc.relationship || '',
                street1: na(uc.street1 || ucAddr.street1) || '',
                street2: na(uc.street2 || ucAddr.street2) || '',
                city: na(uc.city || ucAddr.city) || '',
                state: na(uc.state || ucAddr.state) || '',
                zip: na(uc.zip || ucAddr.zip) || '',
                phone: uc.phone || '',
                email: na(uc.email) || '',
            };
        })(),

        // === FAMILY ===
        father: (() => {
            const f = fam1.father || {};
            const sn = na(f.surname) || '';
            const gn = na(f.givenName || f.given_name) || '';
            return {
                surname: sn,
                givenName: gn,
                nameUnknown: !sn && !gn,
                dob: f.dob || { day: '', month: '', year: '' },
                dobUnknown: !f.dob || f.dobUnknown || f.dob_unknown || false,
                inUS: f.inUS || f.in_us || 'N',
                usStatus: f.usStatus || f.us_status || '',
            };
        })(),
        mother: (() => {
            const m = fam1.mother || {};
            const sn = na(m.surname) || '';
            const gn = na(m.givenName || m.given_name) || '';
            return {
                surname: sn,
                givenName: gn,
                nameUnknown: !sn && !gn,
                dob: m.dob || { day: '', month: '', year: '' },
                dobUnknown: !m.dob || m.dobUnknown || m.dob_unknown || false,
                inUS: m.inUS || m.in_us || 'N',
                usStatus: m.usStatus || m.us_status || '',
            };
        })(),
        spouse: fam2 || {},
        relativesInUS: fam1.immediateRelativesInUS === 'Y' || fam1.relatives_in_us === 'Y',
        relatives: fam1.relatives || [],
        // Legacy single-entry fallback
        immediateRelative: (fam1.relatives || [])[0] || null,
        otherRelativesInUS: fam1.otherRelativesInUS === 'Y' || fam1.other_relatives_in_us === 'Y',

        // === DECEASED SPOUSE ===
        deceasedSpouse: (() => {
            const ds = data.deceasedSpouse || data.deceased_spouse;
            if (!ds || !ds.surname) return null;
            return {
                surname: ds.surname || '', givenName: ds.givenName || ds.given_name || '',
                dob: ds.dob || { day: '', month: '', year: '' },
                nationality: ds.nationality || '',
                cityOfBirth: na(ds.cityOfBirth || ds.city_of_birth) || '',
                countryOfBirth: ds.countryOfBirth || ds.country_of_birth || '',
            };
        })(),

        // === PREVIOUS SPOUSE ===
        // Full array for multiple spouses (field-map forEach + addAnother)
        previousSpouses: (() => {
            const ps = data.prevSpouse || data.prev_spouse || {};
            const spouses = ps.spouses || [];
            return spouses.map(s => ({
                numberOfFormerSpouses: ps.numberOfPrevious || ps.number_of_previous || String(spouses.length),
                surname: s.surname || '', givenName: s.givenName || s.given_name || '',
                dob: s.dob || { day: '', month: '', year: '' },
                nationality: s.nationality || '',
                cityOfBirth: s.cityOfBirth || s.city_of_birth || '',
                countryOfBirth: s.countryOfBirth || s.country_of_birth || '',
                dateOfMarriage: s.dateOfMarriage || s.date_of_marriage || { day: '', month: '', year: '' },
                dateMarriageEnded: s.dateMarriageEnded || s.date_marriage_ended || { day: '', month: '', year: '' },
                howMarriageEnded: s.howEnded || s.how_ended || '',
                countryMarriageTerminated: s.countryTerminated || s.country_terminated || '',
            }));
        })(),
        // Legacy singular fallback
        previousSpouse: (() => {
            const ps = data.prevSpouse || data.prev_spouse || {};
            const spouses = ps.spouses || [];
            if (!spouses.length) return null;
            const s = spouses[0];
            return {
                numberOfFormerSpouses: ps.numberOfPrevious || ps.number_of_previous || '1',
                surname: s.surname || '', givenName: s.givenName || s.given_name || '',
                dob: s.dob || { day: '', month: '', year: '' },
                nationality: s.nationality || '',
                cityOfBirth: s.cityOfBirth || s.city_of_birth || '',
                countryOfBirth: s.countryOfBirth || s.country_of_birth || '',
                dateOfMarriage: s.dateOfMarriage || s.date_of_marriage || { day: '', month: '', year: '' },
                dateMarriageEnded: s.dateMarriageEnded || s.date_marriage_ended || { day: '', month: '', year: '' },
                howMarriageEnded: s.howEnded || s.how_ended || '',
                countryMarriageTerminated: s.countryTerminated || s.country_terminated || '',
            };
        })(),

        // === WORK / EDUCATION 1 ===
        occupationCode: g(we1, 'occupation', 'occupation') || null,
        occupationExplanation: we1.occupationExplanation || we1.occupation_explanation || we1.specifyOther || we1.specify_other || we1.otherOccupation || we1.other_occupation || '',
        employer: (() => {
            const e = we1.employer || {};
            return {
                ...e,
                monthlyIncome: e.monthlyIncome || e.monthlySalary || e.monthly_income || e.monthly_salary || '',
                jobTitle: e.jobTitle || e.job_title || e.duties || '',
                startDate: e.startDate || e.start_date || { day: '', month: '', year: '' },
            };
        })(),

        // === WORK / EDUCATION 2 ===
        hasPreviousEmployment: we2.hasPreviousEmployment === 'Y' || we2.has_previous_employment === 'Y',
        previousEmployment: we2.previousEmployment || we2.previous_employment || [],
        hasEducation: we2.hasEducation === 'Y' || we2.has_education === 'Y',
        education: (we2.education || []).map(e => ({
            name: e.name || '',
            street1: e.street1 || '',
            city: e.city || '',
            state: e.state || '',
            postalCode: e.postalCode || e.postal_code || '',
            country: e.country || '',
            courseOfStudy: e.courseOfStudy || e.course_of_study || e.course || '',
            startDate: e.startDate || e.start_date || { month: '', year: '' },
            endDate: e.endDate || e.end_date || { month: '', year: '' },
        })),

        // === WORK / EDUCATION 3 ===
        languages: we3.languages || [],
        clanTribe: we3.clanTribe === 'Y' || we3.clan_tribe === 'Y',
        clanTribeName: we3.clanTribeName || we3.clan_tribe_name || '',
        countriesVisited: we3.countriesVisited === 'Y' || we3.countries_visited === 'Y',
        countriesVisitedList: we3.countriesVisitedList || we3.countries_visited_list || [],
        organizationMember: we3.organizationMember === 'Y' || we3.organization_member === 'Y',
        organizations: we3.organizations || [],
        // Legacy single-entry fallback
        organizationName: (we3.organizations || [])[0] || '',
        specializedSkills: we3.specializedSkills === 'Y' || we3.specialized_skills === 'Y',
        specializedSkillsExplanation: we3.specializedSkillsExplanation || we3.specialized_skills_explanation || '',
        militaryService: we3.militaryService === 'Y' || we3.military_service === 'Y',
        military: we3.military || [],
        insurgentOrg: we3.insurgentOrg === 'Y' || we3.insurgent_org === 'Y',
        insurgentOrgExplanation: we3.insurgentOrgExplanation || we3.insurgent_org_explanation || '',

        // === SECURITY ===
        // Maps all 30 security questions from the clone form JSON to flat fields
        // The filler uses these to set Yes/No + explanation text on security pages
        security: (() => {
            const sec = data.security || {};
            // List of all security field keys (matching generateJSON output)
            const fields = [
                // Security 1 - Health
                'disease', 'disorder', 'drugUser',
                // Security 2 - Criminal
                'arrested', 'controlledSubstances', 'prostitution', 'moneyLaundering',
                'humanTrafficking', 'assistedSevereTrafficking', 'humanTraffickingRelated',
                // Security 3 - National Security
                'illegalActivity', 'terroristActivity', 'terroristSupport', 'terroristOrg',
                'terroristRel', 'genocide', 'torture', 'exViolence', 'childSoldier',
                'religiousFreedom', 'populationControls', 'transplant',
                // Security 4 - Immigration
                'removalHearing', 'immigrationFraud', 'failToAttend', 'visaViolation', 'deport',
                // Security 5 - Miscellaneous
                'childCustody', 'votingViolation', 'renounceExp', 'attWoReimb',
            ];
            const result = {};
            for (const f of fields) {
                result[f] = sec[f] === 'Y';
                result[f + 'Expl'] = sec[f + 'Expl'] || '';
            }
            return result;
        })(),

        // === META ===
        location: data.location || null,
        securityAnswer: data.securityAnswer || data.security_answer || null
    };
}

module.exports = { fillApplication };
