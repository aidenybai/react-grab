---
name: react-grab-plugins
description: >
  Guide for creating react-grab plugins, extending the API, and building agent integrations.
  Use when working with react-grab plugin development, creating custom context menu actions,
  implementing lifecycle hooks, customizing themes, or building agent providers.
---

# React Grab Plugin Development

## Quick Start

```typescript
import type { Plugin, ReactGrabAPI } from "react-grab/core";

const myPlugin: Plugin = {
  name: "my-plugin",
  hooks: {
    onActivate: () => console.log("React Grab activated"),
    onElementSelect: (element) => console.log("Selected:", element.tagName),
  },
};

// Register with the API
api.registerPlugin(myPlugin);
```

## Plugin Structure

```typescript
interface Plugin {
  name: string; // Unique identifier (required)
  theme?: DeepPartial<Theme>; // Theme customizations
  options?: SettableOptions; // Configuration overrides
  actions?: PluginAction[]; // Context menu and toolbar actions
  hooks?: PluginHooks; // Lifecycle hooks
  setup?: (api: ReactGrabAPI) => PluginConfig | void;
}
```

- **name**: Unique string identifier
- **theme**: Customize colors, visibility of UI elements
- **options**: Override activation mode, key bindings, content generation
- **actions**: Add items to the context menu or toolbar (use `target: "toolbar"` for toolbar items)
- **hooks**: React to lifecycle events (hover, select, copy, etc.)
- **setup**: Initialize with API access, return config and cleanup function

See [references/plugin-interface.md](references/plugin-interface.md) for full interface details.

## Lifecycle Hooks

Hooks let you react to user interactions and state changes:

| Hook                                                             | Trigger                                     |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `onActivate` / `onDeactivate`                                    | Activation state changes                    |
| `onElementHover` / `onElementSelect`                             | Mouse interactions                          |
| `onDragStart` / `onDragEnd`                                      | Drag selection                              |
| `onBeforeCopy` / `onAfterCopy` / `onCopySuccess` / `onCopyError` | Copy operations                             |
| `onStateChange`                                                  | Any ReactGrabState change                   |
| `onPromptModeChange`                                             | Agent prompt mode toggle                    |
| `onContextMenu`                                                  | Right-click menu opened                     |
| `onOpenFile`                                                     | File link clicked (return `true` to handle) |

## Context Menu Actions

Add custom actions to the right-click menu:

```typescript
api.registerPlugin({
  name: "custom-actions",
  actions: [
    {
      id: "inspect-element",
      label: "Inspect in DevTools",
      shortcut: "I",
      enabled: ({ element }) => Boolean(element),
      onAction: ({ element }) => {
        console.dir(element);
      },
    },
  ],
});
```

**ActionContext** provided to `onAction`:

- `element` / `elements` - Selected DOM element(s)
- `filePath` / `lineNumber` - Source location (if available)
- `componentName` / `tagName` - Component info
- `enterPromptMode` - Function to enter agent prompt mode

## Theme Customization

Customize the visual appearance:

```typescript
api.registerPlugin({
  name: "dark-theme",
  theme: {
    hue: 220, // Base color (0-360)
    selectionBox: { enabled: true },
    dragBox: { enabled: true },
    grabbedBoxes: { enabled: true },
    elementLabel: { enabled: false }, // Hide the label
    crosshair: { enabled: false }, // Hide crosshair
    toolbar: { enabled: true },
  },
});
```

## Options Override

Configure behavior via plugins:

```typescript
api.registerPlugin({
  name: "hold-mode",
  options: {
    activationMode: "hold", // "toggle" | "hold"
    keyHoldDuration: 500, // ms to hold before activating
    allowActivationInsideInput: false,
    maxContextLines: 5,
    activationKey: "Alt", // Key or predicate function
    freezeReactUpdates: true,
  },
});
```

## Agent Integration

Create an agent provider for AI-powered editing:

```typescript
import type { AgentProvider, AgentContext } from "react-grab/core";

const myAgent: AgentProvider = {
  async *send(context: AgentContext, signal: AbortSignal) {
    // Stream status updates
    yield "Analyzing element...";
    yield "Applying changes...";
    yield "Done!";
  },
  supportsResume: false,
  supportsFollowUp: true,
  dismissButtonText: "Close",
};

api.registerPlugin({
  name: "my-agent",
  actions: [
    {
      id: "edit-with-my-agent",
      label: "Edit with My Agent",
      shortcut: "Enter",
      onAction: ({ enterPromptMode }) => {
        enterPromptMode?.({
          provider: myAgent,
          storage: sessionStorage,
        });
      },
      agent: { provider: myAgent, storage: sessionStorage },
    },
  ],
});
```

See [references/api-reference.md](references/api-reference.md) for full API documentation.
See [references/examples.md](references/examples.md) for complete plugin examples.

## Setup Function Pattern

Use `setup` for initialization that needs API access:

```typescript
api.registerPlugin({
  name: "stateful-plugin",
  setup: (api) => {
    const unsubscribe = api.onToolbarStateChange((state) => {
      console.log("Toolbar moved to:", state.edge);
    });

    return {
      hooks: {
        onActivate: () => console.log("Active"),
      },
      cleanup: () => {
        unsubscribe();
      },
    };
  },
});
```

## Exploring the Codebase

To understand the implementation details, clone the repository:

```bash
git clone https://github.com/aidenybai/react-grab /tmp/react-grab
```

Key files to explore in `/tmp/react-grab/packages/react-grab/`:

- `src/types.ts` - All TypeScript interfaces
- `src/core/plugin-registry.ts` - Plugin registration logic
- `src/core/index.tsx` - Main API implementation
- `src/core/theme.ts` - Theme merging utilities
