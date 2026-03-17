/**
 * Build DS-160 Schema (OPCIONAL)
 * 
 * Reconstrói public/ds160-schema.js a partir dos módulos pages/XX/schema.js.
 * Use apenas quando quiser sincronizar os módulos → monolítico.
 * No dia-a-dia, edite ds160-schema.js diretamente.
 * 
 * Uso: node scripts/build-schema.js
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'pages');
const OUTPUT = path.join(__dirname, '..', 'public', 'ds160-schema.js');

// Order matters — must match DS-160 page flow
const PAGE_ORDER = [
    '01-location',
    '02-personal1',
    '03-personal2',
    '04-travel',
    '05-travel-companions',
    '06-previous-us-travel',
    '07-address-phone',
    '08-passport',
    '09-us-contact',
    '10-family-parents',
    '11-family-spouse',
    '12-deceased-spouse',
    '13-prev-spouse',
    '14-work-education-current',
    '15-work-education-previous',
    '16-work-education-additional',
    '17-security',
    '18-student-exchange',
    '19-petition-info',
];

// ── 1) Load each section ──
const sections = [];
for (const folder of PAGE_ORDER) {
    const schemaFile = path.join(PAGES_DIR, folder, 'schema.js');
    if (!fs.existsSync(schemaFile)) {
        console.warn(`⚠️ Missing: ${folder}/schema.js`);
        continue;
    }
    let content = fs.readFileSync(schemaFile, 'utf-8');
    content = content.replace(/^\/\*\*.*?\*\/\s*/s, '');
    content = content.replace(/^export\s+default\s+/m, '');
    content = content.replace(/;\s*$/, '');
    
    try {
        const section = eval(`(${content})`);
        sections.push(section);
        console.log(`  ✅ ${folder}: ${section.id} (${section.fields.length} fields)`);
    } catch (e) {
        console.error(`  ❌ ${folder}: ${e.message}`);
    }
}

// ── 2) Load shared options from pages/_shared/options.js ──
const optionsFile = path.join(PAGES_DIR, '_shared', 'options.js');
let options = {};
if (fs.existsSync(optionsFile)) {
    let optContent = fs.readFileSync(optionsFile, 'utf-8');
    // Handle both ESM export and CommonJS
    optContent = optContent.replace(/^export\s+const\s+allOptions\s*=\s*/m, 'module.exports = ');
    try {
        // Try CommonJS require first
        delete require.cache[require.resolve(optionsFile)];
        const mod = require(optionsFile);
        options = mod.allOptions || mod;
        console.log(`  ✅ options: ${Object.keys(options).length} option sets`);
    } catch (e) {
        // Fallback: eval the content
        optContent = fs.readFileSync(optionsFile, 'utf-8');
        optContent = optContent.replace(/^export\s+const\s+allOptions\s*=\s*/m, '');
        optContent = optContent.replace(/;\s*$/, '');
        try {
            options = eval(`(${optContent})`);
            console.log(`  ✅ options (eval): ${Object.keys(options).length} option sets`);
        } catch (e2) {
            console.error(`  ❌ options: ${e2.message}`);
        }
    }
} else {
    console.warn('⚠️ Missing: pages/_shared/options.js');
}

// ── 3) Build the output object and serialize ──
const schema = { sections, options };

function toJS(obj, indent = 0) {
    const pad = '    '.repeat(indent);
    const pad1 = '    '.repeat(indent + 1);
    
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj.toString();
    if (typeof obj === 'number') return obj.toString();
    if (typeof obj === 'string') return JSON.stringify(obj);
    if (obj instanceof RegExp) return obj.toString();
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        if (obj.length <= 4 && obj.every(v => typeof v !== 'object')) {
            return '[' + obj.map(v => toJS(v, 0)).join(', ') + ']';
        }
        const items = obj.map(v => pad1 + toJS(v, indent + 1));
        return '[\n' + items.join(',\n') + '\n' + pad + ']';
    }
    
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        const compact = keys.length <= 3 && keys.every(k => typeof obj[k] !== 'object' || obj[k] === null);
        if (compact) {
            return '{ ' + keys.map(k => `${k}: ${toJS(obj[k], 0)}`).join(', ') + ' }';
        }
        const entries = keys.map(k => pad1 + `${k}: ${toJS(obj[k], indent + 1)}`);
        return '{\n' + entries.join(',\n') + '\n' + pad + '}';
    }
    
    return String(obj);
}

// ── 4) Write output ──
const output = `/**
 * DS-160 SCHEMA — Fonte única de verdade
 * 
 * ⚠️  GERADO AUTOMATICAMENTE por scripts/build-schema.js
 *     NÃO EDITE MANUALMENTE — edite os módulos em pages/XX/schema.js
 * 
 * Tipos suportados: text, select, radio, date, phone, email, textarea, array
 * Modificadores: required, maxLen, noSpecial, uppercase, allowNA, allowUnknown, showWhen, default
 */
const DS160_SCHEMA = ${toJS(schema)};
`;

fs.writeFileSync(OUTPUT, output, 'utf-8');

console.log(`\n📦 Output: public/ds160-schema.js (${(fs.statSync(OUTPUT).size / 1024).toFixed(1)}KB)`);
console.log(`📊 ${sections.length} sections, ${Object.keys(options).length} option sets`);
