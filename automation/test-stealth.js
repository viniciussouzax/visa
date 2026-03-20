/**
 * test-stealth.js — Validate the current stealth profile against
 * bot.sannysoft.com using the same identity/context builders as filler.js.
 *
 * Usage: node automation/test-stealth.js
 */
const { chromium } = require('patchright');
const path = require('path');
const { buildFlyIdentityProfile, buildLaunchOptions, buildContextOptions } = require('./helpers/fly-profile');
const { applyStealthInitScript } = require('./helpers/stealth-init');
const { humanDelay, humanClick } = require('./helpers/human-behavior');

(async () => {
    console.log('================================================');
    console.log('  STEALTH TEST - bot.sannysoft.com');
    console.log('================================================');

    const identity = buildFlyIdentityProfile({
        proxy_url: process.env.PROXY_URL || null,
        proxy_countries: process.env.PROXY_COUNTRIES || 'us,br',
    });

    console.log(`Identity: Chrome, ${identity.screenRes.width}x${identity.screenRes.height}`);
    console.log(`UA: ${identity.userAgent}`);
    console.log(`Locale: ${identity.locale} | Timezone: ${identity.timezoneId}`);

    const browser = await chromium.launch(buildLaunchOptions(identity, null));
    const context = await browser.newContext(buildContextOptions(identity));
    await applyStealthInitScript(context);

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('\nNavigating to bot.sannysoft.com...');
    await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle' });

    await humanDelay(800, 1500);
    const body = page.locator('body');
    if (await body.isVisible().catch(() => false)) {
        await humanClick(page, body).catch(() => {});
    }

    await page.waitForTimeout(5000);
    console.log('Page loaded - waiting for detector to settle...');
    await page.waitForTimeout(3000);

    const screenshotPath = path.join(__dirname, '..', 'sannysoft-result.png');
    await page.screenshot({ fullPage: true, path: screenshotPath });
    console.log(`\nScreenshot saved: ${screenshotPath}`);

    const results = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tr');
        const data = [];

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length < 2) return;

            const testName = cols[0]?.textContent?.trim();
            const result = cols[1]?.textContent?.trim();
            if (!testName) return;

            const lower = (result || '').toLowerCase();
            const className = cols[1]?.className || '';
            const style = cols[1]?.getAttribute?.('style') || '';

            const isFail = className.includes('failed')
                || lower.includes('failed')
                || lower.includes('error')
                || lower.includes('detected')
                || lower.includes('headless');

            const isPass = !isFail && (
                className.includes('passed')
                || style.includes('green')
                || lower.includes('ok')
                || lower.includes('passed')
                || lower.includes('normal')
            );

            data.push({
                test: testName,
                result,
                pass: isPass ? true : isFail ? false : null,
            });
        });

        return data;
    });

    console.log('\n================================================');
    console.log('  TEST RESULTS');
    console.log('================================================');

    let passed = 0;
    let failed = 0;
    let unknown = 0;

    for (const r of results) {
        const icon = r.pass === true ? '[PASS]' : r.pass === false ? '[FAIL]' : '[INFO]';
        if (r.pass === true) passed++;
        else if (r.pass === false) failed++;
        else unknown++;
        console.log(`${icon} ${r.test}: ${r.result}`);
    }

    console.log('\n------------------------------------------------');
    console.log(`TOTAL: ${passed} passed, ${failed} failed, ${unknown} unknown`);
    console.log('------------------------------------------------');

    if (failed > 0) {
        console.log('\nAttention: some tests failed. Check the screenshot for visual details.');
    } else {
        console.log('\nNo explicit failures were detected by the parser.');
    }

    await page.waitForTimeout(3000);
    await browser.close();
    console.log('\nTest finished.');
})().catch(err => {
    console.error('\nFatal error during stealth test:', err);
    process.exit(1);
});
