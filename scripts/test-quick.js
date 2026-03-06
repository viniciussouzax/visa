// Quick test — no colors, just results
const path = require('path');
const { normalizeProfile } = require(path.join(__dirname, '..', 'automation', 'filler'));
const { buildDynamicFieldMap } = require(path.join(__dirname, '..', 'automation', 'field-map'));
const { PROFILES } = require('./test-profiles');

let passed = 0, failed = 0;
const failures = [];

for (const [name, profile] of Object.entries(PROFILES)) {
    try {
        const n = normalizeProfile(profile.data);
        const fm = buildDynamicFieldMap(n);
        const nullFields = fm.filter(e =>
            (e.value === null || e.value === undefined) &&
            e.type !== 'checkbox-check' && e.type !== 'click'
        );
        if (nullFields.length) {
            console.log(`FAIL ${name}: ${nullFields.length} NULL fields (${fm.length} total)`);
            nullFields.forEach(e => {
                const p = e.pattern.toString().replace(/^\/|\/i$/g, '');
                console.log(`  NULL [${e.type}] ${p}`);
            });
            failed++;
            failures.push(name);
        } else {
            console.log(`PASS ${name} (${fm.length} fields)`);
            passed++;
        }
    } catch (err) {
        console.log(`CRASH ${name}: ${err.message}`);
        failed++;
        failures.push(name);
    }
}

console.log(`\n=== TOTAL: ${passed} passed, ${failed} failed out of ${passed + failed} ===`);
if (failures.length) console.log(`Failed: ${failures.join(', ')}`);
