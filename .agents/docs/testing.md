# Testing & Verification

Read this when running tests, debugging E2E failures, or setting up the dev environment.

## Pre-flight

- `pnpm build` must complete before `pnpm test` or `pnpm lint`. After modifying source files, always rebuild before running tests.
- The root `package.json` has `pnpm.onlyBuiltDependencies` configured for `@parcel/watcher`, `esbuild`, `sharp`, `spawn-sync`, and `unrs-resolver`. Without this allowlist, `pnpm install` silently skips their native builds and downstream packages may fail.

## Commands

- **Install**: `ni` (or `pnpm install`)
- **Build**: `nr build` (or `pnpm build`)
- **Dev watch**: `nr dev` (or `pnpm dev`). Watches core packages.
- **Test**: `pnpm test`. Runs Playwright E2E + Vitest CLI tests.
- **Lint**: `pnpm lint`. oxlint on react-grab package.
- **Typecheck**: `pnpm typecheck`. tsc on react-grab package.
- **Format**: `pnpm format`. oxfmt.
- **CLI dev**: `npm_command=exec node packages/cli/dist/cli.js`
- **Test app**: `pnpm --filter @react-grab/e2e-app dev` (port 5175, lives in `apps/e2e-app`)

## Playwright

E2E tests (`pnpm test` at root) run Playwright against the `e2e-app` Vite dev server on port 5175 (auto-started by the Playwright config). Chromium must be installed once:

```bash
npx --prefix packages/react-grab playwright install chromium --with-deps
```

## Before committing

```bash
pnpm test       # e2e
pnpm lint
pnpm typecheck
pnpm format
```
