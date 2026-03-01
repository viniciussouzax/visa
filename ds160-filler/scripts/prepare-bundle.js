#!/usr/bin/env node
/**
 * prepare-bundle.js
 * Creates a minimal _bundle/ directory for Tauri production builds.
 * Includes: sidecar/, automation/, and only production node_modules
 * (excluding dev dependencies and Playwright browser binaries).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = path.join(ROOT, '_bundle');

// Clean previous bundle
if (fs.existsSync(BUNDLE)) {
    fs.rmSync(BUNDLE, { recursive: true, force: true });
}

// Recursive copy helper
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('[prepare-bundle] Creating _bundle/ ...');

// 1. Copy sidecar/
copyDir(path.join(ROOT, 'sidecar'), path.join(BUNDLE, 'sidecar'));
console.log('  ✓ sidecar/');

// 2. Copy automation/
copyDir(path.join(ROOT, 'automation'), path.join(BUNDLE, 'automation'));
console.log('  ✓ automation/');

// 3. Copy package.json (for version info)
fs.copyFileSync(
    path.join(ROOT, 'package.json'),
    path.join(BUNDLE, 'package.json')
);
console.log('  ✓ package.json');

// 4. Create a minimal package.json for production deps only
const prodPkg = {
    name: 'ds160-filler-bundle',
    version: '1.0.0',
    private: true,
    dependencies: {
        '@supabase/supabase-js': '*',
        'playwright': '*',
        'playwright-core': '*'
    }
};

const bundlePkgPath = path.join(BUNDLE, '_pkg', 'package.json');
fs.mkdirSync(path.join(BUNDLE, '_pkg'), { recursive: true });
fs.writeFileSync(bundlePkgPath, JSON.stringify(prodPkg, null, 2));

console.log('  ✓ _pkg/package.json (production deps manifest)');
console.log('[prepare-bundle] Done! Now run: cd _bundle/_pkg && npm install --production');
console.log('[prepare-bundle] Then move _bundle/_pkg/node_modules -> _bundle/node_modules');
