# React Grab - Chrome Extension

Chrome extension version of React Grab that automatically injects into all web pages, allowing you to grab any element and send it to AI coding assistants.

## Features

- **Automatic injection** - No need to manually add script tags to your projects
- **Works on all websites** - Automatically enabled on every page you visit
- **🖼️ Visual previews** - Automatic screenshot thumbnails of captured elements
- **Persistent storage** - Captured elements are saved and accessible from the popup
- **Fullscreen preview** - Click thumbnails to view full-size screenshots
- **Configurable settings** - Customize hotkey and hold duration
- **Privacy-focused** - All data stays local in your browser

## Installation

### From Source

1. **Install dependencies** from the monorepo root:
   ```bash
   pnpm install
   ```

2. **Build the extension**:
   ```bash
   cd packages/chrome-extension
   pnpm build
   ```

3. **Add extension icons**:
   - Add icon files to `dist/icons/` directory:
     - `icon-16.png` (16x16)
     - `icon-32.png` (32x32)
     - `icon-48.png` (48x48)
     - `icon-128.png` (128x128)
   - You can use the React Grab logo from the website package

4. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `packages/chrome-extension/dist` directory

## Usage

### Capturing Elements

1. Navigate to any web page (especially React apps)
2. Hold **⌘C** (Mac) or **Ctrl+C** (Windows/Linux) for 500ms
3. You'll see a progress indicator appear
4. Once activated, hover over elements to see them highlighted
5. Click any element to capture it
6. The element HTML and React component stack is copied to your clipboard
7. A notification confirms the capture

### Viewing Captured Elements

1. Click the React Grab extension icon in your browser toolbar
2. View all captured elements with timestamps and URLs
3. Click "Copy" to copy an element again
4. Click "Delete" to remove a single element
5. Click "Clear All" to remove all captured elements

### Customizing Settings

In the extension popup, you can configure:

- **Enabled** - Toggle the extension on/off
- **Hotkey** - Change the activation keys (comma-separated, e.g., `Meta,C` or `Ctrl,Shift,E`)
- **Hold Duration** - Adjust how long to hold the key (in milliseconds)

Changes are saved automatically and will apply after refreshing the page.

## Development

### Watch Mode

Run in watch mode while developing:

```bash
pnpm dev
```

Then reload the extension in Chrome:
1. Go to `chrome://extensions/`
2. Click the reload icon on the React Grab extension card

### Project Structure

```
packages/chrome-extension/
├── src/
│   ├── adapters/
│   │   └── chrome.ts          # Chrome-specific adapter for messaging
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   └── popup.ts           # Popup logic
│   ├── background.ts          # Service worker for message handling
│   └── content.ts             # Content script that initializes react-grab
├── manifest.json              # Chrome extension manifest v3
├── tsup.config.ts             # Build configuration
└── package.json
```

### How It Works

1. **Content Script** (`content.ts`):
   - Injects into every page at document start
   - Initializes react-grab with Chrome adapter
   - Loads settings from chrome.storage
   - Reloads page when settings change

2. **Chrome Adapter** (`adapters/chrome.ts`):
   - Implements the react-grab Adapter interface
   - Sends captured elements to background script via chrome.runtime.sendMessage
   - Includes metadata: URL, title, timestamp

3. **Background Service Worker** (`background.ts`):
   - Receives captured elements from content scripts
   - Stores elements in chrome.storage.local (max 50 elements)
   - Shows notifications on capture
   - Updates badge with element count
   - Handles GET/DELETE/CLEAR operations from popup

4. **Popup UI** (`popup/`):
   - Displays list of captured elements
   - Allows copying elements to clipboard
   - Provides settings configuration
   - Real-time updates via storage change listeners

## Permissions

The extension requires these permissions:

- **activeTab** - Access to the current tab for element capture
- **storage** - Save settings and captured elements
- **clipboardWrite** - Copy elements to clipboard
- **host_permissions: <all_urls>** - Inject content script on all pages

## Limitations

- Maximum 50 captured elements stored (oldest are removed automatically)
- Settings changes require page reload to take effect
- Only works on pages where the content script can inject (not chrome:// pages)

## Contributing

## Author

Made by [@creativerezz](https://github.com/creativerezz) during a "this should be a Chrome extension" moment that spiraled beautifully out of control 

Follow more questionable ideas on [X/Twitter](https://x.com/creativerezz) 🚀

## License

MIT - See [LICENSE](../../LICENSE) for details.
