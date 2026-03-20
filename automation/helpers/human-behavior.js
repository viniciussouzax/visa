// ============================================================
// human-behavior.js — Centralised human simulation helpers
// Realistic interaction timing to avoid anti-bot detection.
// All automation modules should use these instead of raw
// Playwright click/fill/type methods.
// ============================================================
'use strict';

/**
 * Random delay with slight gaussian-like distribution.
 * More natural than uniform random (clusters around center).
 * @param {number} min - Minimum ms
 * @param {number} max - Maximum ms
 * @returns {Promise<void>}
 */
async function humanDelay(min = 300, max = 800) {
    // Average of 2 randoms gives bell-curve distribution
    const r = (Math.random() + Math.random()) / 2;
    const ms = min + Math.floor(r * (max - min));
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Occasional long pause simulating "reading" or "thinking".
 * 10% chance of 2-5s pause, otherwise 300-800ms.
 */
async function thinkingPause() {
    if (Math.random() < 0.10) {
        // Simulates human reading/thinking
        const pause = 2000 + Math.floor(Math.random() * 3000);
        return new Promise(resolve => setTimeout(resolve, pause));
    }
    return humanDelay(300, 800);
}

/**
 * Type text with human-like variable delay per keystroke.
 * Uses keyboard.type for proper keydown/keyup events.
 * @param {import('playwright').Page} page
 * @param {string|import('playwright').Locator} selector - CSS selector or Locator
 * @param {string} text - Text to type
 */
async function humanType(page, selector, text) {
    const el = typeof selector === 'string' ? page.locator(selector) : selector;
    await humanScroll(page, el);
    await el.click();
    await humanDelay(80, 250);
    // Clear existing value
    await el.fill('');
    await humanDelay(50, 150);
    // Type character by character with variable delays
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        // Base delay 50-150ms per char, occasional pause (simulates looking at keyboard)
        let charDelay = 50 + Math.floor(Math.random() * 100);
        // Every 4-8 chars, slightly longer pause (word boundary / thinking)
        if (i > 0 && i % (4 + Math.floor(Math.random() * 5)) === 0) {
            charDelay += 80 + Math.floor(Math.random() * 200);
        }
        await page.keyboard.type(char, { delay: charDelay });
    }
    await humanDelay(50, 200);
}

/**
 * Click with mouse movement + press/release (more human-like than instant click).
 * Anti-bots detect clicks that appear without prior mouse movement.
 * @param {import('playwright').Page} page
 * @param {string|import('playwright').Locator} selector - CSS selector or Locator
 */
async function humanClick(page, selector) {
    const el = typeof selector === 'string' ? page.locator(selector) : selector;
    await humanScroll(page, el);
    const box = await el.boundingBox();
    if (box) {
        // Random offset within element (not always center)
        const targetX = box.x + box.width * (0.2 + Math.random() * 0.6);
        const targetY = box.y + box.height * (0.2 + Math.random() * 0.6);
        // Move mouse with cubic Bézier curve (humans don't move in straight lines)
        await _bezierMouseMove(page, targetX, targetY);
        await humanDelay(40, 180);
        // press/release instead of instant click — anti-bots detect instant clicks
        await page.mouse.down();
        await new Promise(r => setTimeout(r, 25 + Math.floor(Math.random() * 60)));
        await page.mouse.up();
    } else {
        // Fallback: direct click if bounding box unavailable
        await el.click();
    }
    await humanDelay(100, 350);
}

/**
 * Move mouse along a cubic Bézier curve with micro-jitter.
 * Linear mouse movement is a strong bot signal — real humans move in curves.
 * @param {import('playwright').Page} page
 * @param {number} targetX
 * @param {number} targetY
 */
async function _bezierMouseMove(page, targetX, targetY) {
    // Get current mouse position (or start from a random edge)
    let startX, startY;
    try {
        const pos = await page.evaluate(() => ({
            x: window._lastMouseX || 200 + Math.random() * 400,
            y: window._lastMouseY || 200 + Math.random() * 200,
        }));
        startX = pos.x;
        startY = pos.y;
    } catch {
        startX = 200 + Math.random() * 400;
        startY = 200 + Math.random() * 200;
    }

    // Generate 2 random control points for cubic Bézier
    const dx = targetX - startX;
    const dy = targetY - startY;
    const spread = Math.min(80, Math.sqrt(dx * dx + dy * dy) * 0.4);

    const cp1x = startX + dx * (0.2 + Math.random() * 0.2) + (Math.random() - 0.5) * spread;
    const cp1y = startY + dy * (0.2 + Math.random() * 0.2) + (Math.random() - 0.5) * spread;
    const cp2x = startX + dx * (0.6 + Math.random() * 0.2) + (Math.random() - 0.5) * spread;
    const cp2y = startY + dy * (0.6 + Math.random() * 0.2) + (Math.random() - 0.5) * spread;

    const steps = 15 + Math.floor(Math.random() * 15); // 15-30 steps

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        // Cubic Bézier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        const oneMinusT = 1 - t;
        const x = oneMinusT*oneMinusT*oneMinusT*startX
                + 3*oneMinusT*oneMinusT*t*cp1x
                + 3*oneMinusT*t*t*cp2x
                + t*t*t*targetX;
        const y = oneMinusT*oneMinusT*oneMinusT*startY
                + 3*oneMinusT*oneMinusT*t*cp1y
                + 3*oneMinusT*t*t*cp2y
                + t*t*t*targetY;

        // Micro-jitter (hand tremor) — ±1px
        const jx = (Math.random() - 0.5) * 2;
        const jy = (Math.random() - 0.5) * 2;

        await page.mouse.move(x + jx, y + jy, { steps: 1 });
        // Variable speed: slower at start/end (acceleration curve)
        const speed = 6 + Math.random() * 10;
        await new Promise(r => setTimeout(r, speed));
    }

    // Save position for next call
    await page.evaluate((x, y) => {
        window._lastMouseX = x;
        window._lastMouseY = y;
    }, targetX, targetY).catch(() => {});
}

/**
 * Select an option with human-like interaction.
 * Scrolls to element, clicks to open, then selects.
 * @param {import('playwright').Page} page
 * @param {string|import('playwright').Locator} selector
 * @param {string} value
 */
async function humanSelect(page, selector, value) {
    const el = typeof selector === 'string' ? page.locator(selector) : selector;
    await humanScroll(page, el);
    await humanDelay(80, 200);
    await el.selectOption(value);
    await humanDelay(100, 300);
}

/**
 * Smooth scroll to element before interacting.
 * Humans don't teleport their viewport — they scroll gradually.
 * @param {import('playwright').Page} page
 * @param {string|import('playwright').Locator} selector
 */
async function humanScroll(page, selector) {
    const el = typeof selector === 'string' ? page.locator(selector) : selector;
    try {
        // Use smooth scroll behavior
        await el.evaluate(node => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }).catch(() => {});
        // Wait for smooth scroll to complete
        await humanDelay(100, 300);
    } catch {
        // Fallback to Playwright's built-in scroll
        await el.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => {});
    }
}

/**
 * Fill a text field with human-like typing (char by char).
 * Replacement for loc.fill() which is instantaneous.
 * Falls back to loc.fill() for very long text (>100 chars) to avoid timeout.
 * @param {import('playwright').Page} page
 * @param {string} fieldId - DOM element ID
 * @param {string} value - Text value to type
 * @returns {boolean} true if field was filled
 */
async function humanFillText(page, fieldId, value) {
    const escapedId = fieldId.replace(/\$/g, '\\$');
    const loc = page.locator(`#${escapedId}`);
    const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
    if (!isVis) return false;

    await humanScroll(page, loc);
    await humanDelay(80, 200);

    // For very long text, use fill() to avoid excessive delay
    if (value.length > 80) {
        await loc.fill(String(value).trim());
        await humanDelay(100, 300);
        return true;
    }

    // Click to focus
    await loc.click();
    await humanDelay(50, 150);
    // Clear
    await loc.fill('');
    await humanDelay(30, 100);
    // Type char by char
    const text = String(value).trim();
    for (let i = 0; i < text.length; i++) {
        let charDelay = 40 + Math.floor(Math.random() * 90);
        if (i > 0 && i % (3 + Math.floor(Math.random() * 5)) === 0) {
            charDelay += 60 + Math.floor(Math.random() * 150);
        }
        await page.keyboard.type(text[i], { delay: charDelay });
    }
    // Tab out to trigger blur/validation
    await page.keyboard.press('Tab');
    await humanDelay(50, 150);
    return true;
}

/**
 * Fill multiple text fields sequentially with human-like delays between them.
 * Replacement for fillTextBatch (page.evaluate) which is instantaneous.
 * @param {import('playwright').Page} page
 * @param {Array<{id: string, value: string}>} entries
 * @returns {number} count of filled fields
 */
async function humanFillTextBatch(page, entries) {
    if (!entries || entries.length === 0) return 0;
    let filled = 0;
    for (const { id, value } of entries) {
        try {
            const ok = await humanFillText(page, id, value);
            if (ok) filled++;
            // Delay between fields (200-500ms, occasional longer pause)
            await thinkingPause();
        } catch (e) {
            console.warn(`[HumanBehavior] fillText error: ${id}`, e.message);
        }
    }
    return filled;
}

module.exports = {
    humanDelay,
    thinkingPause,
    humanType,
    humanClick,
    humanSelect,
    humanScroll,
    humanFillText,
    humanFillTextBatch,
};
