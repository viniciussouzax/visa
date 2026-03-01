/**
 * SAFE: Move <p> descriptions into the next .fg as <small>
 * Works line-by-line to avoid breaking HTML structure.
 *
 * Pattern: finds lines with <p style="color:..."> that end with </p>,
 * or multi-line <p> blocks, collects the text, removes the <p>,
 * and inserts a <small> after the </label> in the next <div class="fg">.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'ds160', 'index.html');
const lines = fs.readFileSync(filePath, 'utf-8').split('\r\n');
let count = 0;

// Pass 1: Find all <p style="color:..."> blocks and their line ranges
const pBlocks = [];
let inP = false;
let pStart = -1;
let pContent = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inP && /<p\s+style="[^"]*color/.test(line)) {
        pStart = i;
        inP = true;
        pContent = '';
    }

    if (inP) {
        pContent += line + '\n';
        if (line.includes('</p>')) {
            inP = false;
            // Check if the next non-blank line is a <div class="fg">
            let nextFgLine = -1;
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                if (lines[j].trim() === '') continue;
                if (lines[j].includes('<div class="fg">')) {
                    nextFgLine = j;
                }
                break;
            }

            if (nextFgLine !== -1) {
                // Extract clean text from <p>
                const textMatch = pContent.match(/<p[^>]*>([\s\S]*)<\/p>/);
                if (textMatch) {
                    const cleanText = textMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                    pBlocks.push({
                        startLine: pStart,
                        endLine: i,
                        fgLine: nextFgLine,
                        text: cleanText
                    });
                }
            }
        }
    }
}

console.log(`Found ${pBlocks.length} <p> blocks to move`);

// Pass 2: Apply changes in reverse order to preserve line numbers
for (let b = pBlocks.length - 1; b >= 0; b--) {
    const block = pBlocks[b];
    const fgLine = lines[block.fgLine];

    // Find </label> in the fg line and insert <small> after it
    const labelEndIdx = fgLine.indexOf('</label>');
    if (labelEndIdx === -1) {
        console.log(`  SKIP line ${block.startLine + 1}: no </label> found in fg at line ${block.fgLine + 1}`);
        continue;
    }

    const insertPos = labelEndIdx + '</label>'.length;
    const before = fgLine.substring(0, insertPos);
    const after = fgLine.substring(insertPos);
    const smallTag = `\n                <small style="color:#888">${block.text}</small>`;
    lines[block.fgLine] = before + smallTag + after;

    // Remove the <p> lines
    lines.splice(block.startLine, block.endLine - block.startLine + 1);
    count++;
    console.log(`  ✅ Line ${block.startLine + 1}: "${block.text.substring(0, 60)}..."`);
}

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf-8');
console.log(`\n✅ ${count} descriptions moved safely`);

// Verify: count lines, check no broken tags
const verify = fs.readFileSync(filePath, 'utf-8');
const openDivs = (verify.match(/<div /g) || []).length;
const closeDivs = (verify.match(/<\/div>/g) || []).length;
console.log(`Verification: ${openDivs} <div> opens, ${closeDivs} </div> closes`);
if (openDivs !== closeDivs) {
    console.log('⚠️ WARNING: div mismatch!');
} else {
    console.log('✅ div tags balanced');
}
