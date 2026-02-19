# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> Grab

[![size](https://img.shields.io/bundlephobia/minzip/grab?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/grab)
[![version](https://img.shields.io/npm/v/grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)
[![downloads](https://img.shields.io/npm/dt/grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)

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
            src="//unpkg.com/grab/dist/index.global.js"
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
            src="//unpkg.com/grab/dist/index.global.js"
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

Add this to your `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      if (import.meta.env.DEV) {
        import("grab");
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### Webpack

First, install React Grab:

```bash
npm install grab
```

Then add this at the top of your main entry file (e.g., `src/index.tsx` or `src/main.tsx`):

```tsx
if (process.env.NODE_ENV === "development") {
  import("grab");
}
```

## Plugins

React Grab can be extended with plugins. A plugin can add context menu actions, toolbar menu items, lifecycle hooks, and theme overrides.

Register a plugin via `window.__REACT_GRAB__`:

```js
window.__REACT_GRAB__.registerPlugin({
  name: "my-plugin",
  hooks: {
    onElementSelect: (element) => {
      console.log("Selected:", element.tagName);
    },
  },
});
```

In React, register inside a `useEffect` after React Grab loads:

```jsx
useEffect(() => {
  const api = window.__REACT_GRAB__;
  if (!api) return;

  api.registerPlugin({
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

  return () => api.unregisterPlugin("my-plugin");
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

A plugin can provide any combination of:

- **`actions`** — context menu and/or toolbar items in a single array (use `target: "toolbar"` for toolbar items)
- **`hooks`** — lifecycle callbacks like `onActivate`, `onElementSelect`, `onCopySuccess`, `transformCopyContent`, etc. (see `PluginHooks`)
- **`theme`** — partial theme overrides (see `Theme`)
- **`options`** — override default options like `activationMode` or `keyHoldDuration`
- **`setup(api)`** — a function that receives the full `ReactGrabAPI` and can return additional config or a `cleanup` function

See [`packages/react-grab/src/types.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) for the full `Plugin`, `PluginHooks`, and `PluginConfig` interfaces.

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
