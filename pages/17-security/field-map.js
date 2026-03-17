// ============================================================
// Security Questions
// Field map for 17-security
// ============================================================
const { ph, padDay, normDate, emptyDate } = require('../_shared/field-map-helpers');

/**
 * Build field map entries for this page
 * @param {Object} a - Normalized applicant data
 * @param {Object} ctx - Shared context (map array, emptyDate, etc.)
 * @returns {Array} Field map entries for this page
 */
function buildSecurityMap(a, ctx) {
    const map = [];

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
        // Explanation textbox: some use tbx<Name>, others tbx<Name>_EXPL (only deport)
        const explKey = jsonKey + 'Expl';
        if (sec[explKey]) {
          // Convert rblFieldName → tbxFieldName, match with or without _EXPL suffix
          const tbxName = radioName.replace('rbl', 'tbx');
          const explPattern = new RegExp(tbxName + '(_EXPL)?$', 'i');
          map.push({ pattern: explPattern, value: sec[explKey], type: 'text' });
        }
      }
      // If sec[jsonKey] is false/undefined, the filler's default "No" logic handles it
    }

    return map;
}

module.exports = { buildSecurityMap };
