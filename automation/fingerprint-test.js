#!/usr/bin/env node
/**
 * fingerprint-test.js — Test patchright browser against bot detection sites
 * Usage: node automation/fingerprint-test.js
 * 
 * Tests against:
 * 1. bot.sannysoft.com — Classic bot detection checks
 * 2. browserscan.net — Comprehensive browser fingerprint scanner
 * 
 * Takes screenshots of each for analysis.
 */
const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');

const TMP = path.join(__dirname, '..', 'tmp');

async function main() {
    if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

    console.log('🔍 Launching patchright browser for fingerprint testing...');
    
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',  // Test with REAL Chrome
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });
    const page = await context.newPage();

    // Same initScript as filler.js
    await page.addInitScript(() => {
        if (!window.chrome || !window.chrome.runtime) {
            window.chrome = {
                runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {} },
                loadTimes: () => ({}),
                csi: () => ({}),
                app: { isInstalled: false },
            };
        }
    });

    // ── TEST 1: bot.sannysoft.com ──
    console.log('\n📋 Test 1: bot.sannysoft.com');
    try {
        await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000); // Wait for all tests to complete
        const ssPath1 = path.join(TMP, 'fingerprint-sannysoft.png');
        await page.screenshot({ path: ssPath1, fullPage: true });
        console.log(`  ✅ Screenshot: ${ssPath1}`);
        
        // Extract results
        const results = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tr');
            const data = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const test = cells[0]?.textContent?.trim();
                    const result = cells[1]?.textContent?.trim();
                    const isRed = cells[1]?.classList?.contains('failed') || 
                                  cells[1]?.style?.backgroundColor?.includes('red') ||
                                  cells[1]?.className?.includes('bad');
                    data.push({ test, result, failed: isRed });
                }
            });
            return data;
        });
        
        console.log('  Results:');
        results.forEach(r => {
            const icon = r.failed ? '❌' : '✅';
            console.log(`    ${icon} ${r.test}: ${r.result}`);
        });
    } catch (e) {
        console.error('  ❌ Failed:', e.message);
    }

    // ── TEST 2: fingerprint.com bot detection ──
    console.log('\n📋 Test 2: fingerprint.com/web-bot-auth/test/');
    try {
        await page.goto('https://fingerprint.com/web-bot-auth/test/', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000); // Wait for detection to complete
        const ssPath2 = path.join(TMP, 'fingerprint-fpcom.png');
        await page.screenshot({ path: ssPath2, fullPage: true });
        console.log(`  ✅ Screenshot: ${ssPath2}`);
    } catch (e) {
        console.error('  ❌ Failed:', e.message);
    }

    // ── TEST 3: browserscan.net ──
    console.log('\n📋 Test 3: browserscan.net');
    try {
        await page.goto('https://www.browserscan.net/bot-detection', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(5000); // Wait for detection to complete
        const ssPath3 = path.join(TMP, 'fingerprint-browserscan.png');
        await page.screenshot({ path: ssPath3, fullPage: true });
        console.log(`  ✅ Screenshot: ${ssPath3}`);
    } catch (e) {
        console.error('  ❌ Failed:', e.message);
    }

    // ── TEST 3: Check specific Playwright leaks ──
    console.log('\n📋 Test 3: Internal detection checks');
    const checks = await page.evaluate(() => {
        return {
            webdriver: navigator.webdriver,
            webdriverType: typeof navigator.webdriver,
            chromeRuntime: !!window.chrome?.runtime,
            chromeApp: !!window.chrome?.app,
            plugins: navigator.plugins?.length || 0,
            languages: navigator.languages,
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            userAgent: navigator.userAgent,
            hasAutomation: !!window.__playwright,
            hasPuppeteer: !!window.__puppeteer_evaluation_script__,
            connection: navigator.connection?.effectiveType,
            maxTouchPoints: navigator.maxTouchPoints,
            permissions: typeof navigator.permissions?.query,
        };
    });
    
    console.log('  Detection checks:');
    Object.entries(checks).forEach(([key, value]) => {
        const display = typeof value === 'object' ? JSON.stringify(value) : value;
        const icon = key === 'webdriver' && value ? '❌' : 
                     key === 'hasAutomation' && value ? '❌' :
                     key === 'hasPuppeteer' && value ? '❌' :
                     key === 'plugins' && value === 0 ? '⚠️' : '✅';
        console.log(`    ${icon} ${key}: ${display}`);
    });

    console.log('\n✅ All tests done. Check screenshots in tmp/ folder.');
    console.log('Press Ctrl+C to close browser.');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(120000);
    await browser.close();
}

main().catch(console.error);
