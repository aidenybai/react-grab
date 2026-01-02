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

Run this command to install React Grab into your project. Ensure you are running at project root (e.g. where the `next.config.ts` or `vite.config.ts` file is located).

```html
npx grab@latest init
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

## Coding agent integration

React Grab can send selected element context directly to your coding agent. This enables a workflow where you select a UI element and an agent automatically makes changes to your codebase.

This means **no copying and pasting** - just select the element and let the agent do the rest. [Read more about coding agent integration →](https://react-grab.com/blog/agent)

> **Click to expand** setup instructions for your coding agent:

<details>
<summary><strong>Claude Code</strong></summary>

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

</details>

<details>
<summary><strong>Cursor CLI</strong></summary>

You must have the [`cursor-agent` CLI](https://cursor.com/docs/cli/overview) installed.

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

</details>

<details>
<summary><strong>OpenCode</strong></summary>

#### Server Setup

The server runs on port `6567` and interfaces with the OpenCode CLI. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/opencode@latest && next dev"
  }
}
```

> **Note:** You must have [OpenCode](https://opencode.ai) installed (`npm i -g opencode-ai@latest`).

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

</details>

<details>
<summary><strong>Codex</strong></summary>

#### Server Setup

The server runs on port `7567` and interfaces with the OpenAI Codex SDK. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/codex@latest && next dev"
  }
}
```

> **Note:** You must have [Codex](https://github.com/openai/codex) installed (`npm i -g @openai/codex`).

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/codex/dist/client.global.js"></script>
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
              src="//unpkg.com/@react-grab/codex/dist/client.global.js"
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

</details>

<details>
<summary><strong>Gemini</strong></summary>

#### Server Setup

The server runs on port `8567` and interfaces with the Gemini CLI. Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/gemini@latest && next dev"
  }
}
```

> **Note:** You must have [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed.

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/gemini/dist/client.global.js"></script>
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
              src="//unpkg.com/@react-grab/gemini/dist/client.global.js"
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

</details>

<details>
<summary><strong>Amp</strong></summary>

#### Server Setup

The server runs on port `9567` and interfaces with the [Amp SDK](https://ampcode.com/manual/sdk). Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/amp@latest && next dev"
  }
}
```

> **Note:** You must have an [Amp API key](https://ampcode.com/settings) set via `AMP_API_KEY` environment variable.

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/amp/dist/client.global.js"></script>
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
              src="//unpkg.com/@react-grab/amp/dist/client.global.js"
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

</details>

<details>
<summary><strong>Factory Droid</strong></summary>

#### Server Setup

The server runs on port `10567` and interfaces with the [Factory CLI](https://docs.factory.ai/cli/droid-exec/overview). Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "npx @react-grab/droid@latest && next dev"
  }
}
```

> **Note:** You must have [Factory CLI](https://app.factory.ai) installed (`curl -fsSL https://app.factory.ai/cli | sh`) and `FACTORY_API_KEY` environment variable set.

#### Client Setup

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<!-- add this in the <head> -->
<script src="//unpkg.com/@react-grab/droid/dist/client.global.js"></script>
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
              src="//unpkg.com/@react-grab/droid/dist/client.global.js"
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

</details>

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

_Thank you to [Andrew Luetgers](https://github.com/andrewluetgers) for donating the `grab` npm package name._
