// Teste de sintaxe dos arquivos de automação
// Verifica se todos os .js no automation/ são válidos

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const automationDir = path.join(__dirname, 'automation');
const files = [
    'filler.js',
    'queue.js',
    'ds160-entry.js',
    'captcha.js',
    'field-map.js',
    'normalize-profile.js'
];

console.log('🔍 Testando sintaxe dos arquivos de automação...\n');

let allGood = true;

for (const file of files) {
    const filePath = path.join(automationDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${file}: arquivo não encontrado`);
        allGood = false;
        continue;
    }

    try {
        const code = fs.readFileSync(filePath, 'utf8');
        // Try to parse (vm.runInNewContext doesn't execute top-level, just parses)
        new vm.Script(code, { filename: file });
        console.log(`✅ ${file}: sintaxe OK`);
    } catch (e) {
        console.log(`❌ ${file}: ERRO DE SINTAXE`);
        console.log(`   ${e.message}`);
        allGood = false;
    }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
    console.log('✅ Todos arquivos com sintaxe válida');
} else {
    console.log('❌ Alguns arquivos têm problemas de sintaxe/encoding');
}
