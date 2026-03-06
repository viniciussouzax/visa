// ============================================================
// SHARED — Common helpers used across all visa field maps
// ============================================================

/**
 * Clean phone number: remove non-digits and leading '+'
 */
function ph(s) {
    return (s || "").replace(/[^0-9+]/g, "").replace("+", "");
}

// ===================================================================
// POSTBACK TRIGGERS (shared across all visa types)
// These IDs tell the filler which selects/clicks trigger ASP.NET
// postbacks and require waiting for page reload before continuing
// ===================================================================
const POSTBACK_SELECT_IDS = [
    "CNTRY", "Country", "PurposeOfTrip", "VisaClass", "OtherPurpose",
    "Occupation", "PPT_TYPE", "REL_TO_APP", "POC_REL", "SocialMedia",
    "MARITAL_STATUS", "APP_GENDER",
    "WhoIsPaying", "PayerRelationship",
    "SpouseNatDropDownList", "SpouseAddressType", "SpousePOBCountry",
];

const POSTBACK_CLICK_YES_IDS = [
    "PreviouslyEmployed", "AttendedEduc", "OtherEduc", "OTH_NATL",
    "OtherNames", "TelecodeQuestion", "PermResOtherCntryInd",
    "OtherPersonsTravelingWithYou", "GroupTravel",
    "PREV_US_TRAVEL_IND", "PREV_US_DRIVER_LIC_IND", "PREV_VISA_IND", "PREV_VISA_REFUSED_IND", "IV_PETITION_IND", "PERM_RESIDENT_IND", "VWP_DENIAL_IND",
    "AddPhone", "AddEmail", "AddSocial", "AddSite",
    "LOST_PPT_IND",
    "FATHER_LIVE_IN_US_IND", "MOTHER_LIVE_IN_US_IND",
    "CLAN_TRIBE_IND", "COUNTRIES_VISITED_IND", "ORGANIZATION_IND",
    "SPECIALIZED_SKILLS_IND", "MILITARY_SERVICE_IND", "INSURGENT_ORG_IND",
    "OTHER_PPT_IND", "PayerAddrSameAsInd",
    "PREV_VISA_LOST", "PREV_VISA_CANCELLED",
    "OTHER_RELATIVE_IND",
];

const POSTBACK_CLICK_ANY_IDS = [
    "SpecificTravel",
    "IMMED_RELATIVE",
    "MailingAddrSame", "MailingAddr",
];

function isPostbackSelect(fieldId) {
    return POSTBACK_SELECT_IDS.some((trigger) => fieldId.includes(trigger));
}

function isPostbackClick(fieldId, fieldType) {
    if (fieldType !== "radio") return false;
    if (POSTBACK_CLICK_YES_IDS.some((t) => fieldId.includes(t))) return true;
    if (POSTBACK_CLICK_ANY_IDS.some((t) => fieldId.includes(t))) return true;
    return false;
}

module.exports = {
    ph,
    isPostbackSelect,
    isPostbackClick,
    POSTBACK_SELECT_IDS,
    POSTBACK_CLICK_YES_IDS,
    POSTBACK_CLICK_ANY_IDS
};
