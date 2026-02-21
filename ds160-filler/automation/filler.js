// DS-160 Filler — extracted from the working Playwright test
// Uses Playwright's OWN Chromium (not user's Chrome)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { solveCaptcha } = require('./captcha');

// ====================================================================
// FIELD MAP — import TypeScript module via tsx runtime
// ====================================================================
// tsx enables require() of .ts files at runtime
require('tsx/cjs/api').register();
const { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } = require('../../scripts/build-field-map');

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
 * @returns {{ success: boolean, applicationId?: string, error?: string }}
 */
async function fillApplication(applicant, application, config, captchaMode, onPage) {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

    // Build field map from applicant data
    const profile = normalizeProfile(applicant.data);
    const fieldMap = buildDynamicFieldMap(profile);
    console.log(`[Filler] Profile: ${applicant.full_name} | Fields: ${fieldMap.length} | hasSpecificPlans: ${profile.hasSpecificPlans}`);

    let browser, page;
    const visited = []; // Declared outside try so catch can access it

    try {
        // Launch Playwright's OWN Chromium (not user's Chrome!)
        browser = await chromium.launch({
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        });
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.setDefaultNavigationTimeout(30000);
        page.on('dialog', async d => d.accept().catch(() => { }));

        // Navigate to DS-160
        await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        // ============================================================
        // STEP 1: Landing page — location + captcha + Start
        // ============================================================
        onPage('Landing');
        const location = profile.location || 'SPL';

        // Set location
        const locSelect = page.locator("select[id$='_ddlLocation']");
        if (await locSelect.isVisible().catch(() => false)) {
            await locSelect.selectOption(location);
            await waitForPostback(page);
        }

        // Solve captcha
        let captchaSolved = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const imgEl = page.locator("img[id$='_CaptchaImage'], img[src*='captcha'], img[id$='c_default_ctl00_sitecontentplaceholder_uclocation_identifycaptcha1_captchaimage']").first();
                await imgEl.waitFor({ state: 'visible', timeout: 10000 });

                const imgPath = path.join(TMP, 'captcha.png');
                await imgEl.screenshot({ path: imgPath });

                const keys = {
                    capmonsterKey: config.capmonster_key,
                    aiVisionKey: config.ai_vision_key
                };
                const answer = await solveCaptcha(imgPath, captchaMode, keys);
                console.log(`[Filler] Captcha answer: ${answer}`);

                const input = page.locator("input[id$='_txtCodeTextBox']").first();
                await input.fill(answer);
                captchaSolved = true;
                break;
            } catch (e) {
                console.warn(`[Filler] Captcha attempt ${attempt} failed:`, e.message);
                if (attempt < 3) await sleep(2000);
            }
        }

        if (!captchaSolved) {
            return { success: false, error: 'Captcha não resolvido após 3 tentativas' };
        }

        // Click Start New Application — retry if captcha was wrong
        const isRetrieve = !!(application?.application_id);
        if (isRetrieve) {
            return { success: false, error: 'Retrieve flow not implemented yet' };
        }

        for (let startAttempt = 1; startAttempt <= 3; startAttempt++) {
            const startLink = page.locator("a[id$='_lnkNew']").first();
            await startLink.click();
            const navOk = await page.waitForURL(/ConfirmApplicationID|SecureQuestion|complete_personal/i, { timeout: 30000 }).then(() => true).catch(() => false);
            if (navOk) break;

            // Check if still on landing (captcha might be wrong)
            console.warn(`[Filler] Landing did not advance (attempt ${startAttempt}/3) — retrying captcha...`);
            if (startAttempt >= 3) {
                return { success: false, error: 'Landing page timeout after 3 captcha attempts', page: 'Landing', cause: 'timeout' };
            }
            // Re-solve captcha
            try {
                const img2 = page.locator("img[id$='_CaptchaImage']").first();
                const imgPath2 = path.join(require('os').tmpdir(), `captcha_retry_${Date.now()}.png`);
                await img2.screenshot({ path: imgPath2 });
                const answer2 = await solveCaptcha(imgPath2, captchaMode, { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key });
                console.log(`[Filler] Captcha retry answer: ${answer2}`);
                const input2 = page.locator("input[id$='_txtCodeTextBox']").first();
                await input2.fill('');
                await input2.fill(answer2);
            } catch (e) {
                console.warn(`[Filler] Captcha retry failed:`, e.message);
            }
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

                // Capture validation errors from DS-160 form (multiple selectors)
                const validationErrors = await captureValidationErrors(page);
                if (validationErrors.length > 0) {
                    console.warn(`\n🔴 [${pageName}] Validation errors (attempt ${attempt}/3):`);
                    validationErrors.forEach((e, i) => console.warn(`   ${i + 1}. ${e}`));
                }

                if (attempt === 3 && !navigated) {
                    const errDetail = validationErrors.length > 0 ? validationErrors.join('; ') : 'Page stuck after 3 attempts';
                    throw new Error(`${pageName}: ${errDetail}`);
                }
                console.log(`[Filler] Retrying page ${pageName} (attempt ${attempt + 1}/3)...`);
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

        // Classify error cause
        let cause = 'unknown';
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('browser has been closed') || msg.includes('target closed') || msg.includes('context or browser')) {
            cause = 'browser_closed';
        } else if (msg.includes('net::err_') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound')) {
            cause = 'network_error';
        } else if (msg.includes('timeout') || msg.includes('waiting for')) {
            cause = 'timeout';
        } else if (field) {
            cause = 'field_error';
        }

        return { success: false, error: e.message, stack: e.stack, field, page: currentPage, cause, browser, activePage: page };
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
    if (file.includes('complete_family3') || node === 'DeceasedSpouse') return 'DeceasedSpouse';
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
    await page.evaluate(() => new Promise(resolve => {
        const check = () => {
            const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
            if (!mgr || !mgr.get_isInAsyncPostBack()) resolve();
            else setTimeout(check, 150);
        };
        check();
    })).catch(() => { });

    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
    }).catch(() => { });
    await sleep(300);

    const countFields = () => page.evaluate(() => {
        let c = 0;
        document.querySelectorAll('select, input:not([type="hidden"]), textarea').forEach(el => {
            if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
        });
        return c;
    }).catch(() => 0);

    const initial = await countFields();
    let last = initial, stable = 0;
    while (Date.now() - start < 5000) {
        await sleep(300);
        const cur = await countFields();
        if (cur !== initial && cur === last) { stable += 300; if (stable >= 600) break; }
        else if (cur === initial && Date.now() - start > 1500) break;
        else stable = 0;
        last = cur;
    }
}

async function waitForPageReady(page, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
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
            if (!inPB && (count >= 3 || Date.now() - start > 3000)) return count;
        }
        await sleep(300);
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
    while (needsRescan && pass < 10) {
        needsRescan = await autoFillPass(page, fieldMap);
        pass++;
    }
}

async function autoFillPass(page, fieldMap) {
    const fields = await discoverFields(page);
    const visible = fields.filter(f => f.visible && f.id);
    let postbackNeeded = false, filled = 0;

    // Build a quick lookup of visible fields by ID
    const visibleMap = new Map();
    for (const f of visible) {
        if (f.id) visibleMap.set(f.id, f);
    }

    // CRITICAL: iterate in FIELD MAP order, not DOM order.
    // The field map is carefully ordered to respect form dependencies:
    // - Parent questions (radio Y/N) come before child fields (text/select)
    // - Postback triggers come before dependent dropdowns
    // - This ensures A is always filled before B
    for (const match of fieldMap) {
        // Find the visible field that matches this field map entry
        let field = null;
        for (const [id, f] of visibleMap) {
            if (match.pattern.test(id)) {
                field = f;
                break;
            }
        }
        if (!field) continue;

        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;

        const loc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);

        try {
            const isVis = await loc.isVisible({ timeout: 2000 }).catch(() => false);
            if (!isVis) continue;

            switch (match.type) {
                case 'text':
                    if (!field.value || field.value.trim() === '') {
                        await loc.fill(String(match.value));
                        filled++;
                    }
                    break;
                case 'select':
                    if (isSelectEmpty(field.value)) {
                        try { await loc.selectOption(match.value); }
                        catch { try { await loc.selectOption({ label: match.value }); } catch { await loc.selectOption({ index: 1 }).catch(() => { }); } }
                        filled++;
                        if (isPostbackSelect(field.id)) { postbackNeeded = true; }
                    }
                    break;
                case 'select-label':
                    if (isSelectEmpty(field.value)) {
                        await loc.selectOption({ label: match.value });
                        filled++;
                        if (isPostbackSelect(field.id)) postbackNeeded = true;
                    }
                    break;
                case 'select-search': {
                    if (!isSelectEmpty(field.value)) break;
                    const allOpts = await loc.evaluate(sel =>
                        Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
                    );
                    let found = allOpts.find(o => o.t.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase().includes(match.value.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v && o.v !== '' && o.v !== '-1' && !o.t.toUpperCase().includes('SELECT'));
                    if (found) { await loc.selectOption(found.v); filled++; if (isPostbackSelect(field.id)) postbackNeeded = true; }
                    break;
                }
                case 'click':
                    if (!field.checked) {
                        await loc.click();
                        filled++;
                        if (isPostbackClick(field.id, field.type)) postbackNeeded = true;
                    }
                    break;
                case 'checkbox-check':
                    if (!field.checked) { await loc.check(); filled++; }
                    break;
            }
        } catch { }
        if (postbackNeeded) break;
    }

    if (postbackNeeded) {
        await waitForPostback(page);
        return true;
    }
    return false;
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
    await next.click();
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 10000) {
        await sleep(300);
    }
    await waitForPageReady(page);
    return { navigated: page.url() !== urlBefore, newPage: identifyPage(page.url()) };
}

async function captureValidationErrors(page) {
    return page.evaluate(() => {
        const errors = new Set();

        // 1. ValidationSummary (official DS-160 error box at top of page)
        document.querySelectorAll('[id*="ValidationSummary"] li, [id*="valSummary"] li, .aspNetValidator, .validationSummary li').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 5) errors.add(text);
        });

        // 2. Error spans with red color (inline validation messages)
        document.querySelectorAll('span[style*="color"], span.error, span[id*="validator"], span[id*="Validator"]').forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const isRed = color === 'rgb(255, 0, 0)' || color === 'red' || el.style.color === 'Red' || el.style.color === 'red';
            const isVisible = el.offsetParent !== null && el.textContent?.trim().length > 3;
            if ((isRed || el.classList.contains('error')) && isVisible) {
                errors.add(el.textContent.trim());
            }
        });

        // 3. Error message divs
        document.querySelectorAll('.error-message li, .validation-error, [id*="errMsg"]').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 5) errors.add(text);
        });

        return Array.from(errors);
    }).catch(() => []);
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

    return {
        // --- Personal1 ---
        surname: g(p1, 'surname', 'surname'),
        givenName: g(p1, 'givenName', 'given_name'),
        fullNameNative: g(p1, 'fullNameNative', 'full_name_native'),
        otherNamesUsed: p1.otherNamesUsed === 'Y' || p1.other_names_used === 'Y',
        otherNames: p1.otherNames || p1.other_names || [],
        telecode: p1.telecode === 'Y',
        telecodeSurname: p1.telecodeSurname || p1.telecode_surname || '',
        telecodeGivenName: p1.telecodeGivenName || p1.telecode_given_name || '',
        sex: g(p1, 'sex', 'sex') || 'M',
        maritalStatus: g(p1, 'maritalStatus', 'marital_status') || 'S',
        otherMaritalStatusText: p1.otherMaritalStatusText || '',
        dob: p1.dob || { day: '', month: '', year: '' },
        cityOfBirth: g(p1, 'cityOfBirth', 'city_of_birth'),
        stateOfBirth: g(p1, 'stateOfBirth', 'state_of_birth'),
        countryOfBirth: g(p1, 'countryOfBirth', 'country_of_birth') || 'BRAZIL',
        // --- Personal2 ---
        nationality: g(p2, 'nationality', 'nationality') || 'BRAZIL',
        otherNationality: p2.otherNationality === 'Y',
        otherNationalityCountry: p2.otherNationalities?.[0]?.country,
        otherNationalityPassport: p2.otherNationalities?.[0]?.hasPassport === 'Y',
        otherNationalityPassportNumber: p2.otherNationalities?.[0]?.passportNumber,
        permanentResidentOtherCountry: p2.permanentResident === 'Y',
        permanentResidentCountry: p2.permanentResidentCountries?.[0]?.country,
        nationalId: g(p2, 'nationalId', 'national_id'),
        usSsn: p2.ssn !== 'N/A' ? p2.ssn?.replace(/-/g, '') : null,
        usTaxpayerId: p2.taxId || null,
        // --- Travel ---
        purposeOfTrip: g(trav, 'purposeOfTrip', 'purpose_of_trip') || 'B1/B2',
        hasSpecificPlans: trav.hasSpecificPlans === 'Y' || trav.hasSpecificPlans === true,
        travel: {
            arrivalDate: trav.arrivalDate || trav.arrival_date,
            departureDate: trav.departureDate || trav.departure_date,
            arrivalFlight: trav.arrivalFlight, arrivalCity: trav.arrivalCity,
            departureFlight: trav.departureFlight, departureCity: trav.departureCity,
            location: trav.specificLocation,
            lengthOfStay: {
                value: (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.value : trav.lengthOfStay) || trav.length_of_stay || '30',
                unit: (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.unit : trav.lengthOfStayUnit) || trav.length_of_stay_unit || 'D'
            },
            usAddress: trav.usAddress || trav.us_address || { street1: 'N/A', street2: '', city: 'N/A', state: 'FL', zip: '00000' }
        },
        payingForTrip: trav.whoIsPaying || trav.who_is_paying || 'S',
        payer: trav.payer ? (() => {
            const p = trav.payer;
            const pa = p.address || {};
            return {
                surname: p.surname, givenName: p.givenName,
                phone: p.phone, email: p.email,
                relationship: p.relationship,
                sameAddress: p.sameAddress === 'Y' || p.sameAddress === true,
                street1: p.street1 || pa.street1 || '',
                street2: p.street2 || pa.street2 || '',
                city: p.city || pa.city || '',
                state: p.state || pa.state || '',
                postalCode: p.postalCode || pa.postalCode || '',
                country: p.country || pa.country || '',
                companyName: p.companyName, companyPhone: p.companyPhone,
                companyRelation: p.companyRelation,
            };
        })() : null,
        // --- Travel Companions ---
        travelingWithOthers: tc.travelingWithOthers === 'Y',
        companions: tc.companions || [],
        partOfGroup: tc.partOfGroup === 'Y',
        groupName: tc.groupName || '',
        // --- Previous US Travel ---
        hasBeenInUS: prev.hasBeenInUS === 'Y',
        previousUSVisit: prev.previousVisits?.[0] || null,
        previousUSDriversLicense: prev.hasDriversLicense === 'Y',
        previousUSDriversLicenseNumber: prev.driversLicenses?.[0]?.number,
        previousUSDriversLicenseState: prev.driversLicenses?.[0]?.state,
        hasUSVisa: prev.hasUSVisa === 'Y',
        previousVisa: prev.previousVisa ? {
            ...prev.previousVisa,
            sameType: prev.previousVisa.sameType === 'Y' || prev.previousVisa.sameType === true,
            sameCountry: prev.previousVisa.sameCountry === 'Y' || prev.previousVisa.sameCountry === true,
            tenPrint: prev.previousVisa.tenPrint === 'Y' || prev.previousVisa.tenPrint === true,
            lost: prev.previousVisa.lost === 'Y' || prev.previousVisa.lost === true,
            cancelled: prev.previousVisa.cancelled === 'Y' || prev.previousVisa.cancelled === true,
        } : null,
        visaRefused: prev.visaRefused === 'Y',
        visaRefusedExplanation: prev.visaRefusedExplanation || '',
        immigrantPetition: prev.immigrantPetition === 'Y',
        immigrantPetitionExplanation: prev.immigrantPetitionExplanation || '',
        permanentResident: prev.permanentResident === 'Y',
        permanentResidentExplanation: prev.permanentResidentExplanation || '',
        vwpDenial: prev.vwpDenial === 'Y',
        vwpDenialExplanation: prev.vwpDenialExplanation || '',
        // --- Address & Phone ---
        homeAddress: addr.homeAddress || addr.home_address || {},
        mailingAddressSame: addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true,
        mailingAddress: addr.mailingAddress || addr.mailing_address || null,
        phone: g(addr, 'phone', 'phone'),
        mobilePhone: addr.mobilePhone || addr.mobile_phone || null,
        businessPhone: addr.businessPhone || addr.business_phone || null,
        email: g(addr, 'email', 'email'),
        additionalPhones: addr.additionalPhones === 'Y',
        additionalPhoneNumbers: addr.additionalPhoneNumbers || [],
        additionalEmails: addr.additionalEmails === 'Y',
        additionalEmailAddresses: addr.additionalEmailAddresses || [],
        additionalWebsites: false,
        socialMedia: addr.socialMedia ? [addr.socialMedia] : (addr.social_media || []),
        additionalSocialMedia: addr.additionalSocialMedia === 'Y',
        additionalSocialMediaAccounts: addr.additionalSocialMediaAccounts || [],
        // --- Passport ---
        passport: {
            type: g(ppt, 'type', 'type') || 'R',
            number: g(ppt, 'number', 'number'),
            bookNumber: ppt.bookNumber || '',
            issuingCountry: g(ppt, 'issuingCountry', 'issuing_country') || 'BRAZIL',
            issuedCity: g(ppt, 'issuedCity', 'issued_city'),
            issuedState: g(ppt, 'issuedState', 'issued_state'),
            issuedCountry: g(ppt, 'issuedCountry', 'issued_country') || 'BRAZIL',
            issuanceDate: ppt.issuanceDate || ppt.issuance_date,
            expirationDate: ppt.expirationDate || ppt.expiration_date,
            lostOrStolen: ppt.lostOrStolen === 'Y',
            lostPassport: ppt.lostPassports?.[0] || null,
        },
        // --- US Contact ---
        usContact: (() => {
            const uc = data.usContact || data.us_contact || {};
            const ucAddr = uc.address || {};
            return {
                surname: uc.surname || '',
                givenName: uc.givenName || uc.given_name || '',
                organization: uc.organization || '',
                relationship: uc.relationship || 'O',
                street1: uc.street1 || ucAddr.street1 || '',
                city: uc.city || ucAddr.city || '',
                state: uc.state || ucAddr.state || '',
                zip: uc.zip || ucAddr.zip || '',
                phone: uc.phone || '',
                email: uc.email || '',
            };
        })(),
        // --- Family ---
        father: fam1.father || {},
        mother: fam1.mother || {},
        spouse: fam2.spouse || (fam2.surname ? fam2 : null),
        relativesInUS: (fam1.immediateRelativesInUS || fam1.relativesInUS) === 'Y',
        immediateRelative: (() => {
            const rel = fam1.relatives?.[0] || fam1.immediateRelative;
            if (!rel) return null;
            return {
                surname: rel.surname || '',
                givenName: rel.givenName || rel.given_name || '',
                relationship: rel.type || rel.relationship || '',
                status: rel.status || '',
            };
        })(),
        otherRelativesInUS: fam1.otherRelativesInUS === 'Y',
        previousSpouse: data.prevSpouse || data.previousSpouse || null,
        // --- Work/Education ---
        occupationCode: g(we1, 'occupation', 'occupation') || 'H',
        employer: (() => {
            const e = we1.employer || {};
            return {
                name: e.name || '',
                street1: e.street1 || '',
                street2: e.street2 || '',
                city: e.city || '',
                state: e.state || '',
                postalCode: e.postalCode || '',
                country: e.country || 'BRAZIL',
                phone: e.phone || '',
                monthlyIncome: String(e.monthlyIncome || e.monthlySalary || e.monthly_salary || '').replace(/[^\d]/g, ''),
                startDate: e.startDate || e.start_date || { month: '', year: '' },
                duties: e.duties || '',
            };
        })(),
        hasPreviousEmployment: we2.hasPreviousEmployment === 'Y' || we2.has_previous_employment === 'Y',
        previousEmployment: we2.previousEmployment || we2.previous_employment || [],
        hasEducation: we2.hasEducation === 'Y' || we2.has_education === 'Y',
        education: (we2.education || []).map(e => ({
            name: e.name || '',
            street1: e.street1 || '',
            street2: e.street2 || '',
            city: e.city || '',
            state: e.state || '',
            postalCode: e.postalCode || e.postal_code || '',
            country: e.country || 'BRAZIL',
            courseOfStudy: e.courseOfStudy || e.course_of_study || e.course || '',
            startDate: e.startDate || e.start_date || { month: '', year: '' },
            endDate: e.endDate || e.end_date || { month: '', year: '' },
        })),
        languages: we3.languages || ['PORTUGUESE'],
        clanTribe: we3.clanTribe === 'Y',
        clanTribeName: we3.clanTribeName || '',
        countriesVisited: we3.countriesVisited === 'Y',
        countriesVisitedList: we3.countriesVisitedList || [],
        organizationMember: we3.organizationMember === 'Y',
        organizationName: Array.isArray(we3.organizations) ? we3.organizations[0] : we3.organizationName || '',
        specializedSkills: we3.specializedSkills === 'Y',
        specializedSkillsExplanation: we3.specializedSkillsExplanation || '',
        militaryService: we3.militaryService === 'Y',
        military: Array.isArray(we3.military) ? we3.military[0] : we3.military || null,
        insurgentOrg: we3.insurgentOrg === 'Y',
        insurgentOrgExplanation: we3.insurgentOrgExplanation || '',
        // --- Meta ---
        location: data.location || 'SPL',
        securityAnswer: data.securityAnswer || data.security_answer || 'BRAZIL'
    };
}

module.exports = { fillApplication };
