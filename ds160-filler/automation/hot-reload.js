// ============================================================
// HOT-RELOAD — Auto-update automation scripts from GitHub
// Downloads latest scripts directly to __dirname (no cache)
// ============================================================
const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_OWNER = 'viniciussouzax';
const REPO_NAME = 'visa';
const BRANCH = 'main';
const REMOTE_DIR = 'ds160-filler/automation';
const SCRIPTS = ['filler.js', 'field-map.js', 'queue.js', 'captcha.js', 'version.json'];

const SHA_FILE = path.join(__dirname, '.last-sha');

// ============================================================
// HTTP helper (no external deps)
// ============================================================
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const opts = {
            headers: { 'User-Agent': 'DS160-Filler-AutoUpdate' }
        };
        https.get(url, opts, (res) => {
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

async function getRemoteSHA() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${REMOTE_DIR}&sha=${BRANCH}&per_page=1`;
    const json = await httpGet(url);
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

async function downloadScript(name) {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${REMOTE_DIR}/${name}`;
    const content = await httpGet(url);
    const dest = path.join(__dirname, name);
    fs.writeFileSync(dest, content, 'utf-8');
    console.log(`[HotReload] Updated ${name} (${(content.length / 1024).toFixed(1)}KB)`);
    return dest;
}

async function checkForUpdates() {
    try {
        const remoteSHA = await getRemoteSHA();
        const localSHA = getLocalSHA();

        if (remoteSHA === localSHA) {
            console.log(`[HotReload] Scripts up to date (SHA: ${remoteSHA.slice(0, 7)})`);
            return false;
        }

        console.log(`[HotReload] Updating: ${(localSHA || 'none').slice(0, 7)} -> ${remoteSHA.slice(0, 7)}`);

        const results = await Promise.allSettled(
            SCRIPTS.map(name => downloadScript(name))
        );

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`[HotReload] ${failures.length}/${SCRIPTS.length} failed:`,
                failures.map(f => f.reason?.message).join(', '));
        }

        const criticalScripts = ['filler.js', 'field-map.js'];
        const criticalOk = criticalScripts.every(name => {
            const idx = SCRIPTS.indexOf(name);
            return results[idx].status === 'fulfilled';
        });

        if (criticalOk) {
            fs.writeFileSync(SHA_FILE, remoteSHA, 'utf-8');
            console.log('[HotReload] Update complete');
            return true;
        } else {
            console.error('[HotReload] Critical scripts failed');
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
