# Performance Learnings

Patterns studied from Inferno, SolidJS, ivi, and pretext that inform react-grab's element detection pipeline.

## Detection Pipeline

```
pointermove (every ~8ms, browser-fired)
  -> 32ms throttle gate (ELEMENT_DETECTION_THROTTLE_MS)
    -> setTimeout(0) macrotask deferral
      -> position cache (2px distance + 16ms time gate)
        -> suspendPointerEventsFreeze (O(1) stylesheet toggle)
        -> elementsFromPoint (forces style recalc -- dominant cost)
        -> per-element: visibilityCache check (WeakMap, 50ms TTL)
        -> per-element: getComputedStyle (only on cache miss)
        -> per-element: clientWidth * clientHeight (area comparison)
        -> scheduleResume (100ms debounced pointer-events restore)
```

The style recalculation from the pointer-events toggle is 95%+ of detection cost (1-5ms on dense DOMs). Everything after it (per-element checks, area comparison) is <0.1ms.

## Why setTimeout(0) for Detection Scheduling

| Primitive | Where it runs | Latency | Frame budget impact |
|---|---|---|---|
| `scheduler.postTask("background")` | Background task | 350ms-5000ms (starved on busy pages) | None |
| `queueMicrotask` | Before paint | ~0ms | Blocks frame |
| `requestAnimationFrame` | Render pipeline | ~16ms | Eats frame budget |
| `setTimeout(0)` | Separate macrotask | ~1ms | None |

`queueMicrotask` is wrong here despite being the standard choice for UI frameworks. ivi, Preact, and Solid all use it for state batching:

```javascript
// ivi: microtask for dirty check flush
export const createRoot = defineRoot((root) => {
  _queueMicrotask(() => {
    _dirtyCheckRoot(root, 0);
  });
});

// Preact: microtask for render queue
export function enqueueRender(c) {
  // ...
  (prevDebounce || queueMicrotask)(process);
}

// Solid: microtask via runUpdates
function runUpdates(fn, init) {
  if (Updates) return fn();
  Updates = [];
  ExecCount++;
  // ... flush after fn() returns
}
```

Those frameworks schedule lightweight JS work (dirty flag walks, VDOM diffs). Our detection forces the browser's layout engine via `elementsFromPoint`, which is categorically heavier and should not block the current frame's paint.

`scheduler.postTask("background")` was the original implementation. Runtime instrumentation on nisarg.io confirmed multi-second starvation:

```json
{"message":"onIdle detection","data":{"idleDelayMs":5010}}
{"message":"onIdle detection","data":{"idleDelayMs":350}}
```

Only 2 detections in 7 seconds of hovering. The background priority was starved by React renders and CSS animations.

`setTimeout(0)` fires in ~1ms as a separate macrotask. No nesting-based 4ms clamping applies because each call originates from a distinct pointermove handler:

```typescript
// handlePointerMove (called from pointermove event handler)
setTimeout(() => {
  const candidate = getElementAtPosition(
    elementDetectionState.latestPointerX,
    elementDetectionState.latestPointerY,
  );
  if (candidate !== store.detectedElement) {
    actions.setDetectedElement(candidate);
  }
  elementDetectionState.pendingDetectionScheduledAt = 0;
});
```

After the fix, detection runs at ~26ms intervals (matching the 32ms throttle + macrotask overhead).

## Techniques Applied

### Smallest-element selection

**Inspired by:** pretext's two-phase pattern (prepare once, compute cheaply).

pretext separates expensive measurement from cheap arithmetic:

```typescript
// pretext: prepare() measures via canvas, layout() does pure arithmetic
function prepare(text, font) {
  // segments text, measures each word via canvas, caches widths
  // call once when text first appears
}

function layout(prepared, maxWidth, lineHeight) {
  // walks cached word widths with pure arithmetic
  // ~0.0002ms per text block, call on every resize
  const lineCount = countPreparedLines(getInternalPrepared(prepared), maxWidth);
  return { lineCount, height: lineCount * lineHeight };
}
```

Our detection applies this principle. `elementsFromPoint` is the expensive "prepare" (z-ordered stack with forced style recalc). The smallest-area selection is the cheap "layout" (integer arithmetic on cached values):

```typescript
// react-grab: elementsFromPoint is "prepare", area comparison is "layout"
const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
let result: Element | null = null;
let smallestArea = Infinity;

for (const candidateElement of elementsAtPoint) {
  if (!isValidGrabbableElement(candidateElement)) continue;
  const area = candidateElement.clientWidth * candidateElement.clientHeight;
  if (area < smallestArea) {
    smallestArea = area;
    result = candidateElement;
  }
}
```

This naturally selects the most specific content element. A decorative overlay div covering an entire card (380x115 = 43,700 area) loses to the `<p>` inside it (200x48 = 9,600 area). No heuristic filtering needed.

### Visibility cache with WeakMap

**Inspired by:** ivi (template descriptor cache), pretext (line text cache).

ivi caches compiled template descriptors keyed by `TemplateStringsArray` identity:

```typescript
// ivi: WeakMap keyed by template literal identity
const DESCRIPTORS = new WeakMap<TemplateStringsArray, (exprs: any[]) => VAny>();

export const html = (strings: TemplateStringsArray, ...exprs: any[]) => {
  let fn = DESCRIPTORS.get(strings);
  if (fn === void 0) {
    fn = compileTemplate(strings);
    DESCRIPTORS.set(strings, fn);
  }
  return fn(exprs);
};
```

pretext caches grapheme splits keyed by prepared handle, using `WeakMap` so entries are GC'd when the handle is dropped:

```typescript
// pretext: WeakMap allows GC without explicit invalidation
let sharedLineTextCaches = new WeakMap<
  PreparedTextWithSegments,
  Map<number, string[]>
>();
```

react-grab's `visibilityCache` follows the same pattern. Elements that leave the DOM are GC'd automatically. The 50ms TTL is generous enough that within a single detection pass (~5ms), all cache entries remain valid:

```typescript
// react-grab: WeakMap<Element> + TTL for automatic cleanup
let visibilityCache = new WeakMap<Element, VisibilityCache>();

// in isValidGrabbableElement:
const cached = visibilityCache.get(element);
if (cached && now - cached.timestamp < VISIBILITY_CACHE_TTL_MS) {
  return cached.isVisible; // skip getComputedStyle + all checks
}
```

### clientWidth/clientHeight over getBoundingClientRect

**Inspired by:** Inferno's `nodeValue` over `textContent` (avoiding unnecessary work for the same result).

Inferno uses `CharacterData.nodeValue` for text updates instead of `Element.textContent`, because `textContent` goes through a more expensive parser path:

```typescript
// Inferno: nodeValue is a direct CharacterData mutation
if (nextText !== lastVNode.children) {
  (dom as Text).nodeValue = nextText;
}
```

Similarly, `clientWidth * clientHeight` reads plain integer properties from the layout cache. `getBoundingClientRect()` constructs a `DOMRect` object with fractional coordinates we don't need for area comparison. Both read from the same layout (already computed by `elementsFromPoint`), but the property read avoids per-element object allocation:

```typescript
// Allocation: constructs a DOMRect with x, y, width, height, top, right, bottom, left
const { width, height } = element.getBoundingClientRect();
const area = width * height;

// No allocation: reads integer properties directly from the layout cache
const area = element.clientWidth * element.clientHeight;
```

### O(1) pointer-events toggle via inherited CSS

**Inspired by:** Inferno's `EMPTY_OBJ` singleton (one object, reference equality for fast skipping).

The pointer-events freeze applies `pointer-events: none` on `<html>` rather than `*`. Since `pointer-events` is inherited, toggling it on a single root element is O(1) style invalidation instead of O(N) for every DOM node:

```typescript
// O(N): every node gets its own style invalidation
const POINTER_EVENTS_STYLES = "* { pointer-events: none !important; }";

// O(1): one root toggle, inherited by all descendants
const POINTER_EVENTS_STYLES = "html { pointer-events: none !important; }";
```

This was changed after observing visible lag on dense DOMs like GitHub diff viewers with 10k+ nodes.

### Debounced pointer-events resume

The pointer-events stylesheet is suspended (disabled) before `elementsFromPoint` for hit-testing. Instead of re-enabling synchronously (which would force another style invalidation), the resume is debounced to 100ms:

```typescript
const scheduleResume = (): void => {
  if (resumeTimerId !== null) {
    clearTimeout(resumeTimerId);
  }
  resumeTimerId = setTimeout(() => {
    resumeTimerId = null;
    resumePointerEventsFreeze();
  }, POINTER_EVENTS_RESUME_DEBOUNCE_MS);
};
```

On rapid successive detections (every 32ms), `cancelScheduledResume` prevents the resume from firing, so the stylesheet stays disabled. This makes the `suspendPointerEventsFreeze` call a no-op on the next detection (stylesheet is already disabled). The resume only fires after 100ms of no detection activity.

## Techniques Studied but Not Applied

### Bitwise flags for type dispatch (Inferno, ivi)

Inferno encodes vnode type in a single integer. One `&` tests a bit vs multiple property reads:

```typescript
// Inferno: bitmask dispatch
export const enum VNodeFlags {
  HtmlElement = 1,
  ComponentClass = 1 << 2,
  ComponentFunction = 1 << 3,
  Text = 1 << 4,
  SvgElement = 1 << 5,
  Element = HtmlElement | SvgElement | FormElement,
  Component = ComponentFunction | ComponentClass,
}

// One integer test replaces multiple string comparisons
if (nextFlags & VNodeFlags.Element) {
  patchElement(lastVNode, nextVNode, context, isSVG, lifecycle, animations);
} else if (nextFlags & VNodeFlags.ComponentClass) {
  // ...
}
```

ivi packs type + dirty + update flags in one word:

```typescript
// ivi: combined type/state flags
export const enum Flags {
  Template = 1,
  Component = 1 << 1,
  Dirty = 1 << 7,
  DirtySubtree = 1 << 8,
  ForceUpdate = 1 << 9,
  TypeMask = (1 << 7) - 1,
}

// One & extracts type, another checks dirty
const type = flags & Flags.TypeMask;
if (flags & Flags.DirtySubtree) { /* recurse */ }
```

**Not applied** because react-grab's `isValidGrabbableElement` checks are attribute-based (`hasAttribute`, `closest`) and CSS-based (`getComputedStyle`), not type-based. The checks don't map to a fixed set of bits.

### Monotonic generation counter (Solid)

Solid increments `ExecCount` once per update cycle. A computation with `updatedAt >= ExecCount` is already current and can be skipped:

```typescript
// Solid: monotonic epoch prevents redundant recomputation
ExecCount++;

function runTop(node) {
  if (node.state === 0) return; // already clean
  const ancestors = [node];
  while (
    (node = node.owner) &&
    (!node.updatedAt || node.updatedAt < ExecCount)
  ) {
    if (node.state) ancestors.push(node);
  }
  // run ancestors root-to-leaf
  for (let i = ancestors.length - 1; i >= 0; i--) {
    updateComputation(ancestors[i]);
  }
}
```

**Not applied** because react-grab's 50ms visibility cache TTL already provides within-pass deduplication (a detection pass takes <5ms).

### Dirty flag propagation with early exit (ivi)

ivi's `invalidate` stops walking ancestors when one already has `DirtySubtree`:

```typescript
// ivi: O(depth) invalidation with early exit
export const invalidate = (c: Component): void => {
  if (!(c.f & Flags.Dirty)) {
    c.f |= Flags.Dirty;
    let parent = c.p;
    while (parent !== null) {
      if (parent.f & Flags.DirtySubtree) return; // already marked
      parent.f |= Flags.DirtySubtree;
      parent = parent.p;
    }
  }
};
```

**Not applied** because react-grab doesn't maintain a component tree. Detection is a flat iteration over `elementsFromPoint` results.

### Swap-remove for O(1) array unlinking (Solid)

Solid's `cleanNode` avoids O(n) array splice by popping from the end and swapping into the removed slot:

```typescript
// Solid: O(1) observer removal
function cleanNode(node) {
  while (node.sources.length) {
    const source = node.sources.pop();
    const index = node.sourceSlots.pop();
    const obs = source.observers;
    if (obs && obs.length) {
      const n = obs.pop();           // take last
      const s = source.observerSlots.pop();
      if (index < obs.length) {
        n.sourceSlots[s] = index;    // update back-pointer
        obs[index] = n;              // swap into removed slot
        source.observerSlots[index] = s;
      }
    }
  }
}
```

**Not applied** because react-grab doesn't maintain observer/subscription arrays.

### Node.prototype patching for hidden class uniformity (Inferno)

Inferno adds properties to `Node.prototype` to prevent ad-hoc expandos from creating divergent hidden maps:

```typescript
// Inferno: V8 hidden class fix
if (window.Node) {
  // Defining $EV and $V properties on Node.prototype
  // fixes v8 "wrong map" de-optimization
  (Node.prototype as any).$EV = null;
  (Node.prototype as any).$V = null;
}
```

**Not applied** because react-grab doesn't add expando properties to DOM nodes.

### Object.seal for JIT map elimination (ivi)

ivi seals hot-path context objects so V8 can eliminate shape checks:

```typescript
// ivi: sealed object for JIT optimization
const RENDER_CONTEXT = { p: null, n: null, e: null };
Object.seal(RENDER_CONTEXT);
// "JIT can eliminate object map checks"
```

**Not applied** because react-grab's hot-path objects are already small and stable-shaped.

### Local const aliases of globals (ivi)

ivi caches global functions as module-level `const` to help the JIT inline and eliminate override checks:

```typescript
// ivi: local aliases for JIT inlining
const _queueMicrotask = queueMicrotask;
const _requestAnimationFrame = requestAnimationFrame;
const _requestIdleCallback = requestIdleCallback;
const _isArray = Array.isArray;
```

react-grab already does this for `requestAnimationFrame` (via `native-raf.ts` which reads from `Window.prototype` to bypass GSAP freeze wrappers), but doesn't apply the pattern broadly since the detection hot path makes few global calls.

### IntersectionObserver for reflow-free measurement

IO entries include `boundingClientRect` without triggering synchronous reflow. However:

- IO is async (1-frame latency), detection needs sync results
- IO doesn't provide z-order information (which elements are on TOP at a point)
- After `elementsFromPoint` forces layout, `clientWidth`/`clientHeight` reads are already free (layout is cached from the forced recalc)

The IO pattern is powerful for different use cases (virtual scrolling, lazy loading, resize-responsive layouts) but does not help with point-based hit-testing.

### Int32Array for keyed reconciliation (Inferno, ivi)

Both Inferno and ivi use `Int32Array` for LIS (longest increasing subsequence) in keyed list reconciliation:

```typescript
// Inferno: typed array reuse across reconciliations
let result: Int32Array;
let p: Int32Array;
let maxLen = 0;

function lisAlgorithm(arr: Int32Array): Int32Array {
  const len = arr.length;
  if (len > maxLen) {
    maxLen = len;
    result = new Int32Array(len);
    p = new Int32Array(len);
  }
  // ...binary search with >> 1 midpoint...
}
```

**Not applied** because react-grab doesn't reconcile lists. The detection loop iterates `elementsFromPoint` results linearly.

## Reference Codebases

| Project | Key insight | Scheduling primitive |
|---|---|---|
| [Inferno](https://github.com/infernojs/inferno) | Bitwise flags for O(1) type dispatch, `Int32Array` buffer reuse in LIS, prototype patching for V8 hidden class stability | `Promise.resolve().then` microtask |
| [SolidJS](https://github.com/solidjs/solid) | Monotonic `ExecCount` prevents redundant recomputation, three-state machine (clean/STALE/PENDING) defers work until dependencies resolve | `queueMicrotask` for signals, `rAF` for effects |
| [ivi](https://github.com/localvoid/ivi) | `DirtySubtree` flag propagation with early exit, sealed render context for JIT, local const aliases of globals, right-to-left iteration for stable `insertBefore` cursors | `queueMicrotask` for state, `rAF` for visual, `rIC` for idle |
| [pretext](https://github.com/chenglou/pretext) | Two-phase measurement (prepare once / layout many), canvas `measureText` avoids DOM reflow, `WeakMap` for GC-friendly caching, `simpleLineWalkFastPath` flag skips complex line-break logic | Fully synchronous (no scheduling needed) |
