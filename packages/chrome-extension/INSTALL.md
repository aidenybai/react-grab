# Chrome Extension Installation Guide

## ✅ Extension is Ready!

All files have been built and icons generated. The extension is ready to load in Chrome.

## 📦 What's Included

```
dist/
├── background.js          ✅ Service worker (2.5 KB)
├── content.js             ✅ React Grab injected (143 KB)
├── popup.js               ✅ Popup UI logic (4.5 KB)
├── popup.html             ✅ Popup interface
├── manifest.json          ✅ Extension manifest v3
└── icons/                 ✅ All icon sizes
    ├── icon-16.png        ✅ 16x16
    ├── icon-32.png        ✅ 32x32
    ├── icon-48.png        ✅ 48x48
    └── icon-128.png       ✅ 128x128
```

## 🚀 Load Extension in Chrome

1. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Or: Menu → Extensions → Manage Extensions

2. **Enable Developer Mode**:
   - Toggle "Developer mode" in the top right corner

3. **Load Unpacked Extension**:
   - Click "Load unpacked" button
   - Navigate to and select:
     ```
     /Users/reza/react-grab/packages/chrome-extension/dist
     ```

4. **Verify Installation**:
   - You should see "React Grab" extension card
   - Extension icon appears in Chrome toolbar

## 🎯 Test the Extension

### Quick Test:

1. **Visit any React app** (or create one):
   ```bash
   # Example: Use the kitchen-sink demo
   cd packages/kitchen-sink
   pnpm dev
   # Open http://localhost:5173
   ```

2. **Activate React Grab**:
   - Hold **⌘C** (Mac) or **Ctrl+C** (Windows/Linux)
   - Wait for progress indicator (~500ms)
   - Overlay activates - elements highlight on hover

3. **Capture an Element**:
   - Click any element while overlay is active
   - You'll see a notification: "Element Captured"
   - Element is copied to clipboard
   - Badge shows count on extension icon

4. **View Captured Elements**:
   - Click React Grab extension icon
   - See list of all captured elements
   - Copy or delete individual items
   - Adjust settings (hotkey, duration)

### Test Checklist:

- [ ] Extension loads without errors
- [ ] Content script injects on web pages
- [ ] Hotkey activation works (⌘C hold)
- [ ] Progress indicator appears
- [ ] Overlay highlights elements
- [ ] Click captures element
- [ ] Notification shows on capture
- [ ] Clipboard contains element data
- [ ] Popup shows captured elements
- [ ] Badge counter updates
- [ ] Settings can be changed
- [ ] Elements can be copied/deleted

## ⚙️ Configure Settings

Click the extension icon to access settings:

- **Enabled**: Toggle extension on/off
- **Hotkey**: Change activation keys (e.g., `Meta,C` or `Ctrl,Shift,E`)
- **Hold Duration**: Adjust activation delay (default: 500ms)

**Note**: Settings changes require page reload to take effect.

## 🔧 Development

### Rebuild After Changes:

```bash
# From monorepo root
pnpm --filter react-grab build
pnpm --filter chrome-extension build

# Or from chrome-extension directory
pnpm build
```

### Reload Extension in Chrome:

1. Go to `chrome://extensions/`
2. Click the reload icon (🔄) on React Grab card
3. Refresh any open tabs to use new version

### Watch Mode (Optional):

```bash
pnpm dev
# Then manually reload extension in Chrome after changes
```

## 🐛 Troubleshooting

### Extension Not Loading:
- Check that you selected the `dist/` folder, not the root
- Verify all files exist in `dist/`
- Check Chrome console for errors

### Content Script Not Injecting:
- Extension doesn't work on `chrome://` pages (by design)
- Reload the page after installing extension
- Check extension is enabled in popup

### Elements Not Capturing:
- Verify React DevTools can detect React on the page
- Check browser console for errors
- Try on a known React app first

### Icons Not Showing:
- Regenerate icons: `pnpm icons`
- Verify PNG files exist in `dist/icons/`
- Reload extension

## 📝 Publishing (Future)

To publish to Chrome Web Store:

1. Create production build
2. Zip the `dist/` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Fill in store listing details
5. Submit for review

## 🔗 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [React Grab Repository](https://github.com/aidenybai/react-grab)
- [Report Issues](https://github.com/aidenybai/react-grab/issues)
