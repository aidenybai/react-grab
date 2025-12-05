# @react-grab/cli

Interactive CLI to install React Grab in your project.

## Usage

```bash
npx @react-grab/cli
```

### Interactive Mode (default)

Running without options starts the interactive wizard:

```bash
npx @react-grab/cli
```

### Non-Interactive Mode

Pass options to skip prompts:

```bash
# Auto-detect everything and install without prompts
npx @react-grab/cli -y

# Specify framework and agent
npx @react-grab/cli -f next -r app -a cursor -y

# Use specific package manager
npx @react-grab/cli -p pnpm -a claude-code -y
```

## Options

| Option | Alias | Description | Choices |
|--------|-------|-------------|---------|
| `--framework` | `-f` | Framework to configure | `next`, `vite`, `webpack` |
| `--package-manager` | `-p` | Package manager to use | `npm`, `yarn`, `pnpm`, `bun` |
| `--router` | `-r` | Next.js router type | `app`, `pages` |
| `--agent` | `-a` | Agent integration to add | `claude-code`, `cursor`, `opencode`, `none` |
| `--yes` | `-y` | Skip all confirmation prompts | - |
| `--skip-install` | - | Skip package installation (only modify files) | - |
| `--help` | `-h` | Show help | - |
| `--version` | `-v` | Show version | - |

## Examples

```bash
# Interactive setup
npx @react-grab/cli

# Quick install with auto-detection
npx @react-grab/cli -y

# Next.js App Router with Cursor agent
npx @react-grab/cli -f next -r app -a cursor -y

# Vite with Claude Code agent using pnpm
npx @react-grab/cli -f vite -p pnpm -a claude-code -y

# Add agent to existing React Grab installation
npx @react-grab/cli -a opencode -y

# Only modify files (skip npm install)
npx @react-grab/cli -a cursor --skip-install -y
```

## Supported Frameworks

| Framework | File Modified |
|-----------|---------------|
| Next.js (App Router) | `app/layout.tsx` |
| Next.js (Pages Router) | `pages/_document.tsx` |
| Vite | `index.html` |
| Webpack | `src/index.tsx` or `src/main.tsx` |

## Agent Integrations

The CLI can optionally set up agent integrations for:

- **Claude Code** (`-a claude-code`) - Send selected elements to Claude Code
- **Cursor** (`-a cursor`) - Send selected elements to Cursor
- **Opencode** (`-a opencode`) - Send selected elements to Opencode

## Manual Installation

If the CLI doesn't work for your setup, visit the docs:

https://react-grab.com/docs
