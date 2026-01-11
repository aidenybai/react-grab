---
name: react-grab-browser
description: Browser automation with Playwright and real cookies. Use 'npx @react-grab/cli browser execute "<code>"' to run Playwright code.
---

# React Grab Browser

Playwright automation with your real browser cookies. Pages persist across executions. Output is always JSON: `{ok, result, error, url, title, page}`

## Usage

```bash
npx @react-grab/cli browser execute "<code>"
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
- `snapshot(opts?)` - Get ARIA tree with refs (e1, e2...). Options: `maxDepth`, `interactableOnly`, `format`
- `ref(id)` - Get element by ref ID (chainable). E.g. `await ref('e1').click()`
- `ref(id).source()` - Get React component source: `{ filePath, lineNumber, componentName }`
- `fill(id, text)` - Clear and fill input
- `drag({from, to, dataTransfer?})` - Drag with custom MIME types
- `dispatch({target, event, dataTransfer?, detail?})` - Dispatch custom events

## Common Patterns

```bash
execute "await ref('e1').click()"
execute "await fill('e1', 'hello')"
execute "return await ref('e1').getAttribute('data-id')"
execute "return await ref('e1').source()"
execute "return await snapshot({interactableOnly: true})"
execute "await ref('e1').screenshot({path: '/tmp/el.png'})"
execute "await page.screenshot({path: '/tmp/full.png'})"
```

## Multi-Page Sessions

```bash
execute "await page.goto('https://github.com')" --page github
execute "return await snapshot({interactableOnly: true})" --page github
```

## Docs

Playwright API: https://playwright.dev/docs/api/class-page
