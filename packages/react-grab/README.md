# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> React Grab

[![size](https://img.shields.io/bundlephobia/minzip/react-grab?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/react-grab)
[![version](https://img.shields.io/npm/v/react-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)
[![downloads](https://img.shields.io/npm/dt/react-grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)

React Grab allows you to select an element and copy its context (like HTML, React component, and file source)

It makes tools like Cursor, Claude Code, Copilot run up to [**66% faster**](https://react-grab.com/blog/intro)

### [Try out a demo! →](https://react-grab.com)

https://github.com/user-attachments/assets/fdb34329-b471-4b39-b433-0b1a27a94bd8

## Install

> [**Install using Cursor**](https://cursor.com/link/prompt?text=1.+Run+curl+-s+https%3A%2F%2Freact-grab.com%2Fllms.txt+%0A2.+Understand+the+content+and+follow+the+instructions+to+install+React+Grab.%0A3.+Tell+the+user+to+refresh+their+local+app+and+explain+how+to+use+React+Grab)

Get started in 1 minute by adding this script tag to your app:

```html
<script src="//www.react-grab.com/script.js" crossorigin="anonymous"></script>
```

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
        {/* put this in the <Head> */}
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

Your `index.html` could look like this:

```html
<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // first npm i react-grab
      // then in head:
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

## Coding agent integration (beta)

React Grab can send selected element context directly to your coding agent. This enables a workflow where you select a UI element and an agent automatically makes changes to your codebase.

This means **no copying and pasting** - just select the element and let the agent do the rest. [Learn more →](https://react-grab.com/blog/agent)

### Claude Code

#### Server Setup

The server runs on port `4567` and interfaces with the Claude Agent SDK. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/claude-code@latest && next dev"
  }
}
```

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"></script>
```

Or using Next.js `Script` component in your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"
              strategy="lazyOnload"
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Cursor CLI

#### Server Setup

The server runs on port `5567` and interfaces with the `cursor-agent` CLI. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/cursor@latest && next dev"
  }
}
```

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/cursor/dist/client.global.js"></script>
```

Or using Next.js `Script` component in your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/@react-grab/cursor/dist/client.global.js"
              strategy="lazyOnload"
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Opencode

#### Server Setup

The server runs on port `6567` and interfaces with the Opencode CLI. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/opencode@latest && next dev"
  }
}
```

> **Note:** You must have [Opencode](https://opencode.ai) installed (`npm i -g opencode-ai@latest`).

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/opencode/dist/client.global.js"></script>
```

Or using Next.js `Script` component in your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/@react-grab/opencode/dist/client.global.js"
              strategy="lazyOnload"
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Extending React Grab

React Grab provides an public customization API. Check out the [type definitions](https://github.com/aidenybai/react-grab/blob/main/packages/react-grab/src/types.ts) to see all available options for extending React Grab.

```typescript
import { init } from "react-grab/core";

const api = init({
  theme: {
    enabled: true, // disable all UI by setting to false
    hue: 180, // shift colors by 180 degrees (pink → cyan/turquoise)
    crosshair: {
      enabled: false, // disable crosshair
    },
    elementLabel: {
      enabled: false, // disable element label
    },
  },

  onElementSelect: (element) => {
    console.log("Selected:", element);
  },
  onCopySuccess: (elements, content) => {
    console.log("Copied to clipboard:", content);
  },
  onStateChange: (state) => {
    console.log("Active:", state.isActive);
  },
});

api.activate();
api.copyElement(document.querySelector(".my-element"));
console.log(api.getState());
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
