/**
 * Branch Explorer v4 - Fills the form page-by-page, exploring all branches on each page.
 * Uses the same CAPTCHA protocol as fill-form.ts.
 * Run: npx tsx scripts/explore-branches.ts
 * Output: tmp/branch-report.json
 */
import { chromium, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } from "./build-field-map";

const PREFIX = "ctl00_SiteContentPlaceHolder_FormView1_";
const TMP = path.join(__dirname, "..", "tmp");
const CAPTCHA_IMG = path.join(TMP, "captcha.png");
const CAPTCHA_READY = path.join(TMP, "captcha-ready.txt");
const CAPTCHA_ANSWER = path.join(TMP, "captcha-answer.txt");

interface FieldInfo {
  short: string;
  tag: string;
  type: string;
  value: string;
  optCount: number;
  opts: string;
}

interface BranchResult {
  page: string;
  branch: string;
  added: FieldInfo[];
  removed: string[];
}

const allBranches: BranchResult[] = [];

async function waitPB(page: Page) {
  await page.evaluate(() => new Promise<void>((r) => {
    const c = () => { const m = (window as any).Sys?.WebForms?.PageRequestManager?.getInstance?.(); if (!m || !m.get_isInAsyncPostBack()) r(); else setTimeout(c, 150); }; c();
  })).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
}

async function getFields(page: Page): Promise<Map<string, FieldInfo>> {
  return page.evaluate(() => {
    const res: any = {};
    document.querySelectorAll("select, input, textarea").forEach((el: any) => {
      if (el.type === "hidden" || !el.id) return;
      const vis = el.offsetParent !== null || el.type === "radio" || el.type === "checkbox";
      if (!vis) return;
      const short = el.id.replace(/ctl00_SiteContentPlaceHolder_FormView1_/g, "");
      const opts = el.tagName === "SELECT"
        ? Array.from(el.options).slice(0, 10).map((o: any) => `${o.value}="${o.text.substring(0, 40)}"`).join(", ")
        : "";
      res[el.id] = { short, tag: el.tagName.toLowerCase(), type: el.type, value: el.value, optCount: el.options?.length || 0, opts };
    });
    return res;
  }).then((r: any) => new Map(Object.entries(r)));
}

async function explore(page: Page, pageName: string, desc: string, fn: () => Promise<void>): Promise<BranchResult> {
  console.log(`\n  --- ${desc} ---`);
  const before = await getFields(page);
  await fn();
  await waitPB(page);
  const after = await getFields(page);
  const added: FieldInfo[] = [];
  const removed: string[] = [];
  for (const [id, f] of after) if (!before.has(id)) added.push(f);
  for (const [id] of before) if (!after.has(id)) removed.push(before.get(id)?.short || id.replace(/.*FormView1_/, ""));
  if (added.length) {
    console.log(`    +${added.length} NEW:`);
    for (const f of added) {
      const extra = f.opts ? ` opts(${f.optCount})=[${f.opts}]` : "";
      console.log(`      ${f.short} [${f.tag}/${f.type}]${extra}`);
    }
  }
  if (removed.length) {
    console.log(`    -${removed.length} REMOVED: ${removed.join(", ")}`);
  }
  if (!added.length && !removed.length) console.log("    (no changes)");
  const result = { page: pageName, branch: desc, added, removed };
  allBranches.push(result);
  return result;
}

async function clickRadio(page: Page, id: string): Promise<boolean> {
  const el = page.locator(`#${PREFIX}${id}`);
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
    await el.click();
    return true;
  }
  return false;
}

async function selectOpt(page: Page, id: string, val: string): Promise<boolean> {
  const el = page.locator(`#${PREFIX}${id}`);
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
    await el.selectOption(val).catch(() => {});
    return true;
  }
  return false;
}

async function clickNext(page: Page): Promise<boolean> {
  const nextBtn = page.locator("input[type=submit][value*='Next']").first();
  if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const urlBefore = page.url();
    await nextBtn.click();
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 15_000) {
      await new Promise((r) => setTimeout(r, 300));
    }
    await waitPB(page);
    return page.url() !== urlBefore;
  }
  return false;
}

function identifyPage(url: string): string {
  const p = url.split("/").pop()?.split("?")[0]?.toLowerCase() || "";
  if (p.includes("default")) return "Landing";
  if (p.includes("personal") && p.includes("cont")) return "Personal2";
  if (p.includes("personal") && !p.includes("cont")) return "Personal1";
  if (p.includes("travelcompanions")) return "TravelCompanions";
  if (p.includes("previousustravel")) return "PreviousUSTravel";
  if (p.includes("travel")) return "Travel";
  if (p.includes("contact")) return "AddressPhone";
  if (p.includes("passport")) return "Passport";
  if (p.includes("uscontact")) return "USContact";
  if (p.includes("family2")) return "Family2";
  if (p.includes("family1") || p.includes("family.")) return "Family1";
  if (p.includes("workeducation1")) return "WorkEducation1";
  if (p.includes("workeducation2")) return "WorkEducation2";
  if (p.includes("workeducation3")) return "WorkEducation3";
  if (p.includes("security")) return "Security";
  if (p.includes("review")) return "Review";
  return "Unknown";
}

// =============================================
// Page-specific exploration functions
// =============================================

async function explorePersonal1(page: Page) {
  console.log("\n>>> PERSONAL 1 - Exploring branches...");

  await explore(page, "Personal1", "OtherNames = YES", async () => {
    await clickRadio(page, "rblOtherNames_0");
  });
  await clickRadio(page, "rblOtherNames_1");
  await waitPB(page);

  await explore(page, "Personal1", "TelecodeQuestion = YES", async () => {
    await clickRadio(page, "rblTelecodeQuestion_0");
  });
  await clickRadio(page, "rblTelecodeQuestion_1");
  await waitPB(page);

  await explore(page, "Personal1", "PermanentResidentInd = YES", async () => {
    await clickRadio(page, "rblPermanentResidentInd_0");
  });
  await clickRadio(page, "rblPermanentResidentInd_1");
  await waitPB(page);
}

async function explorePersonal2(page: Page) {
  console.log("\n>>> PERSONAL 2 - Exploring branches...");

  await explore(page, "Personal2", "OtherNatInd = YES", async () => {
    await clickRadio(page, "rblAPP_OTH_NATL_IND_0");
  });
  await clickRadio(page, "rblAPP_OTH_NATL_IND_1");
  await waitPB(page);

  await explore(page, "Personal2", "PermResOtherInd = YES", async () => {
    await clickRadio(page, "rblPermResOtherCntryInd_0");
  });
  await clickRadio(page, "rblPermResOtherCntryInd_1");
  await waitPB(page);

  await explore(page, "Personal2", "NationalIdInd = Does Not Apply", async () => {
    await clickRadio(page, "cbexAPP_NATIONAL_ID_NA");
  });
  // Uncheck
  await clickRadio(page, "cbexAPP_NATIONAL_ID_NA");
  await waitPB(page);

  await explore(page, "Personal2", "SSN = YES (has SSN)", async () => {
    // SSN fields are always visible, but check SSN_NA checkbox
    const ssn1 = page.locator(`#${PREFIX}tbxAPP_SSN1`);
    if (await ssn1.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ssn1.fill("123");
    }
  });
  // Clear
  const ssn1 = page.locator(`#${PREFIX}tbxAPP_SSN1`);
  if (await ssn1.isVisible({ timeout: 1000 }).catch(() => false)) {
    await ssn1.fill("");
  }
}

async function exploreTravel(page: Page) {
  console.log("\n>>> TRAVEL - Exploring branches...");

  // Who Is Paying variations
  for (const payer of [
    { v: "P", l: "Present Employer" },
    { v: "U", l: "US Petitioner" },
    { v: "C", l: "Other Company/Org" },
    { v: "O", l: "Other Person" },
  ]) {
    await explore(page, "Travel", `WhoIsPaying = ${payer.v} (${payer.l})`, async () => {
      await selectOpt(page, "ddlWhoIsPaying", payer.v);
    });
  }
  // Reset to Self
  await selectOpt(page, "ddlWhoIsPaying", "S");
  await waitPB(page);

  // Specific travel plans
  await explore(page, "Travel", "SpecificTravel = YES", async () => {
    await clickRadio(page, "rblSpecificTravel_0");
  });
  await clickRadio(page, "rblSpecificTravel_1");
  await waitPB(page);
}

async function exploreTravelCompanions(page: Page) {
  console.log("\n>>> TRAVEL COMPANIONS - Exploring branches...");

  await explore(page, "TravelCompanions", "IsGroupTravel = YES", async () => {
    await clickRadio(page, "rblIsGroupTravel_0");
  });
  await clickRadio(page, "rblIsGroupTravel_1");
  await waitPB(page);

  await explore(page, "TravelCompanions", "OtherPersonsTraveling = YES", async () => {
    await clickRadio(page, "rblOtherPersonsTravelingInd_0");
  });
  await clickRadio(page, "rblOtherPersonsTravelingInd_1");
  await waitPB(page);
}

async function explorePreviousUSTravel(page: Page) {
  console.log("\n>>> PREVIOUS US TRAVEL - Exploring branches...");

  await explore(page, "PreviousUSTravel", "PreviouslyInUS = YES", async () => {
    await clickRadio(page, "rblPreviouslyInUS_0");
  });
  await clickRadio(page, "rblPreviouslyInUS_1");
  await waitPB(page);

  await explore(page, "PreviousUSTravel", "USDriverLicense = YES", async () => {
    await clickRadio(page, "rblUSDriverLicense_0");
  });
  await clickRadio(page, "rblUSDriverLicense_1");
  await waitPB(page);

  await explore(page, "PreviousUSTravel", "PreviousVisa = YES", async () => {
    await clickRadio(page, "rblPreviousVisa_0");
  });
  await clickRadio(page, "rblPreviousVisa_1");
  await waitPB(page);

  // When PreviousVisa=YES, check sub-options
  await clickRadio(page, "rblPreviousVisa_0");
  await waitPB(page);
  await explore(page, "PreviousUSTravel", "SameTypeVisa = YES (when PreviousVisa=YES)", async () => {
    await clickRadio(page, "rblSameTypeVisa_0");
  });
  await explore(page, "PreviousUSTravel", "SameTypeVisa = NO (when PreviousVisa=YES)", async () => {
    await clickRadio(page, "rblSameTypeVisa_1");
  });
  await explore(page, "PreviousUSTravel", "TenPrinted = YES (when PreviousVisa=YES)", async () => {
    await clickRadio(page, "rblTenPrinted_0");
  });
  await explore(page, "PreviousUSTravel", "VisaLost = YES (when PreviousVisa=YES)", async () => {
    await clickRadio(page, "rblVisaLost_0");
  });
  await clickRadio(page, "rblVisaLost_1");
  await waitPB(page);
  await explore(page, "PreviousUSTravel", "VisaCancelled = YES (when PreviousVisa=YES)", async () => {
    await clickRadio(page, "rblVisaCancelled_0");
  });
  await clickRadio(page, "rblVisaCancelled_1");
  await waitPB(page);
  // Reset PreviousVisa to NO
  await clickRadio(page, "rblPreviousVisa_1");
  await waitPB(page);

  await explore(page, "PreviousUSTravel", "VisaRefused = YES", async () => {
    await clickRadio(page, "rblVisaRefused_0");
  });
  await clickRadio(page, "rblVisaRefused_1");
  await waitPB(page);

  await explore(page, "PreviousUSTravel", "PetitionFiled = YES", async () => {
    await clickRadio(page, "rblPetitionFiled_0");
  });
  await clickRadio(page, "rblPetitionFiled_1");
  await waitPB(page);
}

async function exploreAddress(page: Page) {
  console.log("\n>>> ADDRESS/PHONE - Exploring branches...");

  await explore(page, "AddressPhone", "MailingAddrSame = NO", async () => {
    const c1 = await clickRadio(page, "rblMailingAddrSame_1");
    if (!c1) await clickRadio(page, "rblMailingAddr_1");
  });
  const c0 = await clickRadio(page, "rblMailingAddrSame_0");
  if (!c0) await clickRadio(page, "rblMailingAddr_0");
  await waitPB(page);

  await explore(page, "AddressPhone", "AddPhone = YES", async () => {
    await clickRadio(page, "rblAddPhone_0");
  });
  await clickRadio(page, "rblAddPhone_1");
  await waitPB(page);

  await explore(page, "AddressPhone", "AddEmail = YES", async () => {
    await clickRadio(page, "rblAddEmail_0");
  });
  await clickRadio(page, "rblAddEmail_1");
  await waitPB(page);

  // Social media additional
  await explore(page, "AddressPhone", "AddSocialMedia = YES", async () => {
    await clickRadio(page, "rblAddSocial_0");
  });
  await clickRadio(page, "rblAddSocial_1");
  await waitPB(page);
}

async function explorePassport(page: Page) {
  console.log("\n>>> PASSPORT - Exploring branches...");

  for (const pt of [
    { v: "O", l: "Official" }, { v: "D", l: "Diplomatic" },
    { v: "T", l: "Other/Travel Doc" }, { v: "L", l: "Laissez-Passer" },
  ]) {
    await explore(page, "Passport", `PPT_TYPE = ${pt.v} (${pt.l})`, async () => {
      await selectOpt(page, "ddlPPT_TYPE", pt.v);
    });
  }
  await selectOpt(page, "ddlPPT_TYPE", "R");
  await waitPB(page);

  await explore(page, "Passport", "LostPassport = YES", async () => {
    await clickRadio(page, "rblLOST_PPT_IND_0");
  });
  await clickRadio(page, "rblLOST_PPT_IND_1");
  await waitPB(page);
}

async function exploreUSContact(page: Page) {
  console.log("\n>>> US CONTACT - Exploring branches...");

  // Relationship to applicant variations
  for (const rel of ["R", "S", "C", "F", "O"]) {
    await explore(page, "USContact", `US_POC_REL = ${rel}`, async () => {
      await selectOpt(page, "ddlUS_POC_REL_TO_APP", rel);
    });
  }
}

async function exploreFamily1(page: Page) {
  console.log("\n>>> FAMILY 1 - Exploring branches...");

  // Marital status variations
  for (const ms of [
    { v: "M", l: "Married" }, { v: "C", l: "Common Law" },
    { v: "P", l: "Civil Union/Domestic Partner" },
    { v: "W", l: "Widowed" }, { v: "D", l: "Divorced" },
    { v: "S", l: "Separated" },
  ]) {
    await explore(page, "Family1", `MaritalStatus = ${ms.v} (${ms.l})`, async () => {
      await selectOpt(page, "ddlMaritalStatus", ms.v);
    });
  }
  // Reset to never married
  await selectOpt(page, "ddlMaritalStatus", "N");
  await waitPB(page);

  // Father in US?
  await explore(page, "Family1", "FatherLiveInUS = YES", async () => {
    await clickRadio(page, "rblFATHER_LIVE_IN_US_IND_0");
  });
  await clickRadio(page, "rblFATHER_LIVE_IN_US_IND_1");
  await waitPB(page);

  // Mother in US?
  await explore(page, "Family1", "MotherLiveInUS = YES", async () => {
    await clickRadio(page, "rblMOTHER_LIVE_IN_US_IND_0");
  });
  await clickRadio(page, "rblMOTHER_LIVE_IN_US_IND_1");
  await waitPB(page);

  // Immediate relative in US?
  await explore(page, "Family1", "USImmediateRelative = YES", async () => {
    await clickRadio(page, "rblUS_IMMED_RELATIVE_IND_0");
  });
  await clickRadio(page, "rblUS_IMMED_RELATIVE_IND_1");
  await waitPB(page);

  // Other relative in US? (may appear after USImmediateRelative=NO)
  await explore(page, "Family1", "USOtherRelative = YES", async () => {
    await clickRadio(page, "rblUS_OTHER_RELATIVE_IND_0");
  });
  await clickRadio(page, "rblUS_OTHER_RELATIVE_IND_1");
  await waitPB(page);
}

async function exploreWork1(page: Page) {
  console.log("\n>>> WORK/EDUCATION 1 - Exploring branches...");

  for (const occ of [
    { v: "ST", l: "Student" }, { v: "RT", l: "Retired" },
    { v: "N", l: "Not Employed" }, { v: "H", l: "Homemaker" },
    { v: "MC", l: "Military" }, { v: "A", l: "Agriculture" },
    { v: "AC", l: "Artist/Performer" }, { v: "BZ", l: "Business" },
    { v: "CS", l: "Computer Science" }, { v: "CL", l: "Culinary/Food" },
    { v: "ED", l: "Education" }, { v: "EN", l: "Engineering" },
    { v: "GV", l: "Government" }, { v: "HS", l: "Homemaker/House" },
    { v: "LW", l: "Legal" }, { v: "MD", l: "Medical/Health" },
    { v: "RL", l: "Religious" }, { v: "SC", l: "Sciences" },
  ]) {
    await explore(page, "WorkEducation1", `Occupation = ${occ.v} (${occ.l})`, async () => {
      await selectOpt(page, "ddlPresentOccupation", occ.v);
    });
  }
  // Reset to EN
  await selectOpt(page, "ddlPresentOccupation", "EN");
  await waitPB(page);
}

async function exploreWork2(page: Page) {
  console.log("\n>>> WORK/EDUCATION 2 - Exploring branches...");

  await explore(page, "WorkEducation2", "PrevEmployed = YES", async () => {
    await clickRadio(page, "rblPreviouslyEmployed_0");
  });
  await clickRadio(page, "rblPreviouslyEmployed_1");
  await waitPB(page);

  await explore(page, "WorkEducation2", "OtherEduc = YES", async () => {
    await clickRadio(page, "rblOtherEduc_0");
  });
  await clickRadio(page, "rblOtherEduc_1");
  await waitPB(page);
}

async function exploreWork3(page: Page) {
  console.log("\n>>> WORK/EDUCATION 3 - Exploring branches...");

  await explore(page, "WorkEducation3", "ClanTribe = YES", async () => {
    await clickRadio(page, "rblCLAN_TRIBE_IND_0");
  });
  await clickRadio(page, "rblCLAN_TRIBE_IND_1");
  await waitPB(page);

  await explore(page, "WorkEducation3", "CountriesVisited = YES", async () => {
    await clickRadio(page, "rblCOUNTRIES_VISITED_IND_0");
  });
  await clickRadio(page, "rblCOUNTRIES_VISITED_IND_1");
  await waitPB(page);

  await explore(page, "WorkEducation3", "OrganizationMember = YES", async () => {
    await clickRadio(page, "rblORGANIZATION_IND_0");
  });
  await clickRadio(page, "rblORGANIZATION_IND_1");
  await waitPB(page);

  await explore(page, "WorkEducation3", "SpecializedSkills = YES", async () => {
    await clickRadio(page, "rblSPECIALIZED_SKILLS_IND_0");
  });
  await clickRadio(page, "rblSPECIALIZED_SKILLS_IND_1");
  await waitPB(page);

  await explore(page, "WorkEducation3", "MilitaryService = YES", async () => {
    await clickRadio(page, "rblMILITARY_SERVICE_IND_0");
  });
  await clickRadio(page, "rblMILITARY_SERVICE_IND_1");
  await waitPB(page);

  await explore(page, "WorkEducation3", "InsurgentOrg = YES", async () => {
    await clickRadio(page, "rblINSURGENT_ORG_IND_0");
  });
  await clickRadio(page, "rblINSURGENT_ORG_IND_1");
  await waitPB(page);
}

// =============================================
// Startup: CAPTCHA + Security Question
// =============================================
function cleanupSignals() {
  [CAPTCHA_READY, CAPTCHA_ANSWER, CAPTCHA_IMG].forEach((f) => { try { fs.unlinkSync(f); } catch {} });
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

async function startApplication(page: Page, location: string, securityAnswer: string): Promise<void> {
  console.log(">>> Starting NEW application...");
  await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: "load", timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 2000));

  await page.selectOption("#ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation", location);
  await waitPB(page);
  await new Promise((r) => setTimeout(r, 1500));

  // CAPTCHA loop
  for (let attempt = 1; attempt <= 5; attempt++) {
    cleanupSignals();
    const captchaImg = page.locator("img[id*='CaptchaImage']");
    await captchaImg.screenshot({ path: CAPTCHA_IMG });
    console.log(`>>> [CAPTCHA ${attempt}/5] Saved to ${CAPTCHA_IMG}`);
    fs.writeFileSync(CAPTCHA_READY, `attempt-${attempt}`);

    console.log(">>> Waiting for CAPTCHA answer...");
    const answer = await waitForFile(CAPTCHA_ANSWER);
    console.log(`>>> CAPTCHA answer: ${answer}`);

    await page.fill("#ctl00_SiteContentPlaceHolder_ucLocation_IdentifyCaptcha1_txtCodeTextBox", answer);
    const urlBefore = page.url();
    await page.click("#ctl00_SiteContentPlaceHolder_lnkNew");

    const start = Date.now();
    while (Date.now() - start < 15_000) {
      if (page.url() !== urlBefore) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    if (page.url() !== urlBefore) {
      await new Promise((r) => setTimeout(r, 2000));
      console.log(`>>> CAPTCHA solved on attempt ${attempt}!`);
      break;
    }
    console.log(`>>> CAPTCHA failed attempt ${attempt}`);
    if (attempt === 5) throw new Error("CAPTCHA failed after 5 attempts");
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Security Question
  console.log(">>> Security Question...");
  await page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct").check();
  await page.locator("#ctl00_SiteContentPlaceHolder_ddlQuestions").selectOption({ index: 1 });
  await page.locator("#ctl00_SiteContentPlaceHolder_txtAnswer").fill(securityAnswer);

  const urlBefore = page.url();
  await page.locator("#ctl00_SiteContentPlaceHolder_btnContinue").click();
  const start = Date.now();
  while (page.url() === urlBefore && Date.now() - start < 10_000) {
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 2000));

  // Confirm Application ID if prompted
  const continueApp = page.locator("#ctl00_SiteContentPlaceHolder_btnContinueApp");
  if (await continueApp.isVisible({ timeout: 3000 }).catch(() => false)) {
    const u = page.url();
    await continueApp.click();
    const s = Date.now();
    while (page.url() === u && Date.now() - s < 10_000) await new Promise((r) => setTimeout(r, 300));
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`>>> Now on: ${page.url().split("/").pop()}`);
}

// =============================================
// Fill page using field map (simplified from fill-form.ts)
// =============================================
function isSelectEmpty(val: string | undefined | null): boolean {
  if (!val) return true;
  const v = val.trim();
  return v === "" || v === "-1" || v === "0" || v === "SONE" || v.toUpperCase().includes("SELECT") || v === "  " || v === "   ";
}

type FieldMap = ReturnType<typeof buildDynamicFieldMap>;

async function autoFillPage(page: Page, fieldMap: FieldMap): Promise<number> {
  let totalFilled = 0;

  for (let pass = 0; pass < 6; pass++) {
    const fields = await getFields(page);
    let filled = 0;
    let needPostback = false;

    for (const [id, f] of fields) {
      if (f.type === "submit" || f.type === "button" || f.short.includes("Help")) continue;

      const match = fieldMap.find((m) => m.pattern.test(id));
      if (!match) continue;

      try {
        const loc = page.locator(`#${id.replace(/\$/g, "\\$")}`);
        const isVis = await loc.isVisible({ timeout: 1000 }).catch(() => false);
        if (!isVis) continue;

        if (match.type === "select" || match.type === "select-label" || match.type === "select-search") {
          if (!isSelectEmpty(f.value)) continue;
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
          if (isPostbackSelect(id)) { needPostback = true; break; }
        } else if (match.type === "text") {
          if (f.tag === "input" || f.tag === "textarea") {
            if (!f.value || f.value.trim() === "") {
              await loc.fill(match.value).catch(() => {});
              filled++;
            }
          }
        } else if (match.type === "click") {
          if (f.type === "radio" || f.type === "checkbox") {
            const checked = await loc.isChecked().catch(() => false);
            if (!checked) {
              await loc.click().catch(() => {});
              filled++;
              if (isPostbackClick(id, f.type)) { needPostback = true; break; }
            }
          }
        } else if (match.type === "checkbox-check") {
          const checked = await loc.isChecked().catch(() => false);
          if (!checked) { await loc.check().catch(() => {}); filled++; }
        }
      } catch {}
    }

    totalFilled += filled;
    if (needPostback) {
      await waitPB(page);
      console.log(`    Fill pass ${pass + 1}: ${filled} fields, postback -> rescan`);
      continue;
    }
    console.log(`    Fill pass ${pass + 1}: ${filled} fields`);
    if (filled === 0) break;
  }
  return totalFilled;
}

// =============================================
// Main flow
// =============================================
async function main() {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

  const browser = await chromium.connectOverCDP("http://localhost:9222");
  let ctx = browser.contexts()[0];
  if (!ctx) { ctx = await browser.newContext(); }
  let page = ctx.pages()[0];
  if (!page) { page = await ctx.newPage(); }
  page.setDefaultTimeout(10_000);
  page.on("dialog", async (d) => {
    try { await d.accept(); } catch {}
  });

  // Load profile and field map
  const mod = await import("../tests/fixtures/brazilian-applicant");
  const profile = mod.profiles["single-male"];
  const applicantData = mod.applicant;
  const fieldMap = buildDynamicFieldMap(profile);

  console.log("=".repeat(70));
  console.log("DS-160 BRANCH EXPLORER v4 - Fill & Explore");
  console.log("=".repeat(70));
  console.log(`URL: ${page.url()}`);

  // Start new application if needed
  const curPage = identifyPage(page.url());
  if (curPage === "Landing" || curPage === "Unknown") {
    await startApplication(page, applicantData.location, applicantData.securityAnswer);
  }

  // Main loop: explore branches on each page, fill, advance
  let maxPages = 30;
  let lastUrl = "";
  let stuckCount = 0;

  while (maxPages-- > 0) {
    const url = page.url();
    const pageName = identifyPage(url);

    if (pageName === "Review") {
      console.log("\n>>> REACHED REVIEW PAGE - Exploration complete!");
      break;
    }

    if (url === lastUrl) {
      stuckCount++;
      if (stuckCount >= 3) {
        console.log(`>>> FATAL: Stuck on ${pageName} after 3 attempts`);
        break;
      }
    } else {
      stuckCount = 0;
    }
    lastUrl = url;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`>>> PAGE: ${pageName} (${url.split("/").pop()?.split("?")[0]})`);
    console.log(`${"=".repeat(60)}`);

    // --- EXPLORE BRANCHES ---
    try {
      switch (pageName) {
        case "Personal1": await explorePersonal1(page); break;
        case "Personal2": await explorePersonal2(page); break;
        case "Travel": await exploreTravel(page); break;
        case "TravelCompanions": await exploreTravelCompanions(page); break;
        case "PreviousUSTravel": await explorePreviousUSTravel(page); break;
        case "AddressPhone": await exploreAddress(page); break;
        case "Passport": await explorePassport(page); break;
        case "USContact": await exploreUSContact(page); break;
        case "Family1": await exploreFamily1(page); break;
        case "WorkEducation1": await exploreWork1(page); break;
        case "WorkEducation2": await exploreWork2(page); break;
        case "WorkEducation3": await exploreWork3(page); break;
        case "Security":
          console.log("  (Security - just filling No radios)");
          break;
        default:
          console.log(`  (No exploration for ${pageName})`);
      }
    } catch (e: any) {
      console.log(`  EXPLORE ERROR on ${pageName}: ${e.message?.substring(0, 100)}`);
    }

    // --- FILL THE PAGE ---
    console.log(`\n  >>> Filling ${pageName}...`);
    if (pageName === "Security" || pageName.startsWith("Security")) {
      // Security: click all "No" radios
      let noRadios = page.locator("input[type=radio][value='N']");
      let count = await noRadios.count();
      if (count === 0) {
        noRadios = page.locator("input[type=radio][id$='_1']");
        count = await noRadios.count();
      }
      if (count === 0) {
        noRadios = page.locator("input[type=radio][value='1']");
        count = await noRadios.count();
      }
      for (let i = 0; i < count; i++) {
        const r = noRadios.nth(i);
        if (!(await r.isChecked().catch(() => true))) await r.click().catch(() => {});
      }
      await waitPB(page);
      console.log(`    Clicked ${count} "No" radios`);
    } else {
      await autoFillPage(page, fieldMap);
    }

    // --- CLICK NEXT ---
    console.log(`  >>> Clicking Next...`);
    const navigated = await clickNext(page);
    if (navigated) {
      console.log(`  >>> Now on: ${identifyPage(page.url())}`);
    } else {
      console.log(`  >>> Next failed - retrying fill...`);
      await autoFillPage(page, fieldMap);
      const nav2 = await clickNext(page);
      if (nav2) {
        console.log(`  >>> Now on: ${identifyPage(page.url())}`);
      } else {
        console.log(`  >>> Still stuck on ${pageName}`);
      }
    }
  }

  // Save report
  const reportPath = path.join(TMP, "branch-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(allBranches, null, 2));
  console.log(`\n${"=".repeat(70)}`);
  console.log(`EXPLORATION COMPLETE`);
  console.log(`Total branches tested: ${allBranches.length}`);
  console.log(`Branches with NEW fields: ${allBranches.filter(b => b.added.length > 0).length}`);
  console.log(`Report: ${reportPath}`);
  console.log(`${"=".repeat(70)}`);

  // Summary of discovered fields
  console.log("\n>>> SUMMARY - NEW FIELDS PER BRANCH:");
  for (const b of allBranches) {
    if (b.added.length > 0) {
      console.log(`\n  ${b.page} > ${b.branch}:`);
      for (const f of b.added) {
        const extra = f.opts ? ` opts(${f.optCount})` : "";
        console.log(`    + ${f.short} [${f.tag}/${f.type}]${extra}`);
      }
    }
  }

  // Also show branches that had NO new fields (all changes handled by removal)
  const noChange = allBranches.filter(b => b.added.length === 0 && b.removed.length === 0);
  if (noChange.length > 0) {
    console.log(`\n>>> ${noChange.length} branches with NO field changes (already known or non-branching)`);
  }
}

main().catch(console.error);
