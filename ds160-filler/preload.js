const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    login: (email, password) => ipcRenderer.invoke('login', email, password),
    fetchQueue: () => ipcRenderer.invoke('fetch-queue'),
    startAutomation: (captchaMode) => ipcRenderer.invoke('start-automation', captchaMode),
    stopAutomation: () => ipcRenderer.invoke('stop-automation'),
    refreshQueue: () => ipcRenderer.invoke('refresh-queue'),
    onStatus: (callback) => ipcRenderer.on('automation-status', (_, status) => callback(status))
});
