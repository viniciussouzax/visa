console.log("DS-160 AI: Form Filler v2 Loaded.");

// ============================================================
// AUTO-RESUME: retoma automação ao navegar entre páginas
// ============================================================
window.addEventListener('load', () => {
    setTimeout(async () => {
        const data = await chromeGet(['active_applicant', 'active_application', 'automation_enabled']);
        if (data.automation_enabled && data.active_applicant) {
            console.log("🤖 Auto-resuming...", data.active_applicant.full_name);
            new FormFiller(data.active_applicant, data.active_application).run();
        }
    }, 1500);
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "FILL_FORM") {
        console.log("🤖 FILL_FORM received.", req.applicant?.full_name);
        try {
            new FormFiller(req.applicant, req.application).run();
            sendResponse({ success: true });
        } catch (e) {
            console.error("Filling Error:", e);
            sendResponse({ success: false, error: e.message });
        }
    }
    return true;
});

// ============================================================
// HELPERS COMPACTOS
// ============================================================
function chromeGet(keys) { return new Promise(r => chrome.storage.local.get(keys, r)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ph(s) { return (s || "").replace(/[^0-9+]/g, "").replace("+", ""); }
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

// ============================================================
// POSTBACK TRIGGERS (do build-field-map.ts)
// ============================================================
const PB_SELECTS = ["CNTRY", "Country", "PurposeOfTrip", "VisaClass", "OtherPurpose",
    "Occupation", "PPT_TYPE", "REL_TO_APP", "POC_REL", "SocialMedia",
    "WhoIsPaying", "PayerRelationship", "SpouseNatDropDownList", "SpouseAddressType", "SpousePOBCountry"];
const PB_CLICK_YES = ["SpecificTravel", "PreviouslyEmployed", "OtherEduc", "OTH_NATL",
    "OtherNames", "TelecodeQuestion", "PermResOtherCntryInd",
    "OtherPersonsTravelingWithYou", "GroupTravel",
    "PREV_US_TRAVEL_IND", "PREV_US_DRIVER_LIC_IND", "PREV_VISA_IND", "PREV_VISA_REFUSED_IND",
    "IV_PETITION_IND", "PERM_RESIDENT_IND", "VWP_DENIAL_IND",
    "AddPhone", "AddEmail", "AddSocial", "AddSite", "LOST_PPT_IND",
    "FATHER_LIVE_IN_US_IND", "MOTHER_LIVE_IN_US_IND",
    "CLAN_TRIBE_IND", "COUNTRIES_VISITED_IND", "ORGANIZATION_IND",
    "SPECIALIZED_SKILLS_IND", "MILITARY_SERVICE_IND", "INSURGENT_ORG_IND"];
const PB_CLICK_ANY = ["IMMED_RELATIVE", "MailingAddrSame", "MailingAddr"];

function isPbSelect(id) { return PB_SELECTS.some(t => id.includes(t)); }
function isPbClick(id, type) {
    if (type !== "radio") return false;
    if (id.match(/_0$/) && PB_CLICK_YES.some(t => id.includes(t))) return true;
    return PB_CLICK_ANY.some(t => id.includes(t));
}

// ============================================================
// FormFiller CLASS
// ============================================================
class FormFiller {
    constructor(applicant, application) {
        this.applicant = applicant;
        this.rawData = applicant.data;
        this.data = this.normalizeData(applicant.data || {});
        this.app = application;
    }

    async run() {
        console.log("🤖 Analyzing page...");

        // Session timeout
        if (document.body.innerText.includes("Session Timed Out") || $(".error_message")) {
            alert("DS-160 AI: Sessão expirada. Recarregue.");
            return;
        }

        // Start Page
        if ($("select[id$='_ddlLocation']")) {
            console.log("PAGE: Start");
            return this.handleStartPage();
        }

        // Retrieve Page
        if ($("input[id$='_txtApplicationID']") || $("input[id$='_txtSurname']")) {
            console.log("PAGE: Retrieve");
            return this.handleRetrievePage();
        }

        // Security Setup (new app - set security question + answer)
        // Detect by element OR by URL (element might not be rendered yet)
        const isSecSetupUrl = window.location.href.includes("SecureQuestion") ||
            window.location.href.includes("ConfirmApplicationID");
        if ($("select[id$='_ddlQuestions']") || (isSecSetupUrl && $("input[id$='_txtAnswer']"))) {
            console.log("PAGE: SecuritySetup");
            return this.handleSecuritySetup();
        }

        // Confirm Application ID page (after security setup)
        if ($("input[id$='_btnContinueApp']") || $("a[id$='_btnContinueApp']")) {
            console.log("PAGE: ConfirmAppId");
            return this.handleConfirmAppId();
        }

        // If URL says ConfirmApplicationID but no elements found yet, wait and retry
        if (isSecSetupUrl) {
            console.log("PAGE: SecuritySetup (waiting for elements...)");
            await sleep(2000);
            if ($("select[id$='_ddlQuestions']") || $("input[id$='_txtAnswer']")) {
                return this.handleSecuritySetup();
            }
            if ($("input[id$='_btnContinueApp']") || $("a[id$='_btnContinueApp']")) {
                return this.handleConfirmAppId();
            }
            console.warn("⚠️ SecuritySetup elements not found after wait");
        }

        // Normal form pages — auto-fill engine
        const page = this.detectPage();
        if (!page) {
            console.warn("PAGE: Unknown", window.location.href);
            return;
        }

        console.log(`PAGE: ${page}`);

        // Security pages: all NO
        if (page === "Security") {
            return this.fillSecurityPage();
        }

        // Review / Confirmation: just log
        if (["Review", "Confirmation", "Photo"].includes(page)) {
            console.log("✅ Reached final page:", page);
            return;
        }

        // Build field map and auto-fill
        const map = this.buildFieldMap();
        await this.autoFillPage(map);

        // Click Next
        await this.clickNext();
    }

    // ============================================================
    // PAGE DETECTION (URL-based, from fill-form.ts)
    // ============================================================
    detectPage() {
        const url = window.location.href;
        const nodeMatch = url.match(/node=(\w+)/);
        const node = nodeMatch ? nodeMatch[1] : "";
        const file = url.split("/").pop()?.split("?")[0] || "";

        if (url.includes("Default.aspx")) return "Landing";
        if (url.includes("ConfirmApplicationID") || url.includes("SecureQuestion")) return "SecurityQuestion";
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
        if (file.includes("complete_family3") || node === "DeceasedSpouse") return "DeceasedSpouse";
        if (file.includes("complete_family4") || node === "PrevSpouse") return "PrevSpouse";
        if (file.includes("complete_workeducation1")) return "WorkEducation1";
        if (file.includes("complete_workeducation2")) return "WorkEducation2";
        if (file.includes("complete_workeducation3")) return "WorkEducation3";
        if (url.includes("SecurityandBackground")) return "Security";
        if (url.includes("UploadPhoto")) return "Photo";
        if (url.includes("Review")) return "Review";
        if (url.includes("Confirmation")) return "Confirmation";
        if (node) return node;
        return null;
    }

    // ============================================================
    // AUTO-FILL ENGINE (from fill-form.ts autoFillPage)
    // ============================================================
    async autoFillPage(map) {
        let passes = 0;
        const MAX_PASSES = 8;

        while (passes < MAX_PASSES) {
            passes++;
            const needRescan = await this.fillPass(map);
            if (!needRescan) break;
            console.log(`🔄 Rescan pass ${passes}...`);
        }
        console.log(`✅ Auto-fill complete (${passes} passes)`);
    }

    async fillPass(map) {
        const fields = this.discoverFields();
        let postbackNeeded = false;
        let filled = 0;

        for (const f of fields) {
            if (!f.id) continue;
            if (["submit", "image", "button"].includes(f.type)) continue;
            if (/HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/.test(f.id)) continue;

            const match = map.find(m => m.pattern.test(f.id));
            if (!match) continue;

            try {
                const el = document.getElementById(f.id);
                if (!el || el.offsetParent === null) continue;

                switch (match.type) {
                    case "text":
                        if (!el.value) {
                            this.humanType(el, match.value);
                            filled++;
                        }
                        break;

                    case "select":
                    case "select-label":
                    case "select-search": {
                        if (el.value && el.value !== "" && el.value !== "-1") break;
                        const opts = Array.from(el.options);
                        let found;
                        if (match.type === "select") {
                            found = opts.find(o => o.value === match.value);
                        } else if (match.type === "select-label") {
                            found = opts.find(o => o.text.toUpperCase().includes(match.value.toUpperCase()));
                        } else {
                            found = opts.find(o => o.text.toUpperCase().includes(match.value.toUpperCase()))
                                || opts.find(o => o.value && o.value.toUpperCase().includes(match.value.toUpperCase()));
                        }
                        if (!found) found = opts.find(o => o.value && o.value !== "" && o.value !== "-1" && !o.text.toUpperCase().includes("SELECT"));
                        if (found) {
                            this.humanSelect(el, found.value);
                            filled++;
                            if (isPbSelect(f.id)) { postbackNeeded = true; }
                        }
                        break;
                    }

                    case "click":
                        if (!el.checked) {
                            this.humanClick(el);
                            filled++;
                            if (isPbClick(f.id, f.type)) { postbackNeeded = true; }
                        }
                        break;

                    case "checkbox-check":
                        if (!el.checked) {
                            this.humanClick(el);
                            filled++;
                        }
                        break;
                }
            } catch (e) {
                console.warn(`Fill error ${f.id}:`, e.message);
            }
            if (postbackNeeded) break;
        }

        console.log(`Filled ${filled}${postbackNeeded ? " (postback triggered)" : ""}`);
        if (postbackNeeded) {
            await this.waitForPostback();
            return true;
        }
        return false;
    }

    // ============================================================
    // HUMAN-LIKE INTERACTION HELPERS
    // ============================================================

    /** Simulate typing: focus → set value → InputEvent → change → blur */
    humanType(el, value) {
        if (!el || value === undefined || value === null) return;
        const v = String(value);
        el.focus();
        el.dispatchEvent(new Event('focus', { bubbles: true }));
        // Set the value natively
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(el), 'value'
        )?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, v);
        } else {
            el.value = v;
        }
        // Dispatch InputEvent (what real typing produces)
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: v }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    /** Simulate select: focus → set value via native setter → change → call __doPostBack if needed */
    humanSelect(el, value) {
        if (!el || value === undefined) return;
        el.focus();
        el.dispatchEvent(new Event('focus', { bubbles: true }));
        // Use native setter to bypass React/ASP.NET value interception
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (nativeSetter) {
            nativeSetter.call(el, value);
        } else {
            el.value = value;
        }
        // Trigger the same events a real user selection creates
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));

        // If this select triggers ASP.NET postback, call __doPostBack directly
        // ASP.NET selects with AutoPostBack have onchange="javascript:setTimeout('__doPostBack(...)',0)"
        const onchangeAttr = el.getAttribute('onchange') || '';
        if (onchangeAttr.includes('__doPostBack') || isPbSelect(el.id)) {
            // Extract the postback target from the element's name (ASP.NET uses $ separator)
            const pbTarget = el.name || el.id.replace(/_/g, '$');
            if (typeof window.__doPostBack === 'function') {
                console.log("📤 __doPostBack:", pbTarget);
                window.__doPostBack(pbTarget, '');
            }
        }
    }

    /** Simulate real mouse click: mousedown → mouseup → click event sequence */
    humanClick(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const evtInit = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

        el.dispatchEvent(new MouseEvent('mousedown', evtInit));
        el.dispatchEvent(new MouseEvent('mouseup', evtInit));
        el.dispatchEvent(new MouseEvent('click', evtInit));

        // For radio/checkbox, also ensure change fires
        if (el.type === 'radio' || el.type === 'checkbox') {
            if (!el.checked) el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    discoverFields() {
        const fields = [];
        $$("select").forEach(el => {
            if (el.id.includes("ddlLanguage") || !el.id) return;
            fields.push({ tag: "select", id: el.id, type: "select", value: el.value });
        });
        $$("input").forEach(el => {
            if (el.type === "hidden" || !el.id) return;
            fields.push({ tag: "input", id: el.id, type: el.type, value: el.value, checked: el.checked });
        });
        $$("textarea").forEach(el => {
            if (!el.id) return;
            fields.push({ tag: "textarea", id: el.id, type: "text", value: el.value });
        });
        return fields.filter(f => {
            const el = document.getElementById(f.id);
            return el && (el.offsetParent !== null || f.type === "radio" || f.type === "checkbox");
        });
    }

    // ============================================================
    // BUILD FIELD MAP (ported from build-field-map.ts)
    // ============================================================
    buildFieldMap() {
        const m = [];
        const a = this.data;
        if (!a) return m;
        const t = a.travel || {};
        const pp = a.passport || {};
        const addr = a.homeAddress || a.address || {};
        const uc = a.usContact || {};
        const emp = a.employer || {};
        const prev = a.previousEmployment?.[0];
        const edu = a.education?.[0];

        // --- PERSONAL 1 ---
        m.push(
            { pattern: /tbxAPP_SURNAME$/i, value: a.surname, type: "text" },
            { pattern: /tbxAPP_GIVEN_NAME$/i, value: a.givenName, type: "text" },
            { pattern: /tbxAPP_FULL_NAME_NATIVE$/i, value: a.fullNameNative || "", type: "text" },
        );
        if (a.otherNamesUsed && a.otherNames?.length) {
            m.push(
                { pattern: /rblOtherNames_0$/i, value: "", type: "click" },
                { pattern: /DListAlias_ctl00_tbxSURNAME$/i, value: a.otherNames[0].surname, type: "text" },
                { pattern: /DListAlias_ctl00_tbxGIVEN_NAME$/i, value: a.otherNames[0].givenName, type: "text" },
            );
        } else { m.push({ pattern: /rblOtherNames_1$/i, value: "", type: "click" }); }

        if (a.telecode && a.telecodeSurname) {
            m.push(
                { pattern: /rblTelecodeQuestion_0$/i, value: "", type: "click" },
                { pattern: /tbxAPP_TelecodeSURNAME$/i, value: a.telecodeSurname, type: "text" },
                { pattern: /tbxAPP_TelecodeGIVEN_NAME$/i, value: a.telecodeGivenName || "", type: "text" },
            );
        } else { m.push({ pattern: /rblTelecodeQuestion_1$/i, value: "", type: "click" }); }

        m.push(
            { pattern: /ddlAPP_GENDER$/i, value: a.sex, type: "select" },
            { pattern: /ddlAPP_MARITAL_STATUS$/i, value: a.maritalStatus, type: "select" },
        );
        if (a.maritalStatus === 'O' && a.otherMaritalStatusText) {
            m.push({ pattern: /tbxOtherMaritalStatus$/i, value: a.otherMaritalStatusText, type: "text" });
        }
        m.push(
            { pattern: /ddlDOBDay$/i, value: a.dob?.day, type: "select" },
            { pattern: /ddlDOBMonth$/i, value: a.dob?.month, type: "select" },
            { pattern: /tbxDOBYear$/i, value: a.dob?.year, type: "text" },
            { pattern: /tbxAPP_POB_CITY$/i, value: a.cityOfBirth, type: "text" },
            { pattern: /tbxAPP_POB_ST_PROVINCE$/i, value: a.stateOfBirth, type: "text" },
            { pattern: /ddlAPP_POB_CNTRY$/i, value: a.countryOfBirth, type: "select-label" },
        );

        // --- PERSONAL 2 ---
        m.push({ pattern: /ddlAPP_NATL$/i, value: a.nationality, type: "select-label" });
        if (a.otherNationality) {
            m.push({ pattern: /rblAPP_OTH_NATL_IND_0$/i, value: "", type: "click" },
                { pattern: /dtlOTHER_NATL_ctl00_ddlOTHER_NATL$/i, value: a.otherNationalityCountry || "", type: "select-label" });
            if (a.otherNationalityPassport) {
                m.push({ pattern: /rblOTHER_PPT_IND_0$/i, value: "", type: "click" },
                    { pattern: /tbxOTHER_PPT_NUM$/i, value: a.otherNationalityPassportNumber || "", type: "text" });
            } else { m.push({ pattern: /rblOTHER_PPT_IND_1$/i, value: "", type: "click" }); }
        } else { m.push({ pattern: /rblAPP_OTH_NATL_IND_1$/i, value: "", type: "click" }); }

        if (a.permanentResidentOtherCountry) {
            m.push({ pattern: /rblPermResOtherCntryInd_0$/i, value: "", type: "click" },
                { pattern: /dtlOthPermResCntry_ctl00_ddlOthPermResCntry$/i, value: a.permanentResidentCountry || "", type: "select-label" });
        } else { m.push({ pattern: /rblPermResOtherCntryInd_1$/i, value: "", type: "click" }); }

        m.push({ pattern: /tbxAPP_NATIONAL_ID$/i, value: a.nationalId, type: "text" });
        if (a.usSsn) {
            m.push({ pattern: /tbxAPP_SSN1$/i, value: a.usSsn.slice(0, 3), type: "text" },
                { pattern: /tbxAPP_SSN2$/i, value: a.usSsn.slice(3, 5), type: "text" },
                { pattern: /tbxAPP_SSN3$/i, value: a.usSsn.slice(5, 9), type: "text" });
        } else { m.push({ pattern: /cbexAPP_SSN_NA$/i, value: "", type: "checkbox-check" }); }
        if (a.usTaxpayerId) {
            m.push({ pattern: /tbxAPP_TAX_ID$/i, value: a.usTaxpayerId, type: "text" });
        } else { m.push({ pattern: /cbexAPP_TAX_ID_NA$/i, value: "", type: "checkbox-check" }); }

        // --- TRAVEL ---
        m.push(
            { pattern: /ddlPurposeOfTrip$/i, value: "B", type: "select" },
            { pattern: /ddlOtherPurpose$/i, value: "B1-B2", type: "select" },
            { pattern: /ddlVisaClass$/i, value: a.purposeOfTrip, type: "select-search" },
        );
        if (a.hasSpecificPlans && t) {
            m.push({ pattern: /rblSpecificTravel_0$/i, value: "", type: "click" });
            if (t.arrivalDate) {
                m.push({ pattern: /ddlARRIVAL_US_DTEDay$/i, value: t.arrivalDate.day, type: "select" },
                    { pattern: /ddlARRIVAL_US_DTEMonth$/i, value: t.arrivalDate.month, type: "select" },
                    { pattern: /tbxARRIVAL_US_DTEYear$/i, value: t.arrivalDate.year, type: "text" });
            }
            if (t.lengthOfStay) {
                m.push({ pattern: /tbxAPP_LOS_AMT$/i, value: t.lengthOfStay.value, type: "text" },
                    { pattern: /ddlAPP_LOS_CD$/i, value: t.lengthOfStay.unit, type: "select" });
            }
            if (t.usAddress) {
                m.push(
                    { pattern: /tbxStreetAddress1$/i, value: t.usAddress.street1, type: "text" },
                    { pattern: /tbxStreetAddress2$/i, value: t.usAddress.street2 || "", type: "text" },
                    { pattern: /tbxCity$/i, value: t.usAddress.city, type: "text" },
                    { pattern: /ddlTravelState$/i, value: t.usAddress.state, type: "select" },
                    { pattern: /tbxZIPCode$/i, value: t.usAddress.zip, type: "text" },
                    { pattern: /tbZIPCode$/i, value: t.usAddress.zip, type: "text" },
                    { pattern: /tbxSPECTRAVEL_LOCATION$/i, value: t.location || t.usAddress?.city, type: "text" },
                );
            }
            if (t.departureDate) {
                m.push({ pattern: /ddlDEPARTURE_US_DTEDay$/i, value: t.departureDate.day, type: "select" },
                    { pattern: /ddlDEPARTURE_US_DTEMonth$/i, value: t.departureDate.month, type: "select" },
                    { pattern: /tbxDEPARTURE_US_DTEYear$/i, value: t.departureDate.year, type: "text" });
            }
            if (t.arrivalFlight) m.push({ pattern: /tbxArriveFlight$/i, value: t.arrivalFlight, type: "text" });
            if (t.arrivalCity) m.push({ pattern: /tbxArriveCity$/i, value: t.arrivalCity, type: "text" });
            if (t.departureFlight) m.push({ pattern: /tbxDepartFlight$/i, value: t.departureFlight, type: "text" });
            if (t.departureCity) m.push({ pattern: /tbxDepartCity$/i, value: t.departureCity, type: "text" });
        } else {
            m.push({ pattern: /rblSpecificTravel_1$/i, value: "", type: "click" });
            // Non-specific: still set approximate arrival and length of stay
            if (t.arrivalDate) {
                m.push({ pattern: /ddlARRIVAL_US_NSDTEDay$/i, value: t.arrivalDate.day, type: "select" },
                    { pattern: /ddlARRIVAL_US_NSDTEMonth$/i, value: t.arrivalDate.month, type: "select" },
                    { pattern: /tbxARRIVAL_US_NSDTEYear$/i, value: t.arrivalDate.year, type: "text" });
            }
            if (t.lengthOfStay) {
                m.push({ pattern: /tbxAPP_LOS$/i, value: t.lengthOfStay.value, type: "text" },
                    { pattern: /ddlAPP_LOS_CD$/i, value: t.lengthOfStay.unit, type: "select" });
            }
            if (t.usAddress) {
                m.push(
                    { pattern: /tbxStreetAddress1$/i, value: t.usAddress.street1, type: "text" },
                    { pattern: /tbxStreetAddress2$/i, value: t.usAddress.street2 || "", type: "text" },
                    { pattern: /tbxCity$/i, value: t.usAddress.city, type: "text" },
                    { pattern: /ddlTravelState$/i, value: t.usAddress.state, type: "select" },
                    { pattern: /tbxZIPCode$/i, value: t.usAddress.zip, type: "text" },
                    { pattern: /tbZIPCode$/i, value: t.usAddress.zip, type: "text" },
                );
            }
        }

        m.push({ pattern: /ddlWhoIsPaying$/i, value: a.payingForTrip || "S", type: "select" });
        if (a.payingForTrip === "O" && a.payer) {
            m.push(
                { pattern: /tbxPayerSurname$/i, value: a.payer.surname || "", type: "text" },
                { pattern: /tbxPayerGivenName$/i, value: a.payer.givenName || "", type: "text" },
                { pattern: /tbxPayerPhone$/i, value: ph(a.payer.phone), type: "text" },
                { pattern: /ddlPayerRelationship$/i, value: a.payer.relationship, type: "select" },
            );
            if (a.payer.email) { m.push({ pattern: /tbxPAYER_EMAIL_ADDR$/i, value: a.payer.email, type: "text" }); }
            else { m.push({ pattern: /cbxDNAPAYER_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" }); }
            if (a.payer.sameAddress === true) {
                m.push({ pattern: /rblPayerAddrSameAsInd_0$/i, value: "", type: "click" });
            } else if (a.payer.sameAddress === false) {
                m.push({ pattern: /rblPayerAddrSameAsInd_1$/i, value: "", type: "click" },
                    { pattern: /tbxPayerStreetAddress1$/i, value: a.payer.street1 || "", type: "text" },
                    { pattern: /tbxPayerStreetAddress2$/i, value: a.payer.street2 || "", type: "text" },
                    { pattern: /tbxPayerCity$/i, value: a.payer.city || "", type: "text" },
                    { pattern: /tbxPayerStateProvince$/i, value: a.payer.state || "", type: "text" },
                    { pattern: /tbxPayerPostalZIPCode$/i, value: a.payer.postalCode || "", type: "text" },
                    { pattern: /ddlPayerCountry$/i, value: a.payer.country || "", type: "select-label" });
            }
        } else if (["C", "P", "H"].includes(a.payingForTrip) && a.payer) {
            m.push(
                { pattern: /tbxPayingCompany$/i, value: a.payer.companyName || "", type: "text" },
                { pattern: /tbxPayerPhone$/i, value: ph(a.payer.phone), type: "text" },
                { pattern: /tbxCompanyRelation$/i, value: a.payer.companyRelation || "", type: "text" },
                { pattern: /tbxPayerStreetAddress1$/i, value: a.payer.street1 || "", type: "text" },
                { pattern: /tbxPayerStreetAddress2$/i, value: a.payer.street2 || "", type: "text" },
                { pattern: /tbxPayerCity$/i, value: a.payer.city || "", type: "text" },
                { pattern: /tbxPayerStateProvince$/i, value: a.payer.state || "", type: "text" },
                { pattern: /tbxPayerPostalZIPCode$/i, value: a.payer.postalCode || "", type: "text" },
                { pattern: /ddlPayerCountry$/i, value: a.payer.country || "", type: "select-label" },
            );
        }

        // --- TRAVEL COMPANIONS ---
        if (a.travelingWithOthers && a.companions?.length) {
            m.push({ pattern: /rblOtherPersonsTravelingWithYou_0$/i, value: "", type: "click" },
                { pattern: /TravelCompanions_ctl00_tbxSurname$/i, value: a.companions[0].surname, type: "text" },
                { pattern: /TravelCompanions_ctl00_tbxGivenName$/i, value: a.companions[0].givenName, type: "text" },
                { pattern: /TravelCompanions_ctl00_ddlTCRelationship$/i, value: a.companions[0].relationship, type: "select" });
            if (a.partOfGroup && a.groupName) {
                m.push({ pattern: /rblGroupTravel_0$/i, value: "", type: "click" },
                    { pattern: /tbxGroupName$/i, value: a.groupName, type: "text" });
            } else { m.push({ pattern: /rblGroupTravel_1$/i, value: "", type: "click" }); }
        } else {
            m.push({ pattern: /rblOtherPersonsTravelingWithYou_1$/i, value: "", type: "click" });
        }

        // --- PREVIOUS US TRAVEL ---
        if (a.hasBeenInUS && a.previousUSVisit) {
            const pv = a.previousUSVisit;
            m.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" },
                { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: pv.arrivalDate.day, type: "select" },
                { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: pv.arrivalDate.month, type: "select" },
                { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: pv.arrivalDate.year, type: "text" },
                { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
                { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" });
            if (a.previousUSDriversLicense) {
                m.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" },
                    { pattern: /tbxUS_DRIVER_LICENSE$/i, value: a.previousUSDriversLicenseNumber || "", type: "text" },
                    { pattern: /ddlUS_DRIVER_LICENSE_STATE$/i, value: a.previousUSDriversLicenseState || "", type: "select" });
            } else { m.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" }); }
        } else { m.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" }); }

        if (a.hasUSVisa && a.previousVisa) {
            const v = a.previousVisa;
            m.push({ pattern: /rblPREV_VISA_IND_0$/i, value: "", type: "click" },
                { pattern: /ddlPREV_VISA_ISSUED_DTEDay$/i, value: v.issueDate.day, type: "select" },
                { pattern: /ddlPREV_VISA_ISSUED_DTEMonth$/i, value: v.issueDate.month, type: "select" },
                { pattern: /tbxPREV_VISA_ISSUED_DTEYear$/i, value: v.issueDate.year, type: "text" });
            if (v.numberNA) { m.push({ pattern: /cbexPREV_VISA_FOIL_NUMBER_NA$/i, value: "", type: "checkbox-check" }); }
            else { m.push({ pattern: /tbxPREV_VISA_FOIL_NUMBER$/i, value: v.number, type: "text" }); }
            m.push(
                { pattern: v.sameType ? /rblPREV_VISA_SAME_TYPE_IND_0$/i : /rblPREV_VISA_SAME_TYPE_IND_1$/i, value: "", type: "click" },
                { pattern: v.sameCountry ? /rblPREV_VISA_SAME_CNTRY_IND_0$/i : /rblPREV_VISA_SAME_CNTRY_IND_1$/i, value: "", type: "click" },
                { pattern: v.tenPrint ? /rblPREV_VISA_TEN_PRINT_IND_0$/i : /rblPREV_VISA_TEN_PRINT_IND_1$/i, value: "", type: "click" },
                { pattern: v.lost ? /rblPREV_VISA_LOST_IND_0$/i : /rblPREV_VISA_LOST_IND_1$/i, value: "", type: "click" },
                { pattern: v.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
            );
        } else { m.push({ pattern: /rblPREV_VISA_IND_1$/i, value: "", type: "click" }); }

        m.push(a.visaRefused
            ? { pattern: /rblPREV_VISA_REFUSED_IND_0$/i, value: "", type: "click" }
            : { pattern: /rblPREV_VISA_REFUSED_IND_1$/i, value: "", type: "click" });
        if (a.visaRefused && a.visaRefusedExplanation) {
            m.push({ pattern: /tbxPREV_VISA_REFUSED_EXPL$/i, value: a.visaRefusedExplanation, type: "text" });
        }
        if (a.immigrantPetition) {
            m.push({ pattern: /rblIV_PETITION_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxIV_PETITION_EXPL$/i, value: a.immigrantPetitionExplanation || "", type: "text" });
        } else { m.push({ pattern: /rblIV_PETITION_IND_1$/i, value: "", type: "click" }); }
        if (a.permanentResident) {
            m.push({ pattern: /rblPERM_RESIDENT_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxPERM_RESIDENT_EXPL$/i, value: a.permanentResidentExplanation || "", type: "text" });
        } else { m.push({ pattern: /rblPERM_RESIDENT_IND_1$/i, value: "", type: "click" }); }
        if (a.vwpDenial) {
            m.push({ pattern: /rblVWP_DENIAL_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxVWP_DENIAL_EXPL$/i, value: a.vwpDenialExplanation || "", type: "text" });
        } else { m.push({ pattern: /rblVWP_DENIAL_IND_1$/i, value: "", type: "click" }); }

        // --- ADDRESS & PHONE ---
        m.push(
            { pattern: /tbxAPP_ADDR_LN1$/i, value: addr.street1, type: "text" },
            { pattern: /tbxAPP_ADDR_LN2$/i, value: addr.street2 || "", type: "text" },
            { pattern: /tbxAPP_ADDR_CITY$/i, value: addr.city, type: "text" },
            { pattern: /tbxAPP_ADDR_STATE$/i, value: addr.state, type: "text" },
            { pattern: /tbxAPP_ADDR_POSTAL_CD$/i, value: addr.postalCode, type: "text" },
            { pattern: /ddlAPP_ADDR_CNTRY$/i, value: addr.country, type: "select-label" },
            { pattern: /ddlCountry$/i, value: addr.country, type: "select-label" },
            { pattern: /tbxAPP_HOME_TEL$/i, value: ph(a.phone), type: "text" },
            { pattern: /tbxAPP_EMAIL_ADDR$/i, value: a.email, type: "text" },
        );
        m.push(a.mailingAddressSame
            ? { pattern: /rblMailingAddrSame_0$/i, value: "", type: "click" }
            : { pattern: /rblMailingAddrSame_1$/i, value: "", type: "click" });
        if (a.mailingAddressSame) {
            m.push({ pattern: /rblMailingAddr_0$/i, value: "", type: "click" });
        } else {
            m.push({ pattern: /rblMailingAddr_1$/i, value: "", type: "click" });
        }
        // Mailing address (when different from home)
        if (!a.mailingAddressSame && a.mailingAddress) {
            const ma = a.mailingAddress;
            m.push(
                { pattern: /tbxMAILING_ADDR_LN1$/i, value: ma.street1, type: "text" },
                { pattern: /tbxMAILING_ADDR_LN2$/i, value: ma.street2 || "", type: "text" },
                { pattern: /tbxMAILING_ADDR_CITY$/i, value: ma.city, type: "text" },
                { pattern: /tbxMAILING_ADDR_STATE$/i, value: ma.state || "", type: "text" },
                { pattern: /tbxMAILING_ADDR_POSTAL_CD$/i, value: ma.postalCode || "", type: "text" },
                { pattern: /ddlMailCountry$/i, value: ma.country, type: "select-label" },
            );
        }
        if (a.mobilePhone) { m.push({ pattern: /tbxAPP_MOBILE_TEL$/i, value: ph(a.mobilePhone), type: "text" }); }
        else { m.push({ pattern: /cbexAPP_MOBILE_TEL_NA$/i, value: "", type: "checkbox-check" }); }
        if (a.businessPhone) { m.push({ pattern: /tbxAPP_BUS_TEL$/i, value: ph(a.businessPhone), type: "text" }); }
        else { m.push({ pattern: /cbexAPP_BUS_TEL_NA$/i, value: "", type: "checkbox-check" }); }
        if (a.additionalPhones && a.additionalPhoneNumbers?.length) {
            m.push({ pattern: /rblAddPhone_0$/i, value: "", type: "click" },
                { pattern: /dtlAddPhone_ctl00_tbxAddPhoneInfo$/i, value: ph(a.additionalPhoneNumbers[0]), type: "text" });
        } else { m.push({ pattern: /rblAddPhone_1$/i, value: "", type: "click" }); }
        if (a.additionalEmails && a.additionalEmailAddresses?.length) {
            m.push({ pattern: /rblAddEmail_0$/i, value: "", type: "click" },
                { pattern: /dtlAddEmail_ctl00_tbxAddEmailInfo$/i, value: a.additionalEmailAddresses[0], type: "text" });
        } else { m.push({ pattern: /rblAddEmail_1$/i, value: "", type: "click" }); }
        m.push({ pattern: /rblAddSite_1$/i, value: "", type: "click" });
        if (a.socialMedia?.length) {
            m.push({ pattern: /ddlSocialMedia$/i, value: a.socialMedia[0].platform, type: "select-search" },
                { pattern: /tbxSocialMediaIdent$/i, value: a.socialMedia[0].handle, type: "text" });
        }
        if (a.additionalSocialMedia && a.additionalSocialMediaAccounts?.length) {
            m.push({ pattern: /rblAddSocial_0$/i, value: "", type: "click" },
                { pattern: /dtlAddSocial_ctl00_tbxAddSocialPlat$/i, value: a.additionalSocialMediaAccounts[0].platform, type: "text" },
                { pattern: /dtlAddSocial_ctl00_tbxAddSocialHand$/i, value: a.additionalSocialMediaAccounts[0].handle, type: "text" });
        } else {
            m.push({ pattern: /rblAddSocial_1$/i, value: "", type: "click" });
        }

        // --- PASSPORT ---
        m.push(
            { pattern: /ddlPPT_TYPE$/i, value: pp.type || "R", type: "select" },
        );
        if (pp.type === 'T' && pp.typeExplanation) {
            m.push({ pattern: /tbxPptOtherExpl$/i, value: pp.typeExplanation, type: "text" });
        }
        m.push(
            { pattern: /tbxPPT_NUM$/i, value: pp.number, type: "text" },
            { pattern: /ddlPPT_ISSUED_CNTRY$/i, value: pp.issuingCountry, type: "select-label" },
            { pattern: /tbxPPT_ISSUED_IN_CITY$/i, value: pp.issuedCity, type: "text" },
            { pattern: /tbxPPT_ISSUED_IN_STATE$/i, value: pp.issuedState, type: "text" },
            { pattern: /ddlPPT_ISSUED_IN_CNTRY$/i, value: pp.issuedCountry, type: "select-label" },
            { pattern: /ddlPPT_ISSUED_DTEDay$/i, value: pp.issuanceDate?.day, type: "select" },
            { pattern: /ddlPPT_ISSUED_DTEMonth$/i, value: pp.issuanceDate?.month, type: "select" },
            { pattern: /ddlPPT_ISSUEDDay$/i, value: pp.issuanceDate?.day, type: "select" },
            { pattern: /ddlPPT_ISSUEDMonth$/i, value: pp.issuanceDate?.month, type: "select" },
            { pattern: /tbxPPT_ISSUEDYear$/i, value: pp.issuanceDate?.year, type: "text" },
            { pattern: /ddlPPT_EXPIRE_DTEDay$/i, value: pp.expirationDate?.day, type: "select" },
            { pattern: /ddlPPT_EXPIRE_DTEMonth$/i, value: pp.expirationDate?.month, type: "select" },
            { pattern: /ddlPPT_EXPIREDay$/i, value: pp.expirationDate?.day, type: "select" },
            { pattern: /ddlPPT_EXPIREMonth$/i, value: pp.expirationDate?.month, type: "select" },
            { pattern: /tbxPPT_EXPIREYear$/i, value: pp.expirationDate?.year, type: "text" },
        );
        if (pp.bookNumber) { m.push({ pattern: /tbxPPT_BOOK_NUM$/i, value: pp.bookNumber, type: "text" }); }
        else {
            m.push({ pattern: /cbexPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" },
                { pattern: /cbxPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" });
        }
        if (pp.lostOrStolen && pp.lostPassport) {
            m.push({ pattern: /rblLOST_PPT_IND_0$/i, value: "", type: "click" },
                { pattern: /dtlLostPPT_ctl00_tbxLOST_PPT_NUM$/i, value: pp.lostPassport.number, type: "text" },
                { pattern: /ddlLOST_PPT_NATL$/i, value: pp.lostPassport.country, type: "select-label" },
                { pattern: /tbxLOST_PPT_EXPL$/i, value: pp.lostPassport.explanation, type: "text" });
            if (pp.lostPassport.numberUnknown) {
                m.push({ pattern: /cbxLOST_PPT_NUM_UNKN_IND$/i, value: "", type: "checkbox-check" });
            }
        } else { m.push({ pattern: /rblLOST_PPT_IND_1$/i, value: "", type: "click" }); }

        // --- US CONTACT ---
        m.push(
            { pattern: /tbxUS_POC_SURNAME$/i, value: uc.surname, type: "text" },
            { pattern: /tbxUS_POC_GIVEN_NAME$/i, value: uc.givenName, type: "text" },
            { pattern: /tbxUS_POC_ORGANIZATION$/i, value: uc.organization || uc.surname, type: "text" },
            { pattern: /tbxUS_POC_ADDR_LN1$/i, value: uc.street1, type: "text" },
            { pattern: /tbxUS_POC_ADDR_CITY$/i, value: uc.city, type: "text" },
            { pattern: /ddlUS_POC_ADDR_STATE$/i, value: uc.state, type: "select" },
            { pattern: /tbxUS_POC_ADDR_POSTAL_CD$/i, value: uc.zip, type: "text" },
            { pattern: /tbxUS_POC_HOME_TEL$/i, value: ph(uc.phone), type: "text" },
            { pattern: /ddlUS_POC_REL_TO_APP$/i, value: uc.relationship, type: "select" },
            { pattern: /ddlUS_POC_REL$/i, value: uc.relationship, type: "select" },
        );
        if (uc.email) { m.push({ pattern: /tbxUS_POC_EMAIL_ADDR$/i, value: uc.email, type: "text" }); }
        else { m.push({ pattern: /cbxUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" }); }

        // --- FAMILY ---
        if (a.father) {
            m.push(
                { pattern: /tbxFATHER_SURNAME$/i, value: a.father.surname, type: "text" },
                { pattern: /tbxFATHER_GIVEN_NAME$/i, value: a.father.givenName, type: "text" },
                { pattern: /ddlFathersDOBDay$/i, value: a.father.dob?.day, type: "select" },
                { pattern: /ddlFathersDOBMonth$/i, value: a.father.dob?.month, type: "select" },
                { pattern: /tbxFathersDOBYear$/i, value: a.father.dob?.year, type: "text" },
                { pattern: /ddlFATHER_DOBDay$/i, value: a.father.dob?.day, type: "select" },
                { pattern: /ddlFATHER_DOBMonth$/i, value: a.father.dob?.month, type: "select" },
                { pattern: /tbxFATHER_DOBYear$/i, value: a.father.dob?.year, type: "text" },
            );
            m.push(a.father.inUS
                ? { pattern: /rblFATHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" }
                : { pattern: /rblFATHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" });
            if (a.father.inUS) {
                m.push({ pattern: /rblFATHER_US_0$/i, value: "", type: "click" },
                    { pattern: /ddlFATHER_US_STATUS$/i, value: a.father.usStatus || "S", type: "select" });
            } else {
                m.push({ pattern: /rblFATHER_US_1$/i, value: "", type: "click" });
            }
        }
        if (a.mother) {
            m.push(
                { pattern: /tbxMOTHER_SURNAME$/i, value: a.mother.surname, type: "text" },
                { pattern: /tbxMOTHER_GIVEN_NAME$/i, value: a.mother.givenName, type: "text" },
                { pattern: /ddlMothersDOBDay$/i, value: a.mother.dob?.day, type: "select" },
                { pattern: /ddlMothersDOBMonth$/i, value: a.mother.dob?.month, type: "select" },
                { pattern: /tbxMothersDOBYear$/i, value: a.mother.dob?.year, type: "text" },
                { pattern: /ddlMOTHER_DOBDay$/i, value: a.mother.dob?.day, type: "select" },
                { pattern: /ddlMOTHER_DOBMonth$/i, value: a.mother.dob?.month, type: "select" },
                { pattern: /tbxMOTHER_DOBYear$/i, value: a.mother.dob?.year, type: "text" },
            );
            m.push(a.mother.inUS
                ? { pattern: /rblMOTHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" }
                : { pattern: /rblMOTHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" });
            if (a.mother.inUS) {
                m.push({ pattern: /rblMOTHER_US_0$/i, value: "", type: "click" },
                    { pattern: /ddlMOTHER_US_STATUS$/i, value: a.mother.usStatus || "S", type: "select" });
            } else {
                m.push({ pattern: /rblMOTHER_US_1$/i, value: "", type: "click" });
            }
        }

        // Spouse (Family2)
        if (a.maritalStatus !== "S" && a.spouse) {
            const sp = a.spouse;
            m.push(
                { pattern: /tbxSpouseSurname$/i, value: sp.surname, type: "text" },
                { pattern: /tbxSpouseGivenName$/i, value: sp.givenName, type: "text" },
                { pattern: /ddlSpouseNatDropDownList$/i, value: sp.nationality || a.nationality, type: "select-label" },
                { pattern: /ddlSpousePOBCountry$/i, value: sp.pobCountry || sp.countryOfBirth || a.nationality, type: "select-label" },
                { pattern: /tbxSpousePOBCity$/i, value: sp.cityOfBirth || "", type: "text" },
                { pattern: /ddlSpouseAddressType$/i, value: sp.addressType || "H", type: "select" },
                { pattern: /ddlDOBSpouseDay$/i, value: sp.dob?.day, type: "select" },
                { pattern: /ddlDOBSpouseMonth$/i, value: sp.dob?.month, type: "select" },
                { pattern: /tbxDOBSpouseYear$/i, value: sp.dob?.year, type: "text" },
            );
            if (sp.address) {
                m.push(
                    { pattern: /SPOUSE_ADDR_LN1$|SpouseAddr1$|_tbxADDR_LN1$/i, value: sp.address.street1, type: "text" },
                    { pattern: /SPOUSE_ADDR_LN2$|SpouseAddr2$|_tbxADDR_LN2$/i, value: sp.address.street2 || "", type: "text" },
                    { pattern: /SPOUSE_ADDR_CITY$|SpouseCity$|_tbxADDR_CITY$/i, value: sp.address.city, type: "text" },
                    { pattern: /SPOUSE_ADDR_STATE$|SpouseState$|_tbxADDR_STATE$/i, value: sp.address.state || "", type: "text" },
                    { pattern: /SPOUSE_ADDR_POSTAL_CD$|SpousePostalCd$|_tbxPOSTAL_CD$/i, value: sp.address.postalCode || "", type: "text" },
                    { pattern: /SPOUSE_ADDR_CNTRY$|SpouseAddrCntry$|_ddlSPOUSE_ADDR_CNTRY$/i, value: sp.address.country, type: "select-label" },
                );
            }
        } else {
            m.push({ pattern: /cbexSPOUSE_SURNAME_NA$/i, value: "", type: "checkbox-check" },
                { pattern: /cbexSPOUSE_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" });
        }

        // Immediate relatives
        if (a.relativesInUS && a.immediateRelative) {
            m.push({ pattern: /rblUS_IMMED_RELATIVE_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxUS_REL_SURNAME$/i, value: a.immediateRelative.surname, type: "text" },
                { pattern: /tbxUS_REL_GIVEN_NAME$/i, value: a.immediateRelative.givenName, type: "text" },
                { pattern: /ddlUS_REL_TYPE$/i, value: a.immediateRelative.relationship, type: "select" },
                { pattern: /ddlUS_REL_STATUS$/i, value: a.immediateRelative.status, type: "select" });
        } else {
            m.push({ pattern: /rblUS_IMMED_RELATIVE_IND_1$/i, value: "", type: "click" });
            m.push(a.otherRelativesInUS
                ? { pattern: /rblUS_OTHER_RELATIVE_IND_0$/i, value: "", type: "click" }
                : { pattern: /rblUS_OTHER_RELATIVE_IND_1$/i, value: "", type: "click" });
        }

        // --- WORK/EDUCATION 1 ---
        m.push({ pattern: /ddlPresentOccupation$/i, value: a.occupationCode, type: "select-search" });
        if (a.occupationCode === 'N') {
            m.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || 'NOT CURRENTLY EMPLOYED', type: "text" });
        }
        if (emp) {
            m.push(
                { pattern: /tbxEmpSchName$/i, value: emp.name, type: "text" },
                { pattern: /tbxEmpSchAddr1$/i, value: emp.street1, type: "text" },
                { pattern: /tbxEmpSchAddr2$/i, value: emp.street2 || "", type: "text" },
                { pattern: /tbxEmpSchCity$/i, value: emp.city, type: "text" },
                { pattern: /tbxEmpSchState$/i, value: emp.state || "", type: "text" },
                { pattern: /tbxEmpSchPostalCd$/i, value: emp.postalCode || "", type: "text" },
                { pattern: /ddlEmpSchCountry$/i, value: emp.country, type: "select-label" },
                { pattern: /tbxWORK_EDUC_TEL$/i, value: ph(emp.phone), type: "text" },
                { pattern: /tbxEmpSchPhone$/i, value: ph(emp.phone), type: "text" },
                { pattern: /tbxWORK_EDUC_ADDR_STATE$/i, value: emp.state || "", type: "text" },
                { pattern: /tbxWORK_EDUC_ADDR_POSTAL_CD$/i, value: emp.postalCode || "", type: "text" },
                { pattern: /tbxCURR_MONTHLY_SALARY$/i, value: emp.monthlySalary || emp.monthlyIncome, type: "text" },
                { pattern: /FormView1_ddlEmpDateFromDay$/i, value: emp.startDate?.day || "1", type: "select" },
                { pattern: /FormView1_ddlEmpDateFromMonth$/i, value: emp.startDate?.month, type: "select" },
                { pattern: /ddlEmpDateFromDay$/i, value: emp.startDate?.day || "1", type: "select" },
                { pattern: /ddlEmpDateFromMonth$/i, value: emp.startDate?.month, type: "select" },
                { pattern: /tbxEmpDateFromYear$/i, value: emp.startDate?.year, type: "text" },
                { pattern: /FormView1_tbxEmpDateFromYear$/i, value: emp.startDate?.year, type: "text" },
                { pattern: /tbxDescribeDuties$/i, value: emp.duties, type: "text" },
                { pattern: /FormView1_tbxDescribeDuties$/i, value: emp.duties, type: "text" },
            );
        }

        // --- WORK/EDUCATION 2 ---
        if (a.hasPreviousEmployment && prev) {
            m.push({ pattern: /rblPreviouslyEmployed_0$/i, value: "", type: "click" },
                { pattern: /tbEmployerName$/i, value: prev.name, type: "text" },
                { pattern: /tbEmployerStreetAddress1$/i, value: prev.street1, type: "text" },
                { pattern: /tbEmployerStreetAddress2$/i, value: prev.street2 || "", type: "text" },
                { pattern: /tbEmployerCity$/i, value: prev.city, type: "text" },
                { pattern: /tbxPREV_EMPL_ADDR_STATE$/i, value: prev.state || "", type: "text" },
                { pattern: /tbxPREV_EMPL_ADDR_POSTAL_CD$/i, value: prev.postalCode || "", type: "text" },
                { pattern: /dtlPrevEmpl.*DropDownList2$/i, value: prev.country, type: "select-label" },
                { pattern: /tbEmployerPhone$/i, value: ph(prev.phone), type: "text" },
                { pattern: /tbJobTitle$/i, value: prev.jobTitle, type: "text" });
            if (prev.supervisorSurname) {
                m.push({ pattern: /tbSupervisorSurname$/i, value: prev.supervisorSurname, type: "text" });
            } else { m.push({ pattern: /cbxSupervisorSurname_NA$/i, value: "", type: "checkbox-check" }); }
            if (prev.supervisorGivenName) {
                m.push({ pattern: /tbSupervisorGivenName$/i, value: prev.supervisorGivenName, type: "text" });
            } else { m.push({ pattern: /cbxSupervisorGivenName_NA$/i, value: "", type: "checkbox-check" }); }
            m.push(
                { pattern: /dtlPrevEmpl.*ddlEmpDateFromDay$/i, value: prev.startDate?.day || "1", type: "select" },
                { pattern: /dtlPrevEmpl.*ddlEmpDateFromMonth$/i, value: prev.startDate?.month, type: "select" },
                { pattern: /dtlPrevEmpl.*tbxEmpDateFromYear$/i, value: prev.startDate?.year, type: "text" },
                { pattern: /dtlPrevEmpl.*ddlEmpDateToDay$/i, value: prev.endDate?.day || "1", type: "select" },
                { pattern: /dtlPrevEmpl.*ddlEmpDateToMonth$/i, value: prev.endDate?.month, type: "select" },
                { pattern: /dtlPrevEmpl.*tbxEmpDateToYear$/i, value: prev.endDate?.year, type: "text" },
                { pattern: /dtlPrevEmpl.*tbDescribeDuties$/i, value: prev.duties || 'GENERAL DUTIES', type: "text" });
        } else { m.push({ pattern: /rblPreviouslyEmployed_1$/i, value: "", type: "click" }); }

        if (a.hasEducation && edu) {
            m.push({ pattern: /rblOtherEduc_0$/i, value: "", type: "click" },
                { pattern: /tbxSchoolName$/i, value: edu.name, type: "text" },
                { pattern: /tbxSchoolAddr1$/i, value: edu.street1 || "", type: "text" },
                { pattern: /tbxSchoolAddr2$/i, value: edu.street2 || "", type: "text" },
                { pattern: /tbxSchoolCity$/i, value: edu.city, type: "text" },
                { pattern: /tbxEDUC_INST_ADDR_STATE$/i, value: edu.state || "", type: "text" },
                { pattern: /tbxEDUC_INST_POSTAL_CD$/i, value: edu.postalCode || "", type: "text" },
                { pattern: /ddlSchoolCountry$/i, value: edu.country, type: "select-label" },
                { pattern: /tbxSchoolCourseOfStudy$/i, value: edu.courseOfStudy, type: "text" },
                { pattern: /dtlPrevEduc.*ddlSchoolFromDay$/i, value: edu.startDate?.day || "1", type: "select" },
                { pattern: /dtlPrevEduc.*ddlSchoolFromMonth$/i, value: edu.startDate?.month, type: "select" },
                { pattern: /dtlPrevEduc.*tbxSchoolFromYear$/i, value: edu.startDate?.year, type: "text" },
                { pattern: /dtlPrevEduc.*ddlSchoolToDay$/i, value: edu.endDate?.day || "1", type: "select" },
                { pattern: /dtlPrevEduc.*ddlSchoolToMonth$/i, value: edu.endDate?.month, type: "select" },
                { pattern: /dtlPrevEduc.*tbxSchoolToYear$/i, value: edu.endDate?.year, type: "text" });
        } else { m.push({ pattern: /rblOtherEduc_1$/i, value: "", type: "click" }); }

        // --- WORK/EDUCATION 3 ---
        m.push({ pattern: /tbxLANGUAGE_NAME$/i, value: a.languages?.[0] || "PORTUGUESE", type: "text" });
        if (a.clanTribe) {
            m.push({ pattern: /rblCLAN_TRIBE_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxCLAN_TRIBE_NAME$/i, value: a.clanTribeName || "", type: "text" });
        } else { m.push({ pattern: /rblCLAN_TRIBE_IND_1$/i, value: "", type: "click" }); }
        if (a.countriesVisited && a.countriesVisitedList?.length) {
            m.push({ pattern: /rblCOUNTRIES_VISITED_IND_0$/i, value: "", type: "click" },
                { pattern: /ddlCOUNTRIES_VISITED$/i, value: a.countriesVisitedList[0], type: "select-search" });
        } else { m.push({ pattern: /rblCOUNTRIES_VISITED_IND_1$/i, value: "", type: "click" }); }
        if (a.organizationMember) {
            m.push({ pattern: /rblORGANIZATION_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxORGANIZATION_NAME$/i, value: a.organizationName || "", type: "text" });
        } else { m.push({ pattern: /rblORGANIZATION_IND_1$/i, value: "", type: "click" }); }
        if (a.specializedSkills) {
            m.push({ pattern: /rblSPECIALIZED_SKILLS_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxSPECIALIZED_SKILLS_EXPL$/i, value: a.specializedSkillsExplanation || "", type: "text" });
        } else { m.push({ pattern: /rblSPECIALIZED_SKILLS_IND_1$/i, value: "", type: "click" }); }
        if (a.militaryService && a.military) {
            const mil = a.military;
            m.push({ pattern: /rblMILITARY_SERVICE_IND_0$/i, value: "", type: "click" },
                { pattern: /ddlMILITARY_SVC_CNTRY$/i, value: mil.country, type: "select-label" },
                { pattern: /tbxMILITARY_SVC_BRANCH$/i, value: mil.branch, type: "text" },
                { pattern: /tbxMILITARY_SVC_RANK$/i, value: mil.rank, type: "text" },
                { pattern: /tbxMILITARY_SVC_SPECIALTY$/i, value: mil.specialty, type: "text" },
                { pattern: /ddlMILITARY_SVC_FROMDay$/i, value: mil.startDate?.day, type: "select" },
                { pattern: /ddlMILITARY_SVC_FROMMonth$/i, value: mil.startDate?.month, type: "select" },
                { pattern: /tbxMILITARY_SVC_FROMYear$/i, value: mil.startDate?.year, type: "text" },
                { pattern: /ddlMILITARY_SVC_TODay$/i, value: mil.endDate?.day, type: "select" },
                { pattern: /ddlMILITARY_SVC_TOMonth$/i, value: mil.endDate?.month, type: "select" },
                { pattern: /tbxMILITARY_SVC_TOYear$/i, value: mil.endDate?.year, type: "text" });
        } else { m.push({ pattern: /rblMILITARY_SERVICE_IND_1$/i, value: "", type: "click" }); }
        if (a.insurgentOrg) {
            m.push({ pattern: /rblINSURGENT_ORG_IND_0$/i, value: "", type: "click" },
                { pattern: /tbxINSURGENT_ORG_EXPL$/i, value: a.insurgentOrgExplanation || "", type: "text" });
        } else { m.push({ pattern: /rblINSURGENT_ORG_IND_1$/i, value: "", type: "click" }); }

        // --- PREVIOUS SPOUSE ---
        const needsPrevSpouse = ['D', 'W', 'L'].includes(a.maritalStatus);
        if (needsPrevSpouse && a.previousSpouse) {
            const ps = a.previousSpouse;
            m.push(
                { pattern: /NumberOfFormerSpouses$/i, value: ps.numberOfFormerSpouses, type: "text" },
                { pattern: /NUM_PREV_SPOUSES$/i, value: ps.numberOfFormerSpouses, type: "text" },
                { pattern: /ddlNumberPrevSpouses$/i, value: ps.numberOfFormerSpouses, type: "select" },
                { pattern: /FormView1_tbxSURNAME$/i, value: ps.surname, type: "text" },
                { pattern: /FormView1_tbxGIVEN_NAME$/i, value: ps.givenName, type: "text" },
                { pattern: /ddlCOUNTRY_OF_ORIGIN$/i, value: ps.nationality, type: "select-label" },
                { pattern: /ddlSPOUSE_NATL$/i, value: ps.nationality, type: "select-label" },
                { pattern: /tbxSPOUSE_POB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
                { pattern: /tbxPOB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
                { pattern: /ddlSPOUSE_POB_CNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
                { pattern: /ddlPOB_CNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
                { pattern: /ddlPOB_COUNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
                { pattern: /ddlDATE_OF_MARRIAGEDay$/i, value: ps.dateOfMarriage?.day, type: "select" },
                { pattern: /ddlDATE_OF_MARRIAGEMonth$/i, value: ps.dateOfMarriage?.month, type: "select" },
                { pattern: /tbxDATE_OF_MARRIAGEYear$/i, value: ps.dateOfMarriage?.year, type: "text" },
                { pattern: /ddlMarriageDTEDay$/i, value: ps.dateOfMarriage?.day, type: "select" },
                { pattern: /ddlMarriageDTEMonth$/i, value: ps.dateOfMarriage?.month, type: "select" },
                { pattern: /tbxMarriageDTEYear$/i, value: ps.dateOfMarriage?.year, type: "text" },
                { pattern: /ddlDATE_MARRIAGE_ENDEDDay$/i, value: ps.dateMarriageEnded?.day, type: "select" },
                { pattern: /ddlDATE_MARRIAGE_ENDEDMonth$/i, value: ps.dateMarriageEnded?.month, type: "select" },
                { pattern: /tbxDATE_MARRIAGE_ENDEDYear$/i, value: ps.dateMarriageEnded?.year, type: "text" },
                { pattern: /ddlMarriageEndedDTEDay$/i, value: ps.dateMarriageEnded?.day, type: "select" },
                { pattern: /ddlMarriageEndedDTEMonth$/i, value: ps.dateMarriageEnded?.month, type: "select" },
                { pattern: /tbxMarriageEndedDTEYear$/i, value: ps.dateMarriageEnded?.year, type: "text" },
                { pattern: /tbxHOW_MARRIAGE_ENDED$/i, value: ps.howMarriageEnded, type: "text" },
                { pattern: /HOW_MARRIAGE_ENDED$/i, value: ps.howMarriageEnded, type: "text" },
                { pattern: /ddlCNTRY_MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
                { pattern: /ddlCOUNTRY_MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
                { pattern: /MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
            );
        }

        // Filter out entries with undefined/null values
        return m.filter(e => e.value !== undefined && e.value !== null);
    }

    // Normalize data: flatten nested clone JSON into flat format for buildFieldMap
    normalizeData(d) {
        // Already flat (from applicants table direct)
        if (d.surname) return d;

        // Clone form generates: personal1, personal2, travel, addressPhone, passport, usContact, family1, etc.
        const p1 = d.personal1 || d.personal || {};
        const p2 = d.personal2 || {};
        const addr = d.addressPhone || {};
        const trav = d.travel || {};
        const tc = d.travelCompanions || {};
        const prev = d.previousUSTravel || {};
        const fam1 = d.family1 || {};
        const fam2 = d.family2 || {};
        const we1 = d.workEducation1 || {};
        const we2 = d.workEducation2 || {};
        const we3 = d.workEducation3 || {};

        return {
            // Personal1
            surname: p1.surname, givenName: p1.givenName, fullNameNative: p1.fullNameNative,
            otherNamesUsed: p1.otherNamesUsed === 'Y', otherNames: p1.otherNames,
            telecode: p1.telecode === 'Y', telecodeSurname: p1.telecodeSurname, telecodeGivenName: p1.telecodeGivenName,
            sex: p1.sex, maritalStatus: p1.maritalStatus, otherMaritalStatusText: p1.otherMaritalStatusText,
            dob: p1.dob, cityOfBirth: p1.cityOfBirth, stateOfBirth: p1.stateOfBirth, countryOfBirth: p1.countryOfBirth,
            // Personal2
            nationality: p2.nationality,
            otherNationality: p2.otherNationality === 'Y',
            otherNationalityCountry: p2.otherNationalities?.[0]?.country,
            otherNationalityPassport: p2.otherNationalities?.[0]?.hasPassport === 'Y',
            otherNationalityPassportNumber: p2.otherNationalities?.[0]?.passportNumber,
            permanentResidentOtherCountry: p2.permanentResident === 'Y',
            permanentResidentCountry: p2.permanentResidentCountries?.[0]?.country,
            nationalId: p2.nationalId,
            usSsn: p2.ssn !== 'N/A' ? p2.ssn?.replace(/-/g, '') : null,
            usTaxpayerId: p2.taxId || null,
            // Travel
            purposeOfTrip: trav.purposeOfTrip || 'B1-B2',
            hasSpecificPlans: trav.hasSpecificPlans === 'Y',
            travel: {
                arrivalDate: trav.arrivalDate, departureDate: trav.departureDate,
                lengthOfStay: { value: trav.lengthOfStay, unit: trav.lengthOfStayUnit },
                usAddress: trav.usAddress, location: trav.specificLocation,
                arrivalFlight: trav.arrivalFlight, arrivalCity: trav.arrivalCity,
                departureFlight: trav.departureFlight, departureCity: trav.departureCity
            },
            payingForTrip: trav.whoIsPaying || 'S',
            payer: trav.payer,
            // Travel Companions
            travelingWithOthers: tc.travelingWithOthers === 'Y', companions: tc.companions,
            partOfGroup: tc.partOfGroup === 'Y', groupName: tc.groupName,
            // Previous US Travel
            hasBeenInUS: prev.hasBeenInUS === 'Y',
            previousUSVisit: prev.previousVisits?.[0],
            previousUSDriversLicense: prev.hasDriversLicense === 'Y',
            previousUSDriversLicenseNumber: prev.driversLicenses?.[0]?.number,
            previousUSDriversLicenseState: prev.driversLicenses?.[0]?.state,
            hasUSVisa: prev.hasUSVisa === 'Y', previousVisa: prev.previousVisa,
            visaRefused: prev.visaRefused === 'Y', visaRefusedExplanation: prev.visaRefusedExplanation,
            immigrantPetition: prev.immigrantPetition === 'Y',
            immigrantPetitionExplanation: prev.immigrantPetitionExplanation,
            permanentResident: prev.permanentResident === 'Y',
            permanentResidentExplanation: prev.permanentResidentExplanation,
            vwpDenial: prev.vwpDenial === 'Y',
            vwpDenialExplanation: prev.vwpDenialExplanation,
            // Address & Phone
            homeAddress: addr.homeAddress, phone: addr.phone, email: addr.email,
            mailingAddressSame: addr.mailingAddressSame === 'Y', mailingAddress: addr.mailingAddress,
            mobilePhone: addr.mobilePhone, businessPhone: addr.businessPhone,
            additionalPhones: addr.additionalPhones === 'Y', additionalPhoneNumbers: addr.additionalPhoneNumbers,
            additionalEmails: addr.additionalEmails === 'Y', additionalEmailAddresses: addr.additionalEmailAddresses,
            socialMedia: addr.socialMedia ? [addr.socialMedia] : [],
            additionalSocialMedia: addr.additionalSocialMedia === 'Y',
            additionalSocialMediaAccounts: addr.additionalSocialMediaAccounts,
            // Passport
            passport: d.passport || {},
            // US Contact (flatten nested address)
            usContact: d.usContact ? { ...d.usContact, ...(d.usContact.address || {}) } : {},
            // Family
            father: fam1.father, mother: fam1.mother,
            spouse: fam2.spouse || (fam2.surname ? fam2 : null),
            relativesInUS: (fam1.immediateRelativesInUS || fam1.relativesInUS) === 'Y',
            immediateRelative: fam1.immediateRelative || fam1.relatives?.[0],
            otherRelativesInUS: fam1.otherRelativesInUS === 'Y',
            previousSpouse: d.prevSpouse || d.previousSpouse,
            // Work/Education
            occupationCode: we1.occupation,
            occupationExplanation: we1.occupationExplanation,
            employer: we1.employer,
            hasPreviousEmployment: we2.hasPreviousEmployment === 'Y',
            previousEmployment: we2.previousEmployment,
            hasEducation: we2.hasEducation === 'Y',
            education: we2.education,
            languages: we3.languages || ['PORTUGUESE'],
            clanTribe: we3.clanTribe === 'Y', clanTribeName: we3.clanTribeName,
            countriesVisited: we3.countriesVisited === 'Y',
            countriesVisitedList: we3.countriesVisitedList,
            organizationMember: we3.organizationMember === 'Y',
            organizationName: Array.isArray(we3.organizations) ? we3.organizations[0] : we3.organizationName,
            specializedSkills: we3.specializedSkills === 'Y', specializedSkillsExplanation: we3.specializedSkillsExplanation,
            militaryService: we3.militaryService === 'Y',
            military: Array.isArray(we3.military) ? we3.military[0] : we3.military,
            insurgentOrg: we3.insurgentOrg === 'Y', insurgentOrgExplanation: we3.insurgentOrgExplanation,
            // Location
            location: d.location,
        };
    }

    // ============================================================
    // SECURITY PAGES (all NO)
    // ============================================================
    async fillSecurityPage() {
        const radios = $$("input[type='radio']").filter(r => r.id && r.id.match(/_1$/) && !r.checked);
        for (const r of radios) {
            this.humanClick(r);
            await sleep(200);
        }
        console.log(`✅ Security: ${radios.length} radios set to NO`);
        await this.clickNext();
    }

    // ============================================================
    // SECURITY SETUP (new application - set question + answer)
    // ============================================================
    async handleSecuritySetup() {
        console.log("🔐 Setting up security question...");

        // 1. Check privacy act checkbox if present
        const privacyCheck = document.getElementById('ctl00_SiteContentPlaceHolder_chkbxPrivacyAct');
        if (privacyCheck && !privacyCheck.checked) {
            this.humanClick(privacyCheck);
            await sleep(300);
        }

        // 2. Select first security question (use humanSelect for proper ASP.NET event chain)
        const ddl = $("select[id$='_ddlQuestions']");
        if (ddl && ddl.options.length > 1) {
            this.humanSelect(ddl, ddl.options[1].value);
            console.log("✅ Security question selected:", ddl.options[ddl.selectedIndex]?.text);
            await sleep(500);
        }

        // 3. Fill answer (use humanType for proper input event chain)
        const answer = this.app?.security_answer || 'BRAZIL';
        const txtAnswer = $("input[id$='_txtAnswer']");
        if (txtAnswer) {
            this.humanType(txtAnswer, answer);
            console.log("✅ Security answer filled");
        }

        // 4. Capture Application ID if visible on this page
        const appIdEl = $("span[id$='_lblAppID']") || $("span[id$='_ApplicationID']");
        if (appIdEl && appIdEl.innerText.trim()) {
            const appId = appIdEl.innerText.trim();
            console.log("📋 Application ID found:", appId);
            if (this.app) this.app.application_id = appId;
        }

        await sleep(500);

        // 5. Click Continue — use direct click on the submit button
        const btn = document.getElementById('ctl00_SiteContentPlaceHolder_btnContinue')
            || $("input[type=submit][value*='Continue']");
        if (btn) {
            console.log("➡️ Clicking Continue:", btn.id || btn.value);
            this.humanClick(btn);
        } else {
            // Fallback: formPostBack
            this.formPostBack('ctl00$SiteContentPlaceHolder$btnContinue', '');
        }
        console.log("➡️ Security setup submitted");
    }

    // ============================================================
    // CONFIRM APPLICATION ID PAGE
    // ============================================================
    async handleConfirmAppId() {
        console.log("📋 Confirm Application ID page...");

        // Capture the Application ID
        const appIdEl = $("span[id$='_lblAppID']") || $("span[id$='_ApplicationID']")
            || $("span.AppIDLabel") || $("b");
        if (appIdEl) {
            const text = appIdEl.innerText.trim();
            // Extract ID format like AA00XXXXXX
            const match = text.match(/[A-Z]{2}\d{8,}/);
            if (match) {
                console.log("📋 Application ID:", match[0]);
                if (this.app) this.app.application_id = match[0];
                // Save to chrome storage for persistence
                const stored = await chromeGet(['active_application']);
                if (stored.active_application) {
                    stored.active_application.application_id = match[0];
                    await chrome.storage.local.set({ active_application: stored.active_application });
                }
            }
        }

        await sleep(500);

        // Click Continue Application
        const btn = document.getElementById('ctl00_SiteContentPlaceHolder_btnContinueApp')
            || $("input[id$='_btnContinueApp']") || $("a[id$='_btnContinueApp']");
        if (btn) {
            console.log("➡️ Clicking Continue App:", btn.id || btn.value);
            this.humanClick(btn);
        } else {
            this.formPostBack('ctl00$SiteContentPlaceHolder$btnContinueApp', '');
        }
        console.log("➡️ Continue to form...");
    }

    // ============================================================
    // START PAGE (Landing)
    // ============================================================
    async handleStartPage() {
        const location = this.data?.location || this.rawData?.location || 'SPL';
        const select = $("select[id$='_ddlLocation']");
        if (select && select.value !== location) {
            console.log("🌍 Setting location:", location);
            await this.setSelectEl(select, location);
            await this.waitForPostback();
        }

        // Dynamic wait: poll for captcha element instead of fixed sleep
        console.log("⏳ Waiting for captcha element...");
        const captchaReady = await this.waitForElement(
            () => {
                const img = $("img[id*='CaptchaImage']") || $("img[id$='_imgCaptcha']");
                return img && img.naturalWidth > 0 ? img : null;
            },
            30000, 1000 // 30s max, check every 1s
        );
        if (!captchaReady) {
            console.warn("❌ Captcha image never appeared (30s timeout)");
            return;
        }

        // Solve captcha with retry (up to 3 attempts)
        let solved = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`🔑 Captcha attempt ${attempt}/3...`);
            solved = await this.solveCaptcha();
            if (solved) break;
            console.warn(`❌ Attempt ${attempt} failed. ${attempt < 3 ? 'Retrying...' : 'Giving up.'}`);
            if (attempt < 3) await sleep(2000);
        }
        if (!solved) {
            console.error("❌ All captcha attempts failed. Manual action required.");
            return;
        }

        // The lnkNew/lnkRetrieve buttons are <a href="javascript:__doPostBack(...)">
        // CSP blocks javascript: URLs, so we CANNOT use .click() on them.
        // Instead: use form manipulation (set __EVENTTARGET + form.submit)
        const isRetrieve = !!(this.app && this.app.application_id);
        console.log(isRetrieve ? "🔄 Mode: RETRIEVE" : "🆕 Mode: NEW APPLICATION");

        const pbTarget = isRetrieve
            ? 'ctl00$SiteContentPlaceHolder$lnkRetrieve'
            : 'ctl00$SiteContentPlaceHolder$lnkNew';

        // Also try to extract the exact PostBack target from the element's href
        const btnId = isRetrieve
            ? 'ctl00_SiteContentPlaceHolder_lnkRetrieve'
            : 'ctl00_SiteContentPlaceHolder_lnkNew';
        const btn = document.getElementById(btnId);
        if (btn) {
            const extracted = this.extractPostBack(btn);
            if (extracted) {
                console.log("🎯 Extracted PostBack target:", extracted);
                this.formPostBack(extracted, '');
                return;
            }
        }

        console.log("🎯 Using known PostBack target:", pbTarget);
        this.formPostBack(pbTarget, '');
    }

    // ============================================================
    // RETRIEVE PAGE
    // ============================================================
    async handleRetrievePage() {
        if (!this.app?.application_id) return;
        this.setVal("input[id$='_txtApplicationID']", this.app.application_id);
        this.setVal("input[id$='_txtSurname']", (this.data?.surname || "").substring(0, 5));
        this.setVal("input[id$='_txtYear']", this.data?.dob?.year);
        if (this.app.security_answer) this.setVal("input[id$='_txtAnswer']", this.app.security_answer);

        // Dynamic wait for captcha
        console.log("⏳ Retrieve: waiting for captcha...");
        await this.waitForElement(
            () => {
                const img = $("img[id*='CaptchaImage']") || $("img[id$='_imgCaptcha']");
                return img && img.naturalWidth > 0 ? img : null;
            },
            20000, 1000
        );

        // Solve with retry
        let solved = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            solved = await this.solveCaptcha();
            if (solved) break;
            if (attempt < 3) await sleep(2000);
        }
        if (!solved) return;

        console.log("✅ Captcha solved. Submitting retrieve...");

        // Use form manipulation (CSP blocks javascript: URLs on button clicks)
        const btn = document.getElementById('ctl00_SiteContentPlaceHolder_btnRetrieve')
            || $("input[id*='btnRetrieve']");
        if (btn && btn.tagName === 'INPUT') {
            // Input submit buttons can be clicked safely (no javascript: href)
            console.log("🎯 Clicking submit button:", btn.id);
            btn.click();
        } else {
            this.formPostBack('ctl00$SiteContentPlaceHolder$btnRetrieve', '');
        }
    }

    // ============================================================
    // SECURITY SETUP (New App)
    // ============================================================
    async handleSecuritySetup() {
        const ans = this.app?.security_answer || "TEST";
        const sel = $("select[id$='_ddlQuestions']");
        if (sel) { sel.value = "1"; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        this.setVal("input[id$='_txtAnswer']", ans);
        const appIdEl = $("span[id$='_lblAppID']");
        if (appIdEl) console.log("📋 APP ID:", appIdEl.innerText);
        await this.clickNext();
    }

    // ============================================================
    // CAPTCHA SOLVER (CapMonster)
    // ============================================================
    async solveCaptcha() {
        // Find captcha elements (already waited for them in caller)
        const img = $("img[id*='CaptchaImage']") || $("img[id$='_imgCaptcha']");
        const input = $("[id$='_txtCodeTextBox']") || $("input[id$='_txtCode']") || $("input[id$='_txtCaptcha']");
        if (!img || !input) { console.warn("Captcha elements not found"); return false; }
        if (img.naturalWidth === 0) { console.warn("Captcha image not loaded"); return false; }

        const { capmonster_key } = await chromeGet(['capmonster_key']);
        if (!capmonster_key) { alert("DS-160 AI: CapMonster Key não configurada."); return false; }

        try {
            const base64 = await this.getBase64Image(img);
            if (!base64 || base64.length < 100) throw new Error("Falha captura captcha");

            console.log("📤 Sending captcha to CapMonster...");
            const createRes = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "FETCH_PROXY",
                    url: "https://api.capmonster.cloud/createTask",
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientKey: capmonster_key,
                        task: { type: "ImageToTextTask", body: base64.split(',')[1] }
                    })
                }, resolve);
            });
            if (!createRes?.success) throw new Error("CapMonster fetch: " + (createRes?.error || 'failed'));
            const createData = createRes.data;
            if (createData.errorId) throw new Error("CapMonster: " + (createData.errorCode || 'unknown'));
            const taskId = createData.taskId;

            // Poll for result
            for (let i = 0; i < 20; i++) {
                await sleep(2000);
                const pollRes = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "FETCH_PROXY",
                        url: "https://api.capmonster.cloud/getTaskResult",
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clientKey: capmonster_key, taskId })
                    }, resolve);
                });
                if (!pollRes?.success) throw new Error("CapMonster poll fetch: " + (pollRes?.error || 'failed'));
                const result = pollRes.data;
                if (result.status === "ready") {
                    input.value = result.solution.text;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log("✅ Captcha solved:", result.solution.text);
                    return true;
                }
                if (result.errorId) throw new Error("CapMonster poll: " + result.errorCode);
            }
            throw new Error("Captcha timeout (40s)");
        } catch (e) {
            console.error("❌ Captcha error:", e.message);
            return false;
        }
    }

    async getBase64Image(img) {
        try {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            return c.toDataURL("image/png");
        } catch {
            const r = await fetch(img.src);
            const b = await r.blob();
            return new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result); fr.readAsDataURL(b); });
        }
    }

    // Dynamic element waiting (replaces fixed sleep)
    async waitForElement(finderFn, timeoutMs = 15000, intervalMs = 500) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const el = finderFn();
            if (el) return el;
            await sleep(intervalMs);
        }
        return null;
    }

    // ============================================================
    // HELPERS
    // ============================================================
    setVal(selector, value) {
        if (!value) return;
        const el = $(selector);
        if (el) { el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true })); }
    }

    async setSelectEl(el, value) {
        if (!el || !value) return;
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // For <a> tags with href="javascript:__doPostBack(...)", extract the target
    extractPostBack(el) {
        if (!el) return null;
        const href = el.getAttribute('href') || '';
        const onclick = el.getAttribute('onclick') || '';
        const src = href + ' ' + onclick;
        const match = src.match(/__doPostBack\('([^']+)'/);
        return match ? match[1] : null;
    }

    // CSP-safe PostBack: set hidden fields + submit form (no script injection needed)
    formPostBack(target, arg) {
        console.log("📤 formPostBack:", target);
        const eventTarget = document.getElementById('__EVENTTARGET');
        const eventArg = document.getElementById('__EVENTARGUMENT');
        const form = document.getElementById('mainForm')
            || document.getElementById('aspnetForm')
            || document.querySelector('form[method="post"]')
            || document.forms[0];

        if (!eventTarget || !form) {
            console.error("❌ formPostBack: __EVENTTARGET or form not found!");
            return;
        }

        eventTarget.value = target;
        if (eventArg) eventArg.value = arg || '';
        console.log("✅ formPostBack: Submitting form...");
        form.submit();
    }

    // Robust element click - CSP-aware
    async clickElement(el) {
        if (!el) return;

        // Unwrap wrapper divs
        if (!['A', 'INPUT', 'BUTTON'].includes(el.tagName)) {
            const inner = el.querySelector('a, input[type="submit"], input[type="button"], button');
            if (inner) el = inner;
        }

        // For <a> tags with javascript: href, use form PostBack (CSP-safe)
        if (el.tagName === 'A') {
            const pbTarget = this.extractPostBack(el);
            if (pbTarget) {
                console.log("🔧 Link has PostBack href, using formPostBack:", pbTarget);
                this.formPostBack(pbTarget, '');
                return;
            }
        }

        // For <input type="submit"> and <button>, direct click is safe
        try {
            el.removeAttribute('disabled');
            el.click();
            console.log("✅ Direct click:", el.id || el.tagName);
        } catch (e) {
            console.warn("⚠️ Click failed:", e.message);
            // Last resort: dispatch MouseEvent
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
    }

    // Legacy doPostBack - calls formPostBack
    doPostBack(target, arg) {
        this.formPostBack(target, arg);
    }

    async clickNext() {
        await sleep(500);
        const btn = $("input[id$='_btnNext']") ||
            $("input[type=submit][value*='Next']") ||
            $("input[type=submit][value*='Continue']") ||
            $("input[id$='_btnSubmit']") ||
            $("input[id$='_UpdateButton3']");
        if (!btn) {
            console.warn("⚠️ Next button not found!");
            return;
        }

        const urlBefore = window.location.href;
        console.log("➡️ Clicking Next:", btn.id || btn.value);
        btn.click();

        // Wait for URL to change (full navigation) or timeout
        const start = Date.now();
        while (Date.now() - start < 10000) {
            await sleep(300);
            if (window.location.href !== urlBefore) {
                console.log("✅ Page navigated to:", window.location.href);
                return; // Page will reload, auto-resume will take over
            }
        }

        // URL didn't change — likely a validation error
        console.warn("⚠️ No navigation after click. Checking validation errors...");
        const errors = $$("span[style*='color:Red'], span[style*='color: Red'], span[style*='color:red']")
            .map(el => el.textContent?.trim()).filter(Boolean);
        if (errors.length > 0) {
            console.warn("❌ Validation errors:", errors.join(" | "));
        }
    }

    async waitForPostback() {
        // Wait for async postback to complete (ASP.NET UpdatePanel)
        const start = Date.now();
        await sleep(300);
        while (Date.now() - start < 8000) {
            const inPB = window.Sys?.WebForms?.PageRequestManager?.getInstance?.()?.get_isInAsyncPostBack?.();
            if (!inPB) {
                // Wait a bit more for DOM to stabilize
                await sleep(400);
                return;
            }
            await sleep(200);
        }
        console.warn("⚠️ Postback timeout");
    }
}
