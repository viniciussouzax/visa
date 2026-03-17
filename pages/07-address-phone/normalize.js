// ============================================================
// Address & Phone — Home, mailing, phones, email, social media
// Normalize raw form data → flat profile for this page
// ============================================================

/**
 * @param {Object} data - Raw applicant data (nested by section)
 * @param {Object} helpers - Shared helpers { g, na, stripAccents }
 * @returns {Object} Normalized flat fields for this page
 */
function normalizeAddressPhone(data, helpers) {
    const { g } = helpers;

    const addr = data.addressPhone || {};
    const na = helpers.na;
    const PLATFORM_MAP = {
        'TWITTER': 'TWIT', 'TWIT': 'TWIT', 'X': 'TWIT',
        'FACEBOOK': 'FCBK', 'FCBK': 'FCBK', 'FB': 'FCBK',
        'INSTAGRAM': 'INST', 'INST': 'INST', 'INSTA': 'INST',
        'LINKEDIN': 'LINK', 'LINK': 'LINK',
        'YOUTUBE': 'YTUB', 'YTUB': 'YTUB',
        'REDDIT': 'RDDT', 'RDDT': 'RDDT',
        'GOOGLE': 'GOGL', 'GOGL': 'GOGL', 'GOOGLE+': 'GOGL',
        'FLICKR': 'FLKR', 'FLKR': 'FLKR',
        'TUMBLR': 'TUMB', 'TUMB': 'TUMB',
        'PINTEREST': 'PTST', 'PTST': 'PTST',
        'VINE': 'VINE', 'MYSPACE': 'MYSP', 'MYSP': 'MYSP',
        'ASK.FM': 'ASKF', 'ASKF': 'ASKF',
        'WEIBO': 'SWBO', 'SWBO': 'SWBO', 'SINA': 'SWBO', 'SINA WEIBO': 'SWBO',
        'TENCENT WEIBO': 'TWBO', 'TWBO': 'TWBO',
        'DOUBAN': 'DUBN', 'DUBN': 'DUBN',
        'QZONE': 'QZNE', 'QZNE': 'QZNE', 'QQ': 'QZNE',
        'TWOO': 'TWOO', 'VKONTAKTE': 'VKON', 'VKON': 'VKON', 'VK': 'VKON',
        'YOUKU': 'YUKU', 'YUKU': 'YUKU', 'NONE': 'NONE',
    };
    const VALID_CODES = new Set(Object.values(PLATFORM_MAP));
    const raw = (addr.socialMedia || addr.social_media || []).filter(sm => sm.platform && sm.platform.trim());
    const mapped = raw.map(sm => ({ ...sm, _original: sm.platform, platform: PLATFORM_MAP[(sm.platform || '').toUpperCase()] || sm.platform }));
    const unsupported = mapped.filter(sm => !VALID_CODES.has((sm.platform || '').toUpperCase()));
    if (unsupported.length > 0) unsupported.forEach(sm => console.log(`[Normalize] ↗️ "${sm._original}" → additionalSocialMedia (não tem código DS-160)`));
    const overflowSocial = unsupported.map(sm => ({ platform: sm._original || sm.platform, handle: sm.handle || '' }));
    return {
        homeAddress: (() => {
            const nested = addr.homeAddress || addr.home_address;
            if (nested && nested.street1) return nested;
            return { street1: addr.homeStreet1 || '', street2: addr.homeStreet2 || '', city: addr.homeCity || '', state: addr.homeState || '', postalCode: addr.homePostalCode || '', country: addr.homeCountry || '' };
        })(),
        mailingAddressSame: addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true || addr.mailing_address_same === 'Y' || addr.mailing_address_same === true,
        mailingAddress: (() => {
            const nested = addr.mailingAddress || addr.mailing_address;
            if (nested && nested.street1) return nested;
            if (addr.mailStreet1 || addr.mailCity) return { street1: addr.mailStreet1 || '', street2: addr.mailStreet2 || '', city: addr.mailCity || '', state: addr.mailState || '', postalCode: addr.mailPostalCode || '', country: addr.mailCountry || '' };
            return null;
        })(),
        phone: g(addr, 'phone', 'phone'),
        mobilePhone: na(addr.mobilePhone || addr.mobile_phone) || null,
        businessPhone: na(addr.businessPhone || addr.business_phone) || null,
        email: g(addr, 'email', 'email'),
        additionalPhones: addr.additionalPhones === 'Y' || addr.additional_phones === 'Y' || false,
        additionalPhoneNumbers: addr.additionalPhoneNumbers || addr.additional_phone_numbers || [],
        additionalEmails: addr.additionalEmails === 'Y' || addr.additional_emails === 'Y' || false,
        additionalEmailAddresses: addr.additionalEmailAddresses || addr.additional_email_addresses || [],
        socialMedia: mapped.filter(sm => VALID_CODES.has((sm.platform || '').toUpperCase())),
        additionalSocialMedia: addr.additionalSocialMedia === 'Y' || addr.additional_social_media === 'Y' || !!(overflowSocial.length),
        additionalSocialMediaAccounts: [...(addr.additionalSocialMediaAccounts || addr.additional_social_media_accounts || []), ...overflowSocial],
    };
}

module.exports = { normalizeAddressPhone };
