---
name: react-grab
description: Browser automation with Playwright and real cookies. Use 'grab browser execute "<code>"' to run Playwright code.
---

# React Grab

Playwright automation with your real browser cookies. Pages persist across executions. Output is always JSON: `{ok, result, error, url, title, page}`

**Note:** If MCP is available in your environment, prefer using the `browser_snapshot` and `browser_execute` MCP tools instead of this skill for better performance.

## Usage

```bash
grab browser execute "<code>"
```

## Performance Tips

1. Batch multiple actions in a single execute call (3-5x faster)
2. Use maxDepth to limit tree depth: `getSnapshot({maxDepth: 5})`

```bash
# SLOW: 3 separate round-trips
execute "await page.goto('https://example.com')"
execute "await getRef('e1').click()"
execute "return await getSnapshot()"

# FAST: 1 round-trip
execute "await page.goto('...'); await getRef('e1').click(); return await getSnapshot();"
```

## Helpers

- `page` - Playwright Page object
- `getSnapshot(opts?)` - Get ARIA tree with refs (e1, e2...). Options: `maxDepth`
- `getRef(id)` - Get element by ref ID (chainable). E.g. `await getRef('e1').click()`
- `getRef(id).source()` - Get React component source: `{ filePath, lineNumber, componentName }`
- `fill(id, text)` - Clear and fill input
- `drag({from, to, dataTransfer?})` - Drag with custom MIME types
- `dispatch({target, event, dataTransfer?, detail?})` - Dispatch custom events
- `waitFor(target, opts?)` - Wait for selector/ref/state. E.g. `waitFor('e1')`, `waitFor('networkidle')`

## Common Patterns

```bash
execute "await getRef('e1').click()"
execute "await fill('e1', 'hello')"
execute "await waitFor('e1')"
execute "await waitFor('networkidle')"
execute "return await getRef('e1').getAttribute('data-id')"
execute "return await getRef('e1').source()"
execute "return await getSnapshot()"
execute "return await getRef('e1').screenshot()"
execute "return await page.screenshot()"
```

## Multi-Page Sessions

```bash
execute "await page.goto('https://github.com')" --page github
execute "return await getSnapshot()" --page github
```

## Docs

Playwright API: https://playwright.dev/docs/api/class-page
