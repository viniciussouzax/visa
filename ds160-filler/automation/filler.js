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
 * @param {object} config - From automation_config table
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {function} onPage - Callback(pageName) for status updates
 * @param {object} [existingBrowser] - Reuse this browser instead of creating new
 * @param {object} [existingPage] - Reuse this page instead of creating new
 * @returns {{ success: boolean, applicationId?: string, error?: string, browser, activePage }}
 */
async function fillApplication(applicant, application, config, captchaMode, onPage, existingBrowser, existingPage) {
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

        // Navigate to DS-160
        await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        // ============================================================
        // STEP 1: Landing page — location + modal + captcha + Start
        // ============================================================
        onPage('Landing');
        const location = profile.location || 'SPL';

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

        // 3) Solve captcha + click Start (retry if captcha was wrong)
        const isRetrieve = !!(application?.application_id);
        if (isRetrieve) {
            return { success: false, error: 'Retrieve flow not implemented yet' };
        }

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

            // Click Start Application with human-like mouse movement
            const startBtn = page.locator("a[id$='_lnkNew']").first();
            const box = await startBtn.boundingBox();
            if (box) {
                // Move mouse to button with slight randomization (human-like)
                const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
                const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
                await page.mouse.move(targetX, targetY, { steps: 5 + Math.floor(Math.random() * 10) });
                await sleep(100 + Math.floor(Math.random() * 200));
            }
            await startBtn.click({ timeout: 15000 });
            await sleep(2000);
            await waitForPageReady(page);

            // Check if we actually left the Landing page
            const currentUrl = page.url();
            if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
                throw new Error('Session expired after clicking Start');
            }

            // Check for captcha validation error (we're still on Landing)
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
        }

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

            await page.locator("select[id$='_ddlQuestions']").selectOption({ index: 1 });
            const secAnswer = application?.security_answer || 'BRAZIL';
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
                const appIdMatch = appIdText.match(/[A-Z]{2}\d{8,}/);
                if (appIdMatch) {
                    application.application_id = appIdMatch[0];
                    console.log(`[Filler] Application ID: ${appIdMatch[0]}`);
                }

                const urlBefore2 = page.url();
                await continueBtn.click();
                await waitForUrlChange(page, urlBefore2);
                await waitForPageReady(page);
            }
        }

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

            // Detectar páginas desconhecidas e tentar recovery
            if (pageName === 'Unknown') {
                console.warn(`[Filler] ⚠️ Página desconhecida: ${url}`);

                // Verificar se é timeout/session expired
                const pageText = await page.locator('body').innerText().catch(() => '');
                const isTimeout = /timeout|session.*expired|timed out|idle/i.test(pageText);
                const isWarning = /warning|continue.*application|recover/i.test(pageText);

                if (isTimeout) {
                    console.error('[Filler] 🔴 Session expirada/timeout detectado');
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

            // Security pages: click all "No" radios
            if (isSecurityPage(url)) {
                await waitForPageReady(page);
                let noRadios = page.locator("input[type=radio][id$='_1']");
                let count = await noRadios.count();
                for (let i = 0; i < count; i++) {
                    const radio = noRadios.nth(i);
                    if (await radio.isVisible().catch(() => false) && !(await radio.isChecked())) {
                        await radio.click();
                    }
                }
                await fillPageCompletely(page, fieldMap);
                await clickNextAndWait(page);
                continue;
            }

            // Fill page with retry
            for (let attempt = 1; attempt <= 3; attempt++) {
                await fillPageCompletely(page, fieldMap);
                const { navigated } = await clickNextAndWait(page);
                if (navigated) break;

                // Capture validation errors from DS-160 form
                const validationErrors = await page.locator('.error-message li').allTextContents().catch(() => []);
                if (validationErrors.length > 0) {
                    console.warn(`[Filler] Validation errors on ${pageName}:`, validationErrors);
                }

                if (attempt === 3 && !navigated) {
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
    }, { timeout: 5000 }).catch(() => { });

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
    let pass = 0, needsRescan = true;
    const postbackLog = [];
    while (needsRescan && pass < 10) {
        const result = await autoFillPass(page, fieldMap, pass);
        needsRescan = result.needsRescan;
        if (result.postbackField) {
            postbackLog.push(result.postbackField);
        }
        pass++;
    }
    if (postbackLog.length > 0) {
        console.log(`[Filler] Postback triggers nesta página: ${postbackLog.join(' → ')}`);
    }
    console.log(`[Filler] Página preenchida em ${pass} pass(es)`);
    return { passes: pass, postbackLog };
}

async function autoFillPass(page, fieldMap, passNum = 0) {
    // Scroll page to ensure all elements are rendered (DS-160 lazy-loads some fields)
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); }).catch(() => { });
    await sleep(100);
    await page.evaluate(() => { window.scrollTo(0, 0); }).catch(() => { });
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
        } catch { }
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
                    await loc.selectOption({ label: match.value });
                } else if (match.type === 'select-search') {
                    const allOpts = await loc.evaluate(sel =>
                        Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
                    );
                    // Exact match first, then partial
                    let found = allOpts.find(o => o.t.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.t.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase() === match.value.toUpperCase());
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase().includes(match.value.toUpperCase()));
                    if (found) await loc.selectOption(found.v);
                    else continue;
                } else {
                    try { await loc.selectOption(match.value); }
                    catch { try { await loc.selectOption({ label: match.value }); } catch { continue; } }
                }
                filled++;
                postbackNeeded = true;
                postbackField = field.id;
                break;
            } catch { }
        }
    }

    // If postback needed, stop here and rescan after postback
    if (postbackNeeded) {
        if (unmatched.length > 0) console.warn(`[Filler] Pass ${passNum} — ${unmatched.length} campos sem match:`, unmatched.slice(0, 5).join(', '));
        console.log(`[Filler] Pass ${passNum} — ${filled} preenchidos, ⏳ postback: ${postbackField}`);

        await waitForPostback(page);
        const fieldsAfter = await discoverFields(page);
        const visibleAfter = fieldsAfter.filter(f => f.visible && f.id).length;
        const delta = visibleAfter - fieldsBeforeCount;
        if (delta !== 0) console.log(`[Filler] Postback ${postbackField}: ${delta > 0 ? '+' : ''}${delta} campos`);

        return { needsRescan: true, postbackField };
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
                    await loc.selectOption({ label: match.value });
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
            }
        } catch { }
    }

    // Phase 4: Batch fill ALL empty text fields in one evaluate() call
    const textBatch = [];
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;
        const match = fieldMap.find(m => m.pattern.test(field.id));
        if (!match) continue;
        if (match.type === 'text' && (!field.value || field.value.trim() === '') && match.value != null) {
            textBatch.push({ id: field.id, value: String(match.value) });
        }
    }

    if (textBatch.length > 0) {
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
        }, textBatch);
        filled += batchFilled;
        console.log(`[Filler] Batch fill: ${batchFilled} text fields`);
    }

    if (unmatched.length > 0) console.warn(`[Filler] Pass ${passNum} — ${unmatched.length} sem match:`, unmatched.slice(0, 5).join(', '));
    console.log(`[Filler] Pass ${passNum} — ${filled} preenchidos, ${visible.length} visíveis`);
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
    // Helper: convert 'N/A', empty strings to null (for checkbox-check fields)
    const na = (v) => (!v || v === 'N/A' || v === 'n/a') ? null : v;

    return {
        // === PERSONAL 1 ===
        surname: g(p1, 'surname', 'surname'),
        givenName: g(p1, 'givenName', 'given_name'),
        fullNameNative: g(p1, 'fullNameNative', 'full_name_native'),
        otherNamesUsed: p1.otherNamesUsed === 'Y' || p1.other_names_used === 'Y',
        otherNames: p1.otherNames || p1.other_names || [],
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
        otherNationality: p2.otherNationality === 'Y' || p2.other_nationality === 'Y',
        otherNationalityCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || 'BRAZIL';
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat) // exclude primary nationality
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i); // deduplicate
            return others[0]?.country;
        })(),
        otherNationalityPassport: (() => {
            const nat = g(p2, 'nationality', 'nationality') || 'BRAZIL';
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.hasPassport === 'Y';
        })(),
        otherNationalityPassportNumber: (() => {
            const nat = g(p2, 'nationality', 'nationality') || 'BRAZIL';
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.passportNumber;
        })(),
        permanentResidentOtherCountry: p2.permanentResident === 'Y' || p2.permanent_resident === 'Y',
        permanentResidentCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || 'BRAZIL';
            const countries = (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
                .filter(c => c.country && c.country !== nat) // exclude primary nationality
                .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i); // deduplicate
            return countries[0]?.country;
        })(),
        nationalId: g(p2, 'nationalId', 'national_id'),
        usSsn: p2.ssn && p2.ssn !== 'N/A' ? p2.ssn.replace(/-/g, '') : null,
        usTaxpayerId: p2.taxId && p2.taxId !== 'N/A' ? p2.taxId : null,

        // === TRAVEL ===
        purposeOfTrip: (() => {
            const pt = g(trav, 'purposeOfTrip', 'purpose_of_trip');
            return (pt && pt !== 'N/A') ? pt : null;
        })(),
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
        companions: tc.companions || [],
        partOfGroup: tc.partOfGroup === 'Y' || tc.part_of_group === 'Y',
        groupName: tc.groupName || tc.group_name || '',

        // === PREVIOUS US TRAVEL ===
        hasBeenInUS: prev.hasBeenInUS === 'Y' || prev.has_been_in_us === 'Y',
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
        mobilePhone: addr.mobilePhone || addr.mobile_phone || null,
        businessPhone: addr.businessPhone || addr.business_phone || null,
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
            type: g(ppt, 'type', 'type') || 'R',
            typeExplanation: ppt.typeExplanation || ppt.type_explanation,
            number: g(ppt, 'number', 'number'),
            bookNumber: na(ppt.bookNumber || ppt.book_number),
            issuingCountry: g(ppt, 'issuingCountry', 'issuing_country') || 'BRAZIL',
            issuedCity: g(ppt, 'issuedCity', 'issued_city'),
            issuedState: g(ppt, 'issuedState', 'issued_state'),
            issuedCountry: g(ppt, 'issuedCountry', 'issued_country') || 'BRAZIL',
            issuanceDate: ppt.issuanceDate || ppt.issuance_date,
            expirationDate: ppt.expirationDate || ppt.expiration_date,
            lostOrStolen: ppt.lostOrStolen === 'Y' || ppt.lost_or_stolen === 'Y',
            lostPassport: (ppt.lostPassports || ppt.lost_passports || [])[0] || null,
        },

        // === US CONTACT ===
        usContact: (() => {
            const uc = data.usContact || data.us_contact || {};
            const ucAddr = uc.address || {};
            return {
                surname: uc.surname || '',
                givenName: uc.givenName || uc.given_name || '',
                organization: uc.organization || '',
                relationship: uc.relationship || 'O',
                street1: uc.street1 || ucAddr.street1 || '',
                street2: uc.street2 || ucAddr.street2 || '',
                city: uc.city || ucAddr.city || '',
                state: uc.state || ucAddr.state || '',
                zip: uc.zip || ucAddr.zip || '',
                phone: uc.phone || '',
                email: uc.email || '',
            };
        })(),

        // === FAMILY ===
        father: fam1.father || {},
        mother: fam1.mother || {},
        spouse: fam2 || {},
        relativesInUS: fam1.immediateRelativesInUS === 'Y' || fam1.relatives_in_us === 'Y',
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
                cityOfBirth: ds.cityOfBirth || ds.city_of_birth || '',
                countryOfBirth: ds.countryOfBirth || ds.country_of_birth || '',
            };
        })(),

        // === PREVIOUS SPOUSE ===
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
        occupationCode: g(we1, 'occupation', 'occupation') || 'H',
        occupationExplanation: we1.occupationExplanation || we1.occupation_explanation,
        employer: we1.employer || {},

        // === WORK / EDUCATION 2 ===
        hasPreviousEmployment: we2.hasPreviousEmployment === 'Y' || we2.has_previous_employment === 'Y',
        previousEmployment: we2.previousEmployment || we2.previous_employment || [],
        hasEducation: we2.hasEducation === 'Y' || we2.has_education === 'Y',
        education: (we2.education || []).map(e => ({
            name: e.name || '',
            street1: e.street1 || (e.city ? e.city + ' CAMPUS' : 'N/A'),
            city: e.city || '',
            state: e.state || e.city || '',
            postalCode: e.postalCode || e.postal_code || (addr.homeAddress || addr.home_address || {}).postalCode || '00000-000',
            country: e.country || 'BRAZIL',
            courseOfStudy: e.courseOfStudy || e.course_of_study || e.course || '',
            startDate: e.startDate || e.start_date || { month: '', year: '' },
            endDate: e.endDate || e.end_date || { month: '', year: '' },
        })),

        // === WORK / EDUCATION 3 ===
        languages: we3.languages || ['PORTUGUESE'],
        clanTribe: we3.clanTribe === 'Y' || we3.clan_tribe === 'Y',
        clanTribeName: we3.clanTribeName || we3.clan_tribe_name || '',
        countriesVisited: we3.countriesVisited === 'Y' || we3.countries_visited === 'Y',
        countriesVisitedList: we3.countriesVisitedList || we3.countries_visited_list || [],
        organizationMember: we3.organizationMember === 'Y' || we3.organization_member === 'Y',
        organizationName: (we3.organizations || [])[0] || '',
        specializedSkills: we3.specializedSkills === 'Y' || we3.specialized_skills === 'Y',
        specializedSkillsExplanation: we3.specializedSkillsExplanation || we3.specialized_skills_explanation || '',
        militaryService: we3.militaryService === 'Y' || we3.military_service === 'Y',
        military: (we3.military || [])[0] || null,
        insurgentOrg: we3.insurgentOrg === 'Y' || we3.insurgent_org === 'Y',
        insurgentOrgExplanation: we3.insurgentOrgExplanation || we3.insurgent_org_explanation || '',

        // === META ===
        location: data.location || 'SPL',
        securityAnswer: data.securityAnswer || data.security_answer || 'BRAZIL'
    };
}

module.exports = { fillApplication };
