// ============================================================
// Photo Page Handler — Upload photo or skip
// Extracted from filler.js Fill Loop Photo section (L446-597)
// ============================================================
const path = require('path');
const fs = require('fs');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Handle the DS-160 Photo Upload page.
 * Strategy 1: Upload photo via popup if URL available
 * Strategy 2: Skip via JavaScript modal activation
 * Strategy 3: Force __doPostBack to skip to Review
 *
 * @param {import('playwright').Page} page
 * @param {object} profile - Normalized applicant profile
 * @param {function} identifyPage - Page identifier helper
 * @param {function} waitForPageReady - Helper
 * @param {function} clickNextAndWait - Helper
 * @returns {Promise<{ success: boolean, skipped: boolean, error?: string }>}
 */
async function handlePhotoPage(page, profile, identifyPage, { waitForPageReady, clickNextAndWait }) {
    console.log('[Filler] 📸 Photo page — tentando upload ou skip');
    await waitForPageReady(page);

    // ── Strategy 1: Upload photo if URL available ──
    const photoUrl = profile.photoUrl || profile.photo_url || '';
    if (photoUrl) {
        console.log('[Filler] 📸 Tentando upload da foto via popup...');
        try {
            const uploadBtn = page.locator("input[id$='btnUploadPhoto']").first();
            if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                const [popup] = await Promise.all([
                    page.context().waitForEvent('page', { timeout: 15000 }),
                    uploadBtn.click()
                ]);

                if (popup) {
                    await popup.waitForLoadState('domcontentloaded');
                    await popup.waitForTimeout(2000);

                    const fileInput = popup.locator("input[type='file']").first();
                    if (await fileInput.count() > 0) {
                        let filePath = photoUrl;
                        if (!fs.existsSync(photoUrl)) {
                            const tmpPhoto = path.join(require('os').tmpdir(), 'ds160_photo.jpg');
                            const response = await popup.context().request.get(photoUrl);
                            fs.writeFileSync(tmpPhoto, await response.body());
                            filePath = tmpPhoto;
                        }

                        await fileInput.setInputFiles(filePath);
                        console.log('[Filler] 📸 Foto selecionada no popup');

                        const popupUploadBtn = popup.locator("input[type='submit'][value*='Upload'], input[id*='Upload']").first();
                        if (await popupUploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                            await popupUploadBtn.click();
                            await popup.waitForLoadState('domcontentloaded').catch(() => {});
                            await popup.waitForTimeout(3000);
                        }
                    }

                    await popup.close().catch(() => {});
                }

                await page.waitForTimeout(2000);
                await waitForPageReady(page);

                const nextBtn = page.locator("input[id$='UpdateButton3']").first();
                const isEnabled = await nextBtn.isEnabled().catch(() => false);
                if (isEnabled) {
                    console.log('[Filler] 📸 Foto accepted! Clicando Next: Confirm Photo...');
                    await clickNextAndWait(page);
                    return { success: true, skipped: false };
                }
            }
        } catch (e) {
            console.warn('[Filler] 📸 Upload popup falhou:', e.message);
        }
    }

    // ── Strategy 2: Skip via JavaScript modal activation ──
    console.log('[Filler] 📸 Sem foto — ativando modal de navegação via JS');
    try {
        // Try clicking COMPLETE link or navigating directly
        await page.evaluate(() => {
            const completeLink = document.getElementById('COMPLETE');
            if (completeLink) completeLink.click();
        });
        await page.waitForTimeout(2000);

        // Try multiple variations of the "Continue Without Saving" button
        const saveVariants = [
            "input[value='No - Continue Without Saving']",
            "input[value='No – Continue Without Saving']",
            "input[value*='Continue Without']",
            "input[value*='continue without']",
            "a[title*='Continue Without']",
        ];
        for (const sel of saveVariants) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('[Filler] 📸 Modal encontrada — clicando skip: ' + sel);
                await btn.click();
                await page.waitForLoadState('domcontentloaded').catch(() => {});
                await waitForPageReady(page);

                const newPage = identifyPage(page.url());
                console.log('[Filler] 📸 Photo pulada → ' + newPage);

                if (newPage === 'Personal1' || newPage.startsWith('Personal')) {
                    const reviewLink = page.locator("a#REVIEW").first();
                    if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
                        const isDisabled = await reviewLink.getAttribute('disabled').catch(() => null);
                        if (!isDisabled) {
                            await reviewLink.click();
                            await page.waitForLoadState('domcontentloaded').catch(() => {});
                            await waitForPageReady(page);
                        }
                    }
                }
                return { success: true, skipped: true };
            }
        }

        // Also try "No – Continue Form" variant
        const continueVariants = [
            "input[value='No – Continue Form']",
            "input[value='No - Continue Form']",
            "input[value*='Continue Form']",
        ];
        for (const sel of continueVariants) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('[Filler] 📸 Modal completa — clicando: ' + sel);
                await btn.click();
                await page.waitForLoadState('domcontentloaded').catch(() => {});
                await waitForPageReady(page);
                console.log('[Filler] 📸 Photo pulada → ' + identifyPage(page.url()));
                return { success: true, skipped: true };
            }
        }
    } catch (e) {
        console.warn('[Filler] Modal navigation falhou:', e.message);
    }

    // ── Strategy 3: Force submit via __doPostBack to skip photo ──
    console.log('[Filler] 📸 Tentando force __doPostBack para REVIEW...');
    try {
        const urlBefore = page.url();
        // Try multiple doPostBack targets
        await page.evaluate(() => {
            if (typeof __doPostBack === 'function') {
                // Try primary target
                __doPostBack('ctl00$ucNavigateOption$ucNavPanel$ctl01$btnReviewPage', '');
            }
        });
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await waitForPageReady(page);
        const newUrl = page.url();
        if (newUrl !== urlBefore) {
            console.log('[Filler] 📸 Photo pulada via __doPostBack → ' + identifyPage(newUrl));
            return { success: true, skipped: true };
        }

        // Try alternative: click the review link directly
        const reviewLink = page.locator("a#REVIEW, a[id*='REVIEW'], a[href*='Review']").first();
        if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
            await reviewLink.click();
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            await waitForPageReady(page);
            console.log('[Filler] 📸 Photo pulada via REVIEW link → ' + identifyPage(page.url()));
            return { success: true, skipped: true };
        }
    } catch (e) {
        console.warn('[Filler] __doPostBack falhou:', e.message);
    }

    return { success: false, skipped: false, error: 'Photo page: não conseguiu pular ou fazer upload de foto' };
}

module.exports = { handlePhotoPage };
