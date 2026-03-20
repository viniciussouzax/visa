// DS-160 Filler — uses patchright (stealth Playwright fork) + real Chrome
// patchright patches CDP leaks (Runtime.enable, Console.enable, --enable-automation)
// that standard Playwright exposes, making automation undetectable
const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');
const { solveCaptcha, solveCaptchaBase64 } = require('./captcha');
const { humanDelay, humanType, humanClick, humanSelect, thinkingPause, maybeRandomScroll } = require('./helpers/human-behavior');

// ====================================================================
// MODULES ƒ¢aa modular architecture (helpers + generic page filler)
// ====================================================================
const { buildDynamicFieldMap, isPostbackSelect, isPostbackClick } = require('./field-map');
const { fillPage, verifyPage } = require('./pages/generic-page');
const { fillTravelPage } = require('./pages/travel-page');
const { getValidationErrors } = require('./helpers/verify');

const TMP = path.join(__dirname, '..', 'tmp');

// ====================================================================
// HUMAN SIMULATION HELPERS — imported from helpers/human-behavior.js
// humanDelay, humanType, humanClick, thinkingPause are imported above.
// Kept as comments for documentation:
//   humanDelay(min, max) — gaussian random delay
//   humanType(page, selector, text) — char-by-char typing
//   humanClick(page, selector) — mouse move + press/release
//   thinkingPause() — 10% chance long pause (simulates reading)
// ====================================================================

// ====================================================================
// MAIN ENTRY POINT
// ====================================================================
/**
 * Fill a DS-160 application using Playwright's Firefox.
 * @param {object} applicant - Row from 'applicants' table (has .data JSON)
 * @param {object} application - Row from 'applications' table
 * @param {function} onAppId - Callback when application_id is captured (for immediate DB persist)
 * @param {object} config - From automation_config table
 * @param {string} captchaMode - 'capmonster' | 'ai_vision'
 * @param {function} onPage - Callback(pageName) for status updates
 * @param {function} [onPageFilled] - Callback(pageStats) for fill_logs ƒ¢aa called after each page is filled
 * @param {object} [existingBrowser] - Reuse this browser instead of creating new
 * @param {object} [existingPage] - Reuse this page instead of creating new
 * @returns {{ success: boolean, applicationId?: string, error?: string, browser, activePage }}
 */
async function fillApplication(applicant, application, onAppId, config, captchaMode, onPage, onPageFilled, existingBrowser, existingPage) {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

    // Build field map from applicant data
    const profile = normalizeProfile(applicant.data);
    const fieldMap = buildDynamicFieldMap(profile);
    console.log(`[Filler] Profile: ${applicant.full_name} | Fields: ${fieldMap.length} | hasSpecificPlans: ${profile.hasSpecificPlans}`);

    // === PRE-FILL VALIDATION: Check required fields exist in JSON ===
    const missingFields = [];
    // Location (essencial — sem ele o landing não avança)
    if (!profile.location) missingFields.push('location');
    // Personal 1
    if (!profile.surname) missingFields.push('personal1.surname');
    if (!profile.givenName) missingFields.push('personal1.givenName');
    if (!profile.sex) missingFields.push('personal1.sex');
    if (!profile.maritalStatus) missingFields.push('personal1.maritalStatus');
    if (!profile.dob?.day || !profile.dob?.month || !profile.dob?.year) missingFields.push('personal1.dob');
    if (!profile.cityOfBirth) missingFields.push('personal1.cityOfBirth');
    if (!profile.countryOfBirth) missingFields.push('personal1.countryOfBirth');
    // Personal 2
    if (!profile.nationality) missingFields.push('personal2.nationality');
    // Travel
    if (!profile.purposeOfTrip) missingFields.push('travel.purposeOfTrip');
    if (!profile.travel?.arrivalDate) missingFields.push('travel.arrivalDate');
    if (!profile.hasSpecificPlans && !profile.travel?.lengthOfStay?.value) missingFields.push('travel.lengthOfStay');
    if (!profile.travel?.usAddress) missingFields.push('travel.usAddress');
    if (!profile.payingForTrip) missingFields.push('travel.payingForTrip');
    // Passport
    if (!profile.passport?.number) missingFields.push('passport.number');
    // Contact
    if (!profile.phone) missingFields.push('addressPhone.phone');
    if (!profile.email) missingFields.push('addressPhone.email');

    if (missingFields.length > 0) {
        console.warn(`[Filler]   DADOS FALTANTES (${missingFields.length}): ${missingFields.join(', ')}`);
        return {
            success: false,
            error: `Dados faltantes no formul¡rio: ${missingFields.join(', ')}`,
            cause: 'missing_data',
            missingFields
        };
    }

    let browser, page;
    const visited = []; // Declared outside try so catch can access it

    try {
        if (existingBrowser) {
            // Reuse existing browser instance
            browser = existingBrowser;
            try {
                // Check if browser is still connected
                const contexts = browser.contexts();
                if (contexts.length > 0 && existingPage && !existingPage.isClosed()) {
                    // Reuse existing page
                    page = existingPage;
                    console.log('[Filler] Reutilizando browser e p¡gina existentes');
                } else {
                    // Browser alive but page gone ƒ¢aa create new page
                    const ctx = contexts[0] || await browser.newContext({ viewport: { width: 1280, height: 900 } });
                    page = await ctx.newPage();
                    page.setDefaultTimeout(15000);
                    page.setDefaultNavigationTimeout(30000);
                    page.on('dialog', async d => d.accept().catch(() => { }));
                    console.log('[Filler] Reutilizando browser, nova p¡gina');
                }
            } catch {
                // Browser crashed ƒ¢aa create new one
                existingBrowser = null;
                browser = null;
            }
        }

        if (!browser) {
            // ══════════════════════════════════════════════════
            // STEALTH BROWSER SETUP — professional anti-detect
            // 1 user = 1 IP = 1 session throughout entire flow
            // ══════════════════════════════════════════════════
            const isHeadless = process.env.HEADLESS !== 'false';

            // ── PROXY (centralised via proxy-helper) ──
            const { buildProxyOpts } = require('./helpers/proxy-helper');
            const proxyUrl = config.proxy_url || process.env.PROXY_URL || null;
            const proxyOpts = proxyUrl
                ? buildProxyOpts(proxyUrl, {
                    countries: config.proxy_countries || 'us,br',
                    sessionId: config.session_id || `ds160_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                })
                : undefined;

            // ── IDENTITY (randomized per session — reduces fingerprint patterns) ──
            const useUsLocale = proxyUrl && (proxyUrl.includes('__cr.us') || config.proxy_countries?.includes('us'));

            // Random screen resolution from common real-world desktop sizes
            const COMMON_RESOLUTIONS = [
                { width: 1920, height: 1080 },
                { width: 1366, height: 768 },
                { width: 1536, height: 864 },
                { width: 1440, height: 900 },
                { width: 1280, height: 720 },
                { width: 1600, height: 900 },
            ];
            const screenRes = COMMON_RESOLUTIONS[Math.floor(Math.random() * COMMON_RESOLUTIONS.length)];

            // Geolocation with noise (±0.05° ~5km radius) — avoid exact same coords every time
            const baseGeo = useUsLocale
                ? { latitude: 40.7128, longitude: -74.0060 }   // NYC area
                : { latitude: -23.5505, longitude: -46.6333 }; // São Paulo
            const geoNoise = () => (Math.random() - 0.5) * 0.1; // ±0.05°
            const geo = {
                latitude: baseGeo.latitude + geoNoise(),
                longitude: baseGeo.longitude + geoNoise(),
            };

            // Random UA from expanded pool (Chrome 70%, Edge 20%, Firefox 10%)
            // Different browser brands prevent fingerprint clustering
            const CHROME_MAJORS = [131, 132, 133, 134];
            const pickMajor = () => CHROME_MAJORS[Math.floor(Math.random() * CHROME_MAJORS.length)];
            const pickBuild = () => Math.floor(Math.random() * 200); // minor build variation
            const UA_POOL = [
                // Chrome (Windows) — most common
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
                // Edge (Windows) — shares Chromium base
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36 Edg/${pickMajor()}.0.${2800 + pickBuild()}.${pickBuild()}`,
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36 Edg/${pickMajor()}.0.${2800 + pickBuild()}.${pickBuild()}`,
                // Firefox (Windows) — different engine
                () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${115 + Math.floor(Math.random() * 10)}.0) Gecko/20100101 Firefox/${115 + Math.floor(Math.random() * 10)}.0`,
            ];
            const generatedUA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)]();

            const identity = {
                userAgent: generatedUA,
                locale: useUsLocale ? 'en-US' : 'pt-BR',
                timezoneId: useUsLocale ? 'America/New_York' : 'America/Sao_Paulo',
                geolocation: geo,
                screenRes,
            };
            console.log(`[Filler] Identity: ${generatedUA.includes('Edg/') ? 'Edge' : generatedUA.includes('Firefox') ? 'Firefox' : 'Chrome'}, ${screenRes.width}x${screenRes.height}, tz=${identity.timezoneId}`);

            // ── LAUNCH ARGS (anti-automation + anti-throttling + anti-datacenter) ──
            const launchArgs = [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                `--window-size=${screenRes.width},${screenRes.height}`,
                '--start-maximized',
                // Anti-throttling: prevent Chrome from throttling background tabs/timers
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-ipc-flooding-protection',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                // WebRTC leak prevention — blocks datacenter IP from leaking
                '--enforce-webrtc-ip-permission-check',
                '--disable-webrtc-hw-decoding',
                '--disable-webrtc-hw-encoding',
                // Force WebRTC to only use the proxy IP (no direct connection)
                '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
            ];

            // ── BROWSER + CONTEXT (playwright-extra compatible) ──
            const storageStatePath = path.join(TMP, 'storage-state.json');
            const hasStorageState = fs.existsSync(storageStatePath);

            const launchOpts = {
                headless: isHeadless,
                channel: 'chrome',  // Chrome real: correct fingerprint (plugins, chrome.app, WebGL)
                // patchright CDP patches operate at protocol level, work with any channel
                args: launchArgs,
            };
            if (proxyOpts) launchOpts.proxy = proxyOpts;

            browser = await chromium.launch(launchOpts);

            const contextOpts = {
                viewport: { width: screenRes.width, height: screenRes.height },
                screen: { width: screenRes.width, height: screenRes.height },
                // With channel:'chrome', let Chrome send its OWN real UA (avoids version mismatch)
                // Only override when using bundled Chromium (no channel) e.g. in Docker
                ...(isHeadless ? { userAgent: identity.userAgent } : {}),
                locale: identity.locale,
                timezoneId: identity.timezoneId,
                geolocation: identity.geolocation,
                permissions: ['geolocation'],
                colorScheme: 'light',
                // Randomize deviceScaleFactor (most desktops = 1, some HiDPI = 1.25 or 1.5)
                deviceScaleFactor: [1, 1, 1, 1.25][Math.floor(Math.random() * 4)],
                isMobile: false,
                hasTouch: false,
                javaScriptEnabled: true,
                bypassCSP: true,  // Allow stealth script injection
                ignoreHTTPSErrors: true,
                // HTTP headers that TSPD/Akamai checks — must match real browser
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
            };

            // Restore session from previous attempt if available
            // IMPORTANT: Clean up cookies that may be bot-flagged before restoring
            if (hasStorageState) {
                try {
                    const savedState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'));
                    // Filter out cookies that anti-bot systems use to mark bots
                    // Keep only safe CEAC session cookies
                    const BOT_COOKIE_PATTERNS = [
                        /^TS/i,           // F5/TSPD tracking cookies
                        /^TSPD/i,         // F5 bot detection
                        /^_abck/i,        // Akamai bot manager
                        /^bm_/i,          // Akamai bot cookies
                        /^ak_bmsc/i,      // Akamai
                        /^__cf_/i,        // Cloudflare
                        /^cf_/i,          // Cloudflare
                        /^datadome/i,     // DataDome
                        /^_px/i,          // PerimeterX
                        /^reese84/i,      // Imperva/Reese84
                    ];
                    if (savedState.cookies) {
                        const before = savedState.cookies.length;
                        savedState.cookies = savedState.cookies.filter(cookie => {
                            return !BOT_COOKIE_PATTERNS.some(pattern => pattern.test(cookie.name));
                        });
                        const removed = before - savedState.cookies.length;
                        if (removed > 0) {
                            console.log(`[Filler] 🧹 Removed ${removed} bot-tracking cookies from storageState`);
                        }
                    }
                    contextOpts.storageState = savedState;
                    console.log('[Filler] 🍪 Restored storageState from previous session');
                } catch (e) {
                    console.warn('[Filler] Could not restore storageState:', e.message);
                }
            }

            const context = await browser.newContext(contextOpts);

            // ── ANTI-DATACENTER STEALTH SCRIPTS ──
            // Injected before any page loads — hides VM/server fingerprints
            await context.addInitScript(() => {
                // 1) WebGL Renderer — datacenter VMs often show "SwiftShader" or "llvmpipe"
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(param) {
                    if (param === 37445) return 'Google Inc. (NVIDIA)'; // UNMASKED_VENDOR_WEBGL
                    if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)';
                    return getParameter.call(this, param);
                };
                if (typeof WebGL2RenderingContext !== 'undefined') {
                    const getParam2 = WebGL2RenderingContext.prototype.getParameter;
                    WebGL2RenderingContext.prototype.getParameter = function(param) {
                        if (param === 37445) return 'Google Inc. (NVIDIA)';
                        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)';
                        return getParam2.call(this, param);
                    };
                }

                // 2) Hardware concurrency — servers have 8-64 cores, real PCs have 4-8
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => [4, 6, 8][Math.floor(Math.random() * 3)] });

                // 3) Device memory — cap at realistic values (servers may report 16-128GB)
                Object.defineProperty(navigator, 'deviceMemory', { get: () => [4, 8][Math.floor(Math.random() * 2)] });

                // 4) Connection type — datacenter has "ethernet" at huge bandwidth
                if (navigator.connection) {
                    Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
                    Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 + Math.floor(Math.random() * 100) });
                    Object.defineProperty(navigator.connection, 'downlink', { get: () => 5 + Math.random() * 15 });
                }

                // 5) Platform — ensure Windows (match UA)
                Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

                // 6) Plugins — empty plugin array is a bot signal; add common ones
                Object.defineProperty(navigator, 'plugins', {
                    get: () => {
                        const arr = [
                            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                        ];
                        arr.item = (i) => arr[i];
                        arr.namedItem = (n) => arr.find(p => p.name === n);
                        arr.refresh = () => {};
                        return arr;
                    }
                });

                // 7) Canvas noise injection — breaks deterministic fingerprint
                //    Adds ±1 LSB to RGB channels (imperceptible but unique per session)
                const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
                CanvasRenderingContext2D.prototype.getImageData = function(...args) {
                    const imageData = origGetImageData.apply(this, args);
                    const data = imageData.data;
                    // Only inject noise on small canvases (fingerprint probes are small)
                    if (data.length < 500000) {
                        for (let i = 0; i < data.length; i += 4) {
                            const noise = Math.random() < 0.5 ? 1 : -1;
                            data[i]   = (data[i]   + noise) & 0xFF; // R
                            data[i+1] = (data[i+1] + noise) & 0xFF; // G
                            data[i+2] = (data[i+2] + noise) & 0xFF; // B
                        }
                    }
                    return imageData;
                };
                // Also spoof toDataURL and toBlob for canvas fingerprint
                const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(type) {
                    if (this.width < 400 && this.height < 400) {
                        const ctx = this.getContext('2d');
                        if (ctx) {
                            const img = origGetImageData.call(ctx, 0, 0, this.width, this.height);
                            const d = img.data;
                            for (let i = 0; i < d.length; i += 4) {
                                d[i] = (d[i] + (Math.random() < 0.5 ? 1 : -1)) & 0xFF;
                            }
                            ctx.putImageData(img, 0, 0);
                        }
                    }
                    return origToDataURL.apply(this, arguments);
                };

                // 8) WebRTC JS leak prevention — strip ICE candidates that expose real IP
                if (typeof RTCPeerConnection !== 'undefined') {
                    const OrigRTC = RTCPeerConnection;
                    window.RTCPeerConnection = function(config, constraints) {
                        // Force relay-only (through proxy) if TURN servers exist
                        if (config && config.iceServers) {
                            config.iceTransportPolicy = 'relay';
                        }
                        const pc = new OrigRTC(config, constraints);
                        // Strip local IP candidates from SDP
                        const origCreateOffer = pc.createOffer.bind(pc);
                        pc.createOffer = function(opts) {
                            return origCreateOffer(opts).then(offer => {
                                if (offer && offer.sdp) {
                                    offer.sdp = offer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                                }
                                return offer;
                            });
                        };
                        const origCreateAnswer = pc.createAnswer.bind(pc);
                        pc.createAnswer = function(opts) {
                            return origCreateAnswer(opts).then(answer => {
                                if (answer && answer.sdp) {
                                    answer.sdp = answer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                                }
                                return answer;
                            });
                        };
                        return pc;
                    };
                    window.RTCPeerConnection.prototype = OrigRTC.prototype;
                    if (window.webkitRTCPeerConnection) {
                        window.webkitRTCPeerConnection = window.RTCPeerConnection;
                    }
                }

                // 9) AudioContext fingerprint noise — adds tiny noise to analyser data
                if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                    const AudioCtor = window.AudioContext || window.webkitAudioContext;
                    const origCreateAnalyser = AudioCtor.prototype.createAnalyser;
                    AudioCtor.prototype.createAnalyser = function() {
                        const analyser = origCreateAnalyser.apply(this, arguments);
                        const origGetFloat = analyser.getFloatFrequencyData.bind(analyser);
                        analyser.getFloatFrequencyData = function(array) {
                            origGetFloat(array);
                            for (let i = 0; i < array.length; i++) {
                                array[i] += (Math.random() - 0.5) * 0.01;
                            }
                        };
                        return analyser;
                    };
                    // Also noise on createOscillator destination
                    const origCreateOsc = AudioCtor.prototype.createOscillator;
                    AudioCtor.prototype.createOscillator = function() {
                        const osc = origCreateOsc.apply(this, arguments);
                        // Tiny detune variation — breaks deterministic audio fingerprint
                        const origDetune = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'detune');
                        if (origDetune && origDetune.get) {
                            const origDetuneValue = osc.detune;
                            if (origDetuneValue && origDetuneValue.value !== undefined) {
                                origDetuneValue.value += (Math.random() - 0.5) * 0.001;
                            }
                        }
                        return osc;
                    };
                }

                // 10) window.chrome object — headless Chrome lacks this, detection signal
                if (!window.chrome) {
                    window.chrome = {};
                }
                if (!window.chrome.runtime) {
                    window.chrome.runtime = {
                        connect: () => {},
                        sendMessage: () => {},
                        onMessage: { addListener: () => {}, removeListener: () => {} },
                        id: undefined,
                    };
                }
                window.chrome.loadTimes = window.chrome.loadTimes || function() {
                    return { commitLoadTime: Date.now() / 1000, connectionInfo: 'http/1.1' };
                };
                window.chrome.csi = window.chrome.csi || function() {
                    return { startE: Date.now(), onloadT: Date.now() + 300 };
                };
                window.chrome.app = window.chrome.app || {
                    isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed' },
                    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run' },
                };
            });

            page = await context.newPage();
            page.setDefaultTimeout(proxyUrl ? 60000 : 15000);
            page.setDefaultNavigationTimeout(proxyUrl ? 90000 : 30000);
            page.on('dialog', async d => d.accept().catch(() => { }));

            // Save session state periodically (for retry resilience)
            browser._saveSession = async () => {
                try {
                    const state = await context.storageState();
                    fs.writeFileSync(storageStatePath, JSON.stringify(state));
                } catch { /* ignore errors during save */ }
            };

            console.log(`[Filler] Novo browser criado (headless=${isHeadless}, proxy=${!!proxyUrl}, video=true)`);
        }

        // =============================================================
        // SMART SESSION DETECTION ƒ¢aa decide best action
        // =============================================================
        let skipToFilling = false;  // Skip Landing/Captcha/Security, go straight to fill loop
        let useRetrieve = false;    // Use "Retrieve Application" instead of "Start New"

        if (existingPage && page === existingPage) {
            const currentUrl = page.url();
            const currentPageName = identifyPage(currentUrl);
            console.log(`[Filler] a Sessao existente detectada ƒ¢aa URL: ${currentUrl}, P¡gina: ${currentPageName}`);

            // Scenario A: Already at Review/Confirmation ƒ¢a a mark as done immediately
            if (currentPageName === 'Review' || currentPageName === 'Confirmation') {
                console.log(`[Filler] a Sessao j¡ est¡ no ${currentPageName} ƒ¢aa marcando como conclu­do`);
                // Try to capture application_id from page
                const headerAppId = await page.locator("span[id$='_lblAppID'], span[id$='_lblBarcode']").first().innerText().catch(() => '');
                const appMatch = headerAppId.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
                if (appMatch) application.application_id = appMatch[0];
                return { success: true, applicationId: application.application_id || null, browser, activePage: page };
            }

            // Scenario B: Active form page ƒ¢a a continue from where we left off
            const isTimedOut = currentUrl.includes('TimedOut') || currentUrl.includes('SessionTimedOut');
            const isOnLanding = currentUrl.includes('Default.aspx');
            let sessionExpired = isTimedOut;

            // If on SessionTimedOut page, click OK to dismiss and go back to Landing
            if (isTimedOut) {
                console.log('[Filler]  Session timeout detectado ƒ¢aa clicando OK para voltar ao Landing');
                const okBtn = page.getByRole('button', { name: 'OK' });
                if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await okBtn.click();
                    await page.waitForLoadState('domcontentloaded').catch(() => { });
                    await waitForPageReady(page);
                    console.log('[Filler] a OK clicado, redirecionado para:', page.url());
                }
            }

            if (!isTimedOut && !isOnLanding) {
                // Check page text for session expiry indicators
                const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
                sessionExpired = /timeout|session.*expired|timed out|idle.*too long/i.test(bodyText);
            }

            if (!sessionExpired && !isOnLanding && currentPageName !== 'Unknown' && currentPageName !== 'Landing') {
                console.log(`[Filler] ƒ¢aâ€ž Sessao ativa na p¡gina: ${currentPageName} ƒ¢aa continuando preenchimento`);
                skipToFilling = true;
                await waitForPageReady(page);
            }
            // Scenario C: Session expired/Landing BUT we have an application_id ƒ¢a a use Retrieve
            else if (application.application_id) {
                console.log(`[Filler] aa Sessao expirada mas app_id existe (${application.application_id}) ƒ¢aa usando Retrieve Application`);
                useRetrieve = true;
            }
            // Scenario D: No app_id ƒ¢a a start fresh
            else {
                console.log(`[Filler] a a Sem app_id ƒ¢aa iniciando nova aplica§£o`);
            }
        }
        // No existing page but we have an app_id ƒ¢a a also use Retrieve
        else if (application.application_id) {
            console.log(`[Filler] aa Novo browser mas app_id existe (${application.application_id}) ƒ¢aa usando Retrieve Application`);
            useRetrieve = true;
        }

        if (!skipToFilling) {
            // Navigate to DS-160 Landing with retry + fallback
            const DS160_URL = 'https://ceac.state.gov/GenNIV/Default.aspx';
            let navSuccess = false;
            const MAX_NAV_RETRIES = 3;

            for (let navAttempt = 1; navAttempt <= MAX_NAV_RETRIES; navAttempt++) {
                try {
                    const navTimeout = proxyUrl ? 60000 + (navAttempt * 15000) : 30000; // Progressive timeout
                    console.log(`[Filler] 🌐 Navegando para DS-160 (tentativa ${navAttempt}/${MAX_NAV_RETRIES}, timeout=${navTimeout/1000}s)...`);
                    await page.goto(DS160_URL, { waitUntil: 'domcontentloaded', timeout: navTimeout });
                    await waitForPageReady(page);

                    // Check if we got a real page (not just TSPD JS challenge with no content)
                    const hasContent = await page.locator('form, input, select, #ctl00_SiteContentPlaceHolder_ucLocation_ddlLocation').first()
                        .isVisible({ timeout: 5000 }).catch(() => false);
                    const hasTSPDChallenge = await page.locator('input#ans').isVisible({ timeout: 2000 }).catch(() => false);

                    if (hasContent || hasTSPDChallenge) {
                        navSuccess = true;
                        console.log(`[Filler] ✅ DS-160 carregado ${hasTSPDChallenge ? '(TSPD challenge)' : '(form ok)'}`);
                        break;
                    }

                    // Page loaded but no useful content — might be blocked
                    const bodyHtml = await page.content().catch(() => '');
                    if (bodyHtml.includes('/TSPD/') && !bodyHtml.includes('<form')) {
                        console.log(`[Filler] ⚠️ TSPD JS-only page (sem form) — aguardando resolução automática...`);
                        await sleep(5000);
                        // Check again after wait
                        const hasContentNow = await page.locator('form, input#ans').first()
                            .isVisible({ timeout: 5000 }).catch(() => false);
                        if (hasContentNow) {
                            navSuccess = true;
                            console.log('[Filler] ✅ TSPD resolvido automaticamente');
                            break;
                        }
                    }

                    console.warn(`[Filler] Navegação ${navAttempt}/${MAX_NAV_RETRIES} — página sem conteúdo útil`);
                } catch (e) {
                    console.warn(`[Filler] Navegação ${navAttempt}/${MAX_NAV_RETRIES} falhou: ${e.message}`);
                }

                if (navAttempt < MAX_NAV_RETRIES) {
                    const retryDelay = 5000 + navAttempt * 5000; // 10s, 15s
                    console.log(`[Filler] ⏳ Aguardando ${retryDelay/1000}s antes de retry...`);
                    await sleep(retryDelay);
                }
            }

            // Fallback: try without proxy if all proxy attempts failed
            if (!navSuccess && proxyUrl) {
                console.log('[Filler] 🔄 Todas as tentativas com proxy falharam — tentando conexão direta...');
                try {
                    await browser.close();
                } catch {}

                // Relaunch without proxy
                const directLaunchArgs = launchArgs.filter(a => !a.includes('proxy'));
                browser = await chromium.launch({
                    headless: isHeadless,
                    args: directLaunchArgs,
                });
                const directContext = await browser.newContext({
                    ...contextOpts,
                    proxy: undefined,
                });
                page = await directContext.newPage();
                page.setDefaultTimeout(15000);
                page.setDefaultNavigationTimeout(30000);
                page.on('dialog', async d => d.accept().catch(() => {}));

                console.log('[Filler] 🌐 Navegando sem proxy...');
                await page.goto(DS160_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await waitForPageReady(page);
                navSuccess = true;
                console.log('[Filler] ✅ DS-160 carregado via conexão direta');
            }

            if (!navSuccess) {
                throw new Error('Falha ao carregar DS-160 após todas as tentativas (proxy + direto)');
            }

            // ── TSPD/F5 Anti-Bot Challenge Detection ──
            // CEAC exibe challenge anti-bot antes do DS-160 real.
            // Após resolver, os cookies de bypass são setados — precisamos renavegar
            // para obter uma sessão ASP.NET fresca no DS-160.
            const isTSPD = await page.locator('input#ans').isVisible({ timeout: 3000 }).catch(() => false);
            if (isTSPD) {
                console.log('[Filler] ⚠️ TSPD Anti-Bot Challenge detectado');
                let tspdSolved = false;
                const MAX_TSPD = 10;
                for (let tspd = 1; tspd <= MAX_TSPD; tspd++) {
                    try {
                        const captchaImg = page.locator('img[src^="data:image"]').first();
                        await captchaImg.waitFor({ state: 'visible', timeout: 5000 });
                        const imgPath = path.join(TMP, 'tspd_captcha.png');
                        await captchaImg.screenshot({ path: imgPath });

                        const keys = { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key };
                        const answer = await solveCaptcha(imgPath, captchaMode, keys);
                        console.log(`[Filler] TSPD Captcha answer (${tspd}/${MAX_TSPD}): ${answer}`);

                        await page.locator('input#ans').fill(answer);
                        await humanDelay(300, 800); // Human-like pause before clicking
                        await page.locator('button#jar').click();
                        await sleep(2000 + tspd * 1000); // Backoff progressivo: 3s, 4s, ..., 12s

                        const stillTSPD = await page.locator('input#ans').isVisible({ timeout: 3000 }).catch(() => false);
                        if (!stillTSPD) {
                            tspdSolved = true;
                            console.log('[Filler] ✅ TSPD Challenge resolvido — cookies de bypass setados');
                            break;
                        }
                        console.warn(`[Filler] TSPD tentativa ${tspd}/${MAX_TSPD} falhou — retentando`);
                    } catch (e) {
                        console.warn(`[Filler] TSPD attempt ${tspd}/${MAX_TSPD} error: ${e.message}`);
                    }
                    await sleep(1500);
                }

                if (tspdSolved) {
                    // Renavegar para obter sessão ASP.NET fresca
                    // Os cookies TSPD já foram setados, então não vai mostrar challenge de novo
                    console.log('[Filler] 🔄 Renavegando para DS-160 com sessão fresca...');
                    await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await waitForPageReady(page);
                    console.log('[Filler] ✅ DS-160 carregado com sessão fresca');
                } else {
                    throw new Error(`TSPD Anti-Bot Challenge não resolvido após ${MAX_TSPD} tentativas`);
                }
            }
        }

        if (!skipToFilling) {
            // ============================================================
            // STEP 1: Landing page
            // Flow: 1) Location → 2) Wait loading → 3) Modal check → 4) Captcha → 5) Click Start/Retrieve
            // ============================================================
            onPage('Landing');
            const location = profile.location;

            // ── HUMAN WARM-UP: simulate real person arriving on page ──
            // Anti-bot (TSPD) watches the first seconds VERY closely.
            // A bot goes straight to form fields; a human looks around first.
            console.log('[Landing] 👤 Human warm-up: simulating page reading...');

            // 1) Initial "reading" pause — human scans the page visually (2-5s)
            await humanDelay(2000, 5000);

            // 2) Random mouse movements — simulate eyes scanning page
            const viewport = page.viewportSize() || { width: 1280, height: 900 };
            for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
                const x = 100 + Math.floor(Math.random() * (viewport.width - 200));
                const y = 80 + Math.floor(Math.random() * (viewport.height * 0.6));
                await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 15) });
                await humanDelay(200, 600);
            }

            // 3) Small exploratory scroll down and back (looking at form)
            await page.mouse.wheel(0, 80 + Math.floor(Math.random() * 120));
            await humanDelay(500, 1200);
            await page.mouse.wheel(0, -(40 + Math.floor(Math.random() * 60)));
            await humanDelay(300, 800);

            // 4) Thinking pause before first interaction
            await thinkingPause();
            console.log('[Landing] 👤 Warm-up complete — starting form interaction');

            // ─── 1) SELECT LOCATION ───
            const locSelect = page.locator("select[id$='_ddlLocation']");
            if (await locSelect.isVisible().catch(() => false)) {
                await humanSelect(page, locSelect, location);
                // ASP.NET precisa do change event para disparar postback e carregar captcha
                await locSelect.dispatchEvent('change');
                console.log(`[Landing] 1/5 Location selected: ${location}`);
            }

            // ƒ¢aaaa 2) WAIT FOR LOADING (postback after location change) ƒ¢aaaa
            await waitForPostback(page);
            await waitForPageReady(page);
            console.log('[Landing] 2/5 Page loaded after location select');

            // ƒ¢aaaa 3) CHECK & CLOSE MODAL (if present) ƒ¢aaaa
            // Some locations (e.g. RCF/Recife) show "Additional Location Information" modal.
            // MUST click Close (triggering postback) to keep ASP.NET session state consistent.
            // DOM-only hide causes "Session expired" because server state becomes stale.
            let modalDismissed = false;
            try {
                await page.waitForSelector('.modalBackground', { state: 'visible', timeout: 5000 });
                console.log('[Landing] 3/5 Modal detected ƒ¢aa clicking Close (postback)...');
                const closeBtn = page.locator('[id*="lnkClose"]').first();
                if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await humanClick(page, closeBtn);
                }
                // Wait for postback from Close to complete and page to stabilize
                await page.waitForSelector('.modalBackground', { state: 'hidden', timeout: 10000 }).catch(() => { });
                await waitForPageReady(page);
                modalDismissed = true;
                console.log('[Landing] 3/5 Modal closed via postback ƒ¢aa page stable, new captcha ready');
            } catch {
                // No modal appeared within timeout ƒ¢aa that's fine
                console.log('[Landing] 3/5 No modal ƒ¢aa skipping');
            }

            // ƒ¢aaaa 4) SOLVE CAPTCHA            // ── ── 4) SOLVE CAPTCHA ── ──
            // At this point page is fully stable, no modal, captcha image is ready
            const captchaStartTime = Date.now();
            console.log(`[TIMING] Captcha phase started at: ${new Date().toISOString()}`);
            let landingPassed = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const keys = { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key };

                    // Wait for captcha image to be visible and stable
                    const imgEl = page.locator("img[id$='_CaptchaImage'], img[src*='captcha'], img[id$='c_default_ctl00_sitecontentplaceholder_uclocation_identifycaptcha1_captchaimage']").first();
                    await imgEl.waitFor({ state: 'visible', timeout: 10000 });
                    await sleep(300); // Brief pause for image to fully render

                    const imgPath = path.join(TMP, 'captcha.png');
                    await imgEl.screenshot({ path: imgPath });
                    const answer = await solveCaptcha(imgPath, captchaMode, keys);

                    const captchaSolveMs = Date.now() - captchaStartTime;
                    console.log(`[Landing] 4/5 Captcha answer (attempt ${attempt}): ${answer} [solved in ${captchaSolveMs}ms = ${(captchaSolveMs/1000).toFixed(1)}s]`);

                    const input = page.locator("input[id$='_txtCodeTextBox']").first();
                    await humanType(page, input, answer);  // human-like typing fires proper keyboard events
                } catch (e) {
                    console.warn(`[Landing] 4/5 Captcha attempt ${attempt} failed:`, e.message);
                    if (attempt < 3) { await sleep(1000); continue; }
                    return { success: false, error: 'Captcha nao resolvido apos 3 tentativas', cause: 'captcha_failed', browser, activePage: page };
                }

                // ƒ¢aaaa 4.5) PRE-CLICK: dismiss any modal that reappeared ƒ¢aaaa
                // Safety net: hide modal via DOM if it showed up during captcha solve
                const preclickDismissed = await page.evaluate(() => {
                    const bg = document.querySelector('.modalBackground');
                    if (!bg || bg.style.display === 'none') return false;
                    const rect = bg.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return false;
                    bg.style.display = 'none';
                    const fg = bg.previousElementSibling || document.querySelector('[id*="modalConfirm_foregroundElement"]');
                    if (fg) fg.style.display = 'none';
                    return true;
                });
                if (preclickDismissed) {
                    console.log('[Landing] 4.5 Modal hidden via DOM before click');
                }

                // ƒ¢aaaa 5) CLICK START or RETRIEVE ƒ¢aaaa
                if (useRetrieve) {
                    console.log(`[Landing] 5/5 Retrieve Application: ${application.application_id}`);

                    // Fill Application ID
                    const appIdInput = page.locator("input[id$='_tbxApplicationID']").first();
                    if (await appIdInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await humanType(page, appIdInput, application.application_id);
                    }

                    // Fill security answer
                    const secAnswerInput = page.locator("input[id$='_txtAnswer']").first();
                    if (await secAnswerInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                        const secAnswer = config.security_answer || profile.securityAnswer || '';
                        await humanType(page, secAnswerInput, secAnswer);
                    }

                    // Click Retrieve
                    const retrieveBtn = page.locator("a[id$='_lnkRetrieve'], input[id$='_btnRetrieve']").first();
                    const urlBefore = page.url();
                    await humanClick(page, retrieveBtn);
                    await sleep(2000);
                    await waitForPageReady(page);

                    const currentUrl = page.url();
                    if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
                        throw new Error('Session expired after clicking Retrieve');
                    }

                    const validationError = page.locator('[id*="ValidationSummary"]').first();
                    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
                    const stillOnLanding = currentUrl.includes('Default.aspx');

                    if (hasError || stillOnLanding) {
                        console.warn(`[Landing] 5/5 Retrieve failed (attempt ${attempt}) ƒ¢aa captcha wrong or invalid app_id`);
                        if (attempt < 3) { await sleep(1000); continue; }
                        console.log('[Landing] Retrieve falhou 3x ƒ¢aa tentando Start New como fallback');
                        useRetrieve = false;
                        continue;
                    }

                    console.log(`[Landing] 5/5 ✓ Retrieve successful`);
                    landingPassed = true;
                    // Save session after successful retrieve (critical checkpoint)
                    if (browser._saveSession) await browser._saveSession();
                    break;
                } else {
                    console.log(`[Landing] 5/5 Start New Application`);
                    const startBtn = page.locator("a[id$='_lnkNew']").first();
                    const box = await startBtn.boundingBox();
                    if (box) {
                        const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
                        const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
                        await page.mouse.move(targetX, targetY, { steps: 10 + Math.floor(Math.random() * 15) });
                        await page.waitForTimeout(30 + Math.floor(Math.random() * 70));
                        await page.mouse.down();
                        await page.waitForTimeout(20 + Math.floor(Math.random() * 50));
                        await page.mouse.up();
                    } else {
                        await startBtn.click({ timeout: 15000 });
                    }
                    const preClickMs = Date.now() - captchaStartTime;
                    console.log(`[DEBUG] URL before click: ${page.url()} [total elapsed: ${preClickMs}ms = ${(preClickMs/1000).toFixed(1)}s since captcha start]`);
                    await sleep(2000);
                    await waitForPageReady(page);

                    const currentUrl = page.url();
                    console.log(`[DEBUG] URL after click: ${currentUrl}`);
                    if (currentUrl.includes('SessionTimedOut') || currentUrl.includes('TimedOut')) {
                        // Capture page content for debug
                        const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '').catch(() => '');
                        console.log(`[DEBUG] SessionTimedOut body: ${bodyText}`);
                        throw new Error('Session expired after clicking Start');
                    }

                    const validationError = page.locator('[id*="ValidationSummary"]').first();
                    const hasError = await validationError.isVisible({ timeout: 1000 }).catch(() => false);
                    const stillOnLanding = currentUrl.includes('Default.aspx') || (!currentUrl.includes('SecureQuestion') && !currentUrl.includes('ConfirmApplicationID') && !currentUrl.includes('complete_'));

                    if (hasError || stillOnLanding) {
                        console.warn(`[Landing] 5/5 Captcha wrong (attempt ${attempt}) ƒ¢aa page didn't advance`);
                        if (attempt < 3) await sleep(1000);
                        continue;
                    }

                    console.log(`[Landing] 5/5 ✓ Start successful`);
                    landingPassed = true;
                    // Save session after successful start (critical checkpoint)
                    if (browser._saveSession) await browser._saveSession();
                    break;
                }
            } // end for (captcha attempts)
            if (!landingPassed) {
                return { success: false, error: 'Failed to pass Landing after 3 captcha attempts', cause: 'captcha_failed', browser, activePage: page };
            }
            await waitForPageReady(page);

            // ============================================================
            // STEP 2: Security Question Setup
            // ============================================================
            let currentPage = identifyPage(page.url());
            if (currentPage === 'SecurityQuestion') {
                onPage('SecurityQuestion');

                const privacyCheck = page.locator("#ctl00_SiteContentPlaceHolder_chkbxPrivacyAct");
                if (await privacyCheck.isVisible().catch(() => false)) {
                    await privacyCheck.check();
                }

                // Select security question from settings (config.security_question = index from DB)
                const questionSelect = page.locator("select[id$='_ddlQuestions']");
                const isDisabled = await questionSelect.evaluate(el => el.disabled).catch(() => false);
                if (!isDisabled) {
                    const questionIndex = parseInt(config.security_question || '0', 10);
                    await humanSelect(page, questionSelect, { index: questionIndex });
                    // Security answer: config (from settings/dashboard) takes priority, profile as fallback
                    const secAnswer = config.security_answer || profile.securityAnswer || '';
                    await humanType(page, page.locator("input[id$='_txtAnswer']"), secAnswer);
                } else {
                    console.log('[Filler] Security question already set (disabled) ƒ¢aa skipping');
                    // Still fill answer if input is enabled
                    const answerInput = page.locator("input[id$='_txtAnswer']");
                    const answerDisabled = await answerInput.evaluate(el => el.disabled).catch(() => true);
                    if (!answerDisabled) {
                        const secAnswer = config.security_answer || profile.securityAnswer || '';
                        await humanType(page, answerInput, secAnswer);
                    }
                }

                const urlBefore = page.url();
                // Try Continue button (only if enabled), then Next
                const continueBtn377 = page.locator("input[id$='_btnContinue']:not([disabled])");
                const nextBtn = page.locator("input[type='submit'][value*='Next']:not([disabled])").first();
                if (await continueBtn377.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await humanClick(page, continueBtn377);
                } else if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await humanClick(page, nextBtn);
                } else {
                    // Last resort: force-click any submit button that exists
                    const anySubmit = page.locator("input[type='submit']:not([disabled])").first();
                    if (await anySubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await humanClick(page, anySubmit);
                    }
                }
                await waitForUrlChange(page, urlBefore);
                await waitForPageReady(page);

                // Confirm Application ID page
                const continueBtn = page.locator("input[id$='_btnContinueApp']");
                if (await continueBtn.isVisible().catch(() => false)) {
                    // Capture application ID
                    const appIdText = await page.locator("span[id$='_lblAppID'], b").first().innerText().catch(() => '');
                    const appIdMatch = appIdText.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
                    if (appIdMatch) {
                        application.application_id = appIdMatch[0];
                        console.log(`[Filler] Application ID: ${appIdMatch[0]}`);
                        if (typeof onAppId === 'function') onAppId(appIdMatch[0]);
                    }

                    const urlBefore2 = page.url();
                    await humanClick(page, continueBtn);
                    await waitForUrlChange(page, urlBefore2);
                    await waitForPageReady(page);
                }
            }
        } // end if (!skipToFilling)

        // ============================================================
        // STEP 3: Fill all pages until Review
        // ============================================================
        let pageCount = 0;
        const MAX_PAGES = 30;
        let lastUrl = '';
        let stuckCount = 0;

        while (pageCount < MAX_PAGES) {
            pageCount++;
            const url = page.url();
            const pageName = identifyPage(url);

            if (isFinalPage(pageName)) {
                visited.push(pageName);
                onPage(pageName);
                break;
            }

            if (url === lastUrl) {
                stuckCount++;
                if (stuckCount >= 2) {
                    const { navigated } = await clickNextAndWait(page);
                    if (!navigated) break;
                    stuckCount = 0;
                    continue;
                }
            } else {
                stuckCount = 0;
            }
            lastUrl = url;

            onPage(pageName);
            visited.push(pageName);

            // Capture application_id ƒ¢aa the ID format is AA00XXXXXX (2 letters + 8+ alphanumeric)
            // e.g. AA00FCUFGX ƒ¢aa contains LETTERS after the initial prefix, NOT just digits!
            if (!application.application_id) {
                // Strategy 0: #content-main ƒ¢aa the Application ID is visible on EVERY DS-160 page
                try {
                    const contentMain = page.locator('#content-main');
                    const mainText = await contentMain.innerText({ timeout: 2000 }).catch(() => '');
                    const contentMatch = mainText.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{6,})\b/);
                    if (contentMatch) {
                        application.application_id = contentMatch[1];
                        console.log(`[Filler] a a Application ID (from #content-main): ${contentMatch[1]}`);
                        if (typeof onAppId === 'function') onAppId(contentMatch[1]);
                    }
                } catch { }

                // Strategy 1: Header selectors (Application bar at top of DS-160 pages)
                if (!application.application_id) {
                    const headerSelectors = [
                        "span[id$='_lblAppID']",
                        "span[id$='_lblBarcode']",
                        "span[id*='AppID']",
                        "span[id*='Barcode']",
                        "#ctl00_ucApplicationBar_lblAppID",
                        "#ctl00_ucApplicationBar_lblBarcode",
                        "[id*='ucApplicationBar'] span",
                        "[id*='pnlAppID'] span",
                    ];
                    for (const sel of headerSelectors) {
                        if (application.application_id) break;
                        try {
                            const els = await page.locator(sel).all();
                            for (const el of els) {
                                const text = await el.innerText().catch(() => '');
                                const match = text.match(/[A-Z]{2}\d{2}[A-Z0-9]{6,}/);
                                if (match) {
                                    application.application_id = match[0];
                                    console.log(`[Filler] a a Application ID (from header "${sel}"): ${match[0]}`);
                                    if (typeof onAppId === 'function') onAppId(match[0]);
                                    break;
                                }
                            }
                        } catch { }
                    }
                }

                // Strategy 2: URL query parameters or path
                if (!application.application_id) {
                    const urlAppIdMatch = url.match(/[?&](?:c|appId|applicationId)=([A-Z]{2}\d{2}[A-Z0-9]{6,})/i)
                        || url.match(/\/([A-Z]{2}\d{2}[A-Z0-9]{6,})\//);
                    if (urlAppIdMatch) {
                        application.application_id = urlAppIdMatch[1];
                        console.log(`[Filler] a a Application ID (from URL): ${urlAppIdMatch[1]}`);
                        if (typeof onAppId === 'function') onAppId(urlAppIdMatch[1]);
                    }
                }

                // Strategy 3: Full page text search (last resort)
                if (!application.application_id) {
                    try {
                        const bodyText = await page.evaluate(() => {
                            const allText = document.body?.innerText || '';
                            const m = allText.match(/Application\s*(?:ID|Id|id)[:\s]*([A-Z]{2}\d{2}[A-Z0-9]{6,})/i)
                                || allText.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{6,})\b/);
                            return m ? m[1] || m[0] : '';
                        });
                        if (bodyText) {
                            application.application_id = bodyText;
                            console.log(`[Filler] a a Application ID (from page text): ${bodyText}`);
                            if (typeof onAppId === 'function') onAppId(bodyText);
                        }
                    } catch { }
                }
            }

            // ====== RECOVERY PAGE: Retrieve a DS-160 Application ======
            // Phase 1: App ID + Captcha ƒ¢a a click Retrieve
            // Phase 2: App ID (disabled) + Surname (5 letters) + Year of Birth + Security Answer ƒ¢a a click Retrieve
            if (pageName === 'Recovery') {
                console.log(`[Filler] aa Recovery.aspx detectada ƒ¢aa recuperando aplica§£o`);
                onPage('Recovery');

                let recoveryDone = false;
                for (let rAttempt = 1; rAttempt <= 5; rAttempt++) {
                    await waitForPageReady(page);

                    // Detect which phase we're in
                    const surnameField = page.locator("input[id$='_txbSurname']").first();
                    const dobYearField = page.locator("input[id$='_txbDOBYear']").first();
                    const secAnswerField = page.locator("input[id$='_txbAnswer']").first();
                    const captchaImg = page.locator("img[id$='_CaptchaImage'], img[src*='captcha']").first();
                    const appIdInput = page.locator("input[id$='_tbxApplicationID'], input[id*='ApplicationID']").first();

                    const hasSurname = await surnameField.isVisible({ timeout: 1500 }).catch(() => false);
                    const hasCaptcha = await captchaImg.isVisible({ timeout: 1500 }).catch(() => false);

                    if (hasSurname) {
                        // ====== PHASE 2: Security Questions ======
                        console.log(`[Filler] Recovery FASE 2: Security Questions (tentativa ${rAttempt})`);

                        // Surname ƒ¢aa first 5 letters, uppercase
                        const surname5 = (profile.surname || '').substring(0, 5).toUpperCase();
                        await humanType(page, surnameField, surname5);
                        console.log(`[Filler] Recovery: Surname preenchido: ${surname5}`);

                        // Year of Birth
                        if (await dobYearField.isVisible({ timeout: 1000 }).catch(() => false)) {
                            const birthYear = profile.dob?.year || '';
                            await humanType(page, dobYearField, String(birthYear));
                            console.log(`[Filler] Recovery: Year of Birth preenchido: ${birthYear}`);
                        }

                        // Security Answer
                        if (await secAnswerField.isVisible({ timeout: 1000 }).catch(() => false)) {
                            const secAnswer = config.security_answer || profile.securityAnswer || '';
                            await humanType(page, secAnswerField, secAnswer);
                            console.log(`[Filler] Recovery: Security answer preenchido`);
                        }

                    } else if (hasCaptcha) {
                        // ====== PHASE 1: App ID + Captcha ======
                        console.log(`[Filler] Recovery FASE 1: App ID + Captcha (tentativa ${rAttempt})`);

                        // Fill Application ID (only if enabled)
                        if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                            const isEnabled = await appIdInput.isEnabled().catch(() => false);
                            if (isEnabled) {
                                await humanType(page, appIdInput, application.application_id || '');
                                console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                            }
                        }

                        // Solve captcha
                        try {
                            const keys = { capmonsterKey: config.capmonster_key, aiVisionKey: config.ai_vision_key };
                            const imgPath = path.join(TMP, 'captcha_recovery.png');
                            await captchaImg.screenshot({ path: imgPath });
                            const answer = await solveCaptcha(imgPath, captchaMode, keys);
                            console.log(`[Filler] Recovery captcha (attempt ${rAttempt}): ${answer}`);
                            const captchaInput = page.locator("input[id$='_txtCodeTextBox']").first();
                            await captchaInput.fill('');
                            await humanType(page, captchaInput, answer);
                        } catch (e) {
                            console.warn(`[Filler] Recovery captcha error:`, e.message);
                        }

                    } else {
                        // ====== PHASE 1 (sem captcha): apenas App ID ======
                        console.log(`[Filler] Recovery FASE 1: App ID sem captcha (tentativa ${rAttempt})`);
                        if (await appIdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                            const isEnabled = await appIdInput.isEnabled().catch(() => false);
                            if (isEnabled) {
                                await humanType(page, appIdInput, application.application_id || '');
                                console.log(`[Filler] Recovery: App ID preenchido: ${application.application_id}`);
                            }
                        }
                    }

                    // Click Retrieve Application button
                    const retrieveBtn = page.locator("input[id$='_btnRetrieve'], a[id$='_lnkRetrieve'], input[value*='Retrieve']").first();
                    if (await retrieveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await humanClick(page, retrieveBtn);
                        console.log('[Filler] Recovery: clicou Retrieve Application');
                    } else {
                        console.warn('[Filler] Recovery: bot£o Retrieve nao encontrado');
                    }

                    await sleep(3000);
                    await waitForPageReady(page);

                    const newUrl = page.url();
                    if (!newUrl.includes('Recovery.aspx')) {
                        console.log(`[Filler] a Recovery bem-sucedido ƒ¢aa navegou para: ${newUrl}`);
                        recoveryDone = true;
                        break;
                    }

                    // Check for validation errors
                    const errorText = await page.locator('[id*="ValidationSummary"], [id*="lblError"]').first().innerText().catch(() => '');
                    if (errorText) {
                        console.warn(`[Filler] Recovery erro: ${errorText.substring(0, 100)}`);
                    }

                    console.warn(`[Filler] Recovery tentativa ${rAttempt} falhou ƒ¢aa ainda em Recovery.aspx`);
                }

                if (!recoveryDone) {
                    throw new Error('Recovery.aspx: falhou 5x ao tentar recuperar aplica§£o');
                }
                continue; // Re-enter loop to identify the new page
            }

            // Detectar p¡ginas desconhecidas e tentar recovery
            if (pageName === 'Unknown') {
                console.warn(`[Filler]   P¡gina desconhecida: ${url}`);

                // Verificar se © timeout/session expired
                const pageText = await page.locator('body').innerText().catch(() => '');
                const isTimeout = /timeout|session.*expired|timed out|idle/i.test(pageText);
                const isWarning = /warning|continue.*application|recover/i.test(pageText);

                if (isTimeout) {
                    console.warn('[Filler]  Session timeout detectado na p¡gina ƒ¢aa clicando OK');
                    // Try to click OK button to dismiss timeout dialog
                    const okBtn = page.getByRole('button', { name: 'OK' });
                    if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        await okBtn.click();
                        await page.waitForLoadState('domcontentloaded').catch(() => { });
                        await waitForPageReady(page);
                        console.log('[Filler] a OK clicado, redirecionado para:', page.url());
                        continue; // Re-enter loop to handle the new page (Landing)
                    }
                    // If no OK button found, throw
                    console.error('[Filler] a Session expirada sem bot£o OK');
                    throw new Error('Session expired: ' + url);
                }

                if (isWarning) {
                    console.warn('[Filler]   P¡gina de warning ƒ¢aa tentando continuar');
                    // Tentar clicar em botµes de continua§£o/recovery
                    const recoveryBtns = [
                        "input[value*='Continue']",
                        "input[value*='OK']",
                        "input[id*='btnContinue']",
                        "a[id*='Continue']",
                        "input[id*='btnOk']",
                    ];
                    let recovered = false;
                    for (const sel of recoveryBtns) {
                        const btn = page.locator(sel).first();
                        if (await btn.isVisible().catch(() => false)) {
                            console.log(`[Filler] Clicando recovery: ${sel}`);
                            const urlBefore = page.url();
                            await btn.click();
                            await waitForUrlChange(page, urlBefore);
                            recovered = true;
                            break;
                        }
                    }
                    if (recovered) continue;
                }

                // Se chegou aqui, p¡gina desconhecida sem recovery
                console.error(`[Filler] a P¡gina desconhecida sem recovery: ${url}`);
                throw new Error(`Unknown page: ${url}`);
            }

            // Security pages: fill from field-map first (user may have answered "Y"),
            // then default remaining unanswered radios to "No"
            if (isSecurityPage(url)) {
                await waitForPageReady(page);
                // Step 1: Fill any security fields that have actual data from the user's JSON
                await fillPage(page, fieldMap);
                // Step 2: Default remaining unanswered radios to "No"
                let noRadios = page.locator("input[type=radio][id$='_1']");
                let count = await noRadios.count();
                for (let i = 0; i < count; i++) {
                    const radio = noRadios.nth(i);
                    // Only click "No" if neither Yes nor No is already selected
                    const radioName = await radio.getAttribute('name').catch(() => '');
                    if (radioName) {
                        const anyChecked = await page.locator(`input[type=radio][name="${radioName}"]:checked`).count().catch(() => 0);
                        if (anyChecked === 0 && await radio.isVisible().catch(() => false)) {
                            await radio.click();
                        }
                    }
                }
                // Log Security responses summary
                const answeredYes = await page.locator("input[type=radio][id$='_0']:checked").count().catch(() => 0);
                const answeredNo = await page.locator("input[type=radio][id$='_1']:checked").count().catch(() => 0);
                const totalRadioGroups = answeredYes + answeredNo;
                if (answeredYes > 0) {
                    // Identify which questions were answered Yes
                    const yesRadios = await page.locator("input[type=radio][id$='_0']:checked").all().catch(() => []);
                    const yesIds = [];
                    for (const r of yesRadios) {
                        const id = await r.getAttribute('id').catch(() => '');
                        if (id) yesIds.push(id.replace(/_0$/, ''));
                    }
                    console.warn(`[Filler]   SECURITY: ${answeredYes} respostas YES: ${yesIds.join(', ')}`);
                }
                console.log(`[Filler] Security: ${answeredYes} Yes, ${answeredNo} No (${totalRadioGroups} perguntas)`);
                // Report security page stats via callback
                if (onPageFilled) {
                    try { onPageFilled({ pageName, fieldsFilled: totalRadioGroups, fieldsTotal: totalRadioGroups, emptyFields: [], elapsed: 0, passes: 1 }); } catch { }
                }
                await clickNextAndWait(page);
                continue;
            }

            // ====== FILL PAGE (modular) + VERIFY + NEXT ======
            let fillResult = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                // Travel page: handler especializado (elimina esperas desnecess¡rias)
                if (pageName === 'Travel') {
                    fillResult = await fillTravelPage(page, fieldMap, profile);
                } else {
                    // Fill using generic-page module (4 phases: postback ƒ¢a a Add Another ƒ¢a a non-postback ƒ¢a a text)
                    fillResult = await fillPage(page, fieldMap);
                }

                // VERIFICAaO OBRIGATaRIA antes de Next
                const verification = await verifyPage(page);
                if (!verification.ok && attempt < 3) {
                    console.warn(`[Filler] Verifica§£o falhou (tentativa ${attempt}): ${verification.empty.length} vazios ƒ¢aa re-preenchendo`);
                    continue;
                }

                const { navigated } = await clickNextAndWait(page);
                if (navigated) {
                    if (onPageFilled && fillResult) {
                        try {
                            onPageFilled({
                                pageName,
                                fieldsFilled: fillResult.passes > 0 ? fillResult.passes : 0,
                                fieldsTotal: 0,
                                emptyFields: fillResult.emptyFields || [],
                                elapsed: fillResult.elapsed || 0,
                                passes: fillResult.passes || 1,
                                attempt,
                                navigated: true
                            });
                        } catch { }
                    }
                    break;
                }

                const validationErrors = await getValidationErrors(page);
                const htmlErrors = await page.locator('.error-message li').allTextContents().catch(() => []);
                const allErrors = [...validationErrors, ...htmlErrors].filter(e => e.trim());
                if (allErrors.length > 0) {
                    console.warn(`[Filler] Validation errors on ${pageName}:`, allErrors);
                }

                if (attempt === 3 && !navigated) {
                    if (onPageFilled && fillResult) {
                        try {
                            onPageFilled({
                                pageName,
                                emptyFields: fillResult.emptyFields || [],
                                elapsed: fillResult.elapsed || 0,
                                passes: fillResult.passes || 1,
                                attempt,
                                navigated: false,
                                validationErrors: allErrors
                            });
                        } catch { }
                    }
                    const errDetail = allErrors.length > 0 ? allErrors.join('; ') : 'Page stuck after 3 attempts';
                    throw new Error(`${pageName}: ${errDetail}`);
                }
                await waitForPageReady(page);
            }
        }

        console.log(`[Filler] Done: ${visited.join(' -> ')}`);
        return { success: true, applicationId: application.application_id, browser };

    } catch (e) {
        console.error('[Filler] Error:', e);
        // Extract field name
        let field = null;
        const selectorMatch = e.message?.match(/#([\w_]+)/);
        if (selectorMatch) field = selectorMatch[1];
        const currentPage = visited.length > 0 ? visited[visited.length - 1] : 'Unknown';

        // Capture validation errors from DS-160 if page is still alive
        let validationErrors = [];
        try {
            if (page && !page.isClosed()) {
                validationErrors = await page.locator('.error-message li, .aspNetValidator, [id*="validator"]')
                    .allTextContents().catch(() => []);
                validationErrors = validationErrors.filter(v => v.trim().length > 0);
            }
        } catch { /* page may be gone */ }

        // Classify error cause with granular sub-causes
        let cause = 'unknown';
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('browser has been closed') || msg.includes('target closed') || msg.includes('context or browser')) {
            cause = 'browser_closed';
        } else if (msg.includes('net::err_') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound')) {
            cause = 'network_error';
        } else if (msg.includes('captcha')) {
            cause = 'captcha_failed';
        } else if (validationErrors.length > 0) {
            cause = 'validation_error';
        } else if (msg.includes('timeout') || msg.includes('waiting for')) {
            cause = msg.includes('postback') ? 'postback_stuck' : 'timeout';
        } else if (msg.includes('selectoption') || msg.includes('no option')) {
            cause = 'field_error:select';
        } else if (field) {
            cause = msg.includes('not found') || msg.includes('missing') ? 'field_error:missing' : 'field_error';
        } else if (msg.includes('stuck after')) {
            cause = 'page_stuck';
        }

        return { success: false, error: e.message, stack: e.stack, field, page: currentPage, cause, validationErrors, browser, activePage: page };
    }
    // NOTE: browser is NOT closed here ƒ¢aa caller (queue.js) decides when to close
}

// ====================================================================
// HELPERS (extracted from working test)
// ====================================================================

function identifyPage(url) {
    if (url.includes('Default.aspx')) return 'Landing';
    if (url.includes('Recovery.aspx')) return 'Recovery';
    if (url.includes('ConfirmApplicationID') || url.includes('SecureQuestion')) return 'SecurityQuestion';
    const file = url.split('/').pop()?.split('?')[0] || '';
    const node = (url.match(/node=(\w+)/) || [])[1] || '';
    if (file.includes('complete_personal') && node === 'Personal1') return 'Personal1';
    if (file.includes('complete_personal') && node === 'Personal2') return 'Personal2';
    if (file.includes('complete_travel.aspx')) return 'Travel';
    if (file.includes('complete_travelcompanions')) return 'TravelCompanions';
    if (file.includes('complete_previousustravel')) return 'PreviousUSTravel';
    if (file.includes('complete_addressphone') || file.includes('complete_contact')) return 'AddressPhone';
    if (file.includes('complete_pptvisa') || file.includes('Passport_Visa')) return 'Passport';
    if (file.includes('complete_uscontact')) return 'USContact';
    if (file.includes('complete_family1')) return 'Family1';
    if (file.includes('complete_family2')) return 'Family2';
    if (file.includes('complete_family4') || node === 'PrevSpouse') return 'PrevSpouse';
    if (file.includes('complete_workeducation1')) return 'WorkEducation1';
    if (file.includes('complete_workeducation2')) return 'WorkEducation2';
    if (file.includes('complete_workeducation3')) return 'WorkEducation3';
    if (file.includes('complete_addlworkeducation')) return 'AdditionalWork';
    if (url.includes('SecurityandBackground')) return 'Security';
    if (url.includes('UploadPhoto')) return 'Photo';
    if (url.includes('ReviewPage') || url.includes('Review')) return 'Review';
    if (url.includes('Confirmation')) return 'Confirmation';
    return node || 'Unknown';
}

function isFinalPage(name) { return ['Review', 'Photo', 'Confirmation'].includes(name); }
function isSecurityPage(url) { return url.includes('SecurityandBackground'); }
function isSelectEmpty(val) {
    if (!val) return true;
    const v = val.trim();
    return v === '' || v === '-1' || v === '0' || v === 'SONE' || v.toUpperCase().includes('SELECT');
}

async function waitForPostback(page) {
    const start = Date.now();
    // Wait for ASP.NET postback manager to finish (timeout 2s)
    await page.waitForFunction(() => {
        const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return !mgr || !mgr.get_isInAsyncPostBack();
    }, { timeout: 2000 }).catch(() => { });

    // Quick field count stabilization check (polling 60ms)
    const countFields = () => page.evaluate(() => {
        let c = 0;
        document.querySelectorAll('select, input:not([type="hidden"]), textarea').forEach(el => {
            if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
        });
        return c;
    }).catch(() => 0);

    const initial = await countFields();
    let last = initial, stable = 0;
    while (Date.now() - start < 1200) {
        await sleep(60);
        const cur = await countFields();
        if (cur !== initial && cur === last) { stable += 60; if (stable >= 120) break; }
        else if (cur === initial && Date.now() - start > 250) break;
        else stable = 0;
        last = cur;
    }
}

async function waitForPageReady(page, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        // Evaluate NICO: scroll + count + postback check
        const { count, inPB } = await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            window.scrollTo(0, 0);
            let c = 0;
            document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach(el => {
                if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
            });
            const m = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
            return { count: c, inPB: m?.get_isInAsyncPostBack?.() || false };
        }).catch(() => ({ count: 0, inPB: false }));
        if (count > 0 && !inPB && (count >= 3 || Date.now() - start > 800)) return count;
        await sleep(100);
    }
    return 0;
}

async function waitForUrlChange(page, urlBefore, timeout = 4000) {
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < timeout) {
        await sleep(150);
    }
    await waitForPageReady(page);
}

// fillPage + verifyPage -> imported from pages/generic-page.js
// fillPageCompletely + autoFillPass + discoverFields -> REMOVIDOS (codigo legado, substituido por generic-page.js)

async function clickNextAndWait(page) {
    const urlBefore = page.url();

    // === MODAL DISMISS: Close any DS-160 modal overlays that block Next ===
    // DS-160 uses modals like: modalNationalityWarning, modalIncompleteApp, etc.
    // These have a modalBackground div that intercepts pointer events
    try {
        const modalBg = page.locator('div[id*="modalBackground"], div.modalBackground').first();
        if (await modalBg.isVisible({ timeout: 500 }).catch(() => false)) {
            console.log('[Filler] aa Modal detectado ƒ¢aa tentando fechar...');

            // Try clicking OK/Continue/Yes buttons inside modal panels
            const modalBtns = [
                'div[id*="modal"] input[type="button"][value*="OK"]',
                'div[id*="modal"] input[type="button"][value*="Yes"]',
                'div[id*="modal"] input[type="button"][value*="Continue"]',
                'div[id*="modal"] input[type="submit"][value*="OK"]',
                'div[id*="modal"] a[id*="btnOk"]',
                'div[id*="modal"] a[id*="btnYes"]',
                // Specific known modals
                'input[id*="btnOkWarning"]',
                'input[id*="btnOKWarning"]',
                'input[id*="btnContinueWarning"]',
                'a[id*="btnOkWarning"]',
                'a[id*="btnOKWarning"]',
            ];

            let dismissed = false;
            for (const sel of modalBtns) {
                const btn = page.locator(sel).first();
                try {
                    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                        await btn.click({ force: true });
                        console.log(`[Filler] a Modal fechado via: ${sel}`);
                        await sleep(500);
                        await waitForPostback(page);
                        dismissed = true;
                        break;
                    }
                } catch { }
            }

            // Fallback: remove modal overlay via JavaScript
            if (!dismissed) {
                console.log('[Filler]  Removendo modal overlay via JS');
                await page.evaluate(() => {
                    document.querySelectorAll('div[id*="modalBackground"], div.modalBackground').forEach(el => {
                        el.style.display = 'none';
                        el.remove();
                    });
                    // Also hide any modal popup panels
                    document.querySelectorAll('div[id*="modal_foreground"], div[id*="ModalPanel"]').forEach(el => {
                        el.style.display = 'none';
                    });
                }).catch(() => { });
                await sleep(300);
            }
        }
    } catch (e) {
        console.warn('[Filler] Modal check error:', e.message);
    }

    const next = page.locator("input[type=submit][value*='Next']").first();

    // Human review delay: scroll up, pause as if reviewing, then click
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })).catch(() => {});
    await humanDelay(1500, 3500); // 1.5-3.5s simulating human reviewing page
    await thinkingPause(); // 10% chance of extra long pause

    // Use humanClick for the Next button (mouse movement + press/release)
    const [response] = await Promise.all([
        page.waitForResponse(
            r => r.url().includes('.aspx') && r.status() === 200,
            { timeout: 15000 }
        ).catch(() => null),
        humanClick(page, next)
    ]);

    // Also wait for URL change as fallback
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < 5000) {
        await sleep(150);
    }
    await waitForPageReady(page);
    return { navigated: page.url() !== urlBefore, newPage: identifyPage(page.url()) };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ====================================================================
// NORMALIZE ƒ¢aa convert Supabase applicant.data to field-map profile format
// Handles both camelCase (JS form) and snake_case (DB) keys
// ====================================================================
function normalizeProfile(data) {
    // If already flat with surname at top level, return as-is
    if (data.surname && data.givenName) return data;

    // Otherwise map from nested structure (clone form) to flat profile
    const p1 = data.personal1 || data.personal || {};
    const p2 = data.personal2 || {};
    const addr = data.addressPhone || {};
    const trav = data.travel || {};
    const tc = data.travelCompanions || {};
    const prev = data.previousUSTravel || {};
    const fam1 = data.family1 || {};
    const fam2 = data.family2 || {};
    const ppt = data.passport || {};
    const we1 = data.workEducation1 || {};
    const we2 = data.workEducation2 || {};
    const we3 = data.workEducation3 || {};

    // Helper: prefer camelCase, fallback to snake_case
    const g = (obj, camel, snake) => obj[camel] || obj[snake] || '';
    // Helper: convert 'N/A', 'DNA', empty strings to null (for checkbox-check fields)
    const na = (v) => (!v || v === 'N/A' || v === 'n/a' || v === 'DNA') ? null : v;

    return {
        // === PERSONAL 1 ===
        surname: g(p1, 'surname', 'surname'),
        givenName: g(p1, 'givenName', 'given_name'),
        fullNameNative: g(p1, 'fullNameNative', 'full_name_native'),
        otherNamesUsed: p1.otherNamesUsed === 'Y' || p1.other_names_used === 'Y',
        otherNames: (p1.otherNames || p1.other_names || []).map(n => ({
            surname: (n.surname || '').replace(/[^A-Za-z ]/g, '').trim(),
            givenName: (n.givenName || '').replace(/[^A-Za-z ]/g, '').trim(),
        })).filter(n => n.surname || n.givenName),
        telecode: p1.telecode === 'Y' || p1.telecode_question === 'Y',
        telecodeSurname: g(p1, 'telecodeSurname', 'telecode_surname'),
        telecodeGivenName: g(p1, 'telecodeGivenName', 'telecode_given_name'),
        sex: g(p1, 'sex', 'sex') || null,
        maritalStatus: g(p1, 'maritalStatus', 'marital_status') || null,
        otherMaritalStatusText: g(p1, 'otherMaritalStatusText', 'other_marital_status_text'),
        dob: p1.dob || { day: '', month: '', year: '' },
        cityOfBirth: g(p1, 'cityOfBirth', 'city_of_birth'),
        stateOfBirth: g(p1, 'stateOfBirth', 'state_of_birth'),
        countryOfBirth: g(p1, 'countryOfBirth', 'country_of_birth') || null,

        // === PERSONAL 2 ===
        nationality: g(p2, 'nationality', 'nationality') || null,
        otherNationality: (() => {
            const flag = p2.otherNationality === 'Y' || p2.other_nationality === 'Y';
            if (!flag && (p2.otherNationalities || p2.other_nationalities || []).length > 0) return true;
            return flag;
        })(),
        // Full array of other nationalities (for Add Another support)
        otherNationalities: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            return (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
        })(),
        // Legacy single-entry (first item) for backward compatibility
        otherNationalityCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.country;
        })(),
        otherNationalityPassport: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.hasPassport === 'Y';
        })(),
        otherNationalityPassportNumber: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const others = (p2.otherNationalities || p2.other_nationalities || [])
                .filter(o => o.country && o.country !== nat)
                .filter((o, i, arr) => arr.findIndex(x => x.country === o.country) === i);
            return others[0]?.passportNumber;
        })(),
        permanentResidentOtherCountry: (() => {
            const flag = p2.permanentResident === 'Y' || p2.permanent_resident === 'Y'
                || p2.permanentResidentOtherCountry === 'Y' || p2.permanent_resident_other_country === 'Y'
                || p2.hasPermanentResident === 'Y' || p2.has_permanent_resident === 'Y';
            // Auto-detect: if array has entries, flag should be true
            if (!flag && (p2.permanentResidentCountries || p2.permanent_resident_countries || []).length > 0) {
                return true;
            }
            return flag;
        })(),
        // Full array of perm resident countries (for Add Another support)
        permanentResidentCountries: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            return (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
                .filter(c => c.country && c.country !== nat)
                .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i);
        })(),
        // Legacy single-entry (first item)
        permanentResidentCountry: (() => {
            const nat = g(p2, 'nationality', 'nationality') || null;
            const countries = (p2.permanentResidentCountries || p2.permanent_resident_countries || [])
                .filter(c => c.country && c.country !== nat)
                .filter((c, i, arr) => arr.findIndex(x => x.country === c.country) === i);
            return countries[0]?.country;
        })(),
        nationalId: g(p2, 'nationalId', 'national_id'),
        usSsn: p2.ssn && typeof p2.ssn === 'string' && p2.ssn !== 'N/A' && p2.ssn !== 'DNA' ? p2.ssn.replace(/-/g, '') : null,
        usTaxpayerId: p2.taxId && p2.taxId !== 'N/A' && p2.taxId !== 'DNA' ? p2.taxId : null,

        // === TRAVEL ===
        purposeOfTrip: (() => {
            const pt = g(trav, 'purposeOfTrip', 'purpose_of_trip');
            return (pt && pt !== 'N/A') ? pt : null;
        })(),
        purposeCategory: g(trav, 'purposeCategory', 'purpose_category') || null,
        purposeSubCategory: (() => {
            const raw = g(trav, 'purposeSubCategory', 'purpose_sub_category');
            if (!raw) return null;
            return raw.replace(/\//g, '-'); // DS-160 uses B1-B2, clone may use B1/B2
        })(),
        hasSpecificPlans: trav.hasSpecificPlans === 'Y' || trav.hasSpecificPlans === true || trav.has_specific_plans === 'Y',
        travel: {
            arrivalDate: (() => {
                // Use arrivalDate if specific plans, or nonSpecificArrival otherwise
                const d = trav.arrivalDate || trav.arrival_date || trav.nonSpecificArrival || trav.non_specific_arrival;
                if (d && d.day && d.month && d.year) return d;
                return null;
            })(),
            departureDate: trav.departureDate || trav.departure_date,
            arrivalFlight: trav.arrivalFlight || trav.arrival_flight,
            arrivalCity: trav.arrivalCity || trav.arrival_city,
            departureFlight: trav.departureFlight || trav.departure_flight,
            departureCity: trav.departureCity || trav.departure_city,
            location: trav.specificLocation || trav.specific_location,
            lengthOfStay: {
                value: (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.value : trav.lengthOfStay) || trav.length_of_stay || null,
                unit: (typeof trav.lengthOfStayUnit === 'string' ? trav.lengthOfStayUnit : (typeof trav.lengthOfStay === 'object' ? trav.lengthOfStay?.unit : null)) || trav.length_of_stay_unit || null
            },
            usAddress: (() => {
                const ua = trav.usAddress || trav.us_address || {};
                // Support flat fields (usAddressStreet1, etc.) from clone form
                const street1 = ua.street1 || trav.usAddressStreet1 || trav.us_address_street1 || '';
                const street2 = ua.street2 || trav.usAddressStreet2 || trav.us_address_street2 || '';
                const city = ua.city || trav.usAddressCity || trav.us_address_city || '';
                const state = ua.state || trav.usAddressState || trav.us_address_state || '';
                const zip = ua.zip || ua.postalCode || trav.usAddressZip || trav.us_address_zip || '';
                if (!street1 && !city && !state) return null;
                return { street1, street2, city, state, zip };
            })()
        },
        // Specific locations array for dtlTravelLoc addAnother support
        specificLocations: (() => {
            const locs = trav.specificLocations || trav.specific_locations;
            if (Array.isArray(locs) && locs.length) return locs;
            const single = trav.specificLocation || trav.specific_location;
            if (single) return [single];
            // Fallback: use arrivalCity as specific location when plans are specific
            const city = trav.arrivalCity || trav.arrival_city;
            if (city) return [city];
            return [];
        })(),
        payingForTrip: (() => {
            // Clone form uses OTH/SELF/COM/EMP/USE/USP, DS-160 select uses O/S/C/P/U
            const raw = trav.whoIsPaying || trav.who_is_paying || null;
            if (!raw) return null;
            const PAYER_MAP = { 'OTH': 'O', 'SELF': 'S', 'COM': 'C', 'COMPANY': 'C', 'EMP': 'P', 'EMPLOYER': 'P', 'USE': 'U', 'USP': 'U' };
            return PAYER_MAP[raw.toUpperCase()] || raw;
        })(),
        payer: (() => {
            const p = trav.payer || {};
            // Support flat fields from clone form (payerSurname, payerPersonStreet1, etc.)
            const hasFlatPayer = !!(trav.payerSurname || trav.payerGivenName || trav.payerPhone);
            const hasNestedPayer = !!(p.surname || p.givenName || p.phone || p.companyName);
            if (!hasFlatPayer && !hasNestedPayer) return null;

            const payerType = (() => {
                const raw = trav.whoIsPaying || trav.who_is_paying || null;
                if (!raw) return null;
                const PAYER_MAP = { 'OTH': 'O', 'SELF': 'S', 'COM': 'C', 'COMPANY': 'C', 'EMP': 'P', 'EMPLOYER': 'P', 'USE': 'U', 'USP': 'U' };
                return PAYER_MAP[raw.toUpperCase()] || raw;
            })();

            const INVALID = ['DNA', 'N/A', 'N-A', 'NA', 'XXX', 'NONE', 'N/D', ''];
            const cleanVal = (v) => (v && !INVALID.includes(String(v).trim().toUpperCase())) ? v : null;

            // Build payer from flat or nested fields
            const surname = p.surname || trav.payerSurname || trav.payer_surname || '';
            const givenName = p.givenName || trav.payerGivenName || trav.payer_given_name || '';
            const phone = p.phone || trav.payerPhone || trav.payer_phone || '';
            const email = cleanVal(p.email || trav.payerEmail || trav.payer_email);
            const relationship = p.relationship || trav.payerRelationship || trav.payer_relationship || '';
            const sameAddress = p.sameAddress || trav.payerSameAddress || trav.payer_same_address;
            const companyName = p.companyName || trav.payerCompanyName || '';
            const companyRelation = p.companyRelation || trav.payerCompanyRelation || '';

            // Address: from nested or flat payer fields
            const addr = ['C', 'P', 'U'].includes(payerType) ? (p.companyAddress || p.address || {}) : (p.address || {});
            const street1 = p.street1 || addr.street1 || trav.payerPersonStreet1 || trav.payer_person_street1 || '';
            const street2 = p.street2 || addr.street2 || trav.payerPersonStreet2 || trav.payer_person_street2 || '';
            const city = p.city || addr.city || trav.payerPersonCity || trav.payer_person_city || '';
            const state = p.state || addr.state || trav.payerPersonState || trav.payer_person_state || '';
            const postalCode = p.postalCode || addr.postalCode || trav.payerPersonPostalCode || trav.payer_person_postal_code || '';
            const country = p.country || addr.country || trav.payerPersonCountry || trav.payer_person_country || '';

            return { surname, givenName, phone, email, relationship, sameAddress, companyName, companyRelation, companyPhone: p.companyPhone, street1, street2, city, state, postalCode, country };
        })(),

        // === TRAVEL COMPANIONS ===
        travelingWithOthers: tc.travelingWithOthers === 'Y' || tc.traveling_with_others === 'Y',
        companions: (() => {
            const comps = tc.companions || [];
            // Deduplicate by surname+givenName (DS-160 rejects duplicates)
            const seen = new Set();
            return comps.filter(c => {
                const key = `${(c.surname || '').toUpperCase()}|${(c.givenName || '').toUpperCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        })(),
        partOfGroup: tc.partOfGroup === 'Y' || tc.part_of_group === 'Y',
        groupName: tc.groupName || tc.group_name || '',

        // === PREVIOUS US TRAVEL ===
        hasBeenInUS: (() => {
            // Explicit Y/N from form
            if (prev.hasBeenInUS === 'Y' || prev.has_been_in_us === 'Y' || prev.hasBeenToUS === 'Y') return true;
            if (prev.hasBeenInUS === 'N' || prev.has_been_in_us === 'N' || prev.hasBeenToUS === 'N') return false;
            // Infer from data: if previousVisits exist, user HAS been to US
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (visits.length > 0) {
                console.log(`[Normalize] Inferred hasBeenInUS=true from ${visits.length} previousVisits`);
                return true;
            }
            return false;
        })(),
        // Full array for multiple visits (field-map forEach + addAnother)
        previousVisits: (() => {
            const visits = prev.previousVisits || prev.previous_visits || [];
            return visits.map(v => ({
                arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year },
                lengthOfStay: v.lengthOfStay || v.length_of_stay || '',
                lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D',
            }));
        })(),
        // Legacy singular fallback
        previousUSVisit: (() => {
            const visits = prev.previousVisits || prev.previous_visits || [];
            if (!visits.length) return null;
            const v = visits[0];
            return {
                arrivalDate: v.arrivalDate || { day: v.day, month: v.month, year: v.year },
                lengthOfStay: v.lengthOfStay || v.length_of_stay || '',
                lengthOfStayUnit: v.lengthOfStayUnit || v.length_of_stay_unit || 'D',
            };
        })(),
        previousUSDriversLicense: (() => {
            if (prev.hasDriversLicense === 'Y' || prev.previousUSDriversLicense === 'Y' || prev.has_drivers_license === 'Y') return true;
            if (prev.hasDriversLicense === 'N' || prev.previousUSDriversLicense === 'N' || prev.has_drivers_license === 'N') return false;
            // Infer from data
            const dls = prev.driversLicenses || prev.drivers_licenses || [];
            if (dls.length > 0 && dls.some(dl => dl.number)) {
                console.log(`[Normalize] Inferred previousUSDriversLicense=true from ${dls.length} licenses`);
                return true;
            }
            return false;
        })(),
        // Full array for multiple licenses (field-map forEach + addAnother)
        driversLicenses: (prev.driversLicenses || prev.drivers_licenses || []).map(dl => ({
            number: dl.number || '', state: dl.state || '',
        })),
        // Legacy singular fallback
        previousUSDriversLicenseNumber: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.number,
        previousUSDriversLicenseState: (prev.driversLicenses || prev.drivers_licenses || [])[0]?.state,
        hasUSVisa: (() => {
            if (prev.hasUSVisa === 'Y' || prev.has_us_visa === 'Y') return true;
            if (prev.hasUSVisa === 'N' || prev.has_us_visa === 'N') return false;
            // Infer from data
            const visa = prev.previousVisa || prev.previous_visa;
            if (visa && (visa.number || visa.issueDate)) {
                console.log('[Normalize] Inferred hasUSVisa=true from previousVisa data');
                return true;
            }
            return false;
        })(),
        previousVisa: (() => {
            const visa = prev.previousVisa || prev.previous_visa;
            if (!visa) return null;
            return {
                issueDate: visa.issueDate || visa.issue_date || { day: '', month: '', year: '' },
                number: visa.number || '',
                numberNA: !visa.number,
                sameType: visa.sameType === 'Y' || visa.same_type === 'Y',
                sameCountry: visa.sameCountry === 'Y' || visa.same_country === 'Y',
                tenPrint: visa.tenPrint === 'Y' || visa.ten_print === 'Y',
                lost: visa.lost === 'Y',
                lostYear: visa.lostYear || visa.lost_year || '',
                lostExplanation: visa.lostExplanation || visa.lost_explanation || '',
                cancelled: visa.cancelled === 'Y',
                cancelledExplanation: visa.cancelledExplanation || visa.cancelled_explanation || '',
            };
        })(),
        visaRefused: prev.visaRefused === 'Y' || prev.visa_refused === 'Y',
        visaRefusedExplanation: prev.visaRefusedExplanation || prev.visa_refused_explanation || '',
        immigrantPetition: prev.immigrantPetition === 'Y' || prev.immigrant_petition === 'Y',
        immigrantPetitionExplanation: prev.immigrantPetitionExplanation || prev.immigrant_petition_explanation || '',
        permanentResident: prev.permanentResident === 'Y' || prev.permanent_resident === 'Y',
        permanentResidentExplanation: prev.permanentResidentExplanation || prev.permanent_resident_explanation || '',
        vwpDenial: prev.vwpDenial === 'Y' || prev.vwp_denial === 'Y',
        vwpDenialExplanation: prev.vwpDenialExplanation || prev.vwp_denial_explanation || '',

        // === ADDRESS & PHONE ===
        homeAddress: (() => {
            const ha = addr.homeAddress || addr.home_address || {};
            // Support flat fields from clone form (homeStreet1, homeCity, etc.)
            return {
                street1: ha.street1 || addr.homeStreet1 || addr.home_street1 || '',
                street2: ha.street2 || addr.homeStreet2 || addr.home_street2 || '',
                city: ha.city || addr.homeCity || addr.home_city || '',
                state: ha.state || addr.homeState || addr.home_state || '',
                postalCode: ha.postalCode || addr.homePostalCode || addr.home_postal_code || '',
                country: ha.country || addr.homeCountry || addr.home_country || '',
            };
        })(),
        mailingAddressSame: addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true || addr.mailing_address_same === 'Y' || addr.mailing_address_same === true,
        mailingAddress: (() => {
            if (addr.mailingAddressSame === 'Y' || addr.mailingAddressSame === true) return null;
            const ma = addr.mailingAddress || addr.mailing_address || {};
            // Support flat fields from clone form
            const street1 = ma.street1 || addr.mailStreet1 || addr.mail_street1 || '';
            const city = ma.city || addr.mailCity || addr.mail_city || '';
            if (!street1 && !city) return null;
            return {
                street1,
                street2: ma.street2 || addr.mailStreet2 || addr.mail_street2 || '',
                city,
                state: ma.state || addr.mailState || addr.mail_state || '',
                postalCode: ma.postalCode || addr.mailPostalCode || addr.mail_postal_code || '',
                country: ma.country || addr.mailCountry || addr.mail_country || '',
            };
        })(),
        phone: g(addr, 'phone', 'phone'),
        mobilePhone: na(addr.mobilePhone || addr.mobile_phone) || null,
        businessPhone: na(addr.businessPhone || addr.business_phone) || null,
        email: g(addr, 'email', 'email'),
        additionalPhones: addr.additionalPhones === 'Y' || addr.additional_phones === 'Y' || false,
        additionalPhoneNumbers: addr.additionalPhoneNumbers || addr.additional_phone_numbers || [],
        additionalEmails: addr.additionalEmails === 'Y' || addr.additional_emails === 'Y' || false,
        additionalEmailAddresses: addr.additionalEmailAddresses || addr.additional_email_addresses || [],
        socialMedia: (() => {
            // DS-160 valid platform codes + friendly name map
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
            const raw = (addr.socialMedia || addr.social_media || [])
                .filter(sm => sm.platform && sm.platform.trim()); // Remove entries without platform
            const mapped = raw.map(sm => ({
                ...sm,
                _original: sm.platform,
                platform: PLATFORM_MAP[(sm.platform || '').toUpperCase()] || sm.platform,
            }));
            // Plataformas sem c³digo DS-160 ƒ¢a a movidas para additionalSocialMedia
            const unsupported = mapped.filter(sm => !VALID_CODES.has((sm.platform || '').toUpperCase()));
            if (unsupported.length > 0) {
                unsupported.forEach(sm => console.log(`[Normalize] ƒ¢a a "${sm._original}" ƒ¢a a additionalSocialMedia (nao tem c³digo DS-160)`));
                // Auto-inject into additionalSocialMedia (merged below)
                addr._overflowSocialMedia = unsupported.map(sm => ({
                    platform: sm._original || sm.platform,
                    handle: sm.handle || '',
                }));
            }
            return mapped.filter(sm => VALID_CODES.has((sm.platform || '').toUpperCase()));
        })(),
        additionalSocialMedia: addr.additionalSocialMedia === 'Y' || addr.additional_social_media === 'Y' || !!(addr._overflowSocialMedia?.length),
        additionalSocialMediaAccounts: [
            ...(addr.additionalSocialMediaAccounts || addr.additional_social_media_accounts || []),
            ...(addr._overflowSocialMedia || []),
        ],

        // === PASSPORT ===
        passport: {
            type: g(ppt, 'type', 'type') || null,
            typeExplanation: ppt.typeExplanation || ppt.type_explanation,
            number: g(ppt, 'number', 'number'),
            bookNumber: na(ppt.bookNumber || ppt.book_number),
            issuingCountry: g(ppt, 'issuingCountry', 'issuing_country') || null,
            issuedCity: g(ppt, 'issuedCity', 'issued_city'),
            issuedState: g(ppt, 'issuedState', 'issued_state'),
            issuedCountry: g(ppt, 'issuedCountry', 'issued_country') || null,
            issuanceDate: ppt.issuanceDate || ppt.issuance_date,
            expirationDate: ppt.expirationDate || ppt.expiration_date,
            lostOrStolen: ppt.lostOrStolen === 'Y' || ppt.lost_or_stolen === 'Y',
            lostPassports: ppt.lostPassports || ppt.lost_passports || [],
            // Legacy single-entry fallback
            lostPassport: (ppt.lostPassports || ppt.lost_passports || [])[0] || null,
        },

        // === US CONTACT ===
        usContact: (() => {
            const uc = data.usContact || data.us_contact || data.travel?.usContact || data.travel?.us_contact || {};
            const ucAddr = uc.address || {};
            const sn = na(uc.surname) || '';
            const gn = na(uc.givenName || uc.given_name) || '';
            const nameNA = uc.nameDoNotKnow || uc.name_do_not_know || (!sn && !gn);
            const orgNA = uc.orgDoNotKnow || uc.org_do_not_know || false;
            return {
                surname: sn,
                givenName: gn,
                nameDoNotKnow: nameNA,
                organization: na(uc.organization) || '',
                orgDoNotKnow: orgNA,
                relationship: uc.relationship || '',
                street1: na(uc.street1 || ucAddr.street1) || '',
                street2: na(uc.street2 || ucAddr.street2) || '',
                city: na(uc.city || ucAddr.city) || '',
                state: na(uc.state || ucAddr.state) || '',
                zip: na(uc.zip || ucAddr.zip) || '',
                phone: uc.phone || '',
                email: na(uc.email) || '',
            };
        })(),

        // === FAMILY ===
        father: (() => {
            const f = fam1.father || {};
            const sn = na(f.surname) || '';
            const gn = na(f.givenName || f.given_name) || '';
            return {
                surname: sn,
                givenName: gn,
                nameUnknown: !sn && !gn,
                dob: f.dob || { day: '', month: '', year: '' },
                dobUnknown: !f.dob || f.dobUnknown || f.dob_unknown || false,
                inUS: f.inUS || f.in_us || 'N',
                usStatus: f.usStatus || f.us_status || '',
            };
        })(),
        mother: (() => {
            const m = fam1.mother || {};
            const sn = na(m.surname) || '';
            const gn = na(m.givenName || m.given_name) || '';
            return {
                surname: sn,
                givenName: gn,
                nameUnknown: !sn && !gn,
                dob: m.dob || { day: '', month: '', year: '' },
                dobUnknown: !m.dob || m.dobUnknown || m.dob_unknown || false,
                inUS: m.inUS || m.in_us || 'N',
                usStatus: m.usStatus || m.us_status || '',
            };
        })(),
        spouse: fam2 || {},
        relativesInUS: fam1.immediateRelativesInUS === 'Y' || fam1.relatives_in_us === 'Y',
        relatives: fam1.relatives || [],
        // Legacy single-entry fallback
        immediateRelative: (fam1.relatives || [])[0] || null,
        otherRelativesInUS: fam1.otherRelativesInUS === 'Y' || fam1.other_relatives_in_us === 'Y',

        // === DECEASED SPOUSE ===
        deceasedSpouse: (() => {
            const ds = data.deceasedSpouse || data.deceased_spouse;
            if (!ds || !ds.surname) return null;
            return {
                surname: ds.surname || '', givenName: ds.givenName || ds.given_name || '',
                dob: ds.dob || { day: '', month: '', year: '' },
                nationality: ds.nationality || '',
                cityOfBirth: na(ds.cityOfBirth || ds.city_of_birth) || '',
                countryOfBirth: ds.countryOfBirth || ds.country_of_birth || '',
            };
        })(),

        // === PREVIOUS SPOUSE ===
        // Full array for multiple spouses (field-map forEach + addAnother)
        previousSpouses: (() => {
            const ps = data.prevSpouse || data.prev_spouse || {};
            const spouses = ps.spouses || [];
            return spouses.map(s => ({
                numberOfFormerSpouses: ps.numberOfPrevious || ps.number_of_previous || String(spouses.length),
                surname: s.surname || '', givenName: s.givenName || s.given_name || '',
                dob: s.dob || { day: '', month: '', year: '' },
                nationality: s.nationality || '',
                cityOfBirth: s.cityOfBirth || s.city_of_birth || '',
                countryOfBirth: s.countryOfBirth || s.country_of_birth || '',
                dateOfMarriage: s.dateOfMarriage || s.date_of_marriage || { day: '', month: '', year: '' },
                dateMarriageEnded: s.dateMarriageEnded || s.date_marriage_ended || { day: '', month: '', year: '' },
                howMarriageEnded: s.howEnded || s.how_ended || '',
                countryMarriageTerminated: s.countryTerminated || s.country_terminated || '',
            }));
        })(),
        // Legacy singular fallback
        previousSpouse: (() => {
            const ps = data.prevSpouse || data.prev_spouse || {};
            const spouses = ps.spouses || [];
            if (!spouses.length) return null;
            const s = spouses[0];
            return {
                numberOfFormerSpouses: ps.numberOfPrevious || ps.number_of_previous || '1',
                surname: s.surname || '', givenName: s.givenName || s.given_name || '',
                dob: s.dob || { day: '', month: '', year: '' },
                nationality: s.nationality || '',
                cityOfBirth: s.cityOfBirth || s.city_of_birth || '',
                countryOfBirth: s.countryOfBirth || s.country_of_birth || '',
                dateOfMarriage: s.dateOfMarriage || s.date_of_marriage || { day: '', month: '', year: '' },
                dateMarriageEnded: s.dateMarriageEnded || s.date_marriage_ended || { day: '', month: '', year: '' },
                howMarriageEnded: s.howEnded || s.how_ended || '',
                countryMarriageTerminated: s.countryTerminated || s.country_terminated || '',
            };
        })(),

        // === WORK / EDUCATION 1 ===
        occupationCode: g(we1, 'occupation', 'occupation') || null,
        occupationExplanation: we1.occupationExplanation || we1.occupation_explanation || we1.specifyOther || we1.specify_other || we1.otherOccupation || we1.other_occupation || '',
        employer: (() => {
            const e = we1.employer || {};
            return {
                ...e,
                monthlyIncome: e.monthlyIncome || e.monthlySalary || e.monthly_income || e.monthly_salary || '',
                jobTitle: e.jobTitle || e.job_title || e.duties || '',
                startDate: e.startDate || e.start_date || { day: '', month: '', year: '' },
            };
        })(),

        // === WORK / EDUCATION 2 ===
        hasPreviousEmployment: we2.hasPreviousEmployment === 'Y' || we2.has_previous_employment === 'Y',
        previousEmployment: we2.previousEmployment || we2.previous_employment || [],
        hasEducation: we2.hasEducation === 'Y' || we2.has_education === 'Y',
        education: (we2.education || []).map(e => ({
            name: e.name || '',
            street1: e.street1 || '',
            city: e.city || '',
            state: e.state || '',
            postalCode: e.postalCode || e.postal_code || '',
            country: e.country || '',
            courseOfStudy: e.courseOfStudy || e.course_of_study || e.course || '',
            startDate: e.startDate || e.start_date || { month: '', year: '' },
            endDate: e.endDate || e.end_date || { month: '', year: '' },
        })),

        // === WORK / EDUCATION 3 ===
        languages: we3.languages || [],
        clanTribe: we3.clanTribe === 'Y' || we3.clan_tribe === 'Y',
        clanTribeName: we3.clanTribeName || we3.clan_tribe_name || '',
        countriesVisited: we3.countriesVisited === 'Y' || we3.countries_visited === 'Y',
        countriesVisitedList: we3.countriesVisitedList || we3.countries_visited_list || [],
        organizationMember: we3.organizationMember === 'Y' || we3.organization_member === 'Y',
        organizations: we3.organizations || [],
        // Legacy single-entry fallback
        organizationName: (we3.organizations || [])[0] || '',
        specializedSkills: we3.specializedSkills === 'Y' || we3.specialized_skills === 'Y',
        specializedSkillsExplanation: we3.specializedSkillsExplanation || we3.specialized_skills_explanation || '',
        militaryService: we3.militaryService === 'Y' || we3.military_service === 'Y',
        military: we3.military || [],
        insurgentOrg: we3.insurgentOrg === 'Y' || we3.insurgent_org === 'Y',
        insurgentOrgExplanation: we3.insurgentOrgExplanation || we3.insurgent_org_explanation || '',

        // === SECURITY ===
        // Maps all 30 security questions from the clone form JSON to flat fields
        // The filler uses these to set Yes/No + explanation text on security pages
        security: (() => {
            const sec = data.security || {};
            // List of all security field keys (matching generateJSON output)
            const fields = [
                // Security 1 - Health
                'disease', 'disorder', 'drugUser',
                // Security 2 - Criminal
                'arrested', 'controlledSubstances', 'prostitution', 'moneyLaundering',
                'humanTrafficking', 'assistedSevereTrafficking', 'humanTraffickingRelated',
                // Security 3 - National Security
                'illegalActivity', 'terroristActivity', 'terroristSupport', 'terroristOrg',
                'terroristRel', 'genocide', 'torture', 'exViolence', 'childSoldier',
                'religiousFreedom', 'populationControls', 'transplant',
                // Security 4 - Immigration
                'removalHearing', 'immigrationFraud', 'failToAttend', 'visaViolation', 'deport',
                // Security 5 - Miscellaneous
                'childCustody', 'votingViolation', 'renounceExp', 'attWoReimb',
            ];
            const result = {};
            for (const f of fields) {
                result[f] = sec[f] === 'Y';
                result[f + 'Expl'] = sec[f + 'Expl'] || '';
            }
            return result;
        })(),

        // === META ===
        location: (typeof data.location === 'object' && data.location !== null) ? (data.location.location || data.location.value || Object.values(data.location)[0]) : (data.location || null),
        securityAnswer: data.securityAnswer || data.security_answer || null
    };
}

module.exports = { fillApplication, normalizeProfile };
