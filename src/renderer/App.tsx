import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, TLUiComponents, DefaultStylePanel, DefaultToolbar, DefaultToolbarContent } from 'tldraw';
import 'tldraw/tldraw.css';
import './App.css';

interface ShortcutsConfig {
  hideToTray: string;
  showFromTray: string;
}

// Shortcut Configuration Modal Component
const ShortcutConfigModal = ({ isOpen, onClose, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ShortcutsConfig) => void;
}) => {
  const [config, setConfig] = useState<ShortcutsConfig>({ hideToTray: '', showFromTray: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    try {
      const currentConfig = await window.electronAPI.getShortcutsConfig();
      setConfig(currentConfig);
      setError(null);
    } catch (err) {
      setError('Failed to load current shortcuts configuration');
      console.error('Error loading shortcuts config:', err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.updateShortcutsConfig(config);
      if (result.success) {
        onSave(result.config);
        onClose();
      } else {
        setError(result.error || 'Failed to save shortcuts configuration');
      }
    } catch (err) {
      setError('Failed to save shortcuts configuration');
      console.error('Error saving shortcuts config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ShortcutsConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const validateShortcut = (shortcut: string): boolean => {
    // Basic validation for shortcut format
    const validModifiers = ['Ctrl', 'Command', 'CommandOrControl', 'Alt', 'Shift', 'Meta'];
    const parts = shortcut.split('+');
    return parts.length >= 2 && parts.some(part => validModifiers.includes(part));
  };

  if (!isOpen) return null;

  return (
    <div className="shortcut-modal-overlay">
      <div className="shortcut-modal">
        <div className="shortcut-modal-header">
          <h2>Configure Shortcuts</h2>
          <button className="shortcut-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="shortcut-modal-content">
          {error && <div className="shortcut-error">{error}</div>}
          
          <div className="shortcut-field">
            <label htmlFor="hideToTray">Hide to System Tray:</label>
            <input
              id="hideToTray"
              type="text"
              value={config.hideToTray}
              onChange={(e) => handleInputChange('hideToTray', e.target.value)}
              placeholder="e.g., CommandOrControl+Shift+H"
              className={!validateShortcut(config.hideToTray) && config.hideToTray ? 'invalid' : ''}
            />
            <small>Use CommandOrControl for cross-platform compatibility</small>
          </div>

          <div className="shortcut-field">
            <label htmlFor="showFromTray">Show from System Tray:</label>
            <input
              id="showFromTray"
              type="text"
              value={config.showFromTray}
              onChange={(e) => handleInputChange('showFromTray', e.target.value)}
              placeholder="e.g., CommandOrControl+Shift+S"
              className={!validateShortcut(config.showFromTray) && config.showFromTray ? 'invalid' : ''}
            />
            <small>Use CommandOrControl for cross-platform compatibility</small>
          </div>

          <div className="shortcut-help">
            <h4>Available Modifiers:</h4>
            <ul>
              <li><strong>CommandOrControl</strong> - Ctrl on Windows/Linux, Cmd on macOS</li>
              <li><strong>Ctrl</strong> - Control key</li>
              <li><strong>Shift</strong> - Shift key</li>
              <li><strong>Alt</strong> - Alt key (Option on macOS)</li>
              <li><strong>Meta</strong> - Windows key / Cmd key</li>
            </ul>
            <p>Combine with regular keys like: <code>CommandOrControl+Shift+H</code></p>
          </div>
        </div>

        <div className="shortcut-modal-actions">
          <button 
            className="shortcut-btn-cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="shortcut-btn-save" 
            onClick={handleSave}
            disabled={isLoading || !config.hideToTray || !config.showFromTray}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    electronAPI: {
      getScreens: () => Promise<any[]>;
      switchScreen: (screenId: number) => Promise<boolean>;
      minimizeWindow: () => Promise<boolean>;
      setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>;
      getWindowInfo: () => Promise<any>;
      hideToTray: () => Promise<boolean>;
      showFromTray: () => Promise<boolean>;
      getShortcutsConfig: () => Promise<any>;
      updateShortcutsConfig: (config: any) => Promise<any>;
      onWindowBlur: (callback: () => void) => () => void;
      onWindowFocus: (callback: () => void) => () => void;
      onKeyDown: (callback: (event: KeyboardEvent) => void) => () => void;
      platform: string;
      version: { node: string; electron: string };
    };
  }
}

interface Screen {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}


// Integrated toolbar with tldraw native controls + monitor selection + minimize + system tray + settings + close
const IntegratedToolbar = ({ screens, currentScreenId, onScreenSwitch, onMinimize, onHideToTray, onOpenSettings, onClose, ...props }: any) => {
  return (
    <DefaultToolbar {...props}>
      <DefaultToolbarContent />
      
      {/* Add divider */}
      <div className="tlui-toolbar__divider" />
      
      {/* Monitor selection control */}
      {screens && screens.length > 1 && (
        <div className="toolbar-monitor-selector">
          <select
            value={currentScreenId || ''}
            onChange={(e) => onScreenSwitch(Number(e.target.value))}
            className="toolbar-select"
          >
            {screens.map((screen: any) => (
              <option key={screen.id} value={screen.id}>
                Monitor {screen.id}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Settings button */}
      <button 
        className="toolbar-settings-btn"
        onClick={onOpenSettings}
        title="Settings"
      >
        <span>⚙</span>
      </button>
      
      {/* Hide to tray button */}
      <button 
        className="toolbar-hide-tray-btn"
        onClick={onHideToTray}
        title="Hide to System Tray"
      >
        <span>⬇</span>
      </button>
      
      {/* Minimize button */}
      <button 
        className="toolbar-minimize-btn"
        onClick={onMinimize}
        title="Minimize"
      >
        <span>−</span>
      </button>
      
      {/* Close button */}
      <button 
        className="toolbar-close-btn"
        onClick={onClose}
        title="Close"
      >
        <span>×</span>
      </button>
    </DefaultToolbar>
  );
};


// Custom StylePanel that only shows when we want it to
const ControlledStylePanel = ({ position, ...props }: any) => {
  return (
    <div 
      className="controlled-style-panel"
      style={{
        left: position?.x || 0,
        top: position?.y || 0,
      }}
    >
      <DefaultStylePanel {...props} />
    </div>
  );
};

const App: React.FC = () => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [currentScreenId, setCurrentScreenId] = useState<number | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [stylePanelPosition, setStylePanelPosition] = useState({ x: 0, y: 0 });
  const [background, setBackground] = useState('transparent');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [shortcutsConfig, setShortcutsConfig] = useState<ShortcutsConfig>({ hideToTray: '', showFromTray: '' });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Components configuration with integrated toolbar
  const components: TLUiComponents = {
    Toolbar: (props: any) => (
      <IntegratedToolbar 
        {...props}
        screens={screens}
        currentScreenId={currentScreenId}
        onScreenSwitch={handleScreenSwitch}
        onMinimize={handleMinimize}
        onHideToTray={handleHideToTray}
        onOpenSettings={() => setShowSettingsModal(true)}
        onClose={handleClose}
      />
    ),
    StylePanel: showStylePanel ? (props: any) => (
      <ControlledStylePanel {...props} position={stylePanelPosition} />
    ) : null,
    ContextMenu: null, // Hide context menu to prevent default right-click behavior
    // Hide specific UI elements as requested
    NavigationPanel: null, // Hides page zoom button  
    MainMenu: null,
    HelpMenu: null,
    ActionsMenu: null,
  };


  useEffect(() => {
    const loadScreens = async () => {
      try {
        const availableScreens = await window.electronAPI.getScreens();
        setScreens(availableScreens);
        
        const windowInfo = await window.electronAPI.getWindowInfo();
        if (windowInfo && windowInfo.currentScreenId) {
          setCurrentScreenId(windowInfo.currentScreenId);
        }
      } catch (error) {
        console.error('Failed to load screens:', error);
      }
    };

    loadScreens();
  }, []);

  useEffect(() => {
    const handleWindowBlur = () => {
      window.electronAPI.setAlwaysOnTop(false);
    };

    const handleWindowFocus = () => {
      window.electronAPI.setAlwaysOnTop(true);
    };

    const removeBlurListener = window.electronAPI.onWindowBlur(handleWindowBlur);
    const removeFocusListener = window.electronAPI.onWindowFocus(handleWindowFocus);

    return () => {
      removeBlurListener();
      removeFocusListener();
    };
  }, []);


  const handleScreenSwitch = useCallback(async (screenId: number) => {
    try {
      const success = await window.electronAPI.switchScreen(screenId);
      if (success) {
        setCurrentScreenId(screenId);
      }
    } catch (error) {
      console.error('Failed to switch screen:', error);
    }
  }, []);

  const handleMinimize = useCallback(async () => {
    try {
      await window.electronAPI.minimizeWindow();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, []);

  const handleHideToTray = useCallback(async () => {
    try {
      await window.electronAPI.hideToTray();
    } catch (error) {
      console.error('Failed to hide to tray:', error);
    }
  }, []);

  const handleShortcutsSave = useCallback((newConfig: ShortcutsConfig) => {
    setShortcutsConfig(newConfig);
  }, []);

  const handleClose = useCallback(() => {
    window.close();
  }, []);

  const toggleBackground = useCallback(() => {
    const backgrounds = ['transparent', 'white', 'dark', 'teal'];
    const currentIndex = backgrounds.indexOf(background);
    const nextIndex = (currentIndex + 1) % backgrounds.length;
    setBackground(backgrounds[nextIndex]);
  }, [background]);

  // Handle right-click on canvas to show style panel
  const handleCanvasRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (rect) {
      setStylePanelPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setShowStylePanel(true);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+B for background toggle
      if (event.ctrlKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleBackground();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleBackground]);

  // Handle click outside to hide style panel
  useEffect(() => {
    const handleClickOutside = () => {
      if (showStylePanel) {
        setShowStylePanel(false);
      }
    };

    if (showStylePanel) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStylePanel]);

  const getContainerStyle = () => {
    let backgroundColor = 'transparent';
    
    switch (background) {
      case 'transparent':
        backgroundColor = 'transparent';
        break;
      case 'white':
        backgroundColor = '#ffffff';
        break;
      case 'dark':
        backgroundColor = '#2d3748'; // Darkish gray
        break;
      case 'teal':
        backgroundColor = '#134e4a'; // Dark teal
        break;
      default:
        backgroundColor = 'transparent';
    }
    
    return {
      width: '100vw',
      height: '100vh',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor
    };
  };

  const getCanvasStyle = () => {
    // Make tldraw canvas background transparent so our background shows through
    return {
      '--tl-canvas-background': 'transparent'
    };
  };

  const getThemeClass = () => {
    // Use dark theme for dark backgrounds, light theme for light backgrounds
    const darkBackgrounds = ['dark', 'teal'];
    return darkBackgrounds.includes(background) ? 'tl-theme__dark' : 'tl-theme__light';
  };

  return (
    <div style={getContainerStyle()}>
      <div 
        ref={canvasContainerRef}
        className={`canvas-container ${getThemeClass()}`}
        onContextMenu={handleCanvasRightClick}
        style={{ width: '100%', height: '100%', ...getCanvasStyle() }}
      >
        <Tldraw
          persistenceKey="inkdraw-canvas"
          components={components}
        />
      </div>
      
      {/* Shortcut Configuration Modal */}
      <ShortcutConfigModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleShortcutsSave}
      />
    </div>
  );
};

export default App;