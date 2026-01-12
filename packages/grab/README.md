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

Run this command to install React Grab into your project. Ensure you are running at project root (e.g. where the `next.config.ts` or `vite.config.ts` file is located).

```html
npx -y grab@latest init
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
        {/* put this in the <head> */}
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
        {/* put this in the <Head> */}
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

Your `index.html` could look like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i grab
      // then in head:
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

## MCP Server

React Grab includes an MCP (Model Context Protocol) server that gives AI coding agents direct access to your browser. This enables agents to navigate, click, fill forms, and take screenshots.

### Setup

Run during project init:

```bash
npx -y grab@latest init
# When prompted, choose to add the MCP server
```

Or add it separately:

```bash
npx -y grab@latest add mcp --client cursor
```

Supported clients: `cursor`, `claude-code`, `vscode`, `opencode`, `codex`, `gemini-cli`, `windsurf`, `zed`, `droid`

### MCP Tools

Once configured, your agent has access to:

- `browser_snapshot` - Get ARIA accessibility tree with element refs (e1, e2...)
- `browser_execute` - Run Playwright code with helpers like `ref('e1').click()`

## Skill

For agents that support skills (like Codex), install the `react-grab-browser` skill:

```bash
npx -y grab@latest add skill
# or
npx -y openskills install aidenybai/react-grab -y
```

The skill provides browser automation with Playwright using your real browser cookies. See the [skill documentation](https://github.com/aidenybai/react-grab/blob/main/skills/react-grab-browser/SKILL.md) for full details.

## Extending React Grab

React Grab uses a plugin system to extend functionality. Check out the [type definitions](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) to see all available options.

#### Basic Usage

```typescript
import { init } from "grab/core";

const api = init();

api.activate();
api.copyElement(document.querySelector(".my-element"));
console.log(api.getState());
```

#### Lifecycle Hooks Plugin

Track element selections with analytics:

```typescript
api.registerPlugin({
  name: "analytics",
  hooks: {
    onElementSelect: (element) => {
      analytics.track("element_selected", { tagName: element.tagName });
    },
    onDragEnd: (elements, bounds) => {
      analytics.track("drag_end", { count: elements.length, bounds });
    },
    onCopySuccess: (elements, content) => {
      analytics.track("copy", { count: elements.length });
    },
  },
});
```

#### Context Menu Plugin

Add custom actions to the right-click menu:

```typescript
api.registerPlugin({
  name: "custom-actions",
  actions: [
    {
      id: "log-to-console",
      label: "Log to Console",
      onAction: ({ elements }) => console.dir(elements[0]),
    },
  ],
});
```

#### Theme Plugin

Customize the UI appearance:

```typescript
api.registerPlugin({
  name: "theme",
  theme: {
    hue: 180, // shift colors (pink → cyan)
    crosshair: { enabled: false },
    elementLabel: { enabled: false },
  },
});
```

#### Agent Plugin

Create a custom agent that processes selected elements:

```typescript
api.registerPlugin({
  name: "my-custom-agent",
  actions: [
    {
      id: "custom-agent",
      label: "Ask AI",
      onAction: ({ enterPromptMode }) => enterPromptMode?.(),
      agent: {
        provider: {
          async *send({ prompt, content }, signal) {
            yield "Analyzing element...";

            const response = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, content }),
              signal,
            });

            yield "Processing response...";

            const result = await response.json();
            yield `Done: ${result.message}`;
          },
        },
      },
    },
  ],
});
```

## Resources & Contributing Back

Want to try it out? Check the [our demo](https://react-grab.com).

Looking to contribute back? Check the [Contributing Guide](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md) out.

Want to talk to the community? Hop in our [Discord](https://discord.com/invite/G7zxfUzkm7) and share your ideas and what you've build with React Grab.

Find a bug? Head over to our [issue tracker](https://github.com/aidenybai/react-grab/issues) and we'll do our best to help. We love pull requests, too!

We expect all contributors to abide by the terms of our [Code of Conduct](https://github.com/aidenybai/react-grab/blob/main/.github/CODE_OF_CONDUCT.md).

[**→ Start contributing on GitHub**](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md)

### License

React Grab is MIT-licensed open-source software.

_Thank you to [Andrew Luetgers](https://github.com/andrewluetgers) for donating the `grab` npm package name._
