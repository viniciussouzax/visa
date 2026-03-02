const fs = require('fs');
const html = fs.readFileSync('docs/ds160/index.html', 'utf-8');
const lines = html.split('\n');

const results = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('class="na-cb"') && line.includes('id="')) {
        const idMatch = line.match(/id="([^"]+)"/);
        let targetMatch = line.match(/data-target="([^"]+)"/);
        if (!targetMatch && i + 1 < lines.length) {
            targetMatch = lines[i + 1].match(/data-target="([^"]+)"/);
        }
        if (idMatch) {
            results.push({ id: idMatch[1], target: targetMatch ? targetMatch[1] : '?', line: i + 1 });
        }
    }
}

const genStart = html.indexOf('function generateJSON()');
const genEnd = html.indexOf('function val(', genStart);
const genBlock = html.substring(genStart, genEnd);

let output = `TOTAL: ${results.length} checkboxes N/A\n\n`;
results.forEach(r => {
    const inJson = genBlock.includes(r.id) ? 'YES' : 'NO';
    const targets = r.target.split(',').map(t => t.trim());
    const targetInJson = targets.some(t => genBlock.includes(t));
    output += `${inJson === 'YES' ? 'OK' : targetInJson ? 'MISS' : 'SKIP'} | L${r.line} | ${r.id} -> ${r.target}\n`;
});

output += '\nLegend: OK=handled, MISS=target used but no NA check, SKIP=target not in generateJSON\n';
fs.writeFileSync('/tmp/na-analysis.txt', output);
console.log(output);
