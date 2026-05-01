const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Metadata
  fetchMetadata: (url) => ipcRenderer.invoke('ytdlp:fetch-metadata', url),

  // Download
  startDownload: (options) => ipcRenderer.invoke('ytdlp:start-download', options),
  cancelDownload: (id) => ipcRenderer.invoke('ytdlp:cancel-download', id),
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ytdlp:download-progress', handler);
    return () => ipcRenderer.removeListener('ytdlp:download-progress', handler);
  },
  onDownloadComplete: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ytdlp:download-complete', handler);
    return () => ipcRenderer.removeListener('ytdlp:download-complete', handler);
  },
  onDownloadError: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('ytdlp:download-error', handler);
    return () => ipcRenderer.removeListener('ytdlp:download-error', handler);
  },

  // yt-dlp management
  getYtdlpVersion: () => ipcRenderer.invoke('ytdlp:get-version'),
  checkForUpdate: () => ipcRenderer.invoke('ytdlp:check-update'),
  performUpdate: (downloadUrl) => ipcRenderer.invoke('ytdlp:perform-update', downloadUrl),

  // Store (preferences)
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),

  // Dialog
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  selectSaveFile: (options) => ipcRenderer.invoke('dialog:select-save-file', options),

  // Shell
  openPath: (filePath) => ipcRenderer.invoke('shell:open-path', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:show-item', filePath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  
  // Clipboard
  readClipboard: () => clipboard.readText(),
});
