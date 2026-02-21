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
    // AUTO-UPDATE — checks GitHub Releases for new versions
    // ============================================================
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

        // Check on startup
        autoUpdater.checkForUpdatesAndNotify().catch(() => { });

        // Expose for queue cycle checks
        global.checkForUpdates = () => {
            autoUpdater.checkForUpdatesAndNotify().catch(() => { });
        };
    } else {
        global.checkForUpdates = () => { }; // no-op in dev
    }
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
        const { data, error } = await global.supabaseClient
            .from('applications')
            .select('id, applicant_id, fill_status, applicants(full_name)')
            .in('fill_status', ['queued', 'filling'])
            .order('fill_priority', { ascending: true });

        if (error) return { success: false, error: error.message };
        return { success: true, queue: data || [] };
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
// AUTO-START AUTOMATION
// ============================================================
function startAutomation() {
    try {
        const { QueueRunner } = require('./automation/queue');
        automationRunner = new QueueRunner(global.supabaseClient, null);
        automationRunner.start((status) => {
            mainWindow?.webContents.send('automation-status', status);
        });
    } catch (e) {
        console.error('Failed to start automation:', e);
    }
}
