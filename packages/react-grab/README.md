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

Use the `-y` flag to skip interactive prompts:

```bash
npx -y grab@latest init -y
```

## Connect to Your Agent

Connect React Grab directly to your coding agent (Cursor, Claude Code, Codex, Gemini, Amp, and more):

```bash
npx -y grab@latest add [agent]
```

Or connect via MCP:

```bash
npx -y grab@latest add mcp
```

Disconnect an agent:

```bash
npx -y grab@latest remove [agent]
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

Add this to your `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      if (import.meta.env.DEV) {
        import("react-grab");
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
npm install react-grab
```

Then add this at the top of your main entry file (e.g., `src/index.tsx` or `src/main.tsx`):

```tsx
if (process.env.NODE_ENV === "development") {
  import("react-grab");
}
```

## Extending React Grab

React Grab exposes the `__REACT_GRAB__` API for extending functionality with plugins, hooks, actions, themes, and custom agents.

See [`packages/react-grab/src/types.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) and [`packages/react-grab/src/core/plugin-registry.ts`](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/core/plugin-registry.ts) for reference.

Or copy this into an agent to generate a plugin:

```md
Clone https://github.com/aidenybai/react-grab into /tmp

Check these files for reference:

- packages/react-grab/src/types.ts (Plugin and PluginHooks interfaces)
- packages/react-grab/src/core/plugin-registry.ts (implementation)

Plugins are registered via `__REACT_GRAB__.registerPlugin({ name, hooks, actions, theme })`.

Add the code in client-side code (e.g., "use client" in Next.js) inside a useEffect after React Grab loads.

Generate an example plugin that logs when an element is selected.
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
