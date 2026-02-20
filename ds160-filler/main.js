const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 520,
        resizable: false,
        icon: path.join(__dirname, 'renderer', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ============================================================
// IPC HANDLERS — bridge between renderer and automation
// ============================================================

let automationRunner = null;

ipcMain.handle('login', async (_, email, password) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            'https://zcpvknzktfmotvrybxdf.supabase.co',
            // Publishable key — safe for client
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg'
        );
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        // Store supabase client for later use
        global.supabaseClient = supabase;
        global.userId = data.user.id;

        return { success: true, user: data.user.email };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('fetch-queue', async () => {
    try {
        const supabase = global.supabaseClient;
        if (!supabase) return { success: false, error: 'Não autenticado' };

        const { data, error } = await supabase
            .from('applications')
            .select('id, applicant_id, fill_status, fill_priority, fill_queued_at, applicants(full_name)')
            .eq('fill_status', 'queued')
            .order('fill_priority', { ascending: true })
            .order('fill_queued_at', { ascending: true });

        if (error) return { success: false, error: error.message };
        return { success: true, queue: data || [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('start-automation', async (_, captchaMode) => {
    try {
        const { QueueRunner } = require('./automation/queue');
        automationRunner = new QueueRunner(global.supabaseClient, captchaMode);
        automationRunner.start((status) => {
            mainWindow?.webContents.send('automation-status', status);
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('stop-automation', async () => {
    if (automationRunner) {
        await automationRunner.stop();
        automationRunner = null;
    }
    return { success: true };
});

ipcMain.handle('refresh-queue', async () => {
    if (automationRunner) {
        automationRunner.triggerNow();
        return { success: true };
    }
    return { success: false, error: 'Automação não iniciada' };
});
