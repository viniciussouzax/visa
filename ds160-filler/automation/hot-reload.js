// ============================================================
// HOT-RELOAD — Auto-update automation scripts from GitHub
// Downloads latest filler.js, field-map.js, queue.js, captcha.js
// from the repo without reinstalling the app.
// ============================================================
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'viniciussouzax';
const REPO_NAME = 'visa';
const BRANCH = 'main';
const REMOTE_DIR = 'ds160-filler/automation';
const SCRIPTS = ['filler.js', 'field-map.js', 'queue.js', 'captcha.js', 'version.json'];

// Cache dir: %APPDATA%/ds160-filler/automation-cache/
let CACHE_DIR;
try {
    const { app } = require('electron');
    CACHE_DIR = path.join(app.getPath('userData'), 'automation-cache');
} catch {
    CACHE_DIR = path.join(__dirname, '..', 'tmp', 'automation-cache');
}

const SHA_FILE = path.join(CACHE_DIR, '.last-sha');

// ============================================================
// HTTP helper (no external deps)
// ============================================================
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const opts = {
            headers: { 'User-Agent': 'DS160-Filler-AutoUpdate' }
        };
        https.get(url, opts, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpGet(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// ============================================================
// Core functions
// ============================================================

/**
 * Get the latest commit SHA for the automation directory.
 */
async function getRemoteSHA() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${REMOTE_DIR}&sha=${BRANCH}&per_page=1`;
    const json = await httpGet(url);
    const commits = JSON.parse(json);
    if (!commits.length) throw new Error('No commits found');
    return commits[0].sha;
}

/**
 * Get the locally cached SHA.
 */
function getLocalSHA() {
    try {
        if (fs.existsSync(SHA_FILE)) {
            return fs.readFileSync(SHA_FILE, 'utf-8').trim();
        }
    } catch { }
    return null;
}

/**
 * Download a single script from GitHub raw.
 */
async function downloadScript(name) {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${REMOTE_DIR}/${name}`;
    const content = await httpGet(url);
    const dest = path.join(CACHE_DIR, name);
    fs.writeFileSync(dest, content, 'utf-8');
    console.log(`[HotReload] ✅ ${name} (${(content.length / 1024).toFixed(1)}KB)`);
    return dest;
}

/**
 * Check for updates and download if needed.
 * Returns true if scripts were updated.
 */
async function checkForUpdates() {
    try {
        // Ensure cache dir exists
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }

        // Ensure node_modules symlink exists (so cached scripts can require deps)
        const cacheNodeModules = path.join(CACHE_DIR, 'node_modules');
        const sourceNodeModules = path.join(__dirname, 'node_modules');
        if (!fs.existsSync(cacheNodeModules) && fs.existsSync(sourceNodeModules)) {
            try {
                fs.symlinkSync(sourceNodeModules, cacheNodeModules, 'junction');
                console.log('[HotReload] node_modules linked to cache');
            } catch (e) {
                console.warn('[HotReload] Could not symlink node_modules:', e.message);
            }
        }

        const remoteSHA = await getRemoteSHA();
        const localSHA = getLocalSHA();

        if (remoteSHA === localSHA) {
            console.log(`[HotReload] Scripts atualizados (SHA: ${remoteSHA.slice(0, 7)})`);
            return false;
        }

        console.log(`[HotReload] 🔄 Atualizando scripts: ${(localSHA || 'nenhum').slice(0, 7)} → ${remoteSHA.slice(0, 7)}`);

        // Download all scripts
        const results = await Promise.allSettled(
            SCRIPTS.map(name => downloadScript(name))
        );

        // Check for failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`[HotReload] ⚠️ ${failures.length}/${SCRIPTS.length} scripts falharam:`,
                failures.map(f => f.reason?.message).join(', '));
        }

        // Only save SHA if at least the critical scripts succeeded
        const criticalScripts = ['filler.js', 'field-map.js'];
        const criticalOk = criticalScripts.every(name => {
            const idx = SCRIPTS.indexOf(name);
            return results[idx].status === 'fulfilled';
        });

        if (criticalOk) {
            fs.writeFileSync(SHA_FILE, remoteSHA, 'utf-8');
            console.log(`[HotReload] ✅ Atualização completa`);
            return true;
        } else {
            console.error('[HotReload] 🔴 Scripts críticos falharam — usando bundle');
            return false;
        }
    } catch (e) {
        console.warn(`[HotReload] ⚠️ Offline ou erro: ${e.message} — usando bundle`);
        return false;
    }
}

/**
 * Get the path to a module, preferring cached version.
 * Falls back to bundled version if cache not available.
 */
function getModulePath(name) {
    const cached = path.join(CACHE_DIR, name);
    if (fs.existsSync(cached)) {
        return cached;
    }
    // Fallback to bundled version
    return path.join(__dirname, name);
}

/**
 * Require a module with hot-reload support.
 * Clears Node's require cache to ensure fresh load.
 */
function hotRequire(name) {
    const modulePath = getModulePath(name);
    // Clear require cache to get fresh version
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

/**
 * Get the current automation version from version.json.
 * Returns { version, date, changelog } or null if not available.
 */
function getAutomationVersion() {
    try {
        const versionPath = getModulePath('version.json');
        if (fs.existsSync(versionPath)) {
            return JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
        }
    } catch { }
    return null;
}

module.exports = {
    checkForUpdates,
    getModulePath,
    hotRequire,
    getAutomationVersion,
    CACHE_DIR,
};
