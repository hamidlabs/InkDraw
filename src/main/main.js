const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let currentScreen = null;
let isAlwaysOnTop = true;
let tray = null;
let isQuitting = false;

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is running, quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS = {
  hideToTray: 'CommandOrControl+Shift+H',
  showFromTray: 'CommandOrControl+Shift+S'
};

// Configuration file path
const CONFIG_PATH = path.join(app.getPath('userData'), 'shortcuts-config.json');

// Load shortcuts configuration
const loadShortcutsConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_SHORTCUTS, ...config };
    }
  } catch (error) {
    console.error('Error loading shortcuts config:', error);
  }
  return DEFAULT_SHORTCUTS;
};

// Save shortcuts configuration
const saveShortcutsConfig = (config) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving shortcuts config:', error);
    return false;
  }
};

let shortcutsConfig = loadShortcutsConfig();

// Create system tray
const createTray = () => {
  // Use the custom icon from build/icon.png
  const iconPath = path.join(__dirname, '../../build/icon.png');
  let trayIcon;
  
  try {
    // Load the custom icon and resize it for system tray
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      console.warn('Custom icon not found, using default');
      // Fallback to simple icon if custom icon fails
      const iconData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF,
        0x61, 0x00, 0x00, 0x00, 0x4A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x64, 0x60, 0x60, 0x60,
        0x64, 0x00, 0x01, 0x46, 0x06, 0x06, 0x06, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18,
        0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86,
        0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61,
        0x18, 0x86, 0x61, 0x18, 0x86, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
        0x60, 0x82
      ]);
      trayIcon = nativeImage.createFromBuffer(iconData);
    } else {
      // Resize the icon for tray (16x16 or 32x32 depending on system)
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
  } catch (error) {
    console.error('Error loading tray icon:', error);
    // Fallback to simple icon
    const iconData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0xF3, 0xFF,
      0x61, 0x00, 0x00, 0x00, 0x4A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x64, 0x60, 0x60, 0x60,
      0x64, 0x00, 0x01, 0x46, 0x06, 0x06, 0x06, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18,
      0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86,
      0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61, 0x18, 0x86, 0x61,
      0x18, 0x86, 0x61, 0x18, 0x86, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
      0x60, 0x82
    ]);
    trayIcon = nativeImage.createFromBuffer(iconData);
  }
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show InkDraw',
      click: showFromTray
    },
    {
      label: 'Hide to Tray',
      click: hideToTray
    },
    { type: 'separator' },
    {
      label: 'Shortcuts Configuration',
      submenu: [
        {
          label: `Hide to Tray: ${shortcutsConfig.hideToTray}`,
          enabled: false
        },
        {
          label: `Show from Tray: ${shortcutsConfig.showFromTray}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Reset to Defaults',
          click: resetShortcutsToDefaults
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('InkDraw - Drawing & Annotation Tool');
  tray.setContextMenu(contextMenu);
  
  // Double-click tray icon to show/hide window
  tray.on('double-click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      hideToTray();
    } else {
      showFromTray();
    }
  });
};

// Hide window to system tray
const hideToTray = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
    
    // On macOS, we might want to show a notification
    if (process.platform === 'darwin') {
      app.dock.hide();
    }
  }
};

// Show window from system tray
const showFromTray = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    
    // On macOS, show the dock icon
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  } else if (!mainWindow) {
    createWindow();
  }
};

// Register global shortcuts
const registerGlobalShortcuts = () => {
  // Unregister existing shortcuts
  globalShortcut.unregisterAll();
  
  // Register hide to tray shortcut
  if (shortcutsConfig.hideToTray) {
    try {
      globalShortcut.register(shortcutsConfig.hideToTray, hideToTray);
    } catch (error) {
      console.error('Failed to register hideToTray shortcut:', error);
    }
  }
  
  // Register show from tray shortcut
  if (shortcutsConfig.showFromTray) {
    try {
      globalShortcut.register(shortcutsConfig.showFromTray, showFromTray);
    } catch (error) {
      console.error('Failed to register showFromTray shortcut:', error);
    }
  }
};

// Reset shortcuts to defaults
const resetShortcutsToDefaults = () => {
  shortcutsConfig = { ...DEFAULT_SHORTCUTS };
  saveShortcutsConfig(shortcutsConfig);
  registerGlobalShortcuts();
  
  // Recreate tray to update menu
  if (tray) {
    tray.destroy();
    createTray();
  }
};

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
    transparent: true,
    backgroundColor: '#00000000',
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

  // Modify close behavior to hide to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideToTray();
    } else {
      // When quitting, ensure proper cleanup
      console.log('Window closing for app quit...');
      if (!mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.destroy();
      }
    }
  });

  mainWindow.on('closed', () => {
    console.log('Window closed event');
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      showFromTray();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  // Don't quit the app when all windows are closed, keep running in tray
  // The user can quit via the tray context menu
  if (process.platform !== 'darwin' && isQuitting) {
    console.log('Quitting app after all windows closed');
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

// Handle shortcut configuration
ipcMain.handle('get-shortcuts-config', () => {
  return shortcutsConfig;
});

ipcMain.handle('update-shortcuts-config', (event, newConfig) => {
  try {
    // Validate shortcut format
    const validatedConfig = {};
    for (const [key, value] of Object.entries(newConfig)) {
      if (typeof value === 'string' && value.trim()) {
        validatedConfig[key] = value.trim();
      }
    }
    
    shortcutsConfig = { ...shortcutsConfig, ...validatedConfig };
    const saved = saveShortcutsConfig(shortcutsConfig);
    
    if (saved) {
      registerGlobalShortcuts();
      
      // Update tray menu
      if (tray) {
        tray.destroy();
        createTray();
      }
      
      return { success: true, config: shortcutsConfig };
    }
    
    return { success: false, error: 'Failed to save configuration' };
  } catch (error) {
    console.error('Error updating shortcuts config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hide-to-tray', () => {
  hideToTray();
  return true;
});

ipcMain.handle('show-from-tray', () => {
  showFromTray();
  return true;
});

app.on('before-quit', (event) => {
  console.log('App before-quit event triggered');
  isQuitting = true;
  
  // Force close all renderer processes to release database locks
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Closing main window...');
    mainWindow.removeAllListeners('closed');
    mainWindow.webContents.closeDevTools();
    
    // Force close the renderer process
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.destroy();
    }
    
    mainWindow.destroy();
    mainWindow = null;
  }
  
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  
  // Destroy tray
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  console.log('Cleanup completed');
});

app.on('will-quit', (event) => {
  console.log('App will-quit event triggered');
  
  // Ensure everything is cleaned up
  if (mainWindow && !mainWindow.isDestroyed()) {
    event.preventDefault();
    mainWindow.destroy();
    mainWindow = null;
    setTimeout(() => {
      app.quit();
    }, 100);
  }
});

// Handle process termination signals
const cleanup = () => {
  console.log('Process cleanup initiated');
  isQuitting = true;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('Force destroying window in cleanup');
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.destroy();
    }
    mainWindow.destroy();
    mainWindow = null;
  }
  
  globalShortcut.unregisterAll();
  
  if (tray) {
    tray.destroy();
    tray = null;
  }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
  process.exit(1);
});

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '../../node_modules/.bin/electron'),
    hardResetMethod: 'exit'
  });
}