// ============================================================
// B1/B2 Field Map — MODULAR AGGREGATOR
// Importa cada página e concatena os field-map entries
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../../pages/_shared/field-map-helpers');
const { isPostbackSelect, isPostbackClick, POSTBACK_SELECT_IDS, POSTBACK_CLICK_YES_IDS, POSTBACK_CLICK_ANY_IDS } = require('./shared');

// Import page-level builders
const { buildPersonal1Map } = require('../../pages/02-personal1/field-map');
const { buildPersonal2Map } = require('../../pages/03-personal2/field-map');
const { buildTravelMap } = require('../../pages/04-travel/field-map');
const { buildTravelCompanionsMap } = require('../../pages/05-travel-companions/field-map');
const { buildAddressPhoneMap } = require('../../pages/07-address-phone/field-map');
const { buildPreviousUSTravelMap } = require('../../pages/06-previous-us-travel/field-map');
const { buildPassportMap } = require('../../pages/08-passport/field-map');
const { buildUSContactMap } = require('../../pages/09-us-contact/field-map');
const { buildFamilyParentsMap } = require('../../pages/10-family-parents/field-map');
const { buildFamilySpouseMap } = require('../../pages/11-family-spouse/field-map');
const { buildWorkEd1Map } = require('../../pages/14-work-education-current/field-map');
const { buildWorkEd2Map } = require('../../pages/15-work-education-previous/field-map');
const { buildWorkEd3Map } = require('../../pages/16-work-education-additional/field-map');
const { buildPrevSpouseMap } = require('../../pages/13-prev-spouse/field-map');
const { buildDeceasedSpouseMap } = require('../../pages/12-deceased-spouse/field-map');
const { buildSecurityMap } = require('../../pages/17-security/field-map');

const PAGE_BUILDERS = [
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
    const t = a.travel || {};
    t.arrivalDate = normDate(t.arrivalDate);
    t.departureDate = normDate(t.departureDate);
    t.lengthOfStay = t.lengthOfStay || {};
    t.usAddress = t.usAddress || {};
    const payer = a.payer || t.payer || {};
    payer.address = payer.address || {};
    const pp = a.passport || {};
    pp.issuanceDate = normDate(pp.issuanceDate);
    pp.expirationDate = normDate(pp.expirationDate);
    const addr = a.homeAddress || {};
    const uc = a.usContact || {};
    const emp = a.employer || {};
    emp.startDate = normDate(emp.startDate);
    const father = a.father || {};
    father.dob = normDate(father.dob);
    const mother = a.mother || {};
    mother.dob = normDate(mother.dob);
    const spouse = a.spouse || {};
    spouse.dob = normDate(spouse.dob);
    spouse.marriageDate = normDate(spouse.marriageDate);
    spouse.address = spouse.address || {};

    // Context object passed to each page builder
    const ctx = { t, payer, pp, addr, uc, emp, father, mother, spouse, emptyDate };

    // Build from all page modules
    const map = [];
    for (const builder of PAGE_BUILDERS) {
        const entries = builder(a, ctx);
        map.push(...entries);
    }
    return map;
}

module.exports = {
    buildDynamicFieldMap,
    isPostbackSelect,
    isPostbackClick,
    POSTBACK_SELECT_IDS,
    POSTBACK_CLICK_YES_IDS,
    POSTBACK_CLICK_ANY_IDS,
};
