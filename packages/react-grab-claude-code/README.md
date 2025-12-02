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

### Vite

```ts
// vite.config.ts
import "@react-grab/claude-code/server";
```

### Next.js

```ts
// next.config.ts
import "@react-grab/claude-code/server";
```

## Client Usage

```tsx
import { init } from "react-grab/core";
import { createClaudeAgentProvider } from "@react-grab/claude-code/client";

const agentProvider = createClaudeAgentProvider();

init({
  agent: {
    provider: agentProvider,
  },
});
```

## Configuration

You can customize the server URL and default options:

```tsx
const agentProvider = createClaudeAgentProvider({
  getOptions: () => ({
    model: "opus",
    maxTurns: 20,
  }),
});
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
