// ============================================================
// Dynamic Field Map Builder - supports all DS-160 branches
// ============================================================

function ph(s) {
  return (s || "").replace(/[^0-9+]/g, "").replace("+", "");
}

function buildDynamicFieldMap(a) {
  // Safe defaults for all optional properties
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
  const emptyDate = { day: '', month: '', year: '' };
  a.dob = a.dob || emptyDate;
  const t = a.travel || {};
  t.arrivalDate = t.arrivalDate || emptyDate;
  t.departureDate = t.departureDate || emptyDate;
  t.lengthOfStay = t.lengthOfStay || {};
  t.usAddress = t.usAddress || {};
  // Payer: prefer a.payer (flat from normalizeProfile) over t.payer (nested from travel)
  const payer = a.payer || t.payer || {};
  payer.address = payer.address || {};
  const pp = a.passport || {};
  pp.issuanceDate = pp.issuanceDate || emptyDate;
  pp.expirationDate = pp.expirationDate || emptyDate;
  const addr = a.homeAddress || {};
  const uc = a.usContact || {};
  const emp = a.employer || {};
  emp.startDate = emp.startDate || emptyDate;
  // prev and edu are now handled via forEach inside their respective sections
  const father = a.father || {};
  father.dob = father.dob || emptyDate;
  const mother = a.mother || {};
  mother.dob = mother.dob || emptyDate;
  const spouse = a.spouse || {};
  spouse.dob = spouse.dob || emptyDate;
  spouse.address = spouse.address || {};
  const map = [];

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
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
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
      const ctl = `ctl${String(idx).padStart(2, '0')}`; // ctl00, ctl01, ctl02...
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
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
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

  // ===================================================================
  // TRAVEL
  // ===================================================================
  // Purpose of trip: use dynamic values from profile (fallback to B / B1-B2 for backward compat)
  map.push(
    { pattern: /ddlPurposeOfTrip$/i, value: a.purposeCategory || "B", type: "select" },
    { pattern: /ddlOtherPurpose$/i, value: a.purposeSubCategory || a.purposeOfTrip || "B1-B2", type: "select" },
    { pattern: /ddlVisaClass$/i, value: a.purposeOfTrip, type: "select-search" },
  );

  // Specific Travel Plans
  // Pergunta: "Do you have specific travel plans?" → Yes/No
  // Respostas: specificLocations[0] (ctl00), specificLocations[1] (ctl01 → addAnother), ...
  if (a.hasSpecificPlans) {
    map.push(
      { pattern: /rblSpecificTravel_0$/i, value: "", type: "click" },
    );
    // Travel Locations (dtlTravelLoc) — supports multiple entries
    const travelLocs = a.specificLocations || [t.location || t.usAddress?.city || ''];
    travelLocs.forEach((loc, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlTravelLoc", idx };
      map.push({ pattern: new RegExp(`dtlTravelLoc_${ctl}_tbxSPECTRAVEL_LOCATION$`, 'i'), value: loc || "", ...base });
    });
    // Also push generic pattern for ctl00 fallback
    if (travelLocs.length === 1) {
      map.push({ pattern: /tbxSPECTRAVEL_LOCATION$/i, value: travelLocs[0] || "", type: "text" });
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

  // ===================================================================
  // TRAVEL COMPANIONS
  // ===================================================================
  // Travel Companions (dlTravelCompanions) — supports multiple entries
  // Pergunta: "Are there other persons traveling with you?" → Yes/No
  // Respostas: companions[0] (ctl00), companions[1] (ctl01 → addAnother), ...
  if (a.travelingWithOthers && a.companions?.length) {
    map.push({ pattern: /rblOtherPersonsTravelingWithYou_0$/i, value: "", type: "click" });

    a.companions.forEach((comp, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dlTravelCompanions", idx };

      map.push(
        { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_SURNAME$`, 'i'), value: comp.surname || "", type: "text", ...base },
        // DS-160 uses tbxGivenName (NOT tbxTC_GIVEN_NAME) for travel companions
        { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxGivenName$`, 'i'), value: comp.givenName || "", type: "text", ...base },
        { pattern: new RegExp(`dlTravelCompanions_${ctl}_tbxTC_GIVEN_NAME$`, 'i'), value: comp.givenName || "", type: "text", ...base },
        { pattern: new RegExp(`dlTravelCompanions_${ctl}_ddlTCRelationship$`, 'i'), value: comp.relationship || "", type: "select", ...base },
      );
      // Generic fallback for ctl00 (DS-160 uses varying IDs for first entry)
      if (idx === 0) {
        map.push(
          { pattern: /tbxTC_SURNAME$/i, value: comp.surname || "", type: "text" },
          { pattern: /tbxTC_GIVEN_NAME$/i, value: comp.givenName || "", type: "text" },
          { pattern: /tbxSurname$/i, value: comp.surname || "", type: "text" },
          { pattern: /tbxGivenName$/i, value: comp.givenName || "", type: "text" },
          { pattern: /ddlTCRelationship$/i, value: comp.relationship || "", type: "select" },
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

  // ===================================================================
  // PREVIOUS US TRAVEL
  // ===================================================================
  // Has been in US? — supports multiple visits via addAnother
  const previousVisits = a.previousVisits || (a.previousUSVisit ? [a.previousUSVisit] : []);
  if (a.hasBeenInUS && previousVisits.length > 0) {
    map.push({ pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" });

    previousVisits.forEach((pv, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlPREV_US_VISIT", idx };
      const ad = pv.arrivalDate || {};

      map.push(
        { pattern: new RegExp(`dtlPREV_US_VISIT_${ctl}_ddlPREV_US_VISIT_DTEDay$`, 'i'), value: ad.day || "", type: "select", ...base },
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
        { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: ad.day, type: "select" },
        { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: ad.month, type: "select" },
        { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: ad.year, type: "text" },
        { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
        { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
      );
    }

    // Driver's licenses — supports multiple via addAnother
    const driversLicenses = a.driversLicenses || (a.previousUSDriversLicenseNumber ? [{ number: a.previousUSDriversLicenseNumber, state: a.previousUSDriversLicenseState }] : []);
    if (a.previousUSDriversLicense && driversLicenses.length > 0) {
      map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" });

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
    } else {
      map.push({ pattern: /rblPREV_US_DRIVER_LIC_IND_1$/i, value: "", type: "click" });
    }
  } else {
    map.push({ pattern: /rblPREV_US_TRAVEL_IND_1$/i, value: "", type: "click" });
  }

  // Has previous visa?
  if (a.hasUSVisa && a.previousVisa) {
    const visa = a.previousVisa;
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
      { pattern: visa.cancelled ? /rblPREV_VISA_CANCELLED_IND_0$/i : /rblPREV_VISA_CANCELLED_IND_1$/i, value: "", type: "click" },
    );
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
    { pattern: /ddlAPP_ADDR_CNTRY$/i, value: addr.country, type: "select-label" },
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
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlAddPhone", idx };
      map.push({ pattern: new RegExp(`dtlAddPhone_${ctl}_tbxAddPhoneInfo$`, 'i'), value: ph(phone), ...base });
    });
  } else {
    map.push({ pattern: /rblAddPhone_1$/i, value: "", type: "click" });
  }

  // Additional emails (dtlAddEmail) — supports multiple entries
  // Pergunta: "Do you have additional email addresses?" → Yes/No
  // Respostas: additionalEmailAddresses[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (a.additionalEmails && a.additionalEmailAddresses?.length) {
    map.push({ pattern: /rblAddEmail_0$/i, value: "", type: "click" });
    a.additionalEmailAddresses.forEach((email, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlAddEmail", idx };
      map.push({ pattern: new RegExp(`dtlAddEmail_${ctl}_tbxAddEmailInfo$`, 'i'), value: email || "", ...base });
    });
  } else {
    map.push({ pattern: /rblAddEmail_1$/i, value: "", type: "click" });
  }

  // Social Media (dtlSocialMedia) — supports multiple entries
  // Pergunta: "Do you use social media?" → Yes/No
  // Respostas: socialMedia[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (Array.isArray(a.socialMedia) && a.socialMedia.length > 0) {
    map.push({ pattern: /rblAddSite_0$/i, value: "", type: "click" });
    a.socialMedia.forEach((sm, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlSocialMedia", idx };
      map.push(
        { pattern: new RegExp(`dtlSocialMedia_${ctl}_ddlSocialMedia$`, 'i'), value: sm.platform || "", type: "select-search", ...base },
        { pattern: new RegExp(`dtlSocialMedia_${ctl}_tbxSocialMediaIdent$`, 'i'), value: sm.handle || "", type: "text", ...base },
      );
    });
    // Generic fallback for ctl00
    map.push(
      { pattern: /ddlSocialMedia$/i, value: a.socialMedia[0].platform, type: "select-search" },
      { pattern: /tbxSocialMediaIdent$/i, value: a.socialMedia[0].handle, type: "text" },
    );
  } else {
    map.push({ pattern: /rblAddSite_1$/i, value: "", type: "click" });
    map.push({ pattern: /cbexSOCIAL_MEDIA_PLATFORM_NA$/i, value: "", type: "checkbox-check" });
  }

  // Additional Social Media (dtlAddSocial) — supports multiple entries
  // Pergunta: "Do you have additional social media platforms?" → Yes/No
  // Respostas: additionalSocialMediaAccounts[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (a.additionalSocialMedia && a.additionalSocialMediaAccounts?.length) {
    map.push({ pattern: /rblAddSocial_0$/i, value: "", type: "click" });
    a.additionalSocialMediaAccounts.forEach((sm, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlAddSocial", idx };
      map.push(
        { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxAddSocialPlatform$`, 'i'), value: sm.platform || "", type: "text", ...base },
        { pattern: new RegExp(`dtlAddSocial_${ctl}_tbxSocialMediaIdent$`, 'i'), value: sm.handle || "", type: "text", ...base },
      );
    });
  } else {
    map.push({ pattern: /rblAddSocial_1$/i, value: "", type: "click" });
  }

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
  const lostPassports = pp.lostPassports || (pp.lostPassport ? [pp.lostPassport] : []);
  if ((pp.lostOrStolen === 'Y' || pp.lostOrStolen === true) && lostPassports.length > 0) {
    map.push({ pattern: /rblLOST_PPT_IND_0$/i, value: "", type: "click" });

    lostPassports.forEach((lp, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlLostPPT", idx };

      const lostNum = lp.number;
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
  const ucZip = uc.zip ? uc.zip.toString().padStart(5, '0') : '';
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

  // Spouse (non-single marital status) - Family2 page
  // Actual IDs: tbxSpouseSurname, tbxSpouseGivenName, ddlSpouseNatDropDownList,
  //             ddlSpousePOBCountry, tbxSpousePOBCity, ddlSpouseAddressType
  // DOB uses generic ddlDOBDay/ddlDOBMonth/tbxDOBYear (handled via page override in fill-form)
  const needsSpouse = a.maritalStatus !== "S" && a.maritalStatus !== "W";
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
      const sa = a.spouse.address;
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
  const usRelatives = a.relatives || (a.immediateRelative ? [a.immediateRelative] : []);
  if ((a.relativesInUS || a.immediateRelativesInUS) && usRelatives.length > 0) {
    map.push({ pattern: /rblUS_IMMED_RELATIVE_IND_0$/i, value: "", type: "click" });

    usRelatives.forEach((rel, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
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

  // ===================================================================
  // WORK / EDUCATION 1 (Current)
  // ===================================================================
  map.push({ pattern: /ddlPresentOccupation$/i, value: a.occupationCode, type: "select" });

  // Occupation explanation (for "N" = Not Employed, "O" = Other, "RT" = Retired, etc.)
  if (a.occupationCode === "N") {
    map.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || "NOT CURRENTLY EMPLOYED", type: "text" });
  } else if (a.occupationCode === "O" || a.occupationCode === "RT") {
    map.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || "OTHER", type: "text" });
  }

  if (emp) {
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
      { pattern: /JobTitle/i, value: emp.jobTitle || "", type: "text" },
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
      { pattern: /FormView1_ddlEmpDateFromDay$/i, value: "1", type: "select" },
      { pattern: /FormView1_ddlEmpDateFromMonth$/i, value: emp.startDate.month, type: "select" },
      { pattern: /FormView1_tbxEmpDateFromYear$/i, value: emp.startDate.year, type: "text" },
      { pattern: /FormView1_tbxDescribeDuties$/i, value: emp.duties, type: "text" },
    );
  }

  // ===================================================================
  // WORK / EDUCATION 2 (Previous)
  // ===================================================================
  // Previous Employment (dtlPrevEmpl) — supports multiple entries
  // Pergunta: "Were you previously employed?" → Yes/No
  // Respostas: previousEmployment[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (a.hasPreviousEmployment && a.previousEmployment?.length > 0) {
    map.push({ pattern: /rblPreviouslyEmployed_0$/i, value: "", type: "click" });

    a.previousEmployment.forEach((prev, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlPrevEmpl", idx };
      const sd = prev.startDate || emptyDate;
      const ed = prev.endDate || emptyDate;

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
        { pattern: new RegExp(`dtlPrevEmpl_${ctl}_tbDescribeDuties$`, 'i'), value: prev.duties || "GENERAL DUTIES", type: "text", ...base },
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
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlPrevEduc", idx };
      const sd = edu.startDate || emptyDate;
      const ed = edu.endDate || emptyDate;

      map.push(
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolName$`, 'i'), value: edu.name || "", type: "text", ...base },
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr1$`, 'i'), value: edu.street1 || edu.city || "N/A", type: "text", ...base },
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolAddr2$`, 'i'), value: edu.street2 || "", type: "text", ...base },
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxSchoolCity$`, 'i'), value: edu.city || "", type: "text", ...base },
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_ADDR_STATE$`, 'i'), value: edu.state || edu.city || "N/A", type: "text", ...base },
        { pattern: new RegExp(`dtlPrevEduc_${ctl}_tbxEDUC_INST_POSTAL_CD$`, 'i'), value: edu.postalCode || "00000", type: "text", ...base },
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

  // ===================================================================
  // WORK / EDUCATION 3 (Additional)
  // ===================================================================
  // Languages (dtlLANGUAGES) — supports multiple entries
  // Respostas: languages[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (a.languages?.length > 0) {
    a.languages.forEach((lang, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlLANGUAGES", idx };
      map.push({ pattern: new RegExp(`dtlLANGUAGES_${ctl}_tbxLANGUAGE_NAME$`, 'i'), value: lang || "", ...base });
    });
    // Generic fallback for ctl00
    map.push({ pattern: /tbxLANGUAGE_NAME$/i, value: a.languages[0] || "", type: "text" });
  }

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
    a.countriesVisitedList.forEach((country, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlCountriesVisited", idx };
      map.push({ pattern: new RegExp(`dtlCountriesVisited_${ctl}_ddlCOUNTRIES_VISITED$`, 'i'), value: country || "", type: "select-search", ...base });
    });
    // Generic fallback for ctl00
    map.push({ pattern: /ddlCOUNTRIES_VISITED$/i, value: a.countriesVisitedList[0], type: "select-search" });
  } else {
    map.push({ pattern: /rblCOUNTRIES_VISITED_IND_1$/i, value: "", type: "click" });
  }

  // Organizations (dtlORGANIZATIONS) — supports multiple entries
  // Pergunta: "Do you belong to any organizations?" → Yes/No
  // Respostas: organizations[0] (ctl00), [1] (ctl01 → addAnother), ...
  if (a.organizationMember && a.organizations?.length > 0) {
    map.push({ pattern: /rblORGANIZATION_IND_0$/i, value: "", type: "click" });
    a.organizations.forEach((org, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
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
  const militaryEntries = Array.isArray(a.military) ? a.military : (a.military ? [a.military] : []);
  if (a.militaryService && militaryEntries.length > 0) {
    map.push({ pattern: /rblMILITARY_SERVICE_IND_0$/i, value: "", type: "click" });

    militaryEntries.forEach((m, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dtlMILITARY_SERVICE", idx };
      const sd = m.startDate || emptyDate;
      const ed = m.endDate || emptyDate;

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
      const m = militaryEntries[0];
      const sd = m.startDate || emptyDate;
      const ed = m.endDate || emptyDate;
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

  // ===================================================================
  // PREVIOUS SPOUSE (PrevSpouse page - D/W/L marital status)
  // ===================================================================
  const needsPrevSpouse = ["D", "W", "L"].includes(a.maritalStatus);
  // Support multiple previous spouses via array (from form clone) or singular object (legacy)
  const prevSpouseEntries = (a.previousSpouses || (a.previousSpouse ? [a.previousSpouse] : []))
    .filter(ps => ps.surname || ps.givenName); // filter out empty entries
  if (needsPrevSpouse && prevSpouseEntries.length > 0) {
    // Number of former spouses
    map.push({ pattern: /NumberOfFormerSpouses$|NUM_PREV_SPOUSES$|ddlNumberPrevSpouses$|tbxNumberPrevSpouses$/i, value: prevSpouseEntries[0].numberOfFormerSpouses || String(prevSpouseEntries.length), type: "text" });

    prevSpouseEntries.forEach((ps, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = {};
      if (idx > 0) base.addAnother = { list: "dlPrevSpouse", idx };
      const dom = ps.dateOfMarriage || emptyDate;
      const dome = ps.dateMarriageEnded || emptyDate;

      map.push(
        { pattern: new RegExp(`DListSpouse_${ctl}_tbxSURNAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_SURNAME$`, 'i'), value: ps.surname || "", type: "text", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_tbxGIVEN_NAME$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_GIVEN_NAME$`, 'i'), value: ps.givenName || "", type: "text", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBDay$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBDay$`, 'i'), value: ps.dob?.day || "", type: "select", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_ddlDOBMonth$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_DOBMonth$`, 'i'), value: ps.dob?.month || "", type: "select", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_tbxDOBYear$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_DOBYear$`, 'i'), value: ps.dob?.year || "", type: "text", ...base },
        { pattern: new RegExp(`ddlSPOUSE_NATL$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_NATL$`, 'i'), value: ps.nationality || "", type: "select-label", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_tbxSPOUSE_POB_CITY$|dlPrevSpouse_${ctl}_tbxPREV_SPOUSE_CITY$`, 'i'), value: ps.cityOfBirth || "", type: "text", ...base },
        { pattern: new RegExp(`DListSpouse_${ctl}_ddlSPOUSE_POB_CNTRY$|dlPrevSpouse_${ctl}_ddlPREV_SPOUSE_CNTRY$`, 'i'), value: ps.countryOfBirth || "", type: "select-label", ...base },
        { pattern: new RegExp(`ddlDATE_OF_MARRIAGEDay$|ddlDateOfMarriageDay$|dlPrevSpouse_${ctl}_ddlDOM_DTEDay$`, 'i'), value: dom.day || "", type: "select", ...base },
        { pattern: new RegExp(`ddlDATE_OF_MARRIAGEMonth$|ddlDateOfMarriageMonth$|dlPrevSpouse_${ctl}_ddlDOM_DTEMonth$`, 'i'), value: dom.month || "", type: "select", ...base },
        { pattern: new RegExp(`tbxDATE_OF_MARRIAGEYear$|tbxDateOfMarriageYear$|dlPrevSpouse_${ctl}_tbxDOM_DTEYear$`, 'i'), value: dom.year || "", type: "text", ...base },
        { pattern: new RegExp(`ddlDATE_MARRIAGE_ENDEDDay$|ddlDateMarriageEndedDay$|dlPrevSpouse_${ctl}_ddlDOME_DTEDay$`, 'i'), value: dome.day || "", type: "select", ...base },
        { pattern: new RegExp(`ddlDATE_MARRIAGE_ENDEDMonth$|ddlDateMarriageEndedMonth$|dlPrevSpouse_${ctl}_ddlDOME_DTEMonth$`, 'i'), value: dome.month || "", type: "select", ...base },
        { pattern: new RegExp(`tbxDATE_MARRIAGE_ENDEDYear$|tbxDateMarriageEndedYear$|dlPrevSpouse_${ctl}_tbxDOME_DTEYear$`, 'i'), value: dome.year || "", type: "text", ...base },
        { pattern: new RegExp(`tbxHOW_MARRIAGE_ENDED$|dlPrevSpouse_${ctl}_tbxHOW_MARRIAGE_ENDED$`, 'i'), value: ps.howMarriageEnded || ps.howEnded || "", type: "text", ...base },
        { pattern: new RegExp(`ddlCNTRY_MARRIAGE_TERMINATED$|dlPrevSpouse_${ctl}_ddlCNTRY_MARRIAGE_TERMINATED$`, 'i'), value: ps.countryMarriageTerminated || ps.countryTerminated || "", type: "select-label", ...base },
      );
    });
    // Generic fallbacks for single-entry compat (skip for W/widowed — DeceasedSpouse handles it)
    if (prevSpouseEntries.length === 1 && a.maritalStatus !== 'W') {
      const ps = prevSpouseEntries[0];
      map.push(
        { pattern: /FormView1_tbxSURNAME$/i, value: ps.surname, type: "text" },
        { pattern: /FormView1_tbxGIVEN_NAME$/i, value: ps.givenName, type: "text" },
        { pattern: /ddlCOUNTRY_OF_ORIGIN$|ddlSpouseNatDropDownList$/i, value: ps.nationality, type: "select-label" },
        { pattern: /tbxPOB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
        { pattern: /ddlPOB_CNTRY$|ddlPOB_COUNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
      );
    }
  }

  // ===================================================================
  // DECEASED SPOUSE (DeceasedSpouse page - W marital status)
  // ===================================================================
  if (a.maritalStatus === 'W' && a.deceasedSpouse) {
    const ds = a.deceasedSpouse;
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

  // =========================================================================
  // SECURITY PAGES — map from profile.security to official DS-160 radios
  // Only adds entries when user answered "Yes" — filler defaults rest to "No"
  // =========================================================================
  const sec = a.security || {};
  // Map camelCase JSON key → official DS-160 radio name pattern
  const securityFieldMap = {
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
      const radioPattern = new RegExp(radioName + '$', 'i');
      map.push({ pattern: radioPattern, value: 'Y', type: 'radio' });
      // Explanation textbox: pattern is tbx<FieldName>_EXPL
      const explKey = jsonKey + 'Expl';
      if (sec[explKey]) {
        // Convert rblFieldName → FieldName for the textbox pattern
        const tbxName = radioName.replace('rbl', 'tbx') + '_EXPL';
        const explPattern = new RegExp(tbxName + '$', 'i');
        map.push({ pattern: explPattern, value: sec[explKey], type: 'text' });
      }
    }
    // If sec[jsonKey] is false/undefined, the filler's default "No" logic handles it
  }

  return map;
}

// ===================================================================
// POSTBACK TRIGGERS (expanded for all branches)
// ===================================================================
const POSTBACK_SELECT_IDS = [
  "CNTRY", "Country", "PurposeOfTrip", "VisaClass", "OtherPurpose",
  "Occupation", "PPT_TYPE", "REL_TO_APP", "POC_REL", "SocialMedia",
  "MARITAL_STATUS", "APP_GENDER",
  "WhoIsPaying", "PayerRelationship",
  "SpouseNatDropDownList", "SpouseAddressType", "SpousePOBCountry",
];

const POSTBACK_CLICK_YES_IDS = [
  "PreviouslyEmployed", "AttendedEduc", "OtherEduc", "OTH_NATL",
  "OtherNames", "TelecodeQuestion", "PermResOtherCntryInd",
  "OtherPersonsTravelingWithYou", "GroupTravel",
  "PREV_US_TRAVEL_IND", "PREV_US_DRIVER_LIC_IND", "PREV_VISA_IND", "PREV_VISA_REFUSED_IND", "IV_PETITION_IND", "PERM_RESIDENT_IND", "VWP_DENIAL_IND",
  "AddPhone", "AddEmail", "AddSocial", "AddSite",
  "LOST_PPT_IND",
  "FATHER_LIVE_IN_US_IND", "MOTHER_LIVE_IN_US_IND",
  "CLAN_TRIBE_IND", "COUNTRIES_VISITED_IND", "ORGANIZATION_IND",
  "SPECIALIZED_SKILLS_IND", "MILITARY_SERVICE_IND", "INSURGENT_ORG_IND",
  // Fix phantom retry: these also trigger postbacks
  "OTHER_PPT_IND", "PayerAddrSameAsInd",
  "PREV_VISA_LOST", "PREV_VISA_CANCELLED",
  "OTHER_RELATIVE_IND",
];

const POSTBACK_CLICK_ANY_IDS = [
  "SpecificTravel",
  "IMMED_RELATIVE",
  "MailingAddrSame", "MailingAddr",
];

function isPostbackSelect(fieldId) {
  return POSTBACK_SELECT_IDS.some((trigger) => fieldId.includes(trigger));
}

function isPostbackClick(fieldId, fieldType) {
  if (fieldType !== "radio") return false;
  // Both Yes (_0) and No (_1) can trigger postbacks in DS-160
  if (POSTBACK_CLICK_YES_IDS.some((t) => fieldId.includes(t))) return true;
  if (POSTBACK_CLICK_ANY_IDS.some((t) => fieldId.includes(t))) return true;
  return false;
}

module.exports = {
  buildDynamicFieldMap,
  isPostbackSelect,
  isPostbackClick,
  POSTBACK_SELECT_IDS,
  POSTBACK_CLICK_YES_IDS,
  POSTBACK_CLICK_ANY_IDS
};
