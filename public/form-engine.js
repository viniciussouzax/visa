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
        this.naFields = new Set(); // campos marcados N/A
        this.unknownFields = new Set(); // campos marcados "Não sei"
        this.currentSection = 0;
        this.onSave = null; // callback for auto-save
        this.onChange = null; // callback for change tracking
        this.SPECIAL = /[<>&"'\/\\;:{}[\]|~]/g;
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

    // =========================================
    // LOAD DATA (Hydrate from JSON)
    // =========================================
    loadData(json) {
        if (!json || typeof json !== 'object') return;
        this.data = {};
        this.arrayData = {};
        this.naFields.clear();
        this.unknownFields.clear();

        this.schema.sections.forEach(sec => {
            const secData = json[sec.id] || {};
            sec.fields.forEach(f => {
                const key = sec.id + '.' + f.id;

                if (f.type === 'array') {
                    if (Array.isArray(secData[f.id]) && secData[f.id].length > 0) {
                        // Deep clone the array data to prevent reference issues
                        this.arrayData[key] = JSON.parse(JSON.stringify(secData[f.id]));

                        // Reconstruct N/A and Unknown flags for arrays
                        this.arrayData[key].forEach((item, idx) => {
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
                    const val = secData[f.id];
                    if (val !== undefined && val !== null) {
                        this.data[key] = val;
                        if (val === 'DNA') this.naFields.add(key);
                        if (val === 'UNKNOWN') this.unknownFields.add(key);
                    }
                }
            });
        });

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

            const isOpen = idx === 0;
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
                <div class="section-body ${isOpen ? 'open' : ''}" id="body-${idx}">
                    ${this._renderFields(sec.id, sec.fields)}
                    <div class="section-nav">
                        ${idx > 0 ? `<button class="btn-nav" onclick="engine.toggleSection(${idx - 1})">← Anterior</button>` : '<span></span>'}
                        ${idx < this.schema.sections.length - 1 ? `<button class="btn-nav btn-nav-next" onclick="engine.goNext(${idx})">Próximo →</button>` : ''}
                    </div>
                </div>
            `;
            formEl.appendChild(card);
        });

        this._updateSectionNumbers();

        // No event delegation needed — onclick is on each section-header directly

        // Apply defaults to radios
        this.schema.sections.forEach(sec => {
            sec.fields.forEach(f => {
                if (f.default) {
                    const key = sec.id + '.' + f.id;
                    const radio = document.querySelector(`input[name="${key}"][value="${f.default}"]`);
                    if (radio) radio.checked = true;
                }
            });
        });

        // Setup real-time validation
        this._setupRealtimeValidation();
    }

    _renderFields(secId, fields) {
        return fields.map(f => {
            if (f.type === 'array') return this._renderArray(secId, f);
            return this._renderSingleField(secId, f);
        }).join('');
    }

    _renderSingleField(secId, f) {
        const key = secId + '.' + f.id;
        const reqMark = f.required ? '<span class="req">*</span>' : '';
        let condAttrs = '';
        let condClass = '';

        if (f.showWhen) {
            const parentKey = f.showWhen.section ? `${f.showWhen.section}.${f.showWhen.field}` : `${secId}.${f.showWhen.field}`;
            condAttrs = `data-show-when="${parentKey}" data-show-value="${f.showWhen.equals || ''}" data-show-in="${f.showWhen.in ? JSON.stringify(f.showWhen.in).replace(/"/g, '&quot;') : ''}"`;
            condClass = 'cond-block';
        }

        let input = this._renderInput(key, f);

        // N/A or Unknown wrapper
        let naHtml = '';
        if (f.allowNA) {
            naHtml = `<label class="na-check"><input type="checkbox" data-na-for="${key}" onchange="engine.toggleNA('${key}', this.checked)"> Não se Aplica</label>`;
        }
        if (f.allowUnknown) {
            naHtml = `<label class="na-check"><input type="checkbox" data-unknown-for="${key}" onchange="engine.toggleUnknown('${key}', this.checked)"> Não Sei</label>`;
        }

        const hasNARow = naHtml ? 'na-row' : '';
        const hintHtml = f.hint ? `<div class="field-hint">${f.hint}</div>` : '';

        return `<div class="field-row ${condClass}" ${condAttrs}>
            <div class="field-label">${reqMark} ${f.label}</div>
            ${hintHtml}
            <div class="${hasNARow}">
                ${input}
                ${naHtml}
            </div>
            <div class="field-error" id="err-${key}"></div>
        </div>`;
    }

    _renderInput(key, f) {
        const opts = this._resolveOptions(f);
        const ph = f.placeholder || this._autoPlaceholder(f);
        const phAttr = ph ? `placeholder="${ph}"` : '';

        // Detect numeric-only fields (ZIP, year, quantities, salary)
        const numericIds = ['lengthOfStay', 'monthlySalary', 'lostVisaYear', 'numberOfPrevious',
            'usAddressZip', 'usContactZip', 'homePostalCode', 'mailPostalCode',
            'employerPostalCode', 'schoolZip'];
        const isNumeric = numericIds.includes(f.id);
        const isZip = ['usAddressZip', 'usContactZip', 'schoolZip'].includes(f.id);

        switch (f.type) {
            case 'text':
                let maskAttr = '';
                if (f.id === 'ssn') maskAttr = 'data-mask="ssn"';
                else if (f.id === 'nationalId') maskAttr = 'data-mask="cpf"';
                else if (isZip) maskAttr = 'data-mask="zip"';

                return `<input type="text" class="field-input" id="${key}" maxlength="${f.maxLen || 100}" ${phAttr}
                    ${f.noSpecial ? 'data-no-special="true"' : ''} ${f.uppercase ? 'data-uppercase="true"' : ''}
                    ${isNumeric ? 'data-numeric="true"' : ''} ${maskAttr}
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;

            case 'phone':
                return `<input type="text" class="field-input" id="${key}" maxlength="15" data-mask="phone"
                    placeholder="(00) 00000-0000"
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;

            case 'email':
                return `<input type="text" class="field-input" id="${key}" maxlength="${f.maxLen || 50}"
                    placeholder="exemplo@email.com"
                    oninput="engine.onInput('${key}', this)" onblur="engine.onBlur('${key}', this)">`;

            case 'textarea':
                return `<textarea class="field-input" id="${key}" maxlength="${f.maxLen || 200}" ${phAttr}
                    oninput="engine.onInput('${key}', this)"></textarea>
                    <div class="field-hint char-count" id="cc-${key}">0/${f.maxLen || 200}</div>`;

            case 'select':
                return `<select class="field-input" id="${key}" onchange="engine.onInput('${key}', this)">
                    <option value="">— Selecione —</option>
                    ${opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                </select>`;

            case 'radio':
                const options = opts.length ? opts : [{ value: "Y", label: "Sim" }, { value: "N", label: "Não" }];
                return `<div class="radio-group">${options.map(o => `
                    <label class="radio-btn">
                        <input type="radio" name="${key}" value="${o.value}" onchange="engine.onInput('${key}', this)">
                        <span class="dot"></span> ${o.label}
                    </label>`).join('')}</div>`;

            case 'date':
                return `<div class="date-grid">
                    <select class="field-input" id="${key}.day" onchange="engine.onDateChange('${key}')">
                        <option value="">Dia</option>
                        ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                    </select>
                    <select class="field-input" id="${key}.month" onchange="engine.onDateChange('${key}')">
                        <option value="">Mês</option>
                        ${this.MONTHS.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
                    </select>
                    <input type="text" class="field-input" id="${key}.year" maxlength="4" placeholder="Ano"
                        oninput="this.value=this.value.replace(/\\D/g,''); engine.onDateChange('${key}')">
                </div>`;

            default:
                return `<input type="text" class="field-input" id="${key}" ${phAttr} oninput="engine.onInput('${key}', this)">`;
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

        // Init array data
        if (!this.arrayData[key]) this.arrayData[key] = [{}];

        return `<div class="field-row ${condClass}" ${condAttrs}>
            <div class="field-label">${f.required ? '<span class="req">*</span>' : ''} ${f.label}</div>
            <div class="array-container" id="arr-${key}">
                ${this._renderArrayEntries(secId, f, key)}
            </div>
            <button class="array-add" id="arradd-${key}" onclick="engine.addArrayEntry('${secId}', '${f.id}')">
                + Adicionar <span style="color:#64748b;font-weight:400">(máx ${f.maxItems || 5})</span>
            </button>
        </div>`;
    }

    _renderArrayEntries(secId, f, key) {
        const entries = this.arrayData[key] || [{}];
        return entries.map((_, idx) => this._renderArrayEntry(secId, f, key, idx, entries.length)).join('');
    }

    _renderArrayEntry(secId, f, key, idx, total) {
        const removeBtn = total > 1 || idx > 0
            ? `<button class="array-remove" onclick="engine.removeArrayEntry('${secId}', '${f.id}', ${idx})">🗑️</button>`
            : '';

        const fieldsHtml = f.fields.map(subF => {
            const subKey = `${key}[${idx}].${subF.id}`;
            let subCond = '';
            let subClass = '';
            if (subF.showWhen) {
                const parentKey = `${key}[${idx}].${subF.showWhen.field}`;
                subCond = `data-show-when="${parentKey}" data-show-value="${subF.showWhen.equals || ''}" data-show-in="${subF.showWhen.in ? JSON.stringify(subF.showWhen.in).replace(/"/g, '&quot;') : ''}"`;
                subClass = 'cond-block';
            }
            return `<div class="field ${subClass}" style="margin-bottom:8px" ${subCond}>
                <div class="field-label" style="font-size:12px">${subF.required ? '<span class="req">*</span>' : ''} ${subF.label}</div>
                ${this._renderInput(subKey, subF)}
                <div class="field-error" id="err-${subKey}"></div>
            </div>`;
        }).join('');

        return `<div class="array-entry" data-arr-idx="${idx}">
            <div class="array-entry-header">
                <span class="array-entry-num">#${idx + 1}</span>
                ${removeBtn}
            </div>
            <div class="array-fields">${fieldsHtml}</div>
        </div>`;
    }

    addArrayEntry(secId, fieldId) {
        const key = secId + '.' + fieldId;
        const field = this._findField(secId, fieldId);
        if (!field) return;

        if (!this.arrayData[key]) this.arrayData[key] = [{}];
        if (this.arrayData[key].length >= (field.maxItems || 5)) return;

        this.arrayData[key].push({});
        this._rerenderArray(secId, field, key);
    }

    removeArrayEntry(secId, fieldId, idx) {
        const key = secId + '.' + fieldId;
        if (!this.arrayData[key] || this.arrayData[key].length <= 1) return;

        // Save data before removing
        this._saveArrayData(secId, fieldId);
        this.arrayData[key].splice(idx, 1);

        const field = this._findField(secId, fieldId);
        this._rerenderArray(secId, field, key);
    }

    _rerenderArray(secId, field, key) {
        const container = document.getElementById('arr-' + key);
        if (!container) return;
        container.innerHTML = this._renderArrayEntries(secId, field, key);

        // Restore saved data
        const entries = this.arrayData[key];
        entries.forEach((data, idx) => {
            Object.keys(data).forEach(subId => {
                const el = document.getElementById(`${key}[${idx}].${subId}`);
                if (el) el.value = data[subId] || '';
            });
        });

        // Update add button
        const addBtn = document.getElementById('arradd-' + key);
        if (addBtn) addBtn.disabled = entries.length >= (field.maxItems || 5);

        this._setupRealtimeValidation();
    }

    _saveArrayData(secId, fieldId) {
        const key = secId + '.' + fieldId;
        const field = this._findField(secId, fieldId);
        if (!field || !this.arrayData[key]) return;

        this.arrayData[key].forEach((_, idx) => {
            field.fields.forEach(subF => {
                const subKey = `${key}[${idx}].${subF.id}`;
                const el = document.getElementById(subKey);
                let val = '';
                let found = false;

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
        let val = el.value || (el.type === 'radio' ? el.value : '');

        // Numeric-only filter
        if (el.dataset && el.dataset.numeric === 'true' && !el.dataset.mask) {
            val = val.replace(/\D/g, '');
        }
        // Filter special chars
        if (el.dataset && el.dataset.noSpecial === 'true') {
            val = val.replace(this.SPECIAL, '');
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
            } else if (maskType === 'ssn') {
                let m = clean.substring(0, 9);
                val = m;
                if (m.length > 3) val = m.substring(0, 3) + '-' + m.substring(3);
                if (m.length > 5) val = val.substring(0, 6) + '-' + m.substring(5);
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
        if (key.includes('[')) {
            // Array entry value
            this._setArrayValue(key, val);
        } else {
            this.data[key] = val;
        }

        // Handle conditionals
        this._evaluateConditionals(key, val);

        // Clear error
        const errEl = document.getElementById('err-' + key);
        if (errEl) errEl.textContent = '';
        el.classList.remove('error');

        this.updateProgress();
        if (this.onChange) this.onChange(key, val);
    }

    onBlur(key, el) {
        if (el.value) el.value = el.value.trim();
        if (el.dataset && el.dataset.uppercase === 'true') el.value = el.value.toUpperCase();
        this.data[key] = el.value;

        // Email validation
        if (el.value && this._getFieldDef(key)?.type === 'email') {
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
            el.classList.toggle('error', !valid);
            const errEl = document.getElementById('err-' + key);
            if (errEl) errEl.textContent = valid ? '' : 'Email inválido';
        }
    }

    onDateChange(key) {
        const day = document.getElementById(key + '.day')?.value || '';
        const month = document.getElementById(key + '.month')?.value || '';
        const year = document.getElementById(key + '.year')?.value || '';
        this.data[key] = (day || month || year) ? { day, month, year } : null;
        this.updateProgress();
    }

    // =========================================
    // N/A & UNKNOWN
    // =========================================
    toggleNA(key, checked) {
        const el = document.getElementById(key);
        if (!el) return;
        el.disabled = checked;
        if (checked) {
            el.value = '';
            this.data[key] = 'DNA';
            this.naFields.add(key);
        } else {
            this.data[key] = '';
            this.naFields.delete(key);
        }
        el.classList.remove('error');
        const errEl = document.getElementById('err-' + key);
        if (errEl) errEl.textContent = '';
        // Visual: mark parent row as disabled
        const fieldRow = el.closest('.field-row');
        if (fieldRow) fieldRow.classList.toggle('na-disabled', checked);
        this.updateProgress();
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
        this.updateProgress();
    }

    // =========================================
    // CONDITIONALS
    // =========================================
    _evaluateConditionals(changedKey, val) {
        // Field-level conditionals
        document.querySelectorAll(`[data-show-when="${changedKey}"]`).forEach(el => {
            const showVal = el.dataset.showValue;
            const showIn = el.dataset.showIn;

            let visible = false;
            if (showVal) visible = val === showVal;
            if (showIn) {
                try { visible = JSON.parse(showIn).includes(val); } catch (e) { }
            }

            el.classList.toggle('visible', visible);

            // Clear values of hidden fields recursively
            if (!visible) {
                el.querySelectorAll('.field-input').forEach(input => {
                    input.value = '';
                    const inputKey = input.id;
                    if (inputKey) {
                        if (this.data[inputKey] !== undefined) {
                            delete this.data[inputKey];
                            this._evaluateConditionals(inputKey, '');
                        }
                    }
                });
                el.querySelectorAll('input[type="radio"]').forEach(r => {
                    if (r.checked) {
                        r.checked = false;
                        const inputKey = r.name;
                        if (inputKey && this.data[inputKey] !== undefined) {
                            delete this.data[inputKey];
                            this._evaluateConditionals(inputKey, '');
                        }
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
        });
        if (secChanged) this._updateSectionNumbers();
    }

    // =========================================
    // SECTION NAVIGATION
    // =========================================
    toggleSection(idx, doScroll = true) {
        const bodies = document.querySelectorAll('.section-body');

        // Allow free navigation — just toggle open/close
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
        // Find next visible section (no validation blocking)
        for (let i = currentIdx + 1; i < this.schema.sections.length; i++) {
            const secEl = document.getElementById('sec-' + this.schema.sections[i].id);
            if (secEl && secEl.style.display !== 'none') {
                this.toggleSection(i);
                return;
            }
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

    _updateSectionStatus() {
        this.schema.sections.forEach((sec, idx) => {
            const statusEl = document.getElementById('status-' + idx);
            if (!statusEl) return;
            const secEl = document.getElementById('sec-' + sec.id);
            if (secEl && secEl.style.display === 'none') return;

            const errors = this.validateSection(idx);
            const hasData = sec.fields.some(f => {
                const key = sec.id + '.' + f.id;
                return this.data[key] && this.data[key] !== '';
            });

            if (errors.length === 0 && hasData) {
                statusEl.innerHTML = '<span class="status-complete">✓</span>';
            } else if (hasData) {
                statusEl.innerHTML = '<span class="status-partial">◐</span>';
            } else {
                statusEl.innerHTML = '<span class="status-dot"></span>';
            }
        });
    }

    // =========================================
    // VALIDATION
    // =========================================
    validateSection(secIdx, markErrors = false) {
        const sec = this.schema.sections[secIdx];
        if (!sec) return [];

        // Skip hidden conditional sections
        const secEl = document.getElementById('sec-' + sec.id);
        if (secEl && secEl.style.display === 'none') return [];

        const errors = [];
        sec.fields.forEach(f => {
            if (f.type === 'array') return;
            const key = sec.id + '.' + f.id;

            if (f.showWhen) {
                const parentKey = sec.id + '.' + f.showWhen.field;
                const parentVal = this.data[parentKey] || '';
                if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
            }

            if (this.naFields.has(key) || this.unknownFields.has(key)) return;

            const val = this.data[key];

            if (f.required) {
                let empty = false;
                if (f.type === 'date') {
                    empty = !val || (!val.day && !val.month && !val.year);
                } else {
                    empty = !val || (typeof val === 'string' && !val.trim());
                }

                if (empty) {
                    errors.push(f.label);
                    if (markErrors) {
                        const el = document.getElementById(key);
                        if (el) el.classList.add('error');
                        const errEl = document.getElementById('err-' + key);
                        if (errEl) errEl.textContent = 'Obrigatório';
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
            // Skip hidden sections
            const secEl = document.getElementById('sec-' + sec.id);
            if (secEl && secEl.style.display === 'none') return;

            json[sec.id] = {};
            sec.fields.forEach(f => {
                const key = sec.id + '.' + f.id;

                // Skip hidden conditional fields
                if (f.showWhen) {
                    const parentKey = sec.id + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                }

                if (f.type === 'array') {
                    this._saveArrayData(sec.id, f.id);
                    const arr = this.arrayData[key];
                    if (arr && arr.length > 0) {
                        json[sec.id][f.id] = arr.filter(entry =>
                            Object.values(entry).some(v => v !== undefined && v !== null && v !== '' && v !== 'DNA')
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

                const val = this.data[key];
                if (val !== undefined && val !== '' && val !== null) {
                    json[sec.id][f.id] = val;
                }
            });

            // Remove empty sections
            if (Object.keys(json[sec.id]).length === 0) delete json[sec.id];
        });
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

                if (val === 'DNA') {
                    commands.push({ action: 'check', selector: `[id*="${f.ds160}"] + .na-checkbox, [id*="cbx"][id*="NA"]`, value: true, comment: `// ${f.label} - N/A` });
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

                                const isEmpty = !subVal || subVal === '';
                                if (isEmpty && !subF.required && !subF.showWhen) return '';

                                const display = this._displayValue(subF, subVal);
                                const statusClass = isEmpty ? 'empty' : (subF.required ? 'filled-req' : '');
                                return `<div class="review-row" onclick="engine.editArrayField('${sec.id}', '${f.id}', '${subF.id}', ${idx}, this)">
                                    <div class="review-field" style="padding-left:32px">${subF.required ? '<span class="req-dot">●</span> ' : ''}#${idx + 1} ${subF.label}</div>
                                    <div class="review-value ${statusClass}">${display} <span class="edit-icon">✏️</span></div>
                                </div>`;
                            }).filter(Boolean).join('');

                            const removeBtn = `<div class="review-row" style="background:#fff1f2; cursor:pointer;" onclick="engine.removeArrayItemFromReview('${sec.id}', '${f.id}', ${idx})">
                                <div class="review-field" style="color:#e11d48; padding-left:32px">🗑️ Remover ${f.label} #${idx + 1}</div>
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
                const isEmpty = val === undefined || val === '' || val === null;

                if (!isEmpty) {
                    filledFields++;
                    secFilledCount++;
                }
                if (isEmpty && f.required) emptyRequired++;

                const display = this._displayValue(f, val);
                const statusClass = isEmpty ? 'empty' : (f.required ? 'filled-req' : '');
                const editableAttr = `onclick="engine.editField('${sec.id}', '${f.id}', this)"`;
                const editIcon = '<span class="edit-icon">✏️</span>';

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
                    <span class="chevron">▶</span>
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
        if (val === 'DNA') return '<em style="color:#f59e0b">Não se Aplica</em>';
        if (val === 'UNKNOWN') return '<em style="color:#f59e0b">Não Sei</em>';

        if (typeof val === 'object' && val.day) {
            return `${val.day}/${val.month}/${val.year}`;
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
                    <option value="">— Selecione —</option>
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
        this._showToast('Campo atualizado', 'success');
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
                    <option value="">— Selecione —</option>
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
        this._showToast('Campo atualizado', 'success');
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
            const secEl = document.getElementById('sec-' + sec.id);
            if (secEl && secEl.style.display === 'none') return;

            sec.fields.forEach(f => {
                if (!f.required || f.type === 'array') return;
                if (f.showWhen) {
                    const parentKey = sec.id + '.' + f.showWhen.field;
                    const parentVal = this.data[parentKey] || '';
                    if (f.showWhen.equals && parentVal !== f.showWhen.equals) return;
                    if (f.showWhen.in && !f.showWhen.in.includes(parentVal)) return;
                }
                total++;
                const key = sec.id + '.' + f.id;
                const val = this.data[key];
                if (val && ((typeof val === 'string' && val.trim()) || typeof val === 'object')) filled++;
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
        if (id === 'nationalId') return '000.000.000-00';
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
            toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;transition:all 0.3s;pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.style.background = type === 'error' ? '#ef4444' : '#22c55e';
        toast.style.color = 'white';
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; }, 2500);
    }
}
