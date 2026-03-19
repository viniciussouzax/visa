#!/usr/bin/env node
/**
 * ceac-manual-test.js — Opens CEAC DS-160 with patchright + Chrome real
 * but does NOT solve captcha automatically.
 * 
 * PURPOSE: Test if Session Expired happens with manual captcha solving.
 * If manual works → problem is CapMonster/OCR answers
 * If manual fails → problem is browser detection
 * 
 * Usage: node automation/ceac-manual-test.js
 */
const { chromium } = require('patchright');

async function main() {
    console.log('🔍 Launching patchright + Chrome real...');
    
    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
        ],
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    });

    const page = await context.newPage();

    // Same minimal initScript as filler.js
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

    console.log('📋 Navigating to CEAC DS-160...');
    await page.goto('https://ceac.state.gov/GenNIV/Default.aspx', { waitUntil: 'domcontentloaded' });

    // Select location (RCF = Recife)
    const locationSelect = page.locator("select[id$='_ddlLocation']").first();
    await locationSelect.waitFor({ state: 'visible', timeout: 15000 });
    await locationSelect.selectOption('RCF');
    console.log('✅ Location selected: RCF');

    // Wait for page to reload after location selection
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🖐️  AÇÃO MANUAL NECESSÁRIA:');
    console.log('  1. Resolva o captcha manualmente no browser');
    console.log('  2. Clique em "Start an Application" / "START NEW APPLICATION"');
    console.log('  3. Observe se passa para a próxima página ou dá SessionTimedOut');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Monitorando URL...');

    // Monitor URL changes
    let lastUrl = page.url();
    const checkInterval = setInterval(async () => {
        try {
            const currentUrl = page.url();
            if (currentUrl !== lastUrl) {
                console.log(`\n🔄 URL changed: ${currentUrl}`);
                lastUrl = currentUrl;

                if (currentUrl.includes('SessionTimedOut')) {
                    console.log('❌ SESSION EXPIRED — Browser is being DETECTED!');
                    console.log('   → Problem is the browser/patchright config, NOT the captcha');
                } else if (currentUrl.includes('SecureQuestion') || currentUrl.includes('ConfirmApplicationID') || currentUrl.includes('complete_')) {
                    console.log('✅ SUCCESS — Page advanced!');
                    console.log('   → Browser is NOT detected, problem was captcha OCR answering wrong');
                } else if (currentUrl.includes('Default.aspx')) {
                    console.log('⚠️ Still on landing — captcha might be wrong, try again');
                }
            }
        } catch { /* page might be navigating */ }
    }, 1000);

    // Keep alive for 5 minutes
    console.log('⏱️  Browser ficará aberto por 5 minutos para teste manual...');
    await page.waitForTimeout(300000);
    
    clearInterval(checkInterval);
    await browser.close();
    console.log('🔚 Browser closed');
}

main().catch(console.error);
