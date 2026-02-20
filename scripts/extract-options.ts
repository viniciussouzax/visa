/**
 * Extract ALL dropdown options from a live DS-160 session.
 * Connects to existing Chromium via CDP, navigates through pages,
 * and extracts complete option lists (no truncation).
 *
 * Run: npx tsx scripts/extract-options.ts
 * Prereq: Chromium on port 9222 with DS-160 form open (any page after CAPTCHA)
 * Output: tmp/ds160-all-options.json
 */
import { chromium, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const PREFIX = "ctl00_SiteContentPlaceHolder_FormView1_";
const TMP = path.join(__dirname, "..", "tmp");
const OUTPUT = path.join(TMP, "ds160-all-options.json");

interface SelectOptions {
  fieldId: string;       // short ID (without prefix)
  fullId: string;        // complete DOM id
  label: string;         // label text
  page: string;          // page where found
  optionCount: number;
  options: { value: string; text: string }[];
}

// Wait for ASP.NET postback to complete
async function waitPB(page: Page, ms = 1200) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    const check = () => {
      const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
      if (!mgr || !mgr.get_isInAsyncPostBack()) resolve();
      else setTimeout(check, 150);
    };
    check();
  })).catch(() => {});
  await new Promise(r => setTimeout(r, ms));
}

// Extract ALL options from ALL visible selects on the current page
async function extractSelectsOnPage(page: Page, pageName: string): Promise<SelectOptions[]> {
  const raw = await page.evaluate((pfx: string) => {
    const results: any[] = [];
    document.querySelectorAll("select").forEach((el: any) => {
      if (!el.id || el.type === "hidden") return;
      const style = window.getComputedStyle(el);
      const isVis = el.offsetParent !== null && style.display !== "none" && style.visibility !== "hidden";
      if (!isVis) return;

      const short = el.id.replace(new RegExp(pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      // Skip language dropdown
      if (el.id === "ctl00_ddlLanguage") return;

      const options: { value: string; text: string }[] = [];
      for (const opt of Array.from(el.options) as any[]) {
        options.push({ value: opt.value, text: opt.text });
      }

      let label = "";
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) label = (labelEl as any).textContent?.trim()?.substring(0, 100) || "";

      results.push({
        fieldId: short,
        fullId: el.id,
        label,
        optionCount: options.length,
        options,
      });
    });
    return results;
  }, PREFIX);

  return raw.map((r: any) => ({ ...r, page: pageName }));
}

// Try clicking YES on a radio to reveal hidden selects
async function tryRadioBranch(page: Page, pageName: string, radioShort: string): Promise<SelectOptions[]> {
  const pfx = PREFIX;
  const yesId = `${pfx}${radioShort}_0`.replace(/\$/g, "\\$");
  const noId = `${pfx}${radioShort}_1`.replace(/\$/g, "\\$");

  try {
    const yesEl = page.locator(`#${yesId}`);
    if (!(await yesEl.isVisible({ timeout: 500 }).catch(() => false))) return [];

    // Get current selects
    const before = await extractSelectsOnPage(page, pageName);

    // Click YES
    await yesEl.click();
    await waitPB(page, 800);

    // Get new selects
    const after = await extractSelectsOnPage(page, pageName);

    // Find new selects
    const beforeIds = new Set(before.map(s => s.fullId));
    const newSelects = after.filter(s => !beforeIds.has(s.fullId));

    // Restore: click NO
    const noEl = page.locator(`#${noId}`);
    if (await noEl.isVisible({ timeout: 500 }).catch(() => false)) {
      await noEl.click();
      await waitPB(page, 800);
    }

    if (newSelects.length > 0) {
      console.log(`    Branch ${radioShort}=YES: found ${newSelects.length} new selects`);
      for (const s of newSelects) console.log(`      + ${s.fieldId} (${s.optionCount} options)`);
    }
    return newSelects;
  } catch {
    return [];
  }
}

// Try each option of a postback select to reveal hidden selects
async function trySelectBranch(page: Page, pageName: string, selectShort: string): Promise<SelectOptions[]> {
  const pfx = PREFIX;
  const selId = `${pfx}${selectShort}`.replace(/\$/g, "\\$");
  const allNew: SelectOptions[] = [];

  try {
    const selEl = page.locator(`#${selId}`);
    if (!(await selEl.isVisible({ timeout: 500 }).catch(() => false))) return [];

    const currentVal = await selEl.inputValue();
    const allOptions = await selEl.evaluate((el: any) =>
      Array.from(el.options).map((o: any) => ({ v: o.value, t: o.text }))
    );

    const seenIds = new Set<string>();

    for (const opt of allOptions) {
      if (!opt.v || opt.v.trim() === "" || opt.v === "-1" || opt.v === "0") continue;
      if (opt.t.toUpperCase().includes("SELECT")) continue;

      try {
        await selEl.selectOption(opt.v);
        await waitPB(page, 600);

        const after = await extractSelectsOnPage(page, pageName);
        for (const s of after) {
          if (!seenIds.has(s.fullId) && s.fullId !== `${pfx}${selectShort}`) {
            seenIds.add(s.fullId);
            allNew.push(s);
          }
        }
      } catch { break; }
    }

    // Restore original value
    try {
      await selEl.selectOption(currentVal || "");
      await waitPB(page, 600);
    } catch {}

    return allNew;
  } catch {
    return [];
  }
}

// Identify page from URL
function identifyPage(url: string): string {
  const nodeMatch = url.match(/node=(\w+)/);
  const node = nodeMatch ? nodeMatch[1] : "";
  const file = url.split("/").pop()?.split("?")[0] || "";

  if (url.includes("Default.aspx")) return "Landing";
  if (url.includes("SecureQuestion") || url.includes("ConfirmApplicationID")) return "SecurityQuestion";
  if (file.includes("complete_personal") && node === "Personal1") return "Personal1";
  if (file.includes("complete_personal") && node === "Personal2") return "Personal2";
  if (file.includes("complete_travel.aspx")) return "Travel";
  if (file.includes("complete_travelcompanions")) return "TravelCompanions";
  if (file.includes("complete_previousustravel")) return "PreviousUSTravel";
  if (file.includes("complete_addressphone") || file.includes("complete_contact")) return "AddressPhone";
  if (file.includes("complete_pptvisa") || file.includes("Passport_Visa")) return "Passport";
  if (file.includes("complete_uscontact")) return "USContact";
  if (file.includes("complete_family1")) return "Family1";
  if (file.includes("complete_family2")) return "Family2";
  if (file.includes("complete_family4") || node === "PrevSpouse") return "PrevSpouse";
  if (file.includes("complete_workeducation1")) return "WorkEducation1";
  if (file.includes("complete_workeducation2")) return "WorkEducation2";
  if (file.includes("complete_workeducation3")) return "WorkEducation3";
  if (url.includes("SecurityandBackground")) return "Security";
  if (url.includes("Review") || url.includes("confirm")) return "Review";
  return node || "Unknown";
}

// Known radios that reveal selects when clicked YES
const BRANCH_RADIOS = [
  "rblOtherNames", "rblTelecodeQuestion",
  "rblAPP_OTH_NATL_IND", "rblPermResOtherCntryInd",
  "rblSpecificTravel", "rblOtherPersonsTravelingWithYou", "rblGroupTravel",
  "rblPREV_US_TRAVEL_IND", "rblPREV_US_DRIVER_LIC_IND", "rblPREV_VISA_IND",
  "rblPREV_VISA_REFUSED_IND", "rblIV_PETITION_IND", "rblPERM_RESIDENT_IND", "rblVWP_DENIAL_IND",
  "rblAddPhone", "rblAddEmail", "rblAddSocial", "rblAddSite",
  "rblMailingAddrSame",
  "rblLOST_PPT_IND",
  "rblFATHER_LIVE_IN_US_IND", "rblMOTHER_LIVE_IN_US_IND", "rblUS_IMMED_RELATIVE_IND",
  "rblPreviouslyEmployed", "rblOtherEduc",
  "rblCLAN_TRIBE_IND", "rblCOUNTRIES_VISITED_IND", "rblORGANIZATION_IND",
  "rblSPECIALIZED_SKILLS_IND", "rblMILITARY_SERVICE_IND", "rblINSURGENT_ORG_IND",
];

// Known selects that trigger postback and may reveal more selects
const POSTBACK_SELECTS = [
  "ddlAPP_MARITAL_STATUS", "ddlAPP_POB_CNTRY",
  "dlPrincipalAppTravel_ctl00_ddlPurposeOfTrip", "ddlWhoIsPaying",
  "ddlPPT_TYPE",
  "ddlUS_POC_REL_TO_APP",
  "ddlSpouseAddressType",
  "ddlPresentOccupation",
];

async function clickNext(page: Page): Promise<boolean> {
  const selectors = [
    "input[type=submit][value*='Next']",
    "#ctl00_SiteContentPlaceHolder_btnNext",
    "input[id*='btnNext']",
    "#ctl00_SiteContentPlaceHolder_UpdateButton3",
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await waitPB(page, 2000);
        return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  console.log(">>> DS-160 Options Extractor");
  console.log(">>> Connecting to browser via CDP...");

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0];
  if (!page) { console.error("No page found!"); process.exit(1); }

  const allSelects: SelectOptions[] = [];
  const seenFieldIds = new Set<string>();
  const pagesVisited: string[] = [];

  const addUnique = (selects: SelectOptions[]) => {
    for (const s of selects) {
      if (!seenFieldIds.has(s.fieldId)) {
        seenFieldIds.add(s.fieldId);
        allSelects.push(s);
      }
    }
  };

  console.log(`>>> Starting on: ${page.url()}`);
  let pageName = identifyPage(page.url());

  // Navigate through pages until Security or Review
  const MAX_PAGES = 25;
  for (let i = 0; i < MAX_PAGES; i++) {
    pageName = identifyPage(page.url());
    if (pageName === "Security" || pageName === "Review" || pageName === "Landing") break;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`>>> Page ${i + 1}: ${pageName}`);
    console.log(`${"=".repeat(60)}`);
    pagesVisited.push(pageName);

    // 1. Extract visible selects
    const baseSelects = await extractSelectsOnPage(page, pageName);
    addUnique(baseSelects);
    console.log(`  Base selects: ${baseSelects.length}`);
    for (const s of baseSelects) {
      console.log(`    ${s.fieldId} (${s.optionCount} options) "${s.label}"`);
    }

    // 2. Try radio branches to reveal hidden selects
    for (const radio of BRANCH_RADIOS) {
      const newSelects = await tryRadioBranch(page, pageName, radio);
      addUnique(newSelects);
    }

    // 3. Try postback selects to reveal sub-selects
    for (const sel of POSTBACK_SELECTS) {
      const fullSelId = `${PREFIX}${sel}`;
      const exists = await page.locator(`#${fullSelId.replace(/\$/g, "\\$")}`).isVisible({ timeout: 300 }).catch(() => false);
      if (exists) {
        console.log(`  Testing postback select: ${sel}`);
        const newSelects = await trySelectBranch(page, pageName, sel);
        addUnique(newSelects);
      }
    }

    // 4. Click Next to advance
    if (!await clickNext(page)) {
      console.log(">>> Cannot advance (no Next button). Stopping.");
      break;
    }
  }

  // Sort by page order then field name
  allSelects.sort((a, b) => {
    const pageOrder = ["Personal1", "Personal2", "Travel", "TravelCompanions", "PreviousUSTravel",
      "AddressPhone", "Passport", "USContact", "Family1", "Family2", "PrevSpouse",
      "WorkEducation1", "WorkEducation2", "WorkEducation3"];
    const ai = pageOrder.indexOf(a.page);
    const bi = pageOrder.indexOf(b.page);
    if (ai !== bi) return ai - bi;
    return a.fieldId.localeCompare(b.fieldId);
  });

  // Save
  fs.writeFileSync(OUTPUT, JSON.stringify(allSelects, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`>>> EXTRACTION COMPLETE`);
  console.log(`>>> Pages visited: ${pagesVisited.join(", ")}`);
  console.log(`>>> Unique selects found: ${allSelects.length}`);
  console.log(`>>> Output: ${OUTPUT}`);
  console.log(`${"=".repeat(60)}`);

  // Summary
  for (const s of allSelects) {
    console.log(`  [${s.page}] ${s.fieldId} = ${s.optionCount} options`);
  }

  await browser.close();
}

main().catch(console.error);
