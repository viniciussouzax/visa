/**
 * DS-160 FORM ENGINE
 * Lê o DS160_SCHEMA e renderiza form, validação, review e comandos Playwright.
 * Requer: ds160-schema.js carregado antes deste arquivo.
 */
class FormEngine {
    constructor(schema, containerId) {
        this.schema = schema;
        this.container = document.getElementById(containerId);
        this.data = {};           // campo key → valor
        this.arrayData = {};      // array key → [{...}, {...}]
        this._isHydrating = false; // Flag to prevent prune during loadData/renderForm
        this.naFields = new Set(); // campos marcados N/A
        this.unknownFields = new Set(); // campos marcados "Não sei"
        this.currentSection = 0;
        this.visitedSections = new Set(); // seções confirmadas pelo usuário
        this.onSave = null; // callback for auto-save
        this.onChange = null; // callback for change tracking
        this.renderMode = 'accordion'; // 'accordion' | 'pages'
        this._saveTimer = null; // debounce timer for auto-save
        this._logs = []; // diagnostic log buffer (circular, max 500)
        this.SPECIAL = /[<>&"'\/\\;:{}[\]|~]/g;
        this.NAME_CHARS = /[^A-Za-z \-'.]/g; // Only letters, space, hyphen, apostrophe, period
        this.MONTHS = [
            { value: "JAN", label: "Janeiro" }, { value: "FEB", label: "Fevereiro" }, { value: "MAR", label: "Março" },
            { value: "APR", label: "Abril" }, { value: "MAY", label: "Maio" }, { value: "JUN", label: "Junho" },
            { value: "JUL", label: "Julho" }, { value: "AUG", label: "Agosto" }, { value: "SEP", label: "Setembro" },
            { value: "OCT", label: "Outubro" }, { value: "NOV", label: "Novembro" }, { value: "DEC", label: "Dezembro" }
        ];
    }

    // =========================================
    // INIT
    // =========================================
    init() {
        this._applyDefaults();
        this.renderForm();
        this.updateProgress();
    }

    _applyDefaults() {
        // Only apply if not already set by hydration
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.default) {
                    const key = sec.id + '.' + f.id;
                    if (this.data[key] === undefined) {
                        this.data[key] = f.default;
                    }
                }
            });
        });
    }

    // DS-160 text sanitizer — removes accents, smart quotes, forces uppercase
    _sanitizeText(val) {
        if (typeof val !== 'string' || !val) return val;
        // Skip internal markers
        if (val === 'DNA' || val === 'UNKNOWN' || val === 'N/A') return val;
        // Skip single-char codes (Y, N, etc.) and option values (BRZL, FL, etc.)
        if (val.length <= 4 && /^[A-Z0-9\/]+$/.test(val)) return val;
        return val
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')         // strip accents
            .replace(/[\u2018\u2019\u201A]/g, "'")                   // smart quotes → '
            .replace(/[\u201C\u201D\u201E]/g, '"')                   // smart double quotes
            .replace(/[\u2013\u2014]/g, '-')                         // em/en dash → -
            .replace(/\u2026/g, '...')                               // ellipsis
            .replace(/[\u00A0]/g, ' ')                               // non-breaking space
            .toUpperCase();
    }

    // Sanitize all loaded data (this.data + this.arrayData)
    _sanitizeLoadedData() {
        for (const [key, val] of Object.entries(this.data)) {
            if (typeof val === 'string') {
                this.data[key] = this._sanitizeText(val);
            } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                // Sub-objects like SSN {p1,p2,p3} or date {day,month,year}
                for (const [k, v] of Object.entries(val)) {
                    if (typeof v === 'string') val[k] = this._sanitizeText(v);
                }
            }
        }
        for (const [key, arr] of Object.entries(this.arrayData)) {
            if (Array.isArray(arr)) {
                for (let ai = 0; ai < arr.length; ai++) {
                    const item = arr[ai];
                    if (typeof item === 'string') {
                        arr[ai] = this._sanitizeText(item);
                    } else if (item && typeof item === 'object') {
                        for (const [k, v] of Object.entries(item)) {
                            if (typeof v === 'string') item[k] = this._sanitizeText(v);
                        }
                    }
                }
            }
        }
    }
    // =========================================
    // AUTO-SAVE (debounced onChange trigger)
    // =========================================
    _debounceSave(category, key) {
        this.dirty = true;
        this._log('SAVE', `Change: [${category}] ${key}`);
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            if (this.onChange) {
                this._log('SAVE', 'Auto-save triggered');
                this.onChange(key, '');
            }
        }, 1500); // 1.5s debounce — fast enough, avoids rapid-fire
    }

    // =========================================
    // DIAGNOSTIC LOG
    // =========================================
    _log(category, message, data) {
        const entry = {
            ts: new Date().toISOString().substring(11, 19),
            cat: category,
            msg: message,
        };
        if (data !== undefined) entry.data = data;
        this._logs.push(entry);
        if (this._logs.length > 500) this._logs.shift();
        if (typeof console !== 'undefined') {
            console.debug(`[Engine:${category}] ${message}`, data || '');
        }
    }

    showLogs(category) {
        const filtered = category
            ? this._logs.filter(e => e.cat === category)
            : this._logs;
        console.table(filtered);
        return filtered;
    }

    // =========================================
    // LOAD DATA (Hydrate from JSON)
    // =========================================
    loadData(json) {
        if (!json || typeof json !== 'object') return;
        this._isHydrating = true; // Block prune during hydration
        this.data = {};
        this.arrayData = {};
        this.naFields.clear();
        this.unknownFields.clear();

        this.schema.sections.forEach(sec => {
            const secData = json[sec.id] || {};
            sec.fields.forEach(f => {
                if (f.type === 'alert' || f.type === 'heading' || f.type === 'orientation') return; // Skip display-only fields
                const key = sec.id + '.' + f.id;

                if (f.type === 'array') {
                    if (Array.isArray(secData[f.id]) && secData[f.id].length > 0) {
                        // Deep clone the array data to prevent reference issues
                        let cloned = JSON.parse(JSON.stringify(secData[f.id]));

                        // Auto-normalize: if items are strings, wrap in first sub-field object
                        // e.g. ['PORTUGUESE'] → [{name: 'PORTUGUESE'}] when schema.fields[0].id = 'name'
                        if (cloned.length > 0 && typeof cloned[0] === 'string' && f.fields && f.fields.length > 0) {
                            const firstSubId = f.fields[0].id;
                            cloned = cloned.map(s => ({ [firstSubId]: s }));
                        }

                        this.arrayData[key] = cloned;

                        // Reconstruct N/A and Unknown flags for arrays
                        this.arrayData[key].forEach((item, idx) => {
                            if (!item || typeof item !== 'object') return; // skip primitives
                            f.fields.forEach(subF => {
                                const subKey = `${key}[${idx}].${subF.id}`;
                                if (item[subF.id] === 'DNA') this.naFields.add(subKey);
                                if (item[subF.id] === 'UNKNOWN') this.unknownFields.add(subKey);
                            });
                        });
                    } else {
                        // Init with 1 empty item
                        this.arrayData[key] = [{}];
                    }
                } else {
                    let val = secData[f.id];
                    if (val !== undefined && val !== null) {
                        // Fix SSN legacy: convert string → object {p1,p2,p3}
                        if (f.type === 'ssn' && typeof val === 'string' && val !== 'DNA' && val !== 'UNKNOWN') {
                            const clean = val.replace(/\D/g, '');
                            val = { p1: clean.substring(0, 3), p2: clean.substring(3, 5), p3: clean.substring(5, 9) };
                        }
                        this.data[key] = val;
                        if (val === 'DNA') this.naFields.add(key);
                        if (val === 'UNKNOWN') this.unknownFields.add(key);
                    }
                }
            });
        });

        // Sanitize all loaded text data (strip accents, smart quotes, uppercase)
        this._sanitizeLoadedData();

        this._applyDefaults();

        // Trigger conditional evaluation for all fields based on loaded data
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.type !== 'array') {
                    const key = sec.id + '.' + f.id;
                    this._evaluateConditionals(key, this.data[key]);
                }
            });
        });

        // Auto-mark sections as visited if they have non-default user data
        this.schema.sections.forEach((sec, idx) => {
            const secData = json[sec.id] || {};
            const hasNonDefaultData = sec.fields.some(f => {
                if (f.type === 'alert' || f.type === 'heading' || f.type === 'orientation') return false;
                if (f.type === 'array') {
                    const arr = secData[f.id];
                    return arr && arr.length > 0 && arr.some(item => Object.values(item).some(v => v && v !== ''));
                }
                const val = secData[f.id];
                if (val === undefined || val === null) return false;
                // Compare with default — if different, user actually filled it
                if (f.default && val === f.default) return false;
                return true;
            });
            if (hasNonDefaultData) this.visitedSections.add(idx);
        });

        // Restore persisted visitedSections from _meta (covers sections with only defaults, like security)
        if (json._meta && Array.isArray(json._meta.visitedSections)) {
            json._meta.visitedSections.forEach(idx => this.visitedSections.add(idx));
        }
    }

    // =========================================
    // RESOLVE OPTIONS (shared refs like "countries")
    // =========================================
    _resolveOptions(field) {
        if (field.options) return field.options;
        if (field.optionsRef && this.schema.options[field.optionsRef]) {
            return this.schema.options[field.optionsRef];
        }
        return [];
    }

    // =========================================
    // FORM RENDERING
    // =========================================
    renderForm() {
        const formEl = document.getElementById('view-form');
        if (!formEl) return;
        formEl.innerHTML = '';

        this.schema.sections.forEach((sec, idx) => {
            const card = document.createElement('div');
            card.className = 'section-card';
            card.id = 'sec-' + sec.id;
            card.dataset.secIdx = idx;

            // Check section-level conditional
            if (sec.conditional && sec.showWhen) {
                card.style.display = 'none';
                card.dataset.secCondition = JSON.stringify(sec.showWhen);
            }

            const isOpen = false; // All sections start closed; we'll open the right one after render
            card.innerHTML = `
                <div class="section-header" onclick="engine.toggleSection(${idx})">
                    <div class="section-title">
                        <span class="section-num" id="secnum-${idx}">${idx + 1}</span>
                        ${sec.label}
                    </div>
                    <div class="section-status" id="status-${idx}">
                        <span class="status-dot"></span>
                    </div>
                </div>
                <div class="section-body" id="body-${idx}">
                    ${this._renderFields(sec.id, sec.fields)}
                    <div class="section-nav">
                        ${idx > 0 ? `<button class="btn-nav" onclick="engine.toggleSection(${idx - 1})">Anterior</button>` : '<span></span>'}
                        <button class="btn-nav btn-nav-next" id="nextBtn-${idx}" onclick="engine.goNext(${idx})">Próximo</button>
                    </div>
                </div>
            `;
            formEl.appendChild(card);
        });

        this._updateSectionNumbers();
        this._updateFinishButton();

        // No event delegation needed — onclick is on each section-header directly

        // Apply defaults to radios — only if no saved data exists
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.default) {
                    const key = sec.id + '.' + f.id;
                    if (!this.data[key]) {
                        const radio = document.querySelector(`input[name="${key}"][value="${f.default}"]`);
                        if (radio) radio.checked = true;
                    }
                }
            });
        });

        // Setup real-time validation
        this._setupRealtimeValidation();

        // Re-evaluate conditionals to sync DOM visibility with loaded data
        this._reEvaluateAllConditionals();

        // Hydration complete — safe to prune now
        this._isHydrating = false;

        // Post-render sync: apply N/A and Unknown visual states
        this.naFields.forEach(key => {
            // SSN: disable 3 parts
            const ssnP1 = document.getElementById(key + '_p1');
            if (ssnP1) {
                ['_p1', '_p2', '_p3'].forEach(suffix => {
                    const part = document.getElementById(key + suffix);
                    if (part) { part.disabled = true; part.value = ''; }
                });
            // Date: disable 3 parts
            } else if (document.getElementById(key + '.day')) {
                ['.day', '.month', '.year'].forEach(suffix => {
                    const part = document.getElementById(key + suffix);
                    if (part) { part.disabled = true; part.value = ''; }
                });
            } else {
                const el = document.getElementById(key);
                if (el) {
                    el.value = '';
                    el.disabled = true;
                }
            }
            const cb = document.querySelector(`[data-na-for="${key}"]`);
            if (cb) cb.checked = true;
        });
        this.unknownFields.forEach(key => {
            const el = document.getElementById(key);
            if (el) {
                el.value = '';
                el.disabled = true;
                const fieldRow = el.closest('.field-row');
                if (fieldRow) fieldRow.classList.add('na-disabled');
            }
            const cb = document.querySelector(`[data-unknown-for="${key}"]`);
            if (cb) cb.checked = true;
        });

        // Post-render: re-evaluate hideWhenAllUnknown for loaded data
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (!f.hideWhenAllUnknown) return;
                const allUnknown = f.hideWhenAllUnknown.every(refId => this.unknownFields.has(sec.id + '.' + refId));
                if (allUnknown) {
                    const f2Key = sec.id + '.' + f.id;
                    let el = document.getElementById(f2Key);
                    if (!el) el = document.getElementById(f2Key + '.day');
                    if (!el) el = document.querySelector(`input[name="${f2Key}"]`);
                    const row = el?.closest('.field-row');
                    if (row) row.style.display = 'none';
                }
            });
        });

        // Smart accordion: update status first, then open sections
        this._updateSectionStatus();
        const isAssessorMode = document.body.classList.contains('role-assessor');

        if (isAssessorMode) {
            // Assessor: open ALL sections — flat scrollable view
            for (let idx = 0; idx < this.schema.sections.length; idx++) {
                const body = document.getElementById('body-' + idx);
                if (body) body.classList.add('open');
            }
            this.currentSection = 0;
        } else {
            // Solicitante: open first incomplete section
            let openedOne = false;
            for (let idx = 0; idx < this.schema.sections.length; idx++) {
                const sec = this.schema.sections[idx];
                const secEl = document.getElementById('sec-' + sec.id);
                if (secEl && secEl.style.display === 'none') continue;
                const errors = this.validateSection(idx);
                const hasData = sec.fields.some(f => {
                    if (f.type === 'alert') return false;
                    const key = sec.id + '.' + f.id;
                    if (f.type === 'array') {
                        const arr = this.arrayData[key];
                        return arr && arr.length > 0 && arr.some(item => Object.values(item).some(v => v && v !== ''));
                    }
                    if (!f.required) return false;
                    const val = this.data[key];
                    return val && ((typeof val === 'string' && val.trim()) || typeof val === 'object');
                });
                const isComplete = errors.length === 0 && hasData;
                if (!isComplete) {
                    const body = document.getElementById('body-' + idx);
                    if (body) body.classList.add('open');
                    this.currentSection = idx;
                    openedOne = true;
                    break;
                }
            }
            // If all sections are complete, open the first one
            if (!openedOne) {
                const body = document.getElementById('body-0');
                if (body) body.classList.add('open');
                this.currentSection = 0;
            }
        }

        // Initialize intl-tel-input on all phone fields
        this._initPhoneInputs();

        // Generic initial state: address fields + PostalCode
        // Brasil: show PostalCode + hide address (wait for auto-fill)
        // Other:  show PostalCode + show address (manual entry)
        // Empty:  hide PostalCode + hide address
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (!f.id.endsWith('Country')) return;
                const key = sec.id + '.' + f.id;
                const val = this.data[key] || f.default || '';
                const prefix = f.id.replace('Country', '');
                const hasData = this.data[sec.id + '.' + prefix + 'Street1'] || this.data[sec.id + '.' + prefix + 'City'];
                if (val === 'BRZL') {
                    this._toggleFieldRow(sec.id, prefix + 'PostalCode', true);
                    this._toggleAddressFieldsByPrefix(sec.id, prefix, true);
                } else if (val) {
                    this._toggleFieldRow(sec.id, prefix + 'PostalCode', true);
                    this._toggleAddressFieldsByPrefix(sec.id, prefix, true);
                } else {
                    this._toggleFieldRow(sec.id, prefix + 'PostalCode', false);
                    this._toggleAddressFieldsByPrefix(sec.id, prefix, false);
                }
                this._toggleAddressNaByPrefix(sec.id, prefix, val === 'BRZL');
            });
        });

        // Generic initial state: *SameAddress fields — hide address group when not N
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (!f.id.endsWith('SameAddress')) return;
                const key = sec.id + '.' + f.id;
                const val = this.data[key] || '';
                const basePrefix = f.id.replace('SameAddress', '');
                const addrPrefix = basePrefix + 'Person';
                if (val !== 'N') {
                    // Not "No" — hide entire address group
                    this._toggleFieldRow(sec.id, addrPrefix + 'Country', false);
                    this._toggleFieldRow(sec.id, addrPrefix + 'PostalCode', false);
                    this._toggleAddressFieldsByPrefix(sec.id, addrPrefix, false);
                }
            });
        });

        // Re-apply pages mode after full render (renderForm always builds accordion DOM)
        if (this.renderMode === 'pages') {
            this.setRenderMode('pages');
        }
    }

    _initPhoneInputs(container = document) {
        if (typeof intlTelInput === 'undefined') return;
        const phones = container.querySelectorAll('.iti-phone:not([data-iti-init])');
        phones.forEach(input => {
            input.setAttribute('data-iti-init', '1');
            const country = input.getAttribute('data-country') || 'br';
            const locked = input.hasAttribute('data-locked');
            const iti = intlTelInput(input, {
                initialCountry: country,
                preferredCountries: locked ? [] : ['br', 'us', 'pt'],
                separateDialCode: true,
                formatAsYouType: false,
                allowDropdown: !locked,
                utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js'
            });
            input._iti = iti;
        });
    }

    _renderFields(secId, fields) {
        const result = [];
        let i = 0;
        while (i < fields.length) {
            const f = fields[i];
            if (f.type === 'array') {
                result.push(this._renderArray(secId, f));
                i++;
                continue;
            }
            // Group consecutive inline fields
            if (f.inline && !f.showWhen) {
                const group = [f];
                let j = i + 1;
                while (j < fields.length && fields[j].inline && !fields[j].showWhen && fields[j].type !== 'array') {
                    group.push(fields[j]);
                    j++;
                }
                if (group.length > 1) {
                    const innerHtml = group.map(gf => {
                        const key = secId + '.' + gf.id;
                        const reqMark = gf.required ? '<span class="req">*</span>' : '';
                        const hintHtml = gf.hint ? `<div class="field-hint">${gf.hint}</div>` : '';
                        let naHtml = '';
                        if (gf.allowNA) { const c = this.naFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-na-for="${key}"${c} onchange="engine.toggleNA('${key}', this.checked)"> Não se Aplica</label>`; }
                        if (gf.allowUnknown) { const c = this.unknownFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-unknown-for="${key}"${c} onchange="engine.toggleUnknown('${key}', this.checked)"> Não Sei</label>`; }
                        return `<div class="field-row" style="flex:1 1 200px;min-width:0;margin-bottom:0">
                            <div class="field-label">${gf.label} ${reqMark}</div>
                            ${hintHtml}
                            <div class="${naHtml ? 'na-row' : ''}">${this._renderInput(key, gf)}${naHtml}</div>
                            <div class="field-error" id="err-${key}"></div>
                        </div>`;
                    }).join('');
                    result.push(`<div class="inline-group">${innerHtml}</div>`);
                    i = j;
                    continue;
                }
            }
            // Group consecutive conditional fields with same showWhen (including nested children)
            if (f.showWhen && !f.type.startsWith('array')) {
                const condKey = JSON.stringify(f.showWhen);
                const group = [f];
                const groupFieldIds = new Set([f.id]);
                let j = i + 1;
                while (j < fields.length && fields[j].showWhen && fields[j].type !== 'array') {
                    const nextCondKey = JSON.stringify(fields[j].showWhen);
                    if (nextCondKey === condKey) {
                        // Same parent condition
                        group.push(fields[j]);
                        groupFieldIds.add(fields[j].id);
                        j++;
                    } else if (groupFieldIds.has(fields[j].showWhen.field)) {
                        // Nested: showWhen references a field already in this group (e.g. visaLost=Y inside hasUSVisa=Y)
                        group.push(fields[j]);
                        j++;
                    } else {
                        break;
                    }
                }
                if (group.length > 1) {
                    // Render as grouped cond-block with vertical layout
                    const parentKey = f.showWhen.section ? `${f.showWhen.section}.${f.showWhen.field}` : `${secId}.${f.showWhen.field}`;
                    const condAttrs = `data-show-when="${parentKey}" data-show-value="${f.showWhen.equals || ''}" data-show-in="${f.showWhen.in ? JSON.stringify(f.showWhen.in).replace(/"/g, '&quot;') : ''}" data-show-not-in="${f.showWhen.notIn ? JSON.stringify(f.showWhen.notIn).replace(/"/g, '&quot;') : ''}"`;
                    
                    // Build inner HTML, grouping consecutive inline fields together
                    const innerParts = [];
                    let gi = 0;
                    while (gi < group.length) {
                        const gf = group[gi];
                        // Check if this starts an inline group
                        if (gf.inline && JSON.stringify(gf.showWhen) === condKey) {
                            const inlineFields = [gf];
                            let gj = gi + 1;
                            while (gj < group.length && group[gj].inline && JSON.stringify(group[gj].showWhen) === condKey) {
                                inlineFields.push(group[gj]);
                                gj++;
                            }
                            if (inlineFields.length > 1) {
                                const inlineHtml = inlineFields.map(inf => {
                                    const key = secId + '.' + inf.id;
                                    const reqMark = inf.required ? '<span class="req">*</span>' : '';
                                    const hintHtml = inf.hint ? `<div class="field-hint">${inf.hint}</div>` : '';
                                    let naHtml = '';
                                    if (inf.allowNA) { const c = this.naFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-na-for="${key}"${c} onchange="engine.toggleNA('${key}', this.checked)"> Não se Aplica</label>`; }
                                    if (inf.allowUnknown) { const c = this.unknownFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-unknown-for="${key}"${c} onchange="engine.toggleUnknown('${key}', this.checked)"> Não Sei</label>`; }
                                    const flexStyle = inf.flexBasis ? `flex:1 1 ${inf.flexBasis}` : 'flex:1 1 200px';
                                    return `<div class="field-row" style="${flexStyle};min-width:0;margin-bottom:0">
                                        <div class="field-label">${inf.label} ${reqMark}</div>
                                        ${hintHtml}
                                        <div class="${naHtml ? 'na-row' : ''}">${this._renderInput(key, inf)}${naHtml}</div>
                                        <div class="field-error" id="err-${key}"></div>
                                    </div>`;
                                }).join('');
                                innerParts.push(`<div class="inline-group" style="margin-bottom:0">${inlineHtml}</div>`);
                                gi = gj;
                                continue;
                            }
                        }
                        // Regular single field
                        const key = secId + '.' + gf.id;
                        const reqMark = gf.required ? '<span class="req">*</span>' : '';
                        const hintHtml = gf.hint ? `<div class="field-hint">${gf.hint}</div>` : '';
                        let naHtml = '';
                        if (gf.allowNA) { const c = this.naFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-na-for="${key}"${c} onchange="engine.toggleNA('${key}', this.checked)"> Não se Aplica</label>`; }
                        if (gf.allowUnknown) { const c = this.unknownFields.has(key) ? ' checked' : ''; naHtml = `<label class="na-check"><input type="checkbox" data-unknown-for="${key}"${c} onchange="engine.toggleUnknown('${key}', this.checked)"> Não Sei</label>`; }
                        const isNested = JSON.stringify(gf.showWhen) !== condKey;
                        let fieldHtml = `<div class="field-row" style="margin-bottom:0">
                            <div class="field-label">${gf.label} ${reqMark}</div>
                            ${hintHtml}
                            <div class="${naHtml ? 'na-row' : ''}">${this._renderInput(key, gf)}${naHtml}</div>
                            <div class="field-error" id="err-${key}"></div>
                        </div>`;
                        if (isNested) {
                            const nestedParentKey = (gf.showWhen.section || secId) + '.' + gf.showWhen.field;
                            const nestedAttrs = `data-show-when="${nestedParentKey}" data-show-value="${gf.showWhen.equals || ''}" data-show-in="${gf.showWhen.in ? JSON.stringify(gf.showWhen.in).replace(/"/g, '&quot;') : ''}"`;
                            fieldHtml = `<div class="cond-block" ${nestedAttrs}>${fieldHtml}</div>`;
                        }
                        innerParts.push(fieldHtml);
                        gi++;
                    }
                    const innerHtml = innerParts.join('');
                    const groupLabel = group[0].groupLabel ? `<div class="field-label" style="margin-bottom:4px;color:var(--text-secondary);font-size:12px">${group[0].groupLabel}</div>` : '';
                    result.push(`<div class="cond-block" ${condAttrs}>${groupLabel}<div class="cond-card"><div style="display:flex;flex-direction:column;gap:8px">${innerHtml}</div></div></div>`);
                    i = j;
                    continue;
                }
            }
            result.push(this._renderSingleField(secId, f));
            i++;
        }
        return result.join('');
    }

    _renderSingleField(secId, f) {
        const key = secId + '.' + f.id;
        const reqMark = f.required ? '<span class="req">*</span>' : '';
        let condAttrs = '';
        let condClass = '';

        if (f.showWhen) {
            const parentKey = f.showWhen.section ? `${f.showWhen.section}.${f.showWhen.field}` : `${secId}.${f.showWhen.field}`;
            condAttrs = `data-show-when="${parentKey}" data-show-value="${f.showWhen.equals || ''}" data-show-in="${f.showWhen.in ? JSON.stringify(f.showWhen.in).replace(/"/g, '&quot;') : ''}" data-show-not-in="${f.showWhen.notIn ? JSON.stringify(f.showWhen.notIn).replace(/"/g, '&quot;') : ''}"`;
            condClass = 'cond-block';
        }

        // Alert type — render as a visual warning/info block, no input
        if (f.type === 'alert') {
            const colors = { warning: { bg: '#fef9e7', border: '#E0B624', text: '#7a6c00', icon: 'info-circle' }, danger: { bg: '#fef2f2', border: '#BF0A30', text: '#BF0A30', icon: 'warning-triangle' }, info: { bg: '#eaf1f7', border: '#65B2E8', text: '#1a5276', icon: 'chat-bubble' } };
            const style = colors[f.alertStyle] || colors.warning;
            return `<div class="field-row ${condClass}" ${condAttrs}>
                <div style="padding:10px 14px;background:${style.bg};border:1px solid ${style.border};border-radius:6px;color:${style.text};font-size:12px;line-height:1.5;">
                    <i class="iconoir-${style.icon}" style="vertical-align:middle;margin-right:6px;color:${style.border};"></i>
                    ${f.label}
                </div>
            </div>`;
        }

        // Heading type — render as a visual title, no input
        if (f.type === 'heading') {
            const spaceStyle = f.spaceBefore ? `padding-top:${f.spaceBefore}px;` : '';
            return `<div class="field-row ${condClass}" ${condAttrs} style="${spaceStyle}padding-bottom:8px">
                <div class="field-label">${f.label}</div>
            </div>`;
        }

        // Orientation type — render as instructional text block, no input
        if (f.type === 'orientation') {
            return `<div class="field-row ${condClass}" ${condAttrs} style="padding-bottom:8px">
                <div class="field-label" style="font-weight:400;margin-bottom:4px">${f.label.replace(/\n/g, '<br>')}</div>
                ${f.text ? `<div class="field-hint" style="font-size:12px;line-height:1.5">${f.text}</div>` : ''}
            </div>`;
        }

        let input = this._renderInput(key, f);

        // N/A or Unknown wrapper
        let naHtml = '';
        if (f.allowNA) {
            const naChecked = this.naFields.has(key) ? ' checked' : '';
            naHtml = `<label class="na-check"><input type="checkbox" data-na-for="${key}"${naChecked} onchange="engine.toggleNA('${key}', this.checked)"> Não se Aplica</label>`;
        }
        if (f.allowUnknown) {
            const unkChecked = this.unknownFields.has(key) ? ' checked' : '';
            naHtml = `<label class="na-check"><input type="checkbox" data-unknown-for="${key}"${unkChecked} onchange="engine.toggleUnknown('${key}', this.checked)"> Não Sei</label>`;
        }

        const hasNARow = naHtml ? 'na-row' : '';
        const hintHtml = f.hint ? `<div class="field-hint">${f.hint}</div>` : '';

        // Char count for textareas — inline in label
        let charCountHtml = '';
        if (f.type === 'textarea') {
            const curVal = this._resolveValue(key) || '';
            const tLen = typeof curVal === 'string' ? curVal.length : 0;
            charCountHtml = ` <span class="char-count" id="cc-${key}">${tLen}/${f.maxLen || 200}</span>`;
        }

        const spaceStyle = f.spaceBefore ? `padding-top:${f.spaceBefore}px;` : '';
        return `<div class="field-row ${condClass}" ${condAttrs} ${spaceStyle ? `style="${spaceStyle}"` : ''}>
            <div class="field-label">${f.label} ${reqMark}${charCountHtml}</div>
            ${hintHtml}
            <div class="${hasNARow}" ${(f.type === 'ssn' || f.type === 'date') && hasNARow ? 'style="flex-direction:column;align-items:flex-start"' : ''}>
                ${input}
                ${naHtml}
            </div>
            <div class="field-error" id="err-${key}"></div>
        </div>`;
    }

    // Resolve value for both regular fields (this.data) and array sub-fields (this.arrayData)
    _resolveValue(key) {
        // Regular field
        if (this.data[key] !== undefined) return this.data[key];
        // Array sub-field: key pattern is "section.arrayId[idx].subFieldId"
        const arrMatch = key.match(/^(.+)\[(\d+)\]\.(.+)$/);
        if (arrMatch) {
            const [, arrKey, idxStr, subId] = arrMatch;
            const idx = parseInt(idxStr);
            const arr = this.arrayData[arrKey];
            if (arr && arr[idx] && arr[idx][subId] !== undefined) return arr[idx][subId];
        }
        return '';
    }

    _renderInput(key, f, sibDisabled = false) {
        const opts = this._resolveOptions(f);
        const phAttr = '';
        let curVal = this._resolveValue(key);
        const isNA = curVal === 'DNA';
        const isUnknown = curVal === 'UNKNOWN';
        const disabledAttr = (isNA || isUnknown || sibDisabled) ? ' disabled' : '';
        // Never show internal N/A/Unknown markers in the visible input
        if (curVal === 'DNA' || curVal === 'UNKNOWN') curVal = '';
        const escaped = typeof curVal === 'string' ? curVal.replace(/"/g, '&quot;') : '';

        // Detect numeric-only fields (ZIP, year, quantities, salary)
        const numericIds = ['lengthOfStay', 'monthlySalary', 'lostVisaYear', 'numberOfPrevious',
            'usAddressZip', 'usContactZip', 'homePostalCode', 'mailPostalCode',
            'employerPostalCode', 'schoolZip'];
        const isNumeric = numericIds.includes(f.id);
        const isZip = ['usAddressZip', 'usContactZip', 'schoolZip'].includes(f.id);
        // Auto-detect name fields that should only allow letters (no digits)
        const nameFieldIds = ['surname', 'givenName', 'fatherSurname', 'fatherGivenName',
            'motherSurname', 'motherGivenName', 'spouseSurname', 'spouseGivenName',
            'payerSurname', 'payerGivenName', 'supervisor', 'supervisorGivenName'];
        const isNameField = f.noSpecial && nameFieldIds.includes(f.id);

        switch (f.type) {
            case 'text':
                let maskAttr = '';
                if (isZip) maskAttr = 'data-mask="zip"';

                return `<input type="text" class="field-input" id="${key}" maxlength="${f.maxLen || 100}" ${phAttr}
                    value="${escaped}"${disabledAttr}
                    ${f.noSpecial ? 'data-no-special="true"' : ''} ${(f.nameOnly || isNameField) ? 'data-name-only="true"' : ''} ${f.uppercase ? 'data-uppercase="true"' : ''}
                    ${isNumeric ? 'data-numeric="true"' : ''} ${maskAttr}
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;

            case 'phone': {
                const phoneCountry = f.phoneCountry ? ` data-country="${f.phoneCountry}"` : '';
                const phoneLocked = f.phoneLocked ? ' data-locked' : '';
                return `<input type="tel" class="field-input iti-phone" id="${key}" maxlength="20"
                    value="${escaped}"${phoneCountry}${phoneLocked}
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;
            }

            case 'email':
                return `<input type="text" class="field-input" id="${key}" maxlength="${f.maxLen || 50}"
                    value="${escaped}"
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;

            case 'textarea': {
                const tLen = typeof curVal === 'string' ? curVal.length : 0;
                return `<textarea class="field-input" id="${key}" maxlength="${f.maxLen || 200}" ${phAttr}${disabledAttr}
                    oninput="engine.onInput('${key}', this)">${curVal}</textarea>`;
            }

            case 'ssn': {
                const ssnVal = (typeof curVal === 'object' && curVal) ? curVal : { p1: '', p2: '', p3: '' };
                const sp1 = (ssnVal.p1 || '').replace(/"/g, '&quot;');
                const sp2 = (ssnVal.p2 || '').replace(/"/g, '&quot;');
                const sp3 = (ssnVal.p3 || '').replace(/"/g, '&quot;');
                return `<div style="display:flex;align-items:center;gap:6px;width:100%">
                    <input type="text" class="field-input" id="${key}_p1" maxlength="3" inputmode="numeric" style="flex:3;text-align:center"
                        value="${sp1}"${disabledAttr}
                        oninput="this.value=this.value.replace(/\\D/g,'');if(this.value.length===3)document.getElementById('${key}_p2').focus();engine.onInput('${key}',this)"
                        onblur="engine.onBlur('${key}',this)">
                    <span style="color:var(--text-muted);font-weight:600;flex-shrink:0">-</span>
                    <input type="text" class="field-input" id="${key}_p2" maxlength="2" inputmode="numeric" style="flex:2;text-align:center"
                        value="${sp2}"${disabledAttr}
                        oninput="this.value=this.value.replace(/\\D/g,'');if(this.value.length===2)document.getElementById('${key}_p3').focus();engine.onInput('${key}',this)"
                        onblur="engine.onBlur('${key}',this)">
                    <span style="color:var(--text-muted);font-weight:600;flex-shrink:0">-</span>
                    <input type="text" class="field-input" id="${key}_p3" maxlength="4" inputmode="numeric" style="flex:4;text-align:center"
                        value="${sp3}"${disabledAttr}
                        oninput="this.value=this.value.replace(/\\D/g,'');engine.onInput('${key}',this)"
                        onblur="engine.onBlur('${key}',this)">
                </div>`;
            }

            case 'select': {
                let filteredOpts = opts;
                if (f.filteredBy) {
                    const parentKey = key.substring(0, key.lastIndexOf('.')) + '.' + f.filteredBy.field;
                    const parentVal = this.data[parentKey] || '';
                    if (parentVal) {
                        filteredOpts = opts.filter(o => o.group === parentVal);
                    }
                }
                const ohDiv = f.optionHints ? `<div class="option-hint" id="ohint-${key}" style="color:#0056b3;font-size:12px;margin-top:4px;font-style:italic">${curVal && f.optionHints[curVal] ? f.optionHints[curVal] : ''}</div>` : '';
                return `<select class="field-input" id="${key}"${disabledAttr} onchange="engine.onInput('${key}', this)"
                ${f.filteredBy ? `data-filtered-by="${key.substring(0, key.lastIndexOf('.')) + '.' + f.filteredBy.field}" data-all-options='${JSON.stringify(opts)}'` : ''}>
                ${(!f.default || !filteredOpts.some(o => o.value === f.default)) ? '<option value="">Selecione</option>' : ''}
                ${filteredOpts.map(o => o.disabled ? `<option value="" disabled>${o.label}</option>` : `<option value="${o.value}"${curVal === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
            </select>${ohDiv}`;
            }

            case 'radio': {
                const options = opts.length ? opts : [{ value: "Y", label: "Sim" }, { value: "N", label: "Não" }];
                return `<div class="radio-group">${options.map(o => `
                    <label class="radio-btn">
                        <input type="radio" name="${key}" value="${o.value}"${curVal === o.value ? ' checked' : ''} onchange="engine.onInput('${key}', this)">
                        <span class="dot"></span> ${o.label}
                    </label>`).join('')}</div>`;
            }

            case 'date': {
                const dv = (typeof curVal === 'object' && curVal) ? curVal : {};
                return `<div class="date-grid">
                    <select class="field-input" id="${key}.day"${disabledAttr} onchange="engine.onDateChange('${key}')">
                        <option value="">DIA</option>
                        ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${dv.day == (i + 1) ? ' selected' : ''}>${i + 1}</option>`).join('')}
                    </select>
                    <select class="field-input" id="${key}.month"${disabledAttr} onchange="engine.onDateChange('${key}')">
                        <option value="">MÊS</option>
                        ${this.MONTHS.map(m => `<option value="${m.value}"${dv.month === m.value ? ' selected' : ''}>${m.label}</option>`).join('')}
                    </select>
                    <input type="text" class="field-input" id="${key}.year" maxlength="4"
                        value="${dv.year || ''}"${disabledAttr}
                        oninput="this.value=this.value.replace(/\\D/g,''); engine.onDateChange('${key}')">
                </div>`;
            }

            case 'file': {
                const acceptAttr = f.accept ? `accept="${f.accept}"` : '';
                const maxSizeInfo = f.maxSizeKb ? `Máximo: ${f.maxSizeKb}kb` : '';
                const currentFile = curVal || '';
                const hasFile = !!currentFile;
                return `<div class="file-upload-container" id="${key}-container">
                    <div class="file-upload-preview" id="${key}-preview" style="${hasFile ? '' : 'display:none'}">
                        <img id="${key}-img" src="${hasFile ? currentFile : ''}" alt="Preview" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--border-color,rgba(255,255,255,0.1))">
                        <button type="button" class="file-upload-remove" onclick="engine.removeFile('${key}')" title="Remover foto">✕</button>
                    </div>
                    <label class="file-upload-label" style="${hasFile ? 'display:none' : ''}">
                        <input type="file" class="file-upload-input" id="${key}" ${acceptAttr}
                            onchange="engine.onFileChange('${key}', this)" style="display:none">
                        <span class="file-upload-btn">📷 Selecionar Foto</span>
                        <span class="file-upload-hint">${maxSizeInfo}</span>
                    </label>
                </div>`;
            }

            default:
                return `<input type="text" class="field-input" id="${key}" ${phAttr} value="${escaped}" oninput="engine.onInput('${key}', this)">`;
        }
    }

    // =========================================
    // ARRAY RENDERING (Add Another)
    // =========================================
    _renderArray(secId, f) {
        const key = secId + '.' + f.id;
        let condAttrs = '';
        let condClass = '';
        if (f.showWhen) {
            const parentKey = secId + '.' + f.showWhen.field;
            condAttrs = `data-show-when="${parentKey}" data-show-value="${f.showWhen.equals || ''}" data-show-in="${f.showWhen.in ? JSON.stringify(f.showWhen.in) : ''}"`;
            condClass = 'cond-block';
        }

        // Init array data with defaults
        if (!this.arrayData[key]) {
            const initEntry = {};
            (f.fields || []).forEach(subF => {
                if (subF.default) initEntry[subF.id] = subF.default;
            });
            this.arrayData[key] = [initEntry];
        } else {
            // Apply defaults to first entry if fields are empty
            const firstEntry = this.arrayData[key][0];
            if (firstEntry) {
                (f.fields || []).forEach(subF => {
                    if (subF.default && !firstEntry[subF.id]) {
                        firstEntry[subF.id] = subF.default;
                    }
                });
            }
        }

        // noneOnlyFirstEntry: hide "Add Another" when entry 0 is NONE
        let addBtnStyle = '';
        if (f.noneOnlyFirstEntry) {
            const entries = this.arrayData[key] || [{}];
            const noneVal = f.noneValue || 'NONE';
            const noneFieldId = f.noneField || 'platform';
            const firstVal = entries[0]?.[noneFieldId] || f.fields?.find(sf => sf.id === noneFieldId)?.default || '';
            if (firstVal === noneVal) addBtnStyle = ' style="display:none"';
        }

        return `<div class="field-row ${condClass}" ${condAttrs}>
            <div class="field-label">${f.label} ${f.required ? '<span class="req">*</span>' : ''}</div>
            <div class="array-container" id="arr-${key}" data-array-key="${key}">
                ${this._renderArrayEntries(secId, f, key)}
            </div>
            <button class="array-add" id="arradd-${key}" onclick="engine.addArrayEntry('${secId}', '${f.id}')"${addBtnStyle}>
                Adicionar outro
            </button>
        </div>`;
    }

    _renderArrayEntries(secId, f, key) {
        const entries = this.arrayData[key] || [{}];
        return entries.map((_, idx) => this._renderArrayEntry(secId, f, key, idx, entries.length)).join('');
    }

    _renderArrayEntry(secId, f, key, idx, total) {
        const removeBtn = total > 1
            ? `<div style="display:flex;justify-content:flex-end"><button class="array-remove" onclick="event.stopPropagation(); engine.removeArrayEntry('${secId}', '${f.id}', ${idx})">Remover</button></div>`
            : '';

        const entryData = (this.arrayData[key] || [])[idx] || {};
        const fieldsHtml = f.fields.map(subF => {
            const subKey = `${key}[${idx}].${subF.id}`;
            let subCond = '';
            let subClass = '';
            if (subF.showWhen) {
                const parentKey = `${key}[${idx}].${subF.showWhen.field}`;
                subCond = `data-show-when="${parentKey}" data-show-value="${subF.showWhen.equals || ''}" data-show-in="${subF.showWhen.in ? JSON.stringify(subF.showWhen.in).replace(/"/g, '&quot;') : ''}"`;
                subClass = 'cond-block';
            }

            // noneOnlyFirstEntry: entry 0 allows NONE (handle disabled), entry 1+ removes NONE option
            let sibDisabled = false;
            let filteredOptions = subF.options;
            if (f.noneOnlyFirstEntry) {
                const noneVal = f.noneValue || 'NONE';
                const noneFieldId = f.noneField || 'platform';
                if (subF.id === noneFieldId && idx > 0) {
                    // Entry 1+: filter out NONE option
                    filteredOptions = (subF.options || []).filter(o => o.value !== noneVal);
                }
                if (subF.id !== noneFieldId && idx === 0) {
                    // Entry 0: handle is disabled when sibling platform = NONE
                    const sibVal = entryData[noneFieldId] || subF.default || '';
                    sibDisabled = sibVal === noneVal;
                }
            }

            // disableWhenSibling (legacy support for other arrays)
            let sibDataAttr = '';
            if (subF.disableWhenSibling) {
                const sibVal = entryData[subF.disableWhenSibling.field] || '';
                sibDisabled = sibVal === subF.disableWhenSibling.equals;
                sibDataAttr = ` data-disable-sibling="${subF.disableWhenSibling.field}" data-disable-value="${subF.disableWhenSibling.equals}"`;
            }

            // Render heading sub-fields as visual dividers (full width, no input)
            if (subF.type === 'heading') {
                return `<div class="field field-row" style="flex:1 1 100%;margin:8px 0 2px">
                    <div class="field-label" style="font-size:13px;font-weight:600;color:var(--text-primary)">${subF.label}</div>
                </div>`;
            }

            const showRequired = subF.required && !sibDisabled;
            // Auto full-width for date, textarea, select (countries), and allowUnknown fields
            const autoFullW = subF.type === 'date' || subF.type === 'textarea' 
                || (subF.type === 'select' && subF.optionsRef === 'countries');
            const fullW = subF.fullWidth || autoFullW ? 'flex:1 1 100%' : (subF.flexBasis ? `flex:1 1 ${subF.flexBasis}` : '');

            // Override options for rendering if filtered
            const renderSubF = filteredOptions !== subF.options ? { ...subF, options: filteredOptions } : subF;

            return `<div class="field field-row ${subClass}" style="margin-bottom:4px;${fullW}" ${subCond}${sibDataAttr}>
                <div class="field-label" style="font-size:12px">${subF.label} ${showRequired ? '<span class="req">*</span>' : ''}</div>
                ${this._renderInput(subKey, renderSubF, sibDisabled)}
                <div class="field-error" id="err-${subKey}"></div>
            </div>`;
        }).join('');

        return `<div class="array-entry" data-arr-idx="${idx}">
            <div class="array-fields">${fieldsHtml}</div>
            ${removeBtn}
        </div>`;
    }

    addArrayEntry(secId, fieldId) {
        const key = secId + '.' + fieldId;
        const field = this._findField(secId, fieldId);
        if (!field) return;

        if (!this.arrayData[key]) this.arrayData[key] = [{}];
        if (this.arrayData[key].length >= (field.maxItems || 5)) return;

        // noneOnlyFirstEntry: block adding if entry 0 has NONE selected
        if (field.noneOnlyFirstEntry) {
            const entries = this.arrayData[key];
            const noneVal = field.noneValue || 'NONE';
            const noneFieldId = field.noneField || 'platform';
            if (entries.length > 0 && (entries[0][noneFieldId] || '') === noneVal) {
                this._showToast('Selecione uma rede social primeiro antes de adicionar outra.', 'error');
                return;
            }
        }

        // Save current data from DOM before validating
        this._saveArrayData(secId, fieldId);

        // Validate last entry before adding new one
        const entries = this.arrayData[key];
        const lastIdx = entries.length - 1;
        const lastEntry = entries[lastIdx] || {};
        let hasErrors = false;

        (field.fields || []).forEach(subF => {
            if (!subF.required) return;
            // noneOnlyFirstEntry: skip handle validation on entry 0 when NONE
            if (field.noneOnlyFirstEntry && lastIdx === 0) {
                const noneVal = field.noneValue || 'NONE';
                const noneFieldId = field.noneField || 'platform';
                if (subF.id !== noneFieldId && (lastEntry[noneFieldId] || '') === noneVal) return;
            }
            // Skip fields disabled by sibling condition (legacy)
            if (subF.disableWhenSibling) {
                const sibVal = lastEntry[subF.disableWhenSibling.field] || '';
                if (sibVal === subF.disableWhenSibling.equals) return;
            }
            // Skip conditional sub-fields whose parent condition not met
            if (subF.showWhen) {
                const subParentVal = lastEntry[subF.showWhen.field] || '';
                if (subF.showWhen.equals && subParentVal !== subF.showWhen.equals) return;
                if (subF.showWhen.in && !subF.showWhen.in.includes(subParentVal)) return;
            }
            const subKey = `${key}[${lastIdx}].${subF.id}`;
            const subVal = lastEntry[subF.id];
            let empty = false;
            if (subF.type === 'date') {
                empty = !subVal || (!subVal.day && !subVal.month && !subVal.year);
            } else {
                empty = !subVal || (typeof subVal === 'string' && !subVal.trim());
            }
            if (empty) {
                hasErrors = true;
                if (subF.type === 'date') {
                    ['.day', '.month', '.year'].forEach(suffix => {
                        const part = document.getElementById(subKey + suffix);
                        if (part) part.classList.add('error');
                    });
                } else {
                    const el = document.getElementById(subKey);
                    if (el) el.classList.add('error');
                }
                const errEl = document.getElementById('err-' + subKey);
                if (errEl) errEl.textContent = 'Obrigatório';
            }
        });

        if (hasErrors) return;

        // New array entries get defaults from sub-field definitions
        const newEntry = {};
        (field.fields || []).forEach(subF => {
            if (subF.default) newEntry[subF.id] = subF.default;
        });
        this.arrayData[key].push(newEntry);
        this._rerenderArray(secId, field, key);
    }

    removeArrayEntry(secId, fieldId, idx) {
        const key = secId + '.' + fieldId;
        const field = this._findField(secId, fieldId);
        if (!this.arrayData[key] || this.arrayData[key].length <= 1) return;

        // Save data before removing
        this._saveArrayData(secId, fieldId);

        // Clean up naFields/unknownFields for ALL entries (indices will shift)
        if (field) {
            const totalEntries = this.arrayData[key].length;
            for (let i = 0; i < totalEntries; i++) {
                (field.fields || []).forEach(subF => {
                    const subKey = `${key}[${i}].${subF.id}`;
                    this.naFields.delete(subKey);
                    this.unknownFields.delete(subKey);
                });
            }
        }

        this.arrayData[key].splice(idx, 1);

        // Reconstruct naFields/unknownFields with new indices
        if (field) {
            this.arrayData[key].forEach((entry, i) => {
                (field.fields || []).forEach(subF => {
                    const subKey = `${key}[${i}].${subF.id}`;
                    if (entry[subF.id] === 'DNA') this.naFields.add(subKey);
                    if (entry[subF.id] === 'UNKNOWN') this.unknownFields.add(subKey);
                });
            });
        }

        this._rerenderArray(secId, field, key);
    }

    _rerenderArray(secId, field, key) {
        const container = document.getElementById('arr-' + key);
        if (!container) return;
        container.innerHTML = this._renderArrayEntries(secId, field, key);

        // Restore saved data + radios + conditionals
        const entries = this.arrayData[key];
        entries.forEach((data, idx) => {
            Object.keys(data).forEach(subId => {
                const subKey = `${key}[${idx}].${subId}`;
                const val = data[subId];
                if (val === undefined || val === null) return;

                // Date fields (val is an object {day, month, year})
                if (typeof val === 'object' && val.day !== undefined) {
                    const dayEl = document.getElementById(subKey + '.day');
                    const monthEl = document.getElementById(subKey + '.month');
                    const yearEl = document.getElementById(subKey + '.year');
                    if (dayEl) dayEl.value = val.day || '';
                    if (monthEl) monthEl.value = val.month || '';
                    if (yearEl) yearEl.value = val.year || '';
                } else {
                    // Input/select/textarea
                    const el = document.getElementById(subKey);
                    if (el) {
                        el.value = val || '';
                    } else {
                        // Radio buttons
                        const radio = document.querySelector(`input[name="${subKey}"][value="${val}"]`);
                        if (radio) radio.checked = true;
                    }
                }

                // Re-evaluate conditionals that depend on this sub-field
                this._evaluateConditionals(subKey, val);
            });
        });

        // Update add button
        const addBtn = document.getElementById('arradd-' + key);
        if (addBtn) addBtn.disabled = entries.length >= (field.maxItems || 5);

        this._setupRealtimeValidation();
        this._initPhoneInputs(container);
        this._applyAddressToggles();
    }

    _saveArrayData(secId, fieldId) {
        const key = secId + '.' + fieldId;
        const field = this._findField(secId, fieldId);
        if (!field) return;

        // If arrayData not initialized, check if DOM has entries and create them
        if (!this.arrayData[key]) {
            const container = document.getElementById('arr-' + key);
            if (container) {
                const entryEls = container.querySelectorAll('.array-entry');
                if (entryEls.length > 0) {
                    this.arrayData[key] = Array.from({ length: entryEls.length }, () => ({}));
                    this._log('ARRAY', `Initialized ${key} from DOM: ${entryEls.length} entries`);
                }
            }
            if (!this.arrayData[key]) return; // still nothing
        }

        this.arrayData[key].forEach((_, idx) => {
            field.fields.forEach(subF => {
                const subKey = `${key}[${idx}].${subF.id}`;
                let val = '';
                let found = false;

                // Date fields: special handling for .day, .month, .year
                if (subF.type === 'date') {
                    const dayEl = document.getElementById(subKey + '.day');
                    if (dayEl) {
                        found = true;
                        const day = dayEl.value || '';
                        const month = document.getElementById(subKey + '.month')?.value || '';
                        const year = document.getElementById(subKey + '.year')?.value || '';
                        val = (day || month || year) ? { day, month, year } : null;
                    }
                } else {
                    const el = document.getElementById(subKey);
                    if (el) {
                        val = el.value || '';
                        found = true;
                    } else {
                        const rGroup = document.querySelector(`input[name="${subKey}"]`);
                        if (rGroup) {
                            found = true;
                            const rChecked = document.querySelector(`input[name="${subKey}"]:checked`);
                            if (rChecked) val = rChecked.value;
                        }
                    }
                }

                if (found) {
                    if (!this.arrayData[key][idx]) this.arrayData[key][idx] = {};
                    if (this.naFields.has(subKey)) {
                        this.arrayData[key][idx][subF.id] = 'DNA';
                    } else if (this.unknownFields.has(subKey)) {
                        this.arrayData[key][idx][subF.id] = 'UNKNOWN';
                    } else {
                        this.arrayData[key][idx][subF.id] = val;
                    }
                }
            });
        });
    }

    // =========================================
    // INPUT HANDLERS
    // =========================================
    onInput(key, el) {
        // Ignore selection of disabled options (e.g. dividers)
        if (el.tagName === 'SELECT' && el.selectedOptions[0] && el.selectedOptions[0].disabled) {
            el.value = this.data[key] || '';
            return;
        }
        let val = el.value || (el.type === 'radio' ? el.value : '');

        // Numeric-only filter
        if (el.dataset && el.dataset.numeric === 'true' && !el.dataset.mask) {
            val = val.replace(/\D/g, '');
        }
        // Filter special chars
        if (el.dataset && el.dataset.noSpecial === 'true') {
            val = val.replace(this.SPECIAL, '');
        }
        // DS-160 sanitization — only ASCII allowed (A-Z, 0-9, space, - ' . , / # ( ) )
        if (el.tagName !== 'SELECT' && el.type !== 'hidden' && el.type !== 'radio') {
            // 1. Strip accents/cedilla (ã→a, ç→c, é→e etc.)
            val = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            // 2. Replace smart quotes & dashes (from Word/phone copy-paste)
            val = val.replace(/[\u2018\u2019\u201A]/g, "'")   // ' ' ‚ → '
                     .replace(/[\u201C\u201D\u201E]/g, '"')   // " " „ → " (will be stripped later if invalid)
                     .replace(/[\u2013\u2014]/g, '-')         // – — → -
                     .replace(/\u2026/g, '...')               // … → ...
                     .replace(/[\u00A0]/g, ' ');              // non-breaking space → space
        }
        // Uppercase — DS-160 requires all text fields in uppercase
        if (el.tagName !== 'SELECT' && el.type !== 'hidden') {
            val = val.toUpperCase();
        }

        // Premium Masking System
        if (el.dataset && el.dataset.mask) {
            const maskType = el.dataset.mask;
            const clean = val.replace(/\D/g, '');

            if (maskType === 'phone') {
                let m = clean.substring(0, 11);
                if (m.length > 0) val = '(' + m;
                if (m.length > 2) val = '(' + m.substring(0, 2) + ') ' + m.substring(2);
                if (m.length > 6 && m.length < 11) val = val.substring(0, 9) + '-' + m.substring(6);
                else if (m.length === 11) val = val.substring(0, 10) + '-' + m.substring(7);
            } else if (maskType === 'cpf') {
                // Allows alphanumeric (for foreign IDs/RG) if letters detected, else masks as CPF
                if (!val.match(/[a-zA-Z]/)) {
                    let m = clean.substring(0, 11);
                    val = m;
                    if (m.length > 3) val = m.substring(0, 3) + '.' + m.substring(3);
                    if (m.length > 6) val = val.substring(0, 7) + '.' + m.substring(6);
                    if (m.length > 9) val = val.substring(0, 11) + '-' + m.substring(9);
                }
            } else if (maskType === 'zip') {
                let m = clean.substring(0, 9);
                val = m;
                if (m.length > 5) val = m.substring(0, 5) + '-' + m.substring(5);
            }
        }
        el.value = val;

        // Textarea character count
        if (el.tagName === 'TEXTAREA') {
            const cc = document.getElementById('cc-' + key);
            if (cc) cc.textContent = `${val.length}/${el.maxLength}`;
        }

        // Save value
        // SSN: collect 3 parts into single object
        const ssnCheck = document.getElementById(key + '_p1');
        if (ssnCheck) {
            const p1 = document.getElementById(key + '_p1')?.value || '';
            const p2 = document.getElementById(key + '_p2')?.value || '';
            const p3 = document.getElementById(key + '_p3')?.value || '';
            this.data[key] = { p1, p2, p3 };
            // Clear error state on SSN inputs
            ['_p1', '_p2', '_p3'].forEach(suffix => {
                document.getElementById(key + suffix)?.classList.remove('error');
            });
            const errEl = document.getElementById('err-' + key);
            if (errEl) errEl.textContent = '';
            this._evaluateConditionals(key, this.data[key]);
            this.dirty = true;
            this._debounceSave('SSN', key);
            this.updateProgress();
            return;
        }
        if (key.includes('[')) {
            // Check excludeField validation for array sub-fields
            const match = key.match(/^(.+?)\.(.+?)\[(\d+)\]\.(.+)$/);
            if (match && val) {
                const [, arrSecId, arrFieldId, , subFieldId] = match;
                const arrField = this._findField(arrSecId, arrFieldId);
                if (arrField) {
                    const subField = (arrField.fields || []).find(sf => sf.id === subFieldId);
                    if (subField && subField.excludeField) {
                        const excludeKey = arrSecId + '.' + subField.excludeField;
                        const excludeVal = this.data[excludeKey];
                        if (excludeVal && val === excludeVal) {
                            // Reset selection and show error
                            el.value = '';
                            el.classList.add('error');
                            const errEl = document.getElementById('err-' + key);
                            if (errEl) errEl.textContent = 'Não pode ser igual à nacionalidade principal';
                            this._setArrayValue(key, '');
                            return;
                        }
                    }
                }
            }
            // Array entry value
            this._setArrayValue(key, val);
            this._debounceSave('ARRAY', key);

            // disableWhenSibling (legacy): toggle sibling fields when this field changes
            const arrMatch2 = key.match(/^(.+?)\.(.+?)\[(\d+)\]\.(.+)$/);
            if (arrMatch2) {
                const [, arrSecId2, arrFieldId2, idxStr2, subFieldId2] = arrMatch2;
                const arrField2 = this._findField(arrSecId2, arrFieldId2);
                if (arrField2) {
                    const idx2 = parseInt(idxStr2);
                    const arrKey2 = `${arrSecId2}.${arrFieldId2}`;

                    // noneOnlyFirstEntry: handle toggle for entry 0
                    if (arrField2.noneOnlyFirstEntry && idx2 === 0 && subFieldId2 === (arrField2.noneField || 'platform')) {
                        const noneVal = arrField2.noneValue || 'NONE';
                        const isNone = val === noneVal;
                        // Toggle handle field
                        (arrField2.fields || []).forEach(sibF => {
                            if (sibF.id === subFieldId2) return; // skip self
                            const sibKey = `${arrKey2}[0].${sibF.id}`;
                            const sibEl = document.getElementById(sibKey);
                            if (sibEl) {
                                sibEl.disabled = isNone;
                                if (isNone) {
                                    sibEl.value = '';
                                    sibEl.classList.remove('error');
                                    this._setArrayValue(sibKey, '');
                                    const errEl = document.getElementById('err-' + sibKey);
                                    if (errEl) errEl.textContent = '';
                                }
                            }
                            // Toggle required asterisk
                            const fieldDiv = sibEl?.closest('.field');
                            if (fieldDiv) {
                                const labelDiv = fieldDiv.querySelector('.field-label');
                                if (labelDiv) {
                                    const reqSpan = labelDiv.querySelector('.req');
                                    if (isNone && reqSpan) reqSpan.remove();
                                    else if (!isNone && !reqSpan && sibF.required) {
                                        labelDiv.insertAdjacentHTML('beforeend', ' <span class="req">*</span>');
                                    }
                                }
                            }
                        });
                        // Toggle "Add Another" button
                        const arrayWrapper = document.querySelector(`[data-array-key="${arrKey2}"]`);
                        if (arrayWrapper) {
                            const addBtn = arrayWrapper.closest('.field-row')?.querySelector('.array-add');
                            if (addBtn) addBtn.style.display = isNone ? 'none' : '';
                        }
                    }

                    // Legacy disableWhenSibling toggle
                    (arrField2.fields || []).forEach(sibF => {
                        if (sibF.disableWhenSibling && sibF.disableWhenSibling.field === subFieldId2) {
                            const sibKey = `${arrKey2}[${idx2}].${sibF.id}`;
                            const sibEl = document.getElementById(sibKey);
                            const shouldDisable = val === sibF.disableWhenSibling.equals;
                            if (sibEl) {
                                sibEl.disabled = shouldDisable;
                                if (shouldDisable) {
                                    sibEl.value = '';
                                    sibEl.classList.remove('error');
                                    this._setArrayValue(sibKey, '');
                                    const errEl = document.getElementById('err-' + sibKey);
                                    if (errEl) errEl.textContent = '';
                                }
                            }
                            // Toggle required asterisk
                            const fieldDiv = sibEl?.closest('.field');
                            if (fieldDiv) {
                                const labelDiv = fieldDiv.querySelector('.field-label');
                                if (labelDiv) {
                                    const reqSpan = labelDiv.querySelector('.req');
                                    if (shouldDisable && reqSpan) reqSpan.remove();
                                    else if (!shouldDisable && !reqSpan && sibF.required) {
                                        labelDiv.insertAdjacentHTML('beforeend', ' <span class="req">*</span>');
                                    }
                                }
                            }
                        }
                    });
                }
            }
        } else {
            this.data[key] = val;
        }

        // Clear validation error visuals when user fills in a value
        if (val) {
            const inputEl = document.getElementById(key);
            if (inputEl) {
                inputEl.classList.remove('error');
            } else {
                // Radio: clear has-error from field-row
                const radioEl = document.querySelector(`input[name="${key}"]`);
                if (radioEl) radioEl.closest('.field-row')?.classList.remove('has-error');
            }
            const errEl = document.getElementById('err-' + key);
            if (errEl) errEl.textContent = '';
        }

        // Handle conditionals
        this._evaluateConditionals(key, val);

        // Update optionHint if present
        const ohEl = document.getElementById('ohint-' + key);
        if (ohEl) {
            const [ohSec, ohField] = key.split('.');
            const fieldDef = this._findField(ohSec, ohField);
            ohEl.textContent = (fieldDef && fieldDef.optionHints && val) ? (fieldDef.optionHints[val] || '') : '';
        }

        // Re-filter dependent selects (filteredBy)
        document.querySelectorAll(`[data-filtered-by="${key}"]`).forEach(sel => {
            try {
                const allOpts = JSON.parse(sel.dataset.allOptions);
                const filtered = allOpts.filter(o => o.group === val);
                const current = sel.value;
                sel.innerHTML = '<option value="">Selecione</option>' +
                    filtered.map(o => `<option value="${o.value}"${current === o.value ? ' selected' : ''}>${o.label}</option>`).join('');
                // Clear value if not in new group
                if (current && !filtered.some(o => o.value === current)) {
                    sel.value = '';
                    const childKey = sel.id;
                    if (childKey) {
                        delete this.data[childKey];
                    }
                }
            } catch (e) { console.warn('[Engine] filteredBy error:', e); }
        });

        // Clear error
        const errEl = document.getElementById('err-' + key);
        if (errEl) errEl.textContent = '';
        el.classList.remove('error');

        this.updateProgress();

        // Generic: when any *Country field changes, toggle PostalCode + address fields
        // Brasil → show PostalCode + hide address (wait for auto-fill)
        // Other  → show PostalCode + show address (manual entry)
        // Empty  → hide PostalCode + hide address
        if (key.includes('.') && key.endsWith('Country')) {
            const dotIdx = key.indexOf('.');
            const secId = key.substring(0, dotIdx);
            const fieldId = key.substring(dotIdx + 1);
            const prefix = fieldId.replace('Country', '');
            if (val === 'BRZL') {
                this._toggleFieldRow(secId, prefix + 'PostalCode', true);
                this._toggleAddressFieldsByPrefix(secId, prefix, false);
            } else if (val) {
                this._toggleFieldRow(secId, prefix + 'PostalCode', true);
                this._toggleAddressFieldsByPrefix(secId, prefix, true);
            } else {
                this._toggleFieldRow(secId, prefix + 'PostalCode', false);
                this._toggleAddressFieldsByPrefix(secId, prefix, false);
            }
            this._toggleAddressNaByPrefix(secId, prefix, val === 'BRZL');
        }

        // Generic: when any *SameAddress field changes, toggle address group
        // Y → hide all address fields, N → show Country only (rest hidden until country selected)
        if (key.includes('.') && key.endsWith('SameAddress')) {
            const dotIdx = key.indexOf('.');
            const secId = key.substring(0, dotIdx);
            const fieldId = key.substring(dotIdx + 1);
            // e.g., "payerSameAddress" → derive address prefix "payerPerson" from naming convention
            const basePrefix = fieldId.replace('SameAddress', '');
            const addrPrefix = basePrefix + 'Person';
            if (val === 'N') {
                // Show country only, rest hidden until country is selected
                this._toggleFieldRow(secId, addrPrefix + 'Country', true);
                this._toggleFieldRow(secId, addrPrefix + 'PostalCode', false);
                this._toggleAddressFieldsByPrefix(secId, addrPrefix, false);
            } else {
                // Y or empty: hide entire address group
                this._toggleFieldRow(secId, addrPrefix + 'Country', false);
                this._toggleFieldRow(secId, addrPrefix + 'PostalCode', false);
                this._toggleAddressFieldsByPrefix(secId, addrPrefix, false);
            }
        }

        if (this.onChange) this.onChange(key, val);
    }

    onBlur(key, el) {
        if (el.value) el.value = el.value.trim();
        if (el.dataset && el.dataset.uppercase === 'true') el.value = el.value.toUpperCase();

        // SSN: collect 3 parts into object (same logic as onInput)
        // Without this, onBlur would overwrite {p1,p2,p3} with a single part string
        const ssnCheck = document.getElementById(key + '_p1');
        if (ssnCheck) {
            const p1 = document.getElementById(key + '_p1')?.value?.trim() || '';
            const p2 = document.getElementById(key + '_p2')?.value?.trim() || '';
            const p3 = document.getElementById(key + '_p3')?.value?.trim() || '';
            this.data[key] = { p1, p2, p3 };
            this._debounceSave('SSN', key);
            return;
        }

        // Array sub-field: save to arrayData, not data
        if (key.includes('[')) {
            this._setArrayValue(key, el.value);
            // Validate required array sub-fields
            const match = key.match(/^(.+?)\.(.+?)\[(\d+)\]\.(.+)$/);
            if (match) {
                const [, arrSecId, arrFieldId, , subFieldId] = match;
                const arrField = this._findField(arrSecId, arrFieldId);
                if (arrField) {
                    const subField = (arrField.fields || []).find(sf => sf.id === subFieldId);
                    if (subField && subField.required && !el.value.trim()) {
                        el.classList.add('error');
                        const errEl = document.getElementById('err-' + key);
                        if (errEl) errEl.textContent = 'Obrigatório';
                    }
                }
            }
            // CEP auto-fill for array sub-fields too
            this._checkCepAutoFill(key, el.value);
            return;
        }

        this.data[key] = el.value;

        // Email validation
        if (el.value && this._getFieldDef(key)?.type === 'email') {
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
            el.classList.toggle('error', !valid);
            const errEl = document.getElementById('err-' + key);
            if (errEl) errEl.textContent = valid ? '' : 'Email inválido';
        }

        // CEP auto-fill via BrasilAPI
        this._checkCepAutoFill(key, el.value);
    }

    async _checkCepAutoFill(key, rawValue) {
        // Generic detection: any field ending with "PostalCode" triggers CEP lookup
        // Extract section.fieldId pattern, check if fieldId ends with "PostalCode"
        const dotIdx = key.indexOf('.');
        if (dotIdx === -1) return;
        const secId = key.substring(0, dotIdx);
        const fieldId = key.substring(dotIdx + 1);

        // Detect PostalCode suffix and extract prefix (e.g., "home", "mail", "employer")
        if (!fieldId.endsWith('PostalCode')) return;
        const prefix = fieldId.replace('PostalCode', '');

        // Only auto-fill for Brazil
        const countryKey = secId + '.' + prefix + 'Country';
        // Check both this.data and arrayData for country value
        let countryVal = this.data[countryKey] || '';
        if (!countryVal) {
            const countryEl = document.getElementById(countryKey);
            if (countryEl) countryVal = countryEl.value || '';
        }
        if (countryVal !== 'BRZL') return;

        const cep = (rawValue || '').replace(/\D/g, '');
        if (cep.length !== 8) return;

        // Build sibling keys
        const siblings = {
            street1: secId + '.' + prefix + 'Street1',
            street2: secId + '.' + prefix + 'Street2',
            city: secId + '.' + prefix + 'City',
            state: secId + '.' + prefix + 'State'
        };

        // Anti-loop: skip if address is already filled for this CEP
        const lastCepKey = '_lastCep_' + secId + '_' + prefix;
        const street1El = document.getElementById(siblings.street1);
        if (this[lastCepKey] === cep && street1El && street1El.value) return;

        try {
            const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
            if (!resp.ok) {
                this._showToast('CEP não encontrado. Verifique o número ou preencha manualmente.', 'error');
                this._toggleAddressFieldsByPrefix(secId, prefix, true);
                return;
            }
            const data = await resp.json();

            // Save via _saveFieldValue to handle both data and arrayData
            if (data.street) { const el = document.getElementById(siblings.street1); if (el) { el.value = data.street.toUpperCase(); this._saveFieldValue(siblings.street1, el.value); } }
            if (data.neighborhood) { const el = document.getElementById(siblings.street2); if (el) { el.value = data.neighborhood.toUpperCase(); this._saveFieldValue(siblings.street2, el.value); } }
            if (data.city) { const el = document.getElementById(siblings.city); if (el) { el.value = data.city.toUpperCase(); this._saveFieldValue(siblings.city, el.value); } }
            if (data.state) { const el = document.getElementById(siblings.state); if (el) { el.value = data.state.toUpperCase(); this._saveFieldValue(siblings.state, el.value); } }

            this.updateProgress();
            if (this.onChange) this.onChange();
            this._toggleAddressFieldsByPrefix(secId, prefix, true);
            this._showToast('Endereço preenchido automaticamente!', 'success');
            this[lastCepKey] = cep; // Cache to prevent re-fetch
        } catch (e) {
            console.warn('[CEP] Lookup failed:', e);
            this._toggleAddressFieldsByPrefix(secId, prefix, true);
            this._showToast('Erro ao buscar CEP. Verifique o número ou preencha manualmente.', 'error');
        }
    }

    // =========================================
    // FILE UPLOAD HANDLERS
    // =========================================
    onFileChange(key, inputEl) {
        const file = inputEl.files?.[0];
        if (!file) return;

        // Find field config for validation
        const [secId, fieldId] = key.split('.');
        const sec = this.schema.sections.find(s => s.id === secId);
        const fieldDef = sec?.fields?.find(f => f.id === fieldId);

        // Validate file type
        if (fieldDef?.accept && !file.type.match(fieldDef.accept.replace('*', '.*'))) {
            this._showToast('Formato de arquivo inválido. Use JPEG (.jpg).', 'error');
            inputEl.value = '';
            return;
        }

        // Validate file size
        const maxSizeKb = fieldDef?.maxSizeKb || 500;
        if (file.size > maxSizeKb * 1024) {
            this._showToast(`Arquivo muito grande (${Math.round(file.size/1024)}kb). Máximo: ${maxSizeKb}kb.`, 'error');
            inputEl.value = '';
            return;
        }

        // Read file as base64 data URL for preview and storage
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.data[key] = dataUrl;

            // Show preview, hide upload button
            const preview = document.getElementById(key + '-preview');
            const img = document.getElementById(key + '-img');
            const label = inputEl.closest('.file-upload-label');

            if (preview && img) {
                img.src = dataUrl;
                preview.style.display = '';
            }
            if (label) label.style.display = 'none';

            // Clear validation errors
            const errEl = document.getElementById('err-' + key);
            if (errEl) errEl.textContent = '';

            this.updateProgress();
            if (this.onChange) this.onChange();
            this._showToast('Foto carregada com sucesso!', 'success');
        };
        reader.readAsDataURL(file);
    }

    removeFile(key) {
        delete this.data[key];

        const preview = document.getElementById(key + '-preview');
        const container = document.getElementById(key + '-container');
        const label = container?.querySelector('.file-upload-label');
        const inputEl = document.getElementById(key);

        if (preview) preview.style.display = 'none';
        if (label) label.style.display = '';
        if (inputEl) inputEl.value = '';

        this.updateProgress();
        if (this.onChange) this.onChange();
    }

    _saveFieldValue(key, value) {
        if (key.includes('[')) {
            this._setArrayValue(key, value);
        } else {
            this.data[key] = value;
        }
    }

    _toggleAddressFieldsByPrefix(secId, prefix, show) {
        const suffixes = ['Street1', 'Street2', 'City', 'State'];
        suffixes.forEach(suffix => this._toggleFieldRow(secId, prefix + suffix, show));
    }

    // Apply country-specific address rules:
    // Brasil: hide NA on PostalCode/State, make Street2 required
    // Other:  show NA on PostalCode/State, make Street2 optional
    _toggleAddressNaByPrefix(secId, prefix, isBrazil) {
        // 1. Toggle NA checkboxes on PostalCode and State
        const naFields = [prefix + 'PostalCode', prefix + 'State'];
        naFields.forEach(fieldId => {
            const el = document.getElementById(secId + '.' + fieldId);
            if (!el) return;
            const row = el.closest('.field-row');
            if (!row) return;
            const naCheck = row.querySelector('.na-check');
            if (!naCheck) return;
            naCheck.style.display = isBrazil ? 'none' : '';
            // If switching to Brazil, uncheck NA and re-enable input
            if (isBrazil) {
                const checkbox = naCheck.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;
                    el.disabled = false;
                    el.value = '';
                    row.classList.remove('na-disabled');
                    const key = secId + '.' + fieldId;
                    delete this.data[key];
                }
            }
        });

        // 2. Toggle required on Street2
        const street2El = document.getElementById(secId + '.' + prefix + 'Street2');
        if (street2El) {
            const row = street2El.closest('.field-row');
            if (row) {
                const label = row.querySelector('.field-label');
                if (label) {
                    const asterisk = label.querySelector('.req');
                    if (isBrazil && !asterisk) {
                        label.insertAdjacentHTML('beforeend', ' <span class="req">*</span>');
                    } else if (!isBrazil && asterisk) {
                        asterisk.remove();
                    }
                }
                // Mark field-row so validateSection knows
                row.dataset.dynamicRequired = isBrazil ? '1' : '0';
            }
        }
    }

    _toggleFieldRow(secId, fieldId, show) {
        const el = document.getElementById(secId + '.' + fieldId);
        if (!el) return;
        const row = el.closest('.field-row');
        // Never apply inline display to cond-blocks — they are managed by CSS classes (.visible)
        if (row && !row.classList.contains('cond-block')) {
            row.style.display = show ? '' : 'none';
        }
    }

    onDateChange(key) {
        const day = document.getElementById(key + '.day')?.value || '';
        const month = document.getElementById(key + '.month')?.value || '';
        const year = document.getElementById(key + '.year')?.value || '';
        const dateVal = (day || month || year) ? { day, month, year } : null;
        // Array sub-field: save to arrayData
        if (key.includes('[')) {
            const match = key.match(/^(.+?)\[(\d+)\]\.(.+)$/);
            if (match) {
                const [, arrKey, idxStr, subId] = match;
                const idx = parseInt(idxStr);
                if (!this.arrayData[arrKey]) this.arrayData[arrKey] = [];
                while (this.arrayData[arrKey].length <= idx) this.arrayData[arrKey].push({});
                this.arrayData[arrKey][idx][subId] = dateVal;
            }
        } else {
            this.data[key] = dateVal;
        }
        // Clear error state
        ['.day', '.month', '.year'].forEach(suffix => {
            document.getElementById(key + suffix)?.classList.remove('error');
        });
        const errEl = document.getElementById('err-' + key);
        if (errEl) errEl.textContent = '';
        this.updateProgress();
        this._debounceSave('DATE', key);

        // When DOB changes, re-evaluate section visibility (age < 14 hides work/ed)
        if (key === 'personal1.dob') {
            this._updateSectionNumbers();
            this._updateFinishButton();
            if (this.renderMode === 'pages') {
                this._showCurrentPage({ doScroll: false });
            } else {
                // In accordion mode, show/hide workEducation sections
                const isMinor = this._isUnder14();
                ['workEducation1', 'workEducation2', 'workEducation3'].forEach(secId => {
                    const el = document.getElementById('sec-' + secId);
                    if (el) el.style.display = isMinor ? 'none' : '';
                });
            }
        }
    }

    // =========================================
    // N/A & UNKNOWN
    // =========================================
    toggleNA(key, checked) {
        const el = document.getElementById(key);
        // SSN: disable/enable 3 parts
        const ssnP1 = document.getElementById(key + '_p1');
        if (ssnP1) {
            ['_p1', '_p2', '_p3'].forEach(suffix => {
                const part = document.getElementById(key + suffix);
                if (part) {
                    part.disabled = checked;
                    if (checked) part.value = '';
                }
            });
        // Date: disable/enable 3 parts
        } else if (document.getElementById(key + '.day')) {
            ['.day', '.month', '.year'].forEach(suffix => {
                const part = document.getElementById(key + suffix);
                if (part) {
                    part.disabled = checked;
                    if (checked) part.value = '';
                }
            });
        } else if (el) {
            el.disabled = checked;
            if (checked) { el.value = ''; el.placeholder = ''; }
        }
        if (checked) {
            this.data[key] = 'DNA';
            this.naFields.add(key);
        } else {
            this.data[key] = ssnP1 ? { p1: '', p2: '', p3: '' } : '';
            this.naFields.delete(key);
        }
        if (el) el.classList.remove('error');
        const errEl = document.getElementById('err-' + key);
        if (errEl) errEl.textContent = '';
        // Visual: mark parent row as disabled
        const fieldRow = (el || ssnP1)?.closest('.field-row');
        if (fieldRow) fieldRow.classList.toggle('na-disabled', checked);
        this.updateProgress();
        this._debounceSave('NA', key);
    }

    toggleUnknown(key, checked) {
        const el = document.getElementById(key);
        if (!el) {
            // Date fields
            ['day', 'month', 'year'].forEach(part => {
                const partEl = document.getElementById(key + '.' + part);
                if (partEl) { partEl.disabled = checked; if (checked) partEl.value = ''; }
            });
        } else {
            el.disabled = checked;
            if (checked) el.value = '';
        }
        if (checked) {
            this.data[key] = 'UNKNOWN';
            this.unknownFields.add(key);
        } else {
            this.data[key] = '';
            this.unknownFields.delete(key);
        }
        // Visual: mark parent row as disabled
        const target = el || document.getElementById(key + '.day');
        const fieldRow = target?.closest('.field-row');
        if (fieldRow) fieldRow.classList.toggle('na-disabled', checked);

        // Find the field definition to check for unknownAlso / unknownExcludes
        const dotIdx = key.indexOf('.');
        const secId = key.substring(0, dotIdx);
        const fieldId = key.substring(dotIdx + 1);
        const sec = this.schema.sections.find(s => s.id === secId);
        const fieldDef = sec?.fields?.find(f => f.id === fieldId);

        // unknownAlso: also toggle sibling fields in the same section
        if (fieldDef?.unknownAlso) {
            fieldDef.unknownAlso.forEach(sibId => {
                const sibKey = secId + '.' + sibId;
                const sibEl = document.getElementById(sibKey);
                if (sibEl) {
                    sibEl.disabled = checked;
                    if (checked) sibEl.value = '';
                }
                if (checked) {
                    this.data[sibKey] = 'UNKNOWN';
                    this.unknownFields.add(sibKey);
                } else {
                    this.data[sibKey] = '';
                    this.unknownFields.delete(sibKey);
                }
                const sibRow = sibEl?.closest('.field-row');
                if (sibRow) sibRow.classList.toggle('na-disabled', checked);
            });
        }

        // unknownExcludes: mutual exclusion — uncheck the opposite group
        if (checked && fieldDef?.unknownExcludes) {
            const exclId = fieldDef.unknownExcludes;
            const exclKey = secId + '.' + exclId;
            if (this.unknownFields.has(exclKey)) {
                // Uncheck the other group's "Não Sei"
                this.toggleUnknown(exclKey, false);
                // Uncheck the DOM checkbox
                const exclCb = document.querySelector(`[data-unknown-for="${exclKey}"]`);
                if (exclCb) exclCb.checked = false;
            }
        }

        // hideWhenAllUnknown: hide fields when ALL referenced fields are UNKNOWN
        if (sec) {
            sec.fields.forEach(f2 => {
                if (!f2.hideWhenAllUnknown) return;
                const allUnknown = f2.hideWhenAllUnknown.every(refId => this.unknownFields.has(secId + '.' + refId));
                const f2Key = secId + '.' + f2.id;
                // Find the DOM row — try direct ID, then date .day, then radio name
                let el = document.getElementById(f2Key);
                if (!el) el = document.getElementById(f2Key + '.day');
                if (!el) el = document.querySelector(`input[name="${f2Key}"]`);
                const row = el?.closest('.field-row');
                if (row) row.style.display = allUnknown ? 'none' : '';
                // Clear data when hidden
                if (allUnknown) {
                    if (f2.type === 'date') {
                        this.data[f2Key] = '';
                        ['day', 'month', 'year'].forEach(part => {
                            const partEl = document.getElementById(f2Key + '.' + part);
                            if (partEl) partEl.value = '';
                        });
                    } else if (f2.type === 'radio') {
                        this.data[f2Key] = '';
                        document.querySelectorAll(`input[name="${f2Key}"]`).forEach(r => r.checked = false);
                        // Also hide any children shown by this radio
                        this._evaluateConditionals(f2Key, '');
                    }
                }
            });
        }

        this.updateProgress();
        this._debounceSave('UNKNOWN', key);
    }

    // =========================================
    // CONDITIONALS
    // =========================================
    _reEvaluateAllConditionals() {
        // Re-evaluate all conditionals using loaded data to sync DOM visibility
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                const key = sec.id + '.' + f.id;
                if (f.type === 'array') {
                    // Re-evaluate conditionals inside array sub-fields
                    const entries = this.arrayData[key] || [];
                    entries.forEach((entry, idx) => {
                        if (!f.fields) return;
                        f.fields.forEach(subF => {
                            const subKey = `${key}[${idx}].${subF.id}`;
                            const subVal = entry[subF.id] || '';
                            if (subVal) this._evaluateConditionals(subKey, subVal);
                        });
                    });
                    return;
                }
                const val = this.data[key] || '';
                if (val) this._evaluateConditionals(key, val);
            });
        });
    }

    _evaluateConditionals(changedKey, val) {
        // Field-level conditionals
        let dataChanged = false;
        document.querySelectorAll(`[data-show-when="${changedKey}"]`).forEach(el => {
            const showVal = el.dataset.showValue;
            const showIn = el.dataset.showIn;
            const showNotIn = el.dataset.showNotIn;

            let visible = false;
            if (showVal) visible = val === showVal;
            if (showIn) {
                try { visible = JSON.parse(showIn).includes(val); } catch (e) { }
            }
            if (showNotIn) {
                try { visible = val && !JSON.parse(showNotIn).includes(val); } catch (e) { }
            }

            el.classList.toggle('visible', visible);

            // Clear values of hidden fields recursively (but NOT during hydration)
            if (!visible && !this._isHydrating) {
                // Clear text inputs, selects, textareas
                el.querySelectorAll('.field-input, select.field-input, textarea.field-input').forEach(input => {
                    input.value = '';
                    const inputKey = input.id;
                    if (inputKey) {
                        if (this.data[inputKey] !== undefined) {
                            delete this.data[inputKey];
                            dataChanged = true;
                            this._evaluateConditionals(inputKey, '');
                        }
                    }
                });
                // Clear radios
                el.querySelectorAll('input[type="radio"]').forEach(r => {
                    if (r.checked) {
                        r.checked = false;
                        const inputKey = r.name;
                        if (inputKey && this.data[inputKey] !== undefined) {
                            delete this.data[inputKey];
                            dataChanged = true;
                            this._evaluateConditionals(inputKey, '');
                        }
                    }
                });
                // Clear arrays (add another) — remove from arrayData AND reset DOM
                el.querySelectorAll('[data-array-key]').forEach(arrEl => {
                    const arrKey = arrEl.dataset.arrayKey;
                    if (arrKey) {
                        if (this.arrayData[arrKey]) {
                            delete this.arrayData[arrKey];
                            dataChanged = true;
                        }
                        // Reset DOM: keep only 1 empty entry
                        const container = arrEl; // The array container IS arrEl (class=array-container)
                        if (container) {
                            const entries = container.querySelectorAll('.array-entry');
                            // Remove all entries except the first
                            entries.forEach((entry, idx) => {
                                if (idx > 0) entry.remove();
                            });
                            // Clear all inputs in the remaining first entry
                            if (entries[0]) {
                                entries[0].querySelectorAll('.field-input').forEach(inp => { inp.value = ''; });
                                entries[0].querySelectorAll('input[type="radio"]:checked').forEach(r => { r.checked = false; });
                            }
                        }
                        // Hide remove button if only 1 entry remains
                        const remaining = arrEl.querySelectorAll('.array-entry');
                        remaining.forEach(e => {
                            const rmBtn = e.querySelector('.array-remove');
                            if (rmBtn) rmBtn.style.display = remaining.length <= 1 ? 'none' : '';
                        });
                    }
                });
            }
        });

        // Section-level conditionals
        let secChanged = false;
        this.schema.sections.forEach(sec => {
            if (!sec.conditional || !sec.showWhen) return;
            const condKey = sec.showWhen.section + '.' + sec.showWhen.field;
            if (condKey !== changedKey) return;

            const secEl = document.getElementById('sec-' + sec.id);
            if (!secEl) return;

            let visible = false;
            if (sec.showWhen.equals) visible = val === sec.showWhen.equals;
            if (sec.showWhen.in) visible = sec.showWhen.in.includes(val);

            secEl.style.display = visible ? '' : 'none';
            secChanged = true;

            // Clear all data from hidden conditional sections
            if (!visible) {
                sec.fields.forEach(f => {
                    const key = sec.id + '.' + f.id;
                    if (f.type === 'array') {
                        if (this.arrayData[key]) {
                            delete this.arrayData[key];
                            dataChanged = true;
                        }
                    } else if (this.data[key] !== undefined) {
                        delete this.data[key];
                        dataChanged = true;
                    }
                });
                // Clear DOM inputs in hidden section
                secEl.querySelectorAll('.field-input').forEach(input => { input.value = ''; });
                secEl.querySelectorAll('input[type="radio"]:checked').forEach(r => { r.checked = false; });
            }
        });
        if (secChanged) {
            this._updateSectionNumbers();
            this._updateFinishButton();
            // In pages mode, re-render current page so conditional sections
            // appear as separate pages instead of overlapping the current one
            if (this.renderMode === 'pages') {
                this._showCurrentPage({ doScroll: false });
            }
        }

        // Trigger auto-save if data was cleaned
        if (dataChanged && this.onChange) {
            this.updateProgress();
            this.onChange(changedKey, val);
        }

        // Re-apply address toggles after conditionals change
        this._applyAddressToggles();
    }

    // Re-apply all address-related JS toggles (SameAddress + Country)
    // Called after _evaluateConditionals to ensure fields inside cond-blocks stay correctly hidden
    _applyAddressToggles() {
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                // SameAddress toggle
                if (f.id.endsWith('SameAddress')) {
                    const val = this.data[sec.id + '.' + f.id] || '';
                    const basePrefix = f.id.replace('SameAddress', '');
                    const addrPrefix = basePrefix + 'Person';
                    if (val !== 'N') {
                        this._toggleFieldRow(sec.id, addrPrefix + 'Country', false);
                        this._toggleFieldRow(sec.id, addrPrefix + 'PostalCode', false);
                        this._toggleAddressFieldsByPrefix(sec.id, addrPrefix, false);
                    } else {
                        // N: show country, apply country logic for rest
                        this._toggleFieldRow(sec.id, addrPrefix + 'Country', true);
                        const countryVal = this.data[sec.id + '.' + addrPrefix + 'Country'] || '';
                        this._applyCountryToggle(sec.id, addrPrefix, countryVal);
                    }
                }
                // Country toggle (for all *Country fields)
                if (f.id.endsWith('Country')) {
                    const val = this.data[sec.id + '.' + f.id] || f.default || '';
                    const prefix = f.id.replace('Country', '');
                    // Skip if this country field is itself hidden
                    const el = document.getElementById(sec.id + '.' + f.id);
                    if (el) {
                        const row = el.closest('.field-row');
                        if (row && row.style.display === 'none') return;
                    }
                    this._applyCountryToggle(sec.id, prefix, val);
                }
                // Array sub-fields: Country toggle for each entry
                if (f.type === 'array' && f.fields) {
                    f.fields.forEach(subF => {
                        if (!subF.id.endsWith('Country')) return;
                        const arrKey = sec.id + '.' + f.id;
                        const entries = this.arrayData[arrKey] || [];
                        entries.forEach((entry, idx) => {
                            const subKey = `${arrKey}[${idx}].${subF.id}`;
                            const countryEl = document.getElementById(subKey);
                            const val = countryEl ? countryEl.value : (entry[subF.id] || '');
                            const prefix = `${f.id}[${idx}].${subF.id.replace('Country', '')}`;
                            this._applyCountryToggle(sec.id, prefix, val);
                        });
                    });
                }
            });
        });
    }

    _applyCountryToggle(secId, prefix, val) {
        const street1Key = secId + '.' + prefix + 'Street1';
        const cityKey = secId + '.' + prefix + 'City';
        const street1El = document.getElementById(street1Key);
        const cityEl = document.getElementById(cityKey);
        const hasData = this.data[street1Key] || this.data[cityKey] || (street1El && street1El.value) || (cityEl && cityEl.value);
        if (val === 'BRZL') {
            this._toggleFieldRow(secId, prefix + 'PostalCode', true);
            this._toggleAddressFieldsByPrefix(secId, prefix, true);
        } else if (val) {
            this._toggleFieldRow(secId, prefix + 'PostalCode', true);
            this._toggleAddressFieldsByPrefix(secId, prefix, true);
        } else {
            // No country selected: hide and clear all address fields
            this._toggleFieldRow(secId, prefix + 'PostalCode', false);
            this._toggleAddressFieldsByPrefix(secId, prefix, false);
            const suffixes = ['PostalCode', 'Street1', 'Street2', 'City', 'State'];
            suffixes.forEach(suffix => {
                const k = secId + '.' + prefix + suffix;
                const el = document.getElementById(k);
                if (el) { el.value = ''; el.classList.remove('error'); }
                delete this.data[k];
                const errEl = document.getElementById('err-' + k);
                if (errEl) errEl.textContent = '';
            });
        }
        this._toggleAddressNaByPrefix(secId, prefix, val === 'BRZL');
    }

    // =========================================
    // MULTI-PAGE MODE — getVisibleSections + renderPageMode + stepBar
    // =========================================

    /**
     * Calculates if applicant is under 14 based on DOB.
     * DS-160 hides Work/Education sections for minors under 14.
     */
    _isUnder14() {
        const dob = this.data['personal1.dob'];
        if (!dob || !dob.year || !dob.month || !dob.day) return false;

        const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
        const m = months[dob.month] ?? -1;
        if (m < 0) return false;

        const birthDate = new Date(parseInt(dob.year), m, parseInt(dob.day));
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

        return age < 14;
    }

    /**
     * Returns sections that should be visible based on current data.
     * Handles: maritalStatus, age (<14 skips work/ed), and visa-specific conditionals.
     */
    getVisibleSections() {
        const isMinor = this._isUnder14();
        const workEdSections = ['workEducation1', 'workEducation2', 'workEducation3'];

        return this.schema.sections.filter((sec, idx) => {
            // Age < 14: skip Work/Education sections
            if (isMinor && workEdSections.includes(sec.id)) return false;

            if (!sec.conditional) return true;
            if (!sec.showWhen) return true;

            const condSection = sec.showWhen.section || sec.id;
            const condKey = condSection + '.' + sec.showWhen.field;
            const val = this.data[condKey] || '';

            if (sec.showWhen.equals) return val === sec.showWhen.equals;
            if (sec.showWhen.in) return sec.showWhen.in.includes(val);
            return true;
        });
    }

    /**
     * Renders the step-bar for page navigation
     */
    renderStepBar() {
        const container = document.getElementById('step-bar');
        if (!container) return;

        const visible = this.getVisibleSections();
        const currentSecId = visible[this.currentSection]?.id;

        container.innerHTML = visible.map((sec, i) => {
            const isActive = i === this.currentSection;
            const isVisited = this.visitedSections.has(this.schema.sections.indexOf(sec));
            const status = isActive ? 'active' : isVisited ? 'completed' : 'pending';
            const label = sec.label.replace(/[\(\)]/g, '').split(' ').slice(0, 2).join(' ');
            return `<div class="step-item step-${status}" onclick="engine.goToPage(${i})" title="${sec.label}">
                <span class="step-num">${isVisited && !isActive ? '✓' : i + 1}</span>
                <span class="step-label">${label}</span>
            </div>`;
        }).join('<div class="step-connector"></div>');
    }

    /**
     * Navigate to specific page index in page mode
     */
    goToPage(pageIdx) {
        const visible = this.getVisibleSections();
        if (pageIdx < 0 || pageIdx >= visible.length) return;

        // Forward navigation: validate current page first
        const isAssessor = document.body.classList.contains('role-assessor');
        if (!isAssessor && pageIdx > this.currentSection) {
            const currentGlobalIdx = this.schema.sections.indexOf(visible[this.currentSection]);
            const errors = this.validateSection(currentGlobalIdx, true);
            if (errors.length > 0) {
                const firstErrEl = document.querySelector(`#body-${currentGlobalIdx} .field-input.error, #body-${currentGlobalIdx} .field-error:not(:empty)`);
                if (firstErrEl) firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            this.visitedSections.add(currentGlobalIdx);
        }

        this.currentSection = pageIdx;
        this._showCurrentPage();
    }

    /**
     * Shows only the current page, hides all others (page mode)
     */
    _showCurrentPage(opts = {}) {
        if (this.renderMode !== 'pages') return;

        const visible = this.getVisibleSections();
        const currentSec = visible[this.currentSection];
        if (!currentSec) return;

        // Hide all section cards
        this.schema.sections.forEach(sec => {
            const card = document.getElementById('sec-' + sec.id);
            if (card) card.style.display = 'none';
        });

        // Show current section card with body open
        const currentCard = document.getElementById('sec-' + currentSec.id);
        if (currentCard) {
            currentCard.style.display = '';
            const globalIdx = this.schema.sections.indexOf(currentSec);
            const body = document.getElementById('body-' + globalIdx);
            if (body) body.classList.add('open');
            // Hide the accordion header in page mode
            const header = currentCard.querySelector('.section-header');
            if (header) header.style.display = 'none';

            // Inject visible page title inside body (replaces hidden header)
            body.querySelectorAll('.page-title').forEach(el => el.remove());
            const titleEl = document.createElement('div');
            titleEl.className = 'page-title';
            titleEl.innerHTML = `<span class="page-title-num">${this.currentSection + 1}</span> ${currentSec.label}`;
            // Insert after .form-notice if present, otherwise as first child
            const existingNotice = body.querySelector('.form-notice');
            if (existingNotice) {
                existingNotice.insertAdjacentElement('afterend', titleEl);
            } else {
                body.insertBefore(titleEl, body.firstChild);
            }
        }

        // Update nav buttons
        const navContainer = document.getElementById('page-nav');
        if (navContainer) {
            const hasPrev = this.currentSection > 0;
            const hasNext = this.currentSection < visible.length - 1;
            const isLast = this.currentSection === visible.length - 1;

            navContainer.innerHTML = `
                <button class="btn-nav" ${hasPrev ? '' : 'disabled'} onclick="engine.goToPage(${this.currentSection - 1})">
                    Anterior
                </button>
                <span class="page-counter">${this.currentSection + 1} / ${visible.length}</span>
                ${isLast
                    ? '<button class="btn-nav btn-nav-finish" onclick="engine.showReview()">Finalizar</button>'
                    : `<button class="btn-nav btn-nav-next" onclick="engine.goToPage(${this.currentSection + 1})">Próximo</button>`
                }
            `;
        }


        this._updateSectionStatus();

        // Auto-save on page change
        if (this.onSave) this.onSave();

        // Scroll to top (only on explicit page navigation, not data changes)
        if (opts.doScroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Switches between accordion and pages render mode
     */
    setRenderMode(mode) {
        this.renderMode = mode;
        const formEl = document.getElementById('view-form');
        if (!formEl) return;

        if (mode === 'pages') {
            formEl.classList.add('pages-mode');
            formEl.classList.remove('accordion-mode');
            // Remove step-bar if it exists
            document.getElementById('step-bar')?.remove();
            // Insert page-nav if not present
            if (!document.getElementById('page-nav')) {
                formEl.insertAdjacentHTML('afterend', '<div id="page-nav" class="page-nav"></div>');
            }

            // Hide progress bar in pages mode
            const progressEl = document.querySelector('.progress-container');
            if (progressEl) progressEl.style.display = 'none';
            this._showCurrentPage();
        } else {
            formEl.classList.add('accordion-mode');
            formEl.classList.remove('pages-mode');
            // Show all sections
            this.schema.sections.forEach((sec, idx) => {
                const card = document.getElementById('sec-' + sec.id);
                if (card) {
                    card.style.display = (sec.conditional && sec.showWhen) ? 'none' : '';
                    const header = card.querySelector('.section-header');
                    if (header) header.style.display = '';
                }
            });
            this._reEvaluateAllConditionals();
            // Remove step-bar and page-nav
            document.getElementById('step-bar')?.remove();
            document.getElementById('page-nav')?.remove();
        }
    }

    // =========================================
    // SECTION NAVIGATION (ACCORDION MODE)
    toggleSection(idx, doScroll = true) {
        const bodies = document.querySelectorAll('.section-body');

        // Find current open section index
        let currentOpenIdx = -1;
        bodies.forEach((b, i) => {
            if (b.classList.contains('open')) currentOpenIdx = i;
        });

        // Forward navigation: validate all sections before the target
        // Assessors can navigate freely (no blocking validation)
        // When no section is open (all collapsed), validate from section 0
        const isAssessor = document.body.classList.contains('role-assessor');
        const validateFrom = currentOpenIdx >= 0 ? currentOpenIdx : 0;
        if (!isAssessor && (idx > validateFrom || (currentOpenIdx === -1 && idx > 0))) {
            for (let i = validateFrom; i < idx; i++) {
                const secEl = document.getElementById('sec-' + this.schema.sections[i].id);
                if (secEl && secEl.style.display === 'none') continue; // skip hidden sections

                const errors = this.validateSection(i, i === validateFrom);
                if (errors.length > 0) {
                    this._showToast(`Complete a seção "${this.schema.sections[i].label}" antes de avançar`, 'error');
                    // Open the incomplete section so the user can fill it
                    bodies.forEach((b, j) => {
                        b.classList.toggle('open', j === i);
                        const chev = document.getElementById('chev-' + j);
                        if (chev) chev.classList.toggle('open', j === i);
                    });
                    const card = document.getElementById('sec-' + this.schema.sections[i].id);
                    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    this.currentSection = i;
                    return; // Block forward navigation
                }
            }
        }

        // Allow navigation (backward is always free, forward passed validation)
        const body = document.getElementById('body-' + idx);
        const isOpen = body?.classList.contains('open');

        bodies.forEach((b, i) => {
            b.classList.toggle('open', i === idx && !isOpen);
            const chev = document.getElementById('chev-' + i);
            if (chev) chev.classList.toggle('open', i === idx && !isOpen);
        });

        if (!isOpen && doScroll) {
            const card = document.getElementById('sec-' + this.schema.sections[idx].id);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.currentSection = idx;
        this._updateSectionStatus();
    }

    goNext(currentIdx) {
        // Auto-save before advancing
        if (this.onSave) this.onSave();

        // Validate current section before advancing
        const errors = this.validateSection(currentIdx, true);
        if (errors.length > 0) {
            // Scroll to first error field
            const sec = this.schema.sections[currentIdx];
            if (sec) {
                const firstErrEl = document.querySelector(`#body-${currentIdx} .field-input.error, #body-${currentIdx} .field-error:not(:empty)`);
                if (firstErrEl) firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return; // Block navigation
        }

        // Mark current section as visited/confirmed
        this.visitedSections.add(currentIdx);
        this._updateSectionStatus();

        // Find next visible section
        let foundNext = false;
        for (let i = currentIdx + 1; i < this.schema.sections.length; i++) {
            const secEl = document.getElementById('sec-' + this.schema.sections[i].id);
            if (secEl && secEl.style.display !== 'none') {
                foundNext = true;
                // Close current, open next
                const bodies = document.querySelectorAll('.section-body');
                bodies.forEach((b, j) => {
                    b.classList.toggle('open', j === i);
                    const chev = document.getElementById('chev-' + j);
                    if (chev) chev.classList.toggle('open', j === i);
                });
                this.currentSection = i;
                this._updateSectionStatus();

                // Scroll: position the closed section header at the top, so the opened section is visible below
                const closedCard = document.getElementById('sec-' + this.schema.sections[currentIdx].id);
                if (closedCard) {
                    setTimeout(() => {
                        closedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                }
                return;
            }
        }

        // If no next section found, this is the last section — check if ALL sections are complete
        if (!foundNext) {
            // Validate ALL sections before showing completion
            let allComplete = true;
            let firstIncompleteIdx = -1;
            this.schema.sections.forEach((s, i) => {
                const errs = this.validateSection(i, false);
                if (errs.length > 0 && firstIncompleteIdx === -1) {
                    // Check if section is visible (not hidden by conditional)
                    const card = document.getElementById('sec-' + s.id);
                    if (card && card.style.display !== 'none') {
                        allComplete = false;
                        firstIncompleteIdx = i;
                    }
                }
            });

            if (!allComplete && firstIncompleteIdx >= 0) {
                // Open the first incomplete section instead of showing completion
                this.toggleSection(firstIncompleteIdx);
                return;
            }

            // Close current section
            const bodies = document.querySelectorAll('.section-body');
            bodies.forEach((b, j) => {
                b.classList.remove('open');
                const chev = document.getElementById('chev-' + j);
                if (chev) chev.classList.remove('open');
            });
            this._updateSectionStatus();
            this._showCompletionScreen();
        }
    }

    // =========================================
    // FORM LOGGING — persistent error/event tracking to Supabase
    // =========================================
    /**
     * Log a form event to Supabase form_logs table.
     * @param {'error'|'warning'|'info'|'action'} level
     * @param {string} message
     * @param {object} [details] - Extra context (field, section, value, stack, etc.)
     */
    async formLog(level, message, details = {}) {
        try {
            if (typeof AppCore === 'undefined') return;
            const applicantId = new URLSearchParams(location.search).get('id');
            if (!applicantId) return;
            await AppCore.sbFetch('form_logs', 'POST', {
                applicant_id: applicantId,
                log_type: level,
                error_message: message,
                error_details: details,
                page_name: details.section || details.action || null,
                user_agent: navigator.userAgent.substring(0, 200)
            });
        } catch (e) {
            console.warn('[FormLog] Failed to log:', e.message);
        }
    }

    // =========================================
    // SHOW REVIEW / FINALIZAR — validates all, saves, updates status
    // =========================================
    async showReview() {
        // 1. Validate all visible sections
        const visible = this.schema.sections.filter(s => {
            if (!s.conditional && !s.showWhen) return true;
            const el = document.getElementById('sec-' + s.id);
            return el && el.style.display !== 'none';
        });

        const errors = {};
        let totalErrors = 0;
        visible.forEach(sec => {
            const secIdx = this.schema.sections.indexOf(sec);
            const secErrors = this.validateSection(secIdx, true);
            if (secErrors.length > 0) {
                errors[sec.label || sec.id] = secErrors;
                totalErrors += secErrors.length;
            }
        });

        // 2. If errors exist, show summary and scroll to first error section
        if (totalErrors > 0) {
            const errorSummary = Object.entries(errors)
                .map(([sec, errs]) => `• ${sec}: ${errs.length} campo(s)`)
                .join('\n');

            // Log the validation failure
            this.formLog('warning', `Finalização bloqueada: ${totalErrors} erro(s) de validação`, {
                action: 'finalize_blocked',
                errors: errors
            });

            // Show error toast/alert
            if (typeof AppCore !== 'undefined' && AppCore.toast) {
                AppCore.toast(`${totalErrors} campo(s) com erro. Corrija antes de finalizar.`, 'error');
            } else {
                alert(`Existem ${totalErrors} campo(s) com erro:\n\n${errorSummary}\n\nCorrija antes de finalizar.`);
            }

            // Navigate to first section with errors in pages mode
            const firstErrorSection = visible.findIndex(sec => {
                const secErrors = this.validateSection(sec);
                return secErrors.length > 0;
            });
            if (firstErrorSection >= 0 && this.renderMode === 'pages') {
                this.goToPage(firstErrorSection);
            }
            return;
        }

        // 3. All valid — save data
        if (this.onSave) this.onSave();

        // 4. Update applicant status to ready for DS-160
        const applicantId = new URLSearchParams(location.search).get('id');
        if (applicantId && typeof AppCore !== 'undefined') {
            try {
                await AppCore.sbFetch(`applicants?id=eq.${applicantId}`, 'PATCH', {
                    stage: 'ds160',
                    status: 'todo',
                    updated_at: new Date().toISOString()
                });
                console.log('[Form] ✅ Applicant marcado como ds160/todo');
                this.formLog('info', 'Formulário finalizado com sucesso', {
                    action: 'finalize_success',
                    sections_count: visible.length
                });
            } catch (e) {
                console.error('[Form] Erro ao atualizar status:', e);
                this.formLog('error', 'Erro ao atualizar status do applicant', {
                    action: 'finalize_error',
                    error: e.message
                });
                // Show error to user — do NOT show completion screen
                alert('Erro ao salvar o formulário. Verifique sua conexão e tente novamente.\n\nDetalhes: ' + (e.message || 'Erro desconhecido'));
                return;
            }

            // Call onFinalize callback if defined
            if (typeof this.onFinalize === 'function') {
                this.onFinalize(applicantId);
            }
        }

        // 5. Show completion screen
        this._showCompletionScreen();

        // 6. Update nav bar — replace Finalizar with "Ir para Lista"
        const navContainer = document.getElementById('page-nav');
        if (navContainer) {
            navContainer.innerHTML = `
                <span></span>
                <span class="page-counter">Formulário concluído ✓</span>
                <button class="btn-nav btn-nav-finish" onclick="typeof goBack === 'function' ? goBack() : window.history.back()">Ir para Lista</button>
            `;
        }
    }

    _showCompletionScreen() {
        // Auto-save
        if (this.onSave) this.onSave();

        // Collapse all sections
        document.querySelectorAll('.section-body').forEach((b, i) => {
            b.classList.remove('open');
            const chev = document.getElementById('chev-' + i);
            if (chev) chev.classList.remove('open');
        });

        // Update status one final time
        this._updateSectionStatus();

        // Remove any existing completion screen
        const existing = document.getElementById('completion-screen');
        if (existing) existing.remove();

        // Create completion screen
        const completionDiv = document.createElement('div');
        completionDiv.id = 'completion-screen';
        completionDiv.innerHTML = `
            <div class="completion-card">
                <div class="completion-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" stroke="#719F2A" stroke-width="3" fill="#f0f8e0"/>
                        <path d="M20 33l8 8 16-18" stroke="#719F2A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </div>
                <h2 class="completion-title">Preenchimento Concluído!</h2>
                <p class="completion-text">
                    Todas as seções do formulário DS-160 foram preenchidas com sucesso.
                    Os dados foram salvos automaticamente.
                </p>
                <p class="completion-subtext">
                    Você pode revisar qualquer seção clicando sobre ela acima, ou use o botão abaixo para voltar.
                </p>
            </div>
        `;

        // Insert after the form sections
        if (this.container) {
            this.container.appendChild(completionDiv);
            setTimeout(() => {
                completionDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    _updateSectionNumbers() {
        let visibleNum = 1;
        this.schema.sections.forEach((sec, idx) => {
            const secEl = document.getElementById('sec-' + sec.id);
            const numEl = document.getElementById('secnum-' + idx);
            if (secEl && secEl.style.display !== 'none' && numEl) {
                numEl.textContent = visibleNum++;
            }
        });
    }

    _updateFinishButton() {
        // Find the last VISIBLE section index
        let lastVisibleIdx = -1;
        this.schema.sections.forEach((sec, idx) => {
            const secEl = document.getElementById('sec-' + sec.id);
            if (secEl && secEl.style.display !== 'none') {
                lastVisibleIdx = idx;
            }
        });

        // Update all next buttons: last visible gets "Concluir", rest get "Próximo"
        this.schema.sections.forEach((sec, idx) => {
            const btn = document.getElementById('nextBtn-' + idx);
            if (!btn) return;
            if (idx === lastVisibleIdx) {
                btn.textContent = 'Concluir Formulário';
                btn.classList.add('btn-finish');
            } else {
                btn.textContent = 'Próximo';
                btn.classList.remove('btn-finish');
            }
        });
    }

    _updateSectionStatus() {
        let firstIncompleteIdx = -1;

        this.schema.sections.forEach((sec, idx) => {
            const statusEl = document.getElementById('status-' + idx);
            if (!statusEl) return;
            // Skip sections hidden by schema conditionals (not pages mode)
            if (sec.conditional && sec.showWhen) {
                const condKey = (sec.showWhen.section || sec.id) + '.' + sec.showWhen.field;
                const condVal = this.data[condKey] || '';
                if (sec.showWhen.equals && condVal !== sec.showWhen.equals) return;
                if (sec.showWhen.in && !sec.showWhen.in.includes(condVal)) return;
                if (sec.showWhen.notIn && sec.showWhen.notIn.includes(condVal)) return;
            }
            const secEl = document.getElementById('sec-' + sec.id);

            const errors = this.validateSection(idx);

            // Check if section has at least one required field with data (including defaults)
            const hasRequiredData = sec.fields.some(f => {
                if (f.type === 'array') {
                    const key = sec.id + '.' + f.id;
                    const arr = this.arrayData[key];
                    return arr && arr.length > 0 && arr.some(item => Object.values(item).some(v => v && v !== ''));
                }
                if (!f.required) return false;
                // Skip hidden conditional fields
                if (f.showWhen) {
                    const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return false;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return false;
                    if (f.showWhen.notIn && f.showWhen.notIn.includes(parentVal)) return false;
                }
                const key = sec.id + '.' + f.id;
                const val = this.data[key];
                // Accept default values as valid data
                if (!val && f.default) return true;
                return val && ((typeof val === 'string' && val.trim()) || typeof val === 'object');
            });

            // Sections with no required fields (e.g., Intro) are complete once visited
            const hasNoRequiredFields = !sec.fields.some(f => f.required && f.type !== 'alert' && f.type !== 'heading' && f.type !== 'orientation');
            const isComplete = errors.length === 0 && (hasRequiredData || hasNoRequiredFields) && this.visitedSections.has(idx);
            if (isComplete) {
                statusEl.innerHTML = '<span style="color:#719F2A"><i class="iconoir-check-circle-solid"></i></span>';
                if (secEl) secEl.classList.add('section-complete');
            } else {
                statusEl.innerHTML = '<span style="color:#cbd5e1"><i class="iconoir-check-circle-solid"></i></span>';
                if (secEl) secEl.classList.remove('section-complete');
                // Track first incomplete section
                if (firstIncompleteIdx === -1) firstIncompleteIdx = idx;
            }

            // Clear section-current (will be set in second pass)
            if (secEl) secEl.classList.remove('section-current');
        });

        // Mark the first incomplete section as current
        if (firstIncompleteIdx >= 0) {
            const sec = this.schema.sections[firstIncompleteIdx];
            const secEl = document.getElementById('sec-' + sec.id);
            if (secEl) secEl.classList.add('section-current');
        }
    }

    // =========================================
    // VALIDATION
    // =========================================
    validateSection(secIdx, markErrors = false) {
        const sec = this.schema.sections[secIdx];
        if (!sec) return [];

        // Skip sections hidden by schema conditionals (not pages mode)
        if (sec.conditional && sec.showWhen) {
            const condKey = (sec.showWhen.section || sec.id) + '.' + sec.showWhen.field;
            const condVal = this.data[condKey] || '';
            if (sec.showWhen.equals && condVal !== sec.showWhen.equals) return [];
            if (sec.showWhen.in && !sec.showWhen.in.includes(condVal)) return [];
            if (sec.showWhen.notIn && sec.showWhen.notIn.includes(condVal)) return [];
        }

        const errors = [];
        sec.fields.forEach(f => {
            if (f.type === 'alert' || f.type === 'heading' || f.type === 'orientation') return; // Skip display-only fields
            const key = sec.id + '.' + f.id;

            // Validate array sub-fields
            if (f.type === 'array') {
                // Skip if array is conditional and parent condition not met
                if (f.showWhen) {
                    const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                    if (f.showWhen.notIn && f.showWhen.notIn.includes(parentVal)) return;
                }
                const entries = this.arrayData[key] || [{}];
                if (!this.arrayData[key]) this.arrayData[key] = [{}];
                entries.forEach((entry, idx) => {

                    (f.fields || []).forEach(subF => {
                        if (!subF.required) return;
                        // noneOnlyFirstEntry: entry 0 with NONE = skip non-noneField fields
                        if (f.noneOnlyFirstEntry && idx === 0) {
                            const noneVal = f.noneValue || 'NONE';
                            const noneFieldId = f.noneField || 'platform';
                            if (subF.id !== noneFieldId && (entry[noneFieldId] || '') === noneVal) return;
                        }
                        // Skip fields disabled by sibling condition (legacy)
                        if (subF.disableWhenSibling) {
                            const sibVal = entry[subF.disableWhenSibling.field] || '';
                            if (sibVal === subF.disableWhenSibling.equals) return;
                        }
                        // Skip conditional sub-fields whose parent condition not met
                        if (subF.showWhen) {
                            const subParentVal = entry[subF.showWhen.field] || '';
                            if (subF.showWhen.equals && subParentVal !== subF.showWhen.equals) return;
                            if (subF.showWhen.in && !subF.showWhen.in.includes(subParentVal)) return;
                        }
                        const subKey = `${key}[${idx}].${subF.id}`;
                        // Skip required check if N/A or Unknown is marked
                        if (subF.allowNA && this.naFields.has(subKey)) return;
                        if (subF.allowUnknown && this.unknownFields.has(subKey)) return;
                        const subVal = entry[subF.id];
                        let empty = false;
                        if (subF.type === 'date') {
                            empty = !subVal || (!subVal.day && !subVal.month && !subVal.year);
                        } else {
                            empty = !subVal || (typeof subVal === 'string' && !subVal.trim());
                        }
                        if (empty) {
                            errors.push(`${f.label} #${idx + 1}: ${subF.label}`);
                            if (markErrors) {
                                if (subF.type === 'date') {
                                    ['.day', '.month', '.year'].forEach(suffix => {
                                        const part = document.getElementById(subKey + suffix);
                                        if (part) part.classList.add('error');
                                    });
                                } else {
                                    const el = document.getElementById(subKey);
                                    if (el) el.classList.add('error');
                                }
                                const errEl = document.getElementById('err-' + subKey);
                                if (errEl) errEl.textContent = 'Obrigatório';
                            }
                        }
                        // excludeField: block same value as referenced field
                        if (!empty && subF.excludeField) {
                            const excludeKey = sec.id + '.' + subF.excludeField;
                            const excludeVal = this.data[excludeKey];
                            if (excludeVal && subVal === excludeVal) {
                                errors.push(`${f.label} #${idx + 1}: ${subF.label} não pode ser igual à nacionalidade principal`);
                                if (markErrors) {
                                    const el = document.getElementById(subKey);
                                    if (el) el.classList.add('error');
                                    const errEl = document.getElementById('err-' + subKey);
                                    if (errEl) errEl.textContent = 'Não pode ser igual à nacionalidade principal';
                                }
                            }
                        }
                    });
                });
                return;
            }

            if (f.showWhen) {
                const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                const parentVal = this.data[parentKey] || '';
                if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                if (f.showWhen.notIn && f.showWhen.notIn.includes(parentVal)) return;
            }

            if (this.naFields.has(key) || this.unknownFields.has(key)) return;

            const val = this.data[key];

            // Skip fields hidden by JS toggle (e.g., address fields hidden by country logic, hideWhenAllUnknown)
            let fieldEl = document.getElementById(key);
            if (!fieldEl && f.type === 'date') fieldEl = document.getElementById(key + '.day');
            if (!fieldEl && f.type === 'radio') fieldEl = document.querySelector(`input[name="${key}"]`);
            if (fieldEl) {
                const fieldRow = fieldEl.closest('.field-row');
                if (fieldRow && fieldRow.style.display === 'none') return;
                // Skip fields dynamically made optional (e.g., Street2 when country != BRZL)
                if (fieldRow && fieldRow.dataset.dynamicRequired === '0') return;
            }

            if (f.required) {
                let empty = false;
                if (f.type === 'date') {
                    empty = !val || (!val.day && !val.month && !val.year);
                } else if (f.type === 'ssn') {
                    empty = !val || (typeof val === 'object' && !val.p1 && !val.p2 && !val.p3);
                } else {
                    empty = !val || (typeof val === 'string' && !val.trim());
                }

                if (empty) {
                    errors.push(f.label);
                    if (markErrors) {
                        // SSN: mark all 3 parts
                        if (f.type === 'ssn') {
                            ['_p1', '_p2', '_p3'].forEach(suffix => {
                                const part = document.getElementById(key + suffix);
                                if (part) part.classList.add('error');
                            });
                        // Date: mark day, month, year
                        } else if (f.type === 'date') {
                            ['.day', '.month', '.year'].forEach(suffix => {
                                const part = document.getElementById(key + suffix);
                                if (part) part.classList.add('error');
                            });
                        } else {
                            const el = document.getElementById(key);
                            if (el) {
                                el.classList.add('error');
                            } else if (f.type === 'radio') {
                                // Radio fields don't have a single element with the key as ID
                                document.querySelectorAll(`input[name="${key}"]`).forEach(r => r.closest('.field-row')?.classList.add('has-error'));
                            }
                        }
                        const errEl = document.getElementById('err-' + key);
                        if (errEl) errEl.textContent = 'Obrigatório';
                    }
                }
            }

            // Email format validation
            if (f.type === 'email' && val && typeof val === 'string' && val.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val.trim())) {
                    errors.push(`${f.label}: formato de email inválido`);
                    if (markErrors) {
                        const el = document.getElementById(key);
                        if (el) el.classList.add('error');
                        const errEl = document.getElementById('err-' + key);
                        if (errEl) errEl.textContent = 'Formato de email inválido';
                    }
                }
            }

            // notFuture date validation
            if (f.type === 'date' && f.notFuture && val && typeof val === 'object' && val.day && val.month && val.year) {
                const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
                const m = monthMap[val.month];
                if (m !== undefined) {
                    const dateObj = new Date(parseInt(val.year), m, parseInt(val.day));
                    if (dateObj > new Date()) {
                        errors.push(`${f.label}: data não pode ser no futuro`);
                        if (markErrors) {
                            ['.day', '.month', '.year'].forEach(suffix => {
                                const part = document.getElementById(key + suffix);
                                if (part) part.classList.add('error');
                            });
                            const errEl = document.getElementById('err-' + key);
                            if (errEl) errEl.textContent = 'Data não pode ser no futuro';
                        }
                    }
                }
            }
        });
        return errors;
    }

    validateAll() {
        let allErrors = [];
        this.schema.sections.forEach((sec, i) => {
            const errors = this.validateSection(i, true);
            if (errors.length > 0) allErrors.push({ section: sec.label, errors });
        });
        return allErrors;
    }

    // =========================================
    // JSON GENERATION
    // =========================================
    generateJSON() {
        const json = {};
        this.schema.sections.forEach(sec => {
            // Skip sections hidden by SCHEMA conditionals (e.g. visa type conditions)
            // Do NOT skip sections hidden by pages mode (display:none for pagination)
            if (sec.conditional && sec.showWhen) {
                const secEl = document.getElementById('sec-' + sec.id);
                if (secEl && secEl.dataset.secCondition) {
                    // Check if the conditional evaluates to hidden
                    const condKey = (sec.showWhen.section || sec.id) + '.' + sec.showWhen.field;
                    const condVal = this.data[condKey] || '';
                    if (sec.showWhen.equals && condVal !== sec.showWhen.equals) return;
                    if (sec.showWhen.in && !sec.showWhen.in.includes(condVal)) return;
                    if (sec.showWhen.notIn && sec.showWhen.notIn.includes(condVal)) return;
                }
            }

            json[sec.id] = {};
            sec.fields.forEach(f => {
                if (f.type === 'alert') return; // Skip display-only fields
                const key = sec.id + '.' + f.id;

                // Skip hidden conditional fields
                if (f.showWhen) {
                    const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                }

                if (f.type === 'array') {
                    // Always sync array data from DOM — elements exist even when
                    // section is hidden (display:none). _saveArrayData checks if
                    // elements exist (found guard) so it won't wipe data if they
                    // were removed from DOM by conditional logic.
                    this._saveArrayData(sec.id, f.id);
                    const arr = this.arrayData[key];
                    if (arr && arr.length > 0) {
                        json[sec.id][f.id] = arr.filter(entry =>
                            Object.values(entry).some(v => v !== undefined && v !== null && v !== '')
                        ).map(entry => {
                            // Filter conditionals within array entry
                            const newEntry = {};
                            f.fields.forEach(subF => {
                                if (subF.showWhen) {
                                    const pVal = entry[subF.showWhen.field] || '';
                                    if (subF.showWhen.equals && pVal !== subF.showWhen.equals) return;
                                    if (subF.showWhen.in && !subF.showWhen.in.includes(pVal)) return;
                                }
                                if (entry[subF.id] !== undefined && entry[subF.id] !== '') {
                                    newEntry[subF.id] = entry[subF.id];
                                }
                            });
                            return newEntry;
                        });

                        // If all entries evaluated to {}, we can remove the array if it becomes empty
                        if (json[sec.id][f.id].length === 0 || json[sec.id][f.id].every(e => Object.keys(e).length === 0)) {
                            delete json[sec.id][f.id];
                        }
                    }
                    return;
                }

                let val = this.data[key];
                // Preserve DNA/UNKNOWN markers so filler knows field is N/A
                // and loadData can restore checkbox state
                if (val !== undefined && val !== '' && val !== null) {
                    json[sec.id][f.id] = val;
                }
            });

            // Remove empty sections
            if (Object.keys(json[sec.id]).length === 0) delete json[sec.id];
        });
        // Persist visited sections and N/A flags in metadata
        json._meta = {
            visitedSections: Array.from(this.visitedSections),
            naFields: Array.from(this.naFields),
            unknownFields: Array.from(this.unknownFields)
        };
        return json;
    }

    // =========================================
    // PLAYWRIGHT COMMANDS GENERATION
    // =========================================
    generatePlaywrightCommands() {
        const commands = [];
        const json = this.generateJSON();

        this.schema.sections.forEach(sec => {
            if (!json[sec.id]) return;

            sec.fields.forEach(f => {
                const val = json[sec.id]?.[f.id];
                if (val === undefined || val === null || val === '') return;

                if (f.type === 'array' && Array.isArray(val)) {
                    val.forEach((entry, idx) => {
                        f.fields.forEach(subF => {
                            const subVal = entry[subF.id];
                            if (!subVal) return;
                            commands.push(this._buildCommand(subF, subVal, idx));
                        });
                        if (idx < val.length - 1) {
                            commands.push({ action: 'click', selector: `[id*="btnAdd"]`, comment: `// Add another entry` });
                        }
                    });
                    return;
                }

                if (f.type === 'date' && typeof val === 'object') {
                    if (val.day && f.ds160day) commands.push({ action: 'selectOption', selector: `[id*="${f.ds160day}"]`, value: val.day, comment: `// ${f.label} - Dia` });
                    if (val.month && f.ds160month) commands.push({ action: 'selectOption', selector: `[id*="${f.ds160month}"]`, value: val.month, comment: `// ${f.label} - Mês` });
                    if (val.year && f.ds160year) commands.push({ action: 'fill', selector: `[id*="${f.ds160year}"]`, value: val.year, comment: `// ${f.label} - Ano` });
                    return;
                }

                if (f.type === 'ssn' && typeof val === 'object') {
                    if (val.p1 && f.ds160p1) commands.push({ action: 'fill', selector: `[id*="${f.ds160p1}"]`, value: val.p1, comment: `// ${f.label} - Parte 1` });
                    if (val.p2 && f.ds160p2) commands.push({ action: 'fill', selector: `[id*="${f.ds160p2}"]`, value: val.p2, comment: `// ${f.label} - Parte 2` });
                    if (val.p3 && f.ds160p3) commands.push({ action: 'fill', selector: `[id*="${f.ds160p3}"]`, value: val.p3, comment: `// ${f.label} - Parte 3` });
                    return;
                }

                if (val === 'DNA') {
                    // SSN type: use ds160p1 to derive the NA checkbox
                    const naBase = f.ds160 || (f.ds160p1 ? f.ds160p1.replace(/\d+$/, '') : '');
                    if (naBase) commands.push({ action: 'check', selector: `[id*="cbex${naBase.replace('tbx', '')}NA"], [id*="cbx"][id*="NA"]`, value: true, comment: `// ${f.label} - N/A` });
                    return;
                }

                commands.push(this._buildCommand(f, val));
            });
        });

        return commands;
    }

    _buildCommand(field, value, arrayIdx) {
        const ds160Id = field.ds160 || '';
        const selector = `[id*="${ds160Id}"]`;

        switch (field.type) {
            case 'text': case 'phone': case 'email': case 'textarea':
                return { action: 'fill', selector, value, comment: `// ${field.label}` };
            case 'select':
                return { action: 'selectOption', selector, value, comment: `// ${field.label}` };
            case 'radio':
                return { action: 'click', selector: `input[name*="${ds160Id}"][value="${value}"]`, value, comment: `// ${field.label}` };
            default:
                return { action: 'fill', selector, value, comment: `// ${field.label}` };
        }
    }

    generatePlaywrightCode() {
        const cmds = this.generatePlaywrightCommands();
        return cmds.map(c => {
            const safeVal = c.value ? c.value.toString().replace(/'/g, "\\'") : '';
            if (c.action === 'fill') return `${c.comment}\nawait page.fill('${c.selector}', '${safeVal}');`;
            if (c.action === 'selectOption') return `${c.comment}\nawait page.selectOption('${c.selector}', '${safeVal}');`;
            if (c.action === 'click') return `${c.comment}\nawait page.click('${c.selector}');`;
            if (c.action === 'check') return `${c.comment}\nawait page.check('${c.selector}');`;
            return '';
        }).join('\n\n');
    }

    // =========================================
    // REVIEW RENDERING (Assessor)
    // =========================================
    renderReview(autoOpen = true) {
        const reviewEl = document.getElementById('view-review');
        if (!reviewEl) return;
        reviewEl.innerHTML = '';

        // Stats
        let totalFields = 0, filledFields = 0, emptyRequired = 0;

        this.schema.sections.forEach(sec => {
            // Check section-level conditional with cross-section support
            let secVisible = true;
            if (sec.conditional && sec.showWhen) {
                const pKey = sec.showWhen.section ? `${sec.showWhen.section}.${sec.showWhen.field}` : `${sec.id}.${sec.showWhen.field}`;
                const pVal = this.data[pKey] || '';
                if (sec.showWhen.equals && pVal !== sec.showWhen.equals) secVisible = false;
                if (sec.showWhen.in && !sec.showWhen.in.includes(pVal)) secVisible = false;
            }
            if (!secVisible) return;

            let secFilledCount = 0;
            let secTotalCount = 0;

            const rows = sec.fields.map(f => {
                if (f.type === 'alert') return ''; // Skip display-only fields
                const key = sec.id + '.' + f.id;

                // Skip hidden conditional fields
                if (f.showWhen) {
                    const parentKey = f.showWhen.section ? `${f.showWhen.section}.${f.showWhen.field}` : `${sec.id}.${f.showWhen.field}`;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return '';
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return '';
                }

                if (f.type === 'array') {
                    // Force save current UI into array data just in case, won't break anything if in load mode
                    this._saveArrayData(sec.id, f.id);
                    const arr = this.arrayData[key] || [];

                    let arrayHtml = '';
                    if (arr.length === 0) {
                        if (f.showWhen) {
                            arrayHtml = `<div class="review-row">
                                <div class="review-field">${f.label}</div>
                                <div class="review-value empty">(nenhum item adicionado)</div>
                            </div>`;
                        }
                    } else {
                        arrayHtml = arr.map((entry, idx) => {
                            const subRows = f.fields.map(subF => {
                                const subVal = entry[subF.id] || '';

                                // Array conditional sub-fields
                                if (subF.showWhen) {
                                    const parentVal = entry[subF.showWhen.field] || '';
                                    if (subF.showWhen.equals && parentVal !== subF.showWhen.equals) return '';
                                    if (subF.showWhen.in && !subF.showWhen.in.includes(parentVal)) return '';
                                }

                                let isEmpty = !subVal || subVal === '';
                                if (!isEmpty && subF.type === 'date' && typeof subVal === 'object') {
                                    isEmpty = !subVal.day && !subVal.month && !subVal.year;
                                }
                                if (isEmpty && !subF.required && !subF.showWhen) return '';

                                const display = this._displayValue(subF, subVal);
                                const statusClass = isEmpty ? 'empty' : (subF.required ? 'filled-req' : '');
                                return `<div class="review-row" onclick="engine.editArrayField('${sec.id}', '${f.id}', '${subF.id}', ${idx}, this)">
                                    <div class="review-field" style="padding-left:32px">${subF.required ? '<span class="req-dot">●</span> ' : ''}#${idx + 1} ${subF.label}</div>
                                    <div class="review-value ${statusClass}">${display} <span class="edit-icon"><i class="iconoir-edit-pencil"></i></span></div>
                                </div>`;
                            }).filter(Boolean).join('');

                            const removeBtn = `<div class="review-row" style="background:#fff1f2; cursor:pointer;" onclick="engine.removeArrayItemFromReview('${sec.id}', '${f.id}', ${idx})">
                                <div class="review-field" style="color:#e11d48; padding-left:32px">– Remover ${f.label} #${idx + 1}</div>
                                <div class="review-value"></div>
                            </div>`;

                            return `<div style="padding: 8px 16px; font-weight: 600; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${f.label} #${idx + 1}</div>` + subRows + removeBtn;
                        }).join('');
                    }

                    const addBtnHtml = `<div class="review-row" style="background:#f0fdf4; cursor:pointer;" onclick="engine.addArrayItemFromReview('${sec.id}', '${f.id}')">
                        <div class="review-field" style="color:#16a34a; font-weight:600; padding-left:16px">+ Adicionar ${f.label}</div>
                        <div class="review-value"></div>
                    </div>`;

                    return arrayHtml + addBtnHtml;
                }

                totalFields++;
                secTotalCount++;
                const val = this.data[key];
                let isEmpty = val === undefined || val === '' || val === null;
                // SSN object: treat empty parts as empty
                if (!isEmpty && f.type === 'ssn' && typeof val === 'object') {
                    isEmpty = !val.p1 && !val.p2 && !val.p3;
                }

                if (!isEmpty) {
                    filledFields++;
                    secFilledCount++;
                }
                if (isEmpty && f.required) emptyRequired++;

                const display = this._displayValue(f, val);
                const statusClass = isEmpty ? 'empty' : (f.required ? 'filled-req' : '');
                const editableAttr = `onclick="engine.editField('${sec.id}', '${f.id}', this)"`;
                const editIcon = '<span class="edit-icon"><i class="iconoir-edit-pencil"></i></span>';

                return `<div class="review-row" ${editableAttr}>
                    <div class="review-field">${f.required ? '<span class="req-dot">●</span> ' : ''}${f.label}</div>
                    <div class="review-value ${statusClass}">${display} ${editIcon}</div>
                </div>`;
            }).filter(Boolean).join('');

            if (!rows) return;

            const progressSec = secTotalCount > 0 ? Math.round((secFilledCount / secTotalCount) * 100) : 100;

            const div = document.createElement('div');
            div.className = 'review-section';
            div.innerHTML = `
                <div class="review-header" onclick="engine._toggleReviewSection(this)">
                    <span>${sec.label} <span style="font-size:11px;color:#64748b;font-weight:400">${progressSec}%</span></span>
                    ${progressSec >= 100 ? '<span style="color:#719F2A"><i class="iconoir-check-circle-solid"></i></span>' : '<span class="chevron">▶</span>'}
                </div>
                <div class="review-body">${rows}</div>
            `;
            reviewEl.appendChild(div);
        });

        // Auto-open first review section only on initial render
        if (autoOpen) {
            const firstHeader = reviewEl.querySelector('.review-header');
            if (firstHeader) this._toggleReviewSection(firstHeader);
        }
    }

    _toggleReviewSection(headerEl, doScroll = true) {
        const body = headerEl.nextElementSibling;
        const chevron = headerEl.querySelector('.chevron');
        const isOpen = body.classList.contains('open');

        // Close all other review sections (accordion behavior)
        const reviewEl = document.getElementById('view-review');
        if (reviewEl) {
            reviewEl.querySelectorAll('.review-body.open').forEach(b => b.classList.remove('open'));
            reviewEl.querySelectorAll('.review-header .chevron.open').forEach(c => c.classList.remove('open'));
        }

        // Toggle the clicked one (if it was closed, open it)
        if (!isOpen) {
            body.classList.add('open');
            if (chevron) chevron.classList.add('open');
            if (doScroll) headerEl.closest('.review-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    _displayValue(field, val) {
        if (!val || val === '') return '(vazio)';
        if (val === 'DNA') return '<em style="color:#E0B624">Não se Aplica</em>';
        if (val === 'UNKNOWN') return '<em style="color:#E0B624">Não Sei</em>';

        if (typeof val === 'object' && (val.day !== undefined || val.month !== undefined || val.year !== undefined)) {
            if (!val.day && !val.month && !val.year) return '(vazio)';
            return `${val.day || '??'}/${val.month || '??'}/${val.year || '????'}`;
        }

        if (field.type === 'ssn' && typeof val === 'object') {
            return `${val.p1 || '???'}-${val.p2 || '??'}-${val.p3 || '????'}`;
        }

        const opts = this._resolveOptions(field);
        if (opts.length > 0) {
            const opt = opts.find(o => o.value === val);
            if (opt) return opt.label;
        }

        if (field.type === 'radio') {
            if (val === 'Y') return 'Sim';
            if (val === 'N') return 'Não';
        }

        return val;
    }
    // =========================================
    // INLINE EDITING (Assessor)
    // =========================================
    editField(secId, fieldId, rowEl) {
        // Prevent double-click issues
        if (rowEl.querySelector('.edit-inline, .edit-radio')) return;

        const f = this._findField(secId, fieldId);
        if (!f) return;
        const key = secId + '.' + fieldId;
        const val = this.data[key] || '';
        const valueEl = rowEl.querySelector('.review-value');
        if (!valueEl) return;

        let editHtml = '';
        const opts = this._resolveOptions(f);
        const clearBtn = val ? `<button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.saveEdit('${secId}', '${fieldId}', '')" title="Limpar resposta">🗑</button>` : '';

        switch (f.type) {
            case 'ssn': {
                const ssnObj = (typeof val === 'object' && val) ? val : { p1: '', p2: '', p3: '' };
                editHtml = `<div style="display:flex;gap:4px;align-items:center;width:100%">
                    <input type="text" class="edit-inline" id="edit-ssn-p1" value="${ssnObj.p1 || ''}" maxlength="3" inputmode="numeric" style="width:50px;text-align:center" autofocus
                        oninput="this.value=this.value.replace(/\\D/g,'');if(this.value.length===3)document.getElementById('edit-ssn-p2').focus()">
                    <span style="font-weight:600">-</span>
                    <input type="text" class="edit-inline" id="edit-ssn-p2" value="${ssnObj.p2 || ''}" maxlength="2" inputmode="numeric" style="width:40px;text-align:center"
                        oninput="this.value=this.value.replace(/\\D/g,'');if(this.value.length===2)document.getElementById('edit-ssn-p3').focus()">
                    <span style="font-weight:600">-</span>
                    <input type="text" class="edit-inline" id="edit-ssn-p3" value="${ssnObj.p3 || ''}" maxlength="4" inputmode="numeric" style="width:60px;text-align:center"
                        onblur="engine.saveEdit('${secId}','${fieldId}',{p1:document.getElementById('edit-ssn-p1').value,p2:document.getElementById('edit-ssn-p2').value,p3:document.getElementById('edit-ssn-p3').value})">
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()" title="Cancelar">✕</button>
                    ${clearBtn}
                </div>`;
                break;
            }
            case 'text': case 'phone': case 'email': case 'textarea':
                editHtml = `<div style="display:flex;gap:4px;align-items:center;width:100%">
                    <input type="text" class="edit-inline" value="${val === 'DNA' || val === 'UNKNOWN' ? '' : val}" 
                    maxlength="${f.maxLen || 100}" autofocus
                    onblur="engine.saveEdit('${secId}', '${fieldId}', this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur();}if(event.key==='Escape'){engine.cancelEdit();}">
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()" title="Cancelar">✕</button>
                    ${clearBtn}
                </div>`;
                break;

            case 'select':
                editHtml = `<div style="display:flex;gap:4px;align-items:center;width:100%">
                    <select class="edit-inline" autofocus onchange="engine.saveEdit('${secId}', '${fieldId}', this.value)">
                    <option value="">Selecione</option>
                    ${opts.map(o => `<option value="${o.value}" ${o.value === val ? 'selected' : ''}>${o.label}</option>`).join('')}
                </select>
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()" title="Cancelar">✕</button>
                    ${clearBtn}
                </div>`;
                break;

            case 'radio':
                const radioOpts = opts.length ? opts : [{ value: "Y", label: "Sim" }, { value: "N", label: "Não" }];
                editHtml = `<div class="edit-radio">
                    ${radioOpts.map(o => `<button class="edit-radio-btn ${o.value === val ? 'active' : ''}" 
                        onclick="event.stopPropagation();engine.saveEdit('${secId}', '${fieldId}', '${o.value}')">${o.label}</button>`).join('')}
                    ${clearBtn}
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()">✕</button>
                </div>`;
                break;

            case 'date':
                const dVal = val || {};
                editHtml = `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
                    <input type="text" class="edit-inline" placeholder="DD" maxlength="2" value="${dVal.day || ''}" 
                        style="width:45px;text-align:center" id="_ed_day" onkeydown="if(event.key==='Enter'){document.getElementById('_ed_save').click();}">
                    <span style="color:var(--text-muted)">/</span>
                    <input type="text" class="edit-inline" placeholder="MM" maxlength="2" value="${dVal.month || ''}" 
                        style="width:45px;text-align:center" id="_ed_month" onkeydown="if(event.key==='Enter'){document.getElementById('_ed_save').click();}">
                    <span style="color:var(--text-muted)">/</span>
                    <input type="text" class="edit-inline" placeholder="AAAA" maxlength="4" value="${dVal.year || ''}" 
                        style="width:60px;text-align:center" id="_ed_year" onkeydown="if(event.key==='Enter'){document.getElementById('_ed_save').click();}">
                    <button class="edit-radio-btn active" id="_ed_save" onclick="event.stopPropagation();engine.saveDateEdit('${secId}', '${fieldId}')">✓</button>
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()">✕</button>
                    ${clearBtn}
                </div>`;
                break;

            default:
                editHtml = `<div style="display:flex;gap:4px;align-items:center;width:100%">
                    <input type="text" class="edit-inline" value="${val}" autofocus
                    onblur="engine.saveEdit('${secId}', '${fieldId}', this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur();}">
                    <button class="edit-radio-btn cancel" onclick="event.stopPropagation();engine.cancelEdit()">✕</button>
                </div>`;
        }

        valueEl.innerHTML = editHtml;
        const input = valueEl.querySelector('input, select');
        if (input) setTimeout(() => input.focus(), 10);
    }

    saveDateEdit(secId, fieldId) {
        const day = (document.getElementById('_ed_day')?.value || '').replace(/\D/g, '');
        const month = (document.getElementById('_ed_month')?.value || '').replace(/\D/g, '');
        const year = (document.getElementById('_ed_year')?.value || '').replace(/\D/g, '');
        const dateVal = (day || month || year) ? { day, month, year } : '';
        this.saveEdit(secId, fieldId, dateVal);
    }

    saveEdit(secId, fieldId, newVal) {
        const key = secId + '.' + fieldId;
        const f = this._findField(secId, fieldId);

        // Apply transformations — DS-160 requires uppercase for all text fields
        if (f && typeof newVal === 'string' && newVal && f.type !== 'select') newVal = newVal.toUpperCase();
        if (f && f.noSpecial && newVal && typeof newVal === 'string') newVal = newVal.replace(this.SPECIAL, '');

        this.data[key] = newVal;

        // Also update the form input if it exists
        const formEl = document.getElementById(key);
        if (formEl) {
            if (formEl.tagName === 'SELECT' || formEl.tagName === 'TEXTAREA' || formEl.tagName === 'INPUT') {
                formEl.value = newVal;
            }
        }
        // Radio
        const radio = document.querySelector(`input[name="${key}"][value="${newVal}"]`);
        if (radio) radio.checked = true;

        // Evaluate conditionals
        this._evaluateConditionals(key, newVal);
        this.updateProgress();

        // Find which review section was open before re-render
        const openIdx = this._getOpenReviewSectionIndex();

        // Re-render review WITHOUT auto-opening first section
        this.renderReview(false);

        // Restore open section by index (no scroll)
        this._restoreReviewSectionByIndex(openIdx);

        // Trigger onChange for auto-save/sync with BD
        if (this.onChange) this.onChange(key, newVal);
        this._showToast('Salvando...', 'info');
    }

    cancelEdit() {
        const openIdx = this._getOpenReviewSectionIndex();
        this.renderReview(false);
        this._restoreReviewSectionByIndex(openIdx);
    }

    /** Get the index of the currently open review section */
    _getOpenReviewSectionIndex() {
        const reviewEl = document.getElementById('view-review');
        if (!reviewEl) return 0;
        const bodies = reviewEl.querySelectorAll('.review-body');
        for (let i = 0; i < bodies.length; i++) {
            if (bodies[i].classList.contains('open')) return i;
        }
        return 0;
    }

    /** Restore a review section by its index (no scroll) */
    _restoreReviewSectionByIndex(idx) {
        const reviewEl = document.getElementById('view-review');
        if (!reviewEl) return;
        const sections = reviewEl.querySelectorAll('.review-section');
        if (idx >= 0 && idx < sections.length) {
            const header = sections[idx].querySelector('.review-header');
            if (header) this._toggleReviewSection(header, false);
        }
    }

    // =========================================
    // ARRAY INLINE EDITING (Assessor)
    // =========================================
    editArrayField(secId, fieldId, subId, arrayIdx, rowEl) {
        if (rowEl.querySelector('.edit-inline')) return;

        const key = secId + '.' + fieldId;
        const f = this._findField(secId, fieldId);
        if (!f || f.type !== 'array') return;

        const subF = f.fields.find(sf => sf.id === subId);
        if (!subF) return;

        // Ensure arrayData structure exists
        if (!this.arrayData[key]) this.arrayData[key] = [];
        while (this.arrayData[key].length <= arrayIdx) this.arrayData[key].push({});

        const val = this.arrayData[key][arrayIdx][subId] || '';
        const valueEl = rowEl.querySelector('.review-value');
        if (!valueEl) return;

        let editHtml = '';
        const opts = this._resolveOptions(subF);

        switch (subF.type) {
            case 'text': case 'phone': case 'email': case 'textarea':
                editHtml = `<input type="text" class="edit-inline" value="${val}" 
                    maxlength="${subF.maxLen || 100}" autofocus
                    onblur="engine.saveArrayEdit('${secId}', '${fieldId}', '${subId}', ${arrayIdx}, this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur();}if(event.key==='Escape'){engine.cancelEdit();}">`;
                break;

            case 'select':
                editHtml = `<select class="edit-inline" autofocus onchange="engine.saveArrayEdit('${secId}', '${fieldId}', '${subId}', ${arrayIdx}, this.value)" onblur="engine.saveArrayEdit('${secId}', '${fieldId}', '${subId}', ${arrayIdx}, this.value)">
                    <option value="">Selecione</option>
                    ${opts.map(o => `<option value="${o.value}" ${o.value === val ? 'selected' : ''}>${o.label}</option>`).join('')}
                </select>`;
                break;

            case 'radio':
                const radioOpts = opts.length ? opts : [{ value: "Y", label: "Sim" }, { value: "N", label: "Não" }];
                editHtml = `<div class="edit-inline edit-radio">
                    ${radioOpts.map(o => `<button class="edit-radio-btn ${o.value === val ? 'active' : ''}" 
                        onclick="engine.saveArrayEdit('${secId}', '${fieldId}', '${subId}', ${arrayIdx}, '${o.value}')">${o.label}</button>`).join('')}
                    <button class="edit-radio-btn cancel" onclick="engine.cancelEdit()">✕</button>
                </div>`;
                break;

            default:
                editHtml = `<input type="text" class="edit-inline" value="${val}" autofocus
                    onblur="engine.saveArrayEdit('${secId}', '${fieldId}', '${subId}', ${arrayIdx}, this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur();}">`;
        }

        valueEl.innerHTML = editHtml;
        const input = valueEl.querySelector('input, select');
        if (input) setTimeout(() => input.focus(), 10);
    }

    saveArrayEdit(secId, fieldId, subId, arrayIdx, newVal) {
        const key = secId + '.' + fieldId;
        const f = this._findField(secId, fieldId);
        const subF = f?.fields?.find(sf => sf.id === subId);

        // DS-160 requires uppercase for all text fields
        if (subF && typeof newVal === 'string' && newVal && subF.type !== 'select') newVal = newVal.toUpperCase();
        if (subF && subF.noSpecial && newVal && typeof newVal === 'string') newVal = newVal.replace(this.SPECIAL, '');

        if (!this.arrayData[key]) this.arrayData[key] = [];
        while (this.arrayData[key].length <= arrayIdx) this.arrayData[key].push({});

        this.arrayData[key][arrayIdx][subId] = newVal;

        // Try to update corresponding form elements if they exist in DOM
        const formKey = `${key}[${arrayIdx}].${subId}`;
        const formEl = document.getElementById(formKey);
        if (formEl) {
            if (formEl.tagName === 'SELECT' || formEl.tagName === 'TEXTAREA' || formEl.tagName === 'INPUT') {
                formEl.value = newVal;
            }
        }
        const radio = document.querySelector(`input[name="${formKey}"][value="${newVal}"]`);
        if (radio) radio.checked = true;

        // Call _evaluateConditionals on the array field key? Actually, standard evaluation might be enough
        this._evaluateConditionals(formKey, newVal);
        this._rerenderArray(secId, f, key);
        this.updateProgress();
        const openIdx = this._getOpenReviewSectionIndex();
        this.renderReview(false);
        this._restoreReviewSectionByIndex(openIdx);
        if (this.onChange) this.onChange(formKey, newVal);
        this._showToast('Salvando...', 'info');
    }

    addArrayItemFromReview(secId, fieldId) {
        const openIdx = this._getOpenReviewSectionIndex();
        this.addArrayEntry(secId, fieldId);
        this.renderReview(false);
        this._restoreReviewSectionByIndex(openIdx);
        if (this.onChange) this.onChange(secId + '.' + fieldId, '');
        this._showToast('Item adicionado', 'success');
    }

    removeArrayItemFromReview(secId, fieldId, arrayIdx) {
        const key = secId + '.' + fieldId;
        if (!this.arrayData[key] || this.arrayData[key].length <= 1) {
            this._showToast('Mínimo 1 item requerido', 'error');
            return;
        }
        const openIdx = this._getOpenReviewSectionIndex();
        this.removeArrayEntry(secId, fieldId, arrayIdx);
        this.renderReview(false);
        this._restoreReviewSectionByIndex(openIdx);
        if (this.onChange) this.onChange(key, '');
        this._showToast('Item removido', 'success');
    }

    // =========================================
    // PROGRESS
    // =========================================
    updateProgress() {
        if (this._progressTimeout) clearTimeout(this._progressTimeout);
        this._progressTimeout = setTimeout(() => {
            this._calcProgress();
        }, 150);
    }

    _calcProgress() {
        let total = 0, filled = 0;
        this.schema.sections.forEach(sec => {
            // Skip sections hidden by schema conditionals (not pages mode)
            if (sec.conditional && sec.showWhen) {
                const condKey = (sec.showWhen.section || sec.id) + '.' + sec.showWhen.field;
                const condVal = this.data[condKey] || '';
                if (sec.showWhen.equals && condVal !== sec.showWhen.equals) return;
                if (sec.showWhen.in && !sec.showWhen.in.includes(condVal)) return;
                if (sec.showWhen.notIn && sec.showWhen.notIn.includes(condVal)) return;
            }

            sec.fields.forEach(f => {
                if (f.type === 'alert' || f.type === 'heading' || f.type === 'orientation') return; // Skip display-only fields
                const key = sec.id + '.' + f.id;

                // Count array sub-fields in progress
                if (f.type === 'array') {
                    if (f.showWhen) {
                        const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                        const parentVal = this.data[parentKey] || '';
                        if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                        if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                        if (f.showWhen.notIn && f.showWhen.notIn.includes(parentVal)) return;
                    }
                    const entries = this.arrayData[key] || [{}];
                    entries.forEach(entry => {
                        (f.fields || []).forEach(subF => {
                            if (!subF.required) return;
                            if (subF.showWhen) {
                                const subParentVal = entry[subF.showWhen.field] || '';
                                if (subF.showWhen.equals && subParentVal !== subF.showWhen.equals) return;
                                if (subF.showWhen.in && !subF.showWhen.in.includes(subParentVal)) return;
                                if (subF.showWhen.notIn && subF.showWhen.notIn.includes(subParentVal)) return;
                            }
                            total++;
                            const subVal = entry[subF.id];
                            if (subVal && ((typeof subVal === 'string' && subVal.trim()) || typeof subVal === 'object')) filled++;
                        });
                    });
                    return;
                }

                if (!f.required) return;
                if (f.showWhen) {
                    const parentKey = (f.showWhen.section || sec.id) + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                    if (f.showWhen.notIn && f.showWhen.notIn.includes(parentVal)) return;
                }
                total++;
                const val = this.data[key];
                let isFilled = val && ((typeof val === 'string' && val.trim()) || typeof val === 'object');
                // SSN object: treat empty parts as not filled
                if (isFilled && f.type === 'ssn' && typeof val === 'object') {
                    isFilled = val.p1 || val.p2 || val.p3;
                }
                if (isFilled) filled++;
            });
        });

        const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
        const bar = document.getElementById('progressFill');
        if (bar) {
            bar.style.width = pct + '%';
            bar.style.background = pct === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #3b82f6, #22c55e)';
        }
        const label = document.getElementById('progressLabel');
        if (label) label.textContent = `${filled}/${total} campos (${pct}%)`;
        this._updateSectionStatus();
        return pct;
    }

    // Public: get overall progress percentage (0-100)
    calcOverallProgress() {
        return this._calcProgress();
    }

    // =========================================
    // CLIPBOARD
    // =========================================
    copyToClipboard(type) {
        let text;
        if (type === 'json') {
            text = JSON.stringify(this.generateJSON(), null, 2);
        } else {
            text = this.generatePlaywrightCode();
        }
        navigator.clipboard.writeText(text).then(() => {
            this._showToast('Copiado para a área de transferência!', 'success');
        }).catch(() => {
            this._showToast('Erro ao copiar', 'error');
        });
    }

    // =========================================
    // HELPERS
    // =========================================
    _autoPlaceholder(f) {
        // Generate smart placeholder based on field id/label/type
        const id = f.id || '';
        const label = (f.label || '').toLowerCase();

        // Name fields
        if (id === 'surname' || label.includes('sobrenome')) return 'Ex: SILVA';
        if (id === 'givenName' || (label.includes('nome') && !label.includes('sobrenome'))) return 'Ex: JOAO';

        // Document fields
        if (id === 'ssn') return '000-00-0000';
        if (id === 'number' && label.includes('passaporte')) return 'Ex: XX000000';
        if (id === 'sevisId') return 'N0000000000';
        if (id === 'taxId') return 'Número de contribuinte';

        // Address/location
        if (label.includes('cep') || id.includes('Zip') || id.includes('PostalCode')) return '00000-0000';
        if (label.includes('cidade')) return 'Ex: São Paulo';
        if (label.includes('endereço') && label.includes('linha 1')) return 'Rua, número';
        if (label.includes('endereço') && label.includes('linha 2')) return 'Complemento, bairro';

        // Numeric
        if (id === 'lengthOfStay') return 'Ex: 30';
        if (id === 'monthlySalary') return 'Ex: 5000';
        if (id === 'lostVisaYear') return 'Ex: 2020';
        if (id === 'numberOfPrevious') return 'Ex: 1';

        // Contact
        if (f.type === 'email') return 'exemplo@email.com';

        // Textarea descriptions
        if (f.type === 'textarea') {
            if (label.includes('funções') || label.includes('duties')) return 'Descreva suas principais atividades...';
            if (label.includes('explique')) return 'Forneça uma explicação detalhada...';
            return 'Digite aqui...';
        }

        // Generic text with maxLen hint
        if (f.type === 'text' && f.maxLen && f.maxLen <= 20) return `Máx. ${f.maxLen} caracteres`;

        return '';
    }

    _findField(secId, fieldId) {
        const sec = this.schema.sections.find(s => s.id === secId);
        return sec?.fields.find(f => f.id === fieldId);
    }

    _getFieldDef(key) {
        const parts = key.split('.');
        if (parts.length < 2) return null;
        return this._findField(parts[0], parts[1]);
    }

    _setArrayValue(key, val) {
        // key format: secId.fieldId[idx].subFieldId
        const match = key.match(/^(.+?)\[(\d+)\]\.(.+)$/);
        if (!match) return;
        const [, arrKey, idxStr, subId] = match;
        const idx = parseInt(idxStr);
        if (!this.arrayData[arrKey]) this.arrayData[arrKey] = [];
        while (this.arrayData[arrKey].length <= idx) this.arrayData[arrKey].push({});
        this.arrayData[arrKey][idx][subId] = val;
    }

    _resolveOptions(f) {
        if (f.options && Array.isArray(f.options)) return f.options;
        if (f.optionsRef && this.schema.options && this.schema.options[f.optionsRef]) {
            return this.schema.options[f.optionsRef];
        }
        return [];
    }

    _setupRealtimeValidation() {
        document.querySelectorAll('.field-input[data-no-special]').forEach(el => {
            if (el._hasFilter) return;
            el._hasFilter = true;
            el.addEventListener('input', () => {
                if (this.SPECIAL.test(el.value)) el.value = el.value.replace(this.SPECIAL, '');
            });
        });
        // Name-only fields: strip everything except letters, space, hyphen, apostrophe, period
        document.querySelectorAll('.field-input[data-name-only]').forEach(el => {
            if (el._hasNameFilter) return;
            el._hasNameFilter = true;
            el.addEventListener('input', () => {
                const cleaned = el.value.replace(this.NAME_CHARS, '');
                if (cleaned !== el.value) el.value = cleaned;
            });
        });
        document.querySelectorAll('.field-input[data-phone]').forEach(el => {
            if (el._hasFilter) return;
            el._hasFilter = true;
            el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, ''); });
        });
    }

    _showToast(msg, type) {
        let toast = document.getElementById('engine-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'engine-toast';
            toast.style.cssText = 'position:fixed;top:20px;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;transition:all 0.3s;pointer-events:none;text-align:left;';
            document.body.appendChild(toast);
        }
        // Match toast width to form container
        const container = document.querySelector('.form-wrapper') || document.querySelector('.container');
        if (container) {
            const rect = container.getBoundingClientRect();
            toast.style.left = rect.left + 'px';
            toast.style.right = (window.innerWidth - rect.right) + 'px';
        } else {
            toast.style.left = '16px';
            toast.style.right = '16px';
        }
        toast.style.background = type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#22c55e';
        toast.style.color = 'white';
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; }, 2500);
    }
}
