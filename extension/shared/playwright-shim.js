// ==================================================================
// Playwright Shim — emulates Playwright's Page + Locator API using DOM
// Must cover ALL methods used by: generic-page.js, fill-field.js,
// postback.js, add-another.js, verify.js
// ==================================================================

/**
 * Resolves a Playwright-style selector to a CSS query.
 * Handles special Playwright selectors like:
 *   - a:has-text("Add Another") → querySelectorAll('a') + text filter
 *   - #id\$sub → unescape $ signs
 */
function _resolveSelector(selector) {
    // Handle :has-text("...") pseudo-selector (Playwright-specific)
    const hasTextMatch = selector.match(/^(.+?):has-text\("([^"]+)"\)$/);
    if (hasTextMatch) {
        return { type: 'hasText', base: hasTextMatch[1], text: hasTextMatch[2] };
    }
    // Clean escaped $ signs from Playwright
    return { type: 'css', css: selector.replace(/\\\$/g, '$') };
}

function _queryOne(selector) {
    const parsed = _resolveSelector(selector);
    if (parsed.type === 'hasText') {
        const all = document.querySelectorAll(parsed.base);
        for (const el of all) {
            if (el.textContent.includes(parsed.text)) return el;
        }
        return null;
    }
    return document.querySelector(parsed.css);
}

function _queryAll(selector) {
    const parsed = _resolveSelector(selector);
    if (parsed.type === 'hasText') {
        const all = document.querySelectorAll(parsed.base);
        return Array.from(all).filter(el => el.textContent.includes(parsed.text));
    }
    return Array.from(document.querySelectorAll(parsed.css));
}

function _isVisible(el) {
    if (!el) return false;
    if (el.type === 'radio' || el.type === 'checkbox') return true;
    return el.offsetParent !== null;
}

/**
 * Creates a "page" object that mimics Playwright's Page API.
 */
function createPageShim() {
    return {
        url() { return window.location.href; },

        // page.evaluate(fn, arg) — runs fn(arg) in current context
        async evaluate(fn, arg) {
            if (typeof fn === 'function') return fn(arg);
            return fn;
        },

        // page.waitForFunction(fn, opts)
        async waitForFunction(fn, opts = {}) {
            const timeout = opts.timeout || 5000;
            const start = Date.now();
            while (Date.now() - start < timeout) {
                try { if (fn()) return; } catch {}
                await new Promise(r => setTimeout(r, 100));
            }
        },

        // page.waitForSelector(selector, opts)
        async waitForSelector(selector, opts = {}) {
            const timeout = opts.timeout || 10000;
            const state = opts.state || 'visible';
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const el = _queryOne(selector);
                if (state === 'hidden' || state === 'detached') {
                    if (!el || !_isVisible(el)) return el;
                } else {
                    if (el && _isVisible(el)) return el;
                }
                await new Promise(r => setTimeout(r, 100));
            }
            if (state !== 'hidden' && state !== 'detached') {
                throw new Error(`waitForSelector timeout: ${selector}`);
            }
        },

        // page.locator(selector)
        locator(selector) {
            return createLocator(selector);
        },

        // page.goto(url)
        async goto(url) {
            window.location.href = url;
        },
    };
}

/**
 * Creates a Locator that mimics Playwright's Locator API.
 */
function createLocator(selector) {
    function getEl() { return _queryOne(selector); }

    const loc = {
        first() { return loc; },

        // locator.all() — returns array of Locators, one per matched element
        async all() {
            const elements = _queryAll(selector);
            return elements.map((el, i) => createElementLocator(el, `${selector}[${i}]`));
        },

        async isVisible(opts = {}) {
            return _isVisible(getEl());
        },

        async isChecked() {
            const el = getEl();
            return el ? !!el.checked : false;
        },

        async getAttribute(name) {
            const el = getEl();
            return el ? el.getAttribute(name) : null;
        },

        async waitFor(opts = {}) {
            const timeout = opts.timeout || 10000;
            const state = opts.state || 'visible';
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const el = getEl();
                if (state === 'visible' && _isVisible(el)) return;
                if (state === 'hidden' && !_isVisible(el)) return;
                await new Promise(r => setTimeout(r, 100));
            }
            throw new Error(`Locator waitFor timeout: ${selector}`);
        },

        async fill(value) {
            const el = getEl();
            if (!el) throw new Error(`fill: not found: ${selector}`);
            el.focus();
            // Use native setter for React/ASP.NET compatibility
            try {
                const proto = el.tagName === 'TEXTAREA'
                    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, String(value));
                else el.value = String(value);
            } catch { el.value = String(value); }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur();
        },

        async selectOption(valueOrOpts) {
            const el = getEl();
            if (!el) throw new Error(`selectOption: not found: ${selector}`);

            let targetValue;
            if (typeof valueOrOpts === 'object' && valueOrOpts !== null && valueOrOpts.label) {
                const opt = Array.from(el.options).find(o =>
                    o.text.trim().toUpperCase() === valueOrOpts.label.toUpperCase()
                );
                if (!opt) throw new Error(`selectOption: label "${valueOrOpts.label}" not found`);
                targetValue = opt.value;
            } else {
                targetValue = String(valueOrOpts);
            }

            const optExists = Array.from(el.options).some(o => o.value === targetValue);
            if (!optExists) throw new Error(`selectOption: value "${targetValue}" not found in ${selector}`);

            el.value = targetValue;
            el.dispatchEvent(new Event('change', { bubbles: true }));

            // Trigger ASP.NET __doPostBack if onchange exists
            if (el.getAttribute('onchange')) {
                try { eval(el.getAttribute('onchange')); } catch (e) {
                    console.warn(`[Shim] onchange eval error: ${e.message}`);
                }
            }
        },

        async click(opts = {}) {
            const el = getEl();
            if (!el) throw new Error(`click: not found: ${selector}`);
            el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            el.click();
        },

        async check() {
            const el = getEl();
            if (!el) throw new Error(`check: not found: ${selector}`);
            if (!el.checked) {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.click();
            }
        },

        async scrollIntoViewIfNeeded(opts = {}) {
            const el = getEl();
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        },

        // locator.evaluate(fn, arg) — fn receives the DOM element + optional arg
        async evaluate(fn, arg) {
            const el = getEl();
            if (!el) return null;
            return fn(el, arg);
        },

        async dispatchEvent(eventName) {
            const el = getEl();
            if (el) el.dispatchEvent(new Event(eventName, { bubbles: true }));
        },

        async screenshot(opts = {}) {
            const el = getEl();
            if (!el || el.tagName !== 'IMG') return null;
            if (!el.complete) {
                await new Promise(r => { el.onload = r; el.onerror = r; });
            }
            const canvas = document.createElement('canvas');
            canvas.width = el.naturalWidth;
            canvas.height = el.naturalHeight;
            canvas.getContext('2d').drawImage(el, 0, 0);
            return canvas.toDataURL('image/png');
        },
    };

    return loc;
}

/**
 * Creates a Locator that wraps a specific DOM element (for .all() results).
 */
function createElementLocator(element, label) {
    const loc = {
        first() { return loc; },

        async all() { return [loc]; },

        async isVisible(opts = {}) { return _isVisible(element); },
        async isChecked() { return !!element.checked; },
        async getAttribute(name) { return element.getAttribute(name); },

        async waitFor(opts = {}) { /* element already exists */ },

        async fill(value) {
            element.focus();
            try {
                const proto = element.tagName === 'TEXTAREA'
                    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(element, String(value));
                else element.value = String(value);
            } catch { element.value = String(value); }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
        },

        async selectOption(valueOrOpts) {
            let targetValue;
            if (typeof valueOrOpts === 'object' && valueOrOpts !== null && valueOrOpts.label) {
                const opt = Array.from(element.options).find(o =>
                    o.text.trim().toUpperCase() === valueOrOpts.label.toUpperCase()
                );
                if (!opt) throw new Error(`selectOption: label "${valueOrOpts.label}" not found`);
                targetValue = opt.value;
            } else {
                targetValue = String(valueOrOpts);
            }
            element.value = targetValue;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            if (element.getAttribute('onchange')) {
                try { eval(element.getAttribute('onchange')); } catch {}
            }
        },

        async click(opts = {}) {
            element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            element.click();
        },

        async check() {
            if (!element.checked) {
                element.checked = true;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.click();
            }
        },

        async scrollIntoViewIfNeeded(opts = {}) {
            element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        },

        async evaluate(fn, arg) { return fn(element, arg); },

        async dispatchEvent(eventName) {
            element.dispatchEvent(new Event(eventName, { bubbles: true }));
        },
    };

    return loc;
}

// Export
if (typeof window !== 'undefined') {
    window.createPageShim = createPageShim;
}
