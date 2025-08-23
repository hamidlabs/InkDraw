# InkDraw

A production-ready Electron application with tldraw integration for cross-platform annotation canvas. Built specifically for Arch Linux with Windows and macOS compatibility.

## Features

- **Full-Screen Annotation Canvas**: Leverages tldraw library for professional drawing capabilities
- **Advanced Window Management**: Always-on-top with smart OS dialog detection
- **Multi-Monitor Support**: Dynamic monitor switching with automatic window repositioning  
- **Custom UI**: Clean toolbar with minimized interface, hidden native tldraw controls
- **Right-Click Style Panel**: Context-sensitive styling options
- **Cross-Platform**: Optimized for Arch Linux, compatible with Windows and macOS

## Technical Specifications

- **Framework**: Electron with React and TypeScript
- **Canvas**: tldraw v2.0+ with complete UI customization
- **Security**: Context isolation enabled, nodeIntegration disabled
- **Architecture**: Main/Renderer/Preload process separation with IPC

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd InkDraw

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Development Scripts

```bash
npm run dev          # Start development server with hot reload
npm run dev:main     # Run main process with nodemon
npm run dev:renderer # Run Vite dev server for renderer
npm run build        # Build for production
npm run start        # Start production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

## Key Functionality

### Window Behavior
- Frameless, non-resizable window sized to current monitor's work area
- Always-on-top with intelligent lowering for OS dialogs (blur/focus events)
- Custom minimize functionality via IPC

### Multi-Monitor Support  
- Auto-detection of all available displays via Electron's screen API
- Dropdown selector for monitor switching
- Seamless window repositioning and resizing

### tldraw Integration
- Native tldraw toolbar repositioned to top-center using component system
- Native style panel accessible via right-click (preserved tldraw behavior)
- All native tldraw functionality preserved (drawing tools, menus, shortcuts)
- Persistent canvas state with `persistenceKey`

### Custom UI Components
- **Simple Toolbar**: Minimal top bar with app title, monitor selection, and minimize
- **Custom Toolbar Component**: Wraps tldraw's DefaultToolbar with top positioning
- Uses tldraw's native component system instead of CSS overrides

## Project Structure

```
InkDraw/
├── src/
│   ├── main/
│   │   └── main.js              # Main Electron process
│   ├── preload/
│   │   └── preload.js           # Secure IPC bridge
│   └── renderer/
│       ├── components/
│       │   ├── CustomToolbar.tsx
│       │   └── StylePanel.tsx
│       ├── App.tsx              # Main React component
│       ├── App.css              # Styling
│       └── main.tsx             # React entry point
├── index.html                   # HTML entry point
├── package.json
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── README.md
```

## Security Features

- Context isolation enabled
- Preload script with controlled API exposure
- No direct Node.js access in renderer process
- Secure IPC communication channels

## Platform-Specific Notes

### Arch Linux (Primary Target)
- Optimized window management for X11/Wayland
- Native system integration

### Windows
- NSIS installer support
- Windows-specific window behavior handling

### macOS  
- Dock integration
- macOS-specific app category classification

## Contributing

1. Follow TypeScript and React best practices
2. Maintain security model (no nodeIntegration)
3. Test across target platforms
4. Update documentation for API changes

## License

MIT License - see LICENSE file for details