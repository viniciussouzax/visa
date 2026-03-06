// helpers/verify.js — Verificação pós-preenchimento antes de clicar Next
'use strict';

/**
 * Verifica se todos os campos visíveis foram preenchidos corretamente.
 * Retorna { ok: true } se tudo preenchido, ou { ok: false, empty: [...ids] } com os vazios.
 */
async function verifyPageFields(page) {
    const empty = await page.evaluate(() => {
        const emptyIds = [];
        // Selects vazios
        document.querySelectorAll('select').forEach(sel => {
            if (sel.offsetParent === null || sel.disabled) return;
            if (sel.id.includes('ddlLanguage')) return;
            if (!sel.value || sel.value === '' || sel.value === '-1') {
                const shortId = sel.id.split('_').pop();
                emptyIds.push(shortId);
            }
        });
        // Inputs de texto vazios
        document.querySelectorAll("input[type='text']").forEach(inp => {
            if (inp.offsetParent === null || inp.disabled) return;
            if (/HelpButton|btnWarning|btnRecover|btnCancel|btnClient|btnNextPage/.test(inp.id)) return;
            if (!inp.value || inp.value.trim() === '') {
                const shortId = inp.id.split('_').pop();
                emptyIds.push(shortId);
            }
        });
        // Textareas vazias
        document.querySelectorAll('textarea').forEach(ta => {
            if (ta.offsetParent === null || ta.disabled) return;
            if (!ta.value || ta.value.trim() === '') {
                const shortId = ta.id.split('_').pop();
                emptyIds.push(shortId);
            }
        });
        // Radio groups sem seleção (exceto Security que tem tratamento especial)
        const radioGroups = new Set();
        document.querySelectorAll("input[type='radio']").forEach(r => {
            if (r.offsetParent === null && r.type !== 'radio') return;
            if (r.name) radioGroups.add(r.name);
        });
        for (const name of radioGroups) {
            const checked = document.querySelector(`input[type='radio'][name="${name}"]:checked`);
            if (!checked) {
                const first = document.querySelector(`input[type='radio'][name="${name}"]`);
                const shortId = first?.id?.split('_').pop() || name;
                emptyIds.push(`radio:${shortId}`);
            }
        }
        return emptyIds;
    }).catch(() => []);

    if (empty.length === 0) {
        return { ok: true, empty: [] };
    }

    console.warn(`[Verify] ⚠️ ${empty.length} campos vazios: ${empty.slice(0, 8).join(', ')}${empty.length > 8 ? '...' : ''}`);
    return { ok: false, empty };
}

/**
 * Verifica se a página atual tem erros de validação do ASP.NET.
 * Retorna array de mensagens de erro, ou [] se sem erros.
 */
async function getValidationErrors(page) {
    return page.evaluate(() => {
        const errors = [];
        // ASP.NET validation summaries
        document.querySelectorAll('.validation-summary-errors li, [id*="valSummary"] li').forEach(li => {
            if (li.textContent.trim()) errors.push(li.textContent.trim());
        });
        // Individual validators
        document.querySelectorAll('[id*="RequiredFieldValidator"], [id*="rfv"], [id*="RangeValidator"]').forEach(v => {
            if (v.style.display !== 'none' && v.style.visibility !== 'hidden' && v.textContent.trim()) {
                errors.push(v.textContent.trim());
            }
        });
        return errors;
    }).catch(() => []);
}

module.exports = { verifyPageFields, getValidationErrors };
