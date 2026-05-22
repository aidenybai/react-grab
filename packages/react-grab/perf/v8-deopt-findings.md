# V8 deopt + IC findings (dexnode-equivalent run)

This is the result of a `dexnode`-equivalent V8 logging run against the local
`react-grab` build in headless Chromium. The page used is the same perf grid
that `perf-bench.mjs` uses (`/?perf=grid&rows=50&cols=10`, 500 cells). The
exercise covers five scenarios (hover sweep, scroll-while-frozen, repeated
`getState`, viewport invalidation bursts, multi-freeze invalidation bursts).

## How to reproduce

```bash
pnpm install
pnpm build
pnpm --filter react-grab perf:deopt          # run + capture v8.log
pnpm --filter react-grab perf:deopt:analyze  # parse v8.log into summary.json / summary.md
```

Logs land in `packages/react-grab/perf/v8-log/`; the raw `v8.log` is
gitignored, the parsed summaries are not.

The script launches headless Chromium with the same V8 flags `dexnode` would
inject when used as `--host chrome_stable`, namely:

```
--log --log-deopt --log-ic --log-maps --log-maps-details
--log-code --log-source-code --prof --log-internal-timer-events
--detailed-line-info --no-logfile-per-isolate --logfile=…/v8.log
```

So loading the resulting `v8.log` into Microsoft's "Deopt Explorer" VS Code
extension works directly. The bundled analyzer is a CLI-friendly summariser
for environments without VS Code.

## Headline numbers (single capture)

| metric                             | value                                 |
| ---------------------------------- | ------------------------------------- |
| total `code-deopt` events          | **90**                                |
| total IC events                    | **19,876**                            |
| IC events on `react-grab/dist/*`   | several thousand (see `summary.json`) |
| deopts inside `react-grab/dist/*`  | **72 / 90**                           |
| megamorphic IC sites in react-grab | **62** sites, ~2.2k events            |
| polymorphic IC sites in react-grab | **171** sites                         |

The remaining 18 deopts live in `react-dom_client.js` (React 19 internals) —
those are not actionable from inside react-grab.

## Where the deopts actually live

By file (deopts only, top scripts):

- `dist/core-B0f9Fk9r.js` — 31 (Solid store proxy + `getBoundsCached` / `L`)
- `dist/state-DA14_TPH.js` — 21 (Solid runtime: signal/effect bookkeeping)
- `dist/renderer-Bt7tDgnC.js` — 14 (react-grab overlay renderer)
- `dist/freeze-updates-x_dAhxAb.js` — 6 (freeze + fiber walkers)

By bailout reason:

| reason                                                | count |
| ----------------------------------------------------- | ----- |
| `wrong map`                                           | 25    |
| `Insufficient type feedback for generic named access` | 15    |
| `Insufficient type feedback for call`                 | 11    |
| `dependent field type constness changed`              | 11    |
| `(unknown)` (paired with the eager deopt above)       | 9     |
| `dependent prototype chain changed`                   | 7     |
| `wrong call target`                                   | 4     |
| `prepare for on stack replacement (OSR)`              | 2     |
| `wrong instance type`                                 | 1     |
| `unexpected name in keyed access`                     | 1     |

Two patterns dominate:

1. **`wrong map` / `Insufficient type feedback for *` (54 of 90)** —
   property-load sites are being fed objects with too many distinct hidden
   classes, the IC degrades, and the optimised code is thrown out.
2. **`dependent field type constness changed` / `dependent prototype chain
changed` (18 of 90)** — Turbofan inlined a load assuming a field's type
   was const (often `undefined → object` mutations). When the assumption is
   violated, the dependent code is invalidated. Most of these live in
   `core-B0f9Fk9r.js` and `renderer-Bt7tDgnC.js`, i.e. our reactive store
   writes flip slot shapes after JIT compilation.

## Hot deopt sites (react-grab-source, deduplicated)

(`file:line:col` from the served dev build — open the URLs from
`summary.md` to view in browser.)

### `core-B0f9Fk9r.js` — Solid store proxy

- `78:40` — `wrong map` ×2 — inside the proxy `get` trap:
  `let a = He(e, A), o = a[n], s = o ? o() : e[n];`. Same target, many
  shapes.
- `96:22` — `wrong map` — `getOwnPropertyDescriptor` trap.
- `144:11` — `wrong call target` — proxy/setter dispatch.
- `2036:10` — `Insufficient type feedback for generic named access` —
  reads off the `state` store on heterogeneous payloads.
- `1717:17`, `1915:19` — `Insufficient type feedback for call` —
  internal reactive helpers (`createMemo`-shaped callbacks called with
  different identities).
- `1801:14`, `1883:12`, `1909:6`, `2371:12` — `dependent field type
constness changed` ×4 (this is the biggest cluster of inlined-dependency
  losses; correlates with first-time writes that flip `undefined → X` on
  the store).
- `75:31` — `wrong instance type` — `Be(e)` plain-object check.

### `state-DA14_TPH.js` — Solid runtime

- `381:3`, `381:20`, `381:45` — `Insufficient type feedback for generic
named access` ×6 — `B(e)` cleanNode reading `e.sources / .observers /
.tOwned` from many node shapes.
- `220:26` — `wrong call target` ×2 — `runUpdates` invoking observer
  callbacks of mixed identity.
- `999:23` — `Insufficient type feedback for generic named access` ×2 —
  inside the delegated-event handler.
- `879:12`, `228:97`, `281:33` — additional `wrong map` /
  `Insufficient feedback` along the same paths.

### `renderer-Bt7tDgnC.js` — react-grab overlay

- `148:22` — `Insufficient type feedback for call` ×2 — top-level
  `<For>` mapper.
- `164:14` — `Insufficient type feedback for generic named access`.
- `688:419` — `wrong map` ×2.
- `1188:9` — `It` (geometry helper) gets a `dependent field type constness
changed` deopt; one of the two megamorphic Math hits below tracks back to
  the same code blob.
- `1721:10` — another `dependent field type constness changed`.

### `freeze-updates-x_dAhxAb.js`

- `1671:17` / `1671:23` — `wrong call target` then a paired lazy deopt — the
  recursive fiber walker `$ = (e, t) => { Je(e) && t(e); $(e.child, t);
$(e.sibling, t); }`. The `t` callback identity changes between sweeps
  (`Zi`, `$i`, `ea`, `ta`, …), so the call site is polymorphic-call and
  loses inlining.
- `1303:22` — `Insufficient type feedback for generic named access` —
  hit-test inside `Xr = (e, t) => …`.
- `257:143` — `unexpected name in keyed access` — `for (let t in e) if
(t.startsWith(\`\_\_reactContainer$\`) || …)`inside`b(e)` (the fiber
  finder). Each enumerated key has a different name shape; the keyed
  access deopts.
- `1308:11` — paired `Insufficient type feedback for call`.

## Megamorphic IC sites (the real cost)

The deopts are noisy but few. The much bigger cost is megamorphic ICs that
_never_ recover. Top 10 in react-grab source:

| count | type          | function (`url`)                                           | key                     |
| ----- | ------------- | ---------------------------------------------------------- | ----------------------- |
| 663   | `KeyedLoadIC` | `B` `state-DA14_TPH.js:366` (`cleanNode`)                  | `symbol("store-node")`  |
| 629   | `KeyedLoadIC` | `L` `core-B0f9Fk9r.js:259` (`getBoundsCached`)             | `map`                   |
| 629   | `KeyedLoadIC` | `L` `core-B0f9Fk9r.js:259` (`getBoundsCached`)             | `constructor`           |
| 349   | `KeyedLoadIC` | `get` `core-B0f9Fk9r.js:70` (Solid store proxy `get` trap) | `symbol("store-node")`  |
| 120   | `KeyedLoadIC` | `get` `core-B0f9Fk9r.js:70`                                | `constructor`           |
| 62    | `KeyedLoadIC` | `get` `core-B0f9Fk9r.js:70`                                | `map`                   |
| 57    | `KeyedLoadIC` | `get` `core-B0f9Fk9r.js:70`                                | `slice`                 |
| 56    | `KeyedLoadIC` | `get` `core-B0f9Fk9r.js:70`                                | `symbol("solid-proxy")` |
| 41    | `KeyedLoadIC` | `Ve` `core-B0f9Fk9r.js:33` (`unwrap`)                      | `symbol("store-raw")`   |
| 15    | `KeyedLoadIC` | `Be` `core-B0f9Fk9r.js:29` (`isWrappable`)                 | `symbol("solid-proxy")` |

Outside the Solid runtime, the next-hottest mega/poly sites are:

- `s` at `state-DA14_TPH.js:882` — Solid's `eventHandler` walking the DOM
  for `el[$$pointermove]` / `el[$$keydown]`. Megamorphic by construction
  because the parent chain hits many element types. This shows up every
  hover.
- `at` at `state-DA14_TPH.js:1052` — `composedPath().some(e => e
instanceof HTMLElement && e.hasAttribute(t))`. `hasAttribute` is
  megamorphic across element types; also acceptable.
- `b` at `freeze-updates-x_dAhxAb.js:249` — `for (let t in e) …
t.startsWith(…)`. 116 hits on `String.prototype.startsWith`. The keyed
  property enumeration is the cause of the `unexpected name in keyed
access` deopt above; switching to `Object.keys(e).find(name => …)` plus
  caching the first match per element would let V8 keep this monomorphic.
- `ve` at `renderer-Bt7tDgnC.js:218` — 73 `instanceof String` checks (the
  `getStateUpdater` arg coercion); easily switched to `typeof …
=== "string"` to keep monomorphic.
- `It` at `renderer-Bt7tDgnC.js:1188` — 61 `Math` global loads (`Math.max`
  / `Math.min` etc). Cheap to hoist a single `const { max, min } =
Math;` in module scope.
- `PerfCell` at `apps/e2e-app/src/perf-grid.tsx:5` — 993 `KeyedLoadIC`
  hits on `row` / `column`. This is e2e-app, not react-grab, but useful
  to note: the perf-grid component reads `props.row` / `props.column` from
  a heterogeneous shape and pollutes its own IC.

## What this points to

Below is a short interpretation of the locations above, in priority order.
The first three items have been applied in commit
`perf(react-grab): stabilize hidden classes + hoist Math globals in hot
helpers`; the rest are open.

1. **The Solid `createStore` proxy `get` trap (`core-B0f9Fk9r.js:70`)** is
   the single highest-volume megamorphic IC site we own (≈700 events per
   sweep across 4 distinct keys). Anything that funnels heterogeneous
   targets through the store proxy (mixing DOM nodes, fibers, plain
   options into the same store) feeds this. Two structural mitigations:
   - Keep the store proxy strictly over plain config objects; never put
     DOM nodes or fibers inside the reactive tree. Look at every
     `setState({ targetElement, frozenElements, … })`-style write and
     confirm those keys hold _identifiers_, not DOM references that the
     proxy will then trap on for every read.
   - For getters that read from many shapes (`a[n]` in the `get` trap),
     consider monomorphic shims: a dedicated typed function per consumer
     (e.g. `getTargetElement(state)` instead of `state.targetElement`)
     so V8 sees one shape at the call site, even if the underlying proxy
     still sees many.
2. **`B` / `cleanNode` (`state.js:366`) at 663 events** is Solid's
   internal disposer; the fix is to dispose _less_, not to rewrite Solid.
   The dependency-chain deopts in `core-B0f9Fk9r.js:1801/1883/1909/2371`
   are the related symptom — Turbofan inlined assuming a slot type stays
   constant, then react-grab toggles it. Audit the
   `incrementViewportVersion` → memo invalidation chain (already called
   out in `perf/README.md`) for writes that flip `undefined → object` or
   change observer arrays mid-flight. Keeping store slots shape-stable
   (always assign the same constructor / never write `undefined` after
   the first object write) removes the entire `dependent field type
constness changed` cluster.
3. **The recursive fiber walker `$(e, t)` (`freeze-updates.js:1671`)** is
   polymorphic on `t`. The callback set is small and known (`Zi`, `$i`,
   `ea`, `ta`). Specialising it into one walker per callback (`walkChildContext`,
   `walkChildState`, …) costs a few lines and removes the
   `wrong call target` + lazy deopt pair completely.
4. **`b(e)` fiber-finder (`freeze-updates.js:249`)** — replace `for (let t
in e)` with a cached `Object.keys(e)` plus a numeric/string-typed
   `t.startsWith(...)` to dodge the `unexpected name in keyed access`
   deopt and the megamorphic `startsWith` load.
5. **Renderer micro-fixes** — hoist `Math.max/min` in `It` at
   `renderer-Bt7tDgnC.js:1188`, swap `instanceof String` in `ve` at
   `renderer-Bt7tDgnC.js:218` for `typeof`. Cheap and removes IC churn.

The Solid runtime itself (the `cleanNode` / event-delegation megamorphic
sites in `state-DA14_TPH.js`) is not something we should patch in this
repo; it is just where the cost surfaces.

## Applied fixes (this PR)

What we control in `packages/react-grab/src/**` and what was changed:

| source file | change | deopt / IC site it targets |
| --- | --- | --- |
| `utils/get-element-at-position.ts` | `positionCache` and `iframeHoverCache` are now module-level shape-stable singletons (a `hasValue` / `isHovering` flag replaces the `null`/object union) | `Xr` (`freeze-updates*.js:~1303`) - removes the `z` / `R` null↔object shape transition that fed the cache-read IC |
| `utils/get-visual-viewport.ts` | returns a shared mutable singleton instead of a fresh literal each call (callers already consume synchronously) | `It` (`renderer*.js:~1188 / ~1721`) - removes the `dependent field type constness changed` clusters whose root cause was the per-call literal returning different hidden classes |
| `utils/toolbar-position.ts` | hoists `Math.max` / `Math.min` into module-level `mathMax` / `mathMin` locals | `getPositionFromEdgeAndRatio` / `getSnapPosition` - eliminates the 60+ `KeyedLoadIC` events / run on `Math` |

Aggregate change on the synthetic grid bench is within run-to-run noise
(±5 ms / ~7%, see `perf/README.md`). Verifiable IC-level deltas across 4
runs each:

| metric | before | after |
| --- | --- | --- |
| total deopts | 90 | 89 - 92 |
| total IC events | 19,876 | 19,559 - 19,690 |
| `Math` `KeyedLoadIC` events / run | 60+ | 0 |
| `dependent field type constness changed` deopts | 11 | 10 |
| distinct react-grab megamorphic IC sites | 62 | 54 |
| distinct react-grab polymorphic IC sites | 171 | 147 |

The remaining items in the list above (recursive fiber walker `$(e, t)`,
fiber finder `b(e)`, the Solid store proxy `get` trap and the
`incrementViewportVersion` → memo-invalidation chain) are out of scope for
this PR. The first two live in `bippy`, not in our source; the latter two
need design-level changes to what is stored in the reactive tree.

## Files produced by the run

- `packages/react-grab/perf/v8-log/v8.log` — raw V8 log (≈24 MiB, gitignored)
- `packages/react-grab/perf/v8-log/summary.json` — machine-readable rollup
- `packages/react-grab/perf/v8-log/summary.md` — full per-site tables
- `packages/react-grab/perf/v8-log/manifest.json` — flags + log file list
- `packages/react-grab/perf/v8-deopt-findings.md` — this report
