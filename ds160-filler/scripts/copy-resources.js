#!/usr/bin/env node
/**
 * copy-resources.js
 * Copies sidecar/ and automation/ into src-tauri/resources/
 * so Tauri can bundle them as local resources (no ../ paths).
 * 
 * Called by tauri.conf.json beforeBuildCommand.
 * CWD is the repo root (DS160 IA/) when called by Tauri.
 */
const fs = require('fs');
const path = require('path');

// __dirname is always reliable
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..'); // ds160-filler/
const srcTauri = path.join(projectRoot, 'src-tauri');
const resourcesDir = path.join(srcTauri, 'resources');

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.error(`[copy-resources] ERROR: Source not found: ${src}`);
        process.exit(1);
    }
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

// Clean previous resources
if (fs.existsSync(resourcesDir)) {
    fs.rmSync(resourcesDir, { recursive: true, force: true });
}
fs.mkdirSync(resourcesDir, { recursive: true });

console.log(`[copy-resources] project root: ${projectRoot}`);
console.log(`[copy-resources] target: ${resourcesDir}`);

// Copy sidecar/
copyDir(path.join(projectRoot, 'sidecar'), path.join(resourcesDir, 'sidecar'));
console.log('  ✓ sidecar/');

// Copy automation/
copyDir(path.join(projectRoot, 'automation'), path.join(resourcesDir, 'automation'));
console.log('  ✓ automation/');

// Copy package.json (for version info used by sidecar)
fs.copyFileSync(
    path.join(projectRoot, 'package.json'),
    path.join(resourcesDir, 'package.json')
);
console.log('  ✓ package.json');

console.log('[copy-resources] Done!');
