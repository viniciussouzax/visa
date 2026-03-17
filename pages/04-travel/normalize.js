// ============================================================
// Travel — Purpose, dates, US address, payer
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeTravel(data, helpers) {
    const { g } = helpers;

    const trav = data.travel || {};
    const PAYER_MAP = { 'OTH': 'O', 'SELF': 'S', 'COM': 'C', 'COMPANY': 'C', 'EMP': 'P', 'EMPLOYER': 'P', 'USE': 'U', 'USP': 'U', 'S': 'S', 'O': 'O', 'P': 'P', 'U': 'U', 'C': 'C' };
    const rawPayer = trav.whoIsPaying || trav.who_is_paying || null;
    const payerType = rawPayer ? (PAYER_MAP[rawPayer.toUpperCase()] || rawPayer) : null;
    const INVALID = ['DNA', 'N/A', 'N-A', 'NA', 'XXX', 'NONE', 'N/D', ''];
    const cleanVal = (v) => (v && !INVALID.includes(String(v).trim().toUpperCase())) ? v : null;
    const p = trav.payer || {};
    const pAddr = ['C', 'P', 'U'].includes(payerType) ? (p.companyAddress || p.address || {}) : (p.address || {});
    return {
        purposeOfTrip: (() => { const pt = g(trav, 'purposeOfTrip', 'purpose_of_trip'); return (pt && pt !== 'N/A') ? pt : null; })(),
        purposeCategory: g(trav, 'purposeCategory', 'purpose_category') || null,
        purposeSubCategory: (() => { const raw = g(trav, 'purposeSubCategory', 'purpose_sub_category'); return raw ? raw.replace(/\//g, '-') : null; })(),
        // Conditional fields for F/J/O visa types (appear below Specify)
        petitionNumber: g(trav, 'petitionNumber', 'petition_number', 'applicationReceiptNumber', 'application_receipt_number') || '',
        principalSurname: g(trav, 'principalSurname', 'principal_surname', 'principalApplicantSurname') || '',
        principalGivenName: g(trav, 'principalGivenName', 'principal_given_name', 'principalApplicantGivenName') || '',
        hasSpecificPlans: trav.hasSpecificPlans === 'Y' || trav.hasSpecificPlans === true || trav.has_specific_plans === 'Y',
        travel: {
            arrivalDate: (() => { const d = trav.arrivalDate || trav.arrival_date || trav.nonSpecificArrival || trav.non_specific_arrival; return (d && d.month && d.year) ? { ...d, day: d.day || '' } : null; })(),
            departureDate: (() => { const d = trav.departureDate || trav.departure_date || trav.nonSpecificDeparture || trav.non_specific_departure; return (d && d.month && d.year) ? { ...d, day: d.day || '' } : null; })(),
            arrivalFlight: trav.arrivalFlight || trav.arrival_flight,
            arrivalCity: trav.arrivalCity || trav.arrival_city,
            departureFlight: trav.departureFlight || trav.departure_flight,
            departureCity: trav.departureCity || trav.departure_city,
            location: trav.specificLocation || trav.specific_location,
            lengthOfStay: {
                value: (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.value : trav.lengthOfStay) || trav.length_of_stay || null,
                unit: (typeof trav.lengthOfStayUnit === 'string' ? trav.lengthOfStayUnit : (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.unit : null)) || trav.length_of_stay_unit || null,
            },
            usAddress: (() => {
                const ua = trav.usAddress || trav.us_address || {};
                if (ua.street1 || ua.city || ua.state) return { street1: ua.street1 || '', street2: ua.street2 || '', city: ua.city || '', state: ua.state || '', zip: ua.zip || ua.postalCode || '' };
                if (trav.usAddressStreet1 || trav.usAddressCity) return { street1: trav.usAddressStreet1 || '', street2: trav.usAddressStreet2 || '', city: trav.usAddressCity || '', state: trav.usAddressState || '', zip: trav.usAddressZip || '' };
                return null;
            })(),
        },
        specificLocations: (() => {
            const locs = trav.specificLocations || trav.specific_locations;
            if (Array.isArray(locs) && locs.length) return locs;
            const single = trav.specificLocation || trav.specific_location;
            return single ? [single] : [];
        })(),
        payingForTrip: payerType,
        payer: payerType === 'S' ? null : {
            ...p,
            surname: trav.payerSurname || p.surname || '',
            givenName: trav.payerGivenName || p.givenName || '',
            phone: trav.payerPhone || trav.payerCompanyPhone || p.phone || '',
            email: cleanVal(trav.payerEmail || p.email),
            relationship: trav.payerRelationship || p.relationship || '',
            sameAddress: trav.payerSameAddress || p.sameAddress || 'N',
            companyName: trav.payerCompanyName || p.companyName || '',
            companyRelation: trav.payerCompanyRelation || p.companyRelation || '',
            street1: trav.payerPersonStreet1 || trav.payerCoStreet1 || trav.payerStreet1 || p.street1 || pAddr.street1 || '',
            street2: trav.payerPersonStreet2 || trav.payerCoStreet2 || trav.payerStreet2 || p.street2 || pAddr.street2 || '',
            city: trav.payerPersonCity || trav.payerCoCity || trav.payerCity || p.city || pAddr.city || '',
            state: trav.payerPersonState || trav.payerCoState || trav.payerState || p.state || pAddr.state || '',
            postalCode: trav.payerPersonPostalCode || trav.payerCoPostalCode || trav.payerPostalCode || p.postalCode || pAddr.postalCode || '',
            country: trav.payerPersonCountry || trav.payerCoCountry || trav.payerCountry || p.country || pAddr.country || '',
        },
    };
}

module.exports = { normalizeTravel };
