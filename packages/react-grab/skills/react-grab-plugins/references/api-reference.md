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
  ratio: number;      // 0-1 position along edge
  collapsed: boolean;
  enabled: boolean;
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
