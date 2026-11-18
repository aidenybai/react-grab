# RFC: Composable Architecture — The "Android" of React Grab

> **Status**: Draft / Discussion  
> **Goal**: Make every layer of React Grab replaceable, composable, and hackable — so the community can build things we never imagined.

---

## The Problem

React Grab today is like early iOS: polished, opinionated, works great out of the box — but the walls are high. The plugin system allows hooking into lifecycle events, but you can't fundamentally change _how_ React Grab works. Specifically:

1. **Monolithic `init()`** — A ~4,200-line function that wires store, plugins, events, copy pipeline, and renderer in one shot. You can't swap pieces.
2. **Fixed UI** — The Solid.js overlay (`ReactGrabRenderer`) always renders. You can't replace the toolbar, use your own selection label, or go headless.
3. **Single instance** — `hasInited` flag prevents multiple instances. You can't scope React Grab to a subtree or run two configs side by side.
4. **Hooks, not pipelines** — Plugins get callbacks (`onBeforeCopy`, `transformCopyContent`), but can't restructure the flow itself. The copy pipeline order is hardcoded.
5. **Primitives are an afterthought** — `getElementContext`, `freeze`, `openFile` exist, but the real power (element detection, bounds calculation, fiber walking, event capture) is locked inside `init()`.

The "Android" question: **What if every layer was replaceable?**

---

## Design Principles

### 1. Kernel + Userland

Split React Grab into a tiny **kernel** (the things that are genuinely hard and opinionated) and **userland** (everything that should be swappable):

| Kernel (hard to replace) | Userland (should be swappable) |
|---|---|
| React fiber introspection | Copy pipeline |
| Element detection from pointer | UI overlay / renderer |
| Source map resolution | Toolbar |
| Bounds calculation / coordinate system | Context menu |
| DOM freeze/unfreeze | Selection label |
| Event capture infrastructure | Keyboard activation strategy |
| Clipboard access | History management |
| | Agent integration |
| | Snippet generation |
| | Theme system |

The kernel is ~20% of the code but ~80% of the difficulty. Userland is where the community builds.

### 2. Everything is a Module

Today's architecture:

```
init() → wires everything → returns API
```

Proposed:

```
createGrab({
  modules: [
    keyboardActivation({ key: 'Alt', mode: 'hold' }),
    pointerDetection({ filter: skipSmallElements }),
    copyPipeline({ stages: [extractContext, generateSnippet, toClipboard] }),
    overlay({ renderer: 'builtin' }),  // or your own, or null
    toolbar(),
    contextMenu(),
    history({ maxItems: 50 }),
    agentBridge({ provider: cursorProvider }),
  ]
})
```

Each module:
- Declares what **kernel capabilities** it needs
- Declares what **events** it listens to and emits
- Can be omitted, replaced, or wrapped
- Has its own lifecycle (`setup` / `dispose`)

### 3. Typed Event Bus (not just hooks)

Replace the current hook-call system with a first-class event bus that supports:

- **Fire-and-forget**: `bus.emit('element:hover', { element })`
- **Interceptable**: `bus.emit('element:select', { element, preventDefault() { ... } })`
- **Pipelines** (reduce): `bus.pipe('copy:content', initialContent, { elements })`
- **Async pipelines**: `await bus.pipeAsync('copy:content', content, { elements })`

```typescript
interface GrabEventMap {
  // Lifecycle
  'grab:activate': { source: 'keyboard' | 'api' | 'toolbar' }
  'grab:deactivate': { source: string }
  
  // Detection
  'pointer:move': { x: number, y: number, target: Element }
  'element:detect': { element: Element, pointer: Position }
  'element:hover': { element: Element, bounds: OverlayBounds }
  'element:select': { element: Element, preventDefault: () => void }
  'element:deselect': {}
  
  // Drag
  'drag:start': { origin: Position }
  'drag:move': { origin: Position, current: Position, rect: DragRect }
  'drag:end': { elements: Element[], rect: DragRect }
  
  // Copy pipeline (pipeable — each handler transforms the value)
  'copy:before': { elements: Element[] }
  'copy:snippet': { snippet: string, element: Element }  // per-element
  'copy:content': { content: string, elements: Element[] }  // final
  'copy:success': { content: string, elements: Element[] }
  'copy:error': { error: Error }
  
  // UI
  'ui:selection-box': { visible: boolean, bounds: OverlayBounds | null }
  'ui:context-menu': { element: Element, position: Position }
  'ui:label': { visible: boolean, context: ElementLabelContext }
  
  // Agent
  'agent:prompt': { text: string, elements: Element[], sessionId: string }
  'agent:status': { sessionId: string, status: string }
  'agent:complete': { sessionId: string }
}
```

Why this is better than the current `PluginHooks`:
- **Discoverable**: Tools can enumerate all events
- **Decoupled**: Emitters don't know about listeners
- **Orderable**: Listeners declare priority
- **Interceptable**: `preventDefault()` replaces the ad-hoc `wasIntercepted` pattern
- **Pipeline-native**: `transformCopyContent` becomes just another listener on `copy:content`

### 4. Middleware for Pipelines

The copy flow today is: `onBeforeCopy → generateSnippet → transformSnippet → join → transformCopyContent → clipboard → onCopySuccess`. This is hardcoded in `core/copy.ts`.

With middleware:

```typescript
const copyPipeline = createPipeline<CopyContext>([
  extractElementContext,   // built-in: adds fiber info, stack, component name
  generateSnippets,        // built-in: turns elements into code snippets
  joinSnippets,            // built-in: combines multi-element snippets
  toClipboard,             // built-in: writes to clipboard
])

// Users can insert at any point:
copyPipeline.use(async (context, next) => {
  context.snippets = context.snippets.map(addMyCompanyHeader)
  await next()  // continues pipeline
  analytics.track('element-copied', { count: context.elements.length })
})

// Or replace stages entirely:
copyPipeline.replace('generateSnippets', myCustomSnippetGenerator)
```

This is the Express/Koa pattern, but typed. Each middleware gets a `context` and calls `next()` to continue.

### 5. Headless Mode & Renderer Injection

The renderer should be injectable, not hardcoded:

```typescript
// Full experience (default)
createGrab({ renderer: builtinRenderer() })

// Headless — no UI, just API
createGrab({ renderer: null })

// Custom React overlay
createGrab({ 
  renderer: reactRenderer({
    SelectionLabel: MyLabel,
    Toolbar: MyToolbar,
    ContextMenu: null,  // disable
  })
})

// Partial override — use builtin but swap one piece
createGrab({
  renderer: builtinRenderer({
    slots: {
      toolbar: MyCustomToolbar,
    }
  })
})
```

The renderer contract is just: "subscribe to the event bus, render UI based on state." The kernel doesn't care what renders.

### 6. Multi-Instance & Scoping

Remove the singleton. Allow scoping:

```typescript
// Full-page grab (today's behavior)
const mainGrab = createGrab()

// Scoped to a container
const editorGrab = createGrab({
  scope: document.getElementById('editor'),
  modules: [copyPipeline({ getContent: editorSpecificContent })]
})

// Multiple instances with different configs
const debugGrab = createGrab({
  scope: '#debug-panel',
  theme: { hue: 200 },
  modules: [toolbar({ position: 'bottom-right' })]
})
```

---

## Concrete API Proposal

### Level 0: Kernel Primitives

These are the raw building blocks. Most users never touch these, but power users and module authors need them:

```typescript
import {
  // Element introspection
  getReactFiber,
  getComponentName,
  getComponentStack,
  getSourceLocation,
  walkFiberTree,
  
  // Detection
  detectElementAtPoint,
  detectElementsInRect,
  
  // Bounds
  getElementBounds,
  combineBounds,
  
  // DOM
  freezeDOM,
  unfreezeDOM,
  
  // Clipboard
  writeToClipboard,
  
  // Events
  createEventManager,
} from 'react-grab/kernel'
```

### Level 1: Modules

Pre-built modules that compose the standard experience:

```typescript
import {
  keyboardActivation,
  pointerDetection,
  copyPipeline,
  builtinRenderer,
  toolbar,
  contextMenu,
  selectionLabel,
  history,
  agentBridge,
  dragSelection,
  elementFreeze,
} from 'react-grab/modules'
```

### Level 2: Presets

Batteries-included configs for common use cases:

```typescript
import { createGrab } from 'react-grab'

// This is what `init()` becomes — just a preset
createGrab()  // equivalent to createGrab(defaultPreset)

// Or be explicit:
import { defaultPreset, minimalPreset, headlessPreset } from 'react-grab/presets'

createGrab(defaultPreset())
createGrab(minimalPreset())  // no toolbar, no history, just grab & copy
createGrab(headlessPreset()) // no UI at all
```

### Level 3: `init()` — The One-Liner (backwards compatible)

```typescript
import { init } from 'react-grab'

// Still works exactly as before
init({ theme: { hue: 200 } })
```

Under the hood, `init()` becomes:

```typescript
const init = (options) => createGrab(defaultPreset(options))
```

---

## Module Contract

Every module follows the same shape:

```typescript
interface GrabModule {
  name: string
  
  // What this module needs from the kernel
  dependencies?: string[]
  
  // Setup — receives the event bus and kernel APIs
  setup: (context: ModuleContext) => ModuleHandle
}

interface ModuleContext {
  bus: EventBus              // subscribe to events, emit events
  kernel: KernelAPI          // element detection, fiber walking, etc.
  store: GrabStore           // read/write shared state
  options: ResolvedOptions   // merged options from all modules
}

interface ModuleHandle {
  // Optional: expose public API
  api?: Record<string, unknown>
  
  // Cleanup
  dispose: () => void
}
```

Example — writing a "copy as image" module:

```typescript
import { createModule } from 'react-grab/modules'
import html2canvas from 'html2canvas'

const copyAsImage = () => createModule({
  name: 'copy-as-image',

  setup: ({ bus }) => {
    const action = {
      id: 'copy-as-image',
      label: 'Copy as Image',
      shortcut: 'I',
      onAction: async (context) => {
        const canvas = await html2canvas(context.element)
        const blob = await new Promise(resolve => canvas.toBlob(resolve))
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
      }
    }

    bus.emit('action:register', { action, target: 'context-menu' })

    return {
      dispose: () => bus.emit('action:unregister', { id: 'copy-as-image' }),
    }
  }
})

// Usage:
createGrab({
  modules: [...defaultModules(), copyAsImage()]
})
```

---

## Migration Path

### Phase 1: Extract Kernel

Split `core/index.tsx` into isolated modules _internally_, without changing the public API:

```
src/
  kernel/
    fiber.ts          ← extracted from element-info.ts
    detection.ts      ← extracted from init()'s pointer handling
    bounds.ts         ← already exists, promote to kernel
    freeze.ts         ← already exists
    clipboard.ts      ← extracted from copy.ts
    events.ts         ← already exists as event-listener-manager.ts
  modules/
    keyboard-activation.ts
    pointer-detection.ts
    copy-pipeline.ts
    drag-selection.ts
    overlay/
      renderer.ts     ← current ReactGrabRenderer
      canvas.ts       ← current OverlayCanvas
      selection-label.ts
      toolbar.ts
      context-menu.ts
    history.ts
    agent-bridge.ts
  core/
    event-bus.ts      ← new
    module-loader.ts  ← new
    create-grab.ts    ← new entry point
    index.tsx         ← init() becomes thin wrapper
```

`init()` continues to work exactly as before. No breaking changes.

### Phase 2: Expose Kernel Primitives

Add the `react-grab/kernel` export path. Power users get access to low-level APIs. We can iterate on these separately.

### Phase 3: Expose Module System

Add `react-grab/modules` and `createGrab()`. The plugin system (`registerPlugin`) maps onto the module system — plugins become a simpler authoring format that compiles to modules.

### Phase 4: Community Modules

With the module system stable, the community can build:

- **Custom renderers**: React overlay, Vue overlay, vanilla DOM overlay
- **Custom copy formats**: Markdown, JSON, image, Figma-compatible
- **Integrations**: Storybook panel, DevTools extension, VS Code sidebar
- **Automation**: Playwright helpers, testing utilities, screenshot diffing
- **Analytics**: Track which elements developers grab most often
- **AI workflows**: Custom agent pipelines, multi-model routing

---

## Event Bus Design Detail

The event bus is the spine of the composable architecture. It needs to support several patterns:

### Pattern 1: Fire-and-Forget (notifications)

```typescript
bus.on('copy:success', ({ content, elements }) => {
  console.log(`Copied ${elements.length} elements`)
})
```

### Pattern 2: Interceptable (preventDefault)

```typescript
bus.on('element:select', (event) => {
  if (isProtectedElement(event.element)) {
    event.preventDefault()
    showWarning('This element is protected')
  }
}, { priority: 100 })  // high priority = runs first
```

### Pattern 3: Pipeline (transform chain)

```typescript
// Pipeline events pass a value through a chain of handlers
bus.pipe('copy:snippet', (snippet, { element }) => {
  return snippet + `\n// Source: ${getComponentName(element)}`
})
```

### Pattern 4: Request/Response

```typescript
// Module asks "should I show the context menu here?"
const shouldShow = await bus.request('context-menu:should-show', { 
  element, 
  position 
})
```

### Ordering

Listeners declare priority (higher runs first). Within the same priority, insertion order wins:

```typescript
bus.on('element:select', handler, { priority: 10 })   // runs after
bus.on('element:select', handler, { priority: 100 })  // runs first
bus.on('element:select', handler)                      // default priority: 0
```

---

## What This Unlocks (The "Android" Moment)

### For Plugin Authors

**Before**: "I can hook into `onCopySuccess` and run some code after a copy."

**After**: "I can replace the entire copy pipeline with my own. I can add new UI panels. I can create a keyboard-only mode that doesn't need pointer events. I can scope React Grab to my component library's Storybook and customize the overlay to show design tokens."

### For Enterprise Users

- Scope React Grab to specific parts of the app
- Run different configs in different contexts
- Add company-specific copy formats
- Integrate with internal design systems
- Build compliance plugins (e.g., redact sensitive elements)

### For the Core Team

- Faster iteration — each module has a clear boundary
- Easier testing — modules are isolated
- Smaller bundle — tree-shake unused modules
- Community contributions — people can build modules without touching core

### Real-World Module Ideas

| Module | What it does |
|---|---|
| `copyAsMarkdown()` | Copies element as Markdown instead of code snippet |
| `copyAsImage()` | Screenshots the element to clipboard |
| `designTokens()` | Shows design token names instead of raw CSS values |
| `accessibilityAudit()` | Shows a11y issues for the hovered element |
| `componentDocs()` | Links to Storybook/docs for the hovered component |
| `diffHighlight()` | Highlights elements that changed since last render |
| `performanceOverlay()` | Shows render count / time for each component |
| `aiSuggestions()` | AI-powered suggestions based on element context |
| `figmaSync()` | Syncs grabbed elements with Figma designs |
| `testIdGenerator()` | Auto-generates test IDs for selected elements |
| `tailwindInspector()` | Shows Tailwind classes with visual previews |

---

## Open Questions

1. **Event bus vs. direct function composition?** The event bus is more discoverable but adds indirection. An alternative is pure function composition (like Koa middleware). Could support both.

2. **How far do we go with headless?** Full headless means the overlay is just another module. But it also means more API surface to maintain. Ship headless from day 1, or add it later?

3. **Backwards compatibility story** — should `Plugin` become a thin wrapper around `Module`, or should they coexist? Leaning towards `Plugin` as sugar over `Module`.

4. **Bundle size** — The current `init()` tree-shakes poorly because everything is in one function. Modules fix this naturally. But how aggressively do we split? One module per feature, or coarser groupings?

5. **State management** — Should modules share a single Solid.js store, or should each module own its state and expose it via the bus? Leaning toward shared store with scoped access.

6. **Renderer abstraction** — The Solid.js renderer is fast and internal. Making it replaceable means defining a stable `RendererProps` contract. The current `ReactGrabRendererProps` has ~100 props — too many for a stable API. Need to redesign this as a smaller, more semantic state object.

---

## Next Steps

1. **Validate the vision** — Does this match the "Android" ambition? What's missing?
2. **Prototype the event bus** — Small, typed, zero-dependency. This is the foundation.
3. **Extract one module** — Start with `copyPipeline` since it already has a natural pipeline shape. Prove the module contract works.
4. **Define kernel exports** — What goes in `react-grab/kernel`? Be conservative — kernel APIs are the hardest to change.
5. **Build a non-trivial community module** — Use it to stress-test the module contract before stabilizing.
