# React Grab - Agentic LLM Guide

This file provides context and instructions for AI agents working on the React Grab codebase.

## Project Overview
React Grab is a developer tool that allows users to "grab" elements in a React app to capture their HTML and component stack for use with AI coding assistants.

## Monorepo Structure
The project is a **pnpm workspace** monorepo.

- **`packages/react-grab`**: The core library.
  - `src/instrumentation.ts`: Core logic for capturing component stacks.
  - `src/overlay.ts`: UI overlay for element selection.
  - `src/hotkeys.ts`: Keyboard event handling.
  - `src/plugins/vite.ts`: Vite plugin implementation.
- **`packages/kitchen-sink`**: Demo/testing application (Vite + React 19).
- **`packages/website`**: Documentation site (Next.js 16).

## Development Commands
Run these from the root directory:

- **Build**: `pnpm build` (Builds all packages)
- **Dev (Watch)**: `pnpm dev` (Rebuilds on change)
- **Lint**: `pnpm lint` / `pnpm lint:fix`
- **Format**: `pnpm format`
- **Test**: No automated unit tests. Use `packages/kitchen-sink` for manual verification.
  - `cd packages/kitchen-sink && pnpm dev`
  - Hold `Cmd+C` and click elements to test.

## Code Style Guidelines
- **Language**: TypeScript (use interfaces, not types).
- **Functions**: Arrow functions preferred.
- **Naming**: Kebab-case for filenames. Descriptive variable names.
- **Components**: Props interface first, then named export.
- **Icons**: Move inline SVGs to `icon-NAME.tsx`.

## Key Architecture Notes
- **Instrumentation**: Uses `bippy` (React DevTools internals) to extract component stacks.
- **Overlay**: Renders a visual overlay over the DOM using `requestAnimationFrame`.
- **State**: Custom store in `src/utils/store.ts`.

### React Internals Access (IMPORTANT)

React Grab relies on **React's internal fiber tree** to map DOM elements back to their React components. This is accessed via the `bippy` library.

**What is React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?**
- React's **intentionally scary-named** internal API exposing the fiber tree
- The name is a warning: "This is unstable and subject to change without notice"
- Not a public API = no semver guarantees

**How React Grab Uses It:**
```typescript
// packages/react-grab/src/instrumentation.ts
import { _fiberRoots, getFiberFromHostInstance, instrument } from "bippy";
```

**Why bippy?**
- Abstracts direct access to React internals
- Handles fiber tree traversal safely
- Provides utilities for:
  - Finding which component "owns" a DOM element
  - Building component hierarchy (Parent → Child → GrandChild)
  - Source mapping (file + line number)

**The Flow:**
```
User clicks element
    ↓
getFiberFromHostInstance(element)
    ↓
bippy → React internals
    ↓
Fiber node retrieved
    ↓
Walk fiber tree for component stack
    ↓
"Button → Form → LoginPage"
```

**⚠️ IMPORTANT LIMITATION:**
This approach is **fragile**. React can change its internal structure at any time since it's not a public API. Updates to React may break `bippy` until it's updated. Always test with new React versions.

## Release Process
- Uses **Changesets**.
- Run `pnpm changeset` to generate a version bump for public API changes.

