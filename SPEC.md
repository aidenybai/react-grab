---
name: React Grab Refactor
overview: Refactor React Grab from XState-based architecture to a simpler discriminated union state model with global signals, removing agent code from core and reducing ~3500 lines to ~800.
todos:
  - id: state
    content: Create state.ts with discriminated union GrabState signal
    status: pending
  - id: actions
    content: Create actions.ts with activate/deactivate/lock/copy
    status: pending
  - id: events
    content: Port event handlers from core/index.tsx to events.ts
    status: pending
  - id: extend
    content: Create extend.ts with addOverlay and onBeforeCopy
    status: pending
  - id: components
    content: Simplify components to read global state directly
    status: pending
  - id: init
    content: Create init.ts entry point with global mount
    status: pending
  - id: delete
    content: Delete machine.ts, agent/, noop-api.ts, agent-specific components
    status: pending
  - id: utils
    content: Consolidate/inline small utility files
    status: pending
  - id: exports
    content: Update index.ts with new public API
    status: pending
---

# React Grab Architecture Refactor

## Goals

- Replace XState with discriminated union state signal
- Remove agent code from core (becomes external)
- Global state model (no providers)
- Single global instance (multi-instance not supported)
- ~60% code reduction

---

## State Model

Single discriminated union signal using **Solid.js signals**:

```typescript
import { createSignal } from 'solid-js'

type GrabState =
  | { state: 'idle' }
  | { state: 'holding'; startedAt: number }
  | { state: 'active'; pointer: Position; hoveredEl: Element | null; lockedEl: Element | null }
  | { state: 'copying'; elements: Element[]; startedAt: number }

const [grab, setGrab] = createSignal<GrabState>({ state: 'idle' })
```

### State Transitions

```
idle -> holding      # pointerdown starts hold timer
holding -> active    # auto-transition after configurable threshold (e.g., 300ms)
holding -> idle      # pointerup before threshold
active -> copying    # copy() called
active -> idle       # deactivate() or Escape
copying -> idle      # auto-transition after configurable delay (setTimeout)
```

### Transition Behavior

- **holding → active**: Auto-transitions after configurable hold threshold
- **copying → idle**: Auto-transitions via setTimeout after configurable delay
- **Invalid transitions**: Silent no-op (no errors thrown)

---

## Configuration

Signal-based config (updatable at runtime):

```typescript
import { createSignal } from 'solid-js'

interface GrabConfig {
  holdThreshold: number      // ms before holding -> active (default: 300)
  copyFeedbackDelay: number  // ms in copying state before -> idle (default: 500)
  elementFilter?: (el: Element) => boolean  // optional user filter
}

const [config, setConfig] = createSignal<GrabConfig>({
  holdThreshold: 300,
  copyFeedbackDelay: 500,
})

// Runtime updates
setConfig(prev => ({ ...prev, holdThreshold: 500 }))
```

---

## Element Detection

- Uses `document.elementFromPoint()` with filtering
- **Default exclusions**: overlay elements, invisible elements, script/style tags
- **Optional user filter**: `config.elementFilter` for custom exclusion logic

```typescript
function getElementAtPoint(x: number, y: number): Element | null {
  const el = document.elementFromPoint(x, y)
  if (!el) return null
  if (isOverlayElement(el)) return null
  if (isInvisible(el)) return null
  if (isNonContentTag(el)) return null
  if (config().elementFilter?.(el) === false) return null
  return el
}
```

---

## Lock Behavior

- **`lock(element)`**: Explicit element required (no implicit hoveredEl)
- **When locked**: Both `hoveredEl` and `lockedEl` freeze (no tracking)
- **`unlock()`**: Immediately re-tracks via `elementFromPoint()`
- **Pointer exit**: Sets `hoveredEl` to null when pointer leaves document

---

## Event Handling

- **Unified PointerEvent API** for touch and mouse
- **Global listeners** bound on init, state-gated (check state before acting)
- Keyboard shortcuts (Escape, etc.) check state before responding

```typescript
// events.ts
function handlePointerMove(e: PointerEvent) {
  const state = grab()
  if (state.state !== 'active') return  // state-gated
  if (state.lockedEl) return  // frozen when locked

  const el = getElementAtPoint(e.clientX, e.clientY)
  setGrab({ ...state, pointer: { x: e.clientX, y: e.clientY }, hoveredEl: el })
}
```

---

## Copy Behavior

- Uses existing **bippy context** for copy content
- On success: transitions to `copying` state, auto-returns to `idle` after delay
- On failure: emits error via `onError(error, elements)`

```typescript
async function copy(elements: Element[]): Promise<void> {
  try {
    const content = getBippyContext(elements)
    await navigator.clipboard.writeText(content)
    setGrab({ state: 'copying', elements, startedAt: Date.now() })
    setTimeout(() => setGrab({ state: 'idle' }), config().copyFeedbackDelay)
  } catch (error) {
    errorHandler?.(error, elements)
  }
}
```

---

## Extension APIs

### onBeforeCopy

- **First-registered wins**: Only one handler, subsequent calls replace
- Handler returns `true` to skip default copy, `false` to continue

```typescript
let beforeCopyHandler: ((elements: Element[]) => Promise<boolean>) | null = null

function onBeforeCopy(handler: (elements: Element[]) => Promise<boolean>) {
  beforeCopyHandler = handler
}
```

### onError

```typescript
let errorHandler: ((error: Error, elements: Element[]) => void) | null = null

function onError(handler: (error: Error, elements: Element[]) => void) {
  errorHandler = handler
}
```

### addOverlay

- **FIFO ordering**: First registered renders first (bottom)
- No priority option
- Returns cleanup function

```typescript
const overlays = new Set<Component>()

function addOverlay(component: Component): () => void {
  overlays.add(component)
  return () => overlays.delete(component)
}
```

Overlay components **import signals directly** (no props passed):

```typescript
function MyOverlay() {
  const state = grab()
  // use state directly
}
```

---

## UI Presets

Named presets as objects of component toggles:

```typescript
const presets = {
  default: { crosshair: true, selectionBox: true, label: true },
  minimal: { crosshair: true, selectionBox: false, label: false },
  none: { crosshair: false, selectionBox: false, label: false },
}

// Usage
init({ preset: presets.default })
init({ preset: { ...presets.default, label: false } })  // fine-tuning
```

---

## Init & SSR

- **SSR guard at init() only**: Actions assume client-side
- Returns cleanup function if needed

```typescript
function init(options?: { preset?: PresetConfig }): () => void {
  if (typeof window === 'undefined') return () => {}  // SSR guard

  bindEventListeners()
  mountOverlayRoot()
  registerPresetComponents(options?.preset ?? presets.default)

  return () => {
    unbindEventListeners()
    unmountOverlayRoot()
  }
}
```

---

## Agent Integration

Agent code lives externally but has full access:

```typescript
// In agent package
import { grab, onBeforeCopy } from 'react-grab'

// Read state reactively
createEffect(() => {
  const state = grab()
  if (state.state === 'active') {
    // Agent can observe hoveredEl, pointer, etc.
  }
})

// Intercept copy
onBeforeCopy(async (elements) => {
  await sendToAgent(elements)
  return true  // handled
})
```

---

## New File Structure

```
src/
├── state.ts           # GrabState signal + config signal + derived accessors
├── actions.ts         # activate(), deactivate(), lock(el), unlock(), copy()
├── events.ts          # Unified PointerEvent handlers, keyboard handlers
├── extend.ts          # addOverlay(), onBeforeCopy(), onError()
├── init.ts            # Entry point, SSR guard, mounts root
├── components/
│   ├── renderer.tsx   # Renders overlay registry
│   ├── selection-box.tsx
│   ├── crosshair.tsx
│   └── label.tsx      # Simplified, no agent states
└── utils/             # Consolidated utils
```

---

## Public API

```typescript
// State (read) - Solid.js signals
export { grab, config, isActive, isCopying, targetEl } from './state'

// Actions (write)
export { activate, deactivate, lock, unlock, copy } from './actions'

// Config
export { setConfig } from './state'

// Extension
export { addOverlay, onBeforeCopy, onError } from './extend'

// Presets
export { presets } from './presets'

// Init
export { init } from './init'
```

---

## Files to Delete

- `core/machine.ts` (913 lines) - replaced by `state.ts`
- `core/agent/` directory - moved to separate package
- `core/noop-api.ts` - SSR check inlined in init()
- `components/selection-label/completion-view.tsx` - agent-specific
- `components/selection-label/error-view.tsx` - agent-specific
- Many single-line utils - inline where used

---

## Breaking Changes

- `ReactGrabAPI` shape changes
- No `setAgent()` method - agent is external
- No `AgentProvider` types exported
- `lock()` now requires explicit element parameter
- Single global instance only (no multi-instance support)
