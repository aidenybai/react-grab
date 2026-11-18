# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> React Grab

[![version](https://img.shields.io/npm/v/react-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)
[![downloads](https://img.shields.io/npm/dt/react-grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)

Copy any UI element for your agent.

React Grab points agents to the actual source behind each selection. Agents are [**2× faster**](https://react-grab.com/benchmarks) and more accurate when using React Grab.

[**Website →**](https://react-grab.com)

## Quick Start

Run this at your project root:

```bash
npx grab@latest init
```

## How It Works

React Grab turns a browser selection into source context your agent can use:

1. Hover any UI element in your app.
2. Press **⌘C** or **Ctrl+C**.
3. Paste the copied context into your agent.

The copied context includes the selected element and its component stack with source locations:

```txt
[<a class="ml-auto inline-block text-sm" href="#">Forgot your password?</a> in LoginForm (at components/login-form.tsx:46:19)]
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

## Build your own React Grab

Build a custom interface with the selection engine from `react-grab/primitives`. Use its APIs for hit testing, source context, page freezing, clipboard access, and editor navigation.

### Customize hit testing

Scope hit testing to a container or replace the default element filter with your own rules.

```typescript
import { getElementAtPoint, isElementGrabbable } from "react-grab/primitives";

export const getPickerTarget = (
  event: PointerEvent,
  appElement: Element,
  toolbarElement: Element,
): Element | null =>
  getElementAtPoint(event.clientX, event.clientY, {
    container: appElement,
    filter: (candidate) => isElementGrabbable(candidate) && !toolbarElement.contains(candidate),
  });
```

Add `data-react-grab-ignore` to your picker interface so hit testing skips its subtree.

## Agent Integration

React Grab connects to coding agents through a layered architecture. Each layer builds on the previous — use whichever fits your workflow.

### Layer 0 — Paste (zero setup)

Grab an element, then **⌘V** / **Ctrl+V** into any agent chat. The clipboard already carries the source location, component stack, and HTML snippet. Works with every agent, no configuration needed.

### Layer 1 — Context File (zero-config auto-discovery)

When `grab watch` is running, React Grab maintains a living context file at `.react-grab/context.md` with the latest grab formatted as markdown. Agents that auto-index project files (Cursor, Claude Code, Copilot, etc.) discover it automatically — no skill or tool call required.

```bash
# Start the background watcher (polls clipboard → writes to .react-grab/)
npx grab@latest watch
```

The `.react-grab/` directory also keeps a grab journal (`.react-grab/grabs/`) so past selections survive clipboard overwrites and can be referenced later via `grab history`.

### Layer 2 — CLI Primitives

Composable one-shot commands that skills and scripts can call:

```bash
grab latest              # latest grab as JSON (reads .react-grab/ or falls back to clipboard)
grab context             # latest grab as formatted markdown
grab log                 # stream grabs as NDJSON (runs until killed)
grab history             # list past grabs from .react-grab/grabs/
```

### Layer 3 — Hooks

Git-hook-style executables that fire on each grab:

```bash
.react-grab/hooks/
└── on-grab              # receives JSON via stdin + env vars
```

Hooks are completely agent-agnostic — any executable that reads stdin works.

### Per-Agent Setup

`grab add` detects your agent and installs the right integration format:

```bash
grab add                 # interactive: pick agents
grab add cursor          # Cursor-specific integration
grab add claude          # Claude Code-specific integration
```

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
