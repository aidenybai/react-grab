# @react-grab/cli

CLI for installing React Grab and configuring its activation behavior.

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
| `--key <key>`    | `-k`  | Shortcut (e.g. Meta+K, Space)            |
| `--skip-install` |       | Skip package installation                |
| `--pkg <pkg>`    |       | Custom package URL                       |
| `--cwd <cwd>`    | `-c`  | Working directory (default: current dir) |

### `grab configure`

Update React Grab options. Runs an interactive wizard when called without flags.

```bash
npx grab@latest configure
```

| Option                 | Alias | Description                                   |
| ---------------------- | ----- | --------------------------------------------- |
| `--yes`                | `-y`  | Skip confirmation prompts                     |
| `--key <key>`          | `-k`  | Shortcut (e.g. Meta+K, Ctrl+Shift+G)          |
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

# Set a custom shortcut
npx grab@latest init -k "Meta+K"

# Change activation mode to hold
npx grab@latest configure --mode hold --hold-duration 500

# Interactive configuration wizard
npx grab@latest configure
```

## Node API

The same primitives that power the CLI are exposed under `@react-grab/cli/api`, so you can build your own installer or wrap React Grab setup inside another tool. The API has no side effects on import (unlike the CLI entry, which parses `argv` immediately).

### `installReactGrab(options?)`

High-level, non-interactive orchestrator. Detects the project, installs the `react-grab` package with the detected package manager, and applies the framework-specific dev-only setup. Returns a structured result instead of printing or exiting.

```ts
import { installReactGrab } from "@react-grab/cli/api";

const result = await installReactGrab({ cwd: process.cwd() });

console.log(result.framework); // "next" | "vite" | "tanstack" | "webpack"
console.log(result.didInstallPackage); // whether react-grab was added to deps
console.log(result.didChangeFile); // whether an entry file was modified
console.log(result.transform.filePath); // the file that was (or would be) edited
```

| Option                  | Type                    | Description                                                  |
| ----------------------- | ----------------------- | ------------------------------------------------------------ |
| `cwd`                   | `string`                | Project directory (default: `process.cwd()`)                 |
| `framework`             | `Framework`             | Override framework detection                                 |
| `nextRouterType`        | `NextRouterType`        | Override Next.js router detection (`app` / `pages`)          |
| `packageManager`        | `PackageManager`        | Override package-manager detection                           |
| `force`                 | `boolean`               | Re-apply setup even if React Grab is already configured      |
| `skipPackageInstall`    | `boolean`               | Skip installing the `react-grab` npm package                 |
| `skipTransform`         | `boolean`               | Skip editing the framework entry file                        |
| `dryRun`                | `boolean`               | Compute the changes without installing or writing            |
| `installPackageOptions` | `InstallPackageOptions` | Passed through to `installPackages` (e.g. `silent`, `isDev`) |

Failures throw a `ReactGrabInstallError` with a `code` (`"unsupported-framework"`, `"unknown-framework"`, `"transform-failed"`, `"write-failed"`) so callers can branch on the cause.

### Low-level building blocks

If you want full control, compose the same functions the orchestrator uses:

```ts
import {
  detectProject,
  previewTransform,
  applyTransform,
  installPackages,
  installSkill,
} from "@react-grab/cli/api";

const project = await detectProject(cwd);
const transform = previewTransform(
  project.projectRoot,
  project.framework,
  project.nextRouterType,
  project.isReactGrabConfigured,
);

if (!project.hasReactGrab) {
  await installPackages(["react-grab"], {
    cwd: project.projectRoot,
    packageManager: project.packageManager,
  });
}

if (transform.success && transform.newContent) {
  applyTransform(transform); // writes transform.newContent to transform.filePath
}

// Optionally install the agent skill for all detected agents
await installSkill({ cwd: project.projectRoot });
```

Exposed helpers include `detectProject`, `detectFramework`, `detectPackageManager`, `detectNextRouterType`, `detectReactGrab`, `findReactProjects`, `previewTransform`, `previewOptionsTransform`, `previewCdnTransform`, `applyTransform`, `hasFrameworkEntryPoint`, `installPackages`, `getPackagesToInstall`, `installSkill`, and `removeSkill`, along with their TypeScript types.

## Supported Frameworks

The CLI currently configures:

- Next.js App Router
- Next.js Pages Router
- Vite
- TanStack Start
- Webpack
