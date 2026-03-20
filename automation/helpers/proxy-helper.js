// ============================================================
// Proxy Helper — Centralised proxy config for DataImpulse
// Single source of truth: reads from DB settings or env.
// All automation modules (DS-160, AIS) consume this helper.
// ============================================================

/**
 * Build Playwright-compatible proxy opts from a raw proxy URL.
 *
 * DataImpulse username modifiers (appended to base username):
 *   __cr.XX,YY   → country targeting (e.g. __cr.us,br)
 *   __s.XXXXX    → sticky session (same IP for entire flow)
 *
 * @param {string} rawUrl  - Full proxy URL (http://user:pass@host:port)
 * @param {object} [opts]
 * @param {string} [opts.countries]  - Comma-separated country codes (default: from DB or 'us,br')
 * @param {string} [opts.sessionId] - Sticky session id (auto-generated if omitted)
 * @returns {{ server: string, username?: string, password?: string } | null}
 */
function buildProxyOpts(rawUrl, opts = {}) {
    if (!rawUrl) return null;

    try {
        const parsed = new URL(rawUrl);
        if (!parsed.hostname || !parsed.port) {
            throw new Error(`URL incompleta: hostname=${parsed.hostname}, port=${parsed.port}`);
        }

        let username = decodeURIComponent(parsed.username) || '';

        // ── Geo-targeting ──
        const countries = opts.countries || 'us,br';
        if (username && !username.includes('__cr.')) {
            username = `${username}__cr.${countries}`;
        }

        // ── Sticky session ──
        const sessionId = opts.sessionId || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        if (username && !username.includes('__s.')) {
            username = `${username}__s.${sessionId}`;
        }

        const proxyOpts = {
            server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
            username: username || undefined,
            password: decodeURIComponent(parsed.password) || undefined,
        };

        console.log(`[Proxy] Sticky: ${parsed.hostname}:${parsed.port} | countries=${countries} | session=${sessionId}`);
        return proxyOpts;

    } catch (e) {
        throw new Error(`Proxy URL invalida (${rawUrl}): ${e.message}`);
    }
}

/**
 * Resolve the proxy URL from available sources (priority order):
 *   1. Explicit override (e.g. retry session)
 *   2. Settings table row for 'proxy_url'
 *   3. process.env.PROXY_URL
 *
 * @param {object} [sources]
 * @param {string} [sources.override]       - Explicit URL (e.g. from application.proxy_session)
 * @param {object} [sources.settingsRow]    - Row from settings table { key_value }
 * @returns {string|null}
 */
function resolveProxyUrl(sources = {}) {
    const url = sources.override
        || (sources.settingsRow && sources.settingsRow.key_value)
        || process.env.PROXY_URL
        || null;

    if (!url || url.trim() === '') return null;
    return url.trim();
}

/**
 * Resolve proxy countries from available sources:
 *   1. Settings table row for 'proxy_countries'
 *   2. Default 'us,br'
 *
 * @param {object} [sources]
 * @param {object} [sources.settingsRow]  - Row from settings table { key_value }
 * @returns {string}
 */
function resolveProxyCountries(sources = {}) {
    const countries = (sources.settingsRow && sources.settingsRow.key_value)
        || 'us,br';
    return countries.trim();
}

module.exports = { buildProxyOpts, resolveProxyUrl, resolveProxyCountries };
