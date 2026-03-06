// helpers/postback.js — Utilitários de espera ASP.NET compartilhados
'use strict';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Espera o ASP.NET PageRequestManager terminar o postback assíncrono,
 * depois estabiliza a contagem de campos visíveis.
 * OTIMIZADO: timeout 3s, estabilização rápida 80ms polling.
 */
async function waitForPostback(page, timeout = 3000) {
    const start = Date.now();
    // 1. Espera ASP.NET terminar (timeout reduzido de 8s → 3s)
    await page.waitForFunction(() => {
        const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return !mgr || !mgr.get_isInAsyncPostBack();
    }, { timeout }).catch(() => { });

    await sleep(50); // Buffer mínimo pós-async (era 150ms)

    // 2. Estabiliza contagem de campos (polling rápido 80ms)
    const countFields = () => page.evaluate(() => {
        let c = 0;
        document.querySelectorAll('select, input:not([type="hidden"]), textarea').forEach(el => {
            if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
        });
        return c;
    }).catch(() => 0);

    const initial = await countFields();
    let last = initial, stable = 0;
    while (Date.now() - start < 2000) { // Estabilização max 2s (era 3s)
        await sleep(80); // Polling 80ms (era 150ms)
        const cur = await countFields();
        if (cur !== initial && cur === last) { stable += 80; if (stable >= 160) break; } // Estável após 160ms (era 300ms)
        else if (cur === initial && Date.now() - start > 400) break; // Fast exit se nada mudou (era 800ms)
        else stable = 0;
        last = cur;
    }
}

/**
 * Espera a página estar pronta (campos visíveis > 0, sem postback ativo).
 * OTIMIZADO: evaluate único, polling 100ms, timeout 2s.
 */
async function waitForPageReady(page, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        // Evaluate ÚNICO: scroll + count + postback check (era 3 round-trips separados)
        const { count, inPB } = await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            window.scrollTo(0, 0);
            let c = 0;
            document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach(el => {
                if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
            });
            const m = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
            return { count: c, inPB: m?.get_isInAsyncPostBack?.() || false };
        }).catch(() => ({ count: 0, inPB: false }));

        if (count > 0 && !inPB && (count >= 3 || Date.now() - start > 800)) return count;
        await sleep(100); // Polling 100ms (era 200ms)
    }
    return 0;
}

/**
 * Espera a URL mudar e entonces espera a nova página ficar pronta.
 * OTIMIZADO: polling 150ms, timeout 4s.
 */
async function waitForUrlChange(page, urlBefore, timeout = 4000) {
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < timeout) {
        await sleep(150); // Polling 150ms (era 300ms)
    }
    await waitForPageReady(page);
}

/**
 * Descobre todos os campos visíveis na página.
 */
async function discoverFields(page) {
    return page.evaluate(() => {
        const fields = [];
        document.querySelectorAll('select').forEach(sel => {
            if (sel.id.includes('ddlLanguage')) return;
            fields.push({ tag: 'select', id: sel.id, visible: sel.offsetParent !== null, value: sel.value, optCount: sel.options.length });
        });
        document.querySelectorAll('input').forEach(inp => {
            if (inp.type === 'hidden') return;
            fields.push({ tag: 'input', id: inp.id, type: inp.type, visible: inp.offsetParent !== null || inp.type === 'radio' || inp.type === 'checkbox', value: inp.value, checked: inp.checked });
        });
        document.querySelectorAll('textarea').forEach(ta => {
            fields.push({ tag: 'textarea', id: ta.id, visible: ta.offsetParent !== null, value: ta.value });
        });
        return fields;
    });
}

module.exports = { sleep, waitForPostback, waitForPageReady, waitForUrlChange, discoverFields };
