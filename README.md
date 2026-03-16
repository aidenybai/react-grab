# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> React Grab

[![size](https://img.shields.io/bundlephobia/minzip/react-grab?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/react-grab)
[![version](https://img.shields.io/npm/v/react-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)
[![downloads](https://img.shields.io/npm/dt/react-grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)

Select context for coding agents directly from your website

How? Point at any element and press **⌘C** (Mac) or **Ctrl+C** (Windows/Linux) to copy the file name, React component, and HTML source code.

It makes tools like Cursor, Claude Code, Copilot run up to [**3× faster**](https://react-grab.com/blog/intro) and more accurate.

### [Try out a demo! →](https://react-grab.com)

![React Grab Demo](https://github.com/aidenybai/react-grab/blob/main/packages/website/public/demo.gif?raw=true)

## Install

Run this command at your project root (where `next.config.ts` or `vite.config.ts` is located):

```bash
npx -y grab@latest init
```

## Connect to MCP

```bash
npx -y grab@latest add mcp
```

## Usage

Once installed, hover over any UI element in your browser and press:

- **⌘C** (Cmd+C) on Mac
- **Ctrl+C** on Windows/Linux

This copies the element's context (file name, React component, and HTML source code) to your clipboard ready to paste into your coding agent. For example:

```js
<a class="ml-auto inline-block text-sm" href="#">
  Forgot your password?
</a>
in LoginForm at components/login-form.tsx:46:19
```

## Manual Installation

If you're using a React framework or build tool, view instructions below:

#### Next.js (App router)

Add this inside of your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Next.js (Pages router)

Add this into your `pages/_document.tsx`:

```jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

#### Vite

Add this at the top of your main entry file (e.g., `src/main.tsx`):

```tsx
if (import.meta.env.DEV) {
  import("react-grab");
}
```

#### Webpack

First, install React Grab:

```bash
npm install react-grab
```

Then add this at the top of your main entry file (e.g., `src/index.tsx` or `src/main.tsx`):

```tsx
if (process.env.NODE_ENV === "development") {
  import("react-grab");
}
```

## Plugins

Use plugins to extend React Grab's built-in UI with context menu actions, toolbar menu items, lifecycle hooks, and theme overrides. Plugins run within React Grab.

Register a plugin using the `registerPlugin` and `unregisterPlugin` exports:

```js
import { registerPlugin } from "react-grab";

registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => {
      console.log("Selected:", element.tagName);
    },
  },
});
```

In React, register inside a `useEffect`:

```jsx
import { registerPlugin, unregisterPlugin } from "react-grab";

useEffect(() => {
  registerPlugin({
    name: "my-plugin",
    actions: [
      {
        id: "my-action",
        label: "My Action",
        shortcut: "M",
        onAction: (context) => {
          console.log("Action on:", context.element);
          context.hideContextMenu();
        },
      },
    ],
  });

  return () => unregisterPlugin("my-plugin");
}, []);
```

Actions use a `target` field to control where they appear. Omit `target` (or set `"context-menu"`) for the right-click menu, or set `"toolbar"` for the toolbar dropdown:

```js
actions: [
  {
    id: "inspect",
    label: "Inspect",
    shortcut: "I",
    onAction: (ctx) => console.dir(ctx.element),
  },
  {
    id: "toggle-freeze",
    label: "Freeze",
    target: "toolbar",
    isActive: () => isFrozen,
    onAction: () => toggleFreeze(),
  },
];
```

See [`packages/react-grab/src/types.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) for the full `Plugin`, `PluginHooks`, and `PluginConfig` interfaces.

## Primitives

Use primitives to build your own element selector from scratch. Unlike plugins, primitives are standalone utility functions that don't depend on React Grab being initialized.

If you're using primitives to build a custom UI and don't want the default React Grab overlay, disable auto-initialization before importing `react-grab`:

```html
<script>
  window.__REACT_GRAB_DISABLED__ = true;
</script>
```

Here's a simple example of how to build your own element selector with hover highlight and one-click inspection:

```bash
npm install react-grab@latest
```

```tsx
import { useState } from "react";
import {
  getElementContext,
  freeze,
  unfreeze,
  openFile,
  type ReactGrabElementContext,
} from "react-grab/primitives";

const useElementSelector = (
  onSelect: (context: ReactGrabElementContext) => void,
) => {
  const [isActive, setIsActive] = useState(false);

  const startSelecting = () => {
    setIsActive(true);

    const highlightOverlay = document.createElement("div");
    Object.assign(highlightOverlay.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "999999",
      border: "2px solid #3b82f6",
      transition: "all 75ms ease-out",
      display: "none",
    });
    document.body.appendChild(highlightOverlay);

    const handleMouseMove = ({ clientX, clientY }: MouseEvent) => {
      highlightOverlay.style.display = "none";
      const target = document.elementFromPoint(clientX, clientY);
      if (!target) return;
      const { top, left, width, height } = target.getBoundingClientRect();
      Object.assign(highlightOverlay.style, {
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: "block",
      });
    };

    const handleClick = async ({ clientX, clientY }: MouseEvent) => {
      highlightOverlay.style.display = "none";
      const target = document.elementFromPoint(clientX, clientY);
      teardown();
      if (!target) return;
      freeze();
      onSelect(await getElementContext(target));
      unfreeze();
    };

    const teardown = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick, true);
      highlightOverlay.remove();
      setIsActive(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleClick, true);
  };

  return { isActive, startSelecting };
};

const ElementSelector = () => {
  const [context, setContext] = useState<ReactGrabElementContext | null>(null);
  const selector = useElementSelector(setContext);

  return (
    <div>
      <button onClick={selector.startSelecting} disabled={selector.isActive}>
        {selector.isActive ? "Selecting…" : "Select Element"}
      </button>
      {context && (
        <div>
          <p>Component: {context.componentName}</p>
          <p>Selector: {context.selector}</p>
          <pre>{context.stackString}</pre>
          <button
            onClick={() => {
              const frame = context.stack[0];
              if (frame?.fileName) openFile(frame.fileName, frame.lineNumber);
            }}
          >
            Open in Editor
          </button>
        </div>
      )}
    </div>
  );
};
```

See [`packages/react-grab/src/primitives.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/primitives.ts) for the full `ReactGrabElementContext`, `getElementContext`, `freeze`, `unfreeze`, and `openFile` primitives.

## Resources & Contributing Back

Want to try it out? Check out [our demo](https://react-grab.com).

Looking to contribute back? Check out the [Contributing Guide](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md).

Want to talk to the community? Hop in our [Discord](https://discord.com/invite/G7zxfUzkm7) and share your ideas and what you've built with React Grab.

Find a bug? Head over to our [issue tracker](https://github.com/aidenybai/react-grab/issues) and we'll do our best to help. We love pull requests, too!

We expect all contributors to abide by the terms of our [Code of Conduct](https://github.com/aidenybai/react-grab/blob/main/.github/CODE_OF_CONDUCT.md).

[**→ Start contributing on GitHub**](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md)

### License

React Grab is MIT-licensed open-source software.

_Thank you to [Andrew Luetgers](https://github.com/andrewluetgers) for donating the `grab` npm package name._
