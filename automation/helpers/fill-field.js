// helpers/fill-field.js — Preenchimento de campos individual e por lotes
'use strict';
const { humanFillText, humanFillTextBatch, humanScroll, humanDelay } = require('./human-behavior');

/**
 * Verifica se um valor de select é "vazio" (não selecionado).
 */
function isSelectEmpty(val) {
    if (!val || val === '' || val === '-1') return true;
    if (val === 'SONE') return true; // DS-160 "- Select One -" value code
    if (/^\s*$/.test(val)) return true;
    if (/select|selecione|choose/i.test(val)) return true;
    return false;
}

/**
 * Preenche um campo de texto usando Playwright nativo (dispara blur/validators ASP.NET).
 */
async function fillText(page, fieldId, value) {
    return humanFillText(page, fieldId, value);
}

/**
 * Preenche um campo de texto via evaluate (rápido, sem round-trip por campo).
 * Usado para campos que não precisam de blur/validator nativo.
 */
async function fillTextBatch(page, entries) {
    return humanFillTextBatch(page, entries);
}

/**
 * Seleciona uma opção em um <select>.
 * Estratégia: valor direto → label exato → label parcial (fuzzy).
 */
async function fillSelect(page, fieldId, value, type = 'select') {
    const loc = page.locator(`#${fieldId.replace(/\$/g, '\\$')}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;
    await humanScroll(page, loc);
    await humanDelay(80, 200);

    if (type === 'select-search' || type === 'select-label') {
        // Busca fuzzy: exato → parcial → por value
        const allOpts = await loc.evaluate(sel =>
            Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
        );
        let found = allOpts.find(o => o.t.toUpperCase() === String(value).toUpperCase());
        if (!found) found = allOpts.find(o => o.t.toUpperCase().includes(String(value).toUpperCase()));
        if (!found) found = allOpts.find(o => o.v?.toUpperCase() === String(value).toUpperCase());
        if (!found) found = allOpts.find(o => o.v?.toUpperCase().includes(String(value).toUpperCase()));
        if (found) {
            await loc.selectOption(found.v);
            return true;
        }
        console.warn(`[Fill] ❌ SELECT SEM MATCH: ${fieldId} — "${value}". Opções: ${allOpts.slice(0, 5).map(o => o.t).join(', ')}...`);
        return false;
    }

    // Padrão: tenta por valor, depois por label, depois auto-conversão (pad/month)
    const MONTH_ABBREV = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const MONTH_SET = new Set(MONTH_ABBREV);
    const strVal = String(value).trim();

    try { await loc.selectOption(strVal); return true; }
    catch {
        try { await loc.selectOption({ label: strVal }); return true; }
        catch {
            // Auto-pad numeric day: "5" → "05" (DS-160 Day selects use "01"-"31")
            const num = parseInt(strVal, 10);
            if (!isNaN(num) && num >= 1 && num <= 31) {
                const padded = String(num).padStart(2, '0');
                if (padded !== strVal) {
                    try { await loc.selectOption(padded); return true; }
                    catch { /* fall through */ }
                }
            }
            // Auto-convert numeric month (1-12, 01-12) to DS-160 abbreviation (JAN-DEC)
            if (!isNaN(num) && num >= 1 && num <= 12) {
                const abbrev = MONTH_ABBREV[num - 1];
                try { await loc.selectOption(abbrev); return true; }
                catch { /* fall through */ }
            }
            // Auto-convert abbreviation to numeric (fallback)
            const upper = strVal.toUpperCase();
            if (MONTH_SET.has(upper)) {
                const idx = MONTH_ABBREV.indexOf(upper) + 1;
                try { await loc.selectOption(String(idx)); return true; }
                catch {
                    try { await loc.selectOption(String(idx).padStart(2, '0')); return true; }
                    catch { /* fall through */ }
                }
            }
            // Log diagnóstico quando todos os attempts falham
            try {
                const opts = await loc.evaluate(sel => Array.from(sel.options).slice(0, 8).map(o => `${o.value}="${o.text}"`).join(', '));
                console.warn(`[Fill] ❌ SELECT FALHOU: ${fieldId} — valor="${strVal}". Options: ${opts}`);
            } catch { console.warn(`[Fill] ❌ SELECT FALHOU: ${fieldId} — valor="${strVal}"`); }
            return false;
        }
    }
}

/**
 * Clica em um radio button.
 * DS-160: id$='_0' = Yes(Y), id$='_1' = No(N).
 */
async function fillRadio(page, fieldId, value) {
    const suffix = value === 'Y' ? '_0' : '_1';
    const baseId = fieldId.replace(/_(0|1)$/, '');
    const targetId = baseId + suffix;
    const loc = page.locator(`#${targetId.replace(/\$/g, '\\$')}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;
    const alreadyChecked = await loc.isChecked().catch(() => false);
    if (!alreadyChecked) {
        await humanScroll(page, loc);
        await humanDelay(50, 150);
        await loc.click();
    }
    return true;
}

/**
 * Marca um checkbox.
 */
async function fillCheckbox(page, fieldId) {
    const loc = page.locator(`#${fieldId.replace(/\$/g, '\\$')}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;
    const alreadyChecked = await loc.isChecked().catch(() => false);
    if (!alreadyChecked) {
        await humanScroll(page, loc);
        await humanDelay(50, 150);
        await loc.check();
    }
    return true;
}

module.exports = { isSelectEmpty, fillText, fillTextBatch, fillSelect, fillRadio, fillCheckbox };
