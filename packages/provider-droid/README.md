# @react-grab/droid

Factory Droid provider for React Grab. Requires running a local server that interfaces with the Factory CLI (`droid exec`).

## Installation

```bash
npm install @react-grab/droid
# or
pnpm add @react-grab/droid
# or
bun add @react-grab/droid
# or
yarn add @react-grab/droid
```

## Prerequisites

You must have the Factory CLI installed:

```bash
curl -fsSL https://app.factory.ai/cli | sh
```

And set your Factory API key:

```bash
export FACTORY_API_KEY=fk-...
```

## Server Setup

The server runs on port `10567` by default.

### Quick Start (CLI)

Start the server in the background before running your dev server:

```bash
npx @react-grab/droid@latest && pnpm run dev
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
import { startServer } from "@react-grab/droid/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

### Next.js

```ts
// next.config.ts
import { startServer } from "@react-grab/droid/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

## Client Usage

### Script Tag

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<script src="//unpkg.com/@react-grab/droid/dist/client.global.js"></script>
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

### ES Module

```tsx
import { attachAgent } from "@react-grab/droid/client";

attachAgent();
```

## Configuration Options

The provider supports the following options:

```typescript
interface DroidAgentOptions {
  autoLevel?: "low" | "medium" | "high"; // Autonomy level (default: "low")
  model?: string; // Model to use (e.g., "claude-sonnet-4-5-20250929")
  reasoningEffort?: "low" | "medium" | "high";
  workspace?: string; // Working directory
}
```

## How It Works

```
┌─────────────────┐      HTTP       ┌─────────────────┐     stdin      ┌─────────────────┐
│                 │ localhost:10567 │                 │                │                 │
│   React Grab    │ ──────────────► │     Server      │ ─────────────► │   droid exec    │
│    (Browser)    │ ◄────────────── │   (Node.js)     │ ◄───────────── │      (CLI)      │
│                 │       SSE       │                 │     stdout     │                 │
└─────────────────┘                 └─────────────────┘                └─────────────────┘
      Client                              Server                            Agent
```

1. **React Grab** sends the selected element context to the server via HTTP POST
2. **Server** receives the request and spawns `droid exec` with `--output-format stream-json`
3. **droid exec** processes the request and streams JSON responses to stdout
4. **Server** relays status updates to the client via Server-Sent Events (SSE)

## Autonomy Levels

- `low` (default): File edits only, no system modifications
- `medium`: Includes package installations, local git operations
- `high`: Full access including git push, deployments
