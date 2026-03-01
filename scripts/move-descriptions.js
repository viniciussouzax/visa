/**
 * Move <p> descriptions that appear BEFORE <div class="fg"> into
 * the fg as <small> elements (so flexbox order places them correctly
 * between label and input).
 *
 * Pattern matched:
 *   <p style="color:#666;...">Description text...</p>
 *   <div class="fg"><label>Question</label>...
 *
 * Becomes:
 *   <div class="fg"><label>Question</label>
 *       <small style="color:#888">Description text...</small>...
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'ds160', 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');
let count = 0;

// Match: <p style="...color/font-size...">text</p> followed by whitespace then <div class="fg">
// The <p> may span multiple lines
html = html.replace(
    /(<\s*p\s+style="[^"]*(?:color|font-size)[^"]*"\s*>)([\s\S]*?)<\/p>\s*\r?\n(\s*)(<div class="fg">)(<label>[\s\S]*?<\/label>)/g,
    (match, pOpen, pContent, indent, fgOpen, labelTag) => {
        count++;
        // Clean up the description text
        const desc = pContent.replace(/\s+/g, ' ').trim();
        return `${indent}${fgOpen}${labelTag}\n${indent}    <small style="color:#888">${desc}</small>`;
    }
);

fs.writeFileSync(filePath, html, 'utf-8');
console.log(`✅ ${count} descrições movidas para dentro do .fg como <small>`);
