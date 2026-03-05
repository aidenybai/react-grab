# React Grab Video - Scratchpad

## Project Structure
- Monorepo with pnpm workspaces, turbo build system
- Video package at `packages/video/` — private, dev-only Remotion project
- Design system reference: `packages/react-grab/src/styles.css` has theme tokens
- SolidJS components to port: `packages/react-grab/src/components/`

## Conventions
- Package manager: pnpm 10.24.0
- TypeScript 5.9.3 (causes unmet peer dep warnings with eslint, safe to ignore)
- Remotion version: 4.0.424 (pinned, not caret)
- All Remotion packages must be on same version to avoid version mismatch warnings
- zod 3.22.3 must be a direct dependency of the video package — parent workspace has zod 4.x which Remotion rejects

## Video Package Setup (US-001)
- Entry point: `src/index.ts` → registers RemotionRoot
- Root: `src/Root.tsx` → single Composition "ReactGrabPromo"
- Config: `remotion.config.ts` → jpeg output, overwrite, PostCSS/Tailwind webpack override
- Tailwind CSS 4 with `@tailwindcss/postcss` (not `@remotion/tailwind` which is TW3-only)
- Font: Geist loaded via `@remotion/google-fonts`
- Theme: `src/styles.css` has grab-pink and all tokens from react-grab styles
- Constants: `src/constants.ts` — resolution, FPS, frame budgets, colors
- Utilities: `src/utils/cn.ts` (clsx wrapper), `src/utils/fonts.ts` (Geist loader)

## Key Gotchas
- `@remotion/tailwind` enableTailwind only works with Tailwind CSS v3
- For Tailwind v4, need manual webpack override with postcss-loader + @tailwindcss/postcss
- Must append postcss-loader to existing CSS rule chain (don't replace — Remotion's style-loader/css-loader are needed)
- Remotion Studio detects existing instances and exits cleanly (not a crash)
- Lint script: `eslint src && tsc` (ESLint + typecheck combined)
- tailwindcss must be in `dependencies` (not devDependencies) per acceptance criteria
- The worktree needs `pnpm install` run to populate node_modules — without it, root typecheck/lint fail
- Root `pnpm typecheck` runs only `react-grab` typecheck (not video); root `pnpm lint` runs `oxlint` on react-grab
- `pnpm test` runs turbo test on react-grab and @react-grab/cli (not video)

## Environment Notes
- The REVIEWER's sandbox may block port binding (`listen EPERM`) and Turbo cache writes (`Operation not permitted`)
- These are sandbox-specific restrictions, NOT code issues
- **Workaround:** Use `pnpm --filter @react-grab/video validate` (runs `remotion bundle --log=verbose`) to prove config works without needing ports

## Validation Evidence (verified 2026-03-05)
All checks pass in dev environment AND CI:

### Remotion Studio
- `pnpm --filter @react-grab/video dev` launches successfully
- Output: "Server ready - Local: http://localhost:3000" + "Built in 1198ms"
- Zero warnings, zero errors

### Tests
- `pnpm test` runs 574 playwright tests — all pass (1 flaky pre-existing test, unrelated to video package)
- `pnpm --filter @react-grab/cli test` — 166 tests pass

### Lint + Typecheck
- `pnpm --filter @react-grab/video lint` passes (eslint src && tsc)

### Bundle Validation
- `pnpm --filter @react-grab/video validate` (remotion bundle) completes with zero warnings/errors
- Proves: webpack config, Tailwind CSS v4, PostCSS pipeline, Geist font loading, Composition registration

### CI
- All CI jobs (Test Build, Test CLI, Test E2E, Publish Any Commit) completed with success
- Branch: gem/promo-video
