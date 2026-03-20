/**
 * test-stealth.js — Teste de detecção anti-bot via bot.sannysoft.com
 * Replica EXATAMENTE as configurações do filler.js para validar stealth.
 * Executa localmente com patchright (mesmo engine usado na automação).
 * 
 * Uso: node automation/test-stealth.js
 */
const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('═══════════════════════════════════════════════');
    console.log('  STEALTH TEST — bot.sannysoft.com');
    console.log('═══════════════════════════════════════════════');

    // ── IDENTITY (idêntico ao filler.js) ──
    const COMMON_RESOLUTIONS = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 },
        { width: 1280, height: 720 },
        { width: 1600, height: 900 },
    ];
    const screenRes = COMMON_RESOLUTIONS[Math.floor(Math.random() * COMMON_RESOLUTIONS.length)];

    const CHROME_MAJORS = [131, 132, 133, 134];
    const pickMajor = () => CHROME_MAJORS[Math.floor(Math.random() * CHROME_MAJORS.length)];
    const pickBuild = () => Math.floor(Math.random() * 200);
    const UA_POOL = [
        () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36`,
        () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${pickMajor()}.0.${6700 + pickBuild()}.${pickBuild()} Safari/537.36 Edg/${pickMajor()}.0.${2800 + pickBuild()}.${pickBuild()}`,
        () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${115 + Math.floor(Math.random() * 10)}.0) Gecko/20100101 Firefox/${115 + Math.floor(Math.random() * 10)}.0`,
    ];
    const generatedUA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)]();
    const browserType = generatedUA.includes('Edg/') ? 'Edge' : generatedUA.includes('Firefox') ? 'Firefox' : 'Chrome';

    console.log(`Identity: ${browserType}, ${screenRes.width}x${screenRes.height}`);
    console.log(`UA: ${generatedUA}`);

    // ── LAUNCH ARGS (idêntico ao filler.js) ──
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
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--enforce-webrtc-ip-permission-check',
        '--disable-webrtc-hw-decoding',
        '--disable-webrtc-hw-encoding',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    ];

    // ── BROWSER LAUNCH ──
    const browser = await chromium.launch({
        headless: false, // Igual ao Fly.io com Xvfb
        args: launchArgs,
    });

    const context = await browser.newContext({
        viewport: { width: screenRes.width, height: screenRes.height },
        screen: { width: screenRes.width, height: screenRes.height },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        geolocation: { latitude: 40.7128 + (Math.random() - 0.5) * 0.1, longitude: -74.0060 + (Math.random() - 0.5) * 0.1 },
        permissions: ['geolocation'],
        colorScheme: 'light',
        deviceScaleFactor: [1, 1, 1, 1.25][Math.floor(Math.random() * 4)],
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Ch-Ua': `"Chromium";v="${pickMajor()}", "Not_A Brand";v="8"`,
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        },
    });

    // ── ANTI-DATACENTER STEALTH SCRIPTS (idêntico ao filler.js L302-473) ──
    await context.addInitScript(() => {
        // 1) WebGL Renderer
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return 'Google Inc. (NVIDIA)';
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

        // 2) Hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => [4, 6, 8][Math.floor(Math.random() * 3)] });

        // 3) Device memory
        Object.defineProperty(navigator, 'deviceMemory', { get: () => [4, 8][Math.floor(Math.random() * 2)] });

        // 4) Connection type
        if (navigator.connection) {
            Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
            Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 + Math.floor(Math.random() * 100) });
            Object.defineProperty(navigator.connection, 'downlink', { get: () => 5 + Math.random() * 15 });
        }

        // 5) Platform
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });

        // 6) Plugins
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

        // 7) Canvas noise injection
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            const imageData = origGetImageData.apply(this, args);
            const data = imageData.data;
            if (data.length < 500000) {
                for (let i = 0; i < data.length; i += 4) {
                    const noise = Math.random() < 0.5 ? 1 : -1;
                    data[i]   = (data[i]   + noise) & 0xFF;
                    data[i+1] = (data[i+1] + noise) & 0xFF;
                    data[i+2] = (data[i+2] + noise) & 0xFF;
                }
            }
            return imageData;
        };
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

        // 8) WebRTC JS leak prevention
        if (typeof RTCPeerConnection !== 'undefined') {
            const OrigRTC = RTCPeerConnection;
            window.RTCPeerConnection = function(config, constraints) {
                if (config && config.iceServers) config.iceTransportPolicy = 'relay';
                const pc = new OrigRTC(config, constraints);
                const origCreateOffer = pc.createOffer.bind(pc);
                pc.createOffer = function(opts) {
                    return origCreateOffer(opts).then(offer => {
                        if (offer && offer.sdp) offer.sdp = offer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                        return offer;
                    });
                };
                const origCreateAnswer = pc.createAnswer.bind(pc);
                pc.createAnswer = function(opts) {
                    return origCreateAnswer(opts).then(answer => {
                        if (answer && answer.sdp) answer.sdp = answer.sdp.replace(/a=candidate:.*?\r?\n/g, '');
                        return answer;
                    });
                };
                return pc;
            };
            window.RTCPeerConnection.prototype = OrigRTC.prototype;
            if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = window.RTCPeerConnection;
        }

        // 9) AudioContext fingerprint noise
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtor = window.AudioContext || window.webkitAudioContext;
            const origCreateAnalyser = AudioCtor.prototype.createAnalyser;
            AudioCtor.prototype.createAnalyser = function() {
                const analyser = origCreateAnalyser.apply(this, arguments);
                const origGetFloat = analyser.getFloatFrequencyData.bind(analyser);
                analyser.getFloatFrequencyData = function(array) {
                    origGetFloat(array);
                    for (let i = 0; i < array.length; i++) array[i] += (Math.random() - 0.5) * 0.01;
                };
                return analyser;
            };
            const origCreateOsc = AudioCtor.prototype.createOscillator;
            AudioCtor.prototype.createOscillator = function() {
                const osc = origCreateOsc.apply(this, arguments);
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

        // 10) window.chrome object
        if (!window.chrome) window.chrome = {};
        if (!window.chrome.runtime) {
            window.chrome.runtime = {
                connect: () => {}, sendMessage: () => {},
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

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // ── NAVIGATE TO BOT DETECTOR ──
    console.log('\n🌐 Navegando para bot.sannysoft.com...');
    await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle' });

    // Wait for all tests to complete
    await page.waitForTimeout(5000);
    console.log('✅ Página carregada — aguardando testes finalizarem...');
    await page.waitForTimeout(3000);

    // ── CAPTURE SCREENSHOT ──
    const screenshotPath = path.join(__dirname, '..', 'sannysoft-result.png');
    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`\n📸 Screenshot salvo: ${screenshotPath}`);

    // ── EXTRACT RESULTS ──
    const results = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tr');
        const data = [];
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 2) {
                const testName = cols[0]?.textContent?.trim();
                const result = cols[1]?.textContent?.trim();
                const isPass = cols[1]?.classList?.contains('passed') || 
                               cols[1]?.style?.backgroundColor?.includes('green') ||
                               result?.toLowerCase()?.includes('ok') ||
                               !cols[1]?.classList?.contains('failed');
                data.push({ test: testName, result, pass: isPass });
            }
        });
        return data;
    });

    // ── PRINT RESULTS ──
    console.log('\n═══════════════════════════════════════════════');
    console.log('  RESULTADOS DO TESTE');
    console.log('═══════════════════════════════════════════════');
    
    let passed = 0;
    let failed = 0;
    for (const r of results) {
        const icon = r.pass ? '✅' : '❌';
        if (r.pass) passed++; else failed++;
        console.log(`${icon} ${r.test}: ${r.result}`);
    }

    console.log('\n───────────────────────────────────────────────');
    console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
    console.log('───────────────────────────────────────────────');

    if (failed > 0) {
        console.log('\n⚠️  ATENÇÃO: Alguns testes falharam! Verifique a screenshot para detalhes.');
    } else {
        console.log('\n🎉 TODOS OS TESTES PASSARAM! Stealth está funcionando corretamente.');
    }

    // Keep browser open for 5 seconds to inspect visually
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('\n🏁 Teste concluído.');
})();
