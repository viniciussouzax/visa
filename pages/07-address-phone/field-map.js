// ============================================================
// Address & Phone — Home, mailing, phones, email, social media
// Field map for 07-address-phone
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildAddressPhoneMap(a, ctx) {
    const map = [];
    const { addr } = ctx;

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
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
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
    const previousVisits = a.previousVisits || (a.previousUSVisit ? [a.previousUSVisit] : []);
    if (a.hasBeenInUS) {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" });
    
      if (previousVisits.length > 0) {
        previousVisits.forEach((pv, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = {};
          if (idx > 0) base.addAnother = { list: "dtlPREV_US_VISIT", idx };
          const ad = pv.arrivalDate || {};
      
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
          const pv = previousVisits[0];
          const ad = pv.arrivalDate || {};
          map.push(
            { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: padDay(ad.day), type: "select" },
            { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: ad.month, type: "select" },
            { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: ad.year, type: "text" },
            { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
            { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
          );
        }
      }
    
      // Driver's licenses — supports multiple via addAnother
      const driversLicenses = a.driversLicenses || (a.previousUSDriversLicenseNumber ? [{ number: a.previousUSDriversLicenseNumber, state: a.previousUSDriversLicenseState }] : []);
      if (a.previousUSDriversLicense) {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" });
    
        if (driversLicenses.length > 0) {
          driversLicenses.forEach((dl, idx) => {
            const ctl = `ctl${String(idx).padStart(2, '0')}`;
            const base = {};
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
        }
      } else {
        map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" });
      }
    } else {
      map.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" });
    }
    
    // Has previous visa?
    if (a.hasUSVisa) {
      map.push({ pattern: /rblPREV_VISA_IND_0$/i, value: "", type: "click" });
      if (a.previousVisa) {
        const visa = a.previousVisa;
        map.push(
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
        if (visa.lost) {
          if (visa.lostYear) map.push({ pattern: /tbxPREV_VISA_LOST_YEAR$/i, value: visa.lostYear, type: "text" });
          if (visa.lostExplanation) map.push({ pattern: /tbxPREV_VISA_LOST_EXPL$/i, value: visa.lostExplanation, type: "text" });
        }
        map.push(
          { pattern: visa.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
        );
        if (visa.cancelled && visa.cancelledExplanation) {
          map.push(
            { pattern: /tbxPREV_VISA_CANCELLED_EXPL$/i, value: visa.cancelledExplanation, type: "text" },
          );
        }
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
    if (a.additionalPhones) {
      map.push({ pattern: /rblAddPhone_0$/i, value: "", type: "click" });
      if (a.additionalPhoneNumbers?.length > 0) {
        a.additionalPhoneNumbers.forEach((phone, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = { type: "text" };
          if (idx > 0) base.addAnother = { list: "dtlAddPhone", idx };
          const phoneVal = typeof phone === 'object' ? (phone.phone || phone.number || '') : phone;
          map.push({ pattern: new RegExp(`dtlAddPhone_${ctl}_tbxAddPhoneInfo$`, 'i'), value: ph(phoneVal), ...base });
        });
      }
    } else {
      map.push({ pattern: /rblAddPhone_1$/i, value: "", type: "click" });
    }
    
    // Additional emails (dtlAddEmail) — supports multiple entries
    // Pergunta: "Do you have additional email addresses?" → Yes/No
    // Respostas: additionalEmailAddresses[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.additionalEmails) {
      map.push({ pattern: /rblAddEmail_0$/i, value: "", type: "click" });
      if (a.additionalEmailAddresses?.length > 0) {
        a.additionalEmailAddresses.forEach((emailEntry, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = { type: "text" };
          if (idx > 0) base.addAnother = { list: "dtlAddEmail", idx };
          const emailVal = typeof emailEntry === 'object' ? emailEntry.email : emailEntry;
          map.push({ pattern: new RegExp(`dtlAddEmail_${ctl}_tbxAddEmailInfo$`, 'i'), value: emailVal || "", ...base });
        });
      }
    } else {
      map.push({ pattern: /rblAddEmail_1$/i, value: "", type: "click" });
    }
    
    // NOTE: Seção "dtlSocialMedia" / "rblAddSite" REMOVIDA — não existe no DS-160 real.
    // A social media obrigatória é preenchida via dtlSocial (L368-395 acima).
    // "Additional Social Media" usa rblAddSocial / dtlAddSocial (abaixo).
    
    // Additional Social Media (dtlAddSocial) — supports multiple entries
    // Pergunta: "Do you have additional social media platforms?" → Yes/No
    // Respostas: additionalSocialMediaAccounts[0] (ctl00), [1] (ctl01 → addAnother), ...
    if (a.additionalSocialMedia) {
      map.push({ pattern: /rblAddSocial_0$/i, value: "", type: "click" });
      if (a.additionalSocialMediaAccounts?.length > 0) {
        a.additionalSocialMediaAccounts.forEach((sm, idx) => {
          const ctl = `ctl${String(idx).padStart(2, '0')}`;
          const base = {};
          if (idx > 0) base.addAnother = { list: "dtlAddSocial", idx };
          map.push(
            { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialPlat$`, 'i'), value: sm.platform || "", type: "text", ...base },
            { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialPlatform$`, 'i'), value: sm.platform || "", type: "text", ...base }, // fallback
            { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialHand$`, 'i'), value: sm.handle || "", type: "text", ...base },
            { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxSocialMediaIdent$`, 'i'), value: sm.handle || "", type: "text", ...base }, // fallback
          );
        });
      }
    } else {
      map.push({ pattern: /rblAddSocial_1$/i, value: "", type: "click" });
    }

    return map;
}

module.exports = { buildAddressPhoneMap };
