# Contributing to React Grab

Thanks for your interest in contributing to React Grab! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/react-grab.git
cd react-grab
```

2. Install dependencies using [@antfu/ni](https://github.com/antfu/ni):

```bash
ni
```

3. Build all packages:

```bash
nr build
```

4. Start development mode:

```bash
nr dev
```

## Project Structure

```
packages/
├── react-grab/          # Core library
├── grab/                # Bundled package (library + CLI, published as `grab`)
├── cli/                 # CLI implementation (@react-grab/cli)
├── provider-cursor/     # Cursor agent integration
├── provider-claude-code/  # Claude Code integration
├── provider-opencode/   # OpenCode integration
├── provider-codex/      # OpenAI Codex integration
├── provider-gemini/     # Google Gemini CLI integration
├── provider-amp/        # Amp SDK integration
├── provider-ami/        # AMI client
├── website/             # Documentation site (react-grab.com)
├── vite-playground/     # Vite development playground
├── next-playground/     # Next.js development playground
├── agent-playground/    # Agent testing playground
├── benchmarks/          # Performance benchmarks
└── web-extension/       # Browser extension
```

## Development Workflow

### Running Playgrounds

Test your changes in the playgrounds:

```bash
# Vite playground
pnpm --filter vite-playground dev

# Next.js playground
pnpm --filter next-playground dev

# Agent playground (for testing agent provider integrations)
pnpm --filter @react-grab/agent-playground dev:claude   # Claude Code
pnpm --filter @react-grab/agent-playground dev:cursor   # Cursor
pnpm --filter @react-grab/agent-playground dev:opencode # OpenCode
pnpm --filter @react-grab/agent-playground dev:codex    # Codex
pnpm --filter @react-grab/agent-playground dev:gemini   # Gemini
pnpm --filter @react-grab/agent-playground dev:amp      # Amp
pnpm --filter @react-grab/agent-playground dev:ami      # Ami
```

The agent playground runs at `http://localhost:5174` and lets you test react-grab's agent provider API with multiple backends.

### Running Tests

```bash
# Run CLI tests
pnpm --filter @react-grab/cli test
```

### Linting & Formatting

```bash
nr lint        # Check for lint errors
nr lint:fix    # Fix lint errors
nr format      # Format code with Prettier
```

## Code Style

- **Use TypeScript interfaces** over types
- **Use arrow functions** over function declarations
- **Use kebab-case** for file names
- **Use descriptive variable names** — avoid shorthands or 1-2 character names
  - Example: `innerElement` instead of `el`
  - Example: `didPositionChange` instead of `moved`
- **Avoid type casting** (`as`) unless absolutely necessary
- **Keep interfaces/types** at the global scope
- **Remove unused code** and follow DRY principles
- **Avoid comments** unless absolutely necessary
  - If a hack is required, prefix with `// HACK: reason for hack`

## Submitting Changes

### Creating a Pull Request

1. Create a new branch:

```bash
git checkout -b feat/your-feature-name
```

2. Make your changes and commit with a descriptive message:

```bash
git commit -m "feat: add new feature"
```

3. Push to your fork and open a pull request

### Commit Convention

We use conventional commits:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `chore:` — Maintenance tasks
- `refactor:` — Code refactoring
- `test:` — Test additions or changes

### Adding a Changeset

For changes that affect published packages, add a changeset:

```bash
nr changeset
```

Follow the prompts to describe your changes. This helps maintain accurate changelogs.

## Reporting Issues

Found a bug? Have a feature request? [Open an issue](https://github.com/aidenybai/react-grab/issues) with:

- Clear description of the problem or request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, browser, Node version)

## Community

- Join our [Discord](https://discord.com/invite/G7zxfUzkm7) to discuss ideas and get help
- Check existing [issues](https://github.com/aidenybai/react-grab/issues) before opening new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
