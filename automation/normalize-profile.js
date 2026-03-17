// ============================================================
// NORMALIZE PROFILE — Modular Aggregator
// Importa cada módulo e concatena os resultados
// ============================================================
const { normalizePersonal1 } = require('../pages/02-personal1/normalize');
const { normalizePersonal2 } = require('../pages/03-personal2/normalize');
const { normalizeTravel } = require('../pages/04-travel/normalize');
const { normalizeTravelCompanions } = require('../pages/05-travel-companions/normalize');
const { normalizePreviousUSTravel } = require('../pages/06-previous-us-travel/normalize');
const { normalizeAddressPhone } = require('../pages/07-address-phone/normalize');
const { normalizePassport } = require('../pages/08-passport/normalize');
const { normalizeUSContact } = require('../pages/09-us-contact/normalize');
const { normalizeFamilyParents } = require('../pages/10-family-parents/normalize');
const { normalizeSpouse } = require('../pages/11-family-spouse/normalize');
const { normalizeDeceasedSpouse } = require('../pages/12-deceased-spouse/normalize');
const { normalizePrevSpouse } = require('../pages/13-prev-spouse/normalize');
const { normalizeWorkEducation1 } = require('../pages/14-work-education-current/normalize');
const { normalizeWorkEducation2 } = require('../pages/15-work-education-previous/normalize');
const { normalizeWorkEducation3 } = require('../pages/16-work-education-additional/normalize');
const { normalizeSecurity } = require('../pages/17-security/normalize');
const { normalizeStudentExchange } = require('../pages/18-student-exchange/normalize');
const { normalizeStudentAddContact } = require('../pages/19a-student-add-contact/normalize');
const { normalizePetitionInfo } = require('../pages/19-petition-info/normalize');
const { normalizeLocation } = require('../pages/01-location/normalize');

// Shared helpers
const g = (obj, camel, snake) => obj[camel] || obj[snake] || '';
const na = (v) => (!v || v === 'N/A' || v === 'n/a' || v === 'DNA') ? null : v;
const stripAccents = (s) => typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
const sanitize = (obj) => {
    if (typeof obj === 'string') return stripAccents(obj);
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') { const out = {}; for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v); return out; }
    return obj;
};
const helpers = { g, na, stripAccents, sanitize };

function normalizeProfile(data) {
    // If already flat with surname at top level, return as-is
    if (data.surname && data.givenName) return data;

    const profile = {};
    Object.assign(profile, normalizePersonal1(data, helpers));
    Object.assign(profile, normalizePersonal2(data, helpers));
    Object.assign(profile, normalizeTravel(data, helpers));
    Object.assign(profile, normalizeTravelCompanions(data, helpers));
    Object.assign(profile, normalizePreviousUSTravel(data, helpers));
    Object.assign(profile, normalizeAddressPhone(data, helpers));
    Object.assign(profile, normalizePassport(data, helpers));
    Object.assign(profile, normalizeUSContact(data, helpers));
    Object.assign(profile, normalizeFamilyParents(data, helpers));
    Object.assign(profile, normalizeSpouse(data, helpers));
    Object.assign(profile, normalizeDeceasedSpouse(data, helpers));
    Object.assign(profile, normalizePrevSpouse(data, helpers));
    Object.assign(profile, normalizeWorkEducation1(data, helpers));
    Object.assign(profile, normalizeWorkEducation2(data, helpers));
    Object.assign(profile, normalizeWorkEducation3(data, helpers));
    Object.assign(profile, normalizeSecurity(data, helpers));
    Object.assign(profile, normalizeStudentExchange(data, helpers));
    Object.assign(profile, normalizeStudentAddContact(data, helpers));
    Object.assign(profile, normalizePetitionInfo(data, helpers));
    Object.assign(profile, normalizeLocation(data, helpers));

    // Strip accents from all string values (DS-160 only accepts ASCII)
    return sanitize(profile);
}

module.exports = { normalizeProfile };
