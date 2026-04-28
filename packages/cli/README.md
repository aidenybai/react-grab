# @react-grab/cli

Interactive CLI to install and configure React Grab in your project, plus a `log` subcommand that streams React Grab clipboard payloads as NDJSON for AI coding agents.

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

### `grab install-skill`

Install the `react-grab` skill into known agent skill directories (Cursor, Claude Code, Codex, OpenCode). Once installed, the agent will auto-invoke it on `/react-grab` or when the user references a previously-grabbed element.

```bash
npx grab@latest install-skill
```

| Option              | Alias | Description                                                   |
| ------------------- | ----- | ------------------------------------------------------------- |
| `--yes`             | `-y`  | Install to all supported agents without prompting             |
| `--agent <name...>` | `-a`  | Install only to the named agent(s) (e.g. Cursor, Claude Code) |

For an interactive flow that first verifies React Grab is installed and offers a simpler project-vs-global choice, see `grab add`.

### `grab remove`

Remove the React Grab skill from the selected agents.

```bash
npx grab@latest remove
```

| Option              | Alias | Description                                        |
| ------------------- | ----- | -------------------------------------------------- |
| `--yes`             | `-y`  | Remove from all supported agents without prompting |
| `--agent <name...>` | `-a`  | Remove only from the named agent(s)                |

### `grab log`

Stream every React Grab payload as NDJSON, one JSON object per line, until killed. The skill installed by `install-skill` shells out to this command — but you can also run it directly to script around grabs.

```bash
npx -y @react-grab/cli log
```

Each line has the shape `{"prompt":"...","content":"..."}` (the `prompt` field is omitted when the user didn't type one in the toolbar). The command takes no flags. It always mirrors every line to `.react-grab/logs` (and writes a `.react-grab/.gitignore` so the log never lands in version control).

Lifecycle depends on stdout:

- **Interactive (TTY)**: streams forever, exits only on SIGINT/SIGTERM or a fundamental clipboard error (exit code `2`, e.g. SSH or missing `xclip`).
- **Piped or redirected (non-TTY)**: exits cleanly with code `0` after writing the first match. This is what makes `log | head -n 1` and `log > grabs.ndjson` terminate without manual intervention.

To grab a single payload from a script, pipe to `head`:

```bash
npx -y @react-grab/cli log | head -n 1
```

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

# Install the React Grab skill into all supported agents
npx grab@latest install-skill -y

# Stream every grab as NDJSON until killed
npx -y @react-grab/cli log

# Take just the first grab and exit
npx -y @react-grab/cli log | head -n 1

# Change activation mode to hold
npx grab@latest configure --mode hold --hold-duration 500
```

## Migration from @react-grab/mcp

`@react-grab/mcp` is deprecated. To migrate:

1. Run `npx grab@latest install-skill`.
2. Remove the `react-grab-mcp` entry from your agent's `mcp.json` (Cursor, Claude Code, Codex, OpenCode, Windsurf, etc.).
3. Restart your agent. Type `/react-grab` and click an element.

## Supported Frameworks

| Framework              | Detection                             |
| ---------------------- | ------------------------------------- |
| Next.js (App Router)   | `next.config.ts` + `app/` directory   |
| Next.js (Pages Router) | `next.config.ts` + `pages/` directory |
| Vite                   | `vite.config.ts`                      |
| Webpack                | `webpack.config.*`                    |
