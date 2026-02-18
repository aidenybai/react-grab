# Plugin Interface Reference

## Plugin

Main interface for creating plugins:

```typescript
interface Plugin {
  name: string;
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: PluginAction[];
  hooks?: PluginHooks;
  setup?: (api: ReactGrabAPI) => PluginConfig | void;
}

type PluginAction = ContextMenuAction | ToolbarMenuAction;
```

Actions use a `target` field to control placement: omit it (or use `"context-menu"`) for the right-click menu, or set `"toolbar"` for the toolbar dropdown.

## PluginConfig

Returned from `setup()` or merged from plugin properties:

```typescript
interface PluginConfig {
  theme?: DeepPartial<Theme>;
  options?: SettableOptions;
  actions?: PluginAction[];
  hooks?: PluginHooks;
  cleanup?: () => void;
}
```

## PluginHooks

All available lifecycle hooks:

```typescript
interface PluginHooks {
  // Activation
  onActivate?: () => void;
  onDeactivate?: () => void;

  // Element interactions
  onElementHover?: (element: Element) => void;
  onElementSelect?: (element: Element) => void;

  // Drag selection
  onDragStart?: (startX: number, startY: number) => void;
  onDragEnd?: (elements: Element[], bounds: DragRect) => void;

  // Copy operations
  onBeforeCopy?: (elements: Element[]) => void | Promise<void>;
  onAfterCopy?: (elements: Element[], success: boolean) => void;
  onCopySuccess?: (elements: Element[], content: string) => void;
  onCopyError?: (error: Error) => void;

  // State changes
  onStateChange?: (state: ReactGrabState) => void;
  onPromptModeChange?: (
    isPromptMode: boolean,
    context: PromptModeContext,
  ) => void;

  // Visual overlays
  onSelectionBox?: (
    visible: boolean,
    bounds: OverlayBounds | null,
    element: Element | null,
  ) => void;
  onDragBox?: (visible: boolean, bounds: OverlayBounds | null) => void;
  onGrabbedBox?: (bounds: OverlayBounds, element: Element) => void;
  onElementLabel?: (
    visible: boolean,
    variant: ElementLabelVariant,
    context: ElementLabelContext,
  ) => void;
  onCrosshair?: (visible: boolean, context: CrosshairContext) => void;

  // Context menu
  onContextMenu?: (
    element: Element,
    position: { x: number; y: number },
  ) => void;

  // File operations (return true to handle)
  onOpenFile?: (filePath: string, lineNumber?: number) => boolean | void;
}
```

### Hook Details

#### Activation Hooks

- **onActivate**: Called when React Grab is activated (user presses activation key)
- **onDeactivate**: Called when React Grab is deactivated

#### Element Interaction Hooks

- **onElementHover**: Called when mouse hovers over a new element
- **onElementSelect**: Called when user clicks/selects an element

#### Drag Selection Hooks

- **onDragStart**: Called when user starts drag selection, receives starting coordinates
- **onDragEnd**: Called when drag selection completes, receives selected elements and bounding rect

#### Copy Operation Hooks

- **onBeforeCopy**: Called before copy operation, can be async to delay copy
- **onAfterCopy**: Called after copy completes, receives success boolean
- **onCopySuccess**: Called on successful copy with the copied content string
- **onCopyError**: Called when copy fails with the error

#### State Change Hooks

- **onStateChange**: Called whenever ReactGrabState changes (provides full state object)
- **onPromptModeChange**: Called when entering/exiting agent prompt mode

#### Visual Overlay Hooks

- **onSelectionBox**: Called when selection highlight appears/disappears
- **onDragBox**: Called when drag selection box appears/disappears
- **onGrabbedBox**: Called when success flash appears on grabbed element
- **onElementLabel**: Called when element info label appears/changes
- **onCrosshair**: Called when crosshair cursor appears/moves

#### Other Hooks

- **onContextMenu**: Called when right-click menu opens
- **onOpenFile**: Called when "Open in Editor" is clicked; return `true` to handle it yourself

## ContextMenuAction

Structure for adding context menu items:

```typescript
interface ContextMenuAction {
  id: string; // Unique identifier
  label: string; // Display text
  shortcut?: string; // Keyboard shortcut hint
  enabled?: boolean | ((context: ActionContext) => boolean);
  onAction: (context: ActionContext) => void;
  agent?: AgentOptions; // Optional agent configuration
}
```

## ActionContext

Context provided to action handlers:

```typescript
interface ActionContext {
  element: Element; // Primary selected element
  elements: Element[]; // All selected elements
  filePath?: string; // Source file path
  lineNumber?: number; // Source line number
  componentName?: string; // React component name
  tagName?: string; // HTML tag name
  enterPromptMode?: (agent?: AgentOptions) => void;
}
```

## Theme

Theme customization options:

```typescript
interface Theme {
  enabled?: boolean; // Global toggle (default: true)
  hue?: number; // Base color 0-360 (default: 0)
  selectionBox?: { enabled?: boolean };
  dragBox?: { enabled?: boolean };
  grabbedBoxes?: { enabled?: boolean };
  elementLabel?: { enabled?: boolean };
  crosshair?: { enabled?: boolean };
  toolbar?: { enabled?: boolean };
}
```

## SettableOptions

Configuration options that can be set via plugins:

```typescript
interface SettableOptions {
  activationMode?: "toggle" | "hold";
  keyHoldDuration?: number; // ms for hold mode
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
  activationKey?: string | ((event: KeyboardEvent) => boolean);
  getContent?: (elements: Element[]) => Promise<string> | string;
  freezeReactUpdates?: boolean;
}
```

## ReactGrabState

State object provided to `onStateChange`:

```typescript
interface ReactGrabState {
  isActive: boolean;
  isDragging: boolean;
  isCopying: boolean;
  isPromptMode: boolean;
  isCrosshairVisible: boolean;
  isSelectionBoxVisible: boolean;
  isDragBoxVisible: boolean;
  targetElement: Element | null;
  dragBounds: DragRect | null;
  grabbedBoxes: Array<{ id: string; bounds: OverlayBounds; createdAt: number }>;
  selectionFilePath: string | null;
  toolbarState: ToolbarState | null;
}
```

## Supporting Types

```typescript
interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayBounds {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

interface PromptModeContext {
  x: number;
  y: number;
  targetElement: Element | null;
}

interface CrosshairContext {
  x: number;
  y: number;
}

interface ElementLabelContext {
  x: number;
  y: number;
  content: string;
  element?: Element;
  tagName?: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
}

type ElementLabelVariant = "hover" | "processing" | "success";

interface ToolbarState {
  edge: "top" | "bottom" | "left" | "right";
  ratio: number;
  collapsed: boolean;
  enabled: boolean;
}
```
