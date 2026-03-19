#!/usr/bin/env node
/**
 * ceac-landing-test.js — Tests ONLY the landing page flow:
 * 1. Open CEAC DS-160
 * 2. Select location
 * 3. Solve captcha (CapMonster)
 * 4. Click "Start New Application"
 * 5. Report: Session Expired or Success
 * 
 * Uses same config as filler.js (patchright + Chrome + humanType + extraHTTPHeaders)
 */
const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');
const { solveCaptcha } = require('./captcha');

const TMP = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

async function humanDelay(ms1 = 300, ms2 = 700) {
    const ms = ms1 + Math.floor(Math.random() * (ms2 - ms1));
    return new Promise(r => setTimeout(r, ms));
}

async function humanType(page, selector, text) {
    const el = typeof selector === 'string' ? page.locator(selector) : selector;
    await el.click();
    await humanDelay(100, 300);
    await el.fill('');
    for (const char of text) {
        await page.keyboard.type(char, { delay: 60 + Math.floor(Math.random() * 120) });
    }
    await humanDelay(50, 200);
}

async function main() {
    console.log('🚀 CEAC Landing Test — patchright + Chrome + humanType + Sereno headers');
    console.log(`   capmonster_key: ${process.env.capmonster_key ? '✅' : '❌ MISSING'}`);

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1366,768',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            '--enable-features=NetworkService,NetworkServiceInProcess',
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        colorScheme: 'light',
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        bypassCSP: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'DNT': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        },
    });

    // Log failed requests
    const page = await context.newPage();
    page.on('requestfailed', req => {
        console.log(`[REQ FAILED] ${req.url()} — ${req.failure()?.errorText}`);
    });
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[PAGE ERR] ${msg.text()}`);
    });

    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(30000);

    // Step 1: Navigate
    console.log('\n📋 Step 1: Navigate to CEAC');
    const t0 = Date.now();
    await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });
    console.log(`   ✅ Page loaded (${Date.now() - t0}ms)`);

    // Step 2: Select location
    console.log('\n📋 Step 2: Select location');
    const locationSelect = page.locator("select[id$='_ddlLocation']").first();
    await locationSelect.waitFor({ state: 'visible', timeout: 15000 });
    await humanDelay(500, 1000);
    await locationSelect.selectOption('RCF');
    console.log(`   ✅ Location: RCF (${Date.now() - t0}ms)`);

    await page.waitForLoadState('networkidle');
    console.log(`   ✅ Page reloaded (${Date.now() - t0}ms)`);

    // Step 2b: Dismiss modal if present (same logic as filler.js)
    try {
        await page.waitForSelector('.modalBackground', { state: 'visible', timeout: 5000 });
        console.log('   ⚠️ Modal detected — clicking Close...');
        const closeBtn = page.locator('[id*="lnkClose"]').first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click();
        }
        await page.waitForSelector('.modalBackground', { state: 'hidden', timeout: 10000 }).catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        console.log('   ✅ Modal dismissed');
    } catch { console.log('   ✅ No modal'); }

    // Step 3: Solve captcha
    console.log('\n📋 Step 3: Solve captcha');
    const captchaImg = page.locator("img[id$='_CaptchaImage'], img[src*='captcha']").first();
    await captchaImg.waitFor({ state: 'visible', timeout: 10000 });

    const imgPath = path.join(TMP, 'captcha-test.png');
    await captchaImg.screenshot({ path: imgPath });
    console.log(`   📸 Captcha screenshot saved`);

    const captchaT0 = Date.now();
    const answer = await solveCaptcha(imgPath, 'capmonster', {
        capmonsterKey: process.env.capmonster_key,
    });
    console.log(`   🔑 Captcha answer: "${answer}" (solved in ${Date.now() - captchaT0}ms)`);

    // Step 4: Type captcha with humanType
    console.log('\n📋 Step 4: Type captcha (humanType)');
    const captchaInput = page.locator("input[id$='_txtCodeTextBox']").first();
    await humanType(page, captchaInput, answer);
    console.log(`   ✅ Typed captcha (${Date.now() - t0}ms total)`);

    // Step 4.5: Dismiss modal again if it reappeared
    await page.evaluate(() => {
        const bg = document.querySelector('.modalBackground');
        if (bg && bg.style.display !== 'none') {
            bg.style.display = 'none';
            const fg = bg.previousElementSibling || document.querySelector('[id*="modalConfirm_foregroundElement"]');
            if (fg) fg.style.display = 'none';
        }
    }).catch(() => {});

    // Step 5: Click "Start New Application" with mouse.down/up
    console.log('\n📋 Step 5: Click "Start New Application"');
    const startBtn = page.locator("a[id$='_lnkNew']").first();
    
    const box = await startBtn.boundingBox();
    if (box) {
        const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
        const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
        await page.mouse.move(targetX, targetY, { steps: 10 + Math.floor(Math.random() * 15) });
        await page.waitForTimeout(50 + Math.floor(Math.random() * 100));
        await page.mouse.down();
        await page.waitForTimeout(30 + Math.floor(Math.random() * 70));
        await page.mouse.up();
    } else {
        await startBtn.click({ timeout: 15000 });
    }

    // Wait for navigation
    await new Promise(r => setTimeout(r, 3000));
    
    const finalUrl = page.url();
    console.log(`\n   [POST-CLICK] URL: ${finalUrl} (total: ${Date.now() - t0}ms)`);

    // Screenshot
    const ssPath = path.join(TMP, 'ceac-landing-result.png');
    await page.screenshot({ path: ssPath, fullPage: true });

    if (finalUrl.includes('SessionTimedOut') || finalUrl.includes('TimedOut')) {
        const body = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || '');
        console.log('\n❌ SESSION EXPIRED!');
        console.log(`   Body: ${body}`);
        console.log('   → Problem persists. Not fixed by humanType + headers.');
    } else if (finalUrl.includes('Default.aspx')) {
        console.log('\n⚠️  Still on landing (captcha wrong or validation error)');
        const valErr = await page.locator('[id*="ValidationSummary"]').textContent().catch(() => '');
        console.log(`   ValidationSummary: ${valErr}`);
    } else {
        console.log('\n✅ SUCCESS! Page advanced to:', finalUrl);
        console.log('   → humanType + Sereno headers FIXED the issue!');
    }

    // Keep alive for inspection
    console.log('\n⏱️  Browser open for 60s for inspection...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
    console.log('🔚 Done');
}

main().catch(e => {
    console.error('💥 Fatal:', e.message);
    process.exit(1);
});
