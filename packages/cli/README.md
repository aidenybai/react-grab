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

`@react-grab/cli/api` exposes the same primitives that power the CLI, so you can build your own installer or wrap React Grab setup inside another tool. Importing it runs no code, unlike the CLI entry (`.`), which parses `argv` on import.

### `installReactGrab(options?)`

A high-level, non-interactive orchestrator. It detects the project, installs `react-grab` with the detected package manager, and applies the framework-specific development-only setup. It returns a structured result instead of printing or exiting.

```ts
import { installReactGrab } from "@react-grab/cli/api";

const result = await installReactGrab({ cwd: process.cwd() });

console.log(result.framework); // "next" | "vite" | "tanstack" | "webpack"
console.log(result.didInstallPackage); // whether react-grab was added to deps
console.log(result.didChangeFile); // whether an entry file was modified
console.log(result.transform.filePath); // the file that was (or would be) edited
```

| Option                  | Type                                                     | Description                                                                                                             |
| ----------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cwd`                   | `string`                                                 | Project directory (default: `process.cwd()`)                                                                            |
| `framework`             | `Framework`                                              | Override framework detection                                                                                            |
| `nextRouterType`        | `NextRouterType`                                         | Override Next.js router detection (`app` / `pages`)                                                                     |
| `packageManager`        | `PackageManager`                                         | Override package-manager detection                                                                                      |
| `skipPackageInstall`    | `boolean`                                                | Skip installing the `react-grab` npm package                                                                            |
| `skipTransform`         | `boolean`                                                | Skip editing the framework entry file                                                                                   |
| `dryRun`                | `boolean`                                                | Compute the changes without installing or writing                                                                       |
| `installPackageOptions` | `Omit<InstallPackageOptions, "cwd" \| "packageManager">` | Passed through to `installPackages` (e.g. `silent`, `isDev`); `cwd`/`packageManager` are controlled by the orchestrator |

Failures throw a `ReactGrabInstallError` whose `code` identifies the cause, with the original error preserved on `error.cause`:

- `unsupported-framework`: framework has no automatic setup (Remix, Astro, SvelteKit, Gatsby)
- `unknown-framework`: no supported framework detected
- `transform-failed`: entry file could not be located or edited
- `install-failed`: package manager failed to install `react-grab`
- `write-failed`: edited file could not be written

`installReactGrab` configures a single project at `cwd` and does not walk a monorepo. Point `cwd` at the app you want to set up, or call `findReactProjects` first to locate the apps in a workspace.

By default the call mutates your project: it runs the package manager and edits a framework entry file. Pass `dryRun: true` to compute the change set (returned on `result.transform`) without installing or writing.

### Low-level building blocks

If you want full control, compose the same functions the orchestrator uses:

```ts
import {
  detectProject,
  previewTransform,
  applyTransform,
  installPackages,
  getPackagesToInstall,
  installSkill,
} from "@react-grab/cli/api";

const project = await detectProject(process.cwd());
const transform = previewTransform(
  project.projectRoot,
  project.framework,
  project.nextRouterType,
  project.isReactGrabConfigured,
);
```

Install the package only when it's missing, then write the previewed edit. `previewTransform` sets `noChanges` when React Grab is already wired up, so guard on it before calling `applyTransform`, which writes `transform.newContent` to `transform.filePath`:

```ts
if (!project.hasReactGrab) {
  await installPackages(getPackagesToInstall(), {
    cwd: project.projectRoot,
    packageManager: project.packageManager,
  });
}

if (transform.success && transform.newContent && !transform.noChanges) {
  applyTransform(transform);
}

await installSkill({ cwd: project.projectRoot });
```

The full export surface, each with its TypeScript types:

- Detection: `detectProject`, `detectFramework`, `detectPackageManager`, `detectNextRouterType`, `detectReactGrab`, `detectReactGrabConfigured`, `detectUnsupportedFramework`, `findReactProjects`
- Transforms: `previewTransform`, `previewOptionsTransform`, `previewCdnTransform`, `applyTransform`, `hasFrameworkEntryPoint`
- Installation: `installPackages`, `getPackagesToInstall`, `installSkill`, `removeSkill`

## Supported Frameworks

| Framework              | Detection                             |
| ---------------------- | ------------------------------------- |
| Next.js (App Router)   | `next.config.ts` + `app/` directory   |
| Next.js (Pages Router) | `next.config.ts` + `pages/` directory |
| Vite                   | `vite.config.ts`                      |
| TanStack Start         | `app.config.ts`                       |
| SvelteKit              | `svelte.config.*`                     |
| Webpack                | `webpack.config.*`                    |
