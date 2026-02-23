const { chromium } = require('playwright');
(async () => {
    try {
        console.log("Launching Chromium...");
        const browser = await chromium.launch({
            headless: false,
            channel: 'chrome',
            args: ['--disable-blink-features=AutomationControlled']
        });
        console.log("Chromium launched successfully!");

        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://ceac.state.gov/GenNIV/Default.aspx", { waitUntil: 'domcontentloaded' });

        console.log("Page loaded. Closing in 3 seconds...");
        setTimeout(async () => {
            await browser.close();
            console.log("Done.");
        }, 3000);
    } catch (e) {
        console.error("CRASH ERROR:", e);
    }
})();
