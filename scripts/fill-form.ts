import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { applicant, DS160Applicant } from "../tests/fixtures/brazilian-applicant";
import { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } from "./build-field-map";

// ====================================================================
// CONSTANTS
// ====================================================================
const SIGNAL_DIR = path.join(__dirname, "..", "tmp");
const CAPTCHA_IMG = path.join(SIGNAL_DIR, "captcha.png");
const CAPTCHA_READY = path.join(SIGNAL_DIR, "captcha-ready.txt");
const CAPTCHA_ANSWER = path.join(SIGNAL_DIR, "captcha-answer.txt");
const APP_ID_FILE = path.join(SIGNAL_DIR, "application-id.txt");
const RESULTS_DIR = path.join(__dirname, "..", "test-results");
const CDP_PORT = 9222;

// Anti-banner Chromium flags (suppress dialogs, popups, infobars)
const CHROMIUM_ARGS = [
  '--no-first-run',
  '--disable-background-timer-throttling',
  '--no-default-browser-check',
  '--disable-infobars',
  '--disable-save-password-bubble',
  '--disable-translate',
  '--disable-features=TranslateUI,AutofillSaveCardBubble,PasswordManagerOnboarding,AutofillCreditCardEnabled,AutofillAddressEnabled',
  '--disable-component-update',
  '--disable-popup-blocking',
  '--password-store=basic',
  '--disable-notifications',
  '--suppress-message-center-popups',
];

// ====================================================================
// BROWSER LIFECYCLE: Global state + signal handlers
// ====================================================================
let _browser: Browser | null = null;
let _launchedByUs = false;
let _shuttingDown = false;

/** Kill any stale Chromium process holding the CDP port */
async function killStaleChromium(): Promise<void> {
  try {
    const result = execSync('netstat -ano | findstr :9222 | findstr LISTENING', {
      encoding: 'utf8', timeout: 5_000,
    });
    const pids = new Set<string>();
    for (const line of result.trim().split('\n')) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', timeout: 5_000 });
      console.log(`>>> Killed stale process PID ${pid} on port ${CDP_PORT}`);
    }
    if (pids.size > 0) {
      await new Promise(r => setTimeout(r, 2000)); // Wait for port release
    }
  } catch {
    // No stale process or command failed - OK
  }
}

/** Gracefully shutdown browser */
async function shutdownBrowser(reason: string): Promise<void> {
  console.log(`\n>>> Shutdown: ${reason}`);
  if (_browser) {
    try {
      await _browser.close();
      console.log('>>> Browser closed successfully');
    } catch {
      console.log('>>> Browser already closed');
    }
    _browser = null;
  }
}

/** Setup signal handlers for graceful shutdown */
function setupSignalHandlers(): void {
  const handler = async (signal: string) => {
    if (_shuttingDown) return;
    _shuttingDown = true;
    await shutdownBrowser(signal);
    process.exit(0);
  };
  process.on('SIGINT', () => handler('SIGINT (Ctrl+C)'));
  process.on('SIGTERM', () => handler('SIGTERM'));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanup() {
  [CAPTCHA_READY, CAPTCHA_ANSWER, CAPTCHA_IMG].forEach((f) => {
    try { fs.unlinkSync(f); } catch { }
  });
}

async function waitForFile(filePath: string, timeout = 300_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content.length > 0) return content;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${filePath}`);
}

// ====================================================================
// SMART WAIT: scroll + detect inputs instead of fixed timers
// Max 10s initial, extend +10s if no inputs found, scroll to trigger lazy load
// ====================================================================
async function waitForPageReady(page: Page, description: string, expectInputs = true): Promise<number> {
  const start = Date.now();
  const MAX_WAIT = expectInputs ? 10_000 : 5_000;
  const EXTEND = 10_000;
  let extended = false;
  let inputCount = 0;

  while (Date.now() - start < (extended ? MAX_WAIT + EXTEND : MAX_WAIT)) {
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);
    }).catch(() => { });

    // Count visible inputs on the page
    inputCount = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach((el: any) => {
        if (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox") count++;
      });
      return count;
    }).catch(() => 0);

    if (inputCount > 0) {
      // Check ASP.NET postback is done
      const inPostback = await page.evaluate(() => {
        const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return mgr?.get_isInAsyncPostBack?.() || false;
      }).catch(() => false);

      if (!inPostback) {
        // If expecting form inputs but only found very few, keep waiting (page might still be loading)
        if (expectInputs && inputCount < 3 && Date.now() - start < 3_000) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        const elapsed = Date.now() - start;
        console.log(`>>> [${description}] Page ready: ${inputCount} inputs found in ${elapsed}ms`);
        return inputCount;
      }
    }

    // If we're past MAX_WAIT and still no inputs, extend once
    if (Date.now() - start > MAX_WAIT && !extended && expectInputs) {
      extended = true;
      console.log(`>>> [${description}] No inputs after ${MAX_WAIT}ms, extending +${EXTEND}ms...`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`>>> [${description}] Timeout: ${inputCount} inputs found after ${Date.now() - start}ms`);
  return inputCount;
}

// Wait for postback to complete (ASP.NET async postback + new fields)
// Also waits for field count to change/stabilize (catches client-side panel toggles)
async function waitForPostback(page: Page): Promise<void> {
  const start = Date.now();

  // Count fields before
  const countFields = () => page.evaluate(() => {
    let count = 0;
    document.querySelectorAll("select, input:not([type='hidden']), textarea").forEach((el: any) => {
      if (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox") count++;
    });
    return count;
  }).catch(() => 0);
  const initialCount = await countFields();

  // 1. Wait for ASP.NET PageRequestManager to finish
  await page.evaluate(() => new Promise<void>((resolve) => {
    const check = () => {
      const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
      if (!mgr || !mgr.get_isInAsyncPostBack()) resolve();
      else setTimeout(check, 150);
    };
    check();
  })).catch(() => { });

  // 2. Scroll + wait for field count to change or stabilize
  let lastCount = initialCount;
  let stableFor = 0;
  const MAX_WAIT = 5_000;
  while (Date.now() - start < MAX_WAIT) {
    // Scroll to trigger lazy loading / panel rendering
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);
    }).catch(() => { });

    await new Promise((r) => setTimeout(r, 300));

    const currentCount = await countFields();
    if (currentCount !== initialCount && currentCount === lastCount) {
      stableFor += 300;
      if (stableFor >= 600) break; // Field count changed and has been stable
    } else if (currentCount === initialCount && Date.now() - start > 1500) {
      break; // No change after 1.5s - no new fields expected
    } else {
      stableFor = 0;
    }
    lastCount = currentCount;
  }

  console.log(`>>> Postback done in ${Date.now() - start}ms (fields: ${initialCount} -> ${lastCount})`);
}

// ====================================================================
// BROWSER MANAGEMENT: Reuse existing or create new - ALWAYS 1 tab
// ====================================================================
async function getOrCreateBrowser(): Promise<{ browser: Browser; page: Page; isNew: boolean }> {
  // Strategy 1: Try connecting to existing browser via CDP
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    console.log(">>> Connected to existing browser via CDP");
    _browser = browser;
    _launchedByUs = false;

    // Reuse existing tab (first page of first context)
    const contexts = browser.contexts();
    for (const ctx of contexts) {
      const pages = ctx.pages();
      if (pages.length > 0) {
        const page = pages[0];
        // Close any extra tabs
        for (let i = 1; i < pages.length; i++) {
          console.log(`>>> Closing extra tab: ${pages[i].url()}`);
          await pages[i].close();
        }
        console.log(`>>> Reusing existing tab (current URL: ${page.url()})`);
        return { browser, page, isNew: false };
      }
    }

    // Browser exists but no tabs - create one
    const ctx = contexts.length > 0 ? contexts[0] : await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    console.log(">>> Created new tab in existing browser");
    return { browser, page, isNew: false };
  } catch {
    // No existing browser - kill stale processes and launch fresh
    console.log(">>> No existing browser found, preparing to launch...");
    await killStaleChromium();

    console.log(">>> Launching Chromium with anti-banner flags...");
    const browser = await chromium.launch({
      headless: false,
      args: [`--remote-debugging-port=${CDP_PORT}`, ...CHROMIUM_ARGS],
      slowMo: 100,
    });
    _browser = browser;
    _launchedByUs = true;

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    console.log(">>> Chromium launched successfully");
    return { browser, page, isNew: true };
  }
}



async function saveRecoveryData(page: Page, applicant: DS160Applicant): Promise<void> {
  const appId = await extractApplicationId(page);

  if (!appId) {
    console.log('>>> WARNING: Application ID not found, recovery data not saved');
    return;
  }

  const recovery = {
    applicationId: appId,
    securityQuestion: applicant.securityQuestion,
    securityAnswer: applicant.securityAnswer,
    surname: applicant.surname,
    givenName: applicant.givenName,
    interviewLocation: applicant.location,
    year: new Date().getFullYear().toString(),
    savedAt: new Date().toISOString(),
    profile: process.env.DS160_PROFILE || 'single-male'
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = path.join(SIGNAL_DIR, `ds160-recovery-${applicant.surname}-${timestamp}.json`);

  fs.writeFileSync(filename, JSON.stringify(recovery, null, 2), 'utf-8');
  fs.writeFileSync(APP_ID_FILE, appId, 'utf-8'); // Also save to legacy location

  console.log('\n' + '='.repeat(60));
  console.log('>>> ✅ RECOVERY DATA SAVED');
  console.log(`>>> Application ID: ${appId}`);
  console.log(`>>> File: ${path.basename(filename)}`);
  console.log(`>>> To recover: Use Application ID + Security Answer on DS-160 website`);
  console.log('='.repeat(60) + '\n');
}

// ====================================================================
// CHECKPOINT SYSTEM: Save state after each page
// ====================================================================
interface Checkpoint {
  lastCompletedPage: string;
  lastCompletedPageNumber: number;
  lastPageUrl: string;
  applicationId: string;
  timestamp: string;
}

function saveCheckpoint(page: Page, pageInfo: any, pageCount: number, appId: string): void {
  const checkpoint: Checkpoint = {
    lastCompletedPage: pageInfo.name,
    lastCompletedPageNumber: pageCount,
    lastPageUrl: page.url(),
    applicationId: appId,
    timestamp: new Date().toISOString()
  };

  const file = path.join(SIGNAL_DIR, 'checkpoint.json');
  fs.writeFileSync(file, JSON.stringify(checkpoint, null, 2), 'utf-8');
  console.log(`>>> Checkpoint saved: ${pageInfo.name} (page ${pageCount})`);
}

function loadCheckpoint(): Checkpoint | null {
  const file = path.join(SIGNAL_DIR, 'checkpoint.json');
  if (!fs.existsSync(file)) return null;

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

// ====================================================================
// UNKNOWN PAGE HANDLER: Detect and recover from unexpected pages
// ====================================================================
interface UnknownPageAction {
  urlPattern: RegExp;
  name: string;
  action: 'retry' | 'recover' | 'wait-refresh' | 'fatal';
  description: string;
}

const UNKNOWN_PAGE_HANDLERS: UnknownPageAction[] = [
  {
    urlPattern: /session.*expired|timeout|SessionTimeOut/i,
    name: 'SessionExpired',
    action: 'recover',
    description: 'Session expired - will recover using Application ID'
  },
  {
    urlPattern: /error|500|503|GeneralError/i,
    name: 'ServerError',
    action: 'wait-refresh',
    description: 'Server error - will wait 30s and refresh'
  },
  {
    urlPattern: /captcha|ConfirmApplicationID/i,
    name: 'CaptchaOrConfirmPage',
    action: 'retry',
    description: 'Back to confirm/captcha - normal, continuing'
  },
  {
    urlPattern: /Default\.aspx$/,
    name: 'BackToStart',
    action: 'recover',
    description: 'Redirected to start page - will recover application'
  }
];

async function handleUnknownPage(page: Page, url: string, applicant: DS160Applicant): Promise<boolean> {
  console.log('\n' + '!'.repeat(60));
  console.log('>>> ⚠️ UNKNOWN PAGE DETECTED');
  console.log(`>>> URL: ${url}`);
  console.log('!'.repeat(60));

  // Take screenshot for debugging
  await page.screenshot({ path: path.join(RESULTS_DIR, 'unknown-page-detected.png'), fullPage: true }).catch(() => { });

  // Check all handlers
  for (const handler of UNKNOWN_PAGE_HANDLERS) {
    if (handler.urlPattern.test(url)) {
      console.log(`>>> Identified as: ${handler.name}`);
      console.log(`>>> Action: ${handler.action}`);
      console.log(`>>> ${handler.description}`);

      switch (handler.action) {
        case 'recover':
          console.log('>>> Attempting smart recovery...');
          return await smartRecover(page, applicant);

        case 'wait-refresh':
          console.log('>>> Waiting 30 seconds before refresh...');
          await new Promise(r => setTimeout(r, 30000));
          await page.reload();
          await waitForPageReady(page, 'post-refresh');
          return true;

        case 'retry':
          console.log('>>> Reloading page...');
          await page.reload();
          await waitForPageReady(page, 'post-retry');
          return true;

        case 'fatal':
          return false;
      }
    }
  }

  // Truly unknown - critical error
  console.log('>>> ❌ FATAL: Completely unknown page type');
  console.log('>>> Screenshot saved to: unknown-page-detected.png');
  console.log('>>> Manual intervention required');
  return false;
}

// ====================================================================
// SMART RECOVERY: Recover application and continue
// ====================================================================
async function smartRecover(page: Page, applicant: DS160Applicant): Promise<boolean> {
  const checkpoint = loadCheckpoint();
  const savedAppId = loadApplicationId();

  if (!savedAppId) {
    console.log('>>> ❌ Cannot recover: No saved Application ID');
    return false;
  }

  console.log(`>>> 🔄 SMART RECOVERY INITIATED`);
  console.log(`>>> Application ID: ${savedAppId}`);
  console.log(`>>> Last completed: ${checkpoint?.lastCompletedPage || 'unknown'}`);

  try {
    // Navigate to start
    await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page, 'recovery-start');

    // Click Retrieve
    const retrieveBtn = page.locator('#ctl00_SiteContentPlaceHolder_btnRetrieveApp');
    if (await retrieveBtn.isVisible().catch(() => false)) {
      await retrieveBtn.click();
      await waitForPageReady(page, 'retrieve-form');
    }

    // Fill recovery form
    await page.locator('#ctl00_SiteContentPlaceHolder_txtApplicationID').fill(savedAppId);
    await page.locator('#ctl00_SiteContentPlaceHolder_txtSurname').fill(applicant.surname);
    await page.locator('#ctl00_SiteContentPlaceHolder_ddlYear').selectOption(new Date().getFullYear().toString());
    await page.locator('#ctl00_SiteContentPlaceHolder_ddlLocation').selectOption(applicant.location);

    // Submit
    await page.locator('#ctl00_SiteContentPlaceHolder_btnRetrieve').click();
    await waitForPageReady(page, 'post-retrieve');

    // Verify recovery
    const currentPage = identifyPage(page.url());
    console.log(`>>> ✅ Recovered to: ${currentPage.name}`);

    return currentPage.section !== 'unknown';
  } catch (err) {
    console.log('>>> ❌ Recovery failed:', err);
    return false;
  }
}

// ====================================================================
// URL-BASED PAGE IDENTIFICATION
// ====================================================================
function identifyPage(url: string): { name: string; node: string; section: string } {
  const nodeMatch = url.match(/node=(\w+)/);
  const node = nodeMatch ? nodeMatch[1] : "";
  const file = url.split("/").pop()?.split("?")[0] || "";

  if (url.includes("Default.aspx")) return { name: "Landing", node, section: "start" };
  if (url.includes("ConfirmApplicationID") || url.includes("SecureQuestion"))
    return { name: "SecurityQuestion", node, section: "start" };
  if (file.includes("complete_personal") && node === "Personal1")
    return { name: "Personal1", node, section: "personal" };
  if (file.includes("complete_personal") && node === "Personal2")
    return { name: "Personal2", node, section: "personal" };
  if (file.includes("complete_travel.aspx"))
    return { name: "Travel", node, section: "travel" };
  if (file.includes("complete_travelcompanions"))
    return { name: "TravelCompanions", node, section: "travel" };
  if (file.includes("complete_previousustravel"))
    return { name: "PreviousUSTravel", node, section: "travel" };
  if (file.includes("complete_addressphone") || file.includes("complete_contact"))
    return { name: "AddressPhone", node, section: "contact" };
  if (file.includes("complete_pptvisa") || file.includes("Passport_Visa"))
    return { name: "Passport", node, section: "documents" };
  if (file.includes("complete_uscontact"))
    return { name: "USContact", node, section: "contact" };
  if (file.includes("complete_family1"))
    return { name: "Family1", node, section: "family" };
  if (file.includes("complete_family2"))
    return { name: "Family2", node, section: "family" };
  if (file.includes("complete_family4") || node === "PrevSpouse")
    return { name: "PrevSpouse", node, section: "family" };
  if (file.includes("complete_workeducation1"))
    return { name: "WorkEducation1", node, section: "work" };
  if (file.includes("complete_workeducation2"))
    return { name: "WorkEducation2", node, section: "work" };
  if (file.includes("complete_workeducation3"))
    return { name: "WorkEducation3", node, section: "work" };
  if (file.includes("complete_addlworkeducation"))
    return { name: "AdditionalWork", node, section: "work" };
  if (url.includes("SecurityandBackground"))
    return { name: `Security`, node, section: "security" };
  if (url.includes("UploadPhoto"))
    return { name: "Photo", node, section: "final" };
  if (url.includes("ReviewPage") || url.includes("Review"))
    return { name: "Review", node, section: "final" };
  if (url.includes("Confirmation"))
    return { name: "Confirmation", node, section: "final" };

  // Fallback: use node parameter if available
  if (node) {
    const sec = node.includes("Personal") ? "personal" : node.includes("Travel") ? "travel"
      : node.includes("Address") || node.includes("Contact") ? "contact"
        : node.includes("Ppt") || node.includes("Visa") ? "documents"
          : node.includes("Relat") || node.includes("Family") ? "family"
            : node.includes("Work") || node.includes("Educ") ? "work"
              : node.includes("Security") ? "security" : "unknown";
    return { name: node, node, section: sec };
  }
  return { name: `Unknown(${file})`, node, section: "unknown" };
}

function pageHeader(url: string): string {
  const p = identifyPage(url);
  return `[${p.section.toUpperCase()}] ${p.name} (node=${p.node})`;
}

// ====================================================================
// Discover all visible fields on the current page
// ====================================================================
async function discoverFields(page: Page) {
  return await page.evaluate(() => {
    const fields: any[] = [];
    document.querySelectorAll("select").forEach((sel: any) => {
      if (sel.id.includes("ddlLanguage")) return;
      const opts = Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text, s: o.selected }));
      fields.push({
        tag: "select", id: sel.id, visible: sel.offsetParent !== null,
        value: sel.value, optCount: opts.length,
        opts: opts.slice(0, 5).map((o: any) => `${o.v}=${o.t}`).join("|"),
      });
    });
    document.querySelectorAll("input").forEach((inp: any) => {
      if (inp.type === "hidden") return;
      const f: any = { tag: "input", id: inp.id, type: inp.type, visible: inp.offsetParent !== null || inp.type === "radio" || inp.type === "checkbox" };
      if (inp.type === "text" || inp.type === "email" || inp.type === "tel") f.value = inp.value;
      else if (inp.type === "radio" || inp.type === "checkbox") { f.checked = inp.checked; f.radioValue = inp.value; }
      else if (inp.type === "submit") f.btnValue = inp.value;
      fields.push(f);
    });
    document.querySelectorAll("textarea").forEach((ta: any) => {
      fields.push({ tag: "textarea", id: ta.id, visible: ta.offsetParent !== null, value: ta.value });
    });
    return fields;
  });
}

// ====================================================================
// Auto-fill: discover fields, match patterns, fill, break on postback
// ====================================================================
async function autoFillPage(page: Page, fieldMap: ReturnType<typeof buildDynamicFieldMap>, pageLabel: string) {
  const fields = await discoverFields(page);
  const visibleFields = fields.filter((f: any) => f.visible && f.id);

  // Compact summary log
  const summary = visibleFields.map((f: any) => {
    const short = f.id.split("_").slice(-2).join("_");
    if (f.tag === "select") return `[S]${short}(${f.optCount}opts,val=${f.value})`;
    if (f.type === "radio") return `[R]${short}(${f.checked ? "X" : " "})`;
    if (f.type === "checkbox") return `[C]${short}(${f.checked ? "X" : " "})`;
    if (f.type === "text") return `[T]${short}="${f.value || ""}"`;
    if (f.type === "submit") return `[B]${f.btnValue}`;
    return `[?]${short}`;
  });
  console.log(`\n>>> ${pageLabel} - ${visibleFields.length} fields: ${summary.join(", ")}`);

  let postbackNeeded = false;
  let filled = 0;
  let skipped = 0;

  for (const field of visibleFields) {
    if (!field.id) continue;
    if (field.type === "submit" || field.type === "image" || field.type === "button") continue;
    if (field.id.includes("HelpButton") || field.id.includes("btnWarning") || field.id.includes("btnRecover")
      || field.id.includes("btnOkWarning") || field.id.includes("btnCancel") || field.id.includes("btnClient")
      || field.id.includes("btnReviewPage") || field.id.includes("btnNextPage") || field.id.includes("btnModalHolder")) continue;

    const match = fieldMap.find((m) => m.pattern.test(field.id));
    if (!match) {
      if (field.tag === "select" && field.value && field.value !== "" && field.value !== "-1") continue;
      if ((field.type === "text" || field.tag === "textarea") && field.value) continue;
      if ((field.type === "radio" || field.type === "checkbox") && field.checked) continue;
      skipped++;
      console.log(`   ? No match: ${field.id} (${field.tag}/${field.type})`);
      continue;
    }

    try {
      const loc = page.locator(`#${field.id.replace(/\$/g, "\\$")}`);
      const isVis = await loc.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVis) continue;

      switch (match.type) {
        case "text":
          if (!field.value) {
            await loc.fill(match.value);
            filled++;
          }
          break;

        case "select": {
          if (!field.value || field.value === "" || field.value === "-1" || field.value.trim() === "") {
            const shortSel = field.id.split("_").pop();
            try {
              await loc.selectOption(match.value);
              console.log(`   > select "${shortSel}" = "${match.value}"`);
            } catch {
              try {
                await loc.selectOption({ label: match.value });
                console.log(`   > select "${shortSel}" = label:"${match.value}"`);
              } catch {
                await loc.selectOption({ index: 1 }).catch(() => { });
                console.log(`   > select "${shortSel}" = index:1 (fallback)`);
              }
            }
            filled++;
            if (isPostbackSelect(field.id)) {
              postbackNeeded = true;
              console.log(`   >>> Postback trigger: ${shortSel} - breaking to rescan`);
              break;
            }
          }
          break;
        }

        case "select-label":
          if (!field.value || field.value === "" || field.value === "-1") {
            await loc.selectOption({ label: match.value });
            filled++;
            if (isPostbackSelect(field.id)) {
              postbackNeeded = true;
              console.log(`   >>> Postback trigger: ${field.id.split("_").pop()} - breaking to rescan`);
            }
          }
          break;

        case "select-search": {
          if (field.value && field.value !== "" && field.value !== "-1" && !field.value.toUpperCase().includes("SONE")) break;

          const allOpts = await loc.evaluate((sel: any) =>
            Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text }))
          );
          const shortId = field.id.split("_").pop();
          console.log(`   > select-search "${shortId}" for "${match.value}" in ${allOpts.length} opts: ${allOpts.slice(0, 8).map((o: any) => `${o.v}="${o.t}"`).join(", ")}`);

          let found = allOpts.find((o: any) => o.t.toUpperCase().includes(match.value.toUpperCase()));
          if (!found) found = allOpts.find((o: any) => o.v && o.v.toUpperCase().includes(match.value.toUpperCase()));
          if (!found) found = allOpts.find((o: any) => o.v && o.v !== "" && o.v !== "-1" && !o.t.toUpperCase().includes("SELECT"));

          if (found) {
            await loc.selectOption(found.v);
            filled++;
            console.log(`   > Selected: ${found.v}="${found.t}"`);
            if (isPostbackSelect(field.id)) {
              postbackNeeded = true;
              console.log(`   >>> Postback trigger: ${shortId} - breaking to rescan`);
            }
          } else {
            console.log(`   ! select-search: no match for "${match.value}"`);
          }
          break;
        }

        case "click":
          if (!field.checked) {
            await loc.click();
            filled++;
            if (isPostbackClick(field.id, field.type)) {
              postbackNeeded = true;
              console.log(`   >>> Postback trigger: ${field.id.split("_").pop()} - breaking to rescan`);
            }
          }
          break;

        case "checkbox-check":
          if (!field.checked) {
            await loc.check();
            filled++;
          }
          break;
      }
    } catch (e: any) {
      console.log(`   ! Error filling ${field.id}: ${e.message.slice(0, 80)}`);
    }

    if (postbackNeeded) break;
  }

  console.log(`>>> Filled ${filled}, skipped ${skipped} unmatched${postbackNeeded ? " (stopped for postback)" : ""}`);

  if (postbackNeeded) {
    console.log(">>> Waiting for postback...");
    await waitForPostback(page);
    return true; // need re-scan
  }
  return false;
}

// ====================================================================
// Capture validation errors from the page
// ====================================================================
async function captureErrors(page: Page): Promise<string[]> {
  const errors = await page.evaluate(() => {
    const texts: string[] = [];
    // Red text (ASP.NET validators)
    document.querySelectorAll("span[style*='color:Red'], span[style*='color: Red'], span[style*='color:red']").forEach((el: any) => {
      const t = el.textContent?.trim();
      if (t && t.length > 0 && !texts.includes(t)) texts.push(t);
    });
    // Validation summary
    const vs = document.querySelector("[id*='ValidationSummary']");
    if (vs) {
      const t = vs.textContent?.trim();
      if (t) texts.push("VS: " + t);
    }
    // Error classes
    document.querySelectorAll("[class*='error' i]").forEach((el: any) => {
      const t = el.textContent?.trim();
      if (t && t.length > 2 && t.length < 300 && !texts.includes(t)) texts.push(t);
    });
    return texts;
  });
  if (errors.length > 0) {
    console.log(">>> ERRORS FOUND:", errors.join(" | "));
  }
  return errors;
}

// ====================================================================
// Check unfilled fields
// ====================================================================
async function checkUnfilled(page: Page): Promise<string[]> {
  const unfilled = await page.evaluate(() => {
    const empty: string[] = [];
    document.querySelectorAll("select").forEach((sel: any) => {
      if (sel.id.includes("ddlLanguage") || sel.offsetParent === null) return;
      if (!sel.value || sel.value === "" || sel.value === "-1" || sel.selectedIndex === 0) {
        const first = sel.options[0]?.text || "";
        if (first.toLowerCase().includes("select") || first.includes("- ") || first.trim() === "") {
          empty.push(`S:${sel.id.split("_").pop()}="${first}"`);
        }
      }
    });
    document.querySelectorAll("input[type='text']").forEach((inp: any) => {
      if (inp.offsetParent === null || inp.style.display === "none") return;
      if (!inp.value?.trim()) {
        const parentRow = inp.closest("tr, div, td");
        if (parentRow) {
          const naChk = parentRow.querySelector("input[type='checkbox'][id*='NA']:checked, input[type='checkbox'][id*='_na']:checked");
          if (naChk) return;
        }
        empty.push(`T:${inp.id.split("_").pop()}`);
      }
    });
    const radioGroups = new Map<string, boolean>();
    document.querySelectorAll("input[type='radio']").forEach((r: any) => {
      if (r.offsetParent === null && !r.closest("table")) return;
      if (!radioGroups.has(r.name)) radioGroups.set(r.name, false);
      if (r.checked) radioGroups.set(r.name, true);
    });
    radioGroups.forEach((selected, name) => {
      if (!selected) empty.push(`R:${name.split("$").pop()}`);
    });
    return empty;
  });
  if (unfilled.length > 0) console.log(`>>> UNFILLED: ${unfilled.join(", ")}`);
  else console.log(">>> All fields filled OK");
  return unfilled;
}

// ====================================================================
// Full page diagnostic: URL + errors + all fields + unfilled
// ====================================================================
async function diagnosePage(page: Page, reason: string) {
  const url = page.url();
  const pageInfo = identifyPage(url);
  console.log(`\n>>> ===== DIAGNOSTIC: ${reason} =====`);
  console.log(`>>> URL: ${url}`);
  console.log(`>>> Page: ${pageInfo.name} | Section: ${pageInfo.section} | Node: ${pageInfo.node}`);

  await captureErrors(page);

  const fields = await discoverFields(page);
  const visible = fields.filter((f: any) => f.visible);
  console.log(`>>> Total visible fields: ${visible.length}`);

  for (const f of visible) {
    if (f.type === "submit" || f.type === "image") continue;
    const id = f.id || "(no-id)";
    let info = `  ${f.tag}/${f.type || ""} id=${id}`;
    if (f.tag === "select") {
      info += ` val="${f.value}" opts=${f.optCount} [${f.opts}]`;
      if (!f.value || f.value === "" || f.value === "-1") info += " *** EMPTY ***";
    } else if (f.type === "text" || f.tag === "textarea") {
      info += ` val="${f.value || ""}"`;
      if (!f.value?.trim()) info += " *** EMPTY ***";
    } else if (f.type === "radio") {
      info += ` checked=${f.checked} radioVal=${f.radioValue}`;
    } else if (f.type === "checkbox") {
      info += ` checked=${f.checked}`;
    }
    console.log(info);
  }

  await checkUnfilled(page);
  console.log(`>>> ===== END DIAGNOSTIC =====\n`);
}

// ====================================================================
// Read page after any load/navigation - always check for problems
// ====================================================================
async function readPageStatus(page: Page, context: string): Promise<{ errors: string[]; unfilled: string[] }> {
  const url = page.url();
  const pageInfo = identifyPage(url);
  console.log(`>>> [${context}] Page: ${pageInfo.name} | URL: ${url}`);

  const errors = await captureErrors(page);
  const unfilled = await checkUnfilled(page);
  return { errors, unfilled };
}

// ====================================================================
// Click Next, verify navigation, read errors if it fails
// ====================================================================
async function clickNext(page: Page, stepName: string): Promise<boolean> {
  const urlBefore = page.url();
  const pageBefore = identifyPage(urlBefore);

  const next = page.locator("input[type=submit][value*='Next']").first();
  const val = await next.getAttribute("value").catch(() => "?");
  console.log(`>>> Clicking "${val}" on ${pageBefore.name}...`);
  await next.click();

  // Smart wait: wait for URL change + inputs to appear (not fixed timer)
  const navStart = Date.now();
  let urlAfter = page.url();
  while (urlAfter === urlBefore && Date.now() - navStart < 10_000) {
    await new Promise((r) => setTimeout(r, 300));
    urlAfter = page.url();
  }
  // Wait for the new page inputs to load
  await waitForPageReady(page, `nav-to-${stepName}`);

  const pageAfter = identifyPage(urlAfter);

  if (urlAfter === urlBefore) {
    console.log(`>>> FAILED to navigate past ${stepName} - will diagnose and retry`);
    await captureErrors(page);
    await checkUnfilled(page);
    await page.screenshot({ path: path.join(RESULTS_DIR, `error-${stepName}.png`), fullPage: true });
    return false; // caller should retry
  }

  console.log(`>>> OK: ${pageBefore.name} -> ${pageAfter.name} (${urlAfter})`);
  await readPageStatus(page, "after-nav");
  return true;
}

// ====================================================================
// "Add Another" handler: fills additional entries in DataList sections
// Each DataList uses _ctl00_, _ctl01_, _ctl02_... for entries.
// After filling _ctl00_ (first entry), we click "Add Another" and fill _ctl01_, etc.
// ====================================================================
interface AddAnotherConfig {
  /** DataList control ID prefix (e.g., "dtlLANGUAGES") */
  dataListId: string;
  /** Values for each additional entry (beyond the first which is handled by fieldMap) */
  additionalEntries: Array<Record<string, string>>;
  /** Field suffix -> type mapping, e.g. { "tbxLANGUAGE_NAME": "text", "ddlFoo": "select" } */
  fieldTypes: Record<string, string>;
}

function getAddAnotherConfigs(pageName: string, a: DS160Applicant): AddAnotherConfig[] {
  const configs: AddAnotherConfig[] = [];

  // WorkEducation3: Languages (dtlLANGUAGES)
  if (pageName === "WorkEducation3" && a.languages.length > 1) {
    configs.push({
      dataListId: "dtlLANGUAGES",
      additionalEntries: a.languages.slice(1).map(lang => ({ tbxLANGUAGE_NAME: lang })),
      fieldTypes: { tbxLANGUAGE_NAME: "text" },
    });
  }

  // WorkEducation3: Countries Visited (dtlCountriesVisited)
  if (pageName === "WorkEducation3" && a.countriesVisited && a.countriesVisitedList && a.countriesVisitedList.length > 1) {
    configs.push({
      dataListId: "dtlCountriesVisited",
      additionalEntries: a.countriesVisitedList.slice(1).map(c => ({ ddlCOUNTRIES_VISITED: c })),
      fieldTypes: { ddlCOUNTRIES_VISITED: "select-search" },
    });
  }

  // Personal1: Other Names (DListAlias)
  if (pageName === "Personal1" && a.otherNamesUsed && a.otherNames && a.otherNames.length > 1) {
    configs.push({
      dataListId: "DListAlias",
      additionalEntries: a.otherNames.slice(1).map(n => ({ tbxSURNAME: n.surname, tbxGIVEN_NAME: n.givenName })),
      fieldTypes: { tbxSURNAME: "text", tbxGIVEN_NAME: "text" },
    });
  }

  // TravelCompanions: Travel Companions (dlTravelCompanions)
  if (pageName === "TravelCompanions" && a.travelingWithOthers && a.companions && a.companions.length > 1) {
    configs.push({
      dataListId: "dlTravelCompanions",
      additionalEntries: a.companions.slice(1).map(c => ({
        tbxSurname: c.surname, tbxGivenName: c.givenName, ddlTCRelationship: c.relationship,
      })),
      fieldTypes: { tbxSurname: "text", tbxGivenName: "text", ddlTCRelationship: "select" },
    });
  }

  // AddressPhone: Additional Phones (dtlAddPhone)
  if (pageName === "AddressPhone" && a.additionalPhones && a.additionalPhoneNumbers && a.additionalPhoneNumbers.length > 1) {
    configs.push({
      dataListId: "dtlAddPhone",
      additionalEntries: a.additionalPhoneNumbers.slice(1).map(p => ({ tbxAddPhoneInfo: p.replace(/[^0-9+]/g, "").replace("+", "") })),
      fieldTypes: { tbxAddPhoneInfo: "text" },
    });
  }

  // AddressPhone: Additional Emails (dtlAddEmail)
  if (pageName === "AddressPhone" && a.additionalEmails && a.additionalEmailAddresses && a.additionalEmailAddresses.length > 1) {
    configs.push({
      dataListId: "dtlAddEmail",
      additionalEntries: a.additionalEmailAddresses.slice(1).map(e => ({ tbxAddEmailInfo: e })),
      fieldTypes: { tbxAddEmailInfo: "text" },
    });
  }

  // AddressPhone: Additional Social Media (dtlAddSocial)
  if (pageName === "AddressPhone" && a.additionalSocialMedia && a.additionalSocialMediaAccounts && a.additionalSocialMediaAccounts.length > 1) {
    configs.push({
      dataListId: "dtlAddSocial",
      additionalEntries: a.additionalSocialMediaAccounts.slice(1).map(s => ({
        tbxAddSocialPlat: s.platform, tbxAddSocialHand: s.handle,
      })),
      fieldTypes: { tbxAddSocialPlat: "text", tbxAddSocialHand: "text" },
    });
  }

  // WorkEducation2: Previous Employers (dtlPrevEmpl)
  if (pageName === "WorkEducation2" && a.hasPreviousEmployment && a.previousEmployment && a.previousEmployment.length > 1) {
    configs.push({
      dataListId: "dtlPrevEmpl",
      additionalEntries: a.previousEmployment.slice(1).map(emp => ({
        tbEmployerName: emp.name,
        tbEmployerStreetAddress1: emp.street1,
        tbEmployerStreetAddress2: emp.street2 || "",
        tbEmployerCity: emp.city,
        tbxPREV_EMPL_ADDR_STATE: emp.state || "",
        tbxPREV_EMPL_ADDR_POSTAL_CD: emp.postalCode || "",
        DropDownList2: emp.country,
        tbEmployerPhone: emp.phone.replace(/[^0-9+]/g, "").replace("+", ""),
        tbJobTitle: emp.jobTitle,
        cbxSupervisorSurname_NA: "check",
        cbxSupervisorGivenName_NA: "check",
        ddlEmpDateFromDay: "1",
        ddlEmpDateFromMonth: emp.startDate.month,
        tbxEmpDateFromYear: emp.startDate.year,
        ddlEmpDateToDay: "1",
        ddlEmpDateToMonth: emp.endDate.month,
        tbxEmpDateToYear: emp.endDate.year,
        tbDescribeDuties: emp.duties || "GENERAL DUTIES",
      })),
      fieldTypes: {
        tbEmployerName: "text", tbEmployerStreetAddress1: "text",
        tbEmployerStreetAddress2: "text",
        tbEmployerCity: "text", tbxPREV_EMPL_ADDR_STATE: "text",
        tbxPREV_EMPL_ADDR_POSTAL_CD: "text",
        DropDownList2: "select-label", tbEmployerPhone: "text",
        tbJobTitle: "text", cbxSupervisorSurname_NA: "checkbox-check",
        cbxSupervisorGivenName_NA: "checkbox-check",
        ddlEmpDateFromDay: "select", ddlEmpDateFromMonth: "select",
        tbxEmpDateFromYear: "text", ddlEmpDateToDay: "select",
        ddlEmpDateToMonth: "select",
        tbxEmpDateToYear: "text", tbDescribeDuties: "text",
      },
    });
  }

  // WorkEducation2: Previous Education (dtlPrevEduc)
  if (pageName === "WorkEducation2" && a.hasEducation && a.education && a.education.length > 1) {
    configs.push({
      dataListId: "dtlPrevEduc",
      additionalEntries: a.education.slice(1).map(edu => ({
        tbxSchoolName: edu.name,
        tbxSchoolAddr1: edu.street1,
        tbxSchoolAddr2: edu.street2 || "",
        tbxSchoolCity: edu.city,
        tbxEDUC_INST_ADDR_STATE: edu.state || "",
        tbxEDUC_INST_POSTAL_CD: edu.postalCode || "",
        ddlSchoolCountry: edu.country,
        tbxSchoolCourseOfStudy: edu.courseOfStudy,
        ddlSchoolFromDay: "1",
        ddlSchoolFromMonth: edu.startDate.month,
        tbxSchoolFromYear: edu.startDate.year,
        ddlSchoolToDay: "1",
        ddlSchoolToMonth: edu.endDate.month,
        tbxSchoolToYear: edu.endDate.year,
      })),
      fieldTypes: {
        tbxSchoolName: "text", tbxSchoolAddr1: "text",
        tbxSchoolAddr2: "text",
        tbxSchoolCity: "text", tbxEDUC_INST_ADDR_STATE: "text",
        tbxEDUC_INST_POSTAL_CD: "text",
        ddlSchoolCountry: "select-label", tbxSchoolCourseOfStudy: "text",
        ddlSchoolFromDay: "select", ddlSchoolFromMonth: "select",
        tbxSchoolFromYear: "text",
        ddlSchoolToDay: "select", ddlSchoolToMonth: "select",
        tbxSchoolToYear: "text",
      },
    });
  }

  return configs;
}

async function handleAddAnother(page: Page, pageName: string): Promise<void> {
  const configs = getAddAnotherConfigs(pageName, applicant);
  if (configs.length === 0) return;

  for (const config of configs) {
    for (let entryIdx = 0; entryIdx < config.additionalEntries.length; entryIdx++) {
      const entryData = config.additionalEntries[entryIdx];
      const ctlNum = String(entryIdx + 1).padStart(2, "0"); // _ctl01_, _ctl02_, etc.

      // Check if this entry already exists (page revisit) - skip if so
      const firstFieldKey = Object.keys(entryData)[0];
      const existCheck = `${config.dataListId}_ctl${ctlNum}_${firstFieldKey}`;
      const alreadyExists = await page.locator(`[id*='${existCheck}']`).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (alreadyExists) {
        console.log(`>>> [Add Another] ${config.dataListId} ctl${ctlNum} already exists - skipping`);
        continue;
      }

      // Find and click "Add Another" button near this DataList
      const addBtn = page.locator(`a:has-text("Add Another")`).filter({
        has: page.locator(`xpath=ancestor::*[contains(@id, '${config.dataListId}') or preceding-sibling::*[contains(@id, '${config.dataListId}')] or following-sibling::*[contains(@id, '${config.dataListId}')]]`)
      }).first();

      // Fallback: find any "Add Another" link near the DataList
      let clicked = false;
      const allAddBtns = page.locator(`a:has-text("Add Another")`);
      const count = await allAddBtns.count();

      for (let i = 0; i < count; i++) {
        const btn = allAddBtns.nth(i);
        const btnId = await btn.getAttribute("id").catch(() => "") || "";
        const btnHref = await btn.getAttribute("href").catch(() => "") || "";
        // Walk up DOM tree to find DataList association
        const nearbyId = await btn.evaluate((el: any, dlId: string) => {
          let node = el;
          for (let depth = 0; depth < 6 && node; depth++) {
            node = node.parentElement;
            if (!node) break;
            if (node.innerHTML?.includes(dlId)) return true;
          }
          return false;
        }, config.dataListId).catch(() => false);

        if (btnId.includes(config.dataListId) || nearbyId) {
          console.log(`>>> [Add Another] Clicking for ${config.dataListId} entry #${entryIdx + 2}`);
          await btn.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.log(`>>> [Add Another] Could not find button for ${config.dataListId} - skipping`);
        continue;
      }

      // Wait for new fields to appear
      await waitForPostback(page);
      await new Promise(r => setTimeout(r, 500));

      // Fill the new entry fields
      for (const [fieldSuffix, value] of Object.entries(entryData)) {
        // Build the expected field ID pattern: dataListId_ctl{NN}_fieldSuffix
        const fieldPattern = `${config.dataListId}_ctl${ctlNum}_${fieldSuffix}`;
        const loc = page.locator(`[id*='${fieldPattern}']`).first();
        const isVis = await loc.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVis) {
          console.log(`>>> [Add Another] Field not found: ${fieldPattern}`);
          continue;
        }

        const fieldType = config.fieldTypes[fieldSuffix] || "text";
        try {
          switch (fieldType) {
            case "text":
              await loc.fill(value);
              break;
            case "select":
              await loc.selectOption(value).catch(() => loc.selectOption({ label: value }));
              break;
            case "select-label":
              await loc.selectOption({ label: value }).catch(() => loc.selectOption(value));
              break;
            case "select-search": {
              const allOpts = await loc.evaluate((sel: any) =>
                Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text }))
              );
              const found = allOpts.find((o: any) => o.t.toUpperCase().includes(value.toUpperCase()))
                || allOpts.find((o: any) => o.v && o.v.toUpperCase().includes(value.toUpperCase()));
              if (found) await loc.selectOption(found.v);
              break;
            }
            case "checkbox-check":
              if (!(await loc.isChecked())) await loc.check();
              break;
          }
          console.log(`>>> [Add Another] Filled ${fieldPattern} = "${value}"`);
        } catch (e: any) {
          console.log(`>>> [Add Another] Error filling ${fieldPattern}: ${e.message.slice(0, 60)}`);
        }
      }
    }
  }
}

// ====================================================================
// Fill one page: discover -> multi-pass fill -> check -> next
// ====================================================================
async function fillPage(page: Page, fieldMap: ReturnType<typeof buildDynamicFieldMap>, pageName: string, screenshotNum: string) {
  const url = page.url();
  const pageInfo = identifyPage(url);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`>>> PAGE: ${pageName} | Detected: ${pageInfo.name} | Section: ${pageInfo.section}`);
  console.log(`>>> URL: ${url}`);
  console.log(`${"=".repeat(50)}`);

  // Wait for page inputs to be ready before attempting fill
  await waitForPageReady(page, `${pageName}-ready`);

  // Retry loop: fill -> submit -> if fail, re-diagnose and re-fill
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Multi-pass filling - each postback trigger causes a new pass
    let pass = 1;
    let needsRescan = true;
    while (needsRescan && pass <= 10) {
      needsRescan = await autoFillPage(page, fieldMap, `${pageName} Pass-${pass}`);
      pass++;
    }

    // Handle "Add Another" entries (languages, countries, companions, etc.)
    await handleAddAnother(page, pageName);

    // Check unfilled fields before submit
    const { errors, unfilled } = await readPageStatus(page, "pre-submit");
    await page.screenshot({ path: path.join(RESULTS_DIR, `${screenshotNum}-${pageName}.png`), fullPage: true });

    const ok = await clickNext(page, pageName);
    if (ok) return; // success

    if (attempt < 3) {
      console.log(`>>> Retry ${attempt}/3: re-scanning and re-filling ${pageName}...`);
      // Scroll + wait to make sure all fields are rendered
      await waitForPageReady(page, `${pageName}-retry-${attempt}`);
      // Run a full diagnostic so we see exactly what's missing
      await diagnosePage(page, `retry-${attempt}-${pageName}`);
    }
  }

  // After 3 attempts, log full diagnostic but DON'T crash - let the user decide
  console.log(`>>> WARNING: Could not advance past ${pageName} after 3 attempts. Running full diagnostic...`);
  await diagnosePage(page, `STUCK at ${pageName}`);
  throw new Error(`Stuck at ${pageName} after 3 retries - see diagnostic above`);
}

// ====================================================================
// Application ID persistence: save/load for recovery
// ====================================================================
function saveApplicationId(appId: string) {
  ensureDir(SIGNAL_DIR);
  fs.writeFileSync(APP_ID_FILE, appId.trim());
  console.log(`>>> Application ID saved: ${appId.trim()}`);
}

function loadApplicationId(): string | null {
  try {
    const id = fs.readFileSync(APP_ID_FILE, "utf-8").trim();
    return id.length > 0 ? id : null;
  } catch { return null; }
}

// Try to extract Application ID from the current page
async function extractApplicationId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    // Look for the Application ID value (not the label)
    // The ID is typically in a span/label next to the "Application ID" label text
    const allSpans = document.querySelectorAll("span, td, label");
    for (const el of allSpans) {
      const text = el.textContent?.trim() || "";
      // Match application ID format: AA followed by digits (e.g., AA00XXXXXX)
      const idMatch = text.match(/\b([A-Z]{2}\d{8,10})\b/);
      if (idMatch) return idMatch[1];
    }
    // Fallback: search entire page body
    const body = document.body?.innerText || "";
    const match = body.match(/\b([A-Z]{2}\d{8,10})\b/);
    return match ? match[1] : null;
  }).catch(() => null);
}

// ====================================================================
// Start new application: CAPTCHA + Security Question
// ====================================================================
async function startNewApplication(page: Page): Promise<void> {
  console.log(">>> Starting NEW application...");
  await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: "load", timeout: 30_000 });
  await waitForPageReady(page, "landing");

  await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", applicant.location);
  await waitForPostback(page);

  // CAPTCHA loop
  for (let attempt = 1; attempt <= 5; attempt++) {
    cleanup();
    const captchaImg = page.locator("img[id*='CaptchaImage']");
    await captchaImg.screenshot({ path: CAPTCHA_IMG });
    console.log(`>>> [Attempt ${attempt}/5] CAPTCHA saved to ${CAPTCHA_IMG}`);
    fs.writeFileSync(CAPTCHA_READY, `attempt-${attempt}`);

    console.log(">>> Waiting for CAPTCHA answer...");
    const answer = await waitForFile(CAPTCHA_ANSWER);
    console.log(`>>> CAPTCHA answer: ${answer}`);

    await page.fill("#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox", answer);
    const urlBeforeCaptcha = page.url();
    await page.click("#ctl00_SiteContentPlaceHolder_lnkNew");

    const captchaStart = Date.now();
    let captchaResolved = false;
    while (Date.now() - captchaStart < 15_000) {
      if (page.url() !== urlBeforeCaptcha) { captchaResolved = true; break; }
      const inPostback = await page.evaluate(() => {
        const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return mgr?.get_isInAsyncPostBack?.() || false;
      }).catch(() => true);
      if (!inPostback && Date.now() - captchaStart > 3_000) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (captchaResolved || page.url() !== urlBeforeCaptcha) {
      await waitForPageReady(page, "after-captcha");
      console.log(`>>> CAPTCHA solved on attempt ${attempt}!`);
      break;
    }

    console.log(`>>> CAPTCHA failed attempt ${attempt}`);
    if (attempt === 5) throw new Error("Failed CAPTCHA after 5 attempts");
    await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", applicant.location);
    await waitForPostback(page);
  }

  // Security Question
  console.log("\n>>> Security Question page...");
  await page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct").check();
  await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
  await page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer").fill(applicant.securityAnswer);

  const urlBefore = page.url();
  await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
  const secStart = Date.now();
  while (page.url() === urlBefore && Date.now() - secStart < 10_000) {
    await new Promise((r) => setTimeout(r, 300));
  }
  await waitForPageReady(page, "after-security-question");

  // Extract and save Application ID
  const appId = await extractApplicationId(page);
  if (appId) saveApplicationId(appId);

  // Confirm Application ID (if present)
  const continueApp = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
  if (await continueApp.isVisible().catch(() => false)) {
    const urlBeforeConfirm = page.url();
    await continueApp.click();
    const confStart = Date.now();
    while (page.url() === urlBeforeConfirm && Date.now() - confStart < 10_000) {
      await new Promise((r) => setTimeout(r, 300));
    }
    await waitForPageReady(page, "after-confirm-app");
  }
}

// ====================================================================
// Recover existing application using saved Application ID
// ====================================================================
async function recoverApplication(page: Page, appId: string): Promise<boolean> {
  console.log(`>>> Recovering application ${appId}...`);
  await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: "load", timeout: 30_000 });
  await waitForPageReady(page, "landing-recover");

  // Select location
  await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", applicant.location);
  await waitForPostback(page);

  // Fill Application ID field
  const appIdField = page.locator("#ctl00_SiteContentPlaceHolder_ucLocation_tbxAppID");
  if (!(await appIdField.isVisible().catch(() => false))) {
    console.log(">>> Application ID field not found on landing page");
    return false;
  }
  await appIdField.fill(appId);

  // Solve CAPTCHA for retrieve
  for (let attempt = 1; attempt <= 5; attempt++) {
    cleanup();
    const captchaImg = page.locator("img[id*='CaptchaImage']");
    await captchaImg.screenshot({ path: CAPTCHA_IMG });
    console.log(`>>> [Recover CAPTCHA ${attempt}/5] Saved to ${CAPTCHA_IMG}`);
    fs.writeFileSync(CAPTCHA_READY, `recover-${attempt}`);

    const answer = await waitForFile(CAPTCHA_ANSWER);
    console.log(`>>> CAPTCHA answer: ${answer}`);

    await page.fill("#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox", answer);
    const urlBefore = page.url();

    // Click "Retrieve" button
    await page.click("#ctl00_SiteContentPlaceHolder_lnkRetrieve");

    const start = Date.now();
    let resolved = false;
    while (Date.now() - start < 15_000) {
      if (page.url() !== urlBefore) { resolved = true; break; }
      const inPostback = await page.evaluate(() => {
        const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return mgr?.get_isInAsyncPostBack?.() || false;
      }).catch(() => true);
      if (!inPostback && Date.now() - start > 3_000) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (resolved || page.url() !== urlBefore) {
      await waitForPageReady(page, "after-recover-captcha");
      console.log(`>>> Recovery CAPTCHA solved on attempt ${attempt}!`);

      // Security question for retrieve
      const secQuestion = page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer");
      if (await secQuestion.isVisible().catch(() => false)) {
        console.log(">>> Answering security question for recovery...");
        await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
        await secQuestion.fill(applicant.securityAnswer);
        const urlBeforeSec = page.url();
        await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
        const secStart = Date.now();
        while (page.url() === urlBeforeSec && Date.now() - secStart < 10_000) {
          await new Promise((r) => setTimeout(r, 300));
        }
        await waitForPageReady(page, "after-recover-security");
      }

      // Click continue if present
      const cont = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
      if (await cont.isVisible().catch(() => false)) {
        const urlBeforeCont = page.url();
        await cont.click();
        const contStart = Date.now();
        while (page.url() === urlBeforeCont && Date.now() - contStart < 10_000) {
          await new Promise((r) => setTimeout(r, 300));
        }
        await waitForPageReady(page, "after-recover-continue");
      }

      return true;
    }

    console.log(`>>> Recovery CAPTCHA failed attempt ${attempt}`);
    if (attempt === 5) return false;
    await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", applicant.location);
    await waitForPostback(page);
    await appIdField.fill(appId);
  }
  return false;
}

// ====================================================================
// MAIN: Smart startup - detect state, continue or recover
// ====================================================================
async function main() {
  setupSignalHandlers();
  ensureDir(SIGNAL_DIR);
  ensureDir(RESULTS_DIR);

  const fieldMap = buildDynamicFieldMap(applicant);

  // Get or reuse browser - NEVER opens multiple instances
  const { browser, page, isNew } = await getOrCreateBrowser();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(30_000);

  // Auto-accept any "leave page?" dialogs
  page.on("dialog", async (dialog) => {
    console.log(`>>> Dialog: "${dialog.message().slice(0, 80)}" - accepting`);
    await dialog.accept().catch(() => { });
  });

  try {
    // ========== SMART STARTUP: detect where we are ==========
    const currentUrl = page.url();
    const currentPage = identifyPage(currentUrl);
    const savedAppId = loadApplicationId();

    console.log(`>>> Current URL: ${currentUrl}`);
    console.log(`>>> Current page: ${currentPage.name} (section: ${currentPage.section})`);
    console.log(`>>> Saved Application ID: ${savedAppId || "none"}`);

    // Decision: continue from current page, recover, or start new
    const isOnFormPage = currentUrl.includes("ceac.state.gov/GenNIV/General/complete/")
      || currentUrl.includes("SecurityandBackground");
    const isOnLanding = currentUrl.includes("Default.aspx");
    const isOnSecurityQuestion = currentUrl.includes("ConfirmApplicationID");

    if (isOnFormPage) {
      // Already on a form page - continue from here!
      console.log(`>>> CONTINUING from ${currentPage.name} (already on form page)`);
      await waitForPageReady(page, "resume-current-page");
    } else if (isOnSecurityQuestion) {
      // On the security question / confirm page
      console.log(`>>> On security question page - completing it...`);
      const continueApp = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
      if (await continueApp.isVisible().catch(() => false)) {
        const urlBefore = page.url();
        await continueApp.click();
        const start = Date.now();
        while (page.url() === urlBefore && Date.now() - start < 10_000) {
          await new Promise((r) => setTimeout(r, 300));
        }
        await waitForPageReady(page, "resume-from-confirm");
      } else {
        // Need to fill security question
        await page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct").check().catch(() => { });
        await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
        await page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer").fill(applicant.securityAnswer);
        const urlBefore = page.url();
        await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
        const start = Date.now();
        while (page.url() === urlBefore && Date.now() - start < 10_000) {
          await new Promise((r) => setTimeout(r, 300));
        }
        await waitForPageReady(page, "resume-from-security");

        const appId = await extractApplicationId(page);
        if (appId) saveApplicationId(appId);

        const cont = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
        if (await cont.isVisible().catch(() => false)) {
          const urlBeforeCont = page.url();
          await cont.click();
          const contStart = Date.now();
          while (page.url() === urlBeforeCont && Date.now() - contStart < 10_000) {
            await new Promise((r) => setTimeout(r, 300));
          }
          await waitForPageReady(page, "resume-from-security-confirm");
        }
      }
    } else if (savedAppId) {
      // Have a saved Application ID - try to recover
      console.log(`>>> Attempting to RECOVER application ${savedAppId}...`);
      const recovered = await recoverApplication(page, savedAppId);
      if (!recovered) {
        console.log(">>> Recovery failed. Starting new application...");
        cleanup();
        await startNewApplication(page);
      }
    } else {
      // Nothing to recover - start fresh
      cleanup();
      await startNewApplication(page);
    }

    // ========== FORM PAGES - URL-DRIVEN LOOP ==========
    let pageCount = 0;
    const MAX_PAGES = 30;

    while (pageCount < MAX_PAGES) {
      pageCount++;
      const url = page.url();
      const pageInfo = identifyPage(url);

      // 🚨 ROBUSTNESS CHECK: Handle unknown pages
      if (pageInfo.section === 'unknown') {
        const recovered = await handleUnknownPage(page, url, applicant);
        if (!recovered) {
          console.log('>>> FATAL: Cannot recover from unknown page. Exiting.');
          break;
        }
        // After recovery, re-identify page and continue
        await waitForPageReady(page, 'post-recovery');
        continue;
      }

      // Check if we've reached the end
      if (pageInfo.section === "final") {
        console.log(`\n>>> Reached final section: ${pageInfo.name}`);
        break;
      }

      // Security pages get special handling (all No radios)
      if (pageInfo.section === "security") {
        console.log(`\n${"=".repeat(50)}`);
        console.log(`>>> SECURITY PAGE: ${pageInfo.name} | URL: ${url}`);
        console.log(`${"=".repeat(50)}`);

        await waitForPageReady(page, `${pageInfo.name}-ready`);

        const noRadios = page.locator("input[type=radio][value='N']");
        const count = await noRadios.count();
        let clicked = 0;
        for (let i = 0; i < count; i++) {
          const radio = noRadios.nth(i);
          const vis = await radio.isVisible().catch(() => false);
          if (vis && !(await radio.isChecked())) {
            await radio.click();
            clicked++;
          }
        }
        console.log(`>>> Clicked ${clicked} "No" radios`);
        await readPageStatus(page, "security-check");
        await page.screenshot({ path: path.join(RESULTS_DIR, `${String(pageCount).padStart(2, "0")}-${pageInfo.name}.png`), fullPage: true });

        const hasNext = await page.locator("input[type=submit][value*='Next']").first().isVisible().catch(() => false);
        if (hasNext) {
          const ok = await clickNext(page, pageInfo.name);
          if (!ok) {
            console.log(`>>> WARNING: Security page ${pageInfo.name} stuck, running diagnostic...`);
            await diagnosePage(page, `STUCK at ${pageInfo.name}`);
          }
        } else {
          console.log(">>> No Next button - might be final security page");
          break;
        }
        continue;
      }

      // Family2 DOB override: generic ddlDOBDay/ddlDOBMonth/tbxDOBYear are for spouse on this page
      if (pageInfo.name === "Family2" && applicant.spouse) {
        for (const entry of fieldMap) {
          if (/^ddlDOBDay\$$/.test(entry.pattern.source)) entry.value = applicant.spouse.dob.day;
          if (/^ddlDOBMonth\$$/.test(entry.pattern.source)) entry.value = applicant.spouse.dob.month;
          if (/^tbxDOBYear\$$/.test(entry.pattern.source)) entry.value = applicant.spouse.dob.year;
        }
      }

      // PrevSpouse DOB override: generic DOB fields are for former spouse on this page
      if (pageInfo.name === "PrevSpouse" && applicant.previousSpouse) {
        for (const entry of fieldMap) {
          if (/^ddlDOBDay\$$/.test(entry.pattern.source)) entry.value = applicant.previousSpouse.dob.day;
          if (/^ddlDOBMonth\$$/.test(entry.pattern.source)) entry.value = applicant.previousSpouse.dob.month;
          if (/^tbxDOBYear\$$/.test(entry.pattern.source)) entry.value = applicant.previousSpouse.dob.year;
        }
      }

      // Regular form pages - dynamic fill with retry
      const num = String(pageCount).padStart(2, "0");
      await fillPage(page, fieldMap, pageInfo.name, num);

      // CRITICAL: Save recovery data after Personal1 for form retrieval
      let currentAppId = loadApplicationId();
      if (pageInfo.name === "Personal1") {
        await saveRecoveryData(page, applicant);
        currentAppId = loadApplicationId(); // Reload after save
      }

      // 🚨 ROBUSTNESS: Save checkpoint after each page
      if (currentAppId) {
        saveCheckpoint(page, pageInfo, pageCount, currentAppId);
      }
    }

    // ========== DONE ==========
    const finalUrl = page.url();
    const finalPage = identifyPage(finalUrl);
    console.log(`\n${"=".repeat(50)}`);
    console.log(">>> FORM FILLING COMPLETE!");
    console.log(`>>> Final page: ${finalPage.name} | URL: ${finalUrl}`);
    console.log(`${"=".repeat(50)}`);
    await page.screenshot({ path: path.join(RESULTS_DIR, "final.png"), fullPage: true });
    console.log(">>> Form complete! Press Ctrl+C to close browser and exit.");
    await new Promise(() => { });

  } catch (err) {
    console.error("\n>>> SCRIPT ERROR:", err);
    await diagnosePage(page, "SCRIPT ERROR").catch(() => { });
    await page.screenshot({ path: path.join(RESULTS_DIR, "error-page.png"), fullPage: true }).catch(() => { });
    console.log(">>> Error occurred. Press Ctrl+C to close browser and exit.");
    // Shutdown browser on error instead of hanging forever
    await shutdownBrowser("script error");
    process.exit(1);
  }
}

main();
