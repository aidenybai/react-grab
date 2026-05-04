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
apps/
├── e2e-app/             # E2E test target app (Vite)
├── storybook/           # Storybook gallery: UI states + ad-hoc targeting playground
├── web-extension/       # Browser extension
└── website/             # Documentation site (react-grab.com)

packages/
├── cli/                 # CLI implementation (@react-grab/cli)
├── grab/                # Bundled package (library + CLI, published as `grab`)
├── mcp/                 # MCP server (@react-grab/mcp)
└── react-grab/          # Core library
```

## Development Workflow

### Running the Storybook Playground

Run the Storybook locally to exercise react-grab against realistic DOM fixtures (composite dashboard, freeze-demo, live-updates, and targeting edge cases):

```bash
pnpm --filter @react-grab/storybook dev
```

Opens at `http://localhost:6006`. The **Playground/** section hosts ad-hoc scenarios (replaces the former `apps/gym`) with real `init()` running so you can hover/grab to verify behavior.

### Running Tests

```bash
# Run CLI tests
pnpm --filter @react-grab/cli test
```

### Linting & Formatting

```bash
nr lint        # Check for lint errors
nr lint:fix    # Fix lint errors
nr format      # Format code with oxfmt
```

## Code Style

- **Use TypeScript interfaces** over types
- **Use arrow functions** over function declarations
- **Use kebab-case** for file names
- **Use descriptive variable names** - avoid shorthands or 1-2 character names
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

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test additions or changes

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
