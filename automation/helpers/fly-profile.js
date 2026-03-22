// ============================================================
// fly-profile.js - perfil operacional coerente para Fly.io
// ============================================================

function buildFlyIdentityProfile(config = {}) {
    const proxyUrl = config.proxy_url || process.env.PROXY_URL || null;
    const proxyCountries = (config.proxy_countries || 'us,br').split(',').map(s => s.trim());
    const useUsLocale = proxyUrl && (proxyUrl.includes('__cr.us') || proxyCountries.includes('us'));

    const screenRes = { width: 1366, height: 768 };
    const baseGeo = useUsLocale
        ? { latitude: 40.7128, longitude: -74.0060 }
        : { latitude: -23.5505, longitude: -46.6333 };
    const geoNoise = () => (Math.random() - 0.5) * 0.02;

    return {
        locale: useUsLocale ? 'en-US' : 'pt-BR',
        timezoneId: useUsLocale ? 'America/New_York' : 'America/Sao_Paulo',
        screenRes,
        geolocation: {
            latitude: baseGeo.latitude + geoNoise(),
            longitude: baseGeo.longitude + geoNoise(),
        },
        deviceScaleFactor: 1,
    };
}

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
        '--display=:99',
    ];

    const launchOpts = {
        headless: false,
        channel: 'chrome',
        args: launchArgs,
    };

    if (proxyOpts) {
        launchOpts.proxy = proxyOpts;
    }

    return launchOpts;
}

function buildContextOptions(identity) {
    return {
        viewport: { width: identity.screenRes.width, height: identity.screenRes.height },
        screen: { width: identity.screenRes.width, height: identity.screenRes.height },
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
