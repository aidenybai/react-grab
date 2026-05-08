# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> Grab

[![version](https://img.shields.io/npm/v/grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)
[![downloads](https://img.shields.io/npm/dt/grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)

Copy any UI element for your agent.

React Grab points agents to the actual source behind each selection, so edits are [**2× faster**](https://github.com/aidenybai/react-grab-bench) and more accurate.

### [Try out a demo! →](https://react-grab.com)

## Quick Start

Run this at your project root:

```bash
npx grab@latest init
```

## Usage

Start your dev server, open your app, then hover any UI element and press **⌘C** or **Ctrl+C**.

React Grab copies that context to your clipboard, ready to paste into your agent.

## Copied Context

React Grab copies the selected element, its source location, nearby code, and component stack:

```txt
<a class="ml-auto inline-block text-sm" href="#">
  Forgot your password?
</a>

// components/login-form.tsx:46
  45| <div className="flex items-center">
> 46|   <a className="ml-auto inline-block text-sm" href="#">
  47|     Forgot your password?
  48|   </a>

  in LoginForm (at components/login-form.tsx:46:19)
```

## Manual Installation

If you cannot use the CLI, install React Grab manually for your framework:

#### Next.js (App router)

Add this inside your `app/layout.tsx`:

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

Add this at the top of your main entry file (e.g., `src/main.tsx`):

```tsx
if (import.meta.env.DEV) {
  import("grab");
}
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

Use plugins to extend React Grab's built-in UI with context menu actions, toolbar menu items, lifecycle hooks, and theme overrides. Plugins run within React Grab.

Register a plugin using the `registerPlugin` and `unregisterPlugin` exports:

```js
import { registerPlugin } from "grab";

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
import { registerPlugin, unregisterPlugin } from "grab";

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

## Resources & Contributing Back

Want to try it out? Check out [our demo](https://react-grab.com).

Looking to contribute back? Check out the [Contributing Guide](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md).

Want to talk to the community? Hop in our [Discord](https://discord.com/invite/G7zxfUzkm7) and share your ideas and what you've built with React Grab.

Find a bug? Head over to our [issue tracker](https://github.com/aidenybai/react-grab/issues) and we'll do our best to help. We love pull requests, too!

We expect all contributors to abide by the terms of our [Code of Conduct](https://github.com/aidenybai/react-grab/blob/main/.github/CODE_OF_CONDUCT.md).

[**Start contributing on GitHub**](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md)

### License

React Grab is MIT-licensed open-source software.

_Thank you to [Andrew Luetgers](https://github.com/andrewluetgers) for donating the `grab` npm package name._
