# @react-grab/cli

Interactive CLI to install and configure React Grab in your project.

## Quick Start

```bash
npx grab@latest init
```

## Commands

### `grab init`

Initialize React Grab in your project. Auto-detects your framework and applies the necessary changes.

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

Connect React Grab to your coding agent via MCP.

```bash
npx grab@latest add mcp
```

| Option        | Alias | Description                              |
| ------------- | ----- | ---------------------------------------- |
| `--yes`       | `-y`  | Skip confirmation prompts                |
| `--cwd <cwd>` | `-c`  | Working directory (default: current dir) |

### `grab remove`

Disconnect React Grab from your coding agent.

```bash
npx grab@latest remove mcp
```

| Option        | Alias | Description                              |
| ------------- | ----- | ---------------------------------------- |
| `--yes`       | `-y`  | Skip confirmation prompts                |
| `--cwd <cwd>` | `-c`  | Working directory (default: current dir) |

### `grab configure`

Configure React Grab options. Runs an interactive wizard when called without flags.

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

| Framework              | Detection                             |
| ---------------------- | ------------------------------------- |
| Next.js (App Router)   | `next.config.ts` + `app/` directory   |
| Next.js (Pages Router) | `next.config.ts` + `pages/` directory |
| Vite                   | `vite.config.ts`                      |
| Webpack                | `webpack.config.*`                    |
