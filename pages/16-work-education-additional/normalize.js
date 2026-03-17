// ============================================================
// Work/Education 3 — Languages, clan, countries, orgs, military
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeWorkEducation3(data, helpers) {
    const { g } = helpers;

    const we3 = data.workEducation3 || {};

    // Dedupe languages + sanitize names (DS-160: A-Z, 0-9, spaces only)
    const rawLangs = we3.languages || [];
    const seenLangs = new Set();
    const languages = rawLangs.filter(l => {
        const name = (l.language || l.name || '').toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
            .replace(/[^A-Z0-9 ]/g, '').trim();
        if (!name || seenLangs.has(name)) return false;
        seenLangs.add(name);
        l.language = name; // overwrite with sanitized name
        return true;
    });

    // Dedupe countries visited
    const rawCountries = we3.countriesVisitedList || we3.countries_visited_list || [];
    const seenCountries = new Set();
    const countriesVisitedList = rawCountries.filter(c => {
        const code = (c.country || c).toString().toUpperCase();
        if (!code || seenCountries.has(code)) return false;
        seenCountries.add(code);
        return true;
    });

    return {
        languages: languages,
        clanTribe: we3.clanTribe === 'Y' || we3.clan_tribe === 'Y',
        clanTribeName: we3.clanTribeName || we3.clan_tribe_name || '',
        countriesVisited: we3.countriesVisited === 'Y' || we3.countries_visited === 'Y',
        countriesVisitedList: countriesVisitedList,
        organizationMember: we3.organizationMember === 'Y' || we3.organization_member === 'Y',
        organizations: (we3.organizations || []).map(o => typeof o === 'object' ? (o.name || '') : o),
        organizationName: (() => { const first = (we3.organizations || [])[0]; return typeof first === 'object' ? (first?.name || '') : (first || ''); })(),
        specializedSkills: we3.specializedSkills === 'Y' || we3.specialized_skills === 'Y',
        specializedSkillsExplanation: we3.specializedSkillsExplanation || we3.specialized_skills_explanation || '',
        militaryService: we3.militaryService === 'Y' || we3.military_service === 'Y',
        military: we3.military || [],
        insurgentOrg: we3.insurgentOrg === 'Y' || we3.insurgent_org === 'Y',
        insurgentOrgExplanation: we3.insurgentOrgExplanation || we3.insurgent_org_explanation || '',
    };
}

module.exports = { normalizeWorkEducation3 };
