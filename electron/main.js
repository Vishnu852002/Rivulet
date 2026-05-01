const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu, MenuItem } = require('electron');
const path = require('path');
const ytdlp = require('./ytdlp');

// ESM-only electron-store — we'll use dynamic import
let store;

let mainWindow;
const isDev = !app.isPackaged;

async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    defaults: {
      downloadFolder: app.getPath('downloads'),
      theme: 'dark',
      history: [],
    },
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'Rivulet',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#8888a8',
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Basic context menu for copy/paste in inputs
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
      menu.popup(mainWindow, params.x, params.y);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  // ============ Metadata ============
  ipcMain.handle('ytdlp:fetch-metadata', async (event, url) => {
    try {
      const metadata = await ytdlp.fetchMetadata(url);
      return { success: true, data: metadata };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ============ Download ============
  ipcMain.handle('ytdlp:start-download', async (event, options) => {
    try {
      const id = ytdlp.startDownload(
        options,
        // onProgress
        (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ytdlp:download-progress', progress);
          }
        },
        // onComplete
        (result) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ytdlp:download-complete', result);
          }
          // Send Windows notification
          if (Notification.isSupported()) {
            const notif = new Notification({
              title: 'Download Complete! 🎉',
              body: options.title || 'Your download has finished',
              icon: path.join(__dirname, '..', 'build', 'icon.png'),
            });
            notif.on('click', () => {
              if (result.filePath) {
                shell.showItemInFolder(result.filePath);
              }
            });
            notif.show();
          }
        },
        // onError
        (error) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ytdlp:download-error', error);
          }
        }
      );
      return { success: true, processId: id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ytdlp:cancel-download', async (event, id) => {
    return ytdlp.cancelDownload(id);
  });

  // ============ yt-dlp management ============
  ipcMain.handle('ytdlp:get-version', async () => {
    try {
      const version = await ytdlp.getVersion();
      return { success: true, version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ytdlp:check-update', async () => {
    try {
      const result = await ytdlp.checkForUpdate();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ytdlp:perform-update', async (event, downloadUrl) => {
    try {
      await ytdlp.downloadUpdate(downloadUrl);
      const version = await ytdlp.getVersion();
      return { success: true, version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ============ Store ============
  ipcMain.handle('store:get', async (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store:set', async (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // ============ Dialog ============
  ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Choose Download Folder',
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('dialog:select-save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Video As...',
      defaultPath: options.defaultPath,
      filters: options.filters || [],
    });
    if (!result.canceled) {
      return result.filePath;
    }
    return null;
  });

  // ============ Shell ============
  ipcMain.handle('shell:open-path', async (event, filePath) => {
    return shell.openPath(filePath);
  });

  ipcMain.handle('shell:show-item', async (event, filePath) => {
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('shell:open-external', async (event, url) => {
    shell.openExternal(url);
    return true;
  });
}

// ============ App Lifecycle ============
app.whenReady().then(async () => {
  await initStore();
  setupIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  ytdlp.killAll();
  app.quit();
});

app.on('before-quit', () => {
  ytdlp.killAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
