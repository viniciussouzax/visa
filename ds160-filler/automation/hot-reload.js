// ============================================================
// HOT-RELOAD — Auto-update automation + renderer from GitHub
// Downloads latest scripts directly (no cache)
// ============================================================
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'viniciussouzax';
const REPO_NAME = 'visa';
const BRANCH = 'main';

// Groups of files to update
// NOTE: Only automation files are updated via hot-reload.
// The renderer (index.html, renderer.js) is bundled with the WebView
// and cannot be updated at runtime in production.
const GROUPS = [
    {
        name: 'automation',
        remoteDir: 'ds160-filler/automation',
        localDir: __dirname,
        files: ['filler.js', 'field-map.js', 'queue.js', 'captcha.js', 'version.json'],
        critical: ['filler.js', 'field-map.js'],
    },
];

// Legacy compat
const SCRIPTS = GROUPS[0].files;
const REMOTE_DIR = GROUPS[0].remoteDir;

const SHA_FILE = path.join(__dirname, '.last-sha');

// ============================================================
// HTTP helper (no external deps) — with ETag caching for rate limit
// ============================================================
const etagCache = {}; // url → { etag, data }

function httpGet(url, useEtag = false) {
    return new Promise((resolve, reject) => {
        const opts = {
            headers: { 'User-Agent': 'DS160-Filler-AutoUpdate' }
        };
        // ROB-1: Use If-None-Match to avoid consuming rate limit
        if (useEtag && etagCache[url]?.etag) {
            opts.headers['If-None-Match'] = etagCache[url].etag;
        }
        https.get(url, opts, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpGet(res.headers.location, useEtag).then(resolve).catch(reject);
            }
            // 304 Not Modified — return cached data
            if (res.statusCode === 304 && etagCache[url]?.data) {
                res.resume(); // drain response
                return resolve(etagCache[url].data);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Cache ETag for future requests
                if (useEtag && res.headers.etag) {
                    etagCache[url] = { etag: res.headers.etag, data };
                }
                resolve(data);
            });
        }).on('error', reject);
    });
}

// ============================================================
// Core functions
// ============================================================

async function getRemoteSHA() {
    // Check commits on the entire ds160-filler directory
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=ds160-filler&sha=${BRANCH}&per_page=1`;
    const json = await httpGet(url, true); // Use ETag caching to reduce rate limit
    const commits = JSON.parse(json);
    if (!commits.length) throw new Error('No commits found');
    return commits[0].sha;
}

function getLocalSHA() {
    try {
        if (fs.existsSync(SHA_FILE)) {
            return fs.readFileSync(SHA_FILE, 'utf-8').trim();
        }
    } catch { }
    return null;
}

async function downloadFile(remoteDir, localDir, name) {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${remoteDir}/${name}`;
    const content = await httpGet(url);

    // ROB-2: Validate downloaded content is not HTML error page
    const trimmed = content.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
        throw new Error(`Downloaded HTML instead of JS for ${name} — possible 404/403`);
    }
    // For .js files, check it looks like valid JavaScript
    if (name.endsWith('.js') && content.length < 50) {
        throw new Error(`Downloaded content too small for ${name} (${content.length} bytes) — possible error`);
    }

    // Ensure local directory exists
    if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
    }
    const dest = path.join(localDir, name);
    fs.writeFileSync(dest, content, 'utf-8');
    console.log(`[HotReload] Updated ${remoteDir}/${name} (${(content.length / 1024).toFixed(1)}KB)`);
    return dest;
}

// Legacy compat wrapper
async function downloadScript(name) {
    return downloadFile(REMOTE_DIR, __dirname, name);
}

async function checkForUpdates() {
    try {
        const remoteSHA = await getRemoteSHA();
        const localSHA = getLocalSHA();

        if (remoteSHA === localSHA) {
            console.log(`[HotReload] All up to date (SHA: ${remoteSHA.slice(0, 7)})`);
            return false;
        }

        console.log(`[HotReload] Updating: ${(localSHA || 'none').slice(0, 7)} -> ${remoteSHA.slice(0, 7)}`);

        const updatedGroups = {};
        let allCriticalOk = true;

        for (const group of GROUPS) {
            const results = await Promise.allSettled(
                group.files.map(name => downloadFile(group.remoteDir, group.localDir, name))
            );

            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                console.warn(`[HotReload] ${group.name}: ${failures.length}/${group.files.length} failed:`,
                    failures.map(f => f.reason?.message).join(', '));
            }

            const criticalOk = group.critical.every(name => {
                const idx = group.files.indexOf(name);
                return results[idx].status === 'fulfilled';
            });

            updatedGroups[group.name] = {
                updated: results.some(r => r.status === 'fulfilled'),
                criticalOk,
            };

            if (!criticalOk) allCriticalOk = false;
        }

        if (allCriticalOk) {
            fs.writeFileSync(SHA_FILE, remoteSHA, 'utf-8');
            console.log('[HotReload] Update complete');
            // Return object with detail of what was updated
            return updatedGroups;
        } else {
            console.error('[HotReload] Critical scripts failed — SHA not saved');
            return false;
        }
    } catch (e) {
        console.warn(`[HotReload] Offline or error: ${e.message}`);
        return false;
    }
}

function hotRequire(name) {
    const modulePath = path.join(__dirname, name);
    delete require.cache[require.resolve(modulePath)];
    return require(modulePath);
}

function getAutomationVersion() {
    try {
        const versionPath = path.join(__dirname, 'version.json');
        if (fs.existsSync(versionPath)) {
            return JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
        }
    } catch { }
    return null;
}

module.exports = {
    checkForUpdates,
    hotRequire,
    getAutomationVersion,
};
