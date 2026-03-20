// pages/generic-page.js — Módulo genérico que preenche qualquer página DS-160
// Usa field-map.js para mapeamento + helpers para preenchimento
'use strict';
const { waitForPostback, waitForPageReady, discoverFields, sleep } = require('../helpers/postback');
const { humanClick, humanScroll, humanDelay, thinkingPause, maybeRandomScroll } = require('../helpers/human-behavior');
const { isSelectEmpty, fillText, fillTextBatch, fillSelect, fillRadio, fillCheckbox } = require('../helpers/fill-field');
const { clickAddAnother } = require('../helpers/add-another');
const { verifyPageFields, getValidationErrors } = require('../helpers/verify');
const { isPostbackSelect, isPostbackClick } = require('../field-map');

// Regex para IDs que devem ser ignorados
const SKIP_PATTERN = /HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder/;

/**
 * Pre-computa um mapa ID→entry para evitar O(n×m) regex matching.
 * Chamado UMA VEZ por página, reutilizado em todos os passes.
 */
function buildFieldIndex(fieldMap, visibleFields) {
    const index = new Map(); // fieldId → fieldMap entry
    for (const field of visibleFields) {
        if (!field.id || SKIP_PATTERN.test(field.id)) continue;
        for (const entry of fieldMap) {
            if (entry.pattern.test(field.id)) {
                index.set(field.id, entry);
                break; // 1 match por campo
            }
        }
    }
    return index;
}

/**
 * Preenche uma página DS-160 inteira usando as 4 fases:
 * 1. Postback clicks (condicionais)
 * 2. Postback selects (condicionais)
 * 2.5. Add Another (listas dinâmicas)
 * 3. Non-postback selects/clicks/checkboxes/radios
 * 4. Text fields (batch para normais, locator.fill para críticos)
 */
async function fillPage(page, fieldMap, options = {}) {
    const { maxPasses = 10 } = options;
    await waitForPageReady(page);
    // Random scroll before filling — 30% chance, simulates reading/browsing
    await maybeRandomScroll(page);
    const pageStart = Date.now();
    let pass = 0, needsRescan = true;
    const postbackLog = [];
    const addAnotherClicked = new Set();
    const postbackSelectsFilled = new Set();

    while (needsRescan && pass < maxPasses) {
        const result = await _fillPass(page, fieldMap, pass, addAnotherClicked, postbackSelectsFilled);
        needsRescan = result.needsRescan;
        if (result.postbackField) postbackLog.push(result.postbackField);
        pass++;
    }

    // ======================== CLEANUP: Remove empty DataList entries ========================
    // DS-160 auto-creates empty rows; find empty inputs inside DataLists and click their Remove
    const removedCount = await page.evaluate(() => {
        let removed = 0;
        // Find all visible text inputs that are empty and inside a DataList (id contains "dtl" or "DList")
        const allInputs = document.querySelectorAll('input[type="text"]');
        for (const inp of allInputs) {
            if (inp.offsetParent === null || inp.disabled) continue;
            if (inp.value && inp.value.trim() !== '') continue;
            // Check if this input is inside a repeating list entry
            if (!inp.id || !(inp.id.includes('dtl') || inp.id.includes('DList'))) continue;
            // Walk up to find the Remove/Delete link in the same container
            let container = inp.parentElement;
            for (let i = 0; i < 15 && container; i++) {
                const removeLink = container.querySelector('a[id*="DeleteButton"], a[id*="RemoveButton"]');
                if (removeLink) {
                    removeLink.click();
                    removed++;
                    break;
                }
                // Also look for plain text "Remove" links
                const allLinks = container.querySelectorAll('a');
                let foundRemove = false;
                for (const a of allLinks) {
                    if (a.textContent.trim() === 'Remove' || a.textContent.trim() === 'Delete') {
                        a.click();
                        removed++;
                        foundRemove = true;
                        break;
                    }
                }
                if (foundRemove) break;
                container = container.parentElement;
            }
        }
        return removed;
    }).catch(() => 0);
    if (removedCount > 0) {
        console.log(`[Page] 🧹 Removed ${removedCount} empty DataList entries`);
        await waitForPostback(page);
    }

    const elapsed = ((Date.now() - pageStart) / 1000).toFixed(1);
    if (postbackLog.length > 0) {
        console.log(`[Page] Postbacks: ${postbackLog.join(' → ')}`);
    }

    // Detect empty fields
    const emptyCheck = await verifyPageFields(page);
    if (!emptyCheck.ok) {
        console.warn(`[Page] ⚠️ ${emptyCheck.empty.length} vazios após ${pass} passes`);
    }
    console.log(`[Page] Preenchida em ${pass} passes [${elapsed}s]${!emptyCheck.ok ? ` — ${emptyCheck.empty.length} vazios` : ' ✅'}`);
    return { passes: pass, postbackLog, elapsed: parseFloat(elapsed), emptyFields: emptyCheck.empty };
}

/**
 * Verifica se a página está corretamente preenchida e pronta para Next.
 */
async function verifyPage(page) {
    const check = await verifyPageFields(page);
    const errors = await getValidationErrors(page);
    return {
        ok: check.ok && errors.length === 0,
        empty: check.empty,
        validationErrors: errors
    };
}

// ==================== INTERNAL: Single Fill Pass ====================

async function _fillPass(page, fieldMap, passNum, addAnotherClicked, postbackSelectsFilled) {
    // Smooth scroll to force rendering + simulate human scanning
    await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }).catch(() => { });
    await humanDelay(400, 800);
    await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(() => { });
    await humanDelay(300, 600);

    const fields = await discoverFields(page);
    const visible = fields.filter(f => f.visible && f.id);
    let postbackNeeded = false, filled = 0;
    let postbackField = null;
    const fieldsBeforeCount = visible.length;

    // Pre-compute match index (feito UMA VEZ por pass, evita O(n×m) nas 4 fases)
    const matchIndex = buildFieldIndex(fieldMap, visible);

    // ======================== PHASE 1: Postback Clicks ========================
    // DEBUG: count candidates at each filter step
    let p1_total = 0, p1_matched = 0, p1_click = 0, p1_postback = 0, p1_unchecked = 0;
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        p1_total++;
        const match = matchIndex.get(field.id);
        if (!match || match.type !== 'click') continue;
        p1_matched++;
        if (!isPostbackClick(field.id, field.type)) continue;
        p1_postback++;
        if (field.checked) continue;
        p1_unchecked++;

        const loc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);
        try {
            if (!await loc.isVisible({ timeout: 300 }).catch(() => false)) continue;
            await humanClick(page, loc);
            filled++;
            postbackNeeded = true;
            postbackField = field.id;
            console.log(`[Page] Phase1 ✅ Clicked postback: ${field.id.split('_').pop()}`);
            break; // 1 postback por vez
        } catch (e) { console.warn(`[Page] Phase1 error: ${field.id}`, e.message); }
    }
    console.log(`[Page] Phase1 debug: ${p1_total} visible, ${p1_matched} click-matched, ${p1_postback} postback, ${p1_unchecked} unchecked${postbackNeeded ? ' → POSTBACK!' : ' → no postback'}`);
    // Wait for postback to complete after Phase 1 click
    if (postbackNeeded) {
        await waitForPostback(page);
    }

    // ======================== PHASE 2: Postback Selects ========================
    if (!postbackNeeded) {
        for (const field of visible) {
            if (!field.id || field.tag !== 'select') continue;
            if (!isPostbackSelect(field.id)) continue;
            const match = matchIndex.get(field.id);
            if (!match) continue;
            if (!isSelectEmpty(field.value)) continue;
            if (postbackSelectsFilled.has(field.id)) continue; // prevent infinite loop

            try {
                await humanDelay(200, 400);
                const ok = await fillSelect(page, field.id, match.value, match.type);
                if (ok) {
                    filled++;
                    postbackNeeded = true;
                    postbackField = field.id;
                    postbackSelectsFilled.add(field.id);
                    break;
                }
            } catch (e) { console.warn(`[Page] Phase2 error: ${field.id}`, e.message); }
        }
    }

    // Se postback necessário: espera e rescanneia
    if (postbackNeeded) {
        console.log(`[Page] Pass ${passNum} — postback: ${postbackField}`);
        await waitForPostback(page);
        return { needsRescan: true, postbackField };
    }

    // ======================== PHASE 2.5: Add Another ========================
    const addAnotherEntries = fieldMap.filter(m => m.addAnother);
    if (addAnotherEntries.length > 0) {
        const pendingByList = {};
        // Group entries by list:idx — only need AddAnother if NO field for this ctl exists
        const checkedCtls = new Set();
        for (const entry of addAnotherEntries) {
            const listName = entry.addAnother.list;
            const idx = entry.addAnother.idx;
            const trackKey = `${listName}:${idx}`;
            if (addAnotherClicked.has(trackKey)) continue;
            if (checkedCtls.has(trackKey)) continue;
            checkedCtls.add(trackKey);
            // Check if ANY field with this ctl index exists in DOM for this list
            const ctlStr = `_ctl${String(idx).padStart(2, '0')}_`;
            const ctlExists = visible.some(f => f.id && f.id.includes(listName) && f.id.includes(ctlStr));
            if (!ctlExists) {
                if (!pendingByList[listName] || idx < pendingByList[listName].addAnother.idx) {
                    pendingByList[listName] = entry;
                }
            }
        }

        for (const [listName, entry] of Object.entries(pendingByList)) {
            const trackKey = `${listName}:${entry.addAnother.idx}`;
            const listClickCount = [...addAnotherClicked].filter(k => k.startsWith(listName + ':')).length;
            if (listClickCount >= 5) {
                addAnotherClicked.add(trackKey);
                continue;
            }

            // Guard simplificado: só verifica se ctl00 existe no DOM
            const prevIdx = entry.addAnother.idx - 1;
            const prevCtl = `_ctl${String(prevIdx).padStart(2, '0')}_`;
            const prevExists = visible.some(f => f.id && f.id.includes(listName) && f.id.includes(prevCtl));
            if (!prevExists && prevIdx > 0) continue;

            console.log(`[Page] 📋 Add Another: "${listName}" (idx ${entry.addAnother.idx})`);
            const ok = await clickAddAnother(page, listName, entry.addAnother.idx);
            addAnotherClicked.add(trackKey);

            if (ok) {
                return { needsRescan: true, postbackField: `AddAnother:${listName}` };
            }
        }
    }

    // ======================== PHASE 3: Non-postback Fields ========================
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        const match = matchIndex.get(field.id);
        if (!match) continue;
        if (match.type === 'text') continue; // Phase 4

        try {
            switch (match.type) {
                case 'select':
                case 'select-label':
                case 'select-search':
                    if (!isSelectEmpty(field.value)) continue;
                    await humanDelay(100, 300);
                    if (await fillSelect(page, field.id, match.value, match.type)) filled++;
                    break;
                case 'click':
                    if (field.checked) continue;
                    const clickLoc = page.locator(`#${field.id.replace(/\$/g, '\\$')}`);
                    if (await clickLoc.isVisible({ timeout: 300 }).catch(() => false)) {
                        await humanClick(page, clickLoc);
                        filled++;
                    }
                    break;
                case 'checkbox-check':
                    if (field.checked) continue;
                    if (await fillCheckbox(page, field.id)) filled++;
                    break;
                case 'radio':
                    if (await fillRadio(page, field.id, match.value)) filled++;
                    break;
            }
        } catch (e) { console.warn(`[Page] Phase3 error: ${field.id}`, e.message); }
    }

    // ======================== PHASE 4: Text Fields (Hybrid) ========================
    const textBatch = [];
    for (const field of visible) {
        if (!field.id) continue;
        if (field.type === 'submit' || field.type === 'image' || field.type === 'button') continue;
        const match = matchIndex.get(field.id);
        if (!match || match.type !== 'text') continue;
        if (field.value && field.value.trim() !== '') continue;
        if (match.value == null) continue;
        textBatch.push({ id: field.id, value: String(match.value).trim() });
    }

    if (textBatch.length > 0) {
        // Campos críticos: locator.fill (dispara blur/validators ASP.NET)
        const CRITICAL = /Address|Street|City|Phone|Payer|Employer|Salary|Income|Occupation/i;
        const criticalBatch = textBatch.filter(f => CRITICAL.test(f.id));
        const normalBatch = textBatch.filter(f => !CRITICAL.test(f.id));

        for (const { id, value } of criticalBatch) {
            try {
                if (await fillText(page, id, value)) filled++;
            } catch (e) { console.warn(`[Page] Phase4 critical: ${id}`, e.message); }
        }

        // Campos normais: batch evaluate (rápido)
        if (normalBatch.length > 0) {
            await thinkingPause();
            const batchFilled = await fillTextBatch(page, normalBatch);
            filled += batchFilled;
        }
    }

    console.log(`[Page] Pass ${passNum} — ${filled}/${visible.length} preenchidos${postbackNeeded ? ` (postback: ${postbackField?.split('_').pop()})` : ''}`);
    return { needsRescan: postbackNeeded, postbackField };
}

module.exports = { fillPage, verifyPage };
