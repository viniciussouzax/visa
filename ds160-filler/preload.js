const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    login: (email, password) => ipcRenderer.invoke('login', email, password),
    getSavedSession: () => ipcRenderer.invoke('get-saved-session'),
    logout: () => ipcRenderer.invoke('logout'),
    fetchQueue: () => ipcRenderer.invoke('fetch-queue'),
    refreshQueue: () => ipcRenderer.invoke('refresh-queue'),
    forceUpdateRestart: () => ipcRenderer.invoke('force-update-restart'),
    onStatus: (callback) => ipcRenderer.on('automation-status', (_, status) => callback(status)),
    onUpdate: (callback) => ipcRenderer.on('update-status', (_, status) => callback(status))
});
