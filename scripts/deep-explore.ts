/**
 * Deep Explorer - Comprehensive DS-160 field discovery.
 * For each page: dumps ALL visible fields, tests every Y/N radio,
 * discovers Add Another fields, and explores select postback variations.
 *
 * Run: npx tsx scripts/deep-explore.ts
 * Output: tmp/deep-explore-report.json (full report)
 *         console output (human-readable summary)
 *
 * Requires Chromium running on port 9222 with DS-160 form open.
 */
import { chromium, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const PREFIX = "ctl00_SiteContentPlaceHolder_FormView1_";
const TMP = path.join(__dirname, "..", "tmp");
const CAPTCHA_IMG = path.join(TMP, "captcha.png");
const CAPTCHA_READY = path.join(TMP, "captcha-ready.txt");
const CAPTCHA_ANSWER = path.join(TMP, "captcha-answer.txt");

// =============================================
// Types
// =============================================
interface FieldInfo {
  id: string;         // full ID
  short: string;      // stripped prefix
  tag: string;        // input/select/textarea
  type: string;       // text/radio/checkbox/select-one/...
  value: string;      // current value
  name: string;       // name attribute
  optCount: number;   // number of options (selects)
  opts: string[];     // first 15 option value=text pairs
  visible: boolean;   // actually visible on page
  label: string;      // associated label text if any
  required: boolean;  // has required attribute or red asterisk
}

interface BranchResult {
  page: string;
  trigger: string;
  triggerValue: string;
  fieldsAdded: { short: string; tag: string; type: string; optCount: number; opts: string[] }[];
  fieldsRemoved: string[];
}

interface AddAnotherResult {
  page: string;
  dataListId: string;
  buttonText: string;
  fieldsInNewEntry: { short: string; tag: string; type: string }[];
}

interface PageReport {
  pageName: string;
  url: string;
  totalFields: number;
  fields: FieldInfo[];
  branches: BranchResult[];
  addAnother: AddAnotherResult[];
}

const report: PageReport[] = [];

// =============================================
// Utilities
// =============================================
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

async function getAllFields(page: Page): Promise<Map<string, FieldInfo>> {
  const raw = await page.evaluate((pfx: string) => {
    const res: Record<string, any> = {};
    document.querySelectorAll("select, input, textarea").forEach((el: any) => {
      if (!el.id || el.type === "hidden") return;
      // Check visibility: offsetParent or explicit display checks
      const style = window.getComputedStyle(el);
      const isVis = (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox")
                    && style.display !== "none" && style.visibility !== "hidden";
      if (!isVis) return;

      const short = el.id.replace(new RegExp(pfx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');

      // Get options for selects
      const opts: string[] = [];
      if (el.tagName === "SELECT") {
        const options = Array.from(el.options) as any[];
        for (let i = 0; i < Math.min(options.length, 15); i++) {
          opts.push(`${options[i].value}="${options[i].text.substring(0, 50)}"`);
        }
      }

      // Find associated label
      let label = "";
      const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      if (labelEl) {
        label = (labelEl as any).textContent?.trim()?.substring(0, 80) || "";
      }

      // Check required
      const required = el.hasAttribute("required") || el.getAttribute("aria-required") === "true";

      res[el.id] = {
        id: el.id,
        short,
        tag: el.tagName.toLowerCase(),
        type: el.type || "unknown",
        value: el.value || "",
        name: el.name || "",
        optCount: el.options?.length || 0,
        opts,
        visible: true,
        label,
        required
      };
    });
    return res;
  }, PREFIX);

  return new Map(Object.entries(raw));
}

function diffFields(before: Map<string, FieldInfo>, after: Map<string, FieldInfo>) {
  const added: FieldInfo[] = [];
  const removed: string[] = [];
  for (const [id, f] of after) {
    if (!before.has(id)) added.push(f);
  }
  for (const [id] of before) {
    if (!after.has(id)) {
      const f = before.get(id)!;
      removed.push(f.short);
    }
  }
  return { added, removed };
}

async function clickRadioById(page: Page, fullId: string): Promise<boolean> {
  try {
    const el = page.locator(`#${fullId.replace(/\$/g, "\\$")}`);
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click();
      return true;
    }
  } catch {}
  return false;
}

async function selectOptionById(page: Page, fullId: string, val: string): Promise<boolean> {
  try {
    const el = page.locator(`#${fullId.replace(/\$/g, "\\$")}`);
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.selectOption(val).catch(() => {});
      return true;
    }
  } catch {}
  return false;
}

function identifyPage(url: string): string {
  const p = url.split("/").pop()?.split("?")[0]?.toLowerCase() || "";
  if (p.includes("default")) return "Landing";
  if (p.includes("confirmapplication")) return "SecurityQuestion";
  if (p.includes("personalcont") || p.includes("personalinfo2")) return "Personal2";
  if (p.includes("personal") && !p.includes("cont") && !p.includes("info2")) return "Personal1";
  if (p.includes("travelcompanions")) return "TravelCompanions";
  if (p.includes("previousustravel")) return "PreviousUSTravel";
  if (p.includes("travel") && !p.includes("companions") && !p.includes("previous")) return "Travel";
  if (p.includes("contact") && !p.includes("uscontact")) return "AddressPhone";
  if (p.includes("passport") || p.includes("pptvisa")) return "Passport";
  if (p.includes("uscontact")) return "USContact";
  if (p.includes("family4")) return "PrevSpouse";
  if (p.includes("family2")) return "Family2";
  if (p.includes("family1") || (p.includes("family") && !p.includes("2") && !p.includes("4"))) return "Family1";
  if (p.includes("workeducation1")) return "WorkEducation1";
  if (p.includes("workeducation2")) return "WorkEducation2";
  if (p.includes("workeducation3")) return "WorkEducation3";
  if (p.includes("securityandbackground1")) return "Security1";
  if (p.includes("securityandbackground2")) return "Security2";
  if (p.includes("securityandbackground3")) return "Security3";
  if (p.includes("securityandbackground4")) return "Security4";
  if (p.includes("securityandbackground5")) return "Security5";
  if (p.includes("security")) return "Security";
  if (p.includes("confirm") || p.includes("review")) return "Review";
  return "Unknown:" + p;
}

// =============================================
// Core exploration: test a single Y/N radio toggle
// =============================================
async function exploreRadioToggle(
  page: Page, pageName: string,
  radioYesId: string, radioNoId: string,
  triggerName: string
): Promise<BranchResult | null> {
  // Get baseline (with current state)
  const before = await getAllFields(page);

  // Click YES
  const clicked = await clickRadioById(page, radioYesId);
  if (!clicked) return null;
  await waitPB(page);

  const after = await getAllFields(page);
  const { added, removed } = diffFields(before, after);

  // Restore: click NO
  await clickRadioById(page, radioNoId);
  await waitPB(page);

  const result: BranchResult = {
    page: pageName,
    trigger: triggerName,
    triggerValue: "YES",
    fieldsAdded: added.map(f => ({
      short: f.short, tag: f.tag, type: f.type, optCount: f.optCount, opts: f.opts
    })),
    fieldsRemoved: removed
  };

  if (added.length > 0 || removed.length > 0) {
    console.log(`    ${triggerName}=YES: +${added.length} fields, -${removed.length} removed`);
    for (const f of added) {
      console.log(`      + ${f.short} [${f.tag}/${f.type}]${f.optCount > 0 ? ` (${f.optCount} opts)` : ""}`);
    }
  } else {
    console.log(`    ${triggerName}=YES: (no changes)`);
  }

  return result;
}

// =============================================
// Core exploration: test a select postback
// =============================================
async function exploreSelectOption(
  page: Page, pageName: string,
  selectId: string, optionValue: string, optionLabel: string,
  triggerName: string
): Promise<BranchResult | null> {
  const before = await getAllFields(page);
  const origVal = before.get(selectId)?.value || "";

  const clicked = await selectOptionById(page, selectId, optionValue);
  if (!clicked) return null;
  await waitPB(page);

  const after = await getAllFields(page);
  const { added, removed } = diffFields(before, after);

  // Restore original value
  if (origVal && origVal !== optionValue) {
    await selectOptionById(page, selectId, origVal);
    await waitPB(page);
  }

  const result: BranchResult = {
    page: pageName,
    trigger: triggerName,
    triggerValue: `${optionValue} (${optionLabel})`,
    fieldsAdded: added.map(f => ({
      short: f.short, tag: f.tag, type: f.type, optCount: f.optCount, opts: f.opts
    })),
    fieldsRemoved: removed
  };

  if (added.length > 0 || removed.length > 0) {
    console.log(`    ${triggerName}=${optionValue}: +${added.length}, -${removed.length}`);
    for (const f of added) {
      console.log(`      + ${f.short} [${f.tag}/${f.type}]${f.optCount > 0 ? ` (${f.optCount} opts)` : ""}`);
    }
  }

  return result;
}

// =============================================
// Core exploration: test Add Another button + FILL new entry
// =============================================
async function exploreAddAnother(
  page: Page, pageName: string,
  dataListId: string
): Promise<AddAnotherResult | null> {
  // Find Add Another button near this DataList
  const before = await getAllFields(page);

  // Find buttons with "Add Another" text
  const btnInfo = await page.evaluate((dlId: string) => {
    const buttons = document.querySelectorAll("input[type='button'], input[type='submit'], a");
    for (const btn of buttons) {
      const text = (btn as any).value || (btn as any).textContent || "";
      if (!text.toLowerCase().includes("add another")) continue;

      // Check if this button is near the DataList by walking up the DOM
      let node: any = btn;
      for (let depth = 0; depth < 8 && node; depth++) {
        node = node.parentElement;
        if (!node) break;
        if (node.innerHTML?.includes(dlId)) {
          return { id: (btn as any).id || "", text: text.trim() };
        }
      }
    }
    return null;
  }, dataListId);

  if (!btnInfo) {
    console.log(`    Add Another [${dataListId}]: button NOT found`);
    return null;
  }

  console.log(`    Add Another [${dataListId}]: found button "${btnInfo.text}" (${btnInfo.id})`);

  // Click the button
  try {
    if (btnInfo.id) {
      await page.click(`#${btnInfo.id.replace(/\$/g, "\\$")}`);
    } else {
      await page.evaluate((btnText: string) => {
        const buttons = document.querySelectorAll("input[type='button'], a");
        for (const btn of buttons) {
          if ((btn as any).value === btnText || (btn as any).textContent?.trim() === btnText) {
            (btn as any).click();
            break;
          }
        }
      }, btnInfo.text);
    }
    await waitPB(page);

    const after = await getAllFields(page);
    const { added } = diffFields(before, after);

    console.log(`    -> ${added.length} new fields in entry:`);
    for (const f of added) {
      console.log(`      + ${f.short} [${f.tag}/${f.type}]`);
    }

    // ---- FILL the new entry fields with test data ----
    let filledCount = 0;
    for (const f of added) {
      const fullId = f.id.replace(/\$/g, "\\$");
      try {
        const loc = page.locator(`#${fullId}`);
        if (!(await loc.isVisible({ timeout: 1000 }).catch(() => false))) continue;

        if (f.tag === "select") {
          // Select first valid option
          const opts = await loc.evaluate((sel: any) => Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text })));
          const validOpt = opts.find((o: any) => o.v && o.v.trim() !== "" && o.v !== "-1" && o.v !== "0" && !o.t.toUpperCase().includes("SELECT"));
          if (validOpt) {
            await loc.selectOption(validOpt.v);
            console.log(`      FILLED: ${f.short} = "${validOpt.t.substring(0, 30)}"`);
            filledCount++;
          }
        } else if (f.tag === "input" && (f.type === "text" || f.type === "tel")) {
          // Fill with contextual test data based on field name
          const val = getTestValue(f.short);
          await loc.fill(val);
          console.log(`      FILLED: ${f.short} = "${val}"`);
          filledCount++;
        } else if (f.tag === "textarea") {
          await loc.fill("TEST DATA FOR EXPLORATION");
          console.log(`      FILLED: ${f.short} = "TEST DATA FOR EXPLORATION"`);
          filledCount++;
        } else if (f.type === "radio") {
          // For radio buttons in Add Another, click NO by default
          if (f.id.endsWith("_1")) {
            await loc.click();
            console.log(`      FILLED: ${f.short} = NO`);
            filledCount++;
          }
        } else if (f.type === "checkbox") {
          const checked = await loc.isChecked().catch(() => false);
          if (!checked && f.short.includes("_NA")) {
            await loc.check();
            console.log(`      FILLED: ${f.short} = checked`);
            filledCount++;
          }
        }
      } catch (e: any) {
        console.log(`      FILL FAILED: ${f.short}: ${e.message?.substring(0, 60)}`);
      }
    }
    await waitPB(page, 500);
    console.log(`    Add Another FILL result: ${filledCount}/${added.length} fields filled`);

    // ---- REMOVE the added entry to restore original state ----
    // Find Remove/Delete button for the new entry (ctl01 or higher)
    const removeResult = await page.evaluate((dlId: string) => {
      // Look for Remove buttons in DataList entries _ctl01_ and higher
      const removeButtons = document.querySelectorAll("input[type='button'][value*='Remove'], input[type='button'][value*='Delete'], a[id*='DeleteButton'], a[id*='RemoveButton']");
      for (const btn of removeButtons) {
        const btnId = (btn as any).id || "";
        // Only remove the NEWEST entry (highest ctl index)
        if (btnId.includes(dlId) && (btnId.includes("_ctl01") || btnId.includes("_ctl02") || btnId.includes("_ctl03"))) {
          (btn as any).click();
          return { removed: true, btnId };
        }
      }
      // Also try generic "Remove" near the DataList
      const allBtns = document.querySelectorAll("input[type='button']");
      for (const btn of allBtns) {
        const text = (btn as any).value || "";
        const btnId = (btn as any).id || "";
        if (text.toLowerCase().includes("remove") && btnId.includes(dlId)) {
          (btn as any).click();
          return { removed: true, btnId };
        }
      }
      return { removed: false, btnId: "" };
    }, dataListId);

    if (removeResult.removed) {
      await waitPB(page);
      console.log(`    Removed added entry via: ${removeResult.btnId}`);
    } else {
      console.log(`    WARNING: Could not find Remove button for added entry`);
    }

    return {
      page: pageName,
      dataListId,
      buttonText: btnInfo.text,
      fieldsInNewEntry: added.map(f => ({ short: f.short, tag: f.tag, type: f.type }))
    };
  } catch (e: any) {
    console.log(`    Add Another [${dataListId}]: click failed: ${e.message?.substring(0, 80)}`);
    return null;
  }
}

// Helper: get contextual test data for Add Another fields
function getTestValue(shortId: string): string {
  const s = shortId.toLowerCase();
  if (s.includes("surname") || s.includes("last_name")) return "TESTSON";
  if (s.includes("given") || s.includes("first_name")) return "TESTINA";
  if (s.includes("city") || s.includes("pob_city")) return "SAO PAULO";
  if (s.includes("state") || s.includes("province")) return "SP";
  if (s.includes("postal") || s.includes("zip")) return "01000-000";
  if (s.includes("addr") || s.includes("street")) return "RUA TESTE 123";
  if (s.includes("phone") || s.includes("tel")) return "11999998888";
  if (s.includes("email")) return "test2@test.com";
  if (s.includes("flight")) return "LA8099";
  if (s.includes("passport") || s.includes("ppt_num")) return "XZ998877";
  if (s.includes("foil")) return "B7654321";
  if (s.includes("license") || s.includes("driver")) return "D1234567";
  if (s.includes("year")) return "2024";
  if (s.includes("salary") || s.includes("income")) return "6000";
  if (s.includes("ssn")) return "456";
  if (s.includes("name") || s.includes("title") || s.includes("organization")) return "TEST ORG";
  if (s.includes("duties") || s.includes("course") || s.includes("expl")) return "TEST EXPLANATION";
  if (s.includes("language")) return "FRENCH";
  if (s.includes("branch")) return "ARMY";
  if (s.includes("rank")) return "PRIVATE";
  if (s.includes("specialty")) return "GENERAL";
  if (s.includes("social") && s.includes("plat")) return "LINKEDIN";
  if (s.includes("social") && s.includes("hand")) return "@testuser";
  return "TEST";
}

// =============================================
// Comprehensive page exploration
// =============================================
async function explorePage(page: Page, pageName: string): Promise<PageReport> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`>>> EXPLORING: ${pageName}`);
  console.log(`${"=".repeat(70)}`);

  // Step 1: Dump ALL visible fields
  const fields = await getAllFields(page);
  console.log(`  Total visible fields: ${fields.size}`);

  // Categorize
  const radios = new Map<string, string[]>();  // groupName -> [id1, id2]
  const selects: string[] = [];
  const texts: string[] = [];
  const checkboxes: string[] = [];
  const textareas: string[] = [];

  for (const [id, f] of fields) {
    if (f.type === "submit" || f.type === "button" || f.type === "image") continue;
    if (f.type === "radio") {
      // Group radios by name
      if (!radios.has(f.name)) radios.set(f.name, []);
      radios.get(f.name)!.push(id);
    } else if (f.tag === "select") {
      selects.push(id);
    } else if (f.tag === "textarea") {
      textareas.push(id);
    } else if (f.type === "checkbox") {
      checkboxes.push(id);
    } else if (f.type === "text" || f.type === "tel" || f.type === "email") {
      texts.push(id);
    }
  }

  console.log(`  Radio groups: ${radios.size}, Selects: ${selects.length}, Texts: ${texts.length}, Checkboxes: ${checkboxes.length}, Textareas: ${textareas.length}`);

  // Print all fields summary
  console.log(`\n  --- All Fields ---`);
  for (const [id, f] of fields) {
    if (f.type === "submit" || f.type === "button" || f.type === "image") continue;
    const val = f.value ? `="${f.value.substring(0, 30)}"` : "";
    const opt = f.optCount > 0 ? ` (${f.optCount} opts)` : "";
    const lbl = f.label ? ` [${f.label.substring(0, 40)}]` : "";
    console.log(`    ${f.short} [${f.tag}/${f.type}]${val}${opt}${lbl}`);
  }

  const branches: BranchResult[] = [];
  const addAnothers: AddAnotherResult[] = [];

  // Step 2: Explore each radio Y/N group
  console.log(`\n  --- Radio Y/N Branches ---`);
  for (const [name, ids] of radios) {
    if (ids.length !== 2) continue;  // Only Y/N pairs (2 options)

    // Determine which is YES (_0) and which is NO (_1)
    const yesId = ids.find(id => id.endsWith("_0")) || ids[0];
    const noId = ids.find(id => id.endsWith("_1")) || ids[1];
    const shortName = fields.get(yesId)?.short?.replace(/_0$/, "") || name;

    const result = await exploreRadioToggle(page, pageName, yesId, noId, shortName);
    if (result) branches.push(result);
  }

  // Step 3: Explore select postback triggers
  console.log(`\n  --- Select Postback Tests ---`);
  for (const selId of selects) {
    const f = fields.get(selId)!;
    // Skip language dropdown - always keep Portuguese
    if (selId === "ctl00_ddlLanguage") continue;
    // Test selects that are likely postback triggers (known patterns + any with onchange/postback)
    const isPostback = /ddlPurposeOfTrip|ddlOtherPurpose|ddlWhoIsPaying|ddlPPT_TYPE|ddlPresentOccupation|ddlAPP_MARITAL_STATUS|ddlAPP_POB_CNTRY|ddlUS_POC_REL_TO_APP|ddlPayerRelationship|ddlAPP_NATL|ddlEmpSchCountry|ddlCountry|ddlTravelState|ddlVisaClass/.test(selId);

    // Also check if the select has __doPostBack in its onchange
    const hasPostback = isPostback || await page.evaluate((sid: string) => {
      const el = document.getElementById(sid);
      const onchange = el?.getAttribute("onchange") || "";
      return onchange.includes("__doPostBack") || onchange.includes("PostBack");
    }, selId).catch(() => false);

    if (hasPostback && f.optCount > 1 && f.optCount <= 30) {
      console.log(`  Testing select: ${f.short} (${f.optCount} options)`);
      // Test a few interesting options
      const optValues = f.opts.map(o => o.split("=")[0].replace(/"/g, ""));
      const currentVal = f.value;

      for (const val of optValues) {
        if (val === currentVal || val === "" || val === "-1" || val === "0" || val.includes("SELECT")) continue;
        const label = f.opts.find(o => o.startsWith(val + "="))?.split("=")[1]?.replace(/"/g, "") || val;
        const result = await exploreSelectOption(page, pageName, selId, val, label, f.short);
        if (result && (result.fieldsAdded.length > 0 || result.fieldsRemoved.length > 0)) {
          branches.push(result);
        }
      }
    }
  }

  // Step 4: Explore Add Another DataLists
  console.log(`\n  --- Add Another DataLists ---`);
  const dataListIds = await page.evaluate(() => {
    const ids: string[] = [];
    // Find all elements that look like DataList entries (contain _ctl00_, _ctl01_ etc.)
    document.querySelectorAll("[id*='_ctl0']").forEach((el: any) => {
      if (!el.id) return;
      const m = el.id.match(/ctl00_SiteContentPlaceHolder_FormView1_((?:dtl|DList|dl)[A-Za-z_]+)_ctl\d+/);
      if (m && !ids.includes(m[1])) ids.push(m[1]);
    });
    // Also check for Add Another buttons
    document.querySelectorAll("input[type='button'][value*='Add Another'], a[href*='AddAnother']").forEach((btn: any) => {
      let node: any = btn;
      for (let depth = 0; depth < 8 && node; depth++) {
        node = node.parentElement;
        if (!node) break;
        const match = node.id?.match(/ctl00_SiteContentPlaceHolder_FormView1_((?:dtl|DList|dl)[A-Za-z_]+)/);
        if (match && !ids.includes(match[1])) ids.push(match[1]);
      }
    });
    return ids;
  });

  if (dataListIds.length > 0) {
    console.log(`  Found DataList IDs: ${dataListIds.join(", ")}`);
    for (const dlId of dataListIds) {
      const result = await exploreAddAnother(page, pageName, dlId);
      if (result) addAnothers.push(result);
    }
  } else {
    console.log(`  No DataLists found on this page`);
  }

  const pageReport: PageReport = {
    pageName,
    url: page.url(),
    totalFields: fields.size,
    fields: Array.from(fields.values()),
    branches,
    addAnother: addAnothers,
  };

  report.push(pageReport);
  return pageReport;
}

// =============================================
// Security page special exploration (YES branches)
// =============================================
async function exploreSecurityPage(page: Page, pageName: string): Promise<PageReport> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`>>> EXPLORING SECURITY: ${pageName}`);
  console.log(`${"=".repeat(70)}`);

  const fields = await getAllFields(page);
  console.log(`  Total visible fields: ${fields.size}`);

  const branches: BranchResult[] = [];

  // Find all radio groups
  const radioGroups = new Map<string, string[]>();
  for (const [id, f] of fields) {
    if (f.type === "radio") {
      if (!radioGroups.has(f.name)) radioGroups.set(f.name, []);
      radioGroups.get(f.name)!.push(id);
    }
  }

  console.log(`  Radio groups: ${radioGroups.size}`);

  // Test each radio group: click YES, see what appears
  for (const [name, ids] of radioGroups) {
    if (ids.length !== 2) continue;
    const yesId = ids.find(id => id.endsWith("_0")) || ids[0];
    const noId = ids.find(id => id.endsWith("_1")) || ids[1];
    const shortName = fields.get(yesId)?.short?.replace(/_0$/, "") || name;

    const result = await exploreRadioToggle(page, pageName, yesId, noId, shortName);
    if (result) branches.push(result);
  }

  // Print all fields
  console.log(`\n  --- All Fields ---`);
  for (const [id, f] of fields) {
    if (f.type === "submit" || f.type === "button" || f.type === "image") continue;
    console.log(`    ${f.short} [${f.tag}/${f.type}] label="${f.label}"`);
  }

  const pageReport: PageReport = {
    pageName,
    url: page.url(),
    totalFields: fields.size,
    fields: Array.from(fields.values()),
    branches,
    addAnother: [],
  };

  report.push(pageReport);
  return pageReport;
}

// =============================================
// Navigation helpers
// =============================================
async function clickNext(page: Page): Promise<boolean> {
  // Try multiple selectors for Next button
  for (const sel of [
    "input[type=submit][value*='Next']",
    "#ctl00_SiteContentPlaceHolder_btnNext",
    "input[id*='btnNext']",
    "#ctl00_SiteContentPlaceHolder_UpdateButton3",
  ]) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const urlBefore = page.url();
      await btn.click();
      const start = Date.now();
      while (page.url() === urlBefore && Date.now() - start < 20_000) {
        await new Promise(r => setTimeout(r, 300));
      }
      await waitPB(page);
      return page.url() !== urlBefore;
    }
  }
  return false;
}

async function clickPrevious(page: Page): Promise<boolean> {
  const btn = page.locator("input[type=submit][value*='Previous'], input[type=submit][value*='Back']").first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const urlBefore = page.url();
    await btn.click();
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 15_000) {
      await new Promise(r => setTimeout(r, 300));
    }
    await waitPB(page);
    return page.url() !== urlBefore;
  }
  return false;
}

// =============================================
// Quick fill: minimal fill to get past page
// =============================================
// Cache the field map so we only build it once
let cachedFieldMap: any[] | null = null;
async function getFieldMap() {
  if (cachedFieldMap) return cachedFieldMap;
  const { buildDynamicFieldMap } = await import("./build-field-map");
  const { profiles } = await import("../tests/fixtures/brazilian-applicant");
  // Use complex-all-yes profile (251 entries) - has ALL branches
  const profile = profiles["complex-all-yes"];
  cachedFieldMap = buildDynamicFieldMap(profile);
  console.log(`  [quickFill] Built field map: ${cachedFieldMap.length} entries (complex-all-yes)`);
  return cachedFieldMap;
}

async function quickFillPage(page: Page): Promise<void> {
  const fieldMap = await getFieldMap();

  for (let pass = 0; pass < 10; pass++) {
    // Get fields sorted by DOM order (top to bottom)
    const orderedIds = await page.evaluate((pfx: string) => {
      const elements: { id: string; top: number }[] = [];
      document.querySelectorAll("select, input, textarea").forEach((el: any) => {
        if (!el.id || el.type === "hidden") return;
        const style = window.getComputedStyle(el);
        const isVis = (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox")
                      && style.display !== "none" && style.visibility !== "hidden";
        if (!isVis) return;
        const rect = el.getBoundingClientRect();
        elements.push({ id: el.id, top: rect.top });
      });
      // Sort by vertical position (DOM order top → bottom)
      elements.sort((a, b) => a.top - b.top);
      return elements.map(e => e.id);
    }, PREFIX);

    const fields = await getAllFields(page);
    let filled = 0;
    let needPostback = false;

    // Fill in DOM order (top → bottom)
    for (const id of orderedIds) {
      const f = fields.get(id);
      if (!f) continue;
      if (f.type === "submit" || f.type === "button" || f.type === "image") continue;

      const match = fieldMap.find(m => m.pattern.test(id));
      if (!match) continue;

      try {
        const loc = page.locator(`#${id.replace(/\$/g, "\\$")}`);
        const isVis = await loc.isVisible({ timeout: 500 }).catch(() => false);
        if (!isVis) continue;

        if (match.type === "select" || match.type === "select-label" || match.type === "select-search") {
          const val = f.value?.trim();
          if (val && val !== "" && val !== "-1" && val !== "0" && !val.toUpperCase().includes("SELECT")) continue;

          if (match.type === "select-search") {
            const opts = await loc.evaluate((sel: any) => Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text })));
            const found = opts.find((o: any) => o.t.toUpperCase().includes(match.value.toUpperCase())) ||
                          opts.find((o: any) => o.v?.toUpperCase().includes(match.value.toUpperCase()));
            if (found) { await loc.selectOption(found.v); filled++; }
          } else if (match.type === "select-label") {
            await loc.selectOption({ label: match.value }).catch(() => {});
            filled++;
          } else {
            await loc.selectOption(match.value).catch(() =>
              loc.selectOption({ label: match.value }).catch(() =>
                loc.selectOption({ index: 1 }).catch(() => {})));
            filled++;
          }
          // Check if postback trigger - BREAK to re-scan fields after postback
          if (/ddlPurposeOfTrip|ddlOtherPurpose|ddlWhoIsPaying|ddlPPT_TYPE|ddlPresentOccupation|ddlAPP_POB_CNTRY|ddlAPP_MARITAL_STATUS|ddlCountry|ddlEmpSchCountry|ddlSpouseAddressType|ddlVisaClass/.test(id)) {
            needPostback = true; break;
          }
        } else if (match.type === "text") {
          if ((f.tag === "input" || f.tag === "textarea") && (!f.value || f.value.trim() === "")) {
            await loc.fill(match.value).catch(() => {});
            filled++;
          }
        } else if (match.type === "click") {
          if (f.type === "radio" || f.type === "checkbox") {
            const checked = await loc.isChecked().catch(() => false);
            if (!checked) {
              await loc.click().catch(() => {});
              filled++;
              // Radio postback check - BREAK to re-scan fields
              if (/rblOtherNames_0|rblAPP_OTH_NATL_IND_0|rblPermResOtherCntryInd_0|rblSpecificTravel|rblOtherPersons|rblPREV_US_TRAVEL|rblPREV_VISA_IND|rblPreviouslyEmployed|rblOtherEduc|rblLOST_PPT|rblUS_IMMED_RELATIVE|rblCOUNTRIES_VISITED|rblMILITARY_SERVICE|rblAddPhone|rblAddEmail|rblAddSocial|rblCLAN_TRIBE/.test(id)) {
                needPostback = true; break;
              }
            }
          }
        } else if (match.type === "checkbox-check") {
          const checked = await loc.isChecked().catch(() => false);
          if (!checked) { await loc.check().catch(() => {}); filled++; }
        }
      } catch {}
    }

    if (needPostback) {
      await waitPB(page);
      continue;
    }
    if (filled === 0) break;
  }
}

// =============================================
// Manual fill for empty required fields (fallback)
// =============================================
async function manualFillEmpty(page: Page): Promise<number> {
  return page.evaluate(() => {
    let filled = 0;
    const pfx = "ctl00_SiteContentPlaceHolder_FormView1_";

    // Fill empty text inputs with placeholder data
    document.querySelectorAll("input[type='text'], textarea").forEach((el: any) => {
      if (!el.id || !el.id.startsWith(pfx)) return;
      if (el.offsetParent === null) return;
      if (el.value && el.value.trim() !== "") return;

      const id = el.id.toLowerCase();
      if (id.includes("year")) { el.value = "2025"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("surname") || id.includes("last_name")) { el.value = "TEST"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("given") || id.includes("first_name")) { el.value = "EXPLORATION"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("city") || id.includes("pob_city")) { el.value = "SAO PAULO"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("state") || id.includes("province")) { el.value = "SP"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("postal") || id.includes("zip")) { el.value = "01000"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("addr") || id.includes("street")) { el.value = "RUA TESTE 123"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("phone") || id.includes("tel")) { el.value = "11999999999"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("email")) { el.value = "test@test.com"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("flight")) { el.value = "AA100"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("ppt_num") || id.includes("passport")) { el.value = "FZ123456"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("foil")) { el.value = "A1234567"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("salary")) { el.value = "5000"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("ssn")) { el.value = "123"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("national_id") || id.includes("tax_id")) { el.value = "12345678901"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("location") || id.includes("relation")) { el.value = "TEST"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else if (id.includes("name") || id.includes("title") || id.includes("duties") || id.includes("course") || id.includes("expl")) { el.value = "TEST"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
      else { el.value = "TEST"; el.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
    });

    // Fill empty selects with first non-empty option
    document.querySelectorAll("select").forEach((el: any) => {
      if (!el.id || !el.id.startsWith(pfx)) return;
      if (el.offsetParent === null) return;
      const val = el.value?.trim();
      if (val && val !== "" && val !== "-1" && val !== "0" && !val.toUpperCase().includes("SELECT")) return;

      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        const v = opt.value?.trim();
        if (v && v !== "" && v !== "-1" && v !== "0" && !v.toUpperCase().includes("SELECT")) {
          el.value = v;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          filled++;
          break;
        }
      }
    });

    return filled;
  });
}

// =============================================
// CAPTCHA helpers
// =============================================
function cleanupSignals() {
  [CAPTCHA_READY, CAPTCHA_ANSWER, CAPTCHA_IMG].forEach(f => { try { fs.unlinkSync(f); } catch {} });
}

async function waitForFile(filePath: string, timeout = 300_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content.length > 0) return content;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${filePath}`);
}

async function startNewApplication(page: Page): Promise<void> {
  console.log("\n>>> Starting NEW application for exploration...");
  await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: "load", timeout: 30_000 });
  await new Promise(r => setTimeout(r, 2000));

  // ---- Map ALL embassies/consulates from the location dropdown ----
  console.log("\n>>> Mapeando TODAS as embaixadas e consulados...");
  const locations = await page.evaluate(() => {
    const sel = document.getElementById("ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation") as HTMLSelectElement;
    if (!sel) return [];
    return Array.from(sel.options).map(o => ({
      value: o.value,
      text: o.text.trim(),
    })).filter(o => o.value && o.value.trim() !== "" && !o.text.toUpperCase().includes("SELECT"));
  });

  console.log(`  Total localizacoes: ${locations.length}`);
  for (const loc of locations) {
    console.log(`    ${loc.value} = ${loc.text}`);
  }

  // Save to report and file
  const locationsPath = path.join(TMP, "ds160-locations.json");
  fs.writeFileSync(locationsPath, JSON.stringify(locations, null, 2));
  console.log(`  Salvo em: ${locationsPath}`);

  // Select location (Sao Paulo = SPL)
  await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", "SPL");
  await waitPB(page);
  await new Promise(r => setTimeout(r, 1500));

  // CAPTCHA
  for (let attempt = 1; attempt <= 5; attempt++) {
    cleanupSignals();
    const captchaImg = page.locator("img[id*='CaptchaImage']");
    if (await captchaImg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captchaImg.screenshot({ path: CAPTCHA_IMG });
      console.log(`  CAPTCHA attempt ${attempt}/5 saved`);
      fs.writeFileSync(CAPTCHA_READY, `attempt-${attempt}`);

      const answer = await waitForFile(CAPTCHA_ANSWER);
      console.log(`  CAPTCHA answer: ${answer}`);

      await page.fill("#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox", answer);
      const urlBefore = page.url();
      await page.click("#ctl00_SiteContentPlaceHolder_lnkNew");

      const start = Date.now();
      while (Date.now() - start < 15_000) {
        if (page.url() !== urlBefore) break;
        await new Promise(r => setTimeout(r, 300));
      }

      if (page.url() !== urlBefore) {
        console.log(`  CAPTCHA solved on attempt ${attempt}!`);
        await new Promise(r => setTimeout(r, 2000));
        break;
      }
      console.log(`  CAPTCHA failed attempt ${attempt}`);
      if (attempt === 5) throw new Error("CAPTCHA failed after 5 attempts");
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Security Question
  console.log(">>> Security Question...");
  await page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct").check();
  await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
  await page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer").fill("EXPLORATION");

  const urlBefore = page.url();
  await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
  const start = Date.now();
  while (page.url() === urlBefore && Date.now() - start < 10_000) {
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 2000));

  // Confirm Application ID if prompted
  const continueApp = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
  if (await continueApp.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Save Application ID
    const appId = await page.locator("#ctl00_SiteContentPlaceHolder_lblBarcode").textContent().catch(() => "");
    if (appId) {
      fs.writeFileSync(path.join(TMP, "application-id.txt"), appId.trim());
      console.log(`  Application ID: ${appId.trim()}`);
    }
    const u = page.url();
    await continueApp.click();
    const s = Date.now();
    while (page.url() === u && Date.now() - s < 10_000) await new Promise(r => setTimeout(r, 300));
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`>>> Now on: ${identifyPage(page.url())} (${page.url().split("/").pop()})`);
}

// =============================================
// Fill Security pages (all No)
// =============================================
async function fillSecurityAllNo(page: Page): Promise<void> {
  const noRadios = page.locator("input[type=radio][value='N']");
  const count = await noRadios.count();
  for (let i = 0; i < count; i++) {
    const r = noRadios.nth(i);
    if (!(await r.isChecked().catch(() => true))) {
      await r.click().catch(() => {});
    }
  }
  await waitPB(page, 500);
}

// =============================================
// MAIN
// =============================================
async function main() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

  console.log("=".repeat(70));
  console.log("DS-160 DEEP EXPLORER - Comprehensive Field Discovery");
  console.log("=".repeat(70));

  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  let ctx = browser.contexts()[0];
  if (!ctx) ctx = await browser.newContext();
  let page = ctx.pages()[0];
  if (!page) page = await ctx.newPage();
  page.setDefaultTimeout(10_000);
  page.on("dialog", async d => { try { await d.accept(); } catch {} });

  console.log(`Current URL: ${page.url()}`);
  const curPage = identifyPage(page.url());
  console.log(`Current page: ${curPage}`);

  // Start a new application if not already on a form page
  if (curPage === "Landing" || curPage === "Unknown:" || curPage.startsWith("Unknown")) {
    await startNewApplication(page);
  }

  // Main exploration loop
  let maxPages = 35;
  const visitedPages: string[] = [];

  while (maxPages-- > 0) {
    const pageName = identifyPage(page.url());
    visitedPages.push(pageName);

    if (pageName === "Review") {
      console.log("\n>>> REACHED REVIEW - Exploration complete!");
      break;
    }

    // Explore this page comprehensively
    if (pageName.startsWith("Security")) {
      // Security pages: always fill NO and advance (don't explore YES)
      console.log(`\n  [Security] Filling all radios = NO`);
      const fields = await getAllFields(page);
      console.log(`  Total visible fields: ${fields.size}`);
      for (const [id, f] of fields) {
        if (f.type === "submit" || f.type === "button" || f.type === "image") continue;
        console.log(`    ${f.short} [${f.tag}/${f.type}] label="${f.label}"`);
      }
      report.push({
        pageName, url: page.url(), totalFields: fields.size,
        fields: Array.from(fields.values()), branches: [], addAnother: []
      });
      await fillSecurityAllNo(page);
    } else {
      await explorePage(page, pageName);
      // Quick fill to advance
      console.log(`\n  >>> Quick-filling ${pageName} to advance...`);
      await quickFillPage(page);
    }

    // Click Next
    console.log(`  >>> Clicking Next from ${pageName}...`);
    const navigated = await clickNext(page);
    if (!navigated) {
      console.log(`  >>> Next failed, retrying fill...`);
      await quickFillPage(page);
      const nav2 = await clickNext(page);
      if (!nav2) {
        console.log(`  >>> STUCK on ${pageName} - checking for validation errors`);
        // Check validation errors
        const errors = await page.evaluate(() => {
          const texts: string[] = [];
          document.querySelectorAll("span[style*='color:Red'], span[style*='color: Red'], span[style*='color:red']").forEach((el: any) => {
            const t = el.textContent?.trim();
            if (t && t.length > 5 && !texts.includes(t)) texts.push(t);
          });
          const vs = document.getElementById("ctl00_SiteContentPlaceHolder_FormView1_ValidationSummary");
          if (vs) {
            vs.querySelectorAll("li").forEach((li: any) => {
              const t = li.textContent?.trim();
              if (t && !texts.includes(t)) texts.push(t);
            });
          }
          return texts;
        });
        if (errors.length) {
          console.log(`  VALIDATION ERRORS:`);
          for (const e of errors) console.log(`    - ${e}`);
        }
        // Try filling unfilled fields manually
        console.log(`  >>> Attempting manual fill of empty required fields...`);
        await manualFillEmpty(page);
        await quickFillPage(page);
        const nav3 = await clickNext(page);
        if (!nav3) {
          // Last resort: try clicking Next ignoring errors
          console.log(`  >>> Last resort: trying to fill any remaining empty fields...`);
          await manualFillEmpty(page);
          const nav4 = await clickNext(page);
          if (!nav4) {
            console.log(`  FATAL: Cannot advance past ${pageName}`);
            break;
          }
        }
      }
    }

    const newPage = identifyPage(page.url());
    console.log(`  >>> Now on: ${newPage}`);
  }

  // Save report
  const reportPath = path.join(TMP, "deep-explore-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${"=".repeat(70)}`);
  console.log("DEEP EXPLORATION COMPLETE");
  console.log(`Pages visited: ${visitedPages.join(" -> ")}`);
  console.log(`Total pages explored: ${report.length}`);
  console.log(`Report saved: ${reportPath}`);
  console.log(`${"=".repeat(70)}`);

  // Summary
  console.log("\n>>> DISCOVERY SUMMARY:");
  for (const pg of report) {
    const newBranches = pg.branches.filter(b => b.fieldsAdded.length > 0);
    const addAnothers = pg.addAnother.filter(a => a.fieldsInNewEntry.length > 0);
    console.log(`\n  ${pg.pageName} (${pg.totalFields} fields)`);
    if (newBranches.length) {
      for (const b of newBranches) {
        console.log(`    Branch: ${b.trigger}=${b.triggerValue} -> +${b.fieldsAdded.length} fields`);
        for (const f of b.fieldsAdded) {
          console.log(`      + ${f.short} [${f.tag}/${f.type}]${f.optCount > 0 ? ` (${f.optCount} opts)` : ""}`);
        }
      }
    }
    if (addAnothers.length) {
      for (const a of addAnothers) {
        console.log(`    Add Another [${a.dataListId}]: ${a.fieldsInNewEntry.length} fields in new entry`);
      }
    }
  }
}

main().catch(console.error);
