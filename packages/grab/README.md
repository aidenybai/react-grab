# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> Grab

[![version](https://img.shields.io/npm/v/grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)
[![downloads](https://img.shields.io/npm/dt/grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/grab)

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

## Build your own React Grab

Build a custom interface with the selection engine from `grab/primitives`. Use its APIs for hit testing, source context, page freezing, clipboard access, and editor navigation.

### Customize hit testing

Scope hit testing to a container or replace the default element filter with your own rules.

```typescript
import { getElementAtPoint, isElementGrabbable } from "grab/primitives";

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
