/**
 * Convert remaining <p style="color:#..."> to <small style="color:#888">
 * Keeps them in the same DOM position (safe — no structural changes).
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'ds160', 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');
let count = 0;

// Match <p style="color:#XXX;...">content</p> (single or multi-line)
// Replace with <small style="color:#888">cleaned content</small>
html = html.replace(
    /<p\s+style="color:#[^"]*;[^"]*">([\s\S]*?)<\/p>/g,
    (match, content) => {
        count++;
        const clean = content.replace(/\s+/g, ' ').trim();
        // Preserve color for WARNING/NOTE paragraphs (color:#c00)
        if (match.includes('color:#c00')) {
            return `<small style="color:#c00">${clean}</small>`;
        }
        return `<small style="color:#888">${clean}</small>`;
    }
);

fs.writeFileSync(filePath, html, 'utf-8');
console.log(`Done: ${count} <p> converted to <small>`);

// Verify
const verify = fs.readFileSync(filePath, 'utf-8');
const remaining = (verify.match(/<p\s+style="color:#/g) || []).length;
console.log(`Remaining <p style="color:#...">: ${remaining}`);
const divOpen = (verify.match(/<div[ >]/g) || []).length;
const divClose = (verify.match(/<\/div>/g) || []).length;
console.log(`Div balance: ${divOpen} open, ${divClose} close (diff: ${divOpen - divClose})`);
