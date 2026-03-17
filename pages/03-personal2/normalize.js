// ============================================================
// Personal 2 — Nationality, perm resident, IDs
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizePersonal2(data, helpers) {
    const { g } = helpers;

    const p2 = data.personal2 || {};
    const nat = g(p2, 'nationality', 'nationality') || null;
    const otherNats = (p2.otherNationalities || p2.other_nationalities || [])
        .filter(o => o.country && o.country !== nat)
        .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
    const permResCountries = (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
        .filter(c => c.country && c.country !== nat)
        .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i);
    return {
        nationality: nat,
        otherNationality: (() => {
            const flag = p2.otherNationality === 'Y' || p2.other_nationality === 'Y';
            return flag || otherNats.length > 0;
        })(),
        otherNationalities: otherNats,
        otherNationalityCountry: otherNats[0]?.country,
        otherNationalityPassport: otherNats[0]?.hasPassport === 'Y',
        otherNationalityPassportNumber: otherNats[0]?.passportNumber,
        permanentResidentOtherCountry: permResCountries.length > 0,
        permanentResidentCountries: permResCountries,
        permanentResidentCountry: permResCountries[0]?.country,
        nationalId: (g(p2, 'nationalId', 'national_id') || '').replace(/[\.\-\s]/g, ''),
        usSsn: (() => {
            const ssn = p2.ssn;
            if (!ssn || ssn === 'N/A' || ssn === 'DNA') return null;
            let raw = '';
            if (typeof ssn === 'object' && ssn.p1) raw = (ssn.p1 || '') + (ssn.p2 || '') + (ssn.p3 || '');
            else if (typeof ssn === 'string') raw = ssn.replace(/\D/g, '');
            // DS-160 requires EXACTLY 9 digits — reject anything else
            if (raw.length !== 9 || /^0+$/.test(raw)) return null;
            return raw;
        })(),
        usTaxpayerId: p2.taxId && p2.taxId !== 'N/A' && p2.taxId !== 'DNA' ? p2.taxId : null,
    };
}

module.exports = { normalizePersonal2 };
