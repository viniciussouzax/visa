// ============================================================
// Travel — Purpose, dates, US address, payer
// Field map for 04-travel
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildTravelMap(a, ctx) {
    const map = [];
    const { t, payer } = ctx;

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
    const needsPetitionNum = /^(O1|O2|O3)/i.test(a.purposeSubCategory || '');
    // Principal Applicant Info — F2, J2, O3 (dependents)
    const isDependentVisa = /^(F2|J2|O3)/i.test(a.purposeSubCategory || '');

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
      const rawLocs = a.specificLocations || [t.location || t.usAddress?.city || ''];
      // Extract string from objects: {location:'DISNEY'} → 'DISNEY'
      const travelLocs = rawLocs
        .map(loc => typeof loc === 'object' ? (loc.location || loc.name || '') : String(loc || ''))
        .filter(loc => loc.trim() !== '');
      travelLocs.forEach((loc, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = { type: "text" };
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

module.exports = { buildTravelMap };
