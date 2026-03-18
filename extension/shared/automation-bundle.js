// AUTOMATION BUNDLE (LIGHT) — field-maps + normalizeProfile only
// Generated: 2026-03-18T06:49:33.342Z
// NO Playwright dependencies


// ══════ field-map-helpers ══════
/**
 * Field Map Shared Helpers
 * Extraído de b1-b2.js — funções utilitárias usadas por todos os field-maps
 *
 * DS-160 SELECT VALUES (confirmed via logging):
 *   Day selects:   "01", "02", ..., "31" (ZERO-PADDED, 2 digits)
 *   Month selects: "JAN", "FEB", ..., "DEC" (3-letter uppercase abbreviations)
 *   Year fields:   "YYYY" (4-digit text input)
 */

/**
 * Clean phone number: remove non-digits and leading '+'
 */
function ph(s) {
    if (!s) return '';
    if (typeof s === 'object') return ''; // guard against date objects etc.
    return String(s).replace(/[^0-9+]/g, "").replace("+", "");
}

// DS-160 Month selects use 3-letter abbreviations as values
var MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
var MONTH_ABBREV_SET = new Set(MONTH_ABBREV);

/**
 * Normalize a day value. DS-160 Day selects use ZERO-PADDED values: "01"-"31"
 * Input: "5", "05", "15", 5 → Output: "05", "05", "15", "05"
 */
function padDay(v) {
    if (!v) return '';
    var n = parseInt(String(v), 10);
    if (isNaN(n) || n < 1 || n > 31) return String(v);
    return String(n).padStart(2, '0');
}

/**
 * Normalize a month value to DS-160 3-letter abbreviation.
 * DS-160 Month selects use values: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
 * Input can be: 'MAR', '03', '3', 'March', etc.
 */
function normMonth(v) {
    if (!v) return '';
    var s = String(v).trim().toUpperCase();
    // Already a valid abbreviation
    if (MONTH_ABBREV_SET.has(s)) return s;
    // Numeric (1-12 or 01-12) → convert to abbreviation
    var n = parseInt(s, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) return MONTH_ABBREV[n - 1];
    // Full month name → abbreviation (e.g. "January" → "JAN")
    var first3 = s.substring(0, 3);
    if (MONTH_ABBREV_SET.has(first3)) return first3;
    return s;
}

/**
 * Normalize a date object for DS-160 selects.
 * DS-160 selects require: day="01"-"31" (padded), month="JAN"-"DEC", year="YYYY"
 */
function normDate(d) {
    if (!d) return { day: '', month: '', year: '' };
    return {
        day: padDay(d.day),
        month: normMonth(d.month),
        year: d.year ? String(d.year) : '',
    };
}

/**
 * @deprecated — use padDay directly. Kept for backward compat.
 */
function stripZero(v) {
    // Now just delegates to padDay — DS-160 uses zero-padded days
    return padDay(v);
}

/**
 * Empty date placeholder
 */
var emptyDate = { day: '', month: '', year: '' };


// ══════ field-maps-shared ══════
// ============================================================
// SHARED — Common helpers used across all visa field maps
// ============================================================

/**
 * Clean phone number: remove non-digits and leading '+'
 */
function ph(s) {
    return (s || "").replace(/[^0-9+]/g, "").replace("+", "");
}

// ===================================================================
// POSTBACK TRIGGERS (shared across all visa types)
// These IDs tell the filler which selects/clicks trigger ASP.NET
// postbacks and require waiting for page reload before continuing
// ===================================================================
var POSTBACK_SELECT_IDS = [
    "CNTRY", "Country", "PurposeOfTrip", "VisaClass", "OtherPurpose",
    "Occupation", "PPT_TYPE", "REL_TO_APP", "POC_REL", "SocialMedia",
    "MARITAL_STATUS", "APP_GENDER",
    "WhoIsPaying", "PayerRelationship",
    "SpouseNatDropDownList", "SpouseAddressType", "SpousePOBCountry",
];

var POSTBACK_CLICK_YES_IDS = [
    "PreviouslyEmployed", "AttendedEduc", "OtherEduc", "OTH_NATL",
    "OtherNames", "TelecodeQuestion", "PermResOtherCntryInd",
    "OtherPersonsTravelingWithYou", "GroupTravel",
    "PREV_US_TRAVEL_IND", "PREV_US_DRIVER_LIC_IND", "PREV_VISA_IND", "PREV_VISA_REFUSED_IND", "IV_PETITION_IND", "PERM_RESIDENT_IND", "VWP_DENIAL_IND",
    "AddPhone", "AddEmail", "AddSocial", "AddSite",
    "LOST_PPT_IND",
    "FATHER_LIVE_IN_US_IND", "MOTHER_LIVE_IN_US_IND",
    "CLAN_TRIBE_IND", "COUNTRIES_VISITED_IND", "ORGANIZATION_IND",
    "SPECIALIZED_SKILLS_IND", "MILITARY_SERVICE_IND", "INSURGENT_ORG_IND",
    "OTHER_PPT_IND", "PayerAddrSameAsInd",
    "PREV_VISA_LOST", "PREV_VISA_CANCELLED",
    "OTHER_RELATIVE_IND",
];

var POSTBACK_CLICK_ANY_IDS = [
    "SpecificTravel",
    "IMMED_RELATIVE",
    "MailingAddrSame", "MailingAddr",
];

function isPostbackSelect(fieldId) {
    return POSTBACK_SELECT_IDS.some((trigger) => fieldId.includes(trigger));
}

function isPostbackClick(fieldId, fieldType) {
    if (fieldType !== "radio") return false;
    if (POSTBACK_CLICK_YES_IDS.some((t) => fieldId.includes(t))) return true;
    if (POSTBACK_CLICK_ANY_IDS.some((t) => fieldId.includes(t))) return true;
    return false;
}


// ══════ page-01-location ══════
// ============================================================
// Location — Field map (embassy selection)
// This page has only the location/embassy dropdown, no complex mapping needed
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Field map entries (empty — location is set at application start)
 */
function buildLocationMap(a, ctx) {
    // Location/embassy is typically pre-selected at application start,
    // not filled via the field map. Return empty.
    return [];
}


// ══════ page-02-personal1 ══════
// ============================================================
// Personal 1 — Names, telecode, gender, DOB
// Field map for 02-personal1
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPersonal1Map(a, ctx) {
    var map = [];

    // ===================================================================
    // PERSONAL 1 (order matches official DS-160 form hierarchy)
    // ===================================================================
    // 1. Name fields
    map.push(
      { pattern: /tbxAPP_SURNAME$/i, value: a.surname, type: "text" },
      { pattern: /tbxAPP_GIVEN_NAME$/i, value: a.givenName, type: "text" },
      { pattern: /tbxAPP_FULL_NAME_NATIVE$/i, value: a.fullNameNative, type: "text" },
    );
    
    // 2. Other Names (DListAlias) — supports multiple entries via "Add Another"
    // Pergunta: "Have you ever used other names?" → Yes/No
    // Respostas: otherNames[0] (ctl00), otherNames[1] (ctl01 → addAnother), ...
    if (a.otherNamesUsed && a.otherNames?.length) {
      map.push({ pattern: /rblOtherNames_0$/i, value: "", type: "click" });
    
      a.otherNames.forEach((entry, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "DListAlias", idx };
    
        map.push(
          { pattern: new RegExp(`DListAlias_${ctl}_tbxSURNAME$`, 'i'), value: entry.surname || "", ...base },
          { pattern: new RegExp(`DListAlias_${ctl}_tbxGIVEN_NAME$`, 'i'), value: entry.givenName || "", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblOtherNames_1$/i, value: "", type: "click" });
    }
    
    // 3. Telecode (before Gender/MaritalStatus in official form)
    if (a.telecode && a.telecodeSurname) {
      map.push(
        { pattern: /rblTelecodeQuestion_0$/i, value: "", type: "click" },
        { pattern: /tbxAPP_TelecodeSURNAME$/i, value: a.telecodeSurname, type: "text" },
        { pattern: /tbxAPP_TelecodeGIVEN_NAME$/i, value: a.telecodeGivenName || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblTelecodeQuestion_1$/i, value: "", type: "click" });
    }
    
    // 4. Gender + Marital Status
    map.push(
      { pattern: /ddlAPP_GENDER$/i, value: a.sex, type: "select" },
      { pattern: /ddlAPP_MARITAL_STATUS$/i, value: a.maritalStatus, type: "select" },
    );
    
    // 5. Other Marital Status (conditional, appears after MaritalStatus='O')
    if (a.maritalStatus === "O" && a.otherMaritalStatusText) {
      map.push({ pattern: /tbxOtherMaritalStatus$/i, value: a.otherMaritalStatusText, type: "text" });
    }
    
    // 6. Date and Place of Birth
    map.push(
      { pattern: /ddlDOBDay$/i, value: a.dob.day, type: "select" },
      { pattern: /ddlDOBMonth$/i, value: a.dob.month, type: "select" },
      { pattern: /tbxDOBYear$/i, value: a.dob.year, type: "text" },
      { pattern: /tbxAPP_POB_CITY$/i, value: a.cityOfBirth, type: "text" },
      { pattern: /tbxAPP_POB_ST_PROVINCE$/i, value: a.stateOfBirth, type: "text" },
      { pattern: /ddlAPP_POB_CNTRY$/i, value: a.countryOfBirth, type: "select-label" },
    );

    return map;
}


// ══════ page-03-personal2 ══════
// ============================================================
// Personal 2 — Nationality, perm resident, IDs
// Field map for 03-personal2
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPersonal2Map(a, ctx) {
    var map = [];

    // ===================================================================
    // PERSONAL 2 (order matches official DS-160 form hierarchy)
    // ===================================================================
    // 1. Nationality
    map.push(
      { pattern: /ddlAPP_NATL$/i, value: a.nationality, type: "select-label" },
    );
    
    // 2. Other Nationality — supports multiple entries via "Add Another"
    if (a.otherNationality && a.otherNationalities?.length > 0) {
      map.push({ pattern: /rblAPP_OTH_NATL_IND_0$/i, value: "", type: "click" });
    
      a.otherNationalities.forEach((entry, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`; // ctl00, ctl01, ctl02...
        // For idx > 0, mark that Add Another must be clicked first
        if (idx > 0) {
          map.push({
            pattern: new RegExp(`dtlOTHER_NATL_${ctl}_ddlOTHER_NATL$`, 'i'),
            value: entry.country || "",
            type: "select-label",
            addAnother: { list: "dtlOTHER_NATL", buttonPattern: /btnAdd.*NATL|lnkAdd.*NATL|btnAddOTHER_NATL/i, idx }
          });
        } else {
          map.push({ pattern: new RegExp(`dtlOTHER_NATL_${ctl}_ddlOTHER_NATL$`, 'i'), value: entry.country || "", type: "select-label" });
        }
    
        // Passport for this nationality
        if (entry.hasPassport === 'Y') {
          map.push(
            { pattern: new RegExp(`dtlOTHER_NATL_${ctl}_rblOTHER_PPT_IND_0$`, 'i'), value: "", type: "click" },
            { pattern: new RegExp(`dtlOTHER_NATL_${ctl}_tbxOTHER_PPT_NUM$`, 'i'), value: entry.passportNumber || "", type: "text" },
          );
        } else {
          map.push({ pattern: new RegExp(`dtlOTHER_NATL_${ctl}_rblOTHER_PPT_IND_1$`, 'i'), value: "", type: "click" });
        }
      });
    } else {
      map.push({ pattern: /rblAPP_OTH_NATL_IND_1$/i, value: "", type: "click" });
    }
    
    // 3. Permanent Resident Other Country — supports multiple entries via "Add Another"
    if (a.permanentResidentOtherCountry && a.permanentResidentCountries?.length > 0) {
      map.push({ pattern: /rblPermResOtherCntryInd_0$/i, value: "", type: "click" });
    
      a.permanentResidentCountries.forEach((entry, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        if (idx > 0) {
          map.push({
            pattern: new RegExp(`dtlOthPermResCntry_${ctl}_ddlOthPermResCntry$`, 'i'),
            value: entry.country || "",
            type: "select-label",
            addAnother: { list: "dtlOthPermResCntry", buttonPattern: /btnAdd.*PermRes|lnkAdd.*PermRes|btnAddPerm/i, idx }
          });
        } else {
          map.push({ pattern: new RegExp(`dtlOthPermResCntry_${ctl}_ddlOthPermResCntry$`, 'i'), value: entry.country || "", type: "select-label" });
        }
      });
    } else {
      map.push({ pattern: /rblPermResOtherCntryInd_1$/i, value: "", type: "click" });
    }
    
    // 4. National ID (CPF)
    map.push(
      { pattern: /tbxAPP_NATIONAL_ID$/i, value: a.nationalId, type: "text" },
    );
    
    // 5. SSN
    if (a.usSsn) {
      map.push({ pattern: /tbxAPP_SSN1$/i, value: a.usSsn.slice(0, 3), type: "text" });
      map.push({ pattern: /tbxAPP_SSN2$/i, value: a.usSsn.slice(3, 5), type: "text" });
      map.push({ pattern: /tbxAPP_SSN3$/i, value: a.usSsn.slice(5, 9), type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_SSN_NA$/i, value: "", type: "checkbox-check" });
    }
    
    // 6. Tax ID
    if (a.usTaxpayerId) {
      map.push({ pattern: /tbxAPP_TAX_ID$/i, value: a.usTaxpayerId, type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_TAX_ID_NA$/i, value: "", type: "checkbox-check" });
    }

    return map;
}


// ══════ page-04-travel ══════
// ============================================================
// Travel — Purpose, dates, US address, payer
// Field map for 04-travel
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildTravelMap(a, ctx) {
    var map = [];
    var { t, payer } = ctx;

    // ===================================================================
    // TRAVEL
    // ===================================================================
    // Purpose of trip: all values must come from JSON
    map.push(
      { pattern: /ddlPurposeOfTrip$/i, value: a.purposeCategory, type: "select" },
      { pattern: /ddlOtherPurpose$/i, value: (a.purposeSubCategory || a.purposeOfTrip || '').replace(/\//g, '-'), type: "select" },
      { pattern: /ddlVisaClass$/i, value: a.purposeOfTrip, type: "select-search" },
    );

    // ===================================================================
    // CONDITIONAL FIELDS — appear below Specify for O visa types
    // ds160map confirms: F1/J1 do NOT show extra fields on Travel page
    // ===================================================================
    // Application Receipt/Petition Number — O1, O2, O3 only
    var needsPetitionNum = /^(O1|O2|O3)/i.test(a.purposeSubCategory || '');
    // Principal Applicant Info — F2, J2, O3 (dependents)
    var isDependentVisa = /^(F2|J2|O3)/i.test(a.purposeSubCategory || '');

    if (needsPetitionNum) {
      map.push({
        pattern: /tbxPRIN_APP_PETITION_NUM$/i,
        value: a.petitionNumber || '',
        type: 'text',
        description: 'Application Receipt/Petition Number (maxlen=13)'
      });
    }

    if (isDependentVisa) {
      // Principal Applicant Surnames + Given Names (for dependent visas)
      map.push(
        {
          pattern: /tbxPrincipleAppSurname$/i,
          value: a.principalSurname || '',
          type: 'text',
          description: 'Principal Applicant Surnames (maxlen=33)'
        },
        {
          pattern: /tbxPrincipleAppGivenName$/i,
          value: a.principalGivenName || '',
          type: 'text',
          description: 'Principal Applicant Given Names (maxlen=33)'
        }
      );
    }
    
    // Specific Travel Plans
    // Pergunta: "Do you have specific travel plans?" → Yes/No
    // Respostas: specificLocations[0] (ctl00), specificLocations[1] (ctl01 → addAnother), ...
    if (a.hasSpecificPlans) {
      map.push(
        { pattern: /rblSpecificTravel_0$/i, value: "", type: "click" },
      );
      // Travel Locations (dtlTravelLoc) — supports multiple entries
      var rawLocs = a.specificLocations || [t.location || t.usAddress?.city || ''];
      // Extract string from objects: {location:'DISNEY'} → 'DISNEY'
      var travelLocs = rawLocs
        .map(loc => typeof loc === 'object' ? (loc.location || loc.name || '') : String(loc || ''))
        .filter(loc => loc.trim() !== '');
      travelLocs.forEach((loc, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "dtlTravelLoc", idx };
        map.push({ pattern: new RegExp(`dtlTravelLoc_${ctl}_tbxSPECTRAVEL_LOCATION$`, 'i'), value: loc, ...base });
      });
      // Also push generic pattern for ctl00 fallback
      if (travelLocs.length === 1) {
        map.push({ pattern: /tbxSPECTRAVEL_LOCATION$/i, value: travelLocs[0], type: "text" });
      }
      if (t.arrivalFlight) map.push({ pattern: /tbxArriveFlight$/i, value: t.arrivalFlight, type: "text" });
      if (t.arrivalCity) map.push({ pattern: /tbxArriveCity$/i, value: t.arrivalCity, type: "text" });
      if (t.departureFlight) map.push({ pattern: /tbxDepartFlight$/i, value: t.departureFlight, type: "text" });
      if (t.departureCity) map.push({ pattern: /tbxDepartCity$/i, value: t.departureCity, type: "text" });
    } else {
      map.push({ pattern: /rblSpecificTravel_1$/i, value: "", type: "click" });
    }
    
    // US Address — ALWAYS required by DS-160 on Travel page
    if (t.usAddress) {
      map.push(
        { pattern: /tbxStreetAddress1$/i, value: t.usAddress.street1 || "", type: "text" },
        { pattern: /tbxStreetAddress2$/i, value: t.usAddress.street2 || "", type: "text" },
        { pattern: /tbxCity$/i, value: t.usAddress.city || "", type: "text" },
        { pattern: /ddlTravelState$/i, value: t.usAddress.state || "", type: "select" },
        { pattern: /tbxZIPCode$/i, value: t.usAddress.zip || "", type: "text" },
        { pattern: /tbZIPCode$/i, value: t.usAddress.zip || "", type: "text" },
      );
    }
    
    // Arrival date & length of stay — ALWAYS required by DS-160
    // IDs differ between specific plans (ARRIVAL_US_DTE, APP_LOS) and no specific plans (TRAVEL_DTE, TRAVEL_LOS)
    if (t.arrivalDate) {
      map.push(
        { pattern: /ddlARRIVAL_US_DTEDay$/i, value: t.arrivalDate.day, type: "select" },
        { pattern: /ddlARRIVAL_US_DTEMonth$/i, value: t.arrivalDate.month, type: "select" },
        { pattern: /tbxARRIVAL_US_DTEYear$/i, value: t.arrivalDate.year, type: "text" },
        // Alt IDs when no specific plans
        { pattern: /ddlTRAVEL_DTEDay$/i, value: t.arrivalDate.day, type: "select" },
        { pattern: /ddlTRAVEL_DTEMonth$/i, value: t.arrivalDate.month, type: "select" },
        { pattern: /tbxTRAVEL_DTEYear$/i, value: t.arrivalDate.year, type: "text" },
      );
    }
    if (t.lengthOfStay) {
      map.push(
        { pattern: /tbxAPP_LOS_AMT$/i, value: t.lengthOfStay.value, type: "text" },
        { pattern: /ddlAPP_LOS_CD$/i, value: t.lengthOfStay.unit, type: "select" },
        // Alt IDs when no specific plans
        { pattern: /tbxTRAVEL_LOS$/i, value: t.lengthOfStay.value, type: "text" },
        { pattern: /ddlTRAVEL_LOS_CD$/i, value: t.lengthOfStay.unit, type: "select" },
      );
    }
    if (t.departureDate) {
      map.push(
        { pattern: /ddlDEPARTURE_US_DTEDay$/i, value: t.departureDate.day, type: "select" },
        { pattern: /ddlDEPARTURE_US_DTEMonth$/i, value: t.departureDate.month, type: "select" },
        { pattern: /tbxDEPARTURE_US_DTEYear$/i, value: t.departureDate.year, type: "text" },
      );
    }
    
    // Who is paying
    map.push({ pattern: /ddlWhoIsPaying$/i, value: a.payingForTrip, type: "select" });
    
    if (a.payingForTrip === "O" && payer) {
      // Other Person paying
      map.push(
        { pattern: /tbxPayerSurname$/i, value: payer.surname || "", type: "text" },
        { pattern: /tbxPayerGivenName$/i, value: payer.givenName || "", type: "text" },
        { pattern: /tbxPayerPhone$/i, value: ph(payer.phone), type: "text" },
      );
      if (payer.email) {
        map.push({ pattern: /tbxPAYER_EMAIL_ADDR$/i, value: payer.email, type: "text" });
      } else {
        map.push({ pattern: /cbxDNAPAYER_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" });
      }
      if (payer.relationship) {
        map.push({ pattern: /ddlPayerRelationship$/i, value: payer.relationship, type: "select" });
      }
      if (payer.sameAddress === 'Y' || payer.sameAddress === true) {
        map.push({ pattern: /rblPayerAddrSameAsInd_0$/i, value: "", type: "click" });
      } else {
        map.push(
          { pattern: /rblPayerAddrSameAsInd_1$/i, value: "", type: "click" },
          { pattern: /tbxPayerStreetAddress1$/i, value: payer.street1 || "", type: "text" },
          { pattern: /tbxPayerStreetAddress2$/i, value: payer.street2 || "", type: "text" },
          { pattern: /tbxPayerCity$/i, value: payer.city || "", type: "text" },
          { pattern: /tbxPayerStateProvince$/i, value: payer.state || "", type: "text" },
          { pattern: /tbxPayerPostalZIPCode$/i, value: payer.postalCode || "", type: "text" },
          { pattern: /ddlPayerCountry$/i, value: payer.country || "", type: "select-label" },
        );
      }
    } else if ((a.payingForTrip === "C" || a.payingForTrip === "P" || a.payingForTrip === "H") && payer) {
      // Company / Present Employer / US Petitioner paying (all share same fields)
      map.push(
        { pattern: /tbxPayingCompany$/i, value: payer.companyName || "", type: "text" },
        { pattern: /tbxPayerPhone$/i, value: ph(payer.phone), type: "text" },
        { pattern: /tbxCompanyRelation$/i, value: payer.companyRelation || "", type: "text" },
        { pattern: /tbxPayerStreetAddress1$/i, value: payer.street1 || "", type: "text" },
        { pattern: /tbxPayerStreetAddress2$/i, value: payer.street2 || "", type: "text" },
        { pattern: /tbxPayerCity$/i, value: payer.city || "", type: "text" },
        { pattern: /tbxPayerStateProvince$/i, value: payer.state || "", type: "text" },
        { pattern: /tbxPayerPostalZIPCode$/i, value: payer.postalCode || "", type: "text" },
        { pattern: /ddlPayerCountry$/i, value: payer.country || "", type: "select-label" },
      );
    }

    return map;
}


// ══════ page-05-travel-companions ══════
// ============================================================
// Travel Companions
// Field map for 05-travel-companions
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildTravelCompanionsMap(a, ctx) {
    var map = [];

    // ===================================================================
    // TRAVEL COMPANIONS
    // ===================================================================
    // Travel Companions (dlTravelCompanions) — supports multiple entries
    // Pergunta: "Are there other persons traveling with you?" → Yes/No
    // Respostas: companions[0] (ctl00), companions[1] (ctl01 → addAnother), ...
    if (a.travelingWithOthers && a.companions?.length) {
      map.push({ pattern: /rblOtherPersonsTravelingWithYou_0$/i, value: "", type: "click" });
    
      a.companions.forEach((comp, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dlTravelCompanions", idx };
    
        map.push(
          // DS-160 real uses tbxSurname (NOT tbxTC_SURNAME) inside dlTravelCompanions
          { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxSurname$`, 'i'), value: comp.surname || "", type: "text", ...base },
          { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_SURNAME$`, 'i'), value: comp.surname || "", type: "text", ...base },
          // DS-160 uses tbxGivenName (NOT tbxTC_GIVEN_NAME) for travel companions
          { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxGivenName$`, 'i'), value: comp.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_GIVEN_NAME$`, 'i'), value: comp.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`dlTravelCompanions_${ctl}_ddlTCRelationship$`, 'i'), value: comp.relationship || "", type: "select", ...base },
        );
        // Fallback específico para ctl00 — MUST be qualified to avoid matching ctl01+
        if (idx === 0) {
          map.push(
            { pattern: /dlTravelCompanions_ctl00_tbxSurname$/i, value: comp.surname || "", type: "text" },
            { pattern: /dlTravelCompanions_ctl00_tbxTC_SURNAME$/i, value: comp.surname || "", type: "text" },
            { pattern: /dlTravelCompanions_ctl00_tbxGivenName$/i, value: comp.givenName || "", type: "text" },
            { pattern: /dlTravelCompanions_ctl00_tbxTC_GIVEN_NAME$/i, value: comp.givenName || "", type: "text" },
            { pattern: /dlTravelCompanions_ctl00_ddlTCRelationship$/i, value: comp.relationship || "", type: "select" },
          );
        }
      });
    
      if ((a.partOfGroup === 'Y' || a.partOfGroup === true) && a.groupName) {
        map.push(
          { pattern: /rblGroupTravel_0$/i, value: "", type: "click" },
          { pattern: /tbxGroupName$/i, value: a.groupName, type: "text" },
        );
      } else {
        map.push({ pattern: /rblGroupTravel_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblOtherPersonsTravelingWithYou_1$/i, value: "", type: "click" });
      map.push({ pattern: /rblGroupTravel_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-06-previous-us-travel ══════
// ============================================================
// Previous US Travel — Visits, DL, visas, refusals
// Field map for 06-previous-us-travel
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPreviousUSTravelMap(a, ctx) {
    var map = [];

    // ===================================================================
    // PREVIOUS US TRAVEL
    // ===================================================================
    // Has been in US? — supports multiple visits via addAnother
    var previousVisits = a.previousVisits || (a.previousUSVisit ? [a.previousUSVisit] : []);
    if (a.hasBeenInUS && previousVisits.length > 0) {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" });
    
      previousVisits.forEach((pv, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlPREV_US_VISIT", idx };
        var ad = pv.arrivalDate || {};
    
        map.push(
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEDay$`, 'i'), value: padDay(ad.day), type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEMonth$`, 'i'), value: ad.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_DTEYear$`, 'i'), value: ad.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_LOS$`, 'i'), value: pv.lengthOfStay || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_LOS_CD$`, 'i'), value: pv.lengthOfStayUnit || "", type: "select", ...base },
        );
      });
      // Generic fallback for ctl00
      if (previousVisits.length === 1) {
        var pv = previousVisits[0];
        var ad = pv.arrivalDate || {};
        map.push(
          { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: padDay(ad.day), type: "select" },
          { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: ad.month, type: "select" },
          { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: ad.year, type: "text" },
          { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
          { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
        );
      }
    
      // Driver's licenses — supports multiple via addAnother
      var driversLicenses = a.driversLicenses || (a.previousUSDriversLicenseNumber ? [{ number: a.previousUSDriversLicenseNumber, state: a.previousUSDriversLicenseState }] : []);
      if (a.previousUSDriversLicense && driversLicenses.length > 0) {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" });
    
        driversLicenses.forEach((dl, idx) => {
          var ctl = `ctl${String(idx).padStart(2, '0')}`;
          var base = {};
          if (idx > 0) base.addAnother = { list: "dtlUS_DRIVER_LICENSE", idx };
    
          map.push(
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_tbxUS_DRIVER_LICENSE$`, 'i'), value: dl.number || "", type: "text", ...base },
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_ddlUS_DRIVER_LICENSE_STATE$`, 'i'), value: dl.state || "", type: "select", ...base },
          );
        });
        // Generic fallback for ctl00
        if (driversLicenses.length === 1) {
          map.push(
            { pattern: /tbxUS_DRIVER_LICENSE$/i, value: driversLicenses[0].number || "", type: "text" },
            { pattern: /ddlUS_DRIVER_LICENSE_STATE$/i, value: driversLicenses[0].state || "", type: "select" },
          );
        }
      } else {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" });
    }
    
    // Has previous visa?
    if (a.hasUSVisa && a.previousVisa) {
      var visa = a.previousVisa;
      map.push(
        { pattern: /rblPREV_VISA_IND_0$/i, value: "", type: "click" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEDay$/i, value: visa.issueDate.day, type: "select" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEMonth$/i, value: visa.issueDate.month, type: "select" },
        { pattern: /tbxPREV_VISA_ISSUED_DTEYear$/i, value: visa.issueDate.year, type: "text" },
      );
      if (visa.numberNA) {
        map.push({ pattern: /cbexPREV_VISA_FOIL_NUMBER_NA$/i, value: "", type: "checkbox-check" });
      } else {
        map.push({ pattern: /tbxPREV_VISA_FOIL_NUMBER$/i, value: visa.number, type: "text" });
      }
      map.push(
        { pattern: visa.sameType ? /rblPREV_VISA_SAME_TYPE_IND_0$/i : /rblPREV_VISA_SAME_TYPE_IND_1$/i, value: "", type: "click" },
        { pattern: visa.sameCountry ? /rblPREV_VISA_SAME_CNTRY_IND_0$/i : /rblPREV_VISA_SAME_CNTRY_IND_1$/i, value: "", type: "click" },
        { pattern: visa.tenPrint ? /rblPREV_VISA_TEN_PRINT_IND_0$/i : /rblPREV_VISA_TEN_PRINT_IND_1$/i, value: "", type: "click" },
        { pattern: visa.lost ? /rblPREV_VISA_LOST_IND_0$/i : /rblPREV_VISA_LOST_IND_1$/i, value: "", type: "click" },
      );
      // Visa Lost conditional fields (appear after rblPREV_VISA_LOST_IND = Yes postback)
      if (visa.lost) {
        if (visa.lostYear) map.push({ pattern: /tbxPREV_VISA_LOST_YEAR$/i, value: visa.lostYear, type: "text" });
        if (visa.lostExplanation) map.push({ pattern: /tbxPREV_VISA_LOST_EXPL$/i, value: visa.lostExplanation, type: "text" });
      }
      map.push(
        { pattern: visa.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
      );
      // Visa Cancelled conditional fields (appear after rblPREV_VISA_CANCELLED_IND = Yes postback)
      if (visa.cancelled && visa.cancelledExplanation) {
        map.push(
          { pattern: /tbxPREV_VISA_CANCELLED_EXPL$/i, value: visa.cancelledExplanation, type: "text" },
        );
      }
    } else {
      map.push({ pattern: /rblPREV_VISA_IND_1$/i, value: "", type: "click" });
    }
    
    // Visa refused?
    if (a.visaRefused) {
      map.push(
        { pattern: /rblPREV_VISA_REFUSED_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPREV_VISA_REFUSED_EXPL$/i, value: a.visaRefusedExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPREV_VISA_REFUSED_IND_1$/i, value: "", type: "click" });
    }
    
    // Immigrant petition?
    if (a.immigrantPetition) {
      map.push(
        { pattern: /rblIV_PETITION_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxIV_PETITION_EXPL$/i, value: a.immigrantPetitionExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblIV_PETITION_IND_1$/i, value: "", type: "click" });
    }
    
    // Permanent Resident?
    if (a.permanentResident) {
      map.push(
        { pattern: /rblPERM_RESIDENT_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPERM_RESIDENT_EXPL$/i, value: a.permanentResidentExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPERM_RESIDENT_IND_1$/i, value: "", type: "click" });
    }
    
    // VWP (Visa Waiver Program) denial?
    if (a.vwpDenial) {
      map.push(
        { pattern: /rblVWP_DENIAL_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxVWP_DENIAL_EXPL$/i, value: a.vwpDenialExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblVWP_DENIAL_IND_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-07-address-phone ══════
// ============================================================
// Address & Phone — Home, mailing, phones, email, social media
// Field map for 07-address-phone
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildAddressPhoneMap(a, ctx) {
    var map = [];
    var { addr } = ctx;

    // ===================================================================
    // SOCIAL MEDIA (dtlSocial DataList on AddressPhone page)
    // ===================================================================
    // DS-160 valid platform codes: ASKF, DUBN, FCBK, FLKR, GOGL, INST, LINK,
    //   MYSP, PTST, QZNE, RDDT, SWBO, TWBO, TUMB, TWIT, TWOO, VINE, VKON, YUKU, YTUB, NONE
    // Note: TikTok and Telegram are NOT available in DS-160.
    // The select ddlSocialMedia does a postback when changed — after postback,
    // tbxSocialMediaIdent is enabled and can be filled.
    if (a.socialMedia?.length > 0) {
      a.socialMedia.forEach((sm, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlSocial", idx };
    
        map.push(
          { pattern: new RegExp(`dtlSocial_${ctl}_ddlSocialMedia$`, 'i'), value: sm.platform || "", type: "select", ...base },
          { pattern: new RegExp(`dtlSocial_${ctl}_tbxSocialMediaIdent$`, 'i'), value: sm.handle || "", type: "text", ...base },
        );
      });
      // Fallback for ctl00 (first entry)
      map.push(
        { pattern: /ddlSocialMedia$/i, value: a.socialMedia[0]?.platform || "", type: "select" },
        { pattern: /tbxSocialMediaIdent$/i, value: a.socialMedia[0]?.handle || "", type: "text" },
      );
    } else {
      // No social media — select NONE
      map.push({ pattern: /ddlSocialMedia$/i, value: "NONE", type: "select" });
    }
    
    // ===================================================================
    // PREVIOUS US TRAVEL
    // ===================================================================
    // Has been in US? — supports multiple visits via addAnother
    var previousVisits = a.previousVisits || (a.previousUSVisit ? [a.previousUSVisit] : []);
    if (a.hasBeenInUS && previousVisits.length > 0) {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" });
    
      previousVisits.forEach((pv, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlPREV_US_VISIT", idx };
        var ad = pv.arrivalDate || {};
    
        map.push(
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEDay$`, 'i'), value: padDay(ad.day), type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEMonth$`, 'i'), value: ad.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_DTEYear$`, 'i'), value: ad.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_tbxPREV_US_VISIT_LOS$`, 'i'), value: pv.lengthOfStay || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_LOS_CD$`, 'i'), value: pv.lengthOfStayUnit || "", type: "select", ...base },
        );
      });
      // Generic fallback for ctl00
      if (previousVisits.length === 1) {
        var pv = previousVisits[0];
        var ad = pv.arrivalDate || {};
        map.push(
          { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: padDay(ad.day), type: "select" },
          { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: ad.month, type: "select" },
          { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: ad.year, type: "text" },
          { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
          { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
        );
      }
    
      // Driver's licenses — supports multiple via addAnother
      var driversLicenses = a.driversLicenses || (a.previousUSDriversLicenseNumber ? [{ number: a.previousUSDriversLicenseNumber, state: a.previousUSDriversLicenseState }] : []);
      if (a.previousUSDriversLicense && driversLicenses.length > 0) {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" });
    
        driversLicenses.forEach((dl, idx) => {
          var ctl = `ctl${String(idx).padStart(2, '0')}`;
          var base = {};
          if (idx > 0) base.addAnother = { list: "dtlUS_DRIVER_LICENSE", idx };
    
          map.push(
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_tbxUS_DRIVER_LICENSE$`, 'i'), value: dl.number || "", type: "text", ...base },
            { pattern: new RegExp(`dtlUS_DRIVER_LICENSE_${ctl}_ddlUS_DRIVER_LICENSE_STATE$`, 'i'), value: dl.state || "", type: "select", ...base },
          );
        });
        // Generic fallback for ctl00
        if (driversLicenses.length === 1) {
          map.push(
            { pattern: /tbxUS_DRIVER_LICENSE$/i, value: driversLicenses[0].number || "", type: "text" },
            { pattern: /ddlUS_DRIVER_LICENSE_STATE$/i, value: driversLicenses[0].state || "", type: "select" },
          );
        }
      } else {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" });
    }
    
    // Has previous visa?
    if (a.hasUSVisa && a.previousVisa) {
      var visa = a.previousVisa;
      map.push(
        { pattern: /rblPREV_VISA_IND_0$/i, value: "", type: "click" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEDay$/i, value: visa.issueDate.day, type: "select" },
        { pattern: /ddlPREV_VISA_ISSUED_DTEMonth$/i, value: visa.issueDate.month, type: "select" },
        { pattern: /tbxPREV_VISA_ISSUED_DTEYear$/i, value: visa.issueDate.year, type: "text" },
      );
      if (visa.numberNA) {
        map.push({ pattern: /cbexPREV_VISA_FOIL_NUMBER_NA$/i, value: "", type: "checkbox-check" });
      } else {
        map.push({ pattern: /tbxPREV_VISA_FOIL_NUMBER$/i, value: visa.number, type: "text" });
      }
      map.push(
        { pattern: visa.sameType ? /rblPREV_VISA_SAME_TYPE_IND_0$/i : /rblPREV_VISA_SAME_TYPE_IND_1$/i, value: "", type: "click" },
        { pattern: visa.sameCountry ? /rblPREV_VISA_SAME_CNTRY_IND_0$/i : /rblPREV_VISA_SAME_CNTRY_IND_1$/i, value: "", type: "click" },
        { pattern: visa.tenPrint ? /rblPREV_VISA_TEN_PRINT_IND_0$/i : /rblPREV_VISA_TEN_PRINT_IND_1$/i, value: "", type: "click" },
        { pattern: visa.lost ? /rblPREV_VISA_LOST_IND_0$/i : /rblPREV_VISA_LOST_IND_1$/i, value: "", type: "click" },
      );
      // Visa Lost conditional fields (appear after rblPREV_VISA_LOST_IND = Yes postback)
      if (visa.lost) {
        if (visa.lostYear) map.push({ pattern: /tbxPREV_VISA_LOST_YEAR$/i, value: visa.lostYear, type: "text" });
        if (visa.lostExplanation) map.push({ pattern: /tbxPREV_VISA_LOST_EXPL$/i, value: visa.lostExplanation, type: "text" });
      }
      map.push(
        { pattern: visa.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
      );
      // Visa Cancelled conditional fields (appear after rblPREV_VISA_CANCELLED_IND = Yes postback)
      if (visa.cancelled && visa.cancelledExplanation) {
        map.push(
          { pattern: /tbxPREV_VISA_CANCELLED_EXPL$/i, value: visa.cancelledExplanation, type: "text" },
        );
      }
    } else {
      map.push({ pattern: /rblPREV_VISA_IND_1$/i, value: "", type: "click" });
    }
    
    // Visa refused?
    if (a.visaRefused) {
      map.push(
        { pattern: /rblPREV_VISA_REFUSED_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPREV_VISA_REFUSED_EXPL$/i, value: a.visaRefusedExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPREV_VISA_REFUSED_IND_1$/i, value: "", type: "click" });
    }
    
    // Immigrant petition?
    if (a.immigrantPetition) {
      map.push(
        { pattern: /rblIV_PETITION_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxIV_PETITION_EXPL$/i, value: a.immigrantPetitionExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblIV_PETITION_IND_1$/i, value: "", type: "click" });
    }
    
    // Permanent Resident?
    if (a.permanentResident) {
      map.push(
        { pattern: /rblPERM_RESIDENT_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxPERM_RESIDENT_EXPL$/i, value: a.permanentResidentExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblPERM_RESIDENT_IND_1$/i, value: "", type: "click" });
    }
    
    // VWP (Visa Waiver Program) denial?
    if (a.vwpDenial) {
      map.push(
        { pattern: /rblVWP_DENIAL_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxVWP_DENIAL_EXPL$/i, value: a.vwpDenialExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblVWP_DENIAL_IND_1$/i, value: "", type: "click" });
    }
    
    // ===================================================================
    // ADDRESS & PHONE
    // ===================================================================
    map.push(
      { pattern: /tbxAPP_ADDR_LN1$/i, value: addr.street1, type: "text" },
      { pattern: /tbxAPP_ADDR_LN2$/i, value: addr.street2 || "", type: "text" },
      { pattern: /tbxAPP_ADDR_CITY$/i, value: addr.city, type: "text" },
      { pattern: /tbxAPP_ADDR_STATE$/i, value: addr.state, type: "text" },
      { pattern: /tbxAPP_ADDR_POSTAL_CD$/i, value: addr.postalCode, type: "text" },
      { pattern: /ddlCountry$/i, value: addr.country, type: "select-label" },
      { pattern: /ddlAPP_ADDR_CNTRY$/i, value: addr.country, type: "select-label" }, // fallback
      { pattern: /tbxAPP_HOME_TEL$/i, value: ph(a.phone), type: "text" },
      { pattern: /tbxAPP_EMAIL_ADDR$/i, value: a.email, type: "text" },
    );
    
    // Mailing address
    if (a.mailingAddressSame) {
      map.push({ pattern: /rblMailingAddrSame_0$/i, value: "", type: "click" });
      // Note: rblMailingAddr_0 is often just part of the generic Yes/No question sets, 
      // we use "rblMailingAddrSame_0" exactly to answer Yes.
    } else if (a.mailingAddressSame === false || a.mailingAddress) {
      map.push(
        { pattern: /rblMailingAddrSame_1$/i, value: "", type: "click" },
        { pattern: /tbxMAILING_ADDR_LN1$/i, value: a.mailingAddress?.street1 || "", type: "text" },
        { pattern: /tbxMAILING_ADDR_LN2$/i, value: a.mailingAddress?.street2 || "", type: "text" },
        { pattern: /tbxMAILING_ADDR_CITY$/i, value: a.mailingAddress?.city || "", type: "text" },
        { pattern: /tbxMAILING_ADDR_STATE$/i, value: a.mailingAddress?.state || "", type: "text" },
        { pattern: /tbxMAILING_ADDR_POSTAL_CD$/i, value: a.mailingAddress?.postalCode || "", type: "text" },
        { pattern: /ddlMailCountry$/i, value: a.mailingAddress?.country || "", type: "select-label" },
      );
    }
    
    // Mobile & Business phone
    if (a.mobilePhone) {
      map.push({ pattern: /tbxAPP_MOBILE_TEL$/i, value: ph(a.mobilePhone), type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_MOBILE_TEL_NA$/i, value: "", type: "checkbox-check" });
    }
    if (a.businessPhone) {
      map.push({ pattern: /tbxAPP_BUS_TEL$/i, value: ph(a.businessPhone), type: "text" });
    } else {
      map.push({ pattern: /cbexAPP_BUS_TEL_NA$/i, value: "", type: "checkbox-check" });
    }
    
    // Additional phones (dtlAddPhone) — supports multiple entries
    // Pergunta: "Do you have additional phone numbers?" → Yes/No
    // Respostas: additionalPhoneNumbers[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.additionalPhones && a.additionalPhoneNumbers?.length) {
      map.push({ pattern: /rblAddPhone_0$/i, value: "", type: "click" });
      a.additionalPhoneNumbers.forEach((phone, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "dtlAddPhone", idx };
        var phoneVal = typeof phone === 'object' ? (phone.phone || phone.number || '') : phone;
        map.push({ pattern: new RegExp(`dtlAddPhone_${ctl}_tbxAddPhoneInfo$`, 'i'), value: ph(phoneVal), ...base });
      });
    } else {
      map.push({ pattern: /rblAddPhone_1$/i, value: "", type: "click" });
    }
    
    // Additional emails (dtlAddEmail) — supports multiple entries
    // Pergunta: "Do you have additional email addresses?" → Yes/No
    // Respostas: additionalEmailAddresses[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.additionalEmails && a.additionalEmailAddresses?.length) {
      map.push({ pattern: /rblAddEmail_0$/i, value: "", type: "click" });
      a.additionalEmailAddresses.forEach((emailEntry, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "dtlAddEmail", idx };
        var emailVal = typeof emailEntry === 'object' ? emailEntry.email : emailEntry;
        map.push({ pattern: new RegExp(`dtlAddEmail_${ctl}_tbxAddEmailInfo$`, 'i'), value: emailVal || "", ...base });
      });
    } else {
      map.push({ pattern: /rblAddEmail_1$/i, value: "", type: "click" });
    }
    
    // NOTE: Seção "dtlSocialMedia" / "rblAddSite" REMOVIDA — não existe no DS-160 real.
    // A social media obrigatória é preenchida via dtlSocial (L368-395 acima).
    // "Additional Social Media" usa rblAddSocial / dtlAddSocial (abaixo).
    
    // Additional Social Media (dtlAddSocial) — supports multiple entries
    // Pergunta: "Do you have additional social media platforms?" → Yes/No
    // Respostas: additionalSocialMediaAccounts[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.additionalSocialMedia && a.additionalSocialMediaAccounts?.length) {
      map.push({ pattern: /rblAddSocial_0$/i, value: "", type: "click" });
      a.additionalSocialMediaAccounts.forEach((sm, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlAddSocial", idx };
        map.push(
          { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialPlat$`, 'i'), value: sm.platform || "", type: "text", ...base },
          { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialPlatform$`, 'i'), value: sm.platform || "", type: "text", ...base }, // fallback
          { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialHand$`, 'i'), value: sm.handle || "", type: "text", ...base },
          { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxSocialMediaIdent$`, 'i'), value: sm.handle || "", type: "text", ...base }, // fallback
        );
      });
    } else {
      map.push({ pattern: /rblAddSocial_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-08-passport ══════
// ============================================================
// Passport — Type, number, dates, lost
// Field map for 08-passport
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPassportMap(a, ctx) {
    var map = [];
    var { pp } = ctx;

    // ===================================================================
    // PASSPORT
    // ===================================================================
    map.push(
      { pattern: /ddlPPT_TYPE$/i, value: pp.type, type: "select" },
    );
    
    // Passport type explanation (for "T" = Other/Travel Document)
    if (pp.type === "T" && pp.typeExplanation) {
      map.push({ pattern: /tbxPptOtherExpl$/i, value: pp.typeExplanation, type: "text" });
    }
    
    map.push(
      { pattern: /tbxPPT_NUM$/i, value: pp.number, type: "text" },
      { pattern: /ddlPPT_ISSUED_CNTRY$/i, value: pp.issuingCountry, type: "select-label" },
      { pattern: /tbxPPT_ISSUED_IN_CITY$/i, value: pp.issuedCity, type: "text" },
      { pattern: /tbxPPT_ISSUED_IN_STATE$/i, value: pp.issuedState, type: "text" },
      { pattern: /ddlPPT_ISSUED_IN_CNTRY$/i, value: pp.issuedCountry, type: "select-label" },
      // ddlCountry on Passport page = "Where was passport issued - Country/Region"
      { pattern: /ddlCountry$/i, value: pp.issuedCountry, type: "select-label" },
      // Issuance date — DS-160 uses both ddlPPT_ISSUED_DTEDay and ddlPPT_ISSUEDDay variants
      { pattern: /ddlPPT_ISSUED(_DTE)?Day$/i, value: pp.issuanceDate.day, type: "select" },
      { pattern: /ddlPPT_ISSUED(_DTE)?Month$/i, value: pp.issuanceDate.month, type: "select" },
      { pattern: /tbxPPT_ISSUED(_DTE)?Year$/i, value: pp.issuanceDate.year, type: "text" },
      // Expiration date — DS-160 uses both ddlPPT_EXPIRE_DTEDay and ddlPPT_EXPIREDay variants
      { pattern: /ddlPPT_EXPIRE(_DTE)?Day$/i, value: pp.expirationDate.day, type: "select" },
      { pattern: /ddlPPT_EXPIRE(_DTE)?Month$/i, value: pp.expirationDate.month, type: "select" },
      { pattern: /tbxPPT_EXPIRE(_DTE)?Year$/i, value: pp.expirationDate.year, type: "text" },
    );
    
    // Book number
    if (pp.bookNumber) {
      map.push({ pattern: /tbxPPT_BOOK_NUM$/i, value: pp.bookNumber, type: "text" });
    } else {
      map.push(
        { pattern: /cbexPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxPPT_BOOK_NUM_NA$/i, value: "", type: "checkbox-check" },
      );
    }
    
    // Lost/Stolen passport (dtlLostPPT) — supports multiple entries
    // Pergunta: "Have you ever lost a passport?" → Yes/No
    // Respostas: lostPassports[0] (ctl00), [1] (ctl01 → addAnother), ...
    var lostPassports = pp.lostPassports || (pp.lostPassport ? [pp.lostPassport] : []);
    if ((pp.lostOrStolen === 'Y' || pp.lostOrStolen === true) && lostPassports.length > 0) {
      map.push({ pattern: /rblLOST_PPT_IND_0$/i, value: "", type: "click" });
    
      lostPassports.forEach((lp, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlLostPPT", idx };
    
        var lostNum = lp.number;
        if (lostNum && lostNum !== 'N/A' && lostNum !== 'n/a' && !lp.numberUnknown) {
          map.push({ pattern: new RegExp(`dtlLostPPT_${ctl}_tbxLOST_PPT_NUM$`, 'i'), value: lostNum, type: "text", ...base });
        } else {
          map.push({ pattern: new RegExp(`dtlLostPPT_${ctl}_cbxLOST_PPT_NUM_UNKN_IND$`, 'i'), value: "", type: "checkbox-check", ...base });
        }
        map.push(
          { pattern: new RegExp(`dtlLostPPT_${ctl}_ddlLOST_PPT_NATL$`, 'i'), value: lp.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlLostPPT_${ctl}_tbxLOST_PPT_EXPL$`, 'i'), value: lp.explanation || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblLOST_PPT_IND_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-09-us-contact ══════
// ============================================================
// US Contact — Name, address, phone, email
// Field map for 09-us-contact
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildUSContactMap(a, ctx) {
    var map = [];
    var { uc } = ctx;

    // ===================================================================
    // US CONTACT
    // ===================================================================
    // Name: fill text OR mark "Do Not Know" checkbox
    if (uc.nameDoNotKnow) {
      map.push(
        { pattern: /cbxUS_POC_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxUS_POC_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_SURNAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxUS_POC_SURNAME$/i, value: uc.surname, type: "text" },
        { pattern: /tbxUS_POC_GIVEN_NAME$/i, value: uc.givenName, type: "text" },
      );
    }
    // Organization: fill text OR mark "Do Not Know" checkbox
    if (uc.orgDoNotKnow) {
      map.push(
        { pattern: /cbxUS_POC_ORG_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_ORG_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxUS_POC_ORG_NA_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_ORG_NA_IND$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxUS_POC_ORGANIZATION$/i, value: uc.organization || uc.surname, type: "text" },
      );
    }
    // Pad ZIP to 5 digits for US format (e.g. 8244 → 08244)
    var ucZip = uc.zip ? uc.zip.toString().padStart(5, '0') : '';
    map.push(
      { pattern: /tbxUS_POC_ADDR_LN1$/i, value: uc.street1, type: "text" },
      { pattern: /tbxUS_POC_ADDR_LN2$/i, value: uc.street2 || '', type: "text" },
      { pattern: /tbxUS_POC_ADDR_CITY$/i, value: uc.city, type: "text" },
      { pattern: /ddlUS_POC_ADDR_STATE$/i, value: uc.state, type: "select" },
      { pattern: /tbxUS_POC_ADDR_POSTAL_CD$/i, value: ucZip, type: "text" },
      { pattern: /tbxUS_POC_HOME_TEL$/i, value: ph(uc.phone), type: "text" },
      { pattern: /ddlUS_POC_REL_TO_APP$/i, value: uc.relationship, type: "select" },
      { pattern: /ddlUS_POC_REL$/i, value: uc.relationship, type: "select" },
    );
    if (uc.email) {
      map.push({ pattern: /tbxUS_POC_EMAIL_ADDR$/i, value: uc.email, type: "text" });
    } else {
      map.push(
        { pattern: /cbxUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" },
      );
    }

    return map;
}


// ══════ page-10-family-parents ══════
// ============================================================
// Family — Parents, spouse, relatives in US
// Field map for 10-family-parents
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildFamilyParentsMap(a, ctx) {
    var map = [];
    var { father, mother, spouse } = ctx;

    // ===================================================================
    // FAMILY
    // ===================================================================
    if (a.father.nameUnknown) {
      map.push(
        { pattern: /cbxFATHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFATHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxFATHER_SURNAME$/i, value: a.father.surname, type: "text" },
        { pattern: /tbxFATHER_GIVEN_NAME$/i, value: a.father.givenName, type: "text" },
      );
    }
    if (a.father.dobUnknown) {
      map.push(
        { pattern: /cbxFATHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFATHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxFathersDOBUNK$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexFathersDOBUNK$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /ddlFathersDOBDay$/i, value: a.father.dob.day, type: "select" },
        { pattern: /ddlFathersDOBMonth$/i, value: a.father.dob.month, type: "select" },
        { pattern: /tbxFathersDOBYear$/i, value: a.father.dob.year, type: "text" },
        { pattern: /ddlFATHER_DOBDay$/i, value: a.father.dob.day, type: "select" },
        { pattern: /ddlFATHER_DOBMonth$/i, value: a.father.dob.month, type: "select" },
        { pattern: /tbxFATHER_DOBYear$/i, value: a.father.dob.year, type: "text" },
      );
    }
    if (a.mother.nameUnknown) {
      map.push(
        { pattern: /cbxMOTHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_SURNAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_GIVEN_NAME_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMOTHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /tbxMOTHER_SURNAME$/i, value: a.mother.surname, type: "text" },
        { pattern: /tbxMOTHER_GIVEN_NAME$/i, value: a.mother.givenName, type: "text" },
      );
    }
    if (a.mother.dobUnknown) {
      map.push(
        { pattern: /cbxMOTHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMOTHER_DOB_UNK_IND$/i, value: "", type: "checkbox-check" },
        { pattern: /cbxMothersDOBUNK$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexMothersDOBUNK$/i, value: "", type: "checkbox-check" },
      );
    } else {
      map.push(
        { pattern: /ddlMothersDOBDay$/i, value: a.mother.dob.day, type: "select" },
        { pattern: /ddlMothersDOBMonth$/i, value: a.mother.dob.month, type: "select" },
        { pattern: /tbxMothersDOBYear$/i, value: a.mother.dob.year, type: "text" },
        { pattern: /ddlMOTHER_DOBDay$/i, value: a.mother.dob.day, type: "select" },
        { pattern: /ddlMOTHER_DOBMonth$/i, value: a.mother.dob.month, type: "select" },
        { pattern: /tbxMOTHER_DOBYear$/i, value: a.mother.dob.year, type: "text" },
      );
    }
    
    // Father in US
    if (a.father.inUS === 'Y' || a.father.inUS === true) {
      map.push(
        { pattern: /rblFATHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" },
        { pattern: /rblFATHER_US_0$/i, value: "", type: "click" },
        { pattern: /ddlFATHER_US_STATUS$/i, value: a.father.usStatus || "S", type: "select" },
      );
    } else {
      map.push(
        { pattern: /rblFATHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" },
        { pattern: /rblFATHER_US_1$/i, value: "", type: "click" },
      );
    }
    
    // Mother in US
    if (a.mother.inUS === 'Y' || a.mother.inUS === true) {
      map.push(
        { pattern: /rblMOTHER_LIVE_IN_US_IND_0$/i, value: "", type: "click" },
        { pattern: /rblMOTHER_US_0$/i, value: "", type: "click" },
        { pattern: /ddlMOTHER_US_STATUS$/i, value: a.mother.usStatus || "S", type: "select" },
      );
    } else {
      map.push(
        { pattern: /rblMOTHER_LIVE_IN_US_IND_1$/i, value: "", type: "click" },
        { pattern: /rblMOTHER_US_1$/i, value: "", type: "click" },
      );
    }
    
    // Spouse (Family2 page) - only for M/C/P/L marital status
    // Actual IDs: tbxSpouseSurname, tbxSpouseGivenName, ddlSpouseNatDropDownList,
    //             ddlSpousePOBCountry, tbxSpousePOBCity, ddlSpouseAddressType
    // DOB uses generic ddlDOBDay/ddlDOBMonth/tbxDOBYear (handled via page override in fill-form)
    var needsSpouse = ["M", "C", "P", "L"].includes(a.maritalStatus);
    if (needsSpouse && a.spouse) {
      map.push(
        { pattern: /tbxSpouseSurname$/i, value: a.spouse.surname, type: "text" },
        { pattern: /tbxSpouseGivenName$/i, value: a.spouse.givenName, type: "text" },
        { pattern: /ddlSpouseNatDropDownList$/i, value: a.spouse.nationality || a.nationality, type: "select-label" },
        { pattern: /ddlSpousePOBCountry$/i, value: a.spouse.pobCountry || a.spouse.nationality || a.nationality, type: "select-label" },
        { pattern: /tbxSpousePOBCity$/i, value: a.spouse.cityOfBirth || "", type: "text" },
        { pattern: /ddlSpouseAddressType$/i, value: a.spouse.addressType || "H", type: "select" },
      );
      // Spouse address fields when addressType = "O" (Other)
      if (a.spouse.addressType === "O" && a.spouse.address) {
        var sa = a.spouse.address;
        map.push(
          { pattern: /SPOUSE_ADDR_LN1$|SpouseAddr1$|_tbxADDR_LN1$/i, value: sa.street1, type: "text" },
          { pattern: /SPOUSE_ADDR_LN2$|SpouseAddr2$|_tbxADDR_LN2$/i, value: sa.street2 || "", type: "text" },
          { pattern: /SPOUSE_ADDR_CITY$|SpouseCity$|_tbxADDR_CITY$/i, value: sa.city, type: "text" },
          { pattern: /SPOUSE_ADDR_STATE$|SpouseState$|_tbxADDR_STATE$/i, value: sa.state || "", type: "text" },
          { pattern: /SPOUSE_ADDR_POSTAL_CD$|SpousePostalCd$|_tbxPOSTAL_CD$/i, value: sa.postalCode || "", type: "text" },
          { pattern: /SPOUSE_ADDR_CNTRY$|SpouseAddrCntry$|_ddlSPOUSE_ADDR_CNTRY$/i, value: sa.country, type: "select-label" },
        );
      }
    } else {
      map.push(
        { pattern: /cbexSPOUSE_SURNAME_NA$/i, value: "", type: "checkbox-check" },
        { pattern: /cbexSPOUSE_GIVEN_NAME_NA$/i, value: "", type: "checkbox-check" },
      );
    }
    
    // Immediate relatives in US (dlUSRelatives) — supports multiple entries
    // Pergunta: "Do you have any immediate relatives in the US?" → Yes/No
    // Respostas: relatives[0] (ctl00), relatives[1] (ctl01 → addAnother), ...
    var usRelatives = a.relatives || (a.immediateRelative ? [a.immediateRelative] : []);
    if ((a.relativesInUS || a.immediateRelativesInUS) && usRelatives.length > 0) {
      map.push({ pattern: /rblUS_IMMED_RELATIVE_IND_0$/i, value: "", type: "click" });
    
      usRelatives.forEach((rel, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dlUSRelatives", idx };
    
        map.push(
          { pattern: new RegExp(`dlUSRelatives_${ctl}_tbxUS_REL_SURNAME$`, 'i'), value: rel.surname || "", type: "text", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_tbxUS_REL_GIVEN_NAME$`, 'i'), value: rel.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_ddlUS_REL_TYPE$`, 'i'), value: rel.type || rel.relationship || "", type: "select", ...base },
          { pattern: new RegExp(`dlUSRelatives_${ctl}_ddlUS_REL_STATUS$`, 'i'), value: rel.status || "", type: "select", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblUS_IMMED_RELATIVE_IND_1$/i, value: "", type: "click" });
      // OTHER_RELATIVE only appears when IMMED=NO
      if (a.otherRelativesInUS) {
        map.push({ pattern: /rblUS_OTHER_RELATIVE_IND_0$/i, value: "", type: "click" });
      } else {
        map.push({ pattern: /rblUS_OTHER_RELATIVE_IND_1$/i, value: "", type: "click" });
      }
    }

    return map;
}


// ══════ page-11-family-spouse ══════
// ============================================================
// Family — Spouse (Married / Civil Partnership)
// Field map for 11-family-spouse
// DS-160 IDs aligned with ds160-schema.js L3195-3300
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (includes ctx.spouse)
 * @returns {Array} Field map entries
 */
function buildFamilySpouseMap(a, ctx) {
    var map = [];
    var { spouse } = ctx;

    if (!spouse || (!spouse.surname && !spouse.givenName)) return map;

    // Core spouse fields
    map.push(
        { pattern: /tbxSpouseSurname$/i, value: spouse.surname || '', type: 'text' },
        { pattern: /tbxSpouseGivenName$/i, value: spouse.givenName || '', type: 'text' },
    );

    // DOB — DS-160 uses ddlDOBDay (with leading zero: '01'-'31'),
    //        ddlDOBMonth (abbreviation: 'JAN'-'DEC'), tbxDOBYear
    //        Note: NO "Spouse" prefix on these IDs in the official form!
    var dob = spouse.dob || {};
    var MONTH_ABBR = { '1':'JAN','2':'FEB','3':'MAR','4':'APR','5':'MAY','6':'JUN',
        '7':'JUL','8':'AUG','9':'SEP','10':'OCT','11':'NOV','12':'DEC' };
    var dobMonth = dob.month ? (MONTH_ABBR[String(dob.month)] || dob.month) : '';
    var dobDay = dob.day ? String(dob.day).padStart(2, '0') : '';
    map.push(
        { pattern: /ddlDOBDay$/i, value: dobDay, type: 'select' },
        { pattern: /ddlDOBMonth$/i, value: dobMonth, type: 'select' },
        { pattern: /tbxDOBYear$/i, value: dob.year || '', type: 'text' },
    );

    // Nationality — Schema ds160: ddlSpouseNatDropDownList
    map.push(
        { pattern: /ddlSpouseNat/i, value: spouse.nationality || '', type: 'select-label' },
    );

    // Place of birth
    map.push(
        { pattern: /tbxSpousePOBCity$/i, value: spouse.cityOfBirth || '', type: 'text' },
        { pattern: /ddlSpousePOBCountry$/i, value: spouse.countryOfBirth || '', type: 'select-label' },
    );

    // Address type (Y = same, N = different)
    map.push(
        { pattern: /ddlSpouseAddressType$/i, value: spouse.addressType || '', type: 'select' },
    );

    // Spouse address — only when address type is different (not same as applicant)
    if (spouse.address1 || spouse.city || spouse.country) {
        map.push(
            // Schema: ddlSPOUSE_ADDR_CNTRY
            { pattern: /ddlSPOUSE_ADDR_CNTRY$/i, value: spouse.country || '', type: 'select-label' },
            // Schema: tbxSPOUSE_ADDR_POSTAL_CD
            { pattern: /tbxSPOUSE_ADDR_POSTAL_CD$/i, value: spouse.zip || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_LN1
            { pattern: /tbxSPOUSE_ADDR_LN1$/i, value: spouse.address1 || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_LN2
            { pattern: /tbxSPOUSE_ADDR_LN2$/i, value: spouse.address2 || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_CITY
            { pattern: /tbxSPOUSE_ADDR_CITY$/i, value: spouse.city || '', type: 'text' },
            // Schema: tbxSPOUSE_ADDR_STATE
            { pattern: /tbxSPOUSE_ADDR_STATE$/i, value: spouse.state || '', type: 'text' },
        );
    }

    return map;
}


// ══════ page-12-deceased-spouse ══════
// ============================================================
// Deceased Spouse — Widowed
// Field map for 12-deceased-spouse
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildDeceasedSpouseMap(a, ctx) {
    var map = [];

    // ===================================================================
    // DECEASED SPOUSE (DeceasedSpouse page - W marital status)
    // ===================================================================
    if (a.maritalStatus === 'W' && a.deceasedSpouse) {
      var ds = a.deceasedSpouse;
      map.push(
        { pattern: /tbxDECEASED_SPOUSE_SURNAME$|tbxSpouseSurname$|tbxSURNAME$/i, value: ds.surname, type: "text" },
        { pattern: /tbxDECEASED_SPOUSE_GIVEN_NAME$|tbxSpouseGivenName$|tbxGIVEN_NAME$/i, value: ds.givenName, type: "text" },
        { pattern: /ddlDECEASED_SPOUSE_DOBDay$|ddlSpouseDOBDay$|ddlDOBDay$/i, value: ds.dob?.day || "", type: "select" },
        { pattern: /ddlDECEASED_SPOUSE_DOBMonth$|ddlSpouseDOBMonth$|ddlDOBMonth$/i, value: ds.dob?.month || "", type: "select" },
        { pattern: /tbxDECEASED_SPOUSE_DOBYear$|tbxSpouseDOBYear$|tbxDOBYear$/i, value: ds.dob?.year || "", type: "text" },
        { pattern: /ddlDECEASED_SPOUSE_NATL$|ddlSpouseNatDropDownList$/i, value: ds.nationality, type: "select-label" },
        { pattern: /ddlDECEASED_SPOUSE_POB_CNTRY$|ddlSpousePOBCountry$/i, value: ds.countryOfBirth, type: "select-label" },
      );
      if (ds.cityOfBirth) {
        map.push(
          { pattern: /tbxDECEASED_SPOUSE_POB_CITY$|tbxSpousePOBCity$/i, value: ds.cityOfBirth, type: "text" },
        );
      } else {
        map.push(
          { pattern: /cbxSPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbexSPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbxDECEASED_SPOUSE_POB_CITY_NA$|cbexDECEASED_SPOUSE_POB_CITY_NA$/i, value: "", type: "checkbox-check" },
          { pattern: /cbxPOB_CITY_NA$|cbexPOB_CITY_NA$/i, value: "", type: "checkbox-check" },
        );
      }
    }

    return map;
}


// ══════ page-13-prev-spouse ══════
// ============================================================
// Previous Spouse — Divorced
// Field map for 13-prev-spouse
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildPrevSpouseMap(a, ctx) {
    var map = [];

    // ===================================================================
    // PREVIOUS SPOUSE (PrevSpouse page - D marital status only)
    // ===================================================================
    var needsPrevSpouse = a.maritalStatus === "D";
    // Support multiple previous spouses via array (from form clone) or singular object (legacy)
    var prevSpouseEntries = (a.previousSpouses || (a.previousSpouse ? [a.previousSpouse] : []))
      .filter(ps => ps.surname || ps.givenName); // filter out empty entries
    if (needsPrevSpouse && prevSpouseEntries.length > 0) {
      // Number of former spouses
      map.push({ pattern: /NumberOfFormerSpouses$|NUM_PREV_SPOUSES$|ddlNumberPrevSpouses$|tbxNumberPrevSpouses$|tbxNumberOfPrevSpouses$/i, value: prevSpouseEntries[0].numberOfFormerSpouses || String(prevSpouseEntries.length), type: "text" });
    
      prevSpouseEntries.forEach((ps, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "DListSpouse", idx };
        var dom = ps.dateOfMarriage || emptyDate;
        var dome = ps.dateMarriageEnded || emptyDate;
    
        map.push(
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxSURNAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_SURNAME$`, 'i'), value: ps.surname || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxGIVEN_NAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_GIVEN_NAME$`, 'i'), value: ps.givenName || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBDay$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBDay$`, 'i'), value: ps.dob?.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBMonth$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBMonth$`, 'i'), value: ps.dob?.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxDOBYear$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_DOBYear$`, 'i'), value: ps.dob?.year || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlSpouseNatDropDownList$|ddlSPOUSE_NATL$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_NATL$`, 'i'), value: ps.nationality || "", type: "select-label", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxSpousePOBCity$|DListSpouse_${ctl}_tbxSPOUSE_POB_CITY$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_CITY$`, 'i'), value: ps.cityOfBirth || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlSpousePOBCountry$|DListSpouse_${ctl}_ddlSPOUSE_POB_CNTRY$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_CNTRY$`, 'i'), value: ps.countryOfBirth || "", type: "select-label", ...base },
          // DOM dates: real IDs use ddlDomDay (values 1-31), ddlDomMonth (values 1-12), txtDomYear
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomDay$|ddlDATE_OF_MARRIAGEDay$|ddlDateOfMarriageDay$|dlPrevSpouse_${ctl}_ddlDOM_DTEDay$`, 'i'), value: dom.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomMonth$|ddlDATE_OF_MARRIAGEMonth$|ddlDateOfMarriageMonth$|dlPrevSpouse_${ctl}_ddlDOM_DTEMonth$`, 'i'), value: dom.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_txtDomYear$|tbxDATE_OF_MARRIAGEYear$|tbxDateOfMarriageYear$|dlPrevSpouse_${ctl}_tbxDOM_DTEYear$`, 'i'), value: dom.year || "", type: "text", ...base },
          // DOME dates: real IDs use ddlDomEndDay (values 1-31), ddlDomEndMonth (values 1-12), txtDomEndYear
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomEndDay$|ddlDATE_MARRIAGE_ENDEDDay$|ddlDateMarriageEndedDay$|dlPrevSpouse_${ctl}_ddlDOME_DTEDay$`, 'i'), value: dome.day || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlDomEndMonth$|ddlDATE_MARRIAGE_ENDEDMonth$|ddlDateMarriageEndedMonth$|dlPrevSpouse_${ctl}_ddlDOME_DTEMonth$`, 'i'), value: dome.month || "", type: "select", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_txtDomEndYear$|tbxDATE_MARRIAGE_ENDEDYear$|tbxDateMarriageEndedYear$|dlPrevSpouse_${ctl}_tbxDOME_DTEYear$`, 'i'), value: dome.year || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_tbxHowMarriageEnded$|tbxHOW_MARRIAGE_ENDED$|dlPrevSpouse_${ctl}_tbxHOW_MARRIAGE_ENDED$`, 'i'), value: ps.howMarriageEnded || ps.howEnded || "", type: "text", ...base },
          { pattern: new RegExp(`DListSpouse_${ctl}_ddlMarriageEnded_CNTRY$|ddlCNTRY_MARRIAGE_TERMINATED$|dlPrevSpouse_${ctl}_ddlCNTRY_MARRIAGE_TERMINATED$`, 'i'), value: ps.countryMarriageTerminated || ps.countryTerminated || "", type: "select-label", ...base },
        );
      });
      // Generic fallbacks for single-entry compat (skip for W/widowed — DeceasedSpouse handles it)
      if (prevSpouseEntries.length === 1 && a.maritalStatus !== 'W') {
        var ps = prevSpouseEntries[0];
        map.push(
          { pattern: /FormView1_tbxSURNAME$/i, value: ps.surname, type: "text" },
          { pattern: /FormView1_tbxGIVEN_NAME$/i, value: ps.givenName, type: "text" },
          { pattern: /ddlCOUNTRY_OF_ORIGIN$|ddlSpouseNatDropDownList$/i, value: ps.nationality, type: "select-label" },
          { pattern: /tbxPOB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
          { pattern: /ddlPOB_CNTRY$|ddlPOB_COUNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
        );
      }
    }

    return map;
}


// ══════ page-14-work-education-current ══════
// ============================================================
// Work/Education 1 — Current occupation
// Field map for 14-work-education-current
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd1Map(a, ctx) {
    var map = [];
    var { emp } = ctx;

    // ===================================================================
    // WORK / EDUCATION 1 (Current)
    // ===================================================================
    map.push({ pattern: /ddlPresentOccupation$/i, value: a.occupationCode, type: "select" });
    
    // Occupation explanation (for "N" = Not Employed, "O" = Other)
    if (a.occupationCode === "N" || a.occupationCode === "O") {
      map.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || "", type: "text" });
    }
    
    if (emp && emp.name) {
      map.push(
        { pattern: /tbxEmpSchName$/i, value: emp.name, type: "text" },
        { pattern: /tbxEmpSchAddr1$/i, value: emp.street1, type: "text" },
        { pattern: /tbxEmpSchAddr2$/i, value: emp.street2 || "", type: "text" },
        { pattern: /tbxEmpSchCity$/i, value: emp.city, type: "text" },
        { pattern: /tbxEmpSchState$/i, value: emp.state || "", type: "text" },
        { pattern: /tbxWORK_EDUC_ADDR_STATE$/i, value: emp.state || "", type: "text" },
        { pattern: /tbxEmpSchPostalCd$/i, value: emp.postalCode || "", type: "text" },
        { pattern: /tbxWORK_EDUC_ADDR_POSTAL_CD$/i, value: emp.postalCode || "", type: "text" },
        { pattern: /ddlEmpSchCountry$/i, value: emp.country, type: "select-label" },
        { pattern: /tbxEmpSchPhone$/i, value: ph(emp.phone), type: "text" },
        { pattern: /tbxWORK_EDUC_TEL$/i, value: ph(emp.phone), type: "text" },
        { pattern: /tbxCURR_MONTHLY_SALARY$/i, value: emp.monthlyIncome, type: "text" },
        { pattern: /JobTitle|tbxDescribeDuties/i, value: emp.jobTitle || "", type: "text" },
      );
    
      // Supervisor in Current Employment
      if (emp.supervisorSurname) {
        map.push(
          { pattern: /SupervisorSurname/i, value: emp.supervisorSurname, type: "text" },
          { pattern: /SupervisorGivenName/i, value: emp.supervisorGivenName || "", type: "text" },
        );
      } else {
        map.push(
          { pattern: /SupervisorSurname.*_NA/i, value: "", type: "checkbox-check" },
          { pattern: /SupervisorGivenName.*_NA/i, value: "", type: "checkbox-check" },
        );
      }
    
      map.push(
        { pattern: /FormView1_ddlEmpDateFromDay$/i, value: emp.startDate?.day || "1", type: "select" },
        { pattern: /FormView1_ddlEmpDateFromMonth$/i, value: emp.startDate.month, type: "select" },
        { pattern: /FormView1_tbxEmpDateFromYear$/i, value: emp.startDate.year, type: "text" },
        { pattern: /FormView1_tbxDescribeDuties$/i, value: emp.duties, type: "text" },
      );
    }

    return map;
}


// ══════ page-15-work-education-previous ══════
// ============================================================
// Work/Education 2 — Previous employment, education
// Field map for 15-work-education-previous
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd2Map(a, ctx) {
    var map = [];

    // ===================================================================
    // WORK / EDUCATION 2 (Previous)
    // ===================================================================
    // Previous Employment (dtlPrevEmpl) — supports multiple entries
    // Pergunta: "Were you previously employed?" → Yes/No
    // Respostas: previousEmployment[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.hasPreviousEmployment && a.previousEmployment?.length > 0) {
      map.push({ pattern: /rblPreviouslyEmployed_0$/i, value: "", type: "click" });
    
      a.previousEmployment.forEach((prev, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlPrevEmpl", idx };
        var sd = prev.startDate || emptyDate;
        var ed = prev.endDate || emptyDate;
    
        map.push(
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerName$`, 'i'), value: prev.name || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerStreetAddress1$`, 'i'), value: prev.street1 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerStreetAddress2$`, 'i'), value: prev.street2 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerCity$`, 'i'), value: prev.city || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_STATE$`, 'i'), value: prev.state || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxPREV_EMPL_ADDR_POSTAL_CD$`, 'i'), value: prev.postalCode || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_DropDownList2$`, 'i'), value: prev.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbEmployerPhone$`, 'i'), value: ph(prev.phone), type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbJobTitle$`, 'i'), value: prev.jobTitle || "", type: "text", ...base },
        );
        // Supervisor
        if (prev.supervisor && prev.supervisor !== 'N/A') {
          map.push(
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbSupervisorSurname$`, 'i'), value: prev.supervisor || "", type: "text", ...base },
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbSupervisorGivenName$`, 'i'), value: prev.supervisorGivenName || "", type: "text", ...base },
          );
        } else {
          map.push(
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_cbxSupervisorSurname_NA$`, 'i'), value: "", type: "checkbox-check", ...base },
            { pattern: new RegExp(`dtlPrevEmpl_${ctl}_cbxSupervisorGivenName_NA$`, 'i'), value: "", type: "checkbox-check", ...base },
          );
        }
        map.push(
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateFromDay$`, 'i'), value: sd.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateFromMonth$`, 'i'), value: sd.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxEmpDateFromYear$`, 'i'), value: sd.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateToDay$`, 'i'), value: ed.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_ddlEmpDateToMonth$`, 'i'), value: ed.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbxEmpDateToYear$`, 'i'), value: ed.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbDescribeDuties$`, 'i'), value: prev.duties || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblPreviouslyEmployed_1$/i, value: "", type: "click" });
    }
    
    // Education (dtlPrevEduc) — supports multiple entries
    // Pergunta: "Have you attended any educational institutions?" → Yes/No
    // Respostas: education[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.hasEducation && a.education?.length > 0) {
      map.push({ pattern: /rblOtherEduc_0$/i, value: "", type: "click" });
    
      a.education.forEach((edu, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlPrevEduc", idx };
        var sd = edu.startDate || emptyDate;
        var ed = edu.endDate || emptyDate;
    
        map.push(
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolName$`, 'i'), value: edu.name || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr1$`, 'i'), value: edu.street1 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr2$`, 'i'), value: edu.street2 || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolCity$`, 'i'), value: edu.city || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_ADDR_STATE$`, 'i'), value: edu.state || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_POSTAL_CD$`, 'i'), value: edu.postalCode || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolCountry$`, 'i'), value: edu.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolCourseOfStudy$`, 'i'), value: edu.course || edu.courseOfStudy || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolFromDay$`, 'i'), value: sd.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolFromMonth$`, 'i'), value: sd.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolFromYear$`, 'i'), value: sd.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolToDay$`, 'i'), value: ed.day || "1", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_ddlSchoolToMonth$`, 'i'), value: ed.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolToYear$`, 'i'), value: ed.year || "", type: "text", ...base },
        );
      });
    } else {
      map.push({ pattern: /rblOtherEduc_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-16-work-education-additional ══════
// ============================================================
// Work/Education 3 — Languages, clan, countries, orgs, military
// Field map for 16-work-education-additional
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd3Map(a, ctx) {
    var map = [];

    // ===================================================================
    // WORK / EDUCATION 3 (Additional)
    // ===================================================================
    // Languages (dtlLANGUAGES) — supports multiple entries
    // Respostas: languages[0] (ctl00), [1] (ctl01 → addAnother), ...
    var rawLangs = a.languages?.length > 0 ? a.languages : ['PORTUGUESE'];
    var langs = rawLangs.map(l => typeof l === 'object' ? (l.name || l.language || '') : l);
    langs.forEach((lang, idx) => {
      var ctl = `ctl${String(idx).padStart(2, '0')}`;
      var base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlLANGUAGES", idx };
      map.push({ pattern: new RegExp(`dtlLANGUAGES_${ctl}_tbxLANGUAGE_NAME$`, 'i'), value: lang || "", ...base });
    });
    // Generic fallback for ctl00
    map.push({ pattern: /tbxLANGUAGE_NAME$/i, value: langs[0] || "", type: "text" });
    
    // Clan/Tribe
    if (a.clanTribe) {
      map.push(
        { pattern: /rblCLAN_TRIBE_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxCLAN_TRIBE_NAME$/i, value: a.clanTribeName || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblCLAN_TRIBE_IND_1$/i, value: "", type: "click" });
    }
    
    // Countries visited (dtlCountriesVisited) — supports multiple entries
    // Pergunta: "Have you traveled to any countries within the last five years?" → Yes/No
    // Respostas: countriesVisitedList[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.countriesVisited && a.countriesVisitedList?.length) {
      map.push({ pattern: /rblCOUNTRIES_VISITED_IND_0$/i, value: "", type: "click" });
      var countries = a.countriesVisitedList.map(c => typeof c === 'object' ? (c.country || c.name || '') : c);
      countries.forEach((country, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlCountriesVisited", idx };
        map.push({ pattern: new RegExp(`dtlCountriesVisited_${ctl}_ddlCOUNTRIES_VISITED$`, 'i'), value: country || "", type: "select-search", ...base });
      });
      // Generic fallback for ctl00
      map.push({ pattern: /ddlCOUNTRIES_VISITED$/i, value: countries[0] || "", type: "select-search" });
    } else {
      map.push({ pattern: /rblCOUNTRIES_VISITED_IND_1$/i, value: "", type: "click" });
    }
    
    // Organizations (dtlORGANIZATIONS) — supports multiple entries
    // Pergunta: "Do you belong to any organizations?" → Yes/No
    // Respostas: organizations[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.organizationMember && a.organizations?.length > 0) {
      map.push({ pattern: /rblORGANIZATION_IND_0$/i, value: "", type: "click" });
      a.organizations.forEach((org, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = { type: "text" };
        if (idx > 0) base.addAnother = { list: "dtlORGANIZATIONS", idx };
        map.push({ pattern: new RegExp(`dtlORGANIZATIONS_${ctl}_tbxORGANIZATION_NAME$`, 'i'), value: org || "", ...base });
      });
      // Generic fallback for ctl00
      map.push({ pattern: /tbxORGANIZATION_NAME$/i, value: a.organizations[0] || "", type: "text" });
    } else {
      map.push({ pattern: /rblORGANIZATION_IND_1$/i, value: "", type: "click" });
    }
    
    // Specialized skills
    if (a.specializedSkills) {
      map.push(
        { pattern: /rblSPECIALIZED_SKILLS_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxSPECIALIZED_SKILLS_EXPL$/i, value: a.specializedSkillsExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblSPECIALIZED_SKILLS_IND_1$/i, value: "", type: "click" });
    }
    
    // Military service (dtlMILITARY_SERVICE) — supports multiple entries via addAnother
    var militaryEntries = Array.isArray(a.military) ? a.military : (a.military ? [a.military] : []);
    if (a.militaryService && militaryEntries.length > 0) {
      map.push({ pattern: /rblMILITARY_SERVICE_IND_0$/i, value: "", type: "click" });
    
      militaryEntries.forEach((m, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var base = {};
        if (idx > 0) base.addAnother = { list: "dtlMILITARY_SERVICE", idx };
        var sd = m.startDate || emptyDate;
        var ed = m.endDate || emptyDate;
    
        map.push(
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_ddlMILITARY_SVC_CNTRY$`, 'i'), value: m.country || "", type: "select-label", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_tbxMILITARY_SVC_BRANCH$`, 'i'), value: m.branch || "", type: "text", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_tbxMILITARY_SVC_RANK$`, 'i'), value: m.rank || "", type: "text", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_tbxMILITARY_SVC_SPECIALTY$`, 'i'), value: m.specialty || "", type: "text", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_ddlMILITARY_SVC_FROMDay$`, 'i'), value: sd.day || "", type: "select", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_ddlMILITARY_SVC_FROMMonth$`, 'i'), value: sd.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_tbxMILITARY_SVC_FROMYear$`, 'i'), value: sd.year || "", type: "text", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_ddlMILITARY_SVC_TODay$`, 'i'), value: ed.day || "", type: "select", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_ddlMILITARY_SVC_TOMonth$`, 'i'), value: ed.month || "", type: "select", ...base },
          { pattern: new RegExp(`dtlMILITARY_SERVICE_${ctl}_tbxMILITARY_SVC_TOYear$`, 'i'), value: ed.year || "", type: "text", ...base },
        );
      });
      // Generic fallback for ctl00
      if (militaryEntries.length === 1) {
        var m = militaryEntries[0];
        var sd = m.startDate || emptyDate;
        var ed = m.endDate || emptyDate;
        map.push(
          { pattern: /ddlMILITARY_SVC_CNTRY$/i, value: m.country, type: "select-label" },
          { pattern: /tbxMILITARY_SVC_BRANCH$/i, value: m.branch, type: "text" },
          { pattern: /tbxMILITARY_SVC_RANK$/i, value: m.rank, type: "text" },
          { pattern: /tbxMILITARY_SVC_SPECIALTY$/i, value: m.specialty, type: "text" },
          { pattern: /ddlMILITARY_SVC_FROMDay$/i, value: sd.day, type: "select" },
          { pattern: /ddlMILITARY_SVC_FROMMonth$/i, value: sd.month, type: "select" },
          { pattern: /tbxMILITARY_SVC_FROMYear$/i, value: sd.year, type: "text" },
          { pattern: /ddlMILITARY_SVC_TODay$/i, value: ed.day, type: "select" },
          { pattern: /ddlMILITARY_SVC_TOMonth$/i, value: ed.month, type: "select" },
          { pattern: /tbxMILITARY_SVC_TOYear$/i, value: ed.year, type: "text" },
        );
      }
    } else {
      map.push({ pattern: /rblMILITARY_SERVICE_IND_1$/i, value: "", type: "click" });
    }
    
    // Insurgent org
    if (a.insurgentOrg) {
      map.push(
        { pattern: /rblINSURGENT_ORG_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxINSURGENT_ORG_EXPL$/i, value: a.insurgentOrgExplanation || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblINSURGENT_ORG_IND_1$/i, value: "", type: "click" });
    }

    return map;
}


// ══════ page-17-security ══════
// ============================================================
// Security Questions
// Field map for 17-security
// ============================================================

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildSecurityMap(a, ctx) {
    var map = [];

    // =========================================================================
    // SECURITY PAGES — map from profile.security to official DS-160 radios
    // Only adds entries when user answered "Yes" — filler defaults rest to "No"
    // =========================================================================
    var sec = a.security || {};
    // Map camelCase JSON key → official DS-160 radio name pattern
    var securityFieldMap = {
      // Security 1 - Health
      disease: 'rblDisease',
      disorder: 'rblDisorder',
      drugUser: 'rblDruguser',
      // Security 2 - Criminal
      arrested: 'rblArrested',
      controlledSubstances: 'rblControlledSubstances',
      prostitution: 'rblProstitution',
      moneyLaundering: 'rblMoneyLaundering',
      humanTrafficking: 'rblHumanTrafficking',
      assistedSevereTrafficking: 'rblAssistedSevereTrafficking',
      humanTraffickingRelated: 'rblHumanTraffickingRelated',
      // Security 3 - National Security
      illegalActivity: 'rblIllegalActivity',
      terroristActivity: 'rblTerroristActivity',
      terroristSupport: 'rblTerroristSupport',
      terroristOrg: 'rblTerroristOrg',
      terroristRel: 'rblTerroristRel',
      genocide: 'rblGenocide',
      torture: 'rblTorture',
      exViolence: 'rblExViolence',
      childSoldier: 'rblChildSoldier',
      religiousFreedom: 'rblReligiousFreedom',
      populationControls: 'rblPopulationControls',
      transplant: 'rblTransplant',
      // Security 4 - Immigration
      removalHearing: 'rblRemovalHearing',
      immigrationFraud: 'rblImmigrationFraud',
      failToAttend: 'rblFailToAttend',
      visaViolation: 'rblVisaViolation',
      deport: 'rblDeport',
      // Security 5 - Miscellaneous
      childCustody: 'rblChildCustody',
      votingViolation: 'rblVotingViolation',
      renounceExp: 'rblRenounceExp',
      attWoReimb: 'rblAttWoReimb',
    };
    
    for (const [jsonKey, radioName] of Object.entries(securityFieldMap)) {
      if (sec[jsonKey]) {
        // User answered "Yes" — set the radio to Yes AND fill the explanation textbox
        var radioPattern = new RegExp(radioName + '$', 'i');
        map.push({ pattern: radioPattern, value: 'Y', type: 'radio' });
        // Explanation textbox: some use tbx<Name>, others tbx<Name>_EXPL (only deport)
        var explKey = jsonKey + 'Expl';
        if (sec[explKey]) {
          // Convert rblFieldName → tbxFieldName, match with or without _EXPL suffix
          var tbxName = radioName.replace('rbl', 'tbx');
          var explPattern = new RegExp(tbxName + '(_EXPL)?$', 'i');
          map.push({ pattern: explPattern, value: sec[explKey], type: 'text' });
        }
      }
      // If sec[jsonKey] is false/undefined, the filler's default "No" logic handles it
    }

    return map;
}


// ══════ page-18-student-exchange ══════
// ============================================================
// Student / Exchange — Field map for F/J/M visas (SEVIS page)
// ============================================================
// F1-F1/M1  → full school fields (always)
// J1-J1     → programNumber + intendToStudy + school (if Yes)
// F2/J2/M2  → SEVIS IDs only (own + principal)
// J2-CH/SP  → SEVIS ID + principal SEVIS ID + programNumber
// ============================================================

function buildStudentExchangeMap(a, ctx) {
    var map = [];
    var se = a.studentExchange || {};
    var visaType = ctx?.purposeOfTrip || a.travel?.purposeOfTrip || '';
    var isDependentVisa = ['F2-CH', 'F2-SP', 'J2-CH', 'J2-SP', 'M2'].includes(visaType);
    var isJVisa = ['J1-J1', 'J2-CH', 'J2-SP'].includes(visaType);

    // SEVIS ID — always
    map.push({ pattern: /tbxSevisID$/i, value: se.sevisId || '', type: 'text' });

    // Program Number — J visas only
    if (isJVisa) {
        map.push({ pattern: /tbxProgram$/i, value: se.programNumber || '', type: 'text' });
    }

    // Principal SEVIS ID — dependents only
    if (isDependentVisa) {
        map.push({ pattern: /tbxPrincipalSevisID$/i, value: se.principalSevisId || '', type: 'text' });
    }

    // intendToStudy — J1-J1 only
    if (visaType === 'J1-J1') {
        map.push({ pattern: /rblStudyQuestion$/i, value: se.intendToStudy || 'Y', type: 'radio' });
    }

    // School fields — primary holders only
    if (!isDependentVisa) {
        var showSchool = visaType !== 'J1-J1' || se.intendToStudy === 'Y';
        if (showSchool) {
            map.push(
                { pattern: /tbxNameOfSchool$/i, value: se.schoolName || '', type: 'text' },
                { pattern: /tbxSchoolCourseOfStudy$/i, value: se.courseOfStudy || '', type: 'text' },
                { pattern: /tbxSchoolStreetAddress1$/i, value: se.schoolAddress || '', type: 'text' },
                { pattern: /tbxSchoolStreetAddress2$/i, value: se.schoolAddress2 || '', type: 'text' },
                { pattern: /tbxSchoolCity$/i, value: se.schoolCity || '', type: 'text' },
                { pattern: /ddlSchoolState$/i, value: se.schoolState || '', type: 'select' },
                { pattern: /tbxSchoolZIPCode$/i, value: se.schoolZip || '', type: 'text' },
            );
        }
    }

    return map;
}


// ══════ page-19-petition-info ══════
// ============================================================
// Temporary Work Visa — Field map for H/L/O/P/Q/R work visas
// URL: complete_temporarywork.aspx?node=TemporaryWork
// ============================================================

function buildTemporaryWorkMap(a, ctx) {
    var map = [];
    var tw = a.temporaryWork || {};

    map.push(
        { pattern: /tbxPetitionNumber$/i, value: tw.petitionNumber || '', type: 'text' },
        { pattern: /tbxNameOfPetitioner$/i, value: tw.nameOfPetitioner || '', type: 'text' },
        { pattern: /tbxEmployerName$/i, value: tw.employerName || '', type: 'text' },
        { pattern: /tbxEmpStreetAddress1$/i, value: tw.employerAddress || '', type: 'text' },
        { pattern: /tbxEmpStreetAddress2$/i, value: tw.employerAddress2 || '', type: 'text' },
        { pattern: /tbxEmpCity$/i, value: tw.employerCity || '', type: 'text' },
        { pattern: /ddlEmpState$/i, value: tw.employerState || '', type: 'select' },
        { pattern: /tbxZIPCode$/i, value: tw.employerZip || '', type: 'text' },
        { pattern: /tbxTEMP_WORK_TEL$/i, value: tw.employerPhone || '', type: 'text' },
        { pattern: /tbxEmpSalaryInUSD$/i, value: tw.monthlySalary || '', type: 'text' },
    );

    return map;
}


// ══════ page-19a-student-add-contact ══════
// ============================================================
// Student Additional Contact — Field map (F/J/M visas)
// ============================================================
// DS-160 uses indexed DataList pattern:
//   dtlStudentAddPOC_ctl{NN}_{fieldId}
// Where NN = 00, 01, 02... for each contact entry.
//
// Page: complete_ExchangeVisitorAddContact.aspx?node=ExchangeVisitor2
// Navigation: Back: Security → Next: SEVIS
//
// IMPORTANT: Uses `pattern` (RegExp) format compatible with
// generic-page.js buildFieldIndex() — NOT CSS selectors.
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Field map entries for additional contacts
 */
function buildStudentAddContactMap(a, ctx) {
    var contacts = a.studentAddContact?.contacts || [];
    var map = [];

    contacts.forEach((contact, idx) => {
        var ctl = `ctl${String(idx).padStart(2, '0')}`;
        var listName = 'dtlStudentAddPOC';

        // Core fields — always present
        map.push(
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_SURNAME$`), value: contact.surname || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_GIVEN_NAME$`), value: contact.givenName || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_LN1$`), value: contact.address1 || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_LN2$`), value: contact.address2 || '', type: 'text' },
            { pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_CITY$`), value: contact.city || '', type: 'text' },
        );

        // State — text with N/A checkbox (postback)
        if (contact.state) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_STATE$`), value: contact.state, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_ADDR_STATE_NA$`), value: true, type: 'checkbox-check' });
        }

        // Postal Code — text with N/A checkbox (postback)
        if (contact.postalCode) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_ADDR_POSTAL_CD$`), value: contact.postalCode, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_ADDR_POSTAL_CD_NA$`), value: true, type: 'checkbox-check' });
        }

        // Country — select
        map.push(
            { pattern: new RegExp(`${listName}_${ctl}_ddlADD_POC_ADDR_CTRY$`), value: contact.country || 'BRZL', type: 'select' },
        );

        // Phone — text with N/A checkbox (postback)
        if (contact.phone) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_TEL$`), value: contact.phone, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_TEL_NA$`), value: true, type: 'checkbox-check' });
        }

        // Email — text with N/A checkbox (postback)
        if (contact.email) {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_tbxADD_POC_EMAIL_ADDR$`), value: contact.email, type: 'text' });
        } else {
            map.push({ pattern: new RegExp(`${listName}_${ctl}_cbxADD_POC_EMAIL_ADDR_NA$`), value: true, type: 'checkbox-check' });
        }

        // Add Another — for idx >= 1, signal that a new entry must be created
        // Uses addAnother convention from generic-page.js Phase 2.5
        if (idx >= 1) {
            // Mark every field of this entry as needing "Add Another" first
            map.forEach((entry, i) => {
                if (i >= map.length - 10 * 1 && entry.pattern?.source?.includes(ctl)) {
                    entry.addAnother = { list: listName, idx };
                }
            });
        }
    });

    return map;
}


// ══════ page-20-photo-upload ══════
// ============================================================
// Photo Upload — Field map
// Handles photo upload via identix.state.gov for PTA/RCF consulates
// ============================================================
// DS-160 flow:
// 1. Main form → click "Upload Your Photo" button (ctl00_SiteContentPlaceHolder_btnUploadPhoto)
// 2. Redirects to identix.state.gov/qotw/Upload.aspx
// 3. Upload JPEG via file input (ctl00_cphMain_imageFileUpload)
// 4. Click "Upload Selected Photo" (ctl00_cphButtons_btnUpload)
// 5. Returns to "Confirm Photo" page
// 6. Click "Next: Confirm Photo" (ctl00_SiteContentPlaceHolder_UpdateButton3)
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context { page, embassy }
 * @returns {Array} Field map entries for photo upload
 */
function buildPhotoUploadMap(a, ctx) {
    // Photo upload is handled as a special page flow, not regular field filling.
    // The automation runner handles this via dedicated photo upload logic:
    //   1. Click the "Upload Your Photo" button on the main DS-160 page
    //   2. Handle the identix.state.gov upload form
    //   3. Return to DS-160 confirm photo page
    
    // Only required for consulates that require photo upload (PTA, RCF)
    if (!['PTA', 'RCF'].includes(ctx.embassy)) {
        return [];
    }

    return [
        {
            type: 'photo_upload',
            ds160ButtonId: 'ctl00_SiteContentPlaceHolder_btnUploadPhoto',
            identixFileInput: 'ctl00_cphMain_imageFileUpload',
            identixUploadButton: 'ctl00_cphButtons_btnUpload',
            identixCancelButton: 'ctl00_cphButtons_btnCancel',
            confirmNextButton: 'ctl00_SiteContentPlaceHolder_UpdateButton3',
            photoField: 'photoUpload.photo',
            maxSizeKb: 240,
            acceptFormat: 'image/jpeg'
        }
    ];
}


// ══════ page-21-review ══════
// ============================================================
// Review — Field map (automação only)
// Não há campos para preencher, apenas navegação
// ============================================================
// DS-160 Review Page flow:
// 1. Verificar todos os checks verdes
// 2. Scroll to bottom
// 3. Click "Next: Sign and Submit" button
//    ID: ctl00_SiteContentPlaceHolder_UpdateButton3
// ============================================================

/**
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context
 * @returns {Array} Navigation actions for review page
 */
function buildReviewMap(a, ctx) {
    return [
        {
            type: 'navigation',
            action: 'click_next',
            ds160ButtonId: 'ctl00_SiteContentPlaceHolder_UpdateButton3',
            description: 'Click "Next: Sign and Submit" after verifying all sections are complete'
        }
    ];
}


// ══════ page-22-sign ══════
// ============================================================
// Sign and Submit — Field map
// ============================================================
// URL: esign/signtheapplication.aspx?node=SignCertify
//
// 2 estados na MESMA URL:
//   Estado 1 (pré-assinatura): Preparer Q + Passport + CAPTCHA + Sign btn
//   Estado 2 (pós-assinatura): Mensagem sucesso + Next: Confirmation
//
// IDs oficiais (ds160map):
//   Preparer radio:    rblPREP_IND         (Y/N, postback)
//   Passport number:   PPTNumTbx           (maxlen=20)
//   CAPTCHA code:      CodeTextBox         (maxlen=10)
//   Sign button:       btnSignApp
//   Next button:       UpdateButton3       (Next: Confirmation)
// ============================================================

function buildSignMap(a, ctx) {
    var passport = a.passport || {};
    var sign = a.sign || {};

    return [
        // 1. Preparer radio — "Did anyone assist?" → N (No)
        {
            pattern: /rblPREP_IND$/i,
            value: sign.preparerAssisted || 'N',
            type: 'radio',
            description: 'Preparer of Application: Did anyone assist you?'
        },
        // 2. Passport Number — e-signature confirmation
        {
            pattern: /PPTNumTbx$/i,
            value: passport.passportNumber || '',
            type: 'text',
            description: 'Passport/Travel Document Number (e-signature)'
        },
        // 3. CAPTCHA — requires OCR or manual entry at runtime
        {
            pattern: /CodeTextBox$/i,
            value: '',
            type: 'captcha',
            maxLen: 10,
            description: 'CAPTCHA code — requires OCR or manual entry'
        },
        // 4. Click "Sign and Submit Application"
        {
            type: 'navigation',
            action: 'click',
            pattern: /btnSignApp$/i,
            description: 'Click "Sign and Submit Application"'
        },
        // 5. After signing — Click "Next: Confirmation"
        {
            type: 'navigation',
            action: 'click',
            pattern: /UpdateButton3$/i,
            waitForState: 'signed',
            description: 'Click "Next: Confirmation" (after successful signing)'
        }
    ];
}


// ══════ page-23-confirmation ══════
// ============================================================
// Confirmation Page — Field map
// ============================================================
// URL: ESign/Complete_Done_Confirmation.aspx?node=Done
//
// Esta é a página de confirmação pós-assinatura.
// Exibe: barcode, dados do aplicante, posto consular.
//
// Ações disponíveis:
//   Print Confirmation: btnPrintConfirm  → window.print()
//   Print Application:  btnPrintApp      → navega para printapplication.aspx
//   Email Confirmation: btnEmailConfirm  → envia por email
//
// IDs oficiais (ds160map):
//   Barcode:            BARCODE_NUMLabel
//   Nome:               APP_SURNAMELabel, APP_GIVEN_NAMELabel
//   Posto:              TARGET_SITE_CD, TARGET_SITE_LINE1..LINE4
//   Print Confirm btn:  FormView1_btnPrintConfirm
//   Print App btn:      FormView1_btnPrintApp
//   Email btn:          FormView1_btnEmailConfirm
// ============================================================

function buildConfirmationMap(a, ctx) {
    return [
        // 1. Capturar o Application ID / Barcode da página
        {
            type: 'extract',
            pattern: /BARCODE_NUMLabel$/i,
            target: 'applicationId',
            description: 'Extract Application ID (barcode number)'
        },
        // 2. Capturar o código do posto consular
        {
            type: 'extract',
            pattern: /TARGET_SITE_CD$/i,
            target: 'consulateCode',
            description: 'Extract consulate code (PTA, RCF, etc.)'
        },
        // 3. Click "Print Confirmation" → dispara window.print()
        {
            type: 'navigation',
            action: 'print_page',
            pattern: /btnPrintConfirm$/i,
            saveAs: 'confirmation',
            description: 'Print/save confirmation page as PDF'
        },
        // 4. Click "Print Application" → navega para printapplication.aspx
        {
            type: 'navigation',
            action: 'click',
            pattern: /btnPrintApp$/i,
            description: 'Click "Print Application" to navigate to full application'
        }
    ];
}


// ══════ page-24-print-app ══════
// ============================================================
// Print Application — Field map
// ============================================================
// URL: common/printapplication.aspx?{encrypted_param}
//
// Particularidade: pode exibir um dialog/modal "OK" que precisa
// ser aceito antes de qualquer ação.
//
// Ações:
//   1. Aceitar dialog OK (se presente)
//   2. Salvar/imprimir a aplicação como PDF
//   3. Click "Back: Confirmation Page" para voltar
//
// IDs oficiais (ds160map):
//   Back button:        TopUpdateButton1  (Back: Confirmation Page)
//   Print button:       TopButton2        (Print Application)
// ============================================================

function buildPrintAppMap(a, ctx) {
    return [
        // 1. Aceitar dialog OK se presente
        {
            type: 'dialog',
            action: 'accept',
            description: 'Accept OK dialog if shown (before page loads fully)'
        },
        // 2. Salvar página como PDF (via Playwright page.pdf() ou print)
        {
            type: 'navigation',
            action: 'save_pdf',
            saveAs: 'application',
            description: 'Save/print full application as PDF'
        },
        // 3. Voltar para Confirmation
        {
            type: 'navigation',
            action: 'click',
            pattern: /TopUpdateButton1$/i,
            description: 'Click "Back: Confirmation Page"'
        }
    ];
}


// ══════ page-25-thank-you ══════
// ============================================================
// Thank You — Field map
// ============================================================
// URL: common/thankyou.aspx
//
// Página final do DS-160. Opções de navegação:
//   - Back to Confirmation
//   - Create a Family Application
//   - Start Another Application
//   - Exit Application
//
// IDs oficiais (ds160map):
//   Back button:        UpdateButton1  (Back to Confirmation)
//   Family button:      UpdateButton2  (Create a Family Application)
//   New App button:     UpdateButton3  (Start Another Application)
//   Exit button:        UpdateButton4  (Exit Application)
// ============================================================

function buildThankYouMap(a, ctx) {
    var nextAction = ctx?.nextAction || 'exit'; // 'family', 'new', 'back', 'exit'

    var actions = {
        back: {
            pattern: /UpdateButton1$/i,
            description: 'Back to Confirmation'
        },
        family: {
            pattern: /UpdateButton2$/i,
            description: 'Create a Family Application'
        },
        new: {
            pattern: /UpdateButton3$/i,
            description: 'Start Another Application'
        },
        exit: {
            pattern: /UpdateButton4$/i,
            description: 'Exit Application'
        }
    };

    var selected = actions[nextAction] || actions.exit;

    return [
        {
            type: 'navigation',
            action: 'click',
            pattern: selected.pattern,
            description: selected.description
        }
    ];
}


// ══════ b1-b2-modular ══════
// ============================================================
// B1/B2 Field Map — MODULAR AGGREGATOR
// Importa cada página e concatena os field-map entries
// ============================================================


// Import page-level builders
















var PAGE_BUILDERS = [
    buildPersonal1Map,
    buildPersonal2Map,
    buildTravelMap,
    buildTravelCompanionsMap,
    buildAddressPhoneMap,
    buildPreviousUSTravelMap,
    buildPassportMap,
    buildUSContactMap,
    buildFamilyParentsMap,
    buildFamilySpouseMap,
    buildWorkEd1Map,
    buildWorkEd2Map,
    buildWorkEd3Map,
    buildPrevSpouseMap,
    buildDeceasedSpouseMap,
    buildSecurityMap
];

function buildDynamicFieldMap(a) {
    // Safe defaults for all optional properties (same as original)
    a = {
        ...a,
        otherNames: a.otherNames || [],
        socialMedia: a.socialMedia || [],
        additionalSocialMediaAccounts: a.additionalSocialMediaAccounts || [],
        languages: a.languages || [],
        countriesVisitedList: a.countriesVisitedList || [],
        organizations: a.organizations || [],
        military: a.military || [],
        previousEmployment: a.previousEmployment || [],
        education: a.education || [],
        travel: a.travel || {},
        passport: a.passport || {},
        homeAddress: a.homeAddress || {},
        usContact: a.usContact || {},
        employer: a.employer || {},
        father: a.father || {},
        mother: a.mother || {},
        spouse: a.spouse || {},
    };
    a.dob = normDate(a.dob);
    var t = a.travel || {};
    t.arrivalDate = normDate(t.arrivalDate);
    t.departureDate = normDate(t.departureDate);
    t.lengthOfStay = t.lengthOfStay || {};
    t.usAddress = t.usAddress || {};
    var payer = a.payer || t.payer || {};
    payer.address = payer.address || {};
    var pp = a.passport || {};
    pp.issuanceDate = normDate(pp.issuanceDate);
    pp.expirationDate = normDate(pp.expirationDate);
    var addr = a.homeAddress || {};
    var uc = a.usContact || {};
    var emp = a.employer || {};
    emp.startDate = normDate(emp.startDate);
    var father = a.father || {};
    father.dob = normDate(father.dob);
    var mother = a.mother || {};
    mother.dob = normDate(mother.dob);
    var spouse = a.spouse || {};
    spouse.dob = normDate(spouse.dob);
    spouse.marriageDate = normDate(spouse.marriageDate);
    spouse.address = spouse.address || {};

    // Context object passed to each page builder
    var ctx = { t, payer, pp, addr, uc, emp, father, mother, spouse, emptyDate };

    // Build from all page modules
    var map = [];
    for (const builder of PAGE_BUILDERS) {
        var entries = builder(a, ctx);
        map.push(...entries);
    }
    return map;
}


// ══════ field-maps-index ══════
// ============================================================
// FIELD MAP ROUTER — Selects the correct field map by visa type
// Supports: B, F, J, O (modular architecture)
// ============================================================


// HOT-RELOAD: Clear require cache for all field-map modules
function clearFieldMapCache() {
    var fieldMapsDir = __dirname;
    var pagesDir = path.join(__dirname, '..', '..', 'pages');
    Object.keys(require.cache).forEach(key => {
        if (key.startsWith(fieldMapsDir) || key.startsWith(pagesDir)) {
            delete require.cache[key];
        }
    });
}

// Load modular field maps

// Extra page builders for F/J (student) and O (petition)



/**
 * Build field map for the given applicant data
 * Auto-detects visa type, applies extra pages for F/J/O
 * HOT-RELOAD: Clears require cache before loading to pick up code changes
 */
function buildDynamicFieldMap(applicantData, visaType) {
    // HOT-RELOAD
    clearFieldMapCache();

    // Build base B1/B2 map (all visas share these pages)
    var freshModular = {};
    var map = freshModular.buildDynamicFieldMap(applicantData);

    // Determine visa type
    var type = (visaType || applicantData?.purposeOfTrip || 'B1/B2').toUpperCase();

    // Add extra pages based on visa type
    var ctx = {}; // minimal ctx for extras
    if (['F1', 'F2', 'J1', 'J2'].some(v => type.includes(v)) || ['F', 'J', 'M'].includes(type.charAt(0))) {
        map.push(...buildStudentExchangeMap(applicantData, ctx));
        // Additional Contact page — only for F1/J1 principal applicants (not F2/J2 dependents)
        if (['F1', 'J1'].some(v => type.includes(v)) || (type.charAt(0) === 'F' && !type.includes('2')) || (type.charAt(0) === 'J' && !type.includes('2'))) {
            map.push(...buildStudentAddContactMap(applicantData, ctx));
        }
    }
    if (['O1', 'O2', 'O3'].some(v => type.includes(v)) || type.charAt(0) === 'O') {
        map.push(...buildTemporaryWorkMap(applicantData, ctx));
    }

    return map;
}

// Re-export everything for backward compatibility


// ══════ filler-extracts ══════
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
        usSsn: p2.ssn && typeof p2.ssn === 'string' && p2.ssn !== 'N/A' && p2.ssn !== 'DNA' ? p2.ssn.replace(/-/g, '') : null,
        usTaxpayerId: p2.taxId && p2.taxId !== 'N/A' && p2.taxId !== 'DNA' ? p2.taxId : null,

        // === TRAVEL ===
        purposeOfTrip: (() => {
            const pt = g(trav, 'purposeOfTrip', 'purpose_of_trip');
            return (pt && pt !== 'N/A') ? pt : null;
        })(),
        purposeCategory: g(trav, 'purposeCategory', 'purpose_category') || null,
        purposeSubCategory: (() => {
            const raw = g(trav, 'purposeSubCategory', 'purpose_sub_category');
            if (!raw) return null;
            return raw.replace(/\//g, '-'); // DS-160 uses B1-B2, clone may use B1/B2
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
                // Support flat fields (usAddressStreet1, etc.) from clone form
                const street1 = ua.street1 || trav.usAddressStreet1 || trav.us_address_street1 || '';
                const street2 = ua.street2 || trav.usAddressStreet2 || trav.us_address_street2 || '';
                const city = ua.city || trav.usAddressCity || trav.us_address_city || '';
                const state = ua.state || trav.usAddressState || trav.us_address_state || '';
                const zip = ua.zip || ua.postalCode || trav.usAddressZip || trav.us_address_zip || '';
                if (!street1 && !city && !state) return null;
                return { street1, street2, city, state, zip };
            })()
        },
        // Specific locations array for dtlTravelLoc addAnother support
        specificLocations: (() => {
            const locs = trav.specificLocations || trav.specific_locations;
            if (Array.isArray(locs) && locs.length) return locs;
            const single = trav.specificLocation || trav.specific_location;
            if (single) return [single];
            // Fallback: use arrivalCity as specific location when plans are specific
            const city = trav.arrivalCity || trav.arrival_city;
            if (city) return [city];
            return [];
        })(),
        payingForTrip: (() => {
            // Clone form uses OTH/SELF/COM/EMP/USE/USP, DS-160 select uses O/S/C/P/U
            const raw = trav.whoIsPaying || trav.who_is_paying || null;
            if (!raw) return null;
            const PAYER_MAP = { 'OTH': 'O', 'SELF': 'S', 'COM': 'C', 'COMPANY': 'C', 'EMP': 'P', 'EMPLOYER': 'P', 'USE': 'U', 'USP': 'U' };
            return PAYER_MAP[raw.toUpperCase()] || raw;
        })(),
        payer: (() => {
            const p = trav.payer || {};
            // Support flat fields from clone form (payerSurname, payerPersonStreet1, etc.)
            const hasFlatPayer = !!(trav.payerSurname || trav.payerGivenName || trav.payerPhone);
            const hasNestedPayer = !!(p.surname || p.givenName || p.phone || p.companyName);
            if (!hasFlatPayer && !hasNestedPayer) return null;

            const payerType = (() => {
                const raw = trav.whoIsPaying || trav.who_is_paying || null;
                if (!raw) return null;
                const PAYER_MAP = { 'OTH': 'O', 'SELF': 'S', 'COM': 'C', 'COMPANY': 'C', 'EMP': 'P', 'EMPLOYER': 'P', 'USE': 'U', 'USP': 'U' };
                return PAYER_MAP[raw.toUpperCase()] || raw;
            })();

            const INVALID = ['DNA', 'N/A', 'N-A', 'NA', 'XXX', 'NONE', 'N/D', ''];
            const cleanVal = (v) => (v && !INVALID.includes(String(v).trim().toUpperCase())) ? v : null;

            // Build payer from flat or nested fields
            const surname = p.surname || trav.payerSurname || trav.payer_surname || '';
            const givenName = p.givenName || trav.payerGivenName || trav.payer_given_name || '';
            const phone = p.phone || trav.payerPhone || trav.payer_phone || '';
            const email = cleanVal(p.email || trav.payerEmail || trav.payer_email);
            const relationship = p.relationship || trav.payerRelationship || trav.payer_relationship || '';
            const sameAddress = p.sameAddress || trav.payerSameAddress || trav.payer_same_address;
            const companyName = p.companyName || trav.payerCompanyName || '';
            const companyRelation = p.companyRelation || trav.payerCompanyRelation || '';

            // Address: from nested or flat payer fields
            const addr = ['C', 'P', 'U'].includes(payerType) ? (p.companyAddress || p.address || {}) : (p.address || {});
            const street1 = p.street1 || addr.street1 || trav.payerPersonStreet1 || trav.payer_person_street1 || '';
            const street2 = p.street2 || addr.street2 || trav.payerPersonStreet2 || trav.payer_person_street2 || '';
            const city = p.city || addr.city || trav.payerPersonCity || trav.payer_person_city || '';
            const state = p.state || addr.state || trav.payerPersonState || trav.payer_person_state || '';
            const postalCode = p.postalCode || addr.postalCode || trav.payerPersonPostalCode || trav.payer_person_postal_code || '';
            const country = p.country || addr.country || trav.payerPersonCountry || trav.payer_person_country || '';

            return { surname, givenName, phone, email, relationship, sameAddress, companyName, companyRelation, companyPhone: p.companyPhone, street1, street2, city, state, postalCode, country };
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
        hasBeenInUS: (() => {
            // Explicit Y/N from form
            if (prev.hasBeenInUS === 'Y' || prev.has_been_in_us === 'Y' || prev.hasBeenToUS === 'Y') return true;
            if (prev.hasBeenInUS === 'N' || prev.has_been_in_us === 'N' || prev.hasBeenToUS === 'N') return false;
            // Infer from data: if previousVisits exist, user HAS been to US
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (visits.length > 0) {
                console.log(`[Normalize] Inferred hasBeenInUS=true from ${visits.length} previousVisits`);
                return true;
            }
            return false;
        })(),
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
        previousUSDriversLicense: (() => {
            if (prev.hasDriversLicense === 'Y' || prev.previousUSDriversLicense === 'Y' || prev.has_drivers_license === 'Y') return true;
            if (prev.hasDriversLicense === 'N' || prev.previousUSDriversLicense === 'N' || prev.has_drivers_license === 'N') return false;
            // Infer from data
            const dls = prev.driversLicenses || prev.drivers_licenses || [];
            if (dls.length > 0 && dls.some(dl => dl.number)) {
                console.log(`[Normalize] Inferred previousUSDriversLicense=true from ${dls.length} licenses`);
                return true;
            }
            return false;
        })(),
        // Full array for multiple licenses (field-map forEach + addAnother)
        driversLicenses: (prev.driversLicenses || prev.drivers_licenses || []).map(dl => ({
            number: dl.number || '', state: dl.state || '',
        })),
        // Legacy singular fallback
        previousUSDriversLicenseNumber: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.number,
        previousUSDriversLicenseState: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.state,
        hasUSVisa: (() => {
            if (prev.hasUSVisa === 'Y' || prev.has_us_visa === 'Y') return true;
            if (prev.hasUSVisa === 'N' || prev.has_us_visa === 'N') return false;
            // Infer from data
            const visa = prev.previousVisa || prev.previous_visa;
            if (visa && (visa.number || visa.issueDate)) {
                console.log('[Normalize] Inferred hasUSVisa=true from previousVisa data');
                return true;
            }
            return false;
        })(),
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
                lostYear: visa.lostYear || visa.lost_year || '',
                lostExplanation: visa.lostExplanation || visa.lost_explanation || '',
                cancelled: visa.cancelled === 'Y',
                cancelledExplanation: visa.cancelledExplanation || visa.cancelled_explanation || '',
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
        homeAddress: (() => {
            const ha = addr.homeAddress || addr.home_address || {};
            // Support flat fields from clone form (homeStreet1, homeCity, etc.)
            return {
                street1: ha.street1 || addr.homeStreet1 || addr.home_street1 || '',
                street2: ha.street2 || addr.homeStreet2 || addr.home_street2 || '',
                city: ha.city || addr.homeCity || addr.home_city || '',
                state: ha.state || addr.homeState || addr.home_state || '',
                postalCode: ha.postalCode || addr.homePostalCode || addr.home_postal_code || '',
                country: ha.country || addr.homeCountry || addr.home_country || '',
            };
        })(),
        mailingAddressSame: addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true || addr.mailing_address_same === 'Y' || addr.mailing_address_same === true,
        mailingAddress: (() => {
            if (addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true) return null;
            const ma = addr.mailingAddress || addr.mailing_address || {};
            // Support flat fields from clone form
            const street1 = ma.street1 || addr.mailStreet1 || addr.mail_street1 || '';
            const city = ma.city || addr.mailCity || addr.mail_city || '';
            if (!street1 && !city) return null;
            return {
                street1,
                street2: ma.street2 || addr.mailStreet2 || addr.mail_street2 || '',
                city,
                state: ma.state || addr.mailState || addr.mail_state || '',
                postalCode: ma.postalCode || addr.mailPostalCode || addr.mail_postal_code || '',
                country: ma.country || addr.mailCountry || addr.mail_country || '',
            };
        })(),
        phone: g(addr, 'phone', 'phone'),
        mobilePhone: na(addr.mobilePhone || addr.mobile_phone) || null,
        businessPhone: na(addr.businessPhone || addr.business_phone) || null,
        email: g(addr, 'email', 'email'),
        additionalPhones: addr.additionalPhones === 'Y' || addr.additional_phones === 'Y' || false,
        additionalPhoneNumbers: addr.additionalPhoneNumbers || addr.additional_phone_numbers || [],
        additionalEmails: addr.additionalEmails === 'Y' || addr.additional_emails === 'Y' || false,
        additionalEmailAddresses: addr.additionalEmailAddresses || addr.additional_email_addresses || [],
        socialMedia: (() => {
            // DS-160 valid platform codes + friendly name map
            const PLATFORM_MAP = {
                'TWITTER': 'TWIT', 'TWIT': 'TWIT', 'X': 'TWIT',
                'FACEBOOK': 'FCBK', 'FCBK': 'FCBK', 'FB': 'FCBK',
                'INSTAGRAM': 'INST', 'INST': 'INST', 'INSTA': 'INST',
                'LINKEDIN': 'LINK', 'LINK': 'LINK',
                'YOUTUBE': 'YTUB', 'YTUB': 'YTUB',
                'REDDIT': 'RDDT', 'RDDT': 'RDDT',
                'GOOGLE': 'GOGL', 'GOGL': 'GOGL', 'GOOGLE+': 'GOGL',
                'FLICKR': 'FLKR', 'FLKR': 'FLKR',
                'TUMBLR': 'TUMB', 'TUMB': 'TUMB',
                'PINTEREST': 'PTST', 'PTST': 'PTST',
                'VINE': 'VINE', 'MYSPACE': 'MYSP', 'MYSP': 'MYSP',
                'ASK.FM': 'ASKF', 'ASKF': 'ASKF',
                'WEIBO': 'SWBO', 'SWBO': 'SWBO', 'SINA': 'SWBO', 'SINA WEIBO': 'SWBO',
                'TENCENT WEIBO': 'TWBO', 'TWBO': 'TWBO',
                'DOUBAN': 'DUBN', 'DUBN': 'DUBN',
                'QZONE': 'QZNE', 'QZNE': 'QZNE', 'QQ': 'QZNE',
                'TWOO': 'TWOO', 'VKONTAKTE': 'VKON', 'VKON': 'VKON', 'VK': 'VKON',
                'YOUKU': 'YUKU', 'YUKU': 'YUKU', 'NONE': 'NONE',
            };
            const VALID_CODES = new Set(Object.values(PLATFORM_MAP));
            const raw = (addr.socialMedia || addr.social_media || [])
                .filter(sm => sm.platform && sm.platform.trim()); // Remove entries without platform
            const mapped = raw.map(sm => ({
                ...sm,
                _original: sm.platform,
                platform: PLATFORM_MAP[(sm.platform || '').toUpperCase()] || sm.platform,
            }));
            // Plataformas sem cÃƒÆ’Ã‚Â³digo DS-160 ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ movidas para additionalSocialMedia
            const unsupported = mapped.filter(sm => !VALID_CODES.has((sm.platform || '').toUpperCase()));
            if (unsupported.length > 0) {
                unsupported.forEach(sm => console.log(`[Normalize] ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â€ÃƒÂ¯Ã‚Â¸Ã‚Â "${sm._original}" ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ additionalSocialMedia (nÃƒÆ’Ã‚Â£o tem cÃƒÆ’Ã‚Â³digo DS-160)`));
                // Auto-inject into additionalSocialMedia (merged below)
                addr._overflowSocialMedia = unsupported.map(sm => ({
                    platform: sm._original || sm.platform,
                    handle: sm.handle || '',
                }));
            }
            return mapped.filter(sm => VALID_CODES.has((sm.platform || '').toUpperCase()));
        })(),
        additionalSocialMedia: addr.additionalSocialMedia === 'Y' || addr.additional_social_media === 'Y' || !!(addr._overflowSocialMedia?.length),
        additionalSocialMediaAccounts: [
            ...(addr.additionalSocialMediaAccounts || addr.additional_social_media_accounts || []),
            ...(addr._overflowSocialMedia || []),
        ],

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
        location: (typeof data.location === 'object' && data.location !== null) ? (data.location.location || data.location.value || Object.values(data.location)[0]) : (data.location || null),
        securityAnswer: data.securityAnswer || data.security_answer || null
    };
}

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

function isSecurityPage(url) { return url.includes('SecurityandBackground'); }
function isSelectEmpty(val) {
    if (!val) return true;
    const v = val.trim();
    return v === '' || v === '-1' || v === '0' || v === 'SONE' || v.toUpperCase().includes('SELECT');
}


// ══════ Global exports ══════
window._automation = {
    buildDynamicFieldMap,
    normalizeProfile,
    identifyPage,
    isFinalPage,
};
console.log('[Bundle] ✅ Loaded (light):', Object.keys(window._automation).join(', '));
