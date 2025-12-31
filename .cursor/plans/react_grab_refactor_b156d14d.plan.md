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
- ~60% code reduction

---

## New State Model

Single discriminated union signal in [`packages/react-grab/src/core/state.ts`](packages/react-grab/src/core/state.ts) (new file):

```typescript
type GrabState = 
  | { state: 'idle' }
  | { state: 'holding'; startedAt: number }
  | { state: 'active'; pointer: Position; hoveredEl: Element | null; lockedEl: Element | null }
  | { state: 'copying'; elements: Element[]; startedAt: number }

const [grab, setGrab] = createSignal<GrabState>({ state: 'idle' })
```

---

## New File Structure

```javascript
src/
├── state.ts           # GrabState signal + derived accessors
├── actions.ts         # activate(), deactivate(), lock(), copy()
├── events.ts          # Event handlers (keyboard, mouse, touch)
├── extend.ts          # addOverlay(), onBeforeCopy
├── init.ts            # Entry point, mounts root
├── components/
│   ├── renderer.tsx   # Renders overlays
│   ├── selection-box.tsx
│   ├── crosshair.tsx
│   └── label.tsx      # Simplified, no agent states
└── utils/             # Consolidated utils
```

---

## Files to Delete

- `core/machine.ts` (913 lines) - replaced by `state.ts`
- `core/agent/` directory - moved to separate package
- `core/noop-api.ts` - simplified, inline SSR check
- `components/selection-label/completion-view.tsx` - agent-specific
- `components/selection-label/error-view.tsx` - agent-specific
- Many single-line utils - inline where used

---

## Public API

```typescript
// State (read)
export { grab, isActive, isCopying, targetEl } from './state'

// Actions (write)
export { activate, deactivate, lock, unlock, copy } from './actions'

// Extension
export { addOverlay, onBeforeCopy } from './extend'

// Init
export { init } from './init'
```

---

## Extension Model

```typescript
// Add overlay globally
const removeOverlay = addOverlay(MyComponent)

// Intercept copy
onBeforeCopy(async (elements) => {
  if (shouldSendToAgent) {
    await sendToAgent(elements)
    return true  // Handled, skip default copy
  }
  return false
})
```

---

## Migration Steps

1. Create new `state.ts` with discriminated union
2. Create `actions.ts` with state transitions
3. Port event handlers from `core/index.tsx` to `events.ts`
4. Simplify components to read from global state
5. Create `extend.ts` with overlay registry + callbacks
6. Delete XState machine and agent code
7. Consolidate utils
8. Update exports

---

## Breaking Changes

- `ReactGrabAPI` shape changes
- No `setAgent()` method - agent is external