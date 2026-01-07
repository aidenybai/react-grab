# Agent Playground

A development playground for testing React Grab agent providers.

## Quick Start

```bash
# Install dependencies
ni

# Run with no providers (manual selection via UI)
nr dev

# Run with a specific provider (starts server + frontend)
nr dev:cursor
nr dev:claude
nr dev:opencode
```

## Multiple Providers

To run multiple providers, you need to:

1. **Start the backend servers** in one terminal:
```bash
nr servers
```

2. **Start the frontend** with providers in another terminal:
```bash
nr dev:all
```

Or use individual servers if you only need specific ones:
```bash
# Terminal 1
nr servers:cursor

# Terminal 2
nr servers:claude

# Terminal 3
nr dev:all
# Or with specific providers:
# VITE_PROVIDER=cursor,claude nr dev
```

You can also add providers via URL:
```
http://localhost:5174?provider=cursor,claude
```

## Available Providers

| Provider   | Script           | Has Server | Description              |
|------------|------------------|------------|--------------------------|
| `cursor`   | `dev:cursor`     | Yes        | Cursor IDE agent         |
| `claude`   | `dev:claude`     | Yes        | Claude Code CLI agent    |
| `opencode` | `dev:opencode`   | Yes        | OpenCode agent           |
| `codex`    | `dev:codex`      | Yes        | Codex agent              |
| `gemini`   | `dev:gemini`     | Yes        | Google Gemini agent      |
| `amp`      | `dev:amp`        | Yes        | AMP agent                |
| `ami`      | `dev:ami`        | No         | AMI agent (client-only)  |
| `droid`    | `dev:droid`      | Yes        | Droid agent              |

## Scripts

| Script          | Description                                     |
|-----------------|------------------------------------------------|
| `nr dev`        | Start frontend only (no providers)             |
| `nr dev:cursor` | Start Cursor server + frontend                 |
| `nr dev:all`    | Start frontend with all providers loaded       |
| `nr servers`    | Start ALL provider backend servers             |
| `nr servers:cursor` | Start only Cursor backend server           |
| `nr servers:claude` | Start only Claude backend server           |

## How It Works

1. Each provider has a **backend server** that communicates with the AI
2. Each provider has a **client script** that registers actions with React Grab
3. When you right-click an element, you'll see actions from all loaded providers
4. Click an action to use that specific agent

## UI Features

- **Active Providers**: Shows currently loaded providers with colored badges
- **Failed Providers**: Shows providers that failed to load (with error messages)
- **Available Providers**: Click to add a provider (reloads page)
- **Activity Log**: Shows initialization and status messages
- **Test Elements**: Sample UI components to test selection
