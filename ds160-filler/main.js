const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';

// Session file for persistent login
const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');

function saveSession(email, password) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({ email, password }), 'utf-8');
}

function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        }
    } catch { }
    return null;
}

function clearSession() {
    try { fs.unlinkSync(SESSION_FILE); } catch { }
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
            mainWindow?.webContents.send('update-status', {
                type: 'downloaded',
                version: info.version
            });
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
        };

        // Check on startup
        global.smartCheckForUpdates();
    } else {
        global.smartCheckForUpdates = () => { }; // no-op in dev
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
        // Find applicants with pipeline_status in ['approved', 'doing']
        const { data: applicants } = await global.supabaseClient
            .from('applicants')
            .select('id, full_name, pipeline_status')
            .in('pipeline_status', ['approved', 'doing'])
            .order('updated_at', { ascending: true });

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
