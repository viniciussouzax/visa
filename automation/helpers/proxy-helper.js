// ============================================================
// Proxy Helper - camada unica de configuracao de proxy
// Suporta providers:
//   - dataimpulse
//   - apify
// ============================================================
'use strict';

function sanitizeSessionId(sessionId) {
    const clean = String(sessionId || '')
        .replace(/[^a-zA-Z0-9._~]/g, '')
        .slice(0, 48);
    return clean || `s${Date.now()}`;
}

function buildDataImpulseProxyOpts(rawUrl, opts = {}) {
    if (!rawUrl) return null;

    const parsed = new URL(rawUrl);
    if (!parsed.hostname || !parsed.port) {
        throw new Error(`URL incompleta: hostname=${parsed.hostname}, port=${parsed.port}`);
    }

    let username = decodeURIComponent(parsed.username || '');
    const countries = (opts.countries || 'us,br').trim();
    const sessionId = sanitizeSessionId(opts.sessionId || `auto_${Date.now()}`);

    if (username && !username.includes('__cr.')) {
        username = `${username}__cr.${countries}`;
    }
    if (username && !username.includes('__s.')) {
        username = `${username}__s.${sessionId}`;
    }

    return {
        provider: 'dataimpulse',
        server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
        username: username || undefined,
        password: decodeURIComponent(parsed.password || '') || undefined,
        sessionId,
        logSafe: `${parsed.protocol}//***@${parsed.hostname}:${parsed.port}`,
    };
}

function buildApifyProxyOpts(opts = {}) {
    const password = opts.password || process.env.APIFY_PROXY_PASSWORD || '';
    if (!password) return null;

    const server = opts.server || process.env.APIFY_PROXY_SERVER || 'http://proxy.apify.com:8000';
    const sessionId = sanitizeSessionId(opts.sessionId || `auto_${Date.now()}`);
    const username = String(opts.username || process.env.APIFY_PROXY_USERNAME || '').trim();
    const usernameMode = String(opts.usernameMode || process.env.APIFY_PROXY_USERNAME_MODE || 'auto')
        .trim()
        .toLowerCase();
    const groups = String(opts.groups || process.env.APIFY_PROXY_GROUPS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
        .join('+');
    const country = String(opts.country || process.env.APIFY_PROXY_COUNTRY || '')
        .trim()
        .toUpperCase();
    let resolvedUsername = username;

    if (!resolvedUsername) {
        if (usernameMode === 'auto') {
            resolvedUsername = 'auto';
        } else {
            const usernameParts = [];
            if (groups) usernameParts.push(`groups-${groups}`);
            usernameParts.push(`session-${sessionId}`);
            if (country) usernameParts.push(`country-${country}`);
            resolvedUsername = usernameParts.join(',');
        }
    }

    return {
        provider: 'apify',
        server,
        username: resolvedUsername,
        password,
        sessionId,
        usernameMode,
        groups,
        country,
        logSafe: `${server.replace(/\/\/.*$/, '//')}***`,
    };
}

function buildProxyOpts(proxyConfigOrUrl, opts = {}) {
    if (!proxyConfigOrUrl) return null;

    if (typeof proxyConfigOrUrl === 'string') {
        return buildDataImpulseProxyOpts(proxyConfigOrUrl, opts);
    }

    const provider = String(proxyConfigOrUrl.provider || 'dataimpulse').trim().toLowerCase();
    if (provider === 'apify') {
        return buildApifyProxyOpts({
            password: proxyConfigOrUrl.password,
            groups: proxyConfigOrUrl.groups,
            country: proxyConfigOrUrl.country,
            server: proxyConfigOrUrl.server,
            sessionId: proxyConfigOrUrl.sessionId || opts.sessionId,
        });
    }

    return buildDataImpulseProxyOpts(proxyConfigOrUrl.url, {
        countries: proxyConfigOrUrl.countries || opts.countries,
        sessionId: proxyConfigOrUrl.sessionId || opts.sessionId,
    });
}

function resolveProxyProvider(sources = {}) {
    const provider = sources.override
        || (sources.settingsMap && sources.settingsMap.proxy_provider)
        || process.env.PROXY_PROVIDER
        || 'dataimpulse';
    return String(provider).trim().toLowerCase();
}

function resolveProxyUrl(sources = {}) {
    const url = sources.override
        || (sources.settingsRow && sources.settingsRow.key_value)
        || (sources.settingsMap && sources.settingsMap.proxy_url)
        || process.env.PROXY_URL
        || null;

    if (!url || String(url).trim() === '') return null;
    return String(url).trim();
}

function resolveProxyCountries(sources = {}) {
    return String(
        (sources.settingsRow && sources.settingsRow.key_value)
        || (sources.settingsMap && sources.settingsMap.proxy_countries)
        || process.env.PROXY_COUNTRIES
        || 'us,br'
    ).trim();
}

function resolveApifyPassword(sources = {}) {
    return String(
        (sources.settingsMap && sources.settingsMap.apify_proxy_password)
        || process.env.APIFY_PROXY_PASSWORD
        || ''
    ).trim();
}

function resolveApifyUsername(sources = {}) {
    return String(
        (sources.settingsMap && sources.settingsMap.apify_proxy_username)
        || process.env.APIFY_PROXY_USERNAME
        || ''
    ).trim();
}

function resolveApifyUsernameMode(sources = {}) {
    return String(
        (sources.settingsMap && sources.settingsMap.apify_proxy_username_mode)
        || process.env.APIFY_PROXY_USERNAME_MODE
        || 'auto'
    ).trim().toLowerCase();
}

function resolveApifyGroups(sources = {}) {
    return String(
        (sources.settingsMap && sources.settingsMap.apify_proxy_groups)
        || process.env.APIFY_PROXY_GROUPS
        || ''
    ).trim();
}

function resolveApifyCountry(sources = {}) {
    const fromSettings = (sources.settingsMap && sources.settingsMap.apify_proxy_country) || '';
    if (fromSettings) return String(fromSettings).trim().toUpperCase();

    const fromEnv = process.env.APIFY_PROXY_COUNTRY || '';
    if (fromEnv) return String(fromEnv).trim().toUpperCase();
    return '';
}

function buildResolvedProxyConfig(sources = {}) {
    const provider = resolveProxyProvider(sources);
    const sessionId = sanitizeSessionId(sources.sessionId || `auto_${Date.now()}`);

    if (provider === 'apify') {
        const password = resolveApifyPassword(sources);
        if (!password) return null;
        return {
            provider,
            password,
            username: resolveApifyUsername(sources),
            usernameMode: resolveApifyUsernameMode(sources),
            groups: resolveApifyGroups(sources),
            country: resolveApifyCountry(sources),
            sessionId,
        };
    }

    const url = resolveProxyUrl(sources);
    if (!url) return null;
    return {
        provider: 'dataimpulse',
        url,
        countries: resolveProxyCountries(sources),
        sessionId,
    };
}

module.exports = {
    sanitizeSessionId,
    buildProxyOpts,
    buildDataImpulseProxyOpts,
    buildApifyProxyOpts,
    resolveProxyProvider,
    resolveProxyUrl,
    resolveProxyCountries,
    resolveApifyPassword,
    resolveApifyUsername,
    resolveApifyUsernameMode,
    resolveApifyGroups,
    resolveApifyCountry,
    buildResolvedProxyConfig,
};
