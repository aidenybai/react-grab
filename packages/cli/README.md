# @react-grab/cli

CLI for installing React Grab, configuring its activation behavior, and connecting agents through MCP.

The CLI detects supported React projects, applies the dev-only setup, and can reconfigure an existing installation without hand-editing framework files.

## Quick Start

```bash
npx grab@latest init
```

## Commands

### `grab init`

Install React Grab in the current project. The CLI auto-detects the framework and applies the required development-only integration.

```bash
npx grab@latest init
```

| Option           | Alias | Description                              |
| ---------------- | ----- | ---------------------------------------- |
| `--yes`          | `-y`  | Skip confirmation prompts                |
| `--force`        | `-f`  | Force overwrite existing config          |
| `--key <key>`    | `-k`  | Activation key (e.g. Meta+K, Space)      |
| `--skip-install` |       | Skip package installation                |
| `--pkg <pkg>`    |       | Custom package URL                       |
| `--cwd <cwd>`    | `-c`  | Working directory (default: current dir) |

### `grab add`

Configure the React Grab MCP server for your agent.

```bash
npx grab@latest add mcp
```

| Option        | Alias | Description                              |
| ------------- | ----- | ---------------------------------------- |
| `--yes`       | `-y`  | Skip confirmation prompts                |
| `--cwd <cwd>` | `-c`  | Working directory (default: current dir) |

### `grab remove`

Remove the MCP connection from your agent.

```bash
npx grab@latest remove mcp
```

| Option        | Alias | Description                              |
| ------------- | ----- | ---------------------------------------- |
| `--yes`       | `-y`  | Skip confirmation prompts                |
| `--cwd <cwd>` | `-c`  | Working directory (default: current dir) |

### `grab configure`

Update React Grab options. Runs an interactive wizard when called without flags.

```bash
npx grab@latest configure
```

| Option                 | Alias | Description                                   |
| ---------------------- | ----- | --------------------------------------------- |
| `--yes`                | `-y`  | Skip confirmation prompts                     |
| `--key <key>`          | `-k`  | Activation key (e.g. Meta+K, Ctrl+Shift+G)    |
| `--mode <mode>`        | `-m`  | Activation mode (`toggle` or `hold`)          |
| `--hold-duration <ms>` |       | Key hold duration in ms (hold mode, max 2000) |
| `--allow-input <bool>` |       | Allow activation inside input fields          |
| `--context-lines <n>`  |       | Max context lines (max 50)                    |
| `--cdn <domain>`       |       | CDN domain (e.g. unpkg.com)                   |
| `--cwd <cwd>`          | `-c`  | Working directory (default: current dir)      |

## Examples

```bash
# Interactive setup
npx grab@latest init

# Non-interactive setup
npx grab@latest init -y

# Set a custom activation key
npx grab@latest init -k "Meta+K"

# Connect MCP to your agent
npx grab@latest add mcp

# Change activation mode to hold
npx grab@latest configure --mode hold --hold-duration 500

# Interactive configuration wizard
npx grab@latest configure
```

## Supported Frameworks

The CLI currently configures:

- Next.js App Router
- Next.js Pages Router
- Vite
- TanStack Start
- Webpack
