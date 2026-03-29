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

## Plugins

Extend React Grab with custom toolbar buttons, context menu actions, lifecycle hooks, and theme overrides via the plugin API.

```js
import { registerPlugin, unregisterPlugin } from "react-grab";
```

### Toolbar Entries

Add custom buttons directly to the toolbar. Each entry can be a simple action button or open a dropdown panel:

```js
registerPlugin({
  name: "my-devtools",
  toolbarEntries: [
    {
      id: "fps",
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>',
      tooltip: "FPS Monitor",
      // Action-only button (no dropdown), just toggle FPS tracking
      onClick: (handle) => {
        if (tracking) {
          stopTracking();
          handle.setBadge(undefined);
        } else {
          startTracking((fps) => handle.setBadge(fps));
        }
      },
    },
    {
      id: "render-monitor",
      icon: "🔍",
      tooltip: "Render Monitor",
      // Dropdown button: onRender receives a raw DOM container
      onRender: (container, handle) => {
        container.innerHTML = `<div style="padding:12px">
          <strong>Renders: 0</strong>
          <button id="clear">Clear</button>
        </div>`;

        container.querySelector("#clear").addEventListener("click", () => {
          handle.setBadge(undefined);
        });

        // Return a cleanup function (called when dropdown closes)
        return () => {
          /* teardown */
        };
      },
    },
  ],
});
```

The `handle` passed to callbacks provides:

- `handle.setBadge(value)` / `handle.setIcon(html)` / `handle.setTooltip(text)` to update the button at runtime
- `handle.open()` / `handle.close()` / `handle.toggle()` to control the dropdown
- `handle.api` for full React Grab API access

### Context Menu Actions

Add items to the right-click context menu or the toolbar dropdown menu:

```js
registerPlugin({
  name: "my-plugin",
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
  ],
});
```

### Hooks

Listen to lifecycle events:

```js
registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => {
      console.log("Selected:", element.tagName);
    },
  },
});
```

In React, register inside a `useEffect` and clean up on unmount:

```jsx
useEffect(() => {
  registerPlugin({ name: "my-plugin" /* ... */ });
  return () => unregisterPlugin("my-plugin");
}, []);
```

See [`packages/react-grab/src/types.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) for the full `Plugin`, `PluginHooks`, `PluginConfig`, `ToolbarEntry`, and `ToolbarEntryHandle` interfaces.

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
