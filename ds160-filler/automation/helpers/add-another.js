// helpers/add-another.js — Lógica de Add Another com retry + waitForSelector
'use strict';
const { waitForPostback, sleep } = require('./postback');

/**
 * Clica em "Add Another" ou "InsertButton" para uma lista específica do DS-160,
 * depois espera o novo entry aparecer no DOM.
 *
 * @param {Page} page - Playwright page
 * @param {string} listName - Nome da DataList no DS-160 (ex: 'DListAlias', 'dtlOTHER_NATL')
 * @param {number} targetIdx - Index do entry que deve aparecer (ex: 1 para ctl01)
 * @returns {boolean} true se o novo entry apareceu
 */
async function clickAddAnother(page, listName, targetIdx) {
    const targetCtl = `_ctl${String(targetIdx).padStart(2, '0')}_`;
    const targetSelector = `[id*="${listName}"][id*="${targetCtl}"]`;
    let clicked = false;

    // Strategy 1: InsertButton (para Permanent Resident e entries ctl01+)
    try {
        const insertBtns = await page.locator(`[id*="${listName}"][id*="InsertButton"]`).all();
        for (let i = insertBtns.length - 1; i >= 0; i--) {
            const btn = insertBtns[i];
            if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                await btn.click();
                const btnId = await btn.getAttribute('id').catch(() => '');
                console.log(`[AddAnother] ✅ InsertButton clicado: ${btnId}`);
                await waitForPostback(page);
                clicked = true;
                break;
            }
        }
    } catch (e) { console.warn(`[AddAnother] InsertButton error: ${e.message}`); }

    // Strategy 2: "Add Another" link próximo à DataList
    if (!clicked) {
        try {
            const addLinks = await page.locator(`a:has-text("Add Another")`).all();
            for (const link of addLinks) {
                if (!await link.isVisible({ timeout: 500 }).catch(() => false)) continue;
                const nearList = await link.evaluate((el, ln) => {
                    let parent = el.parentElement;
                    for (let i = 0; i < 10 && parent; i++) {
                        if (parent.querySelector(`[id*="${ln}"]`)) return true;
                        parent = parent.parentElement;
                    }
                    return false;
                }, listName).catch(() => false);

                if (nearList) {
                    await link.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                    await link.click();
                    console.log(`[AddAnother] ✅ "Add Another" link clicado para "${listName}"`);
                    await waitForPostback(page);
                    clicked = true;
                    break;
                }
            }
        } catch (e) { console.warn(`[AddAnother] link error: ${e.message}`); }
    }

    // Strategy 3: "Add Another" genérico (último recurso)
    if (!clicked) {
        try {
            const genericAdd = page.getByRole('link', { name: 'Add Another' }).first();
            if (await genericAdd.isVisible({ timeout: 500 }).catch(() => false)) {
                await genericAdd.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                await genericAdd.click();
                console.log(`[AddAnother] ✅ "Add Another" genérico clicado para "${listName}"`);
                await waitForPostback(page);
                clicked = true;
            }
        } catch (e) { console.warn(`[AddAnother] generic error: ${e.message}`); }
    }

    if (!clicked) {
        console.error(`[AddAnother] ❌ Nenhum botão/link encontrado para "${listName}"`);
        return false;
    }

    // Espera o novo entry aparecer com retry
    try {
        await page.waitForSelector(targetSelector, { state: 'visible', timeout: 4000 });
        console.log(`[AddAnother] ✅ Entry ${targetCtl} detectado para "${listName}"`);
        return true;
    } catch {
        // Retry: re-clica e espera de novo
        console.warn(`[AddAnother] ⚠️ Timeout ${targetSelector} — retry`);
        const retryBtn = page.locator(`[id*="${listName}"][id*="InsertButton"]`).last();
        if (await retryBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await retryBtn.click();
        } else {
            const retryLink = page.getByRole('link', { name: 'Add Another' }).first();
            if (await retryLink.isVisible({ timeout: 500 }).catch(() => false)) {
                await retryLink.click();
            }
        }
        await waitForPostback(page);

        try {
            await page.waitForSelector(targetSelector, { state: 'visible', timeout: 4000 });
            console.log(`[AddAnother] ✅ Retry OK: ${targetCtl} para "${listName}"`);
            return true;
        } catch {
            console.error(`[AddAnother] ❌ Falhou após retry: ${targetSelector}`);
            return false;
        }
    }
}

module.exports = { clickAddAnother };
