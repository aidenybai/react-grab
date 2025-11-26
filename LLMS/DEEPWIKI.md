[DeepWiki](https://deepwiki.com/) | [Index your code with Devin](https://deepwiki.com/private-repo)

# [aidenybai/react-grab](https://github.com/aidenybai/react-grab "Open repository")

Edit Wiki | Share

Last indexed: 25 October 2025 ([a7ed7d](https://github.com/aidenybai/react-grab/commits/a7ed7dc5))

-   [Overview](https://deepwiki.com/aidenybai/react-grab/1-overview)
-   [Getting Started](https://deepwiki.com/aidenybai/react-grab/2-getting-started)
-   [Integration Guide](https://deepwiki.com/aidenybai/react-grab/3-integration-guide)
    -   [Next.js App Router](https://deepwiki.com/aidenybai/react-grab/3.1-next.js-app-router)
    -   [Next.js Pages Router](https://deepwiki.com/aidenybai/react-grab/3.2-next.js-pages-router)
    -   [Vite Plugin](https://deepwiki.com/aidenybai/react-grab/3.3-vite-plugin)
    -   [Direct HTML Integration](https://deepwiki.com/aidenybai/react-grab/3.4-direct-html-integration)
-   [Core Library Architecture](https://deepwiki.com/aidenybai/react-grab/4-core-library-architecture)
    -   [Initialization and Configuration](https://deepwiki.com/aidenybai/react-grab/4.1-initialization-and-configuration)
    -   [Element Selection System](https://deepwiki.com/aidenybai/react-grab/4.2-element-selection-system)
    -   [React Fiber Instrumentation](https://deepwiki.com/aidenybai/react-grab/4.3-react-fiber-instrumentation)
    -   [Visual Overlay System](https://deepwiki.com/aidenybai/react-grab/4.4-visual-overlay-system)
    -   [Hotkey Management](https://deepwiki.com/aidenybai/react-grab/4.5-hotkey-management)
    -   [Adapters and External Tool Integration](https://deepwiki.com/aidenybai/react-grab/4.6-adapters-and-external-tool-integration)
-   [Build System and Distribution](https://deepwiki.com/aidenybai/react-grab/5-build-system-and-distribution)
    -   [Build Configuration](https://deepwiki.com/aidenybai/react-grab/5.1-build-configuration)
    -   [Package Exports and Module Formats](https://deepwiki.com/aidenybai/react-grab/5.2-package-exports-and-module-formats)
    -   [CDN and npm Distribution](https://deepwiki.com/aidenybai/react-grab/5.3-cdn-and-npm-distribution)
-   [Documentation Website](https://deepwiki.com/aidenybai/react-grab/6-documentation-website)
    -   [Website Architecture](https://deepwiki.com/aidenybai/react-grab/6.1-website-architecture)
    -   [Interactive Demo and Installation UI](https://deepwiki.com/aidenybai/react-grab/6.2-interactive-demo-and-installation-ui)
    -   [Code Highlighting System](https://deepwiki.com/aidenybai/react-grab/6.3-code-highlighting-system)
    -   [Styling and Design System](https://deepwiki.com/aidenybai/react-grab/6.4-styling-and-design-system)
-   [Development Guide](https://deepwiki.com/aidenybai/react-grab/7-development-guide)
    -   [Monorepo Structure](https://deepwiki.com/aidenybai/react-grab/7.1-monorepo-structure)
    -   [Development Workflow](https://deepwiki.com/aidenybai/react-grab/7.2-development-workflow)
    -   [Contributing Guidelines](https://deepwiki.com/aidenybai/react-grab/7.3-contributing-guidelines)
    -   [Release Process](https://deepwiki.com/aidenybai/react-grab/7.4-release-process)

---

# Overview

## Relevant source files

-   [README.md](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md)
-   [package.json](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/package.json)
-   [packages/website/public/demo.gif](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/website/public/demo.gif)

This document introduces React Grab, explaining what the library is, the problem it solves for AI-assisted development, and how its architecture delivers element inspection capabilities to coding agents. For installation instructions, see [Getting Started](https://deepwiki.com/aidenybai/react-grab/2-getting-started). For detailed architecture of individual subsystems, see [Core Library Architecture](https://deepwiki.com/aidenybai/react-grab/4-core-library-architecture).

## What is React Grab?

React Grab is a development tool that enables AI coding assistants (Cursor, Claude Code, OpenCode) to access rendered DOM elements and their React component context. The library provides a point-and-click interface that extracts both HTML structure and React component ownership data, copying this information to the clipboard and optionally forwarding it to configured external tools.

The library is distributed as a lightweight JavaScript package (referenced in [README.md3-5](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L3-L5)) with multiple integration patterns: direct CDN script tags, Next.js-specific implementations, and a Vite plugin. It operates exclusively in development environments and is designed to be added with minimal configuration.

**Sources:** [README.md9-16](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L9-L16) [README.md1-6](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L1-L6)

## The Problem: AI Agents Cannot Access Your DOM

```
Code Space         Visual Space
    |                  |
    v                  v
Developer Workspace
    | sees problem in
    v
Developer
    | describes to
    v
AI Coding Agent
(Cursor/Claude)
    ^
    | no direct access
    |
Browser
(Rendered Application)
    ^
    | renders
    |
Source Code
(Components, HTML)
    ^
    | modifies
    |
Rendered Element
User wants to modify
```

**Diagram: The Context Gap in AI-Assisted Development**

AI coding assistants lack direct access to the browser's rendered DOM. When a developer identifies an element requiring modification, they must manually describe its structure, styling, and React component hierarchy to the AI. This description process is error-prone and time-consuming, creating friction in the development workflow.

React Grab bridges this gap by providing a direct channel from rendered elements to AI agents. Instead of describing "the blue button in the header with rounded corners," developers can click the element and automatically provide complete context including HTML structure, styles, and React component stack.

**Sources:** [README.md9-14](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L9-L14)

## User Interaction Model

```
"AI Agent" <--- "Clipboard" <--- "Browser DOM" <--- "react-grab library" <--- "User"
    ^                                  ^
    |                                  |
    +----------------------------------+
    | "Hold ⌘C for 500ms"
    | "Show selection overlay"
    | "Hover over element"
    | "Highlight element"
    | "Click element"
    | "Query React fiber tree"
    | "Component stack + HTML"
    | "Copy element data"
    | "Send via adapter (optional)"
    | "Show 'Grabbed!' confirmation"
```

**Diagram: Basic User Interaction Flow**

The user activates React Grab by holding the Command+C key combination for 500 milliseconds (configurable via `data-hold-duration` attribute). This deliberate hold duration prevents accidental activation during normal copy operations. Once activated, the library displays visual overlays and highlights elements on hover. Clicking an element triggers data extraction and clipboard copy operations.

The `data-enabled="true"` attribute on the script tag controls whether the library is active. In framework integrations, this is typically gated by `process.env.NODE_ENV === "development"` to ensure the tool never ships to production.

**Sources:** [README.md13](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L13-L13) [README.md49-56](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/README.md#L49-L56)

## Core Architecture Components

| Component          | File Location                       | Purpose                                                      |
| :----------------- | :---------------------------------- | :----------------------------------------------------------- |
| **Initialization** | `packages/react-grab/src/index.ts`  | Entry point, configuration parsing, lifecycle management     |
| **Instrumentation**| `packages/react-grab/src/instrumentation.ts` | React fiber tree inspection via `bippy` library              |
| **Overlay System** | `packages/react-grab/src/overlay.ts`| Visual feedback (selection highlights, progress indicators)  |
| **Hotkey System**  | `packages/react-grab/src/hotkeys.ts`| Keyboard event detection and hold duration tracking          |
| **Adapter System** | `packages/react-grab/src/adapters.ts`| External tool integration (Cursor, Claude, OpenCode)         |
| **Vite Plugin**    | `packages/react-grab/src/plugins/vite.ts` | Build-time injection for Vite projects                       |

**Sources:** [packages/react-grab/src/index.ts1-10](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/react-grab/src/index.ts#L1-L10) (inferred from architecture diagrams)

```
Build Output (dist/)
    ^
    | tsup build
    |
index.global.js  (IIFE format)
index.cjs        (CommonJS format)
index.mjs        (ES Module format)
index.d.ts       (TypeScript declarations)
    ^
    | tsup build
    |
packages/react-grab/src/
    |
    +-- index.ts          ('init()' function)
    |   |
    |   +-- instrumentation.ts  ('getComponentStack()') <--- bippy package (React fiber access)
    |   |                                                    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    |   +-- overlay.ts          ('createOverlay()')
    |   +-- hotkeys.ts          ('setupHotkeys()')
    |   +-- adapters.ts         ('sendToAdapter()')
    |
External Dependencies
```

**Diagram: Source File Structure and Build Pipeline**

The library is architected as five cooperating modules coordinated by `index.ts`. The `init()` function in [packages/react-grab/src/index.ts](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/react-grab/src/index.ts) parses configuration from script tag attributes and initializes all subsystems. The instrumentation module uses the `bippy` library to access React's internal fiber tree at `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, extracting component ownership chains for clicked elements.

The build system (configured in [packages/react-grab/tsup.config.ts](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/react-grab/tsup.config.ts)) produces four output formats: IIFE for direct browser usage via CDN, CommonJS for Node.js compatibility, ES Modules for modern bundlers, and TypeScript declarations for type checking.

**Sources:** [packages/react-grab/tsup.config.ts1-30](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/react-grab/tsup.config.ts#L1-L30) (inferred), [packages/react-grab/package.json1-50](https://github.com/aidenybai/react-grab/blob/a7ed7dc5/packages/react-grab/package.json#L1-L50) (inferred)

## Distribution and Integration Channels