const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let currentScreen = null;
let isAlwaysOnTop = true;

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.workArea;
  
  currentScreen = primaryDisplay;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../preload/preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('blur', () => {
    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(false);
    }
  });

  mainWindow.on('focus', () => {
    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-screens', () => {
  const displays = screen.getAllDisplays();
  return displays.map((display, index) => ({
    id: display.id,
    label: `Monitor ${index + 1} (${display.bounds.width}x${display.bounds.height})`,
    bounds: display.bounds,
    workArea: display.workArea,
    isPrimary: display.bounds.x === 0 && display.bounds.y === 0
  }));
});

ipcMain.handle('switch-screen', (event, screenId) => {
  if (!mainWindow) return false;

  const displays = screen.getAllDisplays();
  const targetDisplay = displays.find(display => display.id === screenId);
  
  if (!targetDisplay) return false;

  const { width, height, x, y } = targetDisplay.workArea;
  
  mainWindow.setBounds({
    x,
    y,
    width,
    height
  });

  currentScreen = targetDisplay;
  return true;
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('set-always-on-top', (event, alwaysOnTop) => {
  if (!mainWindow) return false;
  
  isAlwaysOnTop = alwaysOnTop;
  mainWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
  return true;
});

ipcMain.handle('get-window-info', () => {
  if (!mainWindow) return null;
  
  return {
    bounds: mainWindow.getBounds(),
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
    isMinimized: mainWindow.isMinimized(),
    isFocused: mainWindow.isFocused(),
    currentScreenId: currentScreen ? currentScreen.id : null
  };
});

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('closed');
    mainWindow.close();
  }
});

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '../../node_modules/.bin/electron'),
    hardResetMethod: 'exit'
  });
}