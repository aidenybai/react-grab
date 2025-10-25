# React Grab Extension

Chrome extension that allows you to grab any element on any website and send it to AI coding agents like Cursor and Claude Code.

## Features

- 🎯 **Universal**: Works on any website (React, Vue, Svelte, vanilla JS)
- ⚛️ **React-aware**: Extracts component stack and source locations when React is detected
- 📋 **Clipboard-ready**: Automatically copies grabbed elements with context tags
- 🎨 **Visual feedback**: Overlay highlights elements as you hover
- ⚙️ **Customizable**: Configure hotkeys, hold duration, and AI adapters
- 🔐 **Type-safe**: Full TypeScript type safety for messaging and storage

## Quick Start

### Installation

```bash
pnpm install
pnpm build
```

Load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/.output/chrome-mv3`

### Usage

1. **Enable grabbing**: Hold `Cmd+C` (Mac) or `Ctrl+C` (Windows/Linux)
2. **Configure hotkey**: Click the extension icon to customize the grab hotkey (default: `Cmd+C`)
3. **Grab an element**: Hold your custom hotkey, hover over an element, and click
4. **Result**: Element HTML + React component info copied to clipboard

## Architecture

Uses a **three-world isolation model** for security and React access:

```
Background Script (keyboard shortcuts)
    ↓ chrome.runtime.sendMessage
ISOLATED Content Script (browser APIs + storage)
    ↓ window.postMessage
MAIN World Script (page JavaScript + React access)
    ↓ react-grab library
User interacts with page elements
```

### Key Components

- **`entrypoints/background.ts`**: Listens for `Ctrl+Shift+G` toggle shortcut
- **`entrypoints/content.ts`**: Bridge between browser APIs and page context, manages settings sync
- **`entrypoints/main-world.ts`**: Runs `react-grab` library in page context for React access
- **`entrypoints/popup/`**: Settings UI with theme support (light/dark/system)
- **`utils/messaging.ts`**: Type-safe Chrome extension messaging
- **`utils/window-messaging.ts`**: Type-safe ISOLATED ↔ MAIN world communication

### Communication Pattern

**Type-safe messaging** ensures compile-time safety:
- **Chrome messaging** (`messaging.ts`): Background ↔ Content script via `chrome.runtime.sendMessage`
- **Window messaging** (`window-messaging.ts`): ISOLATED ↔ MAIN world via `window.postMessage`

**Handshake pattern** prevents race conditions:
1. MAIN world sends `REACT_GRAB_READY` signal when loaded
2. ISOLATED world waits for signal, then sends settings
3. Settings persist across page refreshes

## Development

```bash
# Dev server with hot reload (Chrome)
pnpm dev

# Dev server (Firefox)
pnpm dev:firefox

# Production build
pnpm build

# Create distribution zip
pnpm zip
```

## Configuration

Settings are managed via browser storage and synced in real-time:

```typescript
interface ExtensionSettings {
  enabled: boolean;                    // Master toggle
  adapter: "none" | "cursor";          // AI adapter
  hotkey: {
    key: string;                       // Base key (e.g., "c", "g")
    modifiers: ("Meta" | "Ctrl" | "Alt" | "Shift")[];
  };
  keyHoldDuration: number;             // Milliseconds (100-1000)
}
```

## Tech Stack

- **Framework**: WXT
- **UI**: React 19
- **Styling**: Tailwind v4
- **Build**: Vite
- **Core**: `react-grab` library

## Permissions

- `activeTab`: Access current tab
- `storage`: Persist settings
- `clipboardWrite`: Copy grabbed elements
- `<all_urls>`: Works on all websites
