// helpers/fill-field.js — Preenchimento de campos individual e por lotes
'use strict';

/**
 * Verifica se um valor de select é "vazio" (não selecionado).
 */
function isSelectEmpty(val) {
    if (!val || val === '' || val === '-1') return true;
    if (/^\s*$/.test(val)) return true;
    if (/select|selecione|choose/i.test(val)) return true;
    return false;
}

/**
 * Preenche um campo de texto usando Playwright nativo (dispara blur/validators ASP.NET).
 */
async function fillText(page, fieldId, value) {
    const loc = page.locator(`#${fieldId.replace(/\$/g, '\\$')}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;
    await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });
    await loc.fill(String(value).trim());
    return true;
}

/**
 * Preenche um campo de texto via evaluate (rápido, sem round-trip por campo).
 * Usado para campos que não precisam de blur/validator nativo.
 */
async function fillTextBatch(page, entries) {
    if (!entries || entries.length === 0) return 0;
    return page.evaluate((batch) => {
        let count = 0;
        batch.forEach(({ id, value }) => {
            const el = document.getElementById(id);
            if (el && (!el.value || el.value.trim() === '')) {
                try {
                    const proto = el.tagName === 'TEXTAREA'
                        ? window.HTMLTextAreaElement.prototype
                        : window.HTMLInputElement.prototype;
                    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (setter) setter.call(el, value);
                    else el.value = value;
                } catch { el.value = value; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                count++;
            }
        });
        return count;
    }, entries);
}

/**
 * Seleciona uma opção em um <select>.
 * Estratégia: valor direto → label exato → label parcial (fuzzy).
 */
async function fillSelect(page, fieldId, value, type = 'select') {
    const loc = page.locator(`#${fieldId.replace(/\$/g, '\\$')}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;
    await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => { });

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

    // Padrão: tenta por valor, depois por label
    try { await loc.selectOption(value); return true; }
    catch {
        try { await loc.selectOption({ label: value }); return true; }
        catch { return false; }
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
        await loc.check();
    }
    return true;
}

module.exports = { isSelectEmpty, fillText, fillTextBatch, fillSelect, fillRadio, fillCheckbox };
