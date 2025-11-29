# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React Grab is a developer tool that allows you to grab any element in your React app and provide it to AI coding assistants (Cursor, Claude Code, etc.) by holding ⌘C (or Ctrl+C) and clicking elements. The library captures HTML snippets and React component ownership stacks to provide rich context.

## Monorepo Structure

This is a pnpm workspace monorepo with three packages:

- **`packages/react-grab`**: Main library package (TypeScript)
  - Core instrumentation logic in `src/instrumentation.ts` - captures component stacks and HTML snippets
  - Overlay UI in `src/overlay.ts` - visual feedback when hovering/selecting elements
  - Hotkey tracking in `src/hotkeys.ts` - keyboard event handling
  - Adapters in `src/adapters.ts` - integration with external tools (e.g., Cursor)
  - Vite plugin in `src/plugins/vite.ts` - automatic script injection for Vite projects

- **`packages/kitchen-sink`**: Demo/testing application using Vite + React 19
  - Used to manually test react-grab functionality during development

- **`packages/website`**: Documentation website built with Next.js 16 App Router
  - Marketing site and installation instructions
  - Uses Tailwind CSS v4 and Framer Motion

## Development Commands

**Build the main library:**
```bash
pnpm build
```

**Watch mode (rebuilds on file changes):**
```bash
pnpm dev
```

**Linting:**
```bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix issues
```

**Formatting:**
```bash
pnpm format        # Format all files with Prettier
pnpm check         # Run both linting and format check
```

**Testing changes:**
```bash
cd packages/kitchen-sink
pnpm dev           # Start Vite dev server
# Then hold ⌘C and click elements to test functionality
```

**Run single package commands:**
```bash
pnpm --filter react-grab build
pnpm --filter kitchen-sink dev
pnpm --filter website dev
```

## Build System

The main library uses `tsup` for bundling (config: `packages/react-grab/tsup.config.ts`):

1. **IIFE build** (`dist/index.global.js`): Browser-ready script tag version with global `ReactGrab` namespace
2. **ESM/CJS builds** (`dist/index.js`, `dist/index.cjs`): For npm package consumers
3. **Vite plugin build** (`dist/plugins/vite.js`, `dist/plugins/vite.cjs`): Separate entry point for Vite integration

The library automatically initializes when loaded via script tag by reading `data-*` attributes from the script element.

## Code Architecture

**Key Flow:**
1. User holds activation hotkey (default: ⌘C)
2. Progress indicator shows key hold duration (default: 500ms)
3. When threshold reached, overlay mode activates
4. Mouse movement tracked to identify element under cursor (excluding react-grab's own overlay elements)
5. Selection overlay highlights hovered element with visual feedback
6. On click, captures:
   - HTML snippet of element (via `getHTMLSnippet`)
   - React component ownership stack (via `getStack` using React DevTools internals)
   - Filters and serializes stack for clarity
7. Copies formatted text to clipboard wrapped in `<referenced_element>` tags
8. If adapter configured, opens in external tool (e.g., Cursor composer)

**State Management:**
- Custom store implementation in `src/utils/store.ts` with subscription support
- Global `libStore` tracks: pressed keys, mouse position, overlay mode (hidden/visible/copying)

**Performance Optimizations:**
- RequestAnimationFrame-based rendering to batch DOM updates
- Throttled mouse move handling to avoid excessive updates
- Element visibility checks before selection (filters invisible elements)
- Continuous render loop only updates when state changes

## Code Style Guidelines

**From `.cursor/rules/codebase-guidelines.mdc`:**

- Use **TypeScript interfaces** over types
- Use **arrow functions** over function declarations
- Use **kebab-case** for filenames
- Use **descriptive variable names** (avoid abbreviations like `x`, prefer `innerElement`)
- Remove unused code and avoid repetition
- Only add comments when absolutely necessary
  - Prefix hacks with `// HACK: reason for hack`
- Keep interfaces/types at global scope
- React component layout: Props interface first, then named arrow function export
- Avoid type casting ("as") unless absolutely necessary
- Move inline SVGs to `icon-NAME.tsx` files with component name `IconNAME`

**Example:**
```typescript
interface UserPreferences {
  enableOverlay: boolean;
  hotkey: string;
}

const getUserPreferences = (): UserPreferences => {
  // Implementation
};
```

## Release Process

Uses [Changesets](https://github.com/changesets/changesets) for version management:

1. Create a changeset when making changes affecting the public API:
```bash
pnpm changeset
```

2. Follow prompts to describe changes (patch/minor/major)
3. Commit the generated changeset file
4. Maintainers will handle versioning and publishing:
```bash
pnpm version  # Bumps versions based on changesets
pnpm release  # Builds and publishes to npm
```

## Requirements

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher (enforced via engines in package.json)

## Testing Strategy

No automated unit tests currently. Testing is done manually via the kitchen-sink demo:

1. Start kitchen-sink dev server
2. Hold ⌘C (or Ctrl+C on Windows/Linux) for 500ms
3. Click various elements to verify:
   - Overlay positioning and styling
   - HTML snippet capture
   - Component stack extraction
   - Clipboard copying
   - External adapter integration (if configured)
4. Test across multiple browsers: Chrome, Firefox, Safari
5. Test edge cases: deeply nested components, elements with transforms, scrolled containers

## Common Gotchas

- The library uses React DevTools internals (via `bippy` package) to extract component stacks - this is fragile and may break with React updates
- Overlay positioning respects element transforms and border radius by reading computed styles
- Script tag must be in `<head>` with `strategy="beforeInteractive"` for Next.js to ensure it loads before React hydration
- Vite plugin only applies in development mode (`apply: "serve"`)
- Elements with `data-react-grab-ignore` attribute (using `ATTRIBUTE_NAME` constant) are excluded from selection
