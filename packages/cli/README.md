# @react-grab/cli

Interactive CLI to install React Grab in your project.

## Usage

```bash
npx grab
```

### Interactive Mode (default)

Running without options starts the interactive wizard:

```bash
npx grab
```

### Non-Interactive Mode

Pass options to skip prompts:

```bash
# Auto-detect everything and install without prompts
npx grab -y

# Specify framework
npx grab -f next -r app -y

# Use specific package manager
npx grab -p pnpm -y
```

## Options

| Option              | Alias | Description                                   | Choices                      |
| ------------------- | ----- | --------------------------------------------- | ---------------------------- |
| `--framework`       | `-f`  | Framework to configure                        | `next`, `vite`, `webpack`    |
| `--package-manager` | `-p`  | Package manager to use                        | `npm`, `yarn`, `pnpm`, `bun` |
| `--router`          | `-r`  | Next.js router type                           | `app`, `pages`               |
| `--yes`             | `-y`  | Skip all confirmation prompts                 | -                            |
| `--skip-install`    | -     | Skip package installation (only modify files) | -                            |
| `--help`            | `-h`  | Show help                                     | -                            |
| `--version`         | `-v`  | Show version                                  | -                            |

## Examples

```bash
# Interactive setup
npx grab

# Quick install with auto-detection
npx grab -y

# Next.js App Router
npx grab -f next -r app -y

# Vite with pnpm
npx grab -f vite -p pnpm -y

# Only modify files (skip npm install)
npx grab --skip-install -y
```

## Supported Frameworks

| Framework              | File Modified                     |
| ---------------------- | --------------------------------- |
| Next.js (App Router)   | `app/layout.tsx`                  |
| Next.js (Pages Router) | `pages/_document.tsx`             |
| Vite                   | `index.html`                      |
| Webpack                | `src/index.tsx` or `src/main.tsx` |

## Manual Installation

If the CLI doesn't work for your setup, visit the docs:

https://react-grab.com/docs
