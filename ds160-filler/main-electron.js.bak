const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

// Session file for persistent login (lazy — app.getPath only works after 'ready')
let _sessionFile;
function getSessionFile() {
    if (!_sessionFile) _sessionFile = path.join(app.getPath('userData'), 'session.json');
    return _sessionFile;
}

function saveSession(email, password) {
    fs.writeFileSync(getSessionFile(), JSON.stringify({ email, password }), 'utf-8');
}

function loadSession() {
    try {
        if (fs.existsSync(getSessionFile())) {
            return JSON.parse(fs.readFileSync(getSessionFile(), 'utf-8'));
        }
    } catch { }
    return null;
}

function clearSession() {
    try { fs.unlinkSync(getSessionFile()); } catch { }
}

let mainWindow;
let automationRunner;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 520,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile('renderer/index.html');
    mainWindow.setMenuBarVisibility(false);

    // ============================================================
    // AUTO-UPDATE — smart checker with 5min cooldown
    // ============================================================
    const UPDATE_COOLDOWN = 5 * 60 * 1000; // 5 minutes
    let lastUpdateCheck = 0;

    if (app.isPackaged) {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('update-available', (info) => {
            mainWindow?.webContents.send('update-status', {
                type: 'available',
                version: info.version
            });
        });

        autoUpdater.on('download-progress', (progress) => {
            mainWindow?.webContents.send('update-status', {
                type: 'progress',
                percent: Math.round(progress.percent)
            });
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log(`[Update] v${info.version} baixada — reiniciando automaticamente em 3s...`);
            mainWindow?.webContents.send('update-status', {
                type: 'downloaded',
                version: info.version
            });

            // Auto-restart after 3s (allow UI to show notification)
            setTimeout(async () => {
                // Stop automation gracefully before restart
                if (automationRunner) {
                    try { await automationRunner.stop(); } catch { }
                }
                autoUpdater.quitAndInstall(false, true);
            }, 3000);
        });

        autoUpdater.on('error', (err) => {
            console.log('Auto-update error:', err.message);
        });

        global.smartCheckForUpdates = () => {
            const now = Date.now();
            if (now - lastUpdateCheck < UPDATE_COOLDOWN) return;
            lastUpdateCheck = now;
            console.log('[Update] Checking for updates...');
            autoUpdater.checkForUpdatesAndNotify().catch(() => { });

            // Also run hot-reload for scripts + renderer
            const { checkForUpdates } = require('./automation/hot-reload');
            checkForUpdates().then(result => {
                if (result && result.renderer && result.renderer.updated) {
                    console.log('[Update] Renderer atualizado — recarregando janela...');
                    mainWindow?.webContents.reload();
                }
            }).catch(() => { });
        };

        // Check on startup
        global.smartCheckForUpdates();
    } else {
        // DEV MODE: git pull + auto-restart if automation files changed
        const { execSync } = require('child_process');
        const repoDir = path.join(__dirname, '..');
        const GIT_CHECK_COOLDOWN = 60 * 1000; // 1 minute

        console.log(`[AutoUpdate] DEV MODE ativo — repoDir: ${repoDir}`);

        global.smartCheckForUpdates = () => {
            const now = Date.now();
            if (now - lastUpdateCheck < GIT_CHECK_COOLDOWN) return;
            lastUpdateCheck = now;
            console.log('[AutoUpdate] Verificando atualizações...');

            try {
                // Fetch remote changes (git sends progress to stderr, that's OK)
                try {
                    execSync('git fetch origin main', { cwd: repoDir, stdio: 'pipe', timeout: 15000 });
                } catch (fetchErr) {
                    // git fetch sends info to stderr, check if it's a real error
                    const stderr = fetchErr.stderr?.toString() || '';
                    if (stderr.includes('fatal') || stderr.includes('error')) {
                        console.warn('[AutoUpdate] git fetch falhou:', stderr);
                        return;
                    }
                    // Non-fatal stderr (e.g. "From https://..." ) is OK
                }
                console.log('[AutoUpdate] git fetch OK');

                // Check if there are differences between local and remote
                let diff = '';
                try {
                    diff = execSync('git diff HEAD origin/main --name-only', {
                        cwd: repoDir, encoding: 'utf-8', timeout: 10000
                    }).trim();
                } catch (diffErr) {
                    console.warn('[AutoUpdate] git diff falhou:', diffErr.message);
                    return;
                }

                if (!diff) {
                    console.log('[AutoUpdate] Nenhuma atualização disponível');
                    return;
                }

                console.log('[AutoUpdate] Arquivos alterados:', diff);

                // Save HEAD before pull to detect if pull actually brought new code
                let headBefore = '';
                try {
                    headBefore = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf-8', timeout: 5000 }).trim();
                } catch { }

                // Pull changes
                try {
                    execSync('git pull origin main --ff-only', { cwd: repoDir, stdio: 'pipe', timeout: 30000 });
                } catch (pullErr) {
                    const stderr = pullErr.stderr?.toString() || '';
                    if (stderr.includes('fatal') || stderr.includes('error') || stderr.includes('CONFLICT')) {
                        console.warn('[AutoUpdate] git pull falhou:', stderr);
                        return;
                    }
                }
                console.log('[AutoUpdate] ✅ Git pull concluído');

                // Check if HEAD actually changed (pull brought new code)
                let headAfter = '';
                try {
                    headAfter = execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf-8', timeout: 5000 }).trim();
                } catch { }

                if (headBefore && headAfter && headBefore === headAfter) {
                    // HEAD didn't change — pull didn't bring new code (we're ahead of remote or already up-to-date)
                    console.log('[AutoUpdate] HEAD não mudou após pull — nenhum código novo recebido, sem restart');
                    return;
                }

                // Check if automation-critical files changed
                const automationFiles = diff.split('\n').filter(f =>
                    f.includes('automation/') || f.includes('main.js') || f.includes('field-map')
                );
                // Check if renderer files changed
                const rendererFiles = diff.split('\n').filter(f =>
                    f.includes('renderer/')
                );

                if (automationFiles.length > 0) {
                    console.log('[AutoUpdate] 🔄 Arquivos de automação alterados — reiniciando app...');
                    console.log('[AutoUpdate] Arquivos:', automationFiles.join(', '));
                    mainWindow?.webContents.send('automation-status', {
                        type: 'updating', message: 'Atualização detectada — reiniciando...'
                    });

                    // Stop automation gracefully
                    if (automationRunner) {
                        automationRunner.stop().catch(() => { });
                    }

                    // Relaunch after brief delay (let UI update)
                    setTimeout(() => {
                        app.relaunch();
                        app.exit(0);
                    }, 2000);
                } else if (rendererFiles.length > 0) {
                    console.log('[AutoUpdate] 🖥️ Renderer atualizado — recarregando janela...');
                    mainWindow?.webContents.reload();
                } else {
                    console.log('[AutoUpdate] Apenas arquivos não-críticos alterados, sem restart necessário');
                }
            } catch (e) {
                console.warn('[AutoUpdate] Erro no check:', e.message);
                if (e.stderr) console.warn('[AutoUpdate] stderr:', e.stderr.toString());
            }
        };

        // Check on startup (delayed 5s)
        setTimeout(() => {
            console.log('[AutoUpdate] Startup check...');
            global.smartCheckForUpdates();
        }, 5000);

        // Periodic check every minute
        setInterval(() => global.smartCheckForUpdates(), GIT_CHECK_COOLDOWN);
    }

    // Expose software version globally for error logs
    global.softwareVersion = require('./package.json').version;
});

app.on('window-all-closed', () => {
    if (automationRunner) automationRunner.stop();
    app.quit();
});

// ============================================================
// IPC HANDLERS
// ============================================================
ipcMain.handle('login', async (_, email, password) => {
    try {
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        global.supabaseClient = sb;
        saveSession(email, password);

        // Auto-start automation immediately after login
        startAutomation();

        return { success: true, user: data.user.email };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-saved-session', async () => {
    return loadSession();
});

ipcMain.handle('logout', async () => {
    clearSession();
    if (automationRunner) {
        await automationRunner.stop();
        automationRunner = null;
    }
    return { success: true };
});

ipcMain.handle('fetch-queue', async () => {
    if (!global.supabaseClient) return { success: false, error: 'Não conectado' };
    try {
        // Get current user's company_id
        const { data: { user } } = await global.supabaseClient.auth.getUser();
        let companyId = null;
        if (user) {
            const { data: member } = await global.supabaseClient
                .from('members').select('company_id').eq('user_id', user.id).single();
            if (member) companyId = member.company_id;
        }

        // Find applicants with pipeline_status in ['approved', 'doing']
        let query = global.supabaseClient
            .from('applicants')
            .select('id, full_name, pipeline_status')
            .in('pipeline_status', ['approved', 'doing']);
        if (companyId) query = query.eq('company_id', companyId);
        query = query.order('fill_priority', { ascending: false })
            .order('sort_order', { ascending: true })
            .order('updated_at', { ascending: true });
        const { data: applicants } = await query;

        if (!applicants || applicants.length === 0) {
            return { success: true, queue: [] };
        }

        // Get their applications
        const ids = applicants.map(a => a.id);
        const { data: apps } = await global.supabaseClient
            .from('applications')
            .select('id, applicant_id, fill_status')
            .in('applicant_id', ids)
            .neq('fill_status', 'filled');

        // Merge applicant name into app data
        const queue = (apps || []).map(app => {
            const applicant = applicants.find(a => a.id === app.applicant_id);
            return { ...app, applicants: { full_name: applicant?.full_name || '—' } };
        });

        return { success: true, queue };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('refresh-queue', async () => {
    if (automationRunner) {
        automationRunner.triggerNow();
        return { success: true };
    }
    return { success: false, error: 'Automação não iniciada' };
});

ipcMain.handle('force-update-restart', async () => {
    try {
        console.log('[Update] Force update requested by user');
        mainWindow?.webContents.send('update-status', { type: 'checking' });

        // Stop automation first
        if (automationRunner) {
            try { await automationRunner.stop(); } catch { }
            automationRunner = null;
        }

        if (app.isPackaged) {
            // Prod: check for electron-updater updates and install if available
            const { autoUpdater } = require('electron-updater');
            const result = await autoUpdater.checkForUpdates().catch(() => null);
            if (result?.updateInfo) {
                mainWindow?.webContents.send('update-status', {
                    type: 'available',
                    version: result.updateInfo.version
                });
                // Download will trigger auto-install via update-downloaded handler
                return { success: true, message: 'Atualização encontrada, baixando...' };
            } else {
                // No update available — just restart
                app.relaunch();
                app.exit(0);
                return { success: true, message: 'Nenhuma atualização — reiniciando...' };
            }
        } else {
            // Dev: force hot-reload and restart
            const { checkForUpdates } = require('./automation/hot-reload');
            const updated = await checkForUpdates();
            console.log(`[Update] Hot-reload result: ${updated ? 'scripts atualizados' : 'já atualizado'}`);
            app.relaunch();
            app.exit(0);
            return { success: true, message: updated ? 'Scripts atualizados — reiniciando...' : 'Reiniciando...' };
        }
    } catch (e) {
        console.error('[Update] Force update failed:', e.message);
        return { success: false, error: e.message };
    }
});

// ============================================================
// AUTO-START AUTOMATION (direct require, no cache)
// ============================================================
async function startAutomation() {
    try {
        console.log('[Main] Starting automation...');
        const { QueueRunner } = require('./automation/queue');
        automationRunner = new QueueRunner(global.supabaseClient, null);
        automationRunner.start((status) => {
            mainWindow?.webContents.send('automation-status', status);
        });
        console.log('[Main] Automation started successfully');
    } catch (e) {
        console.error('[Main] Failed to start automation:', e);
    }
}
