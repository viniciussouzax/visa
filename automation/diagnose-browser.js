#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('patchright');
const { buildFlyIdentityProfile, buildLaunchOptions, buildContextOptions } = require('./helpers/fly-profile');
const { buildResolvedProxyConfig, buildProxyOpts } = require('./helpers/proxy-helper');
const { detectPageState } = require('./helpers/page-state');
const { humanDelay, maybeRandomScroll } = require('./helpers/human-behavior');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_ROOT = path.join(ROOT, 'artifacts', 'browser-diagnostics');
const TARGETS = {
    creepjs: { url: 'https://abrahamjuliot.github.io/creepjs/', waitMs: 9000 },
    browserscan: { url: 'https://www.browserscan.net/', waitMs: 7000 },
    sannysoft: { url: 'https://bot.sannysoft.com/', waitMs: 7000 },
    ceac: { url: 'https://ceac.state.gov/GenNIV/Default.aspx', waitMs: 6000 },
    turnstile: { url: 'https://2captcha.com/demo/cloudflare-turnstile', waitMs: 7000 },
};

function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
        if (!match) continue;
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) process.env[key] = value;
    }
}

function parseArgs(argv) {
    const options = {
        targets: ['creepjs', 'browserscan', 'sannysoft'],
        headless: false,
        useProxy: true,
        keepOpen: false,
    };

    for (const arg of argv) {
        if (arg.startsWith('--targets=')) {
            options.targets = arg
                .slice('--targets='.length)
                .split(',')
                .map(v => v.trim().toLowerCase())
                .filter(Boolean);
        } else if (arg === '--headless') {
            options.headless = true;
        } else if (arg === '--no-proxy') {
            options.useProxy = false;
        } else if (arg === '--keep-open') {
            options.keepOpen = true;
        }
    }

    if (options.targets.includes('all')) {
        options.targets = Object.keys(TARGETS);
    }

    options.targets = options.targets.filter(name => TARGETS[name]);
    if (options.targets.length === 0) {
        throw new Error('Nenhum target valido informado. Use creepjs,browserscan,sannysoft,ceac,turnstile ou all.');
    }

    return options;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function nowStamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildRunDir() {
    const dir = path.join(ARTIFACTS_ROOT, nowStamp());
    ensureDir(dir);
    return dir;
}

function resolveProxy() {
    const config = buildResolvedProxyConfig({
        settingsMap: {},
        sessionId: `diag_${Date.now()}`,
    });
    if (!config) return null;
    return buildProxyOpts(config);
}

async function collectNavigatorSnapshot(page) {
    return await page.evaluate(async () => {
        let tz = '';
        try {
            tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {}

        let uaData = null;
        try {
            if (navigator.userAgentData?.getHighEntropyValues) {
                uaData = await navigator.userAgentData.getHighEntropyValues([
                    'architecture',
                    'bitness',
                    'model',
                    'platform',
                    'platformVersion',
                    'uaFullVersion',
                    'fullVersionList',
                    'wow64',
                ]);
            }
        } catch (error) {
            uaData = { error: error.message };
        }

        return {
            url: location.href,
            title: document.title,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            webdriver: navigator.webdriver,
            languages: navigator.languages,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            cookieEnabled: navigator.cookieEnabled,
            maxTouchPoints: navigator.maxTouchPoints,
            timezone: tz,
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            chromeRuntime: !!window.chrome?.runtime,
            chromeApp: !!window.chrome?.app,
            permissionsQuery: typeof navigator.permissions?.query,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                rtt: navigator.connection.rtt,
                downlink: navigator.connection.downlink,
            } : null,
            uaData,
        };
    });
}

async function runTarget(browser, identity, proxyOpts, runDir, targetName, options) {
    const target = TARGETS[targetName];
    const targetDir = path.join(runDir, targetName);
    ensureDir(targetDir);

    const context = await browser.newContext(buildContextOptions(identity));
    await context.addInitScript(() => {
        try {
            Object.defineProperty(Navigator.prototype, 'webdriver', {
                get: () => undefined,
                configurable: true,
            });
        } catch {}
        try {
            if (!window.chrome) window.chrome = {};
            if (!window.chrome.runtime) {
                window.chrome.runtime = {
                    onMessage: { addListener: () => {} },
                    sendMessage: () => {},
                };
            }
            if (!window.chrome.app) {
                window.chrome.app = { isInstalled: false };
            }
            if (!window.chrome.csi) window.chrome.csi = () => ({});
            if (!window.chrome.loadTimes) window.chrome.loadTimes = () => ({});
        } catch {}
    });

    const page = await context.newPage();
    page.setDefaultTimeout(proxyOpts ? 60000 : 30000);
    page.setDefaultNavigationTimeout(proxyOpts ? 90000 : 45000);

    const requestFailures = [];
    page.on('requestfailed', req => {
        requestFailures.push({
            url: req.url(),
            method: req.method(),
            errorText: req.failure()?.errorText || 'unknown',
        });
    });

    const startedAt = new Date().toISOString();
    let navigationError = null;

    try {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: proxyOpts ? 90000 : 45000 });
        await humanDelay(800, 1600);
        await maybeRandomScroll(page).catch(() => {});
        await page.waitForTimeout(target.waitMs);
    } catch (error) {
        navigationError = error.message;
    }

    const screenshotPath = path.join(targetDir, 'page.png');
    const htmlPath = path.join(targetDir, 'page.html');
    const cookiesPath = path.join(targetDir, 'cookies.json');
    const snapshotPath = path.join(targetDir, 'snapshot.json');

    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    fs.writeFileSync(htmlPath, await page.content().catch(() => '<html></html>'), 'utf8');

    const cookies = await context.cookies().catch(() => []);
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf8');

    const navigatorSnapshot = await collectNavigatorSnapshot(page).catch(error => ({ error: error.message }));
    const pageState = targetName === 'ceac'
        ? await detectPageState(page).catch(error => ({ type: 'error', error: error.message }))
        : null;

    const report = {
        target: targetName,
        targetUrl: target.url,
        startedAt,
        finishedAt: new Date().toISOString(),
        navigationError,
        proxy: proxyOpts ? {
            server: proxyOpts.server,
            username: proxyOpts.username,
        } : null,
        identity: {
            locale: identity.locale,
            timezoneId: identity.timezoneId,
            screenRes: identity.screenRes,
            geolocation: identity.geolocation,
        },
        navigator: navigatorSnapshot,
        pageState,
        cookieCount: cookies.length,
        requestFailures,
        artifactPaths: {
            screenshotPath,
            htmlPath,
            cookiesPath,
        },
    };

    fs.writeFileSync(snapshotPath, JSON.stringify(report, null, 2), 'utf8');
    await context.close();
    return report;
}

async function main() {
    loadEnv();
    const options = parseArgs(process.argv.slice(2));
    const runDir = buildRunDir();
    const proxyOpts = options.useProxy ? resolveProxy() : null;
    const identity = buildFlyIdentityProfile({
        proxy_url: proxyOpts ? (process.env.PROXY_URL || 'proxy-enabled') : null,
        proxy_countries: process.env.PROXY_COUNTRIES || 'us,br',
    });

    const launchOptions = buildLaunchOptions(identity, proxyOpts);
    launchOptions.headless = options.headless;

    const browser = await chromium.launch(launchOptions);
    const summary = {
        runDir,
        startedAt: new Date().toISOString(),
        options: {
            targets: options.targets,
            headless: options.headless,
            useProxy: !!proxyOpts,
        },
        results: [],
    };

    try {
        for (const targetName of options.targets) {
            console.log(`[diag] Target: ${targetName}`);
            const result = await runTarget(browser, identity, proxyOpts, runDir, targetName, options);
            summary.results.push({
                target: targetName,
                navigationError: result.navigationError,
                url: result.navigator?.url || result.targetUrl,
                title: result.navigator?.title || '',
                pageState: result.pageState?.type || null,
                cookieCount: result.cookieCount,
                requestFailures: result.requestFailures.length,
            });
            console.log(`[diag] ${targetName}: ${result.navigationError ? `erro=${result.navigationError}` : 'ok'}`);
        }

        summary.finishedAt = new Date().toISOString();
        fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
        console.log(`[diag] Artefatos em: ${runDir}`);

        if (options.keepOpen) {
            console.log('[diag] Browser mantido aberto. Ctrl+C para encerrar.');
            await new Promise(() => {});
        }
    } finally {
        if (!options.keepOpen) {
            await browser.close().catch(() => {});
        }
    }
}

main().catch(error => {
    console.error('[diag] fatal:', error.message);
    process.exit(1);
});
