// ==================================================================
// DOM Helpers — shared utilities for content scripts
// ==================================================================

/**
 * Wait for an element to appear in the DOM.
 * @param {string} selector - CSS selector
 * @param {number} timeout - max ms to wait (default 30s)
 * @returns {Promise<Element>}
 */
function waitFor(selector, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const timer = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`waitFor timeout: ${selector}`));
        }, timeout);

        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                observer.disconnect();
                clearTimeout(timer);
                resolve(found);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

/**
 * Fill an input/textarea field and dispatch events.
 */
function fillInput(selector, value) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;

    // Clear first
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Set value
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    return true;
}

/**
 * Select an option in a <select> element and trigger postback if ASP.NET.
 */
function selectOption(selector, value) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;

    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // ASP.NET postback: trigger __doPostBack if needed
    if (el.getAttribute('onchange')) {
        eval(el.getAttribute('onchange'));
    }

    return true;
}

/**
 * Click a radio button by selector.
 */
function clickRadio(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;

    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.click();
    return true;
}

/**
 * Click a button/link.
 */
function clickElement(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.click();
    return true;
}

/**
 * Check if a checkbox should be checked.
 */
function checkBox(selector, shouldCheck = true) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;

    if (el.checked !== shouldCheck) {
        el.checked = shouldCheck;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.click();
    }
    return true;
}

/**
 * Wait for page navigation (full reload).
 * Returns a promise that resolves when the new page loads.
 */
function waitForNavigation(timeout = 60000) {
    return new Promise((resolve) => {
        // This runs in the current page context, so on navigation
        // the content script will be re-injected in the new page.
        // We resolve immediately — the bridge handles re-execution.
        resolve();
    });
}

/**
 * Get text content of an element.
 */
function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
}

/**
 * Check if element exists.
 */
function exists(selector) {
    return !!document.querySelector(selector);
}

/**
 * Wait for a specified number of milliseconds.
 */
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Get image as base64 (for captcha).
 */
async function getImageBase64(selector) {
    const img = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!img) return null;

    // Wait for image to load
    if (!img.complete) {
        await new Promise(r => { img.onload = r; img.onerror = r; });
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1]; // base64 without prefix
}

/**
 * Read all validation errors on the page.
 */
function getValidationErrors() {
    const errors = [];
    document.querySelectorAll('.ErrorMessage, [id*="validator"], .aspNetValidator').forEach(el => {
        const text = el.textContent.trim();
        if (text && el.style.display !== 'none' && el.style.visibility !== 'hidden') {
            errors.push(text);
        }
    });
    return errors;
}

/**
 * Detect current page name from URL or breadcrumb.
 */
function detectPage() {
    const url = window.location.href;
    if (url.includes('Default.aspx')) return 'Landing';
    if (url.includes('Complete.aspx')) return 'Complete';

    // Try to read from breadcrumb or page header
    const header = document.querySelector('.subHeader, .SectionHeader, h2');
    if (header) return header.textContent.trim().substring(0, 30);

    // Fallback: extract from URL
    const match = url.match(/\/(\w+)\.aspx/);
    return match ? match[1] : 'Unknown';
}

// Send message to background
function sendToBackground(msg) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(msg, resolve);
    });
}
