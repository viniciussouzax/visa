// helpers/add-another.js — Lógica de Add Another com retry + force click
'use strict';
const { waitForPostback, sleep } = require('./postback');

/**
 * Remove tooltip overlays do DS-160 que interceptam pointer events.
 * O ToolTipManager1 cria um <span id="bubble_tooltip_content"> que bloqueia clicks.
 */
async function dismissTooltip(page) {
    await page.evaluate(() => {
        // Remove tooltip overlay que intercepta pointer events
        const tooltip = document.getElementById('ctl00_ToolTipManager1');
        if (tooltip) tooltip.style.display = 'none';
        const bubble = document.getElementById('bubble_tooltip_content');
        if (bubble) {
            const parent = bubble.closest('[style]');
            if (parent) parent.style.display = 'none';
        }
        // Remove qualquer overlay com bubble_tooltip
        document.querySelectorAll('[id*="bubble_tooltip"], [id*="ToolTipManager"]').forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
        });
    }).catch(() => { });
}

/**
 * Clica em "Add Another" ou "InsertButton" para uma lista específica do DS-160,
 * depois espera o novo entry aparecer no DOM.
 * 
 * CORREÇÃO: usa { force: true } para ignorar tooltip interceptors do ASP.NET
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

    // CRITICAL: Remover tooltip que bloqueia clicks antes de qualquer tentativa
    await dismissTooltip(page);

    // Strategy 1: InsertButton (para Permanent Resident e entries ctl01+)
    try {
        const insertBtns = await page.locator(`[id*="${listName}"][id*="InsertButton"]`).all();
        for (let i = insertBtns.length - 1; i >= 0; i--) {
            const btn = insertBtns[i];
            if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
                await dismissTooltip(page); // Dismiss again after scroll
                await btn.click({ force: true }); // force: true ignora tooltip overlay
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
                    await dismissTooltip(page);
                    await link.click({ force: true });
                    console.log(`[AddAnother] ✅ "Add Another" link clicado para "${listName}"`);
                    await waitForPostback(page);
                    clicked = true;
                    break;
                }
            }
        } catch (e) { console.warn(`[AddAnother] link error: ${e.message}`); }
    }

    // Strategy 3: "Add Another" genérico via JavaScript (bypass total)
    // Cobre 3 sub-fallbacks para encontrar o botão, incluindo links .addone
    // cujo __doPostBack referencia o listName (ex: dtlLANGUAGES)
    if (!clicked) {
        try {
            const clickedViaJS = await page.evaluate((ln) => {
                // 3a: InsertButton com listName no ID
                const insertBtns = document.querySelectorAll(`a[id*="${ln}"][id*="InsertButton"]`);
                if (insertBtns.length > 0) {
                    insertBtns[insertBtns.length - 1].click();
                    return '3a-InsertButton';
                }

                // 3b: Link "Add Another" com listName no ID (ex: DListAlias)
                const allLinks = document.querySelectorAll('a');
                for (const a of allLinks) {
                    const txt = a.textContent.trim();
                    if (txt === 'Add Another' && a.id && a.id.includes(ln)) {
                        a.click();
                        return '3b-idMatch';
                    }
                }

                // 3c: Link "Add Another" / .addone cujo href/onclick contém listName via __doPostBack
                // Necessário para dtlLANGUAGES, dtlCountriesVisited, etc. cujo botão Add Another
                // NÃO tem o listName no ID, mas o __doPostBack referencia o DataList
                for (const a of allLinks) {
                    const txt = a.textContent.trim();
                    const href = a.getAttribute('href') || '';
                    const onclick = a.getAttribute('onclick') || '';
                    const isAddAnother = txt === 'Add Another' || a.classList.contains('addone');
                    const refsDataList = href.includes(ln) || onclick.includes(ln);
                    if (isAddAnother && refsDataList) {
                        a.click();
                        return '3c-doPostBack';
                    }
                }

                // 3d: Link .addone próximo (DOM parent) do container do listName
                const dataListEl = document.querySelector(`[id*="${ln}"]`);
                if (dataListEl) {
                    let parent = dataListEl.parentElement;
                    for (let i = 0; i < 10 && parent; i++) {
                        const addLink = parent.querySelector('a.addone, a[id*="InsertButton"]');
                        if (addLink) {
                            addLink.click();
                            return '3d-proximity';
                        }
                        parent = parent.parentElement;
                    }
                }

                return null;
            }, listName).catch(() => null);

            if (clickedViaJS) {
                console.log(`[AddAnother] ✅ JS click bypass (${clickedViaJS}) para "${listName}"`);
                await waitForPostback(page);
                clicked = true;
            }
        } catch (e) { console.warn(`[AddAnother] JS fallback error: ${e.message}`); }
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
        // Retry: JS click bypass e espera de novo
        console.warn(`[AddAnother] ⚠️ Timeout ${targetSelector} — retry via JS`);
        await page.evaluate((ln) => {
            const links = document.querySelectorAll(`a[id*="${ln}"][id*="InsertButton"]`);
            if (links.length > 0) links[links.length - 1].click();
        }, listName).catch(() => { });
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
