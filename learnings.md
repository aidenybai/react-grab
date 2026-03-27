# Dev Server Special Routes & Internal Endpoints

Research into how Next.js, Vite, and next-browser use internal routes, endpoints, and hooks for development tooling.

---

## Next.js Dev-Only Routes (`/__nextjs_*`)

### `/__nextjs_original-stack-frames` (POST)

Maps bundled/minified stack frames back to original source locations via source maps. The error overlay collects raw stack frames and POSTs them as JSON with `frames`, `isServer`, `isEdgeServer`, `isAppDirectory` fields.

**Turbopack path:** Uses `project.traceSource()` from Turbopack's internal source graph. Falls back to Node.js native `findSourceMap()`. Caches source file reads for 100ms to batch concurrent frame requests from a single error.

**Webpack path:** Looks up module in `webpack.compilation.stats`, extracts source map from `CodeGenerationResults`, respects `sourcemap.ignoreList`.

After resolving, calls `ignoreListAnonymousStackFramesIfSandwiched()` to hide anonymous frames sitting between two ignore-listed (framework) frames.

Returns `PromiseSettledResult[]` — each entry is `{status: "fulfilled", value: {originalStackFrame, originalCodeFrame}}` or `{status: "rejected", reason}`.

**Files:**
- `packages/next/src/server/dev/middleware-turbopack.ts` (lines 332-412)
- `packages/next/src/server/dev/middleware-webpack.ts` (lines 552-651)

---

### `/__nextjs_launch-editor` (GET)

Opens a file in the user's editor at a specific line/column. Query params: `file`, `line1`, `column1`, `methodName`, `isAppRelativePath`.

**Editor detection:** Checks `REACT_EDITOR` env var first. On macOS, runs `ps x` to find running processes and matches against 50+ known editor names. Each editor has its own argument format (VS Code: `-g file:line:col`, Vim: `+line file`, etc.). Falls back to `VISUAL` or `EDITOR` env vars.

**Security:** Sanitizes line/column (must be positive integers), validates Windows filenames against regex to prevent command injection via `cmd.exe`.

Returns 204 on success, 404 if file not found, 500 on error.

**Files:**
- `packages/next/src/next-devtools/server/launch-editor.ts` (lines 435-471)
- Handler in `middleware-turbopack.ts` (lines 375-408)

---

### `/__nextjs_source-map` (GET)

Serves raw source map JSON for any JavaScript file. Query param: `filename`.

**Resolution strategy (3 levels):**
1. Node.js native `findSourceMap(filename)` — checks inline `//# sourceMappingURL=data:` comments
2. Turbopack `project.getSourceMap(filename)` — queries Turbopack's module graph
3. Webpack compilation stats — looks up module in chunkGraph

Turbopack chunk filenames can be URL-encoded, so the handler does `decodeURI(filename)` before lookup. Absolute paths are converted to `file://` URLs.

**Files:**
- `packages/next/src/server/dev/middleware-turbopack.ts` (lines 414-481)
- `packages/next/src/server/dev/middleware-webpack.ts` (lines 653-715)

---

### `/__nextjs_attach-nodejs-inspector` (GET)

Programmatically attaches Chrome DevTools to the Node.js process. Calls `inspector.open(process.debugPort)`, then queries `http://{inspectorHost}/json/list` for the first target's `devtoolsFrontendUrl`. Returns a `chrome-devtools://` URL.

Returns 400 if port already in use, 500 on other errors.

**File:** `packages/next/src/next-devtools/server/attach-nodejs-debugger-middleware.ts`

---

### `/__nextjs_error_feedback` (GET)

Collects thumbs-up/thumbs-down feedback on error messages. Query params: `errorCode`, `wasHelpful`. Records telemetry event via `telemetry.record(eventErrorFeedback(...))`. Returns 204.

**File:** `packages/next/src/next-devtools/server/get-next-error-feedback-middleware.ts`

---

### `/__nextjs_restart_dev` (POST) and `/__nextjs_server_status` (GET)

**Restart:**
1. If `?invalidateFileSystemCache` is set, clears webpack cache directories and/or calls `turbopackProject.invalidateFileSystemCache()`
2. Flushes telemetry
3. Sends 204 response
4. Exits process with `RESTART_EXIT_CODE` via `setTimeout(() => process.exit(RESTART_EXIT_CODE), 0)`
5. Parent process (next CLI) sees the special exit code and restarts

**Status:** Returns `{executionId}` — a random number between 1 and `Number.MAX_SAFE_INTEGER` generated once per server process. Clients poll this to detect when restart is complete.

**File:** `packages/next/src/next-devtools/server/restart-dev-server-middleware.ts`

---

### `/__nextjs_devtools_config` (POST)

Persists dev overlay config to `.next/cache/next-devtools-config.json`. Validates against Zod schema, deep-merges with existing config, writes to disk, then calls `sendUpdateSignal()` to broadcast to all HMR clients. Changes take effect across all tabs without reload.

**File:** `packages/next/src/next-devtools/server/devtools-config-middleware.ts`

---

### `/__nextjs_disable_dev_indicator` (POST)

Hides the floating dev indicator. Sets `devIndicatorServerState.disabledUntil = Date.now() + COOLDOWN_TIME_MS`. Default cooldown: 24 hours, overridable via `__NEXT_DEV_INDICATOR_COOLDOWN_MS` env var. The HMR `SYNC` message includes `devIndicator` state so all clients update immediately.

**File:** `packages/next/src/next-devtools/server/dev-indicator-middleware.ts`

---

### `/__nextjs_font/*` (GET)

Serves Geist font family for the error overlay. Whitelisted files: `geist-latin.woff2`, `geist-mono-latin.woff2`, `geist-latin-ext.woff2`, `geist-mono-latin-ext.woff2`. Returns `Content-Type: font/woff2` with `Cache-Control: public, max-age=31536000, immutable`. Any filename not in the whitelist returns 404.

**File:** `packages/next/src/next-devtools/server/font/get-dev-overlay-font-middleware.ts`

---

## Next.js Runtime Routes (`/_next/*`)

### `/_next/image` (GET)

On-the-fly image optimization. Query params: `url`, `w` (width), `q` (quality 1-100).

**Pipeline:**
1. `ImageOptimizerCache.validateParams()` — checks URL against allowed domains, width against `images.deviceSizes`/`images.imageSizes`
2. Checks `imageResponseCache` (LRU disk cache in `.next/cache/images/`)
3. On miss: fetches upstream, detects best format from `Accept` header (prefers AVIF > WebP > original), resizes via `sharp`
4. For blur placeholders: 8x8 JPEG at quality 70

**Cache-Control:** Optimized images are cached with ETags. Supports AVIF, WebP, PNG, JPEG, JXL, JP2, HEIC, GIF, SVG, ICO, TIFF, BMP. Animated formats preserved.

Disabled in minimal mode, static export, or when `images.loader !== 'default'`.

**File:** `packages/next/src/server/next-server.ts` (lines 924-1020)

---

### `/_next/data/{buildId}/**/*.json` (GET)

Pages Router only. Serves serialized `getStaticProps`/`getServerSideProps` return values as JSON for client-side navigation. `NextDataPathnameNormalizer` strips `/_next/data/{buildId}` prefix and `.json` suffix to get the page path.

App Router uses RSC streaming with `_rsc` query param instead.

**File:** `packages/next/src/server/normalizers/request/next-data.ts`

---

### `/_next/mcp` (POST)

Model Context Protocol server. JSON-RPC 2.0 over Streamable HTTP (SSE response). Singleton pattern — server created once and reused. 1MB request body limit.

**Registered tools:**

| Tool | Returns |
|---|---|
| `get_project_metadata` | Package info, Next.js config, features |
| `get_errors` | Build + browser errors with source-mapped stacks |
| `get_page_metadata` | Route segments, loading boundaries |
| `get_logs` | Browser console output |
| `get_server_action_by_id` | Server Action source code |
| `get_routes` | All application routes |

Only enabled when `experimental.mcpServer` is set.

**File:** `packages/next/src/server/mcp/get-mcp-middleware.ts`

---

### `/_next/static/**` (GET)

Static assets: chunks, CSS, media, fonts. Served from `.next/static/`.

---

### HMR WebSocket (`/__next/webpack-hmr`)

Bidirectional communication for Hot Module Replacement.

**Message types:**
- `BUILDING` — compilation started
- `BUILT` — compilation complete (hash, errors, warnings)
- `SYNC` — full state on connection (hash, errors, warnings, versionInfo, devIndicator, devToolsConfig)
- `DEVTOOLS_CONFIG` — config change broadcast
- `REQUEST_CURRENT_ERROR_STATE` — asks browser for error overlay state
- `ERRORS_RSC_STREAM` — RSC streaming errors

**Client tracking:** `clientsByHtmlRequestId` (App Router, targeted updates) and `clientsWithoutHtmlRequestId` (Pages Router, broadcast). Uses binary encoding via `createBinaryHmrMessageData()` for compact payloads.

**File:** `packages/next/src/server/dev/hot-middleware.ts`

---

### Middleware Registration Order

All dev middlewares are mounted in `hot-reloader-webpack.ts` (lines 1652-1704):

```
getOverlayMiddleware → getSourceMapMiddleware → getNextErrorFeedbackMiddleware →
getDevOverlayFontMiddleware → getDisableDevIndicatorMiddleware →
getRestartDevServerMiddleware → devToolsConfigMiddleware →
getAttachNodejsDebuggerMiddleware → getMcpMiddleware (if enabled)
```

---

## Next.js Internal Markers & Globals

| Marker | Purpose |
|---|---|
| `self.__next_f` | Flight (RSC) response array for streamed data |
| `self.__next_r` | Request ID associating client with server request |
| `__next_preview_data` | Preview mode cookie name |
| `_rsc` | RSC cache-busting query parameter |
| `__next_metadata__` | Metadata export marker |
| `__next_edge_ssr_entry__` | Edge SSR entry point |
| `__next_app__` | App component module with `require()` and `loadChunk()` |
| `__next_hmr_refresh_hash__` | Cookie for HMR refresh tracking |
| `globalThis.__next_require__` | Dynamic module require |
| `globalThis.__next_chunk_load__` | Chunk loading function |

---

## Vite Special Routes

### `/@vite/client`

HMR client runtime injected into every page via `<script type="module" src="/@vite/client">`. Resolved to `vite/dist/client/client.mjs` by the transform middleware.

`clientInjectionsPlugin` replaces placeholder globals before serving:

```
__BASE__, __SERVER_HOST__, __HMR_PROTOCOL__, __HMR_HOSTNAME__,
__HMR_PORT__, __HMR_DIRECT_TARGET__, __HMR_BASE__, __HMR_TIMEOUT__,
__HMR_ENABLE_OVERLAY__, __WS_TOKEN__, __SERVER_FORWARD_CONSOLE__, __BUNDLED_DEV__
```

The client establishes a WebSocket connection, handles `update`/`full-reload`/`error` messages, implements CSS hot replacement, and manages the error overlay.

**Files:**
- `packages/vite/src/node/constants.ts:121`
- `packages/vite/src/node/plugins/clientInjections.ts:19-61`
- `packages/vite/src/client/client.ts`

---

### `/@vite/env`

Exposes `define` values as globals. Reads `__DEFINES__` (replaced at serve time) and walks through each key creating nested object paths on `globalThis`. E.g., `"process.env.NODE_ENV"` → `globalThis.process.env.NODE_ENV = "development"`.

**Files:**
- `packages/vite/src/node/constants.ts:122`
- `packages/vite/src/client/env.ts`

---

### `/@id/` — Virtual Module Resolution

Serves virtual modules (don't exist on disk). Rollup/Vite plugins use `\0` prefix for virtual modules. Since `\0` can't appear in URLs, encoded as `__x00__`:

```
\0virtual:routes → /@id/__x00__virtual:routes (in browser)
/@id/__x00__virtual:routes → \0virtual:routes (on server, passed to plugin load())
```

**Files:**
- `packages/vite/src/shared/constants.ts:1-17`
- `packages/vite/src/shared/utils.ts:11-24`

---

### `/@fs/` — Absolute Filesystem Access

Serves files from absolute paths outside project root. Critical for monorepos. Strips `/@fs/` prefix and serves from filesystem root via `sirv('/')`.

**Security:** Governed by `server.fs.strict` (default: true), `server.fs.allow`, and `server.fs.deny`. `checkLoadingAccess()` verifies path before serving.

**File:** `packages/vite/src/node/server/middlewares/static.ts:201-243`

---

### `/__open-in-editor`

Opens file in editor. Uses `launch-editor-middleware` npm package. Registered as `middlewares.use('/__open-in-editor', launchEditorMiddleware())`.

**File:** `packages/vite/src/node/server/index.ts:974`

---

### HMR WebSocket

**Token auth:** Generates `config.webSocketToken = crypto.randomBytes(32).toString('hex')` on startup. Injected into `/@vite/client` as `__WS_TOKEN__`. Sent as query param on WebSocket upgrade. Validated with `crypto.timingSafeEqual()`.

**Protocol handling:**
- `vite-ping` subprotocol: Allowed without token (health checks only)
- Non-browser requests (no `Origin` header): Allowed without token for backward compat
- Browser requests: Must include valid token

**Message types:**
- `connected` — connection established
- `update` — module update (`js-update` or `css-update` with path, acceptedPath, timestamp)
- `full-reload` — full page reload required
- `error` — error with message, stack, frame, plugin, loc
- `prune` — removed modules
- `custom` — plugin-defined events

**Buffering:** Errors occurring while no clients are connected are buffered and sent to the first connecting client.

**File:** `packages/vite/src/node/server/ws.ts`

---

### Transform Middleware

The core of Vite's dev server. Two layers:

**Cached transform (runs first):** Checks `If-None-Match` against ETags in module graph → 304 if match.

**Transform (on cache miss):**
1. `resolve(url)` → absolute file path
2. `load(resolved)` → raw source
3. `transform(code)` → compiled JS + sourcemap
4. Generate ETag, serve with appropriate Cache-Control

**Cache-Control:**
- Pre-bundled deps: `max-age=31536000,immutable` (content-hashed)
- User source: `no-cache` (revalidate every time, 304 on ETag match)

**Files:**
- `packages/vite/src/node/server/middlewares/transform.ts`
- `packages/vite/src/node/server/transformRequest.ts`

---

### Special Query Parameters

| Param | Behavior |
|---|---|
| `?raw` | Read file as UTF-8, export as default string |
| `?url` | Return asset URL path (or data URL for small files) |
| `?worker` | Wrap as Web Worker constructor |
| `?sharedworker` | Wrap as SharedWorker constructor |
| `?inline` | Force base64 data URL regardless of size |
| `?import` | Mark as explicit import (prevent static asset treatment) |
| `?direct` | CSS: request content directly, not wrapped in JS `<style>` injector |
| `?t=<13-digit-timestamp>` | Cache busting for HMR. Stripped before resolution. |

**File:** `packages/vite/src/node/utils.ts:303-345`

---

### Security Middlewares

**Invalid request rejection:** Blocks URLs containing `#`. HTTP spec doesn't allow fragment identifiers in request targets but Node.js accepts them.

**No-CORS rejection (GHSA-4v9v-hfq4-rm2v):** Blocks requests matching all three: `Sec-Fetch-Mode: no-cors` + `Sec-Fetch-Site: cross-site` + `Sec-Fetch-Dest: script`. Prevents XSS via loading HMR scripts as classic `<script>` tags. Response is a JS file that throws an error (not a silent block).

**Files:**
- `packages/vite/src/node/server/middlewares/rejectInvalidRequest.ts`
- `packages/vite/src/node/server/middlewares/rejectNoCorsRequest.ts`

---

### Error Overlay

Two delivery paths:
1. **HTTP:** Error middleware returns HTML page that imports `ErrorOverlay` from `/@vite/client`
2. **WebSocket:** `hot.send({ type: 'error', err: prepareError(err) })` broadcasts to all clients

`prepareError()` includes: message, stack, code frame, plugin name, source location.

**File:** `packages/vite/src/node/server/middlewares/error.ts`

---

### Index HTML Middleware

Transforms `index.html` before serving:
1. Injects `<script type="module" src="/@vite/client">` for HMR
2. Injects `<script type="module" src="/@vite/env">` for env variables
3. Rewrites script `src` attributes for proper base paths
4. Converts inline `<script type="module">` to external proxy modules (cached in memory, served as `/@id/__x00__/index.html?html-proxy&index=0.js`)
5. Adds `?t={timestamp}` for HMR cache busting
6. Pre-transforms referenced modules for faster first load

**File:** `packages/vite/src/node/server/middlewares/indexHtml.ts`

---

### Memory Files Middleware (Bundled Dev)

Experimental `bundledDev` mode. Pre-bundles entire app, serves from `Map<string, {source, etag}>` in memory. ETag-based 304 caching. Alternative to default transform-on-request model.

**File:** `packages/vite/src/node/server/middlewares/memoryFiles.ts`

---

### Vite Middleware Stack Order

```
1.  timeMiddleware (DEBUG only)
2.  rejectInvalidRequestMiddleware       — block URLs with #
3.  rejectNoCorsRequestMiddleware        — CORS security
4.  corsMiddleware                       — CORS headers
5.  hostValidationMiddleware             — DNS rebinding protection
6.  configureServer hooks (plugins)
7.  cachedTransformMiddleware            — 304 via ETag
8.  proxyMiddleware                      — proxy config
9.  baseMiddleware                       — non-root base path
10. HMR ping middleware                  — Accept: text/x-vite-ping → 204
11. servePublicMiddleware                — public directory
12. memoryFilesMiddleware OR transformMiddleware + serveRawFsMiddleware + serveStaticMiddleware
13. htmlFallbackMiddleware               — SPA/MPA 404 → index.html
14. configureServer post hooks
15. indexHtmlMiddleware                   — transform index.html
16. notFoundMiddleware                   — final 404
17. errorMiddleware                      — error handler
```

---

## next-browser

### How It Uses Next.js Internal Routes

**Source map resolution** (`sourcemap.ts`): Calls `/__nextjs_original-stack-frames` with 5s timeout. On failure, falls back to fetching `${path}.map` directly and decoding via `source-map-js` `SourceMapConsumer`. Also calls `get_project_metadata` via MCP to resolve relative paths to absolute.

**MCP client** (`mcp.ts`): POSTs JSON-RPC to `/_next/mcp` with `Accept: application/json, text/event-stream`. Extracts first SSE `data:` frame, parses the JSON-RPC result, and unwraps `result.content[0].text`.

**Server restart** (`browser.ts`): POSTs to `/__nextjs_restart_dev?invalidateFileSystemCache=1`, then polls `/__nextjs_server_status` every 1s for up to 30s, comparing `executionId` before vs. after to detect when the new process is ready.

---

### PPR Lock/Unlock (`next-instant-navigation-testing=1` cookie)

Uses `@next/playwright`'s `instant()` to set the `next-instant-navigation-testing=1` cookie. While locked, goto returns raw PPR shell, push blocks dynamic data.

**Two-phase capture:**
1. Lock → stabilize (poll every 300ms until suspended count stops changing, 5s deadline) → snapshot locked state
2. Unlock → release promise → cookie clears → page reloads (goto) or streams (push) → wait for DevTools reconnect → wait for all boundaries to resolve → snapshot unlocked state
3. Match locked holes against unlocked data by JSX source location → classify blockers → generate report

---

### React DevTools Wire Protocol (`tree.ts`)

Reads component tree via `__REACT_DEVTOOLS_GLOBAL_HOOK__`:
1. Gets `rendererInterfaces.get(1)` (React DOM)
2. Monkey-patches `hook.emit` to capture `"operations"` events
3. Calls `ri.flushInitialOperations()`
4. Decodes binary operations wire format:
   - Header: `[rendererID, rootID, stringTableSize, ...stringTable]`
   - String table: length-prefixed Unicode `[charCount, ...codePoints]`
   - ADD op: `[1, id, type, parentID, ownerID, displayNameStrID, keyStrID, _]`
   - Type 11 (Root): `[1, id, 11, ...4 ints]` (no parent/owner)

**Inspect:** `ri.inspectElement(rendererID, elementID, null, true)` returns dehydrated props, hooks, state, context, ownership chain — same API as DevTools sidebar.

---

### Suspense Boundary Analysis (`suspense.ts`)

Decodes op code 8 for suspense boundaries: `[8, id, parentID, nameStrID, isSuspended, numRects, ...rects]`.
Decodes op code 12 for suspense state changes: `[12, changeLen, ...changes]` where each change is `[id, hasUniqueSuspenders, endTime, isSuspended, envLen, ...envStrIDs]`.

**Blocker classification:**

| Kind | Actionability | Triggers |
|---|---|---|
| `client-hook` | 90 | usePathname, useParams, useSearchParams, useRouter, etc. |
| `request-api` | 88 | cookies(), headers(), connection(), params, searchParams, draftMode() |
| `server-fetch` | 82 | Any name containing "fetch" |
| `cache` | 74 | Name/description containing "cache" |
| `stream` | 60 | "rsc stream" |
| `unknown` | 35 | Unidentified |
| `framework` | 18 | Source in node_modules |

Actionability boosted by +8 if source frame is in user code (not node_modules), +4 if owner/awaiter name is known.

**Fix recommendations:**
- `client-hook` on route segment → "Check loading.tsx first; if null/empty, fix fallback before deeper push-down"
- `client-hook` elsewhere → "Push hook-using client UI behind smaller local Suspense"
- `request-api` / `server-fetch` → "Push async work into smaller leaf or split static siblings out"
- `cache` → "Check whether caching or runtime prefetch can move content into shell"
- `stream` → "Keep stream behind Suspense, extract static shell content outside"

**Root cause grouping:** Deduplicates blockers across boundaries by `${kind}:${name}:${file}:${line}` key. Ranked by `count * actionability`.

**Unknown suspender reasons:**
```
1 → production build (no debug info)
2 → old React version (missing tracking)
3 → thrown Promise (library using throw instead of use())
```

---

### Render Profiling (`browser.ts`)

Hooks `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` to track re-renders.

**Change detection per fiber:**
1. **Props:** Compare `memoizedProps` — walk all keys (skip `children`), report changed keys with before/after
2. **State:** Walk `memoizedState` linked list (one node per hook), report changed hook indices
3. **Context:** Walk `dependencies.firstContext` linked list, report changed context values with `displayName`
4. **Parent cascade:** If no direct changes, walk `fiber.return` to find nearest parent that triggered update

Also tracks FPS via `requestAnimationFrame` loop measuring frame-to-frame deltas.

---

### Performance Profiling (`browser.ts:perf()`)

Collects Core Web Vitals + React timing on page load:
- **TTFB:** `PerformanceNavigationTiming.responseStart - requestStart`
- **LCP:** `PerformanceObserver("largest-contentful-paint")` — startTime, size, element, url
- **CLS:** `PerformanceObserver("layout-shift")` — cumulative score, individual entries (excluding `hadRecentInput`)
- **Hydration:** React Profiling `console.timeStamp` entries with `trackGroup === "Scheduler ⚛"` and `label === "Hydrated"`
- **Component hydration:** Entries with `track === "Components ⚛"` and `color.startsWith("tertiary")`, sorted by duration

Waits 3 seconds post-load for late layout shifts and passive effects.

---

### Network Monitoring (`network.ts`)

Records all requests via Playwright events. Clears on document navigation. Extracts `next-action` header to flag Server Action calls.

Large response bodies (>4KB) spilled to temp files with extension inference:
- `application/json` → `.json`
- `text/html` → `.html`
- `text/javascript` → `.js`
- `text/x-component` → `.rsc`

---

### SSR Lock Mode (`browser.ts`)

While SSR-locked, blocks external script resources so the page renders only server-side HTML (no hydration, no client bundles). Useful for inspecting raw SSR output.

---

### Accessibility Snapshot (`browser.ts`)

Uses CDP `Accessibility.getFullAXTree` to get the full accessibility tree. Assigns `[ref=e0]`, `[ref=e1]` markers to interactive elements (buttons, links, textboxes, etc.). Stores ref map so `click("e3")` resolves to `page.getByRole(role, {name, exact: true})`.

Skips: `InlineTextBox`, `StaticText`, `LineBreak`, `none`, `generic`, `GenericContainer` (wrappers), `WebArea`/`RootWebArea`. Tracks state: checked, mixed, disabled, expanded, collapsed, selected.
