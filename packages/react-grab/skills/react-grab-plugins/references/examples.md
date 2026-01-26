# Plugin Examples

## 1. Analytics Plugin (Hooks Only)

Track user interactions with React Grab:

```typescript
import type { Plugin } from "react-grab/core";

const analyticsPlugin: Plugin = {
  name: "analytics",
  hooks: {
    onActivate: () => {
      analytics.track("react_grab_activated");
    },
    onDeactivate: () => {
      analytics.track("react_grab_deactivated");
    },
    onElementSelect: (element) => {
      analytics.track("element_selected", {
        tagName: element.tagName,
        className: element.className,
      });
    },
    onCopySuccess: (elements, content) => {
      analytics.track("content_copied", {
        elementCount: elements.length,
        contentLength: content.length,
      });
    },
    onCopyError: (error) => {
      analytics.track("copy_error", { message: error.message });
    },
  },
};

api.registerPlugin(analyticsPlugin);
```

## 2. Custom Actions Plugin (Context Menu)

Add custom actions to the right-click menu:

```typescript
import type { Plugin } from "react-grab/core";

const customActionsPlugin: Plugin = {
  name: "custom-actions",
  actions: [
    {
      id: "log-to-console",
      label: "Log to Console",
      shortcut: "L",
      onAction: ({ element, elements }) => {
        console.log("Selected element:", element);
        console.log("All elements:", elements);
      },
    },
    {
      id: "copy-selector",
      label: "Copy CSS Selector",
      shortcut: "S",
      onAction: ({ element }) => {
        const selector = generateSelector(element);
        navigator.clipboard.writeText(selector);
      },
    },
    {
      id: "highlight-similar",
      label: "Highlight Similar",
      enabled: ({ element }) => element.className.length > 0,
      onAction: ({ element }) => {
        const similar = document.querySelectorAll(`.${element.className.split(" ")[0]}`);
        similar.forEach((el) => (el.style.outline = "2px solid red"));
      },
    },
  ],
};

api.registerPlugin(customActionsPlugin);
```

## 3. Theme Customization Plugin

Create a custom visual theme:

```typescript
import type { Plugin } from "react-grab/core";

const darkThemePlugin: Plugin = {
  name: "dark-theme",
  theme: {
    hue: 220,                        // Blue-ish base color
    selectionBox: { enabled: true },
    dragBox: { enabled: true },
    grabbedBoxes: { enabled: true },
    elementLabel: { enabled: true },
    crosshair: { enabled: false },   // Disable crosshair
    toolbar: { enabled: true },
  },
};

api.registerPlugin(darkThemePlugin);
```

Minimal theme (hide most UI):

```typescript
const minimalThemePlugin: Plugin = {
  name: "minimal-theme",
  theme: {
    elementLabel: { enabled: false },
    crosshair: { enabled: false },
    toolbar: { enabled: false },
    grabbedBoxes: { enabled: false },
  },
};
```

## 4. Agent Provider Plugin (Full Integration)

Create a complete AI agent integration:

```typescript
import type { Plugin, AgentProvider, AgentContext } from "react-grab/core";

const createMyAgentProvider = (): AgentProvider => ({
  async *send(context: AgentContext, signal: AbortSignal) {
    yield "Analyzing selection...";

    const response = await fetch("/api/ai/edit", {
      method: "POST",
      body: JSON.stringify({
        content: context.content,
        prompt: context.prompt,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value);
    }
  },

  async resume(sessionId, signal, storage) {
    const session = storage.getItem(`session-${sessionId}`);
    if (!session) return;

    yield* this.send(JSON.parse(session), signal);
  },

  async abort(sessionId) {
    await fetch(`/api/ai/abort/${sessionId}`, { method: "POST" });
  },

  supportsResume: true,
  supportsFollowUp: true,
  dismissButtonText: "Done",

  async checkConnection() {
    try {
      const response = await fetch("/api/ai/health");
      return response.ok;
    } catch {
      return false;
    }
  },

  getCompletionMessage: () => "Changes applied successfully!",
});

const myAgentPlugin: Plugin = {
  name: "my-ai-agent",
  actions: [
    {
      id: "edit-with-my-agent",
      label: "Edit with My AI",
      shortcut: "Enter",
      onAction: ({ enterPromptMode }) => {
        const provider = createMyAgentProvider();
        enterPromptMode?.({
          provider,
          storage: sessionStorage,
          onStart: (session, elements) => {
            console.log("Started session:", session.id);
          },
          onComplete: (session, elements) => {
            console.log("Completed:", session.lastStatus);
          },
          onError: (error, session) => {
            console.error("Error:", error.message);
          },
        });
      },
      agent: {
        provider: createMyAgentProvider(),
        storage: sessionStorage,
      },
    },
  ],
};

api.registerPlugin(myAgentPlugin);
```

## 5. Setup Function Plugin (With Cleanup)

Use `setup` for stateful initialization:

```typescript
import type { Plugin, ReactGrabAPI } from "react-grab/core";

const setupPlugin: Plugin = {
  name: "setup-example",
  setup: (api: ReactGrabAPI) => {
    console.log("Plugin initializing...");

    // Subscribe to toolbar changes
    const unsubscribeToolbar = api.onToolbarStateChange((state) => {
      localStorage.setItem("toolbar-position", JSON.stringify(state));
    });

    // Restore toolbar position
    const savedPosition = localStorage.getItem("toolbar-position");
    if (savedPosition) {
      api.setToolbarState(JSON.parse(savedPosition));
    }

    // Set up keyboard shortcut
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && api.isActive()) {
        api.deactivate();
      }
    };
    document.addEventListener("keydown", handleKeydown);

    return {
      theme: {
        hue: 180,
      },
      hooks: {
        onActivate: () => {
          document.body.classList.add("react-grab-active");
        },
        onDeactivate: () => {
          document.body.classList.remove("react-grab-active");
        },
      },
      cleanup: () => {
        console.log("Plugin cleaning up...");
        unsubscribeToolbar();
        document.removeEventListener("keydown", handleKeydown);
      },
    };
  },
};

api.registerPlugin(setupPlugin);
```

## 6. File Handler Plugin

Handle "Open in Editor" clicks:

```typescript
import type { Plugin } from "react-grab/core";

const vscodePlugin: Plugin = {
  name: "vscode-handler",
  hooks: {
    onOpenFile: (filePath, lineNumber) => {
      const url = `vscode://file/${filePath}${lineNumber ? `:${lineNumber}` : ""}`;
      window.open(url);
      return true; // Indicate we handled it
    },
  },
};

api.registerPlugin(vscodePlugin);
```

## 7. State Logger Plugin (Debugging)

Log all state changes for debugging:

```typescript
import type { Plugin } from "react-grab/core";

const debugPlugin: Plugin = {
  name: "debug-logger",
  hooks: {
    onStateChange: (state) => {
      console.log("[React Grab State]", {
        isActive: state.isActive,
        isDragging: state.isDragging,
        isCopying: state.isCopying,
        isPromptMode: state.isPromptMode,
        targetElement: state.targetElement?.tagName,
      });
    },
    onSelectionBox: (visible, bounds, element) => {
      console.log("[Selection Box]", { visible, bounds, element: element?.tagName });
    },
    onContextMenu: (element, position) => {
      console.log("[Context Menu]", { element: element.tagName, position });
    },
  },
};

api.registerPlugin(debugPlugin);
```

## 8. Conditional Activation Plugin

Only allow activation on certain elements:

```typescript
import type { Plugin } from "react-grab/core";

const conditionalPlugin: Plugin = {
  name: "conditional-activation",
  options: {
    activationKey: (event: KeyboardEvent) => {
      // Only activate with Alt+G
      return event.altKey && event.key === "g";
    },
  },
  hooks: {
    onElementHover: (element) => {
      // Skip non-React elements
      if (!element.hasAttribute("data-reactroot") && 
          !element.closest("[data-reactroot]")) {
        return;
      }
    },
  },
};

api.registerPlugin(conditionalPlugin);
```

## 9. Custom Content Generator Plugin

Customize what gets copied:

```typescript
import type { Plugin } from "react-grab/core";

const customContentPlugin: Plugin = {
  name: "custom-content",
  options: {
    getContent: async (elements) => {
      const contents = await Promise.all(
        elements.map(async (element) => {
          const tagName = element.tagName.toLowerCase();
          const className = element.className;
          const innerHTML = element.innerHTML.slice(0, 100);

          return `<${tagName} class="${className}">\n  ${innerHTML}...\n</${tagName}>`;
        })
      );
      return contents.join("\n\n");
    },
  },
};

api.registerPlugin(customContentPlugin);
```

## 10. Runtime Registration Pattern

Register plugins after React Grab initializes:

```typescript
import type { Plugin, ReactGrabAPI } from "react-grab/core";

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

const attachPlugin = (plugin: Plugin) => {
  // Check if already initialized
  if (isReactGrabApi(window.__REACT_GRAB__)) {
    window.__REACT_GRAB__.registerPlugin(plugin);
    return;
  }

  // Wait for initialization
  window.addEventListener(
    "react-grab:init",
    (event) => {
      if (event instanceof CustomEvent && isReactGrabApi(event.detail)) {
        event.detail.registerPlugin(plugin);
      }
    },
    { once: true }
  );
};

// Usage
attachPlugin({
  name: "late-plugin",
  hooks: {
    onActivate: () => console.log("Late plugin activated!"),
  },
});
```
