// ============================================================
// Previous US Travel — Visits, DL, visas, refusals
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizePreviousUSTravel(data, helpers) {
    const { g } = helpers;

    const prev = data.previousUSTravel || {};
    return {
        hasBeenInUS: (() => {
            if (prev.hasBeenInUS === 'Y' || prev.has_been_in_us === 'Y' || prev.hasBeenToUS === 'Y') return true;
            if (prev.hasBeenInUS === 'N' || prev.has_been_in_us === 'N' || prev.hasBeenToUS === 'N') return false;
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (visits.length > 0) { console.log(`[Normalize] Inferred hasBeenInUS=true from ${visits.length} previousVisits`); return true; }
            return false;
        })(),
        previousVisits: (prev.previousVisits || prev.previous_visits || []).map(v => ({
            arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year },
            lengthOfStay: v.lengthOfStay || v.length_of_stay || '',
            lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D',
        })),
        previousUSVisit: (() => {
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (!visits.length) return null;
            const v = visits[0];
            return { arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year }, lengthOfStay: v.lengthOfStay || v.length_of_stay || '', lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D' };
        })(),
        previousUSDriversLicense: (() => {
            if (prev.hasDriversLicense === 'Y' || prev.previousUSDriversLicense === 'Y' || prev.has_drivers_license === 'Y') return true;
            if (prev.hasDriversLicense === 'N' || prev.previousUSDriversLicense === 'N' || prev.has_drivers_license === 'N') return false;
            const dls = prev.driversLicenses || prev.drivers_licenses || [];
            if (dls.length > 0 && dls.some(dl => dl.number)) { console.log(`[Normalize] Inferred previousUSDriversLicense=true from ${dls.length} licenses`); return true; }
            return false;
        })(),
        driversLicenses: (prev.driversLicenses || prev.drivers_licenses || []).map(dl => ({ number: dl.number || '', state: dl.state || '' })),
        previousUSDriversLicenseNumber: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.number,
        previousUSDriversLicenseState: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.state,
        hasUSVisa: (() => {
            if (prev.hasUSVisa === 'Y' || prev.has_us_visa === 'Y') return true;
            if (prev.hasUSVisa === 'N' || prev.has_us_visa === 'N') return false;
            const visa = prev.previousVisa || prev.previous_visa;
            if (visa && (visa.number || visa.issueDate)) { console.log('[Normalize] Inferred hasUSVisa=true from previousVisa data'); return true; }
            return false;
        })(),
        previousVisa: (() => {
            const visa = prev.previousVisa || prev.previous_visa;
            if (visa) return { issueDate: visa.issueDate || visa.issue_date || { day: '', month: '', year: '' }, number: visa.number || '', numberNA: !visa.number, sameType: visa.sameType === 'Y' || visa.same_type === 'Y', sameCountry: visa.sameCountry === 'Y' || visa.same_country === 'Y', tenPrint: visa.tenPrint === 'Y' || visa.ten_print === 'Y', lost: visa.lost === 'Y', lostYear: visa.lostYear || visa.lost_year || '', lostExplanation: visa.lostExplanation || visa.lost_explanation || '', cancelled: visa.cancelled === 'Y', cancelledExplanation: visa.cancelledExplanation || visa.cancelled_explanation || '' };
            if (prev.hasUSVisa !== 'Y' && prev.has_us_visa !== 'Y') return null;
            const hasAnyFlat = prev.previousVisaIssueDate || prev.previousVisaNumber || prev.sameVisaType;
            if (!hasAnyFlat) return null;
            const visaNum = (prev.previousVisaNumber && prev.previousVisaNumber !== 'UNKNOWN') ? prev.previousVisaNumber : '';
            return { issueDate: prev.previousVisaIssueDate || { day: '', month: '', year: '' }, number: visaNum, numberNA: !visaNum, sameType: prev.sameVisaType === 'Y', sameCountry: prev.sameCountry === 'Y', tenPrint: prev.tenPrint === 'Y', lost: prev.visaLost === 'Y', lostYear: prev.lostVisaYear || '', lostExplanation: prev.lostVisaExplanation || '', cancelled: prev.visaCancelled === 'Y', cancelledExplanation: prev.cancelledExplanation || '' };
        })(),
        visaRefused: prev.visaRefused === 'Y' || prev.visa_refused === 'Y',
        visaRefusedExplanation: prev.visaRefusedExplanation || prev.visa_refused_explanation || '',
        immigrantPetition: prev.immigrantPetition === 'Y' || prev.immigrant_petition === 'Y',
        immigrantPetitionExplanation: prev.immigrantPetitionExplanation || prev.immigrant_petition_explanation || '',
        permanentResident: prev.permanentResident === 'Y' || prev.permanent_resident === 'Y',
        permanentResidentExplanation: prev.permanentResidentExplanation || prev.permanent_resident_explanation || '',
        vwpDenial: prev.vwpDenial === 'Y' || prev.vwp_denial === 'Y',
        vwpDenialExplanation: prev.vwpDenialExplanation || prev.vwp_denial_explanation || '',
    };
}

module.exports = { normalizePreviousUSTravel };
