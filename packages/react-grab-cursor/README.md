# @react-grab/cursor

Cursor agent provider for React Grab. Requires running a local server that interfaces with the Cursor Agent CLI.

## Installation

```bash
npm install @react-grab/cursor
# or
pnpm add @react-grab/cursor
# or
bun add @react-grab/cursor
# or
yarn add @react-grab/cursor
```

## Server Setup

The server runs on port `5567` by default.

### Quick Start (CLI)

Start the server in the background before running your dev server:

```bash
npx @react-grab/cursor && pnpm run dev
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
import { startServer } from "@react-grab/cursor/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

### Next.js

```ts
// next.config.ts
import { startServer } from "@react-grab/cursor/server";

if (process.env.NODE_ENV === "development") {
  startServer();
}
```

## Client Usage

### Script Tag

```html
<script src="//unpkg.com/react-grab/dist/index.global.js"></script>
<script src="//unpkg.com/@react-grab/cursor/dist/client.global.js"></script>
```

### ES Module

```tsx
import { attachAgent } from "@react-grab/cursor/client";

attachAgent();
```

## How It Works

```
┌─────────────────┐      HTTP       ┌─────────────────┐     stdin      ┌─────────────────┐
│                 │  localhost:5567 │                 │                │                 │
│   React Grab    │ ──────────────► │     Server      │ ─────────────► │  cursor-agent   │
│    (Browser)    │ ◄────────────── │   (Node.js)     │ ◄───────────── │      (CLI)      │
│                 │       SSE       │                 │     stdout     │                 │
└─────────────────┘                 └─────────────────┘                └─────────────────┘
      Client                              Server                            Agent
```

1. **React Grab** sends the selected element context to the server via HTTP POST
2. **Server** receives the request and spawns the `cursor-agent` CLI process
3. **cursor-agent** processes the request and streams JSON responses to stdout
4. **Server** relays status updates to the client via Server-Sent Events (SSE)
