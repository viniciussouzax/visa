#!/usr/bin/env node
/**
 * copy-resources.js
 * Copies sidecar/, automation/, package.json into src-tauri/resources/
 * AND installs production node_modules into resources/
 * so Tauri can bundle everything the sidecar needs.
 * 
 * Called by tauri.conf.json beforeBuildCommand.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 1. Copy sidecar/
copyDir(path.join(projectRoot, 'sidecar'), path.join(resourcesDir, 'sidecar'));
console.log('  ✓ sidecar/');

// 2. Copy automation/
copyDir(path.join(projectRoot, 'automation'), path.join(resourcesDir, 'automation'));
console.log('  ✓ automation/');

// 3. Create a minimal package.json with only sidecar production deps
const realPkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const sidecarPkg = {
    name: "sends160-sidecar",
    version: realPkg.version || "1.0.0",
    private: true,
    dependencies: {
        "@supabase/supabase-js": "^2.45.0",
        "playwright": "^1.58.2"
    }
};
fs.writeFileSync(
    path.join(resourcesDir, 'package.json'),
    JSON.stringify(sidecarPkg, null, 2)
);
console.log('  ✓ package.json (sidecar deps only)');

// 4. Install production deps into resources/node_modules
console.log('[copy-resources] Installing production dependencies...');
try {
    execSync('npm install --production --no-optional --ignore-scripts', {
        cwd: resourcesDir,
        stdio: 'inherit',
        env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }
    });
    console.log('  ✓ node_modules/ installed');
} catch (e) {
    console.error('[copy-resources] WARNING: npm install failed, sidecar may not work in production');
    console.error(e.message);
}

// 5. Remove unnecessary files from node_modules to reduce size
const cleanPatterns = ['.cache', '.github', 'test', 'tests', '__tests__', 'docs', 'example', 'examples', '.eslintrc', '.prettierrc'];
function cleanNodeModules(dir) {
    if (!fs.existsSync(dir)) return;
    let cleaned = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (cleanPatterns.includes(entry.name.toLowerCase())) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                cleaned++;
            } else {
                cleaned += cleanNodeModules(fullPath);
            }
        } else if (entry.name.endsWith('.md') || entry.name === 'LICENSE' || entry.name === 'CHANGELOG' || entry.name.endsWith('.map')) {
            fs.unlinkSync(fullPath);
            cleaned++;
        }
    }
    return cleaned;
}

const cleaned = cleanNodeModules(path.join(resourcesDir, 'node_modules'));
console.log(`  ✓ Cleaned ${cleaned} unnecessary files from node_modules`);

console.log('[copy-resources] Done!');
