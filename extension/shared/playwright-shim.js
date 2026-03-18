// ==================================================================
// Playwright Shim — emulates Playwright's page API using DOM APIs
// Allows reusing generic-page.js, fill-field.js, postback.js etc.
// ==================================================================
'use strict';

/**
 * Creates a "page" object that mimics Playwright's Page API.
 * This runs inside a content script (already in the browser context).
 */
function createPageShim() {
    const page = {
        // page.url()
        url() { return window.location.href; },

        // page.evaluate(fn, arg)
        async evaluate(fn, arg) {
            return typeof fn === 'function' ? fn(arg) : fn;
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
                const el = document.querySelector(selector);
                if (state === 'hidden' || state === 'detached') {
                    if (!el || el.offsetParent === null || el.style.display === 'none') return el;
                } else {
                    if (el && el.offsetParent !== null) return el;
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

        // page.goto(url, opts) — navigates the current tab
        async goto(url) {
            window.location.href = url;
            // Navigation will cause content script to re-run
        },
    };

    return page;
}

/**
 * Creates a locator that mimics Playwright's Locator API.
 */
function createLocator(selector) {
    function getEl() {
        // Handle Playwright's #id with escaped $ signs
        const cleanSelector = selector.replace(/\\\$/g, '$');
        return document.querySelector(cleanSelector);
    }

    const locator = {
        first() { return locator; }, // already first

        async isVisible(opts = {}) {
            const el = getEl();
            if (!el) return false;
            return el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox';
        },

        async isChecked() {
            const el = getEl();
            return el ? el.checked : false;
        },

        async waitFor(opts = {}) {
            const timeout = opts.timeout || 10000;
            const state = opts.state || 'visible';
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const el = getEl();
                if (state === 'visible' && el && (el.offsetParent !== null || el.type === 'radio' || el.type === 'checkbox')) return;
                if (state === 'hidden' && (!el || el.offsetParent === null)) return;
                await new Promise(r => setTimeout(r, 100));
            }
            throw new Error(`Locator waitFor timeout: ${selector}`);
        },

        async fill(value) {
            const el = getEl();
            if (!el) throw new Error(`fill: element not found: ${selector}`);
            el.focus();
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.value = String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur();
        },

        async selectOption(valueOrOpts) {
            const el = getEl();
            if (!el) throw new Error(`selectOption: element not found: ${selector}`);

            let value;
            if (typeof valueOrOpts === 'object' && valueOrOpts.label) {
                // Find by label
                const opt = Array.from(el.options).find(o =>
                    o.text.trim().toUpperCase() === valueOrOpts.label.toUpperCase()
                );
                if (!opt) throw new Error(`selectOption: label not found: ${valueOrOpts.label}`);
                value = opt.value;
            } else {
                value = String(valueOrOpts);
            }

            // Check if value exists in options
            const optExists = Array.from(el.options).some(o => o.value === value);
            if (!optExists) throw new Error(`selectOption: value "${value}" not found`);

            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));

            // Trigger ASP.NET postback if onchange exists
            if (el.getAttribute('onchange')) {
                try { eval(el.getAttribute('onchange')); } catch {}
            }
        },

        async click() {
            const el = getEl();
            if (!el) throw new Error(`click: element not found: ${selector}`);
            el.click();
        },

        async check() {
            const el = getEl();
            if (!el) throw new Error(`check: element not found: ${selector}`);
            if (!el.checked) {
                el.checked = true;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.click();
            }
        },

        async scrollIntoViewIfNeeded() {
            const el = getEl();
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        },

        async screenshot(opts = {}) {
            // Content scripts can't take screenshots directly
            // For captcha, we use canvas to get base64
            const el = getEl();
            if (!el || el.tagName !== 'IMG') return null;

            if (!el.complete) {
                await new Promise(r => { el.onload = r; el.onerror = r; });
            }

            const canvas = document.createElement('canvas');
            canvas.width = el.naturalWidth;
            canvas.height = el.naturalHeight;
            canvas.getContext('2d').drawImage(el, 0, 0);

            if (opts.path) {
                // Can't save to path in content script — return base64 instead
                return canvas.toDataURL('image/png');
            }
            return canvas.toDataURL('image/png');
        },

        async evaluate(fn) {
            const el = getEl();
            if (!el) return null;
            return fn(el);
        },

        async dispatchEvent(eventName) {
            const el = getEl();
            if (el) el.dispatchEvent(new Event(eventName, { bubbles: true }));
        },
    };

    return locator;
}

// Export for content scripts
if (typeof window !== 'undefined') {
    window.createPageShim = createPageShim;
}
