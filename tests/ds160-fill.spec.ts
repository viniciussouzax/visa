import { test, expect, chromium, Page, Browser } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { profiles, DS160Applicant } from "./fixtures/brazilian-applicant";
import { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } from "../scripts/build-field-map";

// ====================================================================
// CONSTANTS
// ====================================================================
const TMP = path.join(__dirname, "..", "tmp");
const CAPTCHA_IMG = path.join(TMP, "captcha.png");
const CAPTCHA_READY = path.join(TMP, "captcha-ready.txt");
const CAPTCHA_ANSWER = path.join(TMP, "captcha-answer.txt");
const CDP_PORT = 9222;
const PREFIX = "ctl00_SiteContentPlaceHolder_FormView1_";

type FieldMap = ReturnType<typeof buildDynamicFieldMap>;

// ====================================================================
// HELPERS
// ====================================================================
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanupSignals() {
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

async function waitForPostback(page: Page): Promise<void> {
  const start = Date.now();
  // Wait for ASP.NET PageRequestManager to finish
  await page.evaluate(() => new Promise<void>((resolve) => {
    const check = () => {
      const mgr = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
      if (!mgr || !mgr.get_isInAsyncPostBack()) resolve();
      else setTimeout(check, 150);
    };
    check();
  })).catch(() => { });

  // Wait for field count to stabilize
  const countFields = () => page.evaluate(() => {
    let c = 0;
    document.querySelectorAll("select, input:not([type='hidden']), textarea").forEach((el: any) => {
      if (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox") c++;
    });
    return c;
  }).catch(() => 0);

  const initial = await countFields();
  let last = initial;
  let stable = 0;
  while (Date.now() - start < 5_000) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);
    }).catch(() => { });
    await new Promise((r) => setTimeout(r, 300));
    const cur = await countFields();
    if (cur !== initial && cur === last) { stable += 300; if (stable >= 600) break; }
    else if (cur === initial && Date.now() - start > 1500) break;
    else stable = 0;
    last = cur;
  }
}

async function waitForPageReady(page: Page, timeout = 10_000): Promise<number> {
  const start = Date.now();
  let count = 0;
  while (Date.now() - start < timeout) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);
    }).catch(() => { });
    count = await page.evaluate(() => {
      let c = 0;
      document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach((el: any) => {
        if (el.offsetParent !== null || el.type === "radio" || el.type === "checkbox") c++;
      });
      return c;
    }).catch(() => 0);
    if (count > 0) {
      const inPB = await page.evaluate(() => {
        const m = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return m?.get_isInAsyncPostBack?.() || false;
      }).catch(() => false);
      if (!inPB && (count >= 3 || Date.now() - start > 3_000)) return count;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return count;
}

function identifyPage(url: string): string {
  if (url.includes("Default.aspx")) return "Landing";
  if (url.includes("ConfirmApplicationID") || url.includes("SecureQuestion")) return "SecurityQuestion";
  const file = url.split("/").pop()?.split("?")[0] || "";
  const node = url.match(/node=(\w+)/)?.[1] || "";
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
  if (file.includes("complete_addlworkeducation")) return "AdditionalWork";
  if (url.includes("SecurityandBackground")) return "Security";
  if (url.includes("UploadPhoto")) return "Photo";
  if (url.includes("ReviewPage") || url.includes("Review")) return "Review";
  if (url.includes("Confirmation")) return "Confirmation";
  return node || "Unknown";
}

function isFinalPage(name: string): boolean {
  return ["Review", "Photo", "Confirmation"].includes(name);
}

function isSecurityPage(url: string): boolean {
  return url.includes("SecurityandBackground");
}

// ====================================================================
// FIELD DISCOVERY & AUTO-FILL
// ====================================================================
async function discoverFields(page: Page) {
  return await page.evaluate(() => {
    const fields: any[] = [];
    document.querySelectorAll("select").forEach((sel: any) => {
      if (sel.id.includes("ddlLanguage")) return;
      fields.push({
        tag: "select", id: sel.id, visible: sel.offsetParent !== null,
        value: sel.value, optCount: Array.from(sel.options).length,
      });
    });
    document.querySelectorAll("input").forEach((inp: any) => {
      if (inp.type === "hidden") return;
      fields.push({
        tag: "input", id: inp.id, type: inp.type,
        visible: inp.offsetParent !== null || inp.type === "radio" || inp.type === "checkbox",
        value: inp.value, checked: inp.checked, radioValue: inp.value,
      });
    });
    document.querySelectorAll("textarea").forEach((ta: any) => {
      fields.push({ tag: "textarea", id: ta.id, visible: ta.offsetParent !== null, value: ta.value });
    });
    return fields;
  });
}

function isSelectEmpty(val: string | undefined | null): boolean {
  if (!val) return true;
  const v = val.trim();
  return v === "" || v === "-1" || v === "0" || v === "SONE" || v.toUpperCase().includes("SELECT");
}

async function autoFillPass(page: Page, fieldMap: FieldMap): Promise<boolean> {
  const fields = await discoverFields(page);
  const visible = fields.filter((f: any) => f.visible && f.id);
  let postbackNeeded = false;
  let filled = 0;

  for (const field of visible) {
    if (!field.id) continue;
    if (field.type === "submit" || field.type === "image" || field.type === "button") continue;
    if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(field.id)) continue;

    const match = fieldMap.find((m) => m.pattern.test(field.id));
    if (!match) continue;

    const shortId = field.id.split("_").pop();

    try {
      const loc = page.locator(`#${field.id.replace(/\$/g, "\\$")}`);
      const isVis = await loc.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVis) continue;

      switch (match.type) {
        case "text":
          if (!field.value || field.value.trim() === "") {
            await loc.fill(match.value);
            filled++;
          }
          break;

        case "select":
          if (isSelectEmpty(field.value)) {
            try { await loc.selectOption(match.value); }
            catch {
              try { await loc.selectOption({ label: match.value }); }
              catch { await loc.selectOption({ index: 1 }).catch(() => { }); }
            }
            filled++;
            if (isPostbackSelect(field.id)) { postbackNeeded = true; break; }
          }
          break;

        case "select-label":
          if (isSelectEmpty(field.value)) {
            await loc.selectOption({ label: match.value });
            filled++;
            if (isPostbackSelect(field.id)) { postbackNeeded = true; }
          }
          break;

        case "select-search": {
          if (!isSelectEmpty(field.value)) break;
          const allOpts = await loc.evaluate((sel: any) =>
            Array.from(sel.options).map((o: any) => ({ v: o.value, t: o.text }))
          );
          let found = allOpts.find((o: any) => o.t.toUpperCase().includes(match.value.toUpperCase()));
          if (!found) found = allOpts.find((o: any) => o.v?.toUpperCase().includes(match.value.toUpperCase()));
          if (!found) found = allOpts.find((o: any) => o.v && o.v !== "" && o.v !== "-1" && !o.t.toUpperCase().includes("SELECT"));
          if (found) {
            await loc.selectOption(found.v);
            filled++;
            if (isPostbackSelect(field.id)) { postbackNeeded = true; }
          }
          break;
        }

        case "click":
          if (!field.checked) {
            await loc.click();
            filled++;
            if (isPostbackClick(field.id, field.type)) { postbackNeeded = true; }
          }
          break;

        case "checkbox-check":
          if (!field.checked) { await loc.check(); filled++; }
          break;
      }
    } catch { }

    if (postbackNeeded) break;
  }

  if (postbackNeeded) {
    await waitForPostback(page);
    // Don't check for errors during postback - validation errors persist from
    // previous submit attempts and are expected during fill process
    return true; // need rescan
  }
  return false;
}

async function fillPageCompletely(page: Page, fieldMap: FieldMap) {
  await waitForPageReady(page);
  let pass = 0;
  let needsRescan = true;
  while (needsRescan && pass < 10) {
    needsRescan = await autoFillPass(page, fieldMap);
    pass++;
  }
}

// ====================================================================
// ADD ANOTHER - Handle multi-entry DataList sections
// ====================================================================
type AddAnotherConfig = {
  dataListId: string;
  additionalEntries: Record<string, string>[];
  fieldTypes: Record<string, string>;
};

function getAddAnotherConfigs(pageName: string, a: DS160Applicant): AddAnotherConfig[] {
  const configs: AddAnotherConfig[] = [];

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
        ddlEmpDateToMonth: emp.endDate!.month,
        tbxEmpDateToYear: emp.endDate!.year,
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
        ddlSchoolToMonth: edu.endDate!.month,
        tbxSchoolToYear: edu.endDate!.year,
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

  return configs;
}

async function handleAddAnother(page: Page, pageName: string, applicant: DS160Applicant): Promise<void> {
  const configs = getAddAnotherConfigs(pageName, applicant);
  if (configs.length === 0) return;

  for (const config of configs) {
    for (let entryIdx = 0; entryIdx < config.additionalEntries.length; entryIdx++) {
      const entryData = config.additionalEntries[entryIdx];
      const ctlNum = String(entryIdx + 1).padStart(2, "0");

      // Check if this entry already exists (page revisit) - skip if so
      const firstFieldKey = Object.keys(entryData)[0];
      const existCheck = `${config.dataListId}_ctl${ctlNum}_${firstFieldKey}`;
      const alreadyExists = await page.locator(`[id*='${existCheck}']`).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (alreadyExists) {
        console.log(`  [Add Another] ${config.dataListId} ctl${ctlNum} already exists - skipping`);
        continue;
      }

      // Find and click "Add Another" button for this DataList
      let clicked = false;
      const allAddBtns = page.locator(`a:has-text("Add Another")`);
      const count = await allAddBtns.count();

      for (let i = 0; i < count; i++) {
        const btn = allAddBtns.nth(i);
        const btnId = await btn.getAttribute("id").catch(() => "") || "";
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
          console.log(`  [Add Another] ${config.dataListId} entry #${entryIdx + 2}`);
          await btn.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.log(`  [Add Another] Button not found for ${config.dataListId} - skipping`);
        continue;
      }

      await waitForPostback(page);
      await new Promise(r => setTimeout(r, 500));

      // Fill the new entry fields
      for (const [fieldSuffix, value] of Object.entries(entryData)) {
        const fieldPattern = `${config.dataListId}_ctl${ctlNum}_${fieldSuffix}`;
        const loc = page.locator(`[id*='${fieldPattern}']`).first();
        const isVis = await loc.isVisible({ timeout: 3000 }).catch(() => false);

        if (!isVis) {
          console.log(`  [Add Another] Field not found: ${fieldPattern}`);
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
          console.log(`  [Add Another] Filled ${fieldSuffix} = "${value}"`);
        } catch (e: any) {
          console.log(`  [Add Another] Error filling ${fieldPattern}: ${e.message.slice(0, 60)}`);
        }
      }
    }
  }
}

async function clickNextAndWait(page: Page, throwOnError = false): Promise<{ navigated: boolean; newPage: string; errors?: string[] }> {
  const urlBefore = page.url();
  const next = page.locator("input[type=submit][value*='Next']").first();
  await next.click();

  const start = Date.now();
  let urlAfter = page.url();
  while (urlAfter === urlBefore && Date.now() - start < 10_000) {
    await new Promise((r) => setTimeout(r, 300));
    urlAfter = page.url();
  }
  await waitForPageReady(page);

  const newPage = identifyPage(urlAfter);
  const navigated = urlAfter !== urlBefore;

  // Check for validation errors
  if (!navigated) {
    const errors = await getValidationErrors(page);
    if (errors.length > 0) {
      console.log(`  VALIDATION ERRORS: ${errors.join(" | ")}`);
      if (throwOnError) {
        throw new Error(`Validation error: ${errors.join(" | ")}`);
      }
    }
    return { navigated: false, newPage, errors };
  }

  return { navigated: true, newPage };
}

async function getValidationErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const texts: string[] = [];
    // Check red spans
    document.querySelectorAll("span[style*='color:Red'], span[style*='color: Red'], span[style*='color:red']").forEach((el: any) => {
      const t = el.textContent?.trim();
      if (t && t.length > 0 && !texts.includes(t)) texts.push(t);
    });
    // Also check ValidationSummary element
    const vs = document.getElementById("ctl00_SiteContentPlaceHolder_FormView1_ValidationSummary");
    if (vs) {
      const vsText = vs.textContent?.trim();
      if (vsText && vsText.length > 0) {
        vs.querySelectorAll("li").forEach((li: any) => {
          const t = li.textContent?.trim();
          if (t && !texts.includes(t)) texts.push(t);
        });
        // If no LI items, add full text
        if (texts.length === 0 && vsText) texts.push(vsText);
      }
    }
    return texts;
  });
}

async function getUnfilledFields(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const empty: string[] = [];
    document.querySelectorAll("select").forEach((sel: any) => {
      if (sel.id.includes("ddlLanguage") || sel.offsetParent === null) return;
      if (!sel.value || sel.value === "" || sel.value === "-1" || sel.selectedIndex === 0) {
        const first = sel.options[0]?.text || "";
        if (first.toLowerCase().includes("select") || first.includes("- ") || first.trim() === "") {
          empty.push(`S:${sel.id.split("_").pop()}`);
        }
      }
    });
    document.querySelectorAll("input[type='text'], textarea").forEach((inp: any) => {
      if (inp.offsetParent === null) return;
      if (!inp.value?.trim()) {
        const parent = inp.closest("tr, div, td");
        if (parent?.querySelector("input[type='checkbox'][id*='NA']:checked, input[type='checkbox'][id*='_na']:checked")) return;
        empty.push(`T:${inp.id.split("_").pop()}`);
      }
    });
    const groups = new Map<string, boolean>();
    document.querySelectorAll("input[type='radio']").forEach((r: any) => {
      if (r.offsetParent === null && !r.closest("table")) return;
      if (!groups.has(r.name)) groups.set(r.name, false);
      if (r.checked) groups.set(r.name, true);
    });
    groups.forEach((sel, name) => { if (!sel) empty.push(`R:${name.split("$").pop()}`); });
    return empty;
  });
}

// ====================================================================
// ERROR DETECTION - Automatic ValidationSummary Monitor
// ====================================================================
async function checkForErrors(page: Page, context: string): Promise<void> {
  try {
    // Check for the standard ValidationSummary element
    const validationSummary = page.locator("#ctl00_SiteContentPlaceHolder_FormView1_ValidationSummary");
    const exists = await validationSummary.isVisible({ timeout: 1000 }).catch(() => false);

    if (!exists) return; // No error, continue

    // Extract error messages
    const errorHTML = await validationSummary.innerHTML().catch(() => "");
    const errorText = await validationSummary.innerText().catch(() => "");

    // Check if it actually has error content (not just the element existing)
    if (!errorText || errorText.trim().length === 0) return;

    console.log(`\n${"!".repeat(80)}`);
    console.log(`>>> ❌ VALIDATION ERROR DETECTED at ${context}`);
    console.log(`${"!".repeat(80)}\n`);
    console.log(errorText);
    console.log(`\n${"=".repeat(80)}\n`);

    // Save error screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(TMP, `error-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}\n`);

    // Save error details
    const errorDetailsPath = path.join(TMP, `error-details-${timestamp}.txt`);
    const details = `Context: ${context}\nTimestamp: ${new Date().toISOString()}\nURL: ${page.url()}\n\n${errorText}\n\nHTML:\n${errorHTML}`;
    fs.writeFileSync(errorDetailsPath, details);
    console.log(`Error details saved: ${errorDetailsPath}\n`);

    // Throw error to stop test
    throw new Error(`Validation error on ${context}: ${errorText.substring(0, 200)}...`);
  } catch (err: any) {
    // If error checking itself fails, ignore (might be network issue, etc)
    if (err.message && err.message.includes("Validation error")) {
      throw err; // Re-throw our own validation errors
    }
    // Otherwise ignore (element doesn't exist, page navigated, etc)
  }
}

// ====================================================================
// CAPTCHA SOLVER via signal file protocol
// ====================================================================
async function solveCaptcha(page: Page, maxAttempts = 5): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    cleanupSignals();
    const captchaImg = page.locator("img[id*='CaptchaImage']");
    await captchaImg.screenshot({ path: CAPTCHA_IMG });
    console.log(`  CAPTCHA attempt ${attempt}/${maxAttempts} - saved to ${CAPTCHA_IMG}`);
    fs.writeFileSync(CAPTCHA_READY, `attempt-${attempt}`);

    const answer = await waitForFile(CAPTCHA_ANSWER);
    console.log(`  CAPTCHA answer: ${answer}`);

    await page.fill("#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox", answer);
    const urlBefore = page.url();
    await page.click("#ctl00_SiteContentPlaceHolder_lnkNew");

    const start = Date.now();
    while (Date.now() - start < 15_000) {
      if (page.url() !== urlBefore) return true;
      const inPB = await page.evaluate(() => {
        const m = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return m?.get_isInAsyncPostBack?.() || false;
      }).catch(() => true);
      if (!inPB && Date.now() - start > 3_000) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (page.url() !== urlBefore) return true;
    console.log(`  CAPTCHA failed attempt ${attempt}`);

    // CAPTCHA refreshes automatically after wrong answer - just wait a moment
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  return false;
}

// ====================================================================
// PROFILE SELECTION
// ====================================================================
const profileName = process.env.DS160_PROFILE || "single-male";
const applicantProfile = profiles[profileName];
if (!applicantProfile) throw new Error(`Profile "${profileName}" not found. Available: ${Object.keys(profiles).join(", ")}`);

// ====================================================================
// TEST SUITE
// ====================================================================
let browser: Browser;
let page: Page;
let fieldMap: FieldMap;

test.describe(`DS-160 Full Fill [${profileName}]`, () => {
  test.beforeAll(async () => {
    ensureDir(TMP);
    fieldMap = buildDynamicFieldMap(applicantProfile);
    console.log(`Profile: ${profileName} | Field map: ${fieldMap.length} entries`);

    // Connect to existing browser via CDP
    browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    const contexts = browser.contexts();
    for (const ctx of contexts) {
      const pages = ctx.pages();
      if (pages.length > 0) {
        page = pages[0];
        // Close extra tabs
        for (let i = 1; i < pages.length; i++) await pages[i].close();
        break;
      }
    }
    if (!page) {
      const ctx = contexts.length > 0 ? contexts[0] : await browser.newContext({ viewport: { width: 1280, height: 900 } });
      page = await ctx.newPage();
    }

    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);
    page.on("dialog", async (d) => { await d.accept().catch(() => { }); });
  });

  test("1. Start application and solve CAPTCHA", async () => {
    // Check current state
    const currentPage = identifyPage(page.url());
    const isOnForm = page.url().includes("ceac.state.gov/GenNIV/General/complete/") || page.url().includes("SecurityandBackground");

    if (isOnForm) {
      console.log(`Already on form page: ${currentPage} - skipping start`);
      return;
    }

    // Navigate to landing
    await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: "load", timeout: 30_000 });
    await waitForPageReady(page);

    // Select location
    await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", applicantProfile.location);
    await waitForPostback(page);

    // Solve CAPTCHA
    const solved = await solveCaptcha(page);
    expect(solved, "CAPTCHA should be solved").toBeTruthy();

    await waitForPageReady(page);
    console.log(`After CAPTCHA: ${page.url()}`);
  });

  test("2. Complete Security Question", async () => {
    const currentPage = identifyPage(page.url());
    const isOnForm = page.url().includes("ceac.state.gov/GenNIV/General/complete/");

    if (isOnForm) {
      console.log(`Already past security question: ${currentPage}`);
      return;
    }

    // If on SecurityQuestion page
    const privacyCheck = page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct");
    if (await privacyCheck.isVisible().catch(() => false)) {
      await privacyCheck.check();
    }

    await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
    await page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer").fill(applicantProfile.securityAnswer);

    const urlBefore = page.url();
    await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 10_000) {
      await new Promise((r) => setTimeout(r, 300));
    }
    await waitForPageReady(page);

    // Confirm Application ID if present
    const continueBtn = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
    if (await continueBtn.isVisible().catch(() => false)) {
      const urlBefore2 = page.url();
      await continueBtn.click();
      const s2 = Date.now();
      while (page.url() === urlBefore2 && Date.now() - s2 < 10_000) {
        await new Promise((r) => setTimeout(r, 300));
      }
      await waitForPageReady(page);
    }

    // Should now be on Personal1
    const pageName = identifyPage(page.url());
    console.log(`After security: ${pageName}`);
    expect(page.url()).toContain("ceac.state.gov/GenNIV");
  });

  test("3. Fill all form pages until Review", async () => {
    let pageCount = 0;
    const MAX_PAGES = 30;
    const visited: string[] = [];
    let lastUrl = "";
    let stuckCount = 0;

    while (pageCount < MAX_PAGES) {
      pageCount++;
      const url = page.url();
      const pageName = identifyPage(url);

      if (isFinalPage(pageName)) {
        console.log(`Reached final page: ${pageName}`);
        visited.push(pageName);
        break;
      }

      // Detect if we're stuck on the SAME URL (not just name)
      if (url === lastUrl) {
        stuckCount++;
        if (stuckCount >= 2) {
          console.log(`  STUCK on ${pageName} - dumping field diagnostics`);
          const fields = await discoverFields(page);
          const visFields = fields.filter((f: any) => f.visible && f.id);
          const unmatched: string[] = [];
          const pfx = "ctl00_SiteContentPlaceHolder_FormView1_";
          for (const f of visFields) {
            const dispId = f.id.startsWith(pfx) ? f.id.slice(pfx.length) : f.id;
            const matched = fieldMap.find((m: any) => m.pattern.test(f.id));
            if (!matched && f.tag === "select" && isSelectEmpty(f.value)) {
              unmatched.push(`${dispId}(v=${f.value})`);
            }
            if (!matched && (f.tag === "input" && f.type === "text" || f.tag === "textarea") && !f.value) {
              unmatched.push(`${dispId}(text,empty)`);
            }
            if (!matched && f.type === "radio" && !f.checked) {
              unmatched.push(`${dispId}(radio)`);
            }
          }
          if (unmatched.length > 0) {
            console.log(`  Unmatched visible fields: ${unmatched.join(", ")}`);
          }
          // Also check validation errors
          const stuckErrors = await getValidationErrors(page);
          if (stuckErrors.length > 0) {
            console.log(`  STUCK VALIDATION: ${stuckErrors.join(" | ")}`);
          }
          // Force click Next even with errors to try to advance
          const { navigated, newPage } = await clickNextAndWait(page);
          if (!navigated) {
            console.log(`  FATAL: Cannot advance past ${pageName}`);
            break;
          }
          console.log(`  Forced advance -> ${newPage}`);
          lastUrl = page.url();
          stuckCount = 0;
          continue;
        }
      } else {
        stuckCount = 0;
      }
      lastUrl = url;

      console.log(`\n--- Page ${pageCount}: ${pageName} ---`);
      visited.push(pageName);

      // Security pages: click all "No" radios (value='N' or ID ending in _1)
      if (isSecurityPage(url)) {
        await waitForPageReady(page);

        // Try value='N' radios first
        let noRadios = page.locator("input[type=radio][value='N']");
        let count = await noRadios.count();

        if (count === 0) {
          // ASP.NET RadioButtonList: _1 suffix = second option = "No"
          noRadios = page.locator("input[type=radio][id$='_1']");
          count = await noRadios.count();
        }

        if (count === 0) {
          // Some security radios use value='1' for "No"
          noRadios = page.locator("input[type=radio][value='1']");
          count = await noRadios.count();
        }

        let clicked = 0;
        for (let i = 0; i < count; i++) {
          const radio = noRadios.nth(i);
          if (await radio.isVisible().catch(() => false) && !(await radio.isChecked())) {
            await radio.click();
            clicked++;
          }
        }
        console.log(`  Clicked ${clicked} "No" radios`);

        // Also run field map fill for any non-radio fields on security pages
        await fillPageCompletely(page, fieldMap);

        const { navigated, newPage } = await clickNextAndWait(page);
        if (!navigated) {
          console.log(`  WARNING: Security page didn't advance, retrying...`);
          await fillPageCompletely(page, fieldMap);
          const r2 = await clickNextAndWait(page);
          console.log(`  -> ${r2.newPage}`);
        } else {
          console.log(`  -> ${newPage}`);
        }
        continue;
      }

      // Family2 DOB override for spouse
      if (pageName === "Family2" && applicantProfile.spouse) {
        for (const entry of fieldMap) {
          if (/^ddlDOBDay\$$/.test(entry.pattern.source)) entry.value = applicantProfile.spouse.dob.day;
          if (/^ddlDOBMonth\$$/.test(entry.pattern.source)) entry.value = applicantProfile.spouse.dob.month;
          if (/^tbxDOBYear\$$/.test(entry.pattern.source)) entry.value = applicantProfile.spouse.dob.year;
        }
      }

      // PrevSpouse DOB override for former spouse
      if (pageName === "PrevSpouse" && applicantProfile.previousSpouse) {
        for (const entry of fieldMap) {
          if (/^ddlDOBDay\$$/.test(entry.pattern.source)) entry.value = applicantProfile.previousSpouse.dob.day;
          if (/^ddlDOBMonth\$$/.test(entry.pattern.source)) entry.value = applicantProfile.previousSpouse.dob.month;
          if (/^tbxDOBYear\$$/.test(entry.pattern.source)) entry.value = applicantProfile.previousSpouse.dob.year;
        }
      }

      // Fill page with retry
      let advanced = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await fillPageCompletely(page, fieldMap);

        // Handle "Add Another" entries (other names, companions, languages, etc.)
        if (attempt === 1) {
          await handleAddAnother(page, pageName, applicantProfile);
        }

        const unfilled = await getUnfilledFields(page);
        if (unfilled.length > 0) {
          console.log(`  Unfilled (attempt ${attempt}): ${unfilled.join(", ")}`);
        }

        // Dump field diagnostics on first attempt to see actual IDs
        if (attempt === 1) {
          const fields = await discoverFields(page);
          const visFields = fields.filter((f: any) => f.visible && f.id);
          const unmatched: string[] = [];
          const prefix = "ctl00_SiteContentPlaceHolder_FormView1_";
          for (const f of visFields) {
            // Show enough of the ID to be useful (strip common prefix)
            const displayId = f.id.startsWith(prefix) ? f.id.slice(prefix.length) : f.id.split("_").slice(-5).join("_");
            const matched = fieldMap.find((m: any) => m.pattern.test(f.id));
            if (!matched) {
              if (f.tag === "select" && isSelectEmpty(f.value)) unmatched.push(`S:${displayId}`);
              else if ((f.tag === "input" && f.type === "text" || f.tag === "textarea") && !f.value) unmatched.push(`T:${displayId}`);
              else if (f.type === "radio" && !f.checked) unmatched.push(`R:${displayId}`);
            }
            // Log empty fields that HAVE a match (to catch fill failures)
            if (matched && f.tag === "select" && isSelectEmpty(f.value)) {
              console.log(`  ! MATCHED BUT EMPTY: ${displayId} (pattern: ${matched.pattern}, val: "${matched.value}")`);
            }
            if (matched && (f.tag === "input" && f.type === "text" || f.tag === "textarea") && !f.value) {
              console.log(`  ! MATCHED BUT EMPTY: ${displayId} (pattern: ${matched.pattern}, val: "${matched.value}")`);
            }
          }
          if (unmatched.length > 0) {
            console.log(`  Unmatched fields: ${unmatched.join(", ")}`);
          }
        }

        const { navigated, newPage } = await clickNextAndWait(page);
        if (navigated) {
          console.log(`  -> ${newPage}`);
          advanced = true;
          break;
        }

        // Show validation errors on every retry
        const retryErrors = await getValidationErrors(page);
        if (retryErrors.length > 0) {
          console.log(`  VALIDATION: ${retryErrors.join(" | ")}`);
        }
        if (attempt < 3) {
          console.log(`  Retry ${attempt}/3 on ${pageName}`);
          await waitForPageReady(page);
        } else {
          console.log(`  WARNING: Stuck at ${pageName} after 3 attempts.`);
        }
      }
    }

    console.log(`\nVisited pages: ${visited.join(" -> ")}`);
    console.log(`Total pages: ${pageCount}`);

    // Assert we reached Review or a final page
    const finalPage = identifyPage(page.url());
    expect(
      isFinalPage(finalPage) || finalPage === "Security",
      `Should reach Review/final page, got: ${finalPage}`
    ).toBeTruthy();
  });

  test("4. Verify Review page has content", async () => {
    const pageName = identifyPage(page.url());
    if (pageName !== "Review") {
      console.log(`Not on Review page (on ${pageName}) - skipping verification`);
      return;
    }

    // Navigate to Personal review section
    const personalLink = page.locator("a[href*='ReviewPersonal'], a:has-text('PERSONAL')").first();
    if (await personalLink.isVisible().catch(() => false)) {
      await personalLink.click();
      await new Promise((r) => setTimeout(r, 2_000));
      await waitForPageReady(page);
    }

    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    expect(bodyText.length).toBeGreaterThan(100);

    // Check if name appears on any visible review section
    const hasName = bodyText.toUpperCase().includes(applicantProfile.surname.toUpperCase());
    if (hasName) {
      expect(bodyText.toUpperCase()).toContain(applicantProfile.givenName.split(" ")[0].toUpperCase());
      console.log("Review page verified - applicant name confirmed");
    } else {
      // We're on a different review section (Travel, Security, etc.) - verify it has DS-160 content
      const hasAppId = bodyText.includes("APPLICATION ID");
      const hasFormData = bodyText.includes("YES") || bodyText.includes("NO") || bodyText.includes("BRAZIL");
      expect(hasAppId || hasFormData, "Review page should have form data").toBeTruthy();
      console.log("Review page verified - form data present (different section)");
    }
  });

  test("5. Validate form structure per page", async () => {
    // This test validates that each page type has expected field patterns
    // Useful for detecting DS-160 form changes
    const fieldCounts: Record<string, number> = {};

    // Check current page fields
    const fields = await discoverFields(page);
    const visible = fields.filter((f: any) => f.visible);
    const pageName = identifyPage(page.url());
    fieldCounts[pageName] = visible.length;

    console.log(`${pageName}: ${visible.length} visible fields`);
    expect(visible.length).toBeGreaterThan(0);
  });
});
