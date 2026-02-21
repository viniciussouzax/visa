// ============================================================
// Dynamic Field Map Builder - supports all DS-160 branches
// ============================================================
import { DS160Applicant } from "../tests/fixtures/brazilian-applicant";

type Entry = { pattern: RegExp; value: string; type: string };

function ph(s: string | undefined | null): string {
  return (s || "").replace(/[^0-9+]/g, "").replace("+", "");
}

export function buildDynamicFieldMap(a: DS160Applicant): Entry[] {
  // Safe defaults for all optional properties
  a = {
    ...a,
    otherNames: a.otherNames || [],
    socialMedia: a.socialMedia || [],
    additionalSocialMediaAccounts: a.additionalSocialMediaAccounts || [],
    languages: a.languages || ['PORTUGUESE'],
    countriesVisitedList: a.countriesVisitedList || [],
    organizations: a.organizations || [],
    military: a.military || [],
    previousEmployment: a.previousEmployment || [],
    education: a.education || [],
    travel: a.travel || {} as any,
    passport: a.passport || {} as any,
    homeAddress: a.homeAddress || {} as any,
    usContact: a.usContact || {} as any,
    employer: a.employer || {} as any,
    father: a.father || {} as any,
    mother: a.mother || {} as any,
    spouse: a.spouse || {} as any,
  };
  const emptyDate = { day: '', month: '', year: '' };
  a.dob = a.dob || emptyDate;
  const t = a.travel || {} as any;
  t.arrivalDate = t.arrivalDate || emptyDate;
  t.departureDate = t.departureDate || emptyDate;
  t.lengthOfStay = t.lengthOfStay || {};
  t.usAddress = t.usAddress || {};
  t.payer = t.payer || {};
  t.payer.address = t.payer.address || {};
  const pp = a.passport || {} as any;
  pp.issuanceDate = pp.issuanceDate || emptyDate;
  pp.expirationDate = pp.expirationDate || emptyDate;
  const addr = a.homeAddress || {} as any;
  const uc = a.usContact || {} as any;
  const emp = a.employer || {} as any;
  emp.startDate = emp.startDate || emptyDate;
  const prev = a.previousEmployment?.[0] || {} as any;
  prev.startDate = prev.startDate || emptyDate;
  prev.endDate = prev.endDate || emptyDate;
  const edu = a.education?.[0] || {} as any;
  edu.startDate = edu.startDate || emptyDate;
  edu.endDate = edu.endDate || emptyDate;
  const father = a.father || {} as any;
  father.dob = father.dob || emptyDate;
  const mother = a.mother || {} as any;
  mother.dob = mother.dob || emptyDate;
  const spouse = a.spouse || {} as any;
  spouse.dob = spouse.dob || emptyDate;
  spouse.address = spouse.address || {};
  const map: Entry[] = [];

  // ===================================================================
  // PERSONAL 1 (order matches official DS-160 form hierarchy)
  // ===================================================================
  // 1. Name fields
  map.push(
    { pattern: /tbxAPP_SURNAME$/i, value: a.surname, type: "text" },
    { pattern: /tbxAPP_GIVEN_NAME$/i, value: a.givenName, type: "text" },
    { pattern: /tbxAPP_FULL_NAME_NATIVE$/i, value: a.fullNameNative, type: "text" },
  );

  // 2. Other Names (before Gender/MaritalStatus in official form)
  if (a.otherNamesUsed && a.otherNames?.length) {
    map.push(
      { pattern: /rblOtherNames_0$/i, value: "", type: "click" },
      { pattern: /DListAlias_ctl00_tbxSURNAME$/i, value: a.otherNames[0].surname, type: "text" },
      { pattern: /DListAlias_ctl00_tbxGIVEN_NAME$/i, value: a.otherNames[0].givenName, type: "text" },
    );
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

  // 2. Other Nationality (before IDs in official form)
  if (a.otherNationality) {
    map.push(
      { pattern: /rblAPP_OTH_NATL_IND_0$/i, value: "", type: "click" },
      { pattern: /dtlOTHER_NATL_ctl00_ddlOTHER_NATL$/i, value: a.otherNationalityCountry || "", type: "select-label" },
    );
    if (a.otherNationalityPassport) {
      map.push(
        { pattern: /rblOTHER_PPT_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxOTHER_PPT_NUM$/i, value: a.otherNationalityPassportNumber || "", type: "text" },
      );
    } else {
      map.push({ pattern: /rblOTHER_PPT_IND_1$/i, value: "", type: "click" });
    }
  } else {
    map.push({ pattern: /rblAPP_OTH_NATL_IND_1$/i, value: "", type: "click" });
  }

  // 3. Permanent Resident Other Country (before IDs in official form)
  if (a.permanentResidentOtherCountry) {
    map.push(
      { pattern: /rblPermResOtherCntryInd_0$/i, value: "", type: "click" },
      { pattern: /dtlOthPermResCntry_ctl00_ddlOthPermResCntry$/i, value: a.permanentResidentCountry || "", type: "select-label" },
    );
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
  map.push(
    { pattern: /ddlPurposeOfTrip$/i, value: "B", type: "select" },
    { pattern: /ddlOtherPurpose$/i, value: "B1-B2", type: "select" },
    { pattern: /ddlVisaClass$/i, value: a.purposeOfTrip, type: "select-search" },
  );

  // Specific Travel Plans
  if (a.hasSpecificPlans) {
    map.push(
      { pattern: /rblSpecificTravel_0$/i, value: "", type: "click" },
      { pattern: /tbxStreetAddress1$/i, value: t.usAddress.street1, type: "text" },
      { pattern: /tbxStreetAddress2$/i, value: t.usAddress.street2 || "", type: "text" },
      { pattern: /tbxCity$/i, value: t.usAddress.city, type: "text" },
      { pattern: /ddlTravelState$/i, value: t.usAddress.state, type: "select" },
      { pattern: /tbxZIPCode$/i, value: t.usAddress.zip, type: "text" },
      { pattern: /tbZIPCode$/i, value: t.usAddress.zip, type: "text" },
      { pattern: /tbxSPECTRAVEL_LOCATION$/i, value: t.location || t.usAddress.city, type: "text" },
    );
    if (t.arrivalFlight) map.push({ pattern: /tbxArriveFlight$/i, value: t.arrivalFlight, type: "text" });
    if (t.arrivalCity) map.push({ pattern: /tbxArriveCity$/i, value: t.arrivalCity, type: "text" });
    if (t.departureFlight) map.push({ pattern: /tbxDepartFlight$/i, value: t.departureFlight, type: "text" });
    if (t.departureCity) map.push({ pattern: /tbxDepartCity$/i, value: t.departureCity, type: "text" });
  } else {
    map.push({ pattern: /rblSpecificTravel_1$/i, value: "", type: "click" });
  }

  // Arrival date & length of stay — ALWAYS required by DS-160
  if (t.arrivalDate) {
    map.push(
      { pattern: /ddlARRIVAL_US_DTEDay$/i, value: t.arrivalDate.day, type: "select" },
      { pattern: /ddlARRIVAL_US_DTEMonth$/i, value: t.arrivalDate.month, type: "select" },
      { pattern: /tbxARRIVAL_US_DTEYear$/i, value: t.arrivalDate.year, type: "text" },
    );
  }
  if (t.lengthOfStay) {
    map.push(
      { pattern: /tbxAPP_LOS_AMT$/i, value: t.lengthOfStay.value, type: "text" },
      { pattern: /ddlAPP_LOS_CD$/i, value: t.lengthOfStay.unit, type: "select" },
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

  if (a.payingForTrip === "O" && a.payer) {
    // Other Person paying
    map.push(
      { pattern: /tbxPayerSurname$/i, value: a.payer.surname || "", type: "text" },
      { pattern: /tbxPayerGivenName$/i, value: a.payer.givenName || "", type: "text" },
      { pattern: /tbxPayerPhone$/i, value: ph(a.payer.phone), type: "text" },
    );
    if (a.payer.email) {
      map.push({ pattern: /tbxPAYER_EMAIL_ADDR$/i, value: a.payer.email, type: "text" });
    } else {
      map.push({ pattern: /cbxDNAPAYER_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" });
    }
    if (a.payer.relationship) {
      map.push({ pattern: /ddlPayerRelationship$/i, value: a.payer.relationship, type: "select" });
    }
    if (a.payer.sameAddress === true) {
      map.push({ pattern: /rblPayerAddrSameAsInd_0$/i, value: "", type: "click" });
    } else if (a.payer.sameAddress === false) {
      map.push(
        { pattern: /rblPayerAddrSameAsInd_1$/i, value: "", type: "click" },
        { pattern: /tbxPayerStreetAddress1$/i, value: a.payer.street1 || "", type: "text" },
        { pattern: /tbxPayerStreetAddress2$/i, value: a.payer.street2 || "", type: "text" },
        { pattern: /tbxPayerCity$/i, value: a.payer.city || "", type: "text" },
        { pattern: /tbxPayerStateProvince$/i, value: a.payer.state || "", type: "text" },
        { pattern: /tbxPayerPostalZIPCode$/i, value: a.payer.postalCode || "", type: "text" },
        { pattern: /ddlPayerCountry$/i, value: a.payer.country || "", type: "select-label" },
      );
    }
  } else if ((a.payingForTrip === "C" || a.payingForTrip === "P" || a.payingForTrip === "H") && a.payer) {
    // Company / Present Employer / US Petitioner paying (all share same fields)
    map.push(
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

  // ===================================================================
  // TRAVEL COMPANIONS
  // ===================================================================
  if (a.travelingWithOthers && a.companions?.length) {
    map.push(
      { pattern: /rblOtherPersonsTravelingWithYou_0$/i, value: "", type: "click" },
      { pattern: /TravelCompanions_ctl00_tbxSurname$/i, value: a.companions[0].surname, type: "text" },
      { pattern: /TravelCompanions_ctl00_tbxGivenName$/i, value: a.companions[0].givenName, type: "text" },
      { pattern: /TravelCompanions_ctl00_ddlTCRelationship$/i, value: a.companions[0].relationship, type: "select" },
    );
    if (a.partOfGroup && a.groupName) {
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
  // Has been in US?
  if (a.hasBeenInUS && a.previousUSVisit) {
    const pv = a.previousUSVisit;
    map.push(
      { pattern: /rblPREV_US_TRAVEL_IND_0$/i, value: "", type: "click" },
      { pattern: /ddlPREV_US_VISIT_DTEDay$/i, value: pv.arrivalDate.day, type: "select" },
      { pattern: /ddlPREV_US_VISIT_DTEMonth$/i, value: pv.arrivalDate.month, type: "select" },
      { pattern: /tbxPREV_US_VISIT_DTEYear$/i, value: pv.arrivalDate.year, type: "text" },
      { pattern: /tbxPREV_US_VISIT_LOS$/i, value: pv.lengthOfStay, type: "text" },
      { pattern: /ddlPREV_US_VISIT_LOS_CD$/i, value: pv.lengthOfStayUnit, type: "select" },
    );
    // Driver's license
    if (a.previousUSDriversLicense) {
      map.push(
        { pattern: /rblPREV_US_DRIVER_LIC_IND_0$/i, value: "", type: "click" },
        { pattern: /tbxUS_DRIVER_LICENSE$/i, value: a.previousUSDriversLicenseNumber || "", type: "text" },
        { pattern: /ddlUS_DRIVER_LICENSE_STATE$/i, value: a.previousUSDriversLicenseState || "", type: "select" },
      );
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
    { pattern: /ddlCountry$/i, value: addr.country, type: "select-label" },
    { pattern: /tbxAPP_HOME_TEL$/i, value: ph(a.phone), type: "text" },
    { pattern: /tbxAPP_EMAIL_ADDR$/i, value: a.email, type: "text" },
  );

  // Mailing address
  if (a.mailingAddressSame) {
    map.push({ pattern: /rblMailingAddrSame_0$/i, value: "", type: "click" });
    map.push({ pattern: /rblMailingAddr_0$/i, value: "", type: "click" });
  } else if (a.mailingAddress) {
    map.push(
      { pattern: /rblMailingAddrSame_1$/i, value: "", type: "click" },
      { pattern: /rblMailingAddr_1$/i, value: "", type: "click" },
      { pattern: /tbxMAILING_ADDR_LN1$/i, value: a.mailingAddress.street1, type: "text" },
      { pattern: /tbxMAILING_ADDR_LN2$/i, value: a.mailingAddress.street2 || "", type: "text" },
      { pattern: /tbxMAILING_ADDR_CITY$/i, value: a.mailingAddress.city, type: "text" },
      { pattern: /tbxMAILING_ADDR_STATE$/i, value: a.mailingAddress.state, type: "text" },
      { pattern: /tbxMAILING_ADDR_POSTAL_CD$/i, value: a.mailingAddress.postalCode, type: "text" },
      { pattern: /ddlMailCountry$/i, value: a.mailingAddress.country, type: "select-label" },
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

  // Additional phones/emails
  if (a.additionalPhones && a.additionalPhoneNumbers?.length) {
    map.push(
      { pattern: /rblAddPhone_0$/i, value: "", type: "click" },
      { pattern: /dtlAddPhone_ctl00_tbxAddPhoneInfo$/i, value: ph(a.additionalPhoneNumbers[0]), type: "text" },
    );
  } else {
    map.push({ pattern: /rblAddPhone_1$/i, value: "", type: "click" });
  }

  if (a.additionalEmails && a.additionalEmailAddresses?.length) {
    map.push(
      { pattern: /rblAddEmail_0$/i, value: "", type: "click" },
      { pattern: /dtlAddEmail_ctl00_tbxAddEmailInfo$/i, value: a.additionalEmailAddresses[0], type: "text" },
    );
  } else {
    map.push({ pattern: /rblAddEmail_1$/i, value: "", type: "click" });
  }

  map.push({ pattern: /rblAddSite_1$/i, value: "", type: "click" });

  // Social Media
  if (a.socialMedia.length > 0) {
    map.push(
      { pattern: /ddlSocialMedia$/i, value: a.socialMedia[0].platform, type: "select-search" },
      { pattern: /tbxSocialMediaIdent$/i, value: a.socialMedia[0].handle, type: "text" },
    );
  }
  if (a.additionalSocialMedia && a.additionalSocialMediaAccounts?.length) {
    map.push(
      { pattern: /rblAddSocial_0$/i, value: "", type: "click" },
      { pattern: /dtlAddSocial_ctl00_tbxAddSocialPlat$/i, value: a.additionalSocialMediaAccounts[0].platform, type: "text" },
      { pattern: /dtlAddSocial_ctl00_tbxAddSocialHand$/i, value: a.additionalSocialMediaAccounts[0].handle, type: "text" },
    );
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
    { pattern: /ddlPPT_ISSUED_DTEDay$/i, value: pp.issuanceDate.day, type: "select" },
    { pattern: /ddlPPT_ISSUED_DTEMonth$/i, value: pp.issuanceDate.month, type: "select" },
    { pattern: /ddlPPT_ISSUEDDay$/i, value: pp.issuanceDate.day, type: "select" },
    { pattern: /ddlPPT_ISSUEDMonth$/i, value: pp.issuanceDate.month, type: "select" },
    { pattern: /tbxPPT_ISSUEDYear$/i, value: pp.issuanceDate.year, type: "text" },
    { pattern: /ddlPPT_EXPIRE_DTEDay$/i, value: pp.expirationDate.day, type: "select" },
    { pattern: /ddlPPT_EXPIRE_DTEMonth$/i, value: pp.expirationDate.month, type: "select" },
    { pattern: /ddlPPT_EXPIREDay$/i, value: pp.expirationDate.day, type: "select" },
    { pattern: /ddlPPT_EXPIREMonth$/i, value: pp.expirationDate.month, type: "select" },
    { pattern: /tbxPPT_EXPIREYear$/i, value: pp.expirationDate.year, type: "text" },
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

  // Lost/Stolen passport
  if (pp.lostOrStolen && pp.lostPassport) {
    map.push(
      { pattern: /rblLOST_PPT_IND_0$/i, value: "", type: "click" },
      { pattern: /dtlLostPPT_ctl00_tbxLOST_PPT_NUM$/i, value: pp.lostPassport.number, type: "text" },
      { pattern: /ddlLOST_PPT_NATL$/i, value: pp.lostPassport.country, type: "select-label" },
      { pattern: /tbxLOST_PPT_EXPL$/i, value: pp.lostPassport.explanation, type: "text" },
    );
    if (pp.lostPassport.numberUnknown) {
      map.push({ pattern: /cbxLOST_PPT_NUM_UNKN_IND$/i, value: "", type: "checkbox-check" });
    }
  } else {
    map.push({ pattern: /rblLOST_PPT_IND_1$/i, value: "", type: "click" });
  }

  // ===================================================================
  // US CONTACT
  // ===================================================================
  map.push(
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
  if (uc.email) {
    map.push({ pattern: /tbxUS_POC_EMAIL_ADDR$/i, value: uc.email, type: "text" });
  } else {
    map.push({ pattern: /cbxUS_POC_EMAIL_ADDR_NA$/i, value: "", type: "checkbox-check" });
  }

  // ===================================================================
  // FAMILY
  // ===================================================================
  map.push(
    { pattern: /tbxFATHER_SURNAME$/i, value: a.father.surname, type: "text" },
    { pattern: /tbxFATHER_GIVEN_NAME$/i, value: a.father.givenName, type: "text" },
    { pattern: /ddlFathersDOBDay$/i, value: a.father.dob.day, type: "select" },
    { pattern: /ddlFathersDOBMonth$/i, value: a.father.dob.month, type: "select" },
    { pattern: /tbxFathersDOBYear$/i, value: a.father.dob.year, type: "text" },
    { pattern: /ddlFATHER_DOBDay$/i, value: a.father.dob.day, type: "select" },
    { pattern: /ddlFATHER_DOBMonth$/i, value: a.father.dob.month, type: "select" },
    { pattern: /tbxFATHER_DOBYear$/i, value: a.father.dob.year, type: "text" },
    { pattern: /tbxMOTHER_SURNAME$/i, value: a.mother.surname, type: "text" },
    { pattern: /tbxMOTHER_GIVEN_NAME$/i, value: a.mother.givenName, type: "text" },
    { pattern: /ddlMothersDOBDay$/i, value: a.mother.dob.day, type: "select" },
    { pattern: /ddlMothersDOBMonth$/i, value: a.mother.dob.month, type: "select" },
    { pattern: /tbxMothersDOBYear$/i, value: a.mother.dob.year, type: "text" },
    { pattern: /ddlMOTHER_DOBDay$/i, value: a.mother.dob.day, type: "select" },
    { pattern: /ddlMOTHER_DOBMonth$/i, value: a.mother.dob.month, type: "select" },
    { pattern: /tbxMOTHER_DOBYear$/i, value: a.mother.dob.year, type: "text" },
  );

  // Father in US
  if (a.father.inUS) {
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
  if (a.mother.inUS) {
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
  const needsSpouse = a.maritalStatus !== "S";
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

  // Immediate relatives in US
  if (a.relativesInUS && a.immediateRelative) {
    map.push(
      { pattern: /rblUS_IMMED_RELATIVE_IND_0$/i, value: "", type: "click" },
      { pattern: /tbxUS_REL_SURNAME$/i, value: a.immediateRelative.surname, type: "text" },
      { pattern: /tbxUS_REL_GIVEN_NAME$/i, value: a.immediateRelative.givenName, type: "text" },
      { pattern: /ddlUS_REL_TYPE$/i, value: a.immediateRelative.relationship, type: "select" },
      { pattern: /ddlUS_REL_STATUS$/i, value: a.immediateRelative.status, type: "select" },
    );
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
  map.push({ pattern: /ddlPresentOccupation$/i, value: a.occupationCode, type: "select-search" });

  // Occupation explanation (for "N" = Not Employed)
  if (a.occupationCode === "N") {
    map.push({ pattern: /tbxExplainOtherPresentOccupation$/i, value: a.occupationExplanation || "NOT CURRENTLY EMPLOYED", type: "text" });
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
      { pattern: /FormView1_ddlEmpDateFromDay$/i, value: "1", type: "select" },
      { pattern: /FormView1_ddlEmpDateFromMonth$/i, value: emp.startDate.month, type: "select" },
      { pattern: /FormView1_tbxEmpDateFromYear$/i, value: emp.startDate.year, type: "text" },
      { pattern: /FormView1_tbxDescribeDuties$/i, value: emp.duties, type: "text" },
    );
  }

  // ===================================================================
  // WORK / EDUCATION 2 (Previous)
  // ===================================================================
  if (a.hasPreviousEmployment && prev) {
    map.push(
      { pattern: /rblPreviouslyEmployed_0$/i, value: "", type: "click" },
      { pattern: /tbEmployerName$/i, value: prev.name, type: "text" },
      { pattern: /tbEmployerStreetAddress1$/i, value: prev.street1, type: "text" },
      { pattern: /tbEmployerStreetAddress2$/i, value: "", type: "text" },
      { pattern: /tbEmployerCity$/i, value: prev.city, type: "text" },
      { pattern: /tbxPREV_EMPL_ADDR_STATE$/i, value: prev.state || "", type: "text" },
      { pattern: /tbxPREV_EMPL_ADDR_POSTAL_CD$/i, value: prev.postalCode || "", type: "text" },
      { pattern: /dtlPrevEmpl.*DropDownList2$/i, value: prev.country, type: "select-label" },
      { pattern: /tbEmployerPhone$/i, value: ph(prev.phone), type: "text" },
      { pattern: /tbJobTitle$/i, value: prev.jobTitle, type: "text" },
      { pattern: /cbxSupervisorSurname_NA$/i, value: "", type: "checkbox-check" },
      { pattern: /cbxSupervisorGivenName_NA$/i, value: "", type: "checkbox-check" },
      { pattern: /dtlPrevEmpl.*ddlEmpDateFromDay$/i, value: "1", type: "select" },
      { pattern: /dtlPrevEmpl.*ddlEmpDateFromMonth$/i, value: prev.startDate.month, type: "select" },
      { pattern: /dtlPrevEmpl.*tbxEmpDateFromYear$/i, value: prev.startDate.year, type: "text" },
      { pattern: /dtlPrevEmpl.*ddlEmpDateToDay$/i, value: "1", type: "select" },
      { pattern: /dtlPrevEmpl.*ddlEmpDateToMonth$/i, value: prev.endDate.month, type: "select" },
      { pattern: /dtlPrevEmpl.*tbxEmpDateToYear$/i, value: prev.endDate.year, type: "text" },
      { pattern: /dtlPrevEmpl.*tbDescribeDuties$/i, value: prev.duties || "GENERAL DUTIES", type: "text" },
    );
  } else {
    map.push({ pattern: /rblPreviouslyEmployed_1$/i, value: "", type: "click" });
  }

  // Education
  if (a.hasEducation && edu) {
    map.push(
      { pattern: /rblOtherEduc_0$/i, value: "", type: "click" },
      { pattern: /tbxSchoolName$/i, value: edu.name, type: "text" },
      { pattern: /tbxSchoolAddr1$/i, value: edu.street1, type: "text" },
      { pattern: /tbxSchoolAddr2$/i, value: "", type: "text" },
      { pattern: /tbxSchoolCity$/i, value: edu.city, type: "text" },
      { pattern: /tbxEDUC_INST_ADDR_STATE$/i, value: edu.state || "", type: "text" },
      { pattern: /tbxEDUC_INST_POSTAL_CD$/i, value: edu.postalCode || "", type: "text" },
      { pattern: /ddlSchoolCountry$/i, value: edu.country, type: "select-label" },
      { pattern: /tbxSchoolCourseOfStudy$/i, value: edu.courseOfStudy, type: "text" },
      { pattern: /dtlPrevEduc.*ddlSchoolFromDay$/i, value: "1", type: "select" },
      { pattern: /dtlPrevEduc.*ddlSchoolFromMonth$/i, value: edu.startDate.month, type: "select" },
      { pattern: /dtlPrevEduc.*tbxSchoolFromYear$/i, value: edu.startDate.year, type: "text" },
      { pattern: /dtlPrevEduc.*ddlSchoolToDay$/i, value: "1", type: "select" },
      { pattern: /dtlPrevEduc.*ddlSchoolToMonth$/i, value: edu.endDate.month, type: "select" },
      { pattern: /dtlPrevEduc.*tbxSchoolToYear$/i, value: edu.endDate.year, type: "text" },
    );
  } else {
    map.push({ pattern: /rblOtherEduc_1$/i, value: "", type: "click" });
  }

  // ===================================================================
  // WORK / EDUCATION 3 (Additional)
  // ===================================================================
  // Languages - DataList: dtlLANGUAGES (supports Add Another)
  // First language fills _ctl00_, additional languages need Add Another button
  map.push({ pattern: /tbxLANGUAGE_NAME$/i, value: a.languages[0] || "PORTUGUESE", type: "text" });

  // Clan/Tribe
  if (a.clanTribe) {
    map.push(
      { pattern: /rblCLAN_TRIBE_IND_0$/i, value: "", type: "click" },
      { pattern: /tbxCLAN_TRIBE_NAME$/i, value: a.clanTribeName || "", type: "text" },
    );
  } else {
    map.push({ pattern: /rblCLAN_TRIBE_IND_1$/i, value: "", type: "click" });
  }

  // Countries visited
  if (a.countriesVisited && a.countriesVisitedList?.length) {
    map.push(
      { pattern: /rblCOUNTRIES_VISITED_IND_0$/i, value: "", type: "click" },
      { pattern: /ddlCOUNTRIES_VISITED$/i, value: a.countriesVisitedList[0], type: "select-search" },
    );
  } else {
    map.push({ pattern: /rblCOUNTRIES_VISITED_IND_1$/i, value: "", type: "click" });
  }

  // Organization
  if (a.organizationMember) {
    map.push(
      { pattern: /rblORGANIZATION_IND_0$/i, value: "", type: "click" },
      { pattern: /tbxORGANIZATION_NAME$/i, value: a.organizationName || "", type: "text" },
    );
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

  // Military service
  if (a.militaryService && a.military) {
    const m = a.military;
    map.push(
      { pattern: /rblMILITARY_SERVICE_IND_0$/i, value: "", type: "click" },
      { pattern: /ddlMILITARY_SVC_CNTRY$/i, value: m.country, type: "select-label" },
      { pattern: /tbxMILITARY_SVC_BRANCH$/i, value: m.branch, type: "text" },
      { pattern: /tbxMILITARY_SVC_RANK$/i, value: m.rank, type: "text" },
      { pattern: /tbxMILITARY_SVC_SPECIALTY$/i, value: m.specialty, type: "text" },
      { pattern: /ddlMILITARY_SVC_FROMDay$/i, value: m.startDate.day, type: "select" },
      { pattern: /ddlMILITARY_SVC_FROMMonth$/i, value: m.startDate.month, type: "select" },
      { pattern: /tbxMILITARY_SVC_FROMYear$/i, value: m.startDate.year, type: "text" },
      { pattern: /ddlMILITARY_SVC_TODay$/i, value: m.endDate.day, type: "select" },
      { pattern: /ddlMILITARY_SVC_TOMonth$/i, value: m.endDate.month, type: "select" },
      { pattern: /tbxMILITARY_SVC_TOYear$/i, value: m.endDate.year, type: "text" },
    );
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
  if (needsPrevSpouse && a.previousSpouse) {
    const ps = a.previousSpouse;
    map.push(
      // Number of former spouses
      { pattern: /NumberOfFormerSpouses$/i, value: ps.numberOfFormerSpouses, type: "text" },
      { pattern: /NUM_PREV_SPOUSES$/i, value: ps.numberOfFormerSpouses, type: "text" },
      { pattern: /ddlNumberPrevSpouses$/i, value: ps.numberOfFormerSpouses, type: "select" },
      // Surname and Given Name (generic IDs on PrevSpouse page)
      // These won't conflict with APP_SURNAME / SpouseSurname patterns since they use different prefixes
      { pattern: /FormView1_tbxSURNAME$/i, value: ps.surname, type: "text" },
      { pattern: /FormView1_tbxGIVEN_NAME$/i, value: ps.givenName, type: "text" },
      // DOB is handled via DOB override in fill-form.ts (same as Family2)
      // Nationality / Country of Origin
      { pattern: /ddlCOUNTRY_OF_ORIGIN$/i, value: ps.nationality, type: "select-label" },
      { pattern: /ddlSPOUSE_NATL$/i, value: ps.nationality, type: "select-label" },
      // Place of Birth
      { pattern: /tbxSPOUSE_POB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
      { pattern: /tbxPOB_CITY$/i, value: ps.cityOfBirth || "", type: "text" },
      { pattern: /ddlSPOUSE_POB_CNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
      { pattern: /ddlPOB_CNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
      { pattern: /ddlPOB_COUNTRY$/i, value: ps.countryOfBirth, type: "select-label" },
      // Date of Marriage
      { pattern: /ddlDATE_OF_MARRIAGEDay$/i, value: ps.dateOfMarriage.day, type: "select" },
      { pattern: /ddlDATE_OF_MARRIAGEMonth$/i, value: ps.dateOfMarriage.month, type: "select" },
      { pattern: /tbxDATE_OF_MARRIAGEYear$/i, value: ps.dateOfMarriage.year, type: "text" },
      { pattern: /ddlMarriageDTEDay$/i, value: ps.dateOfMarriage.day, type: "select" },
      { pattern: /ddlMarriageDTEMonth$/i, value: ps.dateOfMarriage.month, type: "select" },
      { pattern: /tbxMarriageDTEYear$/i, value: ps.dateOfMarriage.year, type: "text" },
      // Date Marriage Ended
      { pattern: /ddlDATE_MARRIAGE_ENDEDDay$/i, value: ps.dateMarriageEnded.day, type: "select" },
      { pattern: /ddlDATE_MARRIAGE_ENDEDMonth$/i, value: ps.dateMarriageEnded.month, type: "select" },
      { pattern: /tbxDATE_MARRIAGE_ENDEDYear$/i, value: ps.dateMarriageEnded.year, type: "text" },
      { pattern: /ddlMarriageEndedDTEDay$/i, value: ps.dateMarriageEnded.day, type: "select" },
      { pattern: /ddlMarriageEndedDTEMonth$/i, value: ps.dateMarriageEnded.month, type: "select" },
      { pattern: /tbxMarriageEndedDTEYear$/i, value: ps.dateMarriageEnded.year, type: "text" },
      // How marriage ended
      { pattern: /tbxHOW_MARRIAGE_ENDED$/i, value: ps.howMarriageEnded, type: "text" },
      { pattern: /HOW_MARRIAGE_ENDED$/i, value: ps.howMarriageEnded, type: "text" },
      // Country marriage was terminated
      { pattern: /ddlCNTRY_MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
      { pattern: /ddlCOUNTRY_MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
      { pattern: /MARRIAGE_TERMINATED$/i, value: ps.countryMarriageTerminated, type: "select-label" },
    );
  }

  // Security pages are handled by the dedicated fillSecurityPage() in fill-form.ts.
  // Do NOT add a generic rbl.*_IND_1 fallback here - it conflicts with family/travel radios.

  return map;
}

// ===================================================================
// POSTBACK TRIGGERS (expanded for all branches)
// ===================================================================
export const POSTBACK_SELECT_IDS = [
  "CNTRY", "Country", "PurposeOfTrip", "VisaClass", "OtherPurpose",
  "Occupation", "PPT_TYPE", "REL_TO_APP", "POC_REL", "SocialMedia",
  "WhoIsPaying", "PayerRelationship",
  "SpouseNatDropDownList", "SpouseAddressType", "SpousePOBCountry",
];

export const POSTBACK_CLICK_YES_IDS = [
  "SpecificTravel", "PreviouslyEmployed", "AttendedEduc", "OtherEduc", "OTH_NATL",
  "OtherNames", "TelecodeQuestion", "PermResOtherCntryInd",
  "OtherPersonsTravelingWithYou", "GroupTravel",
  "PREV_US_TRAVEL_IND", "PREV_US_DRIVER_LIC_IND", "PREV_VISA_IND", "PREV_VISA_REFUSED_IND", "IV_PETITION_IND", "PERM_RESIDENT_IND", "VWP_DENIAL_IND",
  "AddPhone", "AddEmail", "AddSocial", "AddSite",
  "LOST_PPT_IND",
  "FATHER_LIVE_IN_US_IND", "MOTHER_LIVE_IN_US_IND",
  "CLAN_TRIBE_IND", "COUNTRIES_VISITED_IND", "ORGANIZATION_IND",
  "SPECIALIZED_SKILLS_IND", "MILITARY_SERVICE_IND", "INSURGENT_ORG_IND",
];

export const POSTBACK_CLICK_ANY_IDS = [
  "IMMED_RELATIVE",
  "MailingAddrSame", "MailingAddr",
];

export function isPostbackSelect(fieldId: string): boolean {
  return POSTBACK_SELECT_IDS.some((trigger) => fieldId.includes(trigger));
}

export function isPostbackClick(fieldId: string, fieldType: string): boolean {
  if (fieldType !== "radio") return false;
  if (fieldId.match(/_0$/) && POSTBACK_CLICK_YES_IDS.some((t) => fieldId.includes(t))) return true;
  if (POSTBACK_CLICK_ANY_IDS.some((t) => fieldId.includes(t))) return true;
  return false;
}
