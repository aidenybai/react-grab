# ReactGrabAPI Reference

The `ReactGrabAPI` is the main interface for interacting with React Grab programmatically.

## Obtaining the API

```typescript
import { init } from "react-grab/core";

const api = init();

// Or access from window after initialization
const api = window.__REACT_GRAB__;
```

## API Methods

```typescript
interface ReactGrabAPI {
  // Activation control
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  isActive: () => boolean;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;

  // Toolbar management
  getToolbarState: () => ToolbarState | null;
  setToolbarState: (state: Partial<ToolbarState>) => void;
  onToolbarStateChange: (callback: (state: ToolbarState) => void) => () => void;

  // Element operations
  copyElement: (elements: Element | Element[]) => Promise<boolean>;
  getSource: (element: Element) => Promise<SourceInfo | null>;
  getDisplayName: (element: Element) => string | null;

  // State & configuration
  getState: () => ReactGrabState;
  setOptions: (options: SettableOptions) => void;

  // Plugin management
  registerPlugin: (plugin: Plugin) => void;
  unregisterPlugin: (name: string) => void;
  getPlugins: () => string[];

  // Cleanup
  dispose: () => void;
}
```

## Activation Control

### activate()

Manually activate React Grab (show overlay, enable element selection).

```typescript
api.activate();
```

### deactivate()

Manually deactivate React Grab.

```typescript
api.deactivate();
```

### toggle()

Toggle activation state.

```typescript
api.toggle();
```

### isActive()

Check if React Grab is currently active.

```typescript
if (api.isActive()) {
  console.log("React Grab is active");
}
```

### isEnabled() / setEnabled()

Check or set whether React Grab is globally enabled.

```typescript
api.setEnabled(false); // Disable completely
console.log(api.isEnabled()); // false
```

## Toolbar Management

### getToolbarState()

Get current toolbar position and state.

```typescript
const state = api.getToolbarState();
// { edge: "bottom", ratio: 0.5, collapsed: false, enabled: true }
```

### setToolbarState()

Update toolbar position or state.

```typescript
api.setToolbarState({ edge: "right", collapsed: true });
```

### onToolbarStateChange()

Subscribe to toolbar state changes. Returns unsubscribe function.

```typescript
const unsubscribe = api.onToolbarStateChange((state) => {
  console.log("Toolbar moved to:", state.edge);
});

// Later: unsubscribe();
```

## Element Operations

### copyElement()

Programmatically copy element(s) to clipboard.

```typescript
const success = await api.copyElement(document.querySelector(".my-component"));
console.log(success ? "Copied!" : "Failed");

// Multiple elements
await api.copyElement([element1, element2]);
```

### getSource()

Get source file information for a React element.

```typescript
const source = await api.getSource(element);
if (source) {
  console.log(`${source.filePath}:${source.lineNumber}`);
  console.log(`Component: ${source.componentName}`);
}
```

Returns:

```typescript
interface SourceInfo {
  filePath: string;
  lineNumber: number | null;
  componentName: string | null;
}
```

### getDisplayName()

Get the display name of a React component.

```typescript
const name = api.getDisplayName(element);
// "Button" or "MyComponent" or null
```

## State & Configuration

### getState()

Get the current internal state.

```typescript
const state = api.getState();
console.log(state.isActive, state.isDragging, state.targetElement);
```

### setOptions()

Update configuration options directly.

```typescript
api.setOptions({
  activationMode: "hold",
  keyHoldDuration: 300,
  maxContextLines: 5,
});
```

## Plugin Management

### registerPlugin()

Register a plugin.

```typescript
api.registerPlugin({
  name: "my-plugin",
  hooks: {
    onActivate: () => console.log("Activated"),
  },
});
```

### unregisterPlugin()

Unregister a plugin by name. Calls the plugin's `cleanup()` if defined.

```typescript
api.unregisterPlugin("my-plugin");
```

### getPlugins()

Get list of registered plugin names.

```typescript
const plugins = api.getPlugins();
// ["cursor-agent", "my-plugin"]
```

## Cleanup

### dispose()

Clean up all resources and remove React Grab from the page.

```typescript
api.dispose();
```

## Event: react-grab:init

Listen for React Grab initialization:

```typescript
window.addEventListener("react-grab:init", (event) => {
  const api = event.detail;
  api.registerPlugin(myPlugin);
});
```

## ToolbarState Type

```typescript
interface ToolbarState {
  edge: "top" | "bottom" | "left" | "right";
  ratio: number; // 0-1 position along edge
  collapsed: boolean;
  enabled: boolean;
}
```

## Extending

### API Primitives

Lower-level building blocks exported from `react-grab/primitives` for advanced use cases like custom tooling, browser extensions, or agent integrations.

```typescript
import {
  getElementContext,
  freeze,
  unfreeze,
  isFreezeActive,
} from "react-grab/primitives";
```

#### getElementContext(element)

Gathers comprehensive context for a DOM element, including its React fiber, component name, source stack, HTML preview, CSS selector, and computed styles.

```typescript
const context = await getElementContext(document.querySelector(".my-button")!);
console.log(context.componentName); // "SubmitButton"
console.log(context.selector);      // "button.my-button"
console.log(context.stackContext);  // "SubmitButton > Form > App"
console.log(context.htmlPreview);   // '<button class="my-button">Submit</button>'
console.log(context.styles);        // "color: white; background: blue; ..."
```

Returns:

```typescript
interface ReactGrabElementContext {
  element: Element;
  htmlPreview: string;
  stackContext: string;
  componentName: string | null;
  fiber: Fiber | null;
  selector: string | null;
  styles: string;
}
```

#### freeze(elements?)

Freezes the page by halting React updates, pausing CSS/JS animations, and preserving pseudo-states (e.g. `:hover`, `:focus`). Accepts an optional array of root elements to freeze animations on; defaults to `document.body`.

```typescript
freeze(); // freezes the entire page
freeze([document.querySelector(".modal")!]); // freezes only the modal subtree
```

#### unfreeze()

Restores normal page behavior by re-enabling React updates, resuming animations, and releasing preserved pseudo-states.

```typescript
freeze();
const context = await getElementContext(targetElement);
// ... process the frozen state ...
unfreeze(); // page resumes normal behavior
```

#### isFreezeActive()

Returns whether the page is currently in a frozen state.

```typescript
if (isFreezeActive()) {
  console.log("Page is frozen, skipping update");
}
```

## SettableOptions Type

```typescript
interface SettableOptions {
  activationMode?: "toggle" | "hold";
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  activationKey?: string | ((event: KeyboardEvent) => boolean);
  getContent?: (elements: Element[]) => Promise<string> | string;
  freezeReactUpdates?: boolean;
}
```
