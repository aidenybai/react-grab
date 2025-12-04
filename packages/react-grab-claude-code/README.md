# @react-grab/claude-code

Claude Code agent provider for React Grab. Requires running a local server that interfaces with the Claude Agent SDK.

## Installation

```bash
npm install @react-grab/claude-code
# or
pnpm add @react-grab/claude-code
# or
bun add @react-grab/claude-code
# or
yarn add @react-grab/claude-code
```

## Server Setup

The server runs on port `4567` by default.

### Quick Start (CLI)

Start the server in the background before running your dev server:

```bash
npx @react-grab/claude-code && pnpm run dev
```

The server will run as a detached background process. **Note:** Stopping your dev server (Ctrl+C) won't stop the React Grab server. To stop it:

```bash
pkill -f "react-grab.*server"
```

### Recommended: Config File (Automatic Lifecycle)

For better lifecycle management, start the server from your config file. This ensures the server stops when your dev server stops:

### Vite

```ts
// vite.config.ts
import { startServer } from "@react-grab/claude-code/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

### Next.js

```ts
// next.config.ts
import { startServer } from "@react-grab/claude-code/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

## Client Usage

### Script Tag

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<script src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"></script>
```

### Next.js

Using the `Script` component in your `app/layout.tsx`:

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

### ES Module

```tsx
import { attachAgent } from "@react-grab/claude-code/client";

attachAgent();
```

## How It Works

```
┌─────────────────┐      HTTP       ┌─────────────────┐      SDK       ┌─────────────────┐
│                 │  localhost:4567 │                 │                │                 │
│   React Grab    │ ──────────────► │     Server      │ ─────────────► │   Claude Code   │
│    (Browser)    │ ◄────────────── │   (Node.js)     │ ◄───────────── │     (Agent)     │
│                 │       SSE       │                 │                │                 │
└─────────────────┘                 └─────────────────┘                └─────────────────┘
      Client                              Server                            Agent
```

1. **React Grab** sends the selected element context to the server via HTTP POST
2. **Server** receives the request and forwards it to Claude Code via the Agent SDK
3. **Claude Code** processes the request and streams responses back
4. **Server** relays status updates to the client via Server-Sent Events (SSE)
