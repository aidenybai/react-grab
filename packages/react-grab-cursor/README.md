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

### Vite

```ts
// vite.config.ts
import "@react-grab/cursor/server";
```

### Next.js

```ts
// next.config.ts
import "@react-grab/cursor/server";
```

## Client Usage

```tsx
import { init } from "react-grab/core";
import { createCursorAgentProvider } from "@react-grab/cursor/client";

const agentProvider = createCursorAgentProvider();

init({
  agent: {
    provider: agentProvider,
  },
});
```

## Configuration

You can customize the server URL and default options:

```tsx
const agentProvider = createCursorAgentProvider({
  getOptions: () => ({
    model: "composer-1",
    workspace: "/path/to/workspace",
  }),
});
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
