# Prehit: Pre-indexed Element Hit Testing

An alternative to `elementsFromPoint` that eliminates per-hover style recalculations by pre-indexing element bounding rects into a spatial index at activation time.

## Problem

Every hover detection currently costs 1-5ms on dense DOMs because `elementsFromPoint` forces a synchronous style recalculation. This recalc is triggered by the `pointer-events: none` stylesheet toggle needed for hit-testing. The cost scales with DOM size and CSS complexity.

```
Current hot path (per hover, 1-5ms):
  suspendPointerEventsFreeze()     ← toggles <style>, dirties style tree
  elementsFromPoint(x, y)         ← forces full Recalculate Style
  per-element: getComputedStyle   ← reads from recalced styles
  scheduleResume()                ← will dirty styles again
```

## Insight

The page is **frozen** during selection mode. `freezeGlobalAnimations` pauses all animations and transitions. `freezeUpdates` intercepts React state updates. Nothing moves. This means element positions measured at activation time remain valid for the entire session.

This is the same invariant that makes [pretext](https://github.com/chenglou/pretext) work: text is immutable after `prepare()`, so `layout()` can be pure arithmetic on cached numbers. Our DOM is immutable after activation, so `query()` can be pure arithmetic on cached rects.

## Design

### Phase 1: `index()` (runs once at activation, async, zero reflow)

Use `IntersectionObserver` to collect element bounding rects without forcing synchronous reflow. IO entries include `boundingClientRect` as part of the browser's normal rendering pipeline -- the browser already computed these positions; IO just exposes them.

```typescript
interface IndexedElement {
  element: Element
  left: number      // page-relative (viewport + scrollX)
  top: number       // page-relative (viewport + scrollY)
  right: number
  bottom: number
  area: number      // precomputed for smallest-element selection
  treeOrder: number  // DOM tree order for z-order proxy
}

const indexElements = (): void => {
  const elements: IndexedElement[] = []
  let treeOrder = 0

  const observer = new IntersectionObserver((entries) => {
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    for (const entry of entries) {
      const rect = entry.boundingClientRect
      if (rect.width === 0 || rect.height === 0) continue

      elements.push({
        element: entry.target,
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        right: rect.right + scrollX,
        bottom: rect.bottom + scrollY,
        area: rect.width * rect.height,
        treeOrder: treeOrderMap.get(entry.target) ?? 0,
      })
      observer.unobserve(entry.target)
    }

    buildSpatialIndex(elements)
  })

  // Walk DOM tree: observe each element and record tree order
  const treeOrderMap = new Map<Element, number>()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
  while (walker.nextNode()) {
    const element = walker.currentNode as Element
    treeOrderMap.set(element, treeOrder++)
    observer.observe(element)
  }
}
```

**Why IO is free:** the IO callback fires after the browser's rendering pipeline completes (style recalc -> layout -> paint -> IO callbacks). At that point, `boundingClientRect` is just reading from the already-computed layout. No forced reflow.

**Why page coordinates:** storing `rect.left + scrollX` makes the index scroll-invariant. Scroll changes viewport-relative positions but not page-relative ones. Only actual layout changes (resize, DOM mutation) would invalidate the index -- and those can't happen because the page is frozen.

### Phase 2: Build spatial index (runs once, ~1ms)

Use a [Flatbush](https://github.com/mourner/flatbush) packed Hilbert R-tree for O(log n) point queries. Flatbush is 462 lines of JavaScript with zero dependencies (the `neighbors()` method uses `flatqueue` but we don't need it). We vendor a TypeScript port.

```typescript
import { Flatbush } from "../vendor/flatbush.js"

const buildSpatialIndex = (elements: IndexedElement[]): void => {
  const index = new Flatbush(elements.length)

  for (const element of elements) {
    index.add(element.left, element.top, element.right, element.bottom)
  }
  index.finish()

  spatialIndex = { index, elements }
}
```

**How Flatbush works:**

1. `add(minX, minY, maxX, maxY)` stores rects in a flat `Float64Array` (4 floats per rect)
2. `finish()` computes a Hilbert curve value for each rect's center, sorts rects by Hilbert value (spatial locality), then builds parent bounding boxes bottom-up in `nodeSize`-wide groups
3. `search(minX, minY, maxX, maxY)` walks the tree top-down, pruning branches whose bounding box doesn't intersect the query. Returns indices of matching leaf rects.

The Hilbert sort ensures spatially close rects are stored near each other in memory, giving good cache performance on queries.

### Phase 3: `query(x, y)` (runs per hover, ~0.005ms)

Pure arithmetic. No DOM reads. No style recalc. No pointer-events toggle.

```typescript
const queryElement = (clientX: number, clientY: number): Element | null => {
  if (!spatialIndex) return null

  const pageX = clientX + window.scrollX
  const pageY = clientY + window.scrollY

  // O(log n) spatial query
  const hitIndices = spatialIndex.index.search(pageX, pageY, pageX, pageY)
  if (hitIndices.length === 0) return null

  // Among hits, prefer smallest area. Tiebreak by DOM tree order (higher = painted later = on top).
  let bestElement: IndexedElement | null = null

  for (const hitIndex of hitIndices) {
    const candidate = spatialIndex.elements[hitIndex]
    if (!bestElement) {
      bestElement = candidate
      continue
    }

    if (candidate.area < bestElement.area) {
      bestElement = candidate
    } else if (candidate.area === bestElement.area && candidate.treeOrder > bestElement.treeOrder) {
      bestElement = candidate
    }
  }

  return bestElement?.element ?? null
}
```

## Z-Order

The spatial index doesn't know visual stacking order. Three approaches, in order of cost:

### 1. DOM tree order (zero cost, handles 99% of cases)

Recorded during the tree walk at index time. Later in tree = painted later = visually on top (for siblings in the same stacking context). Used as a tiebreaker when two candidates have the same area.

### 2. `stacking-order` comparison (cheap in frozen state)

[Rich Harris's `stacking-order`](https://github.com/Rich-Harris/stacking-order) (111 lines) computes pairwise visual ordering by walking ancestor chains and comparing stacking contexts. Uses `getComputedStyle`, which is a cache read (no recalc) inside the IO callback since the browser just rendered.

We vendor a TypeScript port and use it only for Flatbush query results (typically 3-5 elements), not for the full element set:

```typescript
import { compareStackingOrder } from "../vendor/stacking-order.js"

// Only among the 3-5 Flatbush hits at this point:
hits.sort((a, b) => compareStackingOrder(a.element, b.element))
```

Cost per query: ~5 pairwise comparisons * ~10 `getComputedStyle` reads (cached) = ~0.05ms. Negligible compared to the current 1-5ms.

### 3. `elementsFromPoint` fallback (expensive, last resort)

For edge cases where the above heuristics fail. In practice this should almost never fire.

## Activation Timeline

```
activation event
  ├── freezeGlobalAnimations()       ← pauses animations/transitions (page is now static)
  ├── freezePseudoStates()           ← pointer-events: none, freeze :hover/:focus
  ├── TreeWalker assigns treeOrder   ← O(n) integer increments
  └── IO.observe(all elements)       ← async, schedules observation

next rendering opportunity (browser does this anyway):
  ├── Style recalculation            ← resolves freeze stylesheets
  ├── Layout                         ← computes element positions
  ├── Paint                          ← renders
  └── IO callback fires              ← entries have free boundingClientRect
       ├── Collect rects (page coords)
       ├── Build Flatbush (~1ms for 500 elements)
       └── Index is ready

every subsequent hover (for entire session):
  └── queryElement(clientX, clientY)  ← O(log n), ~0.005ms, no DOM

deactivation:
  ├── Discard spatial index
  ├── unfreezeGlobalAnimations()
  └── unfreezePseudoStates()
```

**Gap handling:** between activation and the IO callback (~1 frame, ~16ms), the index isn't ready. During this window, fall back to the current `elementsFromPoint` path. After the first frame, all subsequent hovers use the spatial index.

## What This Eliminates

| Operation | Current (per hover) | With Prehit (per hover) |
|---|---|---|
| pointer-events stylesheet toggle | Every 32ms | Never (only on fallback) |
| `elementsFromPoint` | Every 32ms (forces style recalc) | Never (only on fallback) |
| `getComputedStyle` | Per candidate element | Never (index precomputed) |
| Style recalculation | 1-5ms per detection | 0ms |
| **Total per-hover cost** | **1-5ms** | **~0.005ms** |

## Vendored Dependencies

Both libraries are small enough to vendor as TypeScript ports rather than adding npm dependencies:

### Flatbush (from [mourner/flatbush](https://github.com/mourner/flatbush))

- 462 lines of JavaScript, ISC license
- Packed Hilbert R-tree: O(n) build, O(log n) search
- Internally stores rects in a flat `Float64Array` with `Uint16Array`/`Uint32Array` indices
- We only need `add()`, `finish()`, `search()`. The `neighbors()` method (k-nearest-neighbors) and its `flatqueue` dependency can be dropped.
- Port to TypeScript, remove `from()` serialization (we don't need cross-thread transfer), remove `neighbors()`.

### stacking-order (from [Rich-Harris/stacking-order](https://github.com/Rich-Harris/stacking-order))

- 111 lines of JavaScript, MIT license
- Pairwise comparison: walks ancestor chains, finds lowest common ancestor, checks stacking contexts, compares z-index, falls back to DOM sibling order
- Port to TypeScript with proper typing. Can drop `webkit`-prefixed property checks (not needed for modern browsers).

## Limitations

- **1-frame startup latency:** the IO callback fires after the next rendering opportunity. First ~16ms falls back to `elementsFromPoint`.
- **Scroll accuracy:** page-coordinate storage handles scroll correctly, but if the user scrolls during selection mode, elements that scroll into view from off-screen won't be indexed. Acceptable because the freeze prevents most scroll-triggering interactions.
- **CSS transforms:** `getBoundingClientRect` (via IO) returns the transformed rect. Rotated or skewed elements have axis-aligned bounding boxes that are larger than the visual element. This could cause false positives in the spatial query, but the smallest-area heuristic mitigates it.
- **Dynamic content:** if the freeze doesn't catch some mutation (e.g., a CSS animation that started before freeze took effect), the index could be stale. The freeze is designed to prevent this, but edge cases exist.
- **Shadow DOM:** `TreeWalker` doesn't cross shadow boundaries by default. Elements inside shadow roots (other than react-grab's own) won't be indexed. This is acceptable because shadow DOM content is typically self-contained.

## Comparison to pretext

| Aspect | pretext | prehit |
|---|---|---|
| **"prepare" phase** | Canvas `measureText` per word segment | IO `boundingClientRect` per element |
| **"layout" phase** | Walk cached widths, count lines (arithmetic) | Flatbush `search()`, pick smallest (arithmetic) |
| **Immutability guarantee** | Text doesn't change between prepare and layout | DOM is frozen between index and query |
| **Cache granularity** | Per segment x font (`Map<string, Map<string, Metrics>>`) | Per element (`Float64Array` in Flatbush) |
| **Invalidation** | `clearCache()` on locale/font change | Discard index on deactivation |
| **Hot path cost** | ~0.0002ms per text block | ~0.005ms per point query |
