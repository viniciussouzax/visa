// ============================================================
// fly-profile.js — Perfil operacional coerente para Fly.io
// Fonte única da verdade para identidade do browser
// ============================================================

/**
 * Constroi perfil de identidade alinhado com o runtime real do Fly.io
 *
 * Runtime real:
 * - Linux container (Ubuntu Noble)
 * - Google Chrome Stable (não Chromium)
 * - Xvfb virtual display (HEADLESS=false)
 * - Patchright com CDP patches
 *
 * Importante: Não sortear Firefox/Edge se o browser real é Chrome.
 * Mantém identidade consistente para reduzir fingerprint variance.
 *
 * @param {object} config - automation_config + settings
 * @param {string} config.proxy_url - proxy opcional
 * @param {string} config.proxy_countries - países para geo-targeting
 * @returns {object} identity profile
 */
function buildFlyIdentityProfile(config = {}) {
    const proxyUrl = config.proxy_url || process.env.PROXY_URL || null;
    const proxyCountries = (config.proxy_countries || 'us,br').split(',').map(s => s.trim());

    // Determinar locale baseado no proxy (se houver)
    const useUsLocale = proxyUrl && (proxyUrl.includes('__cr.us') || proxyCountries.includes('us'));

    // Resolução de tela fixa (não randomizar muito — manter consistência)
    // 1366x768 é comum para VMs/desktops
    const screenRes = { width: 1366, height: 768 };

    // User agent: SEMPRE Chrome (runtime real é Chrome)
    // Fixar versão próxima à instalada (Chrome Stable ~131-134 em Mar 2026)
    // Randomizar apenas o build number para variar um pouco
    const chromeMajor = 134; // Ajuste conforme versão real no container
    const buildNumber = 5000 + Math.floor(Math.random() * 5000);
    const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.${buildNumber}.0 Safari/537.36`;

    // Geolocation com noise pequeno (±0.01° ~1km) — suficiente para parecer real
    const baseGeo = useUsLocale
        ? { latitude: 40.7128, longitude: -74.0060 }   // NYC
        : { latitude: -23.5505, longitude: -46.6333 }; // São Paulo
    const geoNoise = () => (Math.random() - 0.5) * 0.02;
    const geolocation = {
        latitude: baseGeo.latitude + geoNoise(),
        longitude: baseGeo.longitude + geoNoise(),
    };

    return {
        userAgent,
        locale: useUsLocale ? 'en-US' : 'pt-BR',
        timezoneId: useUsLocale ? 'America/New_York' : 'America/Sao_Paulo',
        screenRes,
        geolocation,
        // Propriedades adicionais para consistência
        platform: 'Win32',
        hardwareConcurrency: [4, 6, 8][Math.floor(Math.random() * 3)],
        deviceMemory: [4, 8][Math.floor(Math.random() * 2)],
        deviceScaleFactor: 1, // Fixar em 1 para desktops (variação causa fingerprint)
    };
}

/**
 * Monta as opções de launch para patchright/chromium
 * Centraliza args que são críticos para stealth e performance
 *
 * @param {object} identity - resultado de buildFlyIdentityProfile()
 * @param {object} proxyOpts - proxy options (ou null)
 * @returns {object} launchOptions
 */
function buildLaunchOptions(identity, proxyOpts = null) {
    const launchArgs = [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        `--window-size=${identity.screenRes.width},${identity.screenRes.height}`,
        '--start-maximized',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--enforce-webrtc-ip-permission-check',
        '--disable-webrtc-hw-decoding',
        '--disable-webrtc-hw-encoding',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        // Compatibilidade com Xvfb
        '--display=:99',
    ];

    const launchOpts = {
        headless: false, // Fly usa Xvfb, nunca headless
        channel: 'chrome',
        args: launchArgs,
    };

    if (proxyOpts) {
        launchOpts.proxy = proxyOpts;
    }

    return launchOpts;
}

/**
 * Monta as opções de contexto (browser.newContext)
 *
 * @param {object} identity
 * @returns {object} contextOptions
 */
function buildContextOptions(identity) {
    return {
        viewport: { width: identity.screenRes.width, height: identity.screenRes.height },
        screen: { width: identity.screenRes.width, height: identity.screenRes.height },
        userAgent: identity.userAgent,
        locale: identity.locale,
        timezoneId: identity.timezoneId,
        geolocation: identity.geolocation,
        permissions: ['geolocation'],
        colorScheme: 'light',
        deviceScaleFactor: identity.deviceScaleFactor,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': identity.locale === 'pt-BR' ? 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9',
            'DNT': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        },
        recordVideo: {
            dir: '/tmp/videos',
            size: { width: 1280, height: 720 },
        },
    };
}

module.exports = {
    buildFlyIdentityProfile,
    buildLaunchOptions,
    buildContextOptions,
};
