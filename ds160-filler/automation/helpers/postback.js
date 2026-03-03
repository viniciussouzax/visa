// helpers/postback.js — Utilitários de espera ASP.NET compartilhados
'use strict';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Espera o ASP.NET PageRequestManager terminar o postback assíncrono,
 * depois estabiliza a contagem de campos visíveis.
 */
async function waitForPostback(page, timeout = 8000) {
    const start = Date.now();
    // 1. Espera ASP.NET terminar
    await page.waitForFunction(() => {
        const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        return !mgr || !mgr.get_isInAsyncPostBack();
    }, { timeout }).catch(() => { });

    await sleep(150);

    // 2. Estabiliza contagem de campos
    const countFields = () => page.evaluate(() => {
        let c = 0;
        document.querySelectorAll('select, input:not([type="hidden"]), textarea').forEach(el => {
            if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
        });
        return c;
    }).catch(() => 0);

    const initial = await countFields();
    let last = initial, stable = 0;
    while (Date.now() - start < 3000) {
        await sleep(150);
        const cur = await countFields();
        if (cur !== initial && cur === last) { stable += 150; if (stable >= 300) break; }
        else if (cur === initial && Date.now() - start > 800) break;
        else stable = 0;
        last = cur;
    }
}

/**
 * Espera a página estar pronta (campos visíveis > 0, sem postback ativo).
 * Faz scroll para forçar rendering de elementos lazy.
 */
async function waitForPageReady(page, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            window.scrollTo(0, 0);
        }).catch(() => { });

        const count = await page.evaluate(() => {
            let c = 0;
            document.querySelectorAll("select, input[type='text'], input[type='radio'], textarea").forEach(el => {
                if (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox') c++;
            });
            return c;
        }).catch(() => 0);

        if (count > 0) {
            const inPB = await page.evaluate(() => {
                const m = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
                return m?.get_isInAsyncPostBack?.() || false;
            }).catch(() => false);
            if (!inPB && (count >= 3 || Date.now() - start > 1500)) return count;
        }
        await sleep(200);
    }
    return 0;
}

/**
 * Espera a URL mudar e entonces espera a nova página ficar pronta.
 */
async function waitForUrlChange(page, urlBefore, timeout = 10000) {
    const start = Date.now();
    while (page.url() === urlBefore && Date.now() - start < timeout) {
        await sleep(300);
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
