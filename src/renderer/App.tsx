import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, TLUiComponents, DefaultToolbar, DefaultToolbarContent, DefaultStylePanel } from 'tldraw';
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

// Custom Toolbar component positioned at the top
const CustomTopToolbar = (props: any) => {
  return (
    <div className="custom-top-toolbar">
      <DefaultToolbar {...props}>
        <DefaultToolbarContent />
      </DefaultToolbar>
    </div>
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
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Components configuration - only show toolbar, hide everything else initially
  const components: TLUiComponents = {
    Toolbar: CustomTopToolbar,
    StylePanel: showStylePanel ? (props: any) => (
      <ControlledStylePanel {...props} position={stylePanelPosition} />
    ) : null,
    // Hide context menu to prevent default right-click behavior
    ContextMenu: null,
    // Hide other UI elements we don't want
    ActionsMenu: null,
    HelpMenu: null,
    ZoomMenu: null,
    MainMenu: null,
    Minimap: null,
    PageMenu: null,
    NavigationPanel: null,
    KeyboardShortcutsDialog: null,
    QuickActions: null,
    HelperButtons: null,
    DebugPanel: null,
    DebugMenu: null,
    SharePanel: null,
    MenuPanel: null,
    TopPanel: null,
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

  return (
    <div className="app-container">
      {/* Simple toolbar for monitor switching and minimize */}
      <div className="simple-toolbar">
        <div className="toolbar-content">
          <div className="app-title">InkDraw</div>
          
          {screens.length > 1 && (
            <div className="screen-selector">
              <label>Monitor:</label>
              <select
                value={currentScreenId || ''}
                onChange={(e) => handleScreenSwitch(Number(e.target.value))}
              >
                {screens.map((screen) => (
                  <option key={screen.id} value={screen.id}>
                    {screen.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button className="minimize-btn" onClick={handleMinimize}>
            <span>−</span>
            Minimize
          </button>
        </div>
      </div>
      
      {/* tldraw with native UI and custom toolbar positioning */}
      <div 
        ref={canvasContainerRef}
        className="canvas-container"
        onContextMenu={handleCanvasRightClick}
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