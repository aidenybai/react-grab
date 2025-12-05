# Agent Playground

A test backend and demo app for react-grab's agent provider API using the [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/typescript).

## Setup

1. Install dependencies:

```bash
ni
```

2. Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your-api-key
```

3. Start both the server and demo app:

```bash
nr dev
```

This runs:

- **Server**: `http://localhost:3001` (Agent backend)
- **Demo App**: `http://localhost:5174` (Vite React app with react-grab)

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `nr dev`        | Run both server and app concurrently |
| `nr dev:server` | Run only the backend server          |
| `nr dev:app`    | Run only the Vite demo app           |

## Demo App

The demo app at `http://localhost:5174` includes:

- Example UI components to test with react-grab
- Agent activity logs panel
- Instructions for using the agent

**How to use:**

1. Hold `⌘+C` (Mac) or `Ctrl+C` (Windows) and hover over elements
2. Press `Enter` to open the input prompt
3. Type your instruction and press `Enter` to send to the agent

## Usage in Your Own App

```typescript
import { init } from "react-grab";
import { createAgentProvider } from "agent-playground/client";

const agentProvider = createAgentProvider("http://localhost:3001");

init({
  agentProvider: agentProvider,
  agentSessionStorage: "sessionStorage",
  onAgentStart: (session) => {
    console.log("Agent started:", session.id);
  },
  onAgentStatus: (status, session) => {
    console.log("Status update:", status);
  },
  onAgentComplete: (session) => {
    console.log("Agent completed!");
  },
  onAgentError: (error, session) => {
    console.error("Agent error:", error);
  },
});
```

## API Endpoints

### POST /agent

Send a request to the agent.

**Request Body:**

```json
{
  "content": "<selected_element>...</selected_element>",
  "prompt": "User's instruction"
}
```

**Response:** Server-Sent Events (SSE) stream with status updates.

### GET /health

Health check endpoint.
