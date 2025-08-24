import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, TLUiComponents, DefaultStylePanel, DefaultToolbar, DefaultToolbarContent } from 'tldraw';
import 'tldraw/tldraw.css';
import './App.css';

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


// Integrated toolbar with tldraw native controls + monitor selection + minimize + system tray
const IntegratedToolbar = ({ screens, currentScreenId, onScreenSwitch, onMinimize, onHideToTray, ...props }: any) => {
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

  const toggleBackground = useCallback(() => {
    const backgrounds = ['transparent', 'white', 'light', 'dark'];
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
    return {
      width: '100vw',
      height: '100vh',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor: 'transparent' // Always transparent - background handled by tldraw Background component
    };
  };

  const getCanvasStyle = () => {
    // Make tldraw canvas background transparent so our background shows through
    return {
      '--tl-canvas-background': 'transparent'
    };
  };

  const getThemeClass = () => {
    return background === 'dark' ? 'tl-theme__dark' : 'tl-theme__light';
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
    </div>
  );
};

export default App;