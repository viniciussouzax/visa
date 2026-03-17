// ============================================================
// Work/Education 3 — Languages, clan, countries, orgs, military
// Field map for 16-work-education-additional
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildWorkEd3Map(a, ctx) {
    const map = [];

    // ===================================================================
    // WORK / EDUCATION 3 (Additional)
    // ===================================================================
    // Languages (dtlLANGUAGES) — supports multiple entries
    // Respostas: languages[0] (ctl00), [1] (ctl01 → addAnother), ...
    const rawLangs = a.languages?.length > 0 ? a.languages : ['PORTUGUESE'];
    const langs = rawLangs.map(l => typeof l === 'object' ? (l.name || l.language || '') : l);
    langs.forEach((lang, idx) => {
      const ctl = `ctl${String(idx).padStart(2, '0')}`;
      const base = { type: "text" };
      if (idx > 0) base.addAnother = { list: "dtlLANGUAGES", idx };
      map.push({ pattern: new RegExp(`dtlLANGUAGES_${ctl}_tbxLANGUAGE_NAME$`, 'i'), value: lang || "", ...base });
    });
    // Generic fallback for ctl00
    map.push({ pattern: /tbxLANGUAGE_NAME$/i, value: langs[0] || "", type: "text" });
    
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
      const countries = a.countriesVisitedList.map(c => typeof c === 'object' ? (c.country || c.name || '') : c);
      countries.forEach((country, idx) => {
        const ctl = `ctl${String(idx).padStart(2, '0')}`;
        const base = {};
        if (idx > 0) base.addAnother = { list: "dtlCountriesVisited", idx };
        map.push({ pattern: new RegExp(`dtlCountriesVisited_${ctl}_ddlCOUNTRIES_VISITED$`, 'i'), value: country || "", type: "select-search", ...base });
      });
      // Generic fallback for ctl00
      map.push({ pattern: /ddlCOUNTRIES_VISITED$/i, value: countries[0] || "", type: "select-search" });
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

    return map;
}

module.exports = { buildWorkEd3Map };
