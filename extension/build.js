// ==================================================================
// Build LIGHT — only data modules (field-maps + normalizeProfile)
// NO Playwright-dependent code (postback.js, fill-field.js, generic-page.js)
// Run: node extension/build.js
// ==================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const AUTO = path.join(ROOT, 'automation');
const OUT = path.join(__dirname, 'shared', 'automation-bundle.js');

const steps = [];

// 1. Field-map helpers (pure: ph, padDay, normDate, emptyDate, stripZero)
addFile('field-map-helpers', path.join(PAGES, '_shared', 'field-map-helpers.js'));

// 2. Field maps shared (postback IDs — data only)
addFile('field-maps-shared', path.join(AUTO, 'field-maps', 'shared.js'));

// 3. ALL page-level field maps (pure data: buildXxxMap functions)
const pageDirs = fs.readdirSync(PAGES).filter(d => {
    return d !== '_shared' && fs.existsSync(path.join(PAGES, d, 'field-map.js'));
}).sort();

for (const dir of pageDirs) {
    addFile(`page-${dir}`, path.join(PAGES, dir, 'field-map.js'));
}

// 4. B1/B2 modular aggregator (buildDynamicFieldMap)
addFile('b1-b2-modular', path.join(AUTO, 'field-maps', 'b1-b2-modular.js'));

// 5. Field maps index (router by visa type)
addFile('field-maps-index', path.join(AUTO, 'field-maps', 'index.js'));

// 6. Extract normalizeProfile + identifyPage from filler.js
steps.push({ name: 'filler-extracts', type: 'extract' });

function addFile(name, filepath) {
    if (fs.existsSync(filepath)) {
        steps.push({ name, filepath, type: 'file' });
    } else {
        console.warn(`  ⚠️ SKIP ${name}: ${filepath}`);
    }
}

function convertToBrowser(code) {
    code = code.replace(/['"]use strict['"];?\s*/g, '');
    code = code.replace(/^const\s+\{[^}]+\}\s*=\s*require\([^)]+\);?\s*$/gm, '');
    code = code.replace(/^const\s+\w+\s*=\s*require\([^)]+\);?\s*$/gm, '');
    code = code.replace(/^module\.exports\s*=\s*\{[^}]*\};?\s*$/gm, '');
    code = code.replace(/^module\.exports\s*=\s*require\([^)]+\);?\s*$/gm, '');
    code = code.replace(/^module\.exports\s*=\s*\w+;?\s*$/gm, '');
    code = code.replace(/require\([^)]+\)/g, '{}');
    code = code.replace(/^const\s+(path|fs)\s*=\s*\{};?\s*$/gm, '');
    // const/let → var to allow redeclarations
    code = code.replace(/^(\s*)const\s+/gm, '$1var ');
    code = code.replace(/^(\s*)let\s+/gm, '$1var ');
    return code.trim();
}

function extractFromFiller() {
    const src = fs.readFileSync(path.join(AUTO, 'filler.js'), 'utf-8');
    const fns = [];
    for (const name of ['normalizeProfile', 'identifyPage', 'isFinalPage', 'isSecurityPage']) {
        const regex = new RegExp(`^function ${name}\\b[\\s\\S]*?\\n\\}`, 'm');
        const m = src.match(regex);
        if (m) fns.push(m[0]);
        else console.warn(`  ⚠️ Could not extract ${name}`);
    }
    return fns.join('\n\n');
}

// BUILD
console.log('🔨 Building LIGHT automation bundle (data only)...\n');
let bundle = `// AUTOMATION BUNDLE (LIGHT) — field-maps + normalizeProfile only\n// Generated: ${new Date().toISOString()}\n// NO Playwright dependencies\n\n`;

let count = 0;
for (const step of steps) {
    if (step.type === 'extract') {
        const extracted = extractFromFiller();
        bundle += `\n// ══════ filler-extracts ══════\n${extracted}\n\n`;
        console.log('  ✅ filler-extracts');
        count++;
        continue;
    }
    try {
        const raw = fs.readFileSync(step.filepath, 'utf-8');
        const converted = convertToBrowser(raw);
        bundle += `\n// ══════ ${step.name} ══════\n${converted}\n\n`;
        console.log(`  ✅ ${step.name}`);
        count++;
    } catch (err) {
        console.warn(`  ❌ ${step.name}: ${err.message}`);
    }
}

bundle += `
// ══════ Global exports ══════
window._automation = {
    buildDynamicFieldMap,
    normalizeProfile,
    identifyPage,
    isFinalPage,
};
console.log('[Bundle] ✅ Loaded (light):', Object.keys(window._automation).join(', '));
`;

fs.writeFileSync(OUT, bundle, 'utf-8');
const sizeKB = (Buffer.byteLength(bundle) / 1024).toFixed(1);
console.log(`\n📦 Bundle: ${OUT}`);
console.log(`   ${count} modules | ${sizeKB} KB`);

// Validate
try {
    new Function(bundle);
    console.log('   ✅ Valid JavaScript');
} catch (e) {
    console.error(`   ❌ SYNTAX ERROR: ${e.message}`);
}
