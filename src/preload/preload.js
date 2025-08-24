const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreens: () => ipcRenderer.invoke('get-screens'),
  
  switchScreen: (screenId) => ipcRenderer.invoke('switch-screen', screenId),
  
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.invoke('set-always-on-top', alwaysOnTop),
  
  getWindowInfo: () => ipcRenderer.invoke('get-window-info'),

  // System tray functionality
  hideToTray: () => ipcRenderer.invoke('hide-to-tray'),
  
  showFromTray: () => ipcRenderer.invoke('show-from-tray'),

  // Quit application
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Shortcuts configuration
  getShortcutsConfig: () => ipcRenderer.invoke('get-shortcuts-config'),
  
  updateShortcutsConfig: (config) => ipcRenderer.invoke('update-shortcuts-config', config),
  
  onWindowBlur: (callback) => {
    const handleBlur = () => callback();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  },
  
  onWindowFocus: (callback) => {
    const handleFocus = () => callback();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  },
  
  onKeyDown: (callback) => {
    const handleKeyDown = (event) => callback(event);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  },

  platform: process.platform,
  
  version: {
    node: process.versions.node,
    electron: process.versions.electron
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('InkDraw preload script loaded');
});