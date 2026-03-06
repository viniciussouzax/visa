// pages/travel-page.js — Handler especializado para a página Travel
// Elimina esperas desnecessárias fazendo postbacks sequenciais direto via JS
'use strict';
const { waitForPostback, waitForPageReady } = require('../helpers/postback');
const { fillSelect } = require('../helpers/fill-field');

/**
 * Preenche a página Travel de forma otimizada.
 * Em vez de um loop genérico de 4 fases com rescan a cada postback,
 * usa conhecimento prévio da estrutura para postbacks sequenciais mínimos.
 *
 * @param {object} page - Playwright page
 * @param {Array} fieldMap - fieldMap (não usado diretamente, mantido por compatibilidade)
 * @param {object} profile - Resultado de normalizeProfile(data)
 */
async function fillTravelPage(page, fieldMap, profile) {
    const start = Date.now();
    await waitForPageReady(page);

    const t = profile.travel || {};
    const hasSpecific = profile.hasSpecificPlans;

    // ================================================================
    // FASE 1: Postback selects em cadeia (sequência conhecida)
    // ================================================================

    // 1a. PurposeOfTrip (POSTBACK) — usa purposeCategory (B, F, J...) não purposeOfTrip (B1/B2)
    if (profile.purposeCategory) {
        await setSelectIfNeeded(page, 'ddlPurposeOfTrip', profile.purposeCategory, true);
    }

    // 1b. OtherPurpose / Visa SubCategory (POSTBACK)
    if (profile.purposeSubCategory) {
        await setSelectIfNeeded(page, 'ddlOtherPurpose', profile.purposeSubCategory, true);
    }

    // 1c. SpecificTravel (POSTBACK) — Yes/No
    const specificRadioSuffix = hasSpecific ? 'rblSpecificTravel_0' : 'rblSpecificTravel_1';
    const specificRadio = page.locator(`[id$='${specificRadioSuffix}']`).first();
    if (await specificRadio.isVisible({ timeout: 500 }).catch(() => false)) {
        if (!await specificRadio.isChecked().catch(() => false)) {
            await specificRadio.click();
            await waitForPostback(page);
        }
    }

    // ================================================================
    // FASE 2: TODOS os campos de texto + selects simples em 1 evaluate
    // ================================================================
    const textBatch = [];
    const selectBatch = [];

    if (hasSpecific && t.arrivalDate) {
        // Caminho A: Planos Específicos
        selectBatch.push({ suffix: 'ddlARRIVAL_US_DTEDay', value: String(t.arrivalDate.day) });
        selectBatch.push({ suffix: 'ddlARRIVAL_US_DTEMonth', value: t.arrivalDate.month });
        textBatch.push({ suffix: 'tbxARRIVAL_US_DTEYear', value: t.arrivalDate.year });

        if (t.arrivalFlight) textBatch.push({ suffix: 'tbxArriveFlight', value: t.arrivalFlight });
        if (t.arrivalCity) textBatch.push({ suffix: 'tbxArriveCity', value: t.arrivalCity });

        if (t.departureDate) {
            selectBatch.push({ suffix: 'ddlDEPARTURE_US_DTEDay', value: String(t.departureDate.day) });
            selectBatch.push({ suffix: 'ddlDEPARTURE_US_DTEMonth', value: t.departureDate.month });
            textBatch.push({ suffix: 'tbxDEPARTURE_US_DTEYear', value: t.departureDate.year });
        }
        if (t.departureFlight) textBatch.push({ suffix: 'tbxDepartFlight', value: t.departureFlight });
        if (t.departureCity) textBatch.push({ suffix: 'tbxDepartCity', value: t.departureCity });

        // First travel location
        const locs = profile.specificLocations || [];
        if (locs.length > 0) {
            textBatch.push({ suffix: 'tbxSPECTRAVEL_LOCATION', value: locs[0] });
        }
    } else if (t.arrivalDate) {
        // Caminho B: Sem Planos Específicos
        selectBatch.push({ suffix: 'ddlTRAVEL_DTEDay', value: String(t.arrivalDate.day) });
        selectBatch.push({ suffix: 'ddlTRAVEL_DTEMonth', value: t.arrivalDate.month });
        textBatch.push({ suffix: 'tbxTRAVEL_DTEYear', value: t.arrivalDate.year });

        if (t.lengthOfStay?.value) textBatch.push({ suffix: 'tbxTRAVEL_LOS', value: String(t.lengthOfStay.value) });
    }

    // US Address
    if (t.usAddress) {
        const ua = t.usAddress;
        if (ua.street1) textBatch.push({ suffix: 'tbxStreetAddress1', value: ua.street1 });
        if (ua.street2) textBatch.push({ suffix: 'tbxStreetAddress2', value: ua.street2 });
        if (ua.city) textBatch.push({ suffix: 'tbxCity', value: ua.city });
        if (ua.state) selectBatch.push({ suffix: 'ddlTravelState', value: ua.state });
        if (ua.zip) textBatch.push({ suffix: 'tbZIPCode', value: ua.zip });
    }

    // Execute selects simples (sem postback) via Playwright
    for (const { suffix, value } of selectBatch) {
        if (!value) continue;
        const sel = page.locator(`[id$='${suffix}']`).first();
        try {
            if (await sel.isVisible({ timeout: 300 }).catch(() => false)) {
                await sel.selectOption(String(value)).catch(() =>
                    fillSelect(page, suffix, String(value), 'select-search')
                );
            }
        } catch { }
    }

    // Execute TODOS os textos em 1 evaluate (ZERO round-trips individuais)
    if (textBatch.length > 0) {
        await page.evaluate((batch) => {
            batch.forEach(({ suffix, value }) => {
                const el = document.querySelector(`[id$='${suffix}']`);
                if (el && (!el.value || el.value.trim() === '')) {
                    try {
                        const proto = el.tagName === 'TEXTAREA'
                            ? window.HTMLTextAreaElement.prototype
                            : window.HTMLInputElement.prototype;
                        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                        if (setter) setter.call(el, String(value));
                        else el.value = String(value);
                    } catch { el.value = String(value); }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                }
            });
        }, textBatch);
    }

    // ================================================================
    // FASE 3: LOS Unit (POSTBACK, só no caminho B)
    // ================================================================
    if (!hasSpecific && t.lengthOfStay?.unit) {
        await setSelectIfNeeded(page, 'ddlTRAVEL_LOS_CD', t.lengthOfStay.unit, true);
    }

    // ================================================================
    // FASE 4: WhoIsPaying (POSTBACK) + campos condicionais
    // ================================================================
    if (profile.payingForTrip) {
        await setSelectIfNeeded(page, 'ddlWhoIsPaying', profile.payingForTrip, true);
    }

    // Preencher campos condicionais do pagador
    const payer = profile.payer;
    if (payer && ['O', 'C', 'P', 'U'].includes(profile.payingForTrip)) {
        const payerTexts = [];

        if (profile.payingForTrip === 'O') {
            // Other Person
            if (payer.surname) payerTexts.push({ suffix: 'tbxPayerSurname', value: payer.surname });
            if (payer.givenName) payerTexts.push({ suffix: 'tbxPayerGivenName', value: payer.givenName });
            if (payer.phone) payerTexts.push({ suffix: 'tbxPayerPhone', value: payer.phone });
            // email null = DNA cleaned by normalizeProfile → need DNA checkbox
            if (payer.email) {
                payerTexts.push({ suffix: 'tbxPAYER_EMAIL_ADDR', value: payer.email });
            } else {
                // Email is DNA/null → click the "Does Not Apply" checkbox
                const dnaEmail = page.locator("[id$='cbxDNAPAYER_EMAIL_ADDR_NA']").first();
                if (await dnaEmail.isVisible({ timeout: 300 }).catch(() => false)) {
                    if (!await dnaEmail.isChecked().catch(() => false)) {
                        await dnaEmail.click();
                        await waitForPostback(page);
                    }
                }
            }
        } else if (['C', 'P', 'U'].includes(profile.payingForTrip)) {
            // Company/Organization
            if (payer.companyName) payerTexts.push({ suffix: 'tbxPayingCompany', value: payer.companyName });
            if (payer.companyPhone || payer.phone) payerTexts.push({ suffix: 'tbxPayerPhone', value: payer.companyPhone || payer.phone });
            if (payer.companyRelation) payerTexts.push({ suffix: 'tbxCompanyRelation', value: payer.companyRelation });
        }

        // Batch preencher textos do pagador
        if (payerTexts.length > 0) {
            await page.evaluate((batch) => {
                batch.forEach(({ suffix, value }) => {
                    const el = document.querySelector(`[id$='${suffix}']`);
                    if (el && (!el.value || el.value.trim() === '')) {
                        try {
                            const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                            if (setter) setter.call(el, String(value)); else el.value = String(value);
                        } catch { el.value = String(value); }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new Event('blur', { bubbles: true }));
                    }
                });
            }, payerTexts);
        }

        // Relationship select (Other Person)
        if (profile.payingForTrip === 'O' && payer.relationship) {
            const relSel = page.locator("[id$='ddlPayerRelationship']").first();
            if (await relSel.isVisible({ timeout: 300 }).catch(() => false)) {
                await relSel.selectOption(payer.relationship).catch(() =>
                    fillSelect(page, 'ddlPayerRelationship', payer.relationship, 'select-search'));
            }
        }

        // Same Address radio (POSTBACK, Other Person only)
        if (profile.payingForTrip === 'O') {
            // sameAddress can be string "Y"/"N" or boolean
            const sameAddrRaw = payer.sameAddress;
            const sameAddr = sameAddrRaw === true || sameAddrRaw === 'Y';
            const sameRadioId = sameAddr ? 'rblPayerAddrSameAsInd_0' : 'rblPayerAddrSameAsInd_1';
            const sameRadio = page.locator(`[id$='${sameRadioId}']`).first();
            if (await sameRadio.isVisible({ timeout: 300 }).catch(() => false)) {
                if (!await sameRadio.isChecked().catch(() => false)) {
                    await sameRadio.click();
                    await waitForPostback(page);
                }
            }
        }

        // Preencher endereço do pagador (se necessário)
        const needsAddress = ['C', 'P', 'U'].includes(profile.payingForTrip) || (profile.payingForTrip === 'O' && !(payer.sameAddress === true || payer.sameAddress === 'Y'));
        if (needsAddress) {
            const addrBatch = [];
            if (payer.street1) addrBatch.push({ suffix: 'tbxPayerStreetAddress1', value: payer.street1 });
            if (payer.street2) addrBatch.push({ suffix: 'tbxPayerStreetAddress2', value: payer.street2 });
            if (payer.city) addrBatch.push({ suffix: 'tbxPayerCity', value: payer.city });
            if (payer.state) addrBatch.push({ suffix: 'tbxPayerStateProvince', value: payer.state });
            if (payer.postalCode) addrBatch.push({ suffix: 'tbxPayerPostalZIPCode', value: payer.postalCode });

            if (addrBatch.length > 0) {
                await page.evaluate((batch) => {
                    batch.forEach(({ suffix, value }) => {
                        const el = document.querySelector(`[id$='${suffix}']`);
                        if (el && (!el.value || el.value.trim() === '')) {
                            try {
                                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                                if (setter) setter.call(el, String(value)); else el.value = String(value);
                            } catch { el.value = String(value); }
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            el.dispatchEvent(new Event('blur', { bubbles: true }));
                        }
                    });
                }, addrBatch);
            }

            // Country select — usa locator por sufixo (IDs ASP.NET são longos)
            if (payer.country) {
                const countrySel = page.locator("[id$='ddlPayerCountry']").first();
                if (await countrySel.isVisible({ timeout: 500 }).catch(() => false)) {
                    const allOpts = await countrySel.evaluate(sel =>
                        Array.from(sel.options).map(o => ({ v: o.value, t: o.text }))
                    );
                    let found = allOpts.find(o => o.t.toUpperCase() === payer.country.toUpperCase());
                    if (!found) found = allOpts.find(o => o.t.toUpperCase().includes(payer.country.toUpperCase()));
                    if (!found) found = allOpts.find(o => o.v?.toUpperCase() === payer.country.toUpperCase());
                    if (found) {
                        await countrySel.selectOption(found.v);
                        console.log(`[Travel] PayerCountry: "${payer.country}" → "${found.t}"`);
                    } else {
                        console.warn(`[Travel] ❌ PayerCountry sem match: "${payer.country}". Opções: ${allOpts.slice(0, 5).map(o => o.t).join(', ')}...`);
                    }
                }
            }
        }
    }

    // ================================================================
    // FASE 5: Add Another para travel locations (se Specific = Yes)
    // ================================================================
    if (hasSpecific) {
        const locs = profile.specificLocations || [];
        for (let i = 1; i < locs.length; i++) {
            const addBtn = page.locator("[id$='InsertButtonTravelLoc']").first();
            if (await addBtn.isVisible({ timeout: 300 }).catch(() => false)) {
                await addBtn.click();
                const newCtl = `ctl${String(i).padStart(2, '0')}`;
                await page.waitForSelector(`[id*='dtlTravelLoc'][id*='${newCtl}']`, { timeout: 2000 }).catch(() => { });
                const loc = page.locator(`[id$='dtlTravelLoc_${newCtl}_tbxSPECTRAVEL_LOCATION']`).first();
                if (await loc.isVisible({ timeout: 300 }).catch(() => false)) {
                    await loc.fill(locs[i]);
                }
            }
        }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[Travel] ✅ Preenchida em ${elapsed}s (handler especializado)`);
    return { passes: 1, postbackLog: [], elapsed: parseFloat(elapsed), emptyFields: [] };
}

/**
 * Seleciona um valor num <select> apenas se necessário.
 * Se isPostback=true, espera waitForPostback após seleção.
 */
async function setSelectIfNeeded(page, idSuffix, value, isPostback = false) {
    const sel = page.locator(`[id$='${idSuffix}']`).first();
    if (!await sel.isVisible({ timeout: 500 }).catch(() => false)) return false;
    const curVal = await sel.evaluate(el => el.value).catch(() => '');
    if (curVal && curVal !== '' && curVal !== '-1') return false; // Já preenchido

    try {
        await sel.selectOption(String(value));
    } catch {
        // Fallback: fuzzy match
        try {
            await fillSelect(page, idSuffix, String(value), 'select-search');
        } catch { return false; }
    }

    if (isPostback) {
        await waitForPostback(page);
    }
    return true;
}

module.exports = { fillTravelPage };
