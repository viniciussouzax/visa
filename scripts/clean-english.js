/**
 * Script para remover textos em inglês duplicados do formulário clone DS-160.
 * Limpa labels, options, headings e textos descritivos que têm padrão:
 *   "Português (English)" → "Português"
 * 
 * Uso: node scripts/clean-english.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'ds160', 'index.html');
let html = fs.readFileSync(filePath, 'utf-8');
let total = 0;

// ============================================================
// Remove English text in parentheses from option/label/h2/h3/p tags
// Pattern: "Texto PT (English Text)" → "Texto PT"
//
// Rules:
//   - English text must start with uppercase letter
//   - Portuguese text must be at least 2 chars
//   - Preserves "(a)" suffix like "Solteiro(a)" or "Casado(a)" by
//     requiring English text to be > 3 chars
//   - Does NOT remove parentheticals that start with lowercase
//     (those are real PT notes like "(sempre Não)")
// ============================================================

function cleanEnglish(text) {
    // Match: "word(s) (EnglishText)" where English is 4+ chars starting with uppercase
    // Also handles: "word(a) (EnglishText)" patterns
    return text.replace(
        /\s*\(([A-Z][A-Za-z\s/.&',?*-]{3,})\)/g,
        (match, enText) => {
            // Keep if the "English" text is actually a Portuguese note
            // (starts with common PT words)
            if (/^(Ex|Por|Sempre|Apenas|Nota|Se |Ou |Para |De |Do |Da |Dos |Das )/.test(enText)) {
                return match;
            }
            total++;
            return '';
        }
    );
}

// Process line by line to be more precise
const lines = html.split('\n');
const processed = lines.map((line, idx) => {
    // Only process lines that contain HTML content (not script/style)
    // Skip lines inside <script> blocks
    if (line.includes('function ') || line.includes('const ') || line.includes('let ') ||
        line.includes('var ') || line.includes('if (') || line.includes('return ') ||
        line.includes('//') || line.includes('console.') || line.includes('document.') ||
        line.includes('window.') || line.includes('addEventListener') ||
        line.includes('.push(') || line.includes('.forEach(') || line.includes('pattern:') ||
        line.includes('value:') || line.includes('=> {') || line.includes('=> (')) {
        return line;
    }

    // Process HTML content lines
    if (line.includes('<option') || line.includes('<label') ||
        line.includes('<h2') || line.includes('<h3') || line.includes('<p ') ||
        line.includes('<div') || line.includes('<span') || line.includes('<small')) {
        return cleanEnglish(line);
    }

    // Also clean continuation lines (text that spans multiple lines in labels)
    if (/^\s+(with|for|of|to|the|in|at|on|from|by|or|and|your)\b/i.test(line)) {
        return line; // Don't touch English-looking continuation lines inside JS
    }

    // Check if previous line had an open tag
    return cleanEnglish(line);
});

const result = processed.join('\n');
fs.writeFileSync(filePath, result, 'utf-8');
console.log(`✅ ${total} textos em inglês removidos do formulário.`);
