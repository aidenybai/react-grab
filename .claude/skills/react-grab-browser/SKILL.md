---
name: React Grab Browser
description: Browser automation with Playwright and real cookies. Use 'npx -y @react-grab/cli browser execute "<code>"' to run Playwright code. Triggers include "browse", "navigate to", "go to website", "extract data", "screenshot", "click on", "fill form", "get element source".
allowed-tools: Bash
---

# React Grab Browser

Playwright automation with your real browser cookies. Pages persist across executions. Output is always JSON: `{ok, result, error, url, title, page, reactContext?}`

## Overview

This skill uses a CLI-based approach where Claude calls browser automation commands via bash. The browser stays open between commands for faster sequential operations and preserves browser state (cookies, sessions, etc.).

## Setup Verification

**IMPORTANT: Before using any browser commands, you MUST check setup.json in this directory.**

### First-Time Setup Check

1. **Read `setup.json`** (located in `.claude/skills/react-grab-browser/setup.json`)
2. **Check `setupComplete` field**:
   - If `true`: All prerequisites are met, proceed with browser commands
   - If `false`: Setup required - follow the steps below

### If Setup is Required (`setupComplete: false`)

```bash
# 1. Install the CLI globally (REQUIRED)
npm install -g @react-grab/cli
# or: npx -y @react-grab/cli --help

# 2. Verify installation
npx -y @react-grab/cli browser execute "return 'hello'"

# 3. Update setup.json: set setupComplete to true
```

### Prerequisites Summary

- ✅ Google Chrome installed on your system
- ✅ @react-grab/cli available (via npx or global install)

**DO NOT attempt to use browser commands if `setupComplete: false` in setup.json. Guide the user through setup first.**

## Usage

```bash
npx -y @react-grab/cli browser execute "<code>"
```

## Performance Tips

1. Batch multiple actions in a single execute call (3-5x faster)
2. Use compact format: `snapshot({format: 'compact', interactableOnly: true})`

```bash
# SLOW: 3 separate round-trips
execute "await page.goto('https://example.com')"
execute "await ref('e1').click()"
execute "return await snapshot()"

# FAST: 1 round-trip, compact output
execute "await page.goto('...'); await ref('e1').click(); return await snapshot({format: 'compact'});"
```

## Helpers

- `page` - Playwright Page object
- `snapshot(opts?)` - Get ARIA tree with refs (e1, e2...) and React component info. Options: `maxDepth`, `interactableOnly`, `format`
- `ref(id)` - Get element by ref ID (chainable). E.g. `await ref('e1').click()`
- `ref(id).source()` - Get React component source: `{ filePath, lineNumber, componentName }`
- `ref(id).props()` - Get React component props (serialized)
- `ref(id).state()` - Get React component state/hooks (serialized)
- `component(name, opts?)` - Find elements by React component name. E.g. `await component('Button', {nth: 0})`
- `fill(id, text)` - Clear and fill input
- `drag({from, to, dataTransfer?})` - Drag with custom MIME types
- `dispatch({target, event, dataTransfer?, detail?})` - Dispatch custom events
- `waitFor(target, opts?)` - Wait for selector/ref/state. E.g. `waitFor('e1')`, `waitFor('networkidle')`

## Common Patterns

```bash
# Navigate to a page
npx -y @react-grab/cli browser execute "await page.goto('https://example.com'); return await snapshot({interactableOnly: true});"

# Click an element
npx -y @react-grab/cli browser execute "await ref('e1').click(); return await snapshot();"

# Fill an input
npx -y @react-grab/cli browser execute "await fill('e1', 'hello'); return await snapshot();"

# Wait for element or network
npx -y @react-grab/cli browser execute "await waitFor('e1')"
npx -y @react-grab/cli browser execute "await waitFor('networkidle')"

# Get element attribute
npx -y @react-grab/cli browser execute "return await ref('e1').getAttribute('data-id')"

# Get React component source (unique to react-grab!)
npx -y @react-grab/cli browser execute "return await ref('e1').source()"

# Take screenshot
npx -y @react-grab/cli browser execute "return await page.screenshot()"
npx -y @react-grab/cli browser execute "return await ref('e1').screenshot()"
```

## Multi-Page Sessions

```bash
npx -y @react-grab/cli browser execute "await page.goto('https://github.com')" --page github
npx -y @react-grab/cli browser execute "return await snapshot({interactableOnly: true})" --page github
```

## React-Specific Features

### Snapshots Include React Info

Snapshots now include React component information:
- `[component=ComponentName]` - The React component that rendered this element
- `[source=file.tsx:42]` - Source file and line number

Example output:
```yaml
- button "Submit" [ref=e1] [component=LoginForm] [source=login.tsx:42]
```

### Get Component Source Location

```bash
# Returns { filePath, lineNumber, componentName }
npx -y @react-grab/cli browser execute "return await ref('e1').source()"
```

### Get Component Props

```bash
# Returns serialized props object
npx -y @react-grab/cli browser execute "return await ref('e1').props()"
```

### Get Component State

```bash
# Returns array of hook states
npx -y @react-grab/cli browser execute "return await ref('e1').state()"
```

### Find Elements by Component Name

```bash
# Find all Button components
npx -y @react-grab/cli browser execute "const buttons = await component('Button'); return buttons.length"

# Get the first Button
npx -y @react-grab/cli browser execute "const btn = await component('Button', {nth: 0}); await btn.click()"
```

### Auto React Context in Output

Execute responses include `reactContext` for the focused element:
```json
{
  "ok": true,
  "url": "...",
  "reactContext": {
    "element": "button",
    "component": "LoginForm",
    "source": "login.tsx:42",
    "componentStack": ["LoginForm", "AuthPage", "App"]
  }
}
```

This helps you understand which React component you just interacted with.

## Best Practices

1. **Always get snapshot first**: Before interacting, get the ARIA tree to find element refs
2. **Batch operations**: Combine multiple actions in one execute call for speed
3. **Use interactableOnly**: `snapshot({interactableOnly: true})` gives much smaller output
4. **Use compact format**: `snapshot({format: 'compact'})` for minimal output
5. **Handle errors**: Check the `ok` field in JSON output
6. **Be specific**: Use precise element refs from the snapshot

## Troubleshooting

**Element not found**: Get a fresh snapshot to see available elements
**Action fails**: Try waiting for network idle first: `await waitFor('networkidle')`
**Page not loading**: Increase timeout or wait explicitly

## Docs

Playwright API: https://playwright.dev/docs/api/class-page
