# Agent Playground

A demo app for testing react-grab's agent provider API with multiple agent backends.

## Setup

1. Install dependencies:

```bash
ni
```

2. Start the demo app with your preferred agent:

```bash
nr dev:claude    # Claude Code (default)
nr dev:cursor    # Cursor
nr dev:opencode  # OpenCode
```

The demo app runs at `http://localhost:5174`.

## Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `nr dev`          | Run with Claude Code (default) |
| `nr dev:claude`   | Run with Claude Code           |
| `nr dev:cursor`   | Run with Cursor                |
| `nr dev:opencode` | Run with OpenCode              |

## Demo App

The demo app includes:

- Example UI components to test with react-grab
- Agent activity logs panel
- Instructions for using the agent

**How to use:**

1. Click "Grab Element" or press `Cmd/Ctrl + Shift + E`
2. Hover over elements and click to select
3. Type your instruction and press `Enter` to send to the agent

## Supported Agents

- **Claude Code** - Uses the Claude Agent SDK (port 4567)
- **Cursor** - Uses the Cursor Agent CLI (port 5567)
- **OpenCode** - Uses the OpenCode CLI (port 6567)
- **Ami** - Client-only, connects to ami.dev (no local server)
