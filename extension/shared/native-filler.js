// ==================================================================
// native-filler.js — Pure DOM filler, NO Playwright shim needed
// Reads field-map entries {pattern, value, type} and fills directly
// ==================================================================

/**
 * Fill an entire DS-160 page using a field-map array.
 * This replaces generic-page.js fillPage() without any Playwright dependency.
 */
async function nativeFillPage(fieldMap, options = {}) {
    const { maxPasses = 8 } = options;
    const start = Date.now();
    let pass = 0;
    let needsRescan = true;
    const addAnotherClicked = new Set();

    while (needsRescan && pass < maxPasses) {
        needsRescan = false;
        const visibleFields = _discoverVisibleFields();
        console.log(`[Filler] Pass ${pass}: ${visibleFields.length} campos visíveis`);

        // Phase 1: Postback clicks (radio Yes/No that trigger postback)
        for (const entry of fieldMap) {
            if (entry.type !== 'click' && entry.type !== 'radio') continue;
            const field = _findMatch(visibleFields, entry.pattern);
            if (!field) continue;
            const el = document.getElementById(field.id);
            if (!el || el.checked) continue;

            if (_isPostbackClick(field.id)) {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.click();
                console.log(`[Filler] PB-Click: ${field.id}`);
                await _waitPostback();
                needsRescan = true;
                break; // rescan after postback
            }
        }
        if (needsRescan) { pass++; continue; }

        // Phase 2: Postback selects
        for (const entry of fieldMap) {
            if (entry.type !== 'select' && entry.type !== 'select-search' && entry.type !== 'select-label') continue;
            if (!entry.value && entry.value !== 0) continue;
            const field = _findMatch(visibleFields, entry.pattern);
            if (!field) continue;
            const el = document.getElementById(field.id);
            if (!el) continue;

            if (_isPostbackSelect(field.id) && _isSelectEmpty(el.value)) {
                _fillSelectElement(el, entry.value, entry.type);
                console.log(`[Filler] PB-Select: ${field.id} = ${entry.value}`);
                await _waitPostback();
                needsRescan = true;
                break;
            }
        }
        if (needsRescan) { pass++; continue; }

        // Phase 2.5: Add Another (dynamic lists)
        for (const entry of fieldMap) {
            if (!entry.addAnother) continue;
            const key = entry.addAnother.list + '_' + entry.addAnother.idx;
            if (addAnotherClicked.has(key)) continue;
            const field = _findMatch(visibleFields, entry.pattern);
            if (field) continue; // field already visible, no need to click add
            // Need to add another entry
            const added = await _clickAddAnother(entry.addAnother.list, entry.addAnother.idx);
            if (added) {
                addAnotherClicked.add(key);
                needsRescan = true;
                break;
            }
        }
        if (needsRescan) { pass++; continue; }

        // Phase 3: Non-postback selects, clicks, checkboxes
        for (const entry of fieldMap) {
            if (entry.type === 'text' || entry.type === 'textarea') continue; // handled in phase 4
            const field = _findMatch(visibleFields, entry.pattern);
            if (!field) continue;
            const el = document.getElementById(field.id);
            if (!el) continue;

            switch (entry.type) {
                case 'select':
                case 'select-search':
                case 'select-label':
                    if (!_isPostbackSelect(field.id) && _isSelectEmpty(el.value)) {
                        _fillSelectElement(el, entry.value, entry.type);
                    }
                    break;
                case 'click':
                case 'radio':
                    if (!el.checked && !_isPostbackClick(field.id)) {
                        el.checked = true;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.click();
                    }
                    break;
                case 'checkbox-check':
                    if (!el.checked) {
                        el.checked = true;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.click();
                    }
                    break;
            }
        }

        // Phase 4: Text fields (batch fill)
        for (const entry of fieldMap) {
            if (entry.type !== 'text' && entry.type !== 'textarea') continue;
            if (!entry.value && entry.value !== 0) continue;
            const field = _findMatch(visibleFields, entry.pattern);
            if (!field) continue;
            const el = document.getElementById(field.id);
            if (!el) continue;
            if (el.value && el.value.trim() !== '') continue; // already filled

            _setInputValue(el, String(entry.value).trim());
        }

        pass++;
    }

    // Cleanup: remove empty DataList entries
    _cleanupEmptyEntries();
    
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[Filler] ✅ Done: ${pass} passes, ${elapsed}s`);
    return { passes: pass, elapsed };
}

// ─── Helpers ──────────────────────────────────────────────

function _discoverVisibleFields() {
    const fields = [];
    const SKIP = /HelpButton|btnWarning|btnRecover|btnOkWarning|btnCancel|btnClient|btnReviewPage|btnNextPage|btnModalHolder|ddlLanguage/;
    
    document.querySelectorAll('select').forEach(el => {
        if (!el.id || SKIP.test(el.id)) return;
        if (el.offsetParent === null) return;
        fields.push({ id: el.id, tag: 'select', type: 'select' });
    });
    document.querySelectorAll('input').forEach(el => {
        if (!el.id || el.type === 'hidden' || SKIP.test(el.id)) return;
        if (el.offsetParent === null && el.type !== 'radio' && el.type !== 'checkbox') return;
        fields.push({ id: el.id, tag: 'input', type: el.type });
    });
    document.querySelectorAll('textarea').forEach(el => {
        if (!el.id || SKIP.test(el.id)) return;
        if (el.offsetParent === null) return;
        fields.push({ id: el.id, tag: 'textarea', type: 'textarea' });
    });
    return fields;
}

function _findMatch(fields, pattern) {
    for (const f of fields) {
        if (pattern.test(f.id)) return f;
    }
    return null;
}

function _setInputValue(el, value) {
    el.focus();
    try {
        const proto = el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        else el.value = value;
    } catch { el.value = value; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
}

function _fillSelectElement(el, value, type) {
    const strVal = String(value).trim();
    
    if (type === 'select-search' || type === 'select-label') {
        // Fuzzy match by label
        const opts = Array.from(el.options);
        let found = opts.find(o => o.text.toUpperCase() === strVal.toUpperCase());
        if (!found) found = opts.find(o => o.text.toUpperCase().includes(strVal.toUpperCase()));
        if (!found) found = opts.find(o => o.value?.toUpperCase() === strVal.toUpperCase());
        if (found) {
            el.value = found.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            if (el.getAttribute('onchange')) {
                try { eval(el.getAttribute('onchange')); } catch {}
            }
            return true;
        }
        console.warn(`[Filler] ❌ Select sem match: ${el.id} = "${strVal}"`);
        return false;
    }

    // Direct value match
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const opts = Array.from(el.options);
    
    // Try exact value
    if (opts.some(o => o.value === strVal)) {
        el.value = strVal;
    }
    // Try padded day (5 → 05)
    else if (/^\d{1,2}$/.test(strVal)) {
        const padded = strVal.padStart(2, '0');
        if (opts.some(o => o.value === padded)) el.value = padded;
        // Try month number → abbreviation
        const num = parseInt(strVal, 10);
        if (num >= 1 && num <= 12 && opts.some(o => o.value === MONTHS[num-1])) {
            el.value = MONTHS[num-1];
        }
    }
    // Try label match
    else if (opts.find(o => o.text.trim().toUpperCase() === strVal.toUpperCase())) {
        const match = opts.find(o => o.text.trim().toUpperCase() === strVal.toUpperCase());
        el.value = match.value;
    }
    else {
        console.warn(`[Filler] ❌ Select no match: ${el.id} = "${strVal}" opts: ${opts.slice(0,5).map(o=>o.value).join(',')}`);
        return false;
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (el.getAttribute('onchange')) {
        try { eval(el.getAttribute('onchange')); } catch {}
    }
    return true;
}

// Postback IDs (from shared.js)
const _PB_SELECT = ["CNTRY","Country","PurposeOfTrip","VisaClass","OtherPurpose","Occupation","PPT_TYPE","REL_TO_APP","POC_REL","SocialMedia","MARITAL_STATUS","APP_GENDER","WhoIsPaying","PayerRelationship","SpouseNatDropDownList","SpouseAddressType","SpousePOBCountry"];
const _PB_CLICK_YES = ["PreviouslyEmployed","AttendedEduc","OtherEduc","OTH_NATL","OtherNames","TelecodeQuestion","PermResOtherCntryInd","OtherPersonsTravelingWithYou","GroupTravel","PREV_US_TRAVEL_IND","PREV_US_DRIVER_LIC_IND","PREV_VISA_IND","PREV_VISA_REFUSED_IND","IV_PETITION_IND","PERM_RESIDENT_IND","VWP_DENIAL_IND","AddPhone","AddEmail","AddSocial","AddSite","LOST_PPT_IND","FATHER_LIVE_IN_US_IND","MOTHER_LIVE_IN_US_IND","CLAN_TRIBE_IND","COUNTRIES_VISITED_IND","ORGANIZATION_IND","SPECIALIZED_SKILLS_IND","MILITARY_SERVICE_IND","INSURGENT_ORG_IND","OTHER_PPT_IND","PayerAddrSameAsInd","PREV_VISA_LOST","PREV_VISA_CANCELLED","OTHER_RELATIVE_IND"];
const _PB_CLICK_ANY = ["SpecificTravel","IMMED_RELATIVE","MailingAddrSame","MailingAddr"];

function _isPostbackSelect(id) { return _PB_SELECT.some(t => id.includes(t)); }
function _isPostbackClick(id) { return _PB_CLICK_YES.some(t => id.includes(t)) || _PB_CLICK_ANY.some(t => id.includes(t)); }
function _isSelectEmpty(val) {
    if (!val || val === '' || val === '-1') return true;
    if (val === 'SONE') return true;
    if (/^\s*$/.test(val) || /select|selecione|choose/i.test(val)) return true;
    return false;
}

async function _waitPostback(timeout = 5000) {
    await _sleep(100);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const mgr = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
            if (!mgr || !mgr.get_isInAsyncPostBack()) break;
        } catch {}
        await _sleep(100);
    }
    // Wait for field count to stabilize
    let lastCount = -1;
    for (let i = 0; i < 20; i++) {
        await _sleep(100);
        const count = document.querySelectorAll('select, input:not([type="hidden"]), textarea').length;
        if (count === lastCount && count > 0) break;
        lastCount = count;
    }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _clickAddAnother(listName, targetIdx) {
    const targetCtl = `_ctl${String(targetIdx).padStart(2, '0')}_`;
    
    // Try InsertButton
    const insertBtns = document.querySelectorAll(`a[id*="${listName}"][id*="InsertButton"]`);
    if (insertBtns.length > 0) {
        insertBtns[insertBtns.length - 1].click();
        console.log(`[Filler] AddAnother: InsertButton for ${listName}`);
        await _waitPostback();
        return !!document.querySelector(`[id*="${listName}"][id*="${targetCtl}"]`);
    }
    
    // Try "Add Another" links
    const links = document.querySelectorAll('a');
    for (const a of links) {
        const txt = a.textContent.trim();
        const href = a.getAttribute('href') || '';
        if ((txt === 'Add Another' || a.classList.contains('addone')) && 
            (a.id?.includes(listName) || href.includes(listName))) {
            a.click();
            console.log(`[Filler] AddAnother: link for ${listName}`);
            await _waitPostback();
            return !!document.querySelector(`[id*="${listName}"][id*="${targetCtl}"]`);
        }
    }

    // Try proximity search
    const dataListEl = document.querySelector(`[id*="${listName}"]`);
    if (dataListEl) {
        let parent = dataListEl.parentElement;
        for (let i = 0; i < 10 && parent; i++) {
            const addLink = parent.querySelector('a.addone, a[id*="InsertButton"]');
            if (addLink) {
                addLink.click();
                console.log(`[Filler] AddAnother: proximity for ${listName}`);
                await _waitPostback();
                return !!document.querySelector(`[id*="${listName}"][id*="${targetCtl}"]`);
            }
            parent = parent.parentElement;
        }
    }

    console.warn(`[Filler] AddAnother: não encontrou botão para ${listName}`);
    return false;
}

function _cleanupEmptyEntries() {
    let removed = 0;
    document.querySelectorAll('input[type="text"]').forEach(inp => {
        if (inp.offsetParent === null || inp.disabled) return;
        if (inp.value && inp.value.trim() !== '') return;
        if (!inp.id || !(inp.id.includes('dtl') || inp.id.includes('DList'))) return;
        
        let container = inp.parentElement;
        for (let i = 0; i < 15 && container; i++) {
            const removeLink = container.querySelector('a[id*="DeleteButton"], a[id*="RemoveButton"]');
            if (removeLink) { removeLink.click(); removed++; break; }
            const allLinks = container.querySelectorAll('a');
            let found = false;
            for (const a of allLinks) {
                if (a.textContent.trim() === 'Remove' || a.textContent.trim() === 'Delete') {
                    a.click(); removed++; found = true; break;
                }
            }
            if (found) break;
            container = container.parentElement;
        }
    });
    if (removed > 0) console.log(`[Filler] Cleanup: removeu ${removed} entries vazios`);
}

// Export
if (typeof window !== 'undefined') {
    window.nativeFillPage = nativeFillPage;
}
