# Reactivity micro-benchmarks

Driven by `scripts/perf-bench.mjs`. Three scenarios, all measured in-page (no Playwright tracing) so timings reflect the real reactivity hot path:

- `hoverSweep` — 300 synthetic `pointermove` events across a 50×10 grid; median per-event-to-rAF latency in ms.
- `scrollDuringFreeze` — 60 `scroll` events while react-grab is active and a target cell is hovered.
- `viewportInvalidationBurst` — 60 bursts of 5 paired `scroll` + `resize` events. Stresses the `viewportVersion` cache-buster path in particular.

## Usage

From the repo root, with `pnpm install` already run:

```bash
pnpm --filter react-grab perf:baseline
```

The script:

1. Builds `react-grab` if `dist/index.js` is missing.
2. Starts the `e2e-app` Vite dev server on port 5175 (or reuses one if it's already running).
3. Drives a Chromium page through three scenarios and writes a JSON snapshot under `packages/react-grab/perf/<label>-<timestamp>.json` plus a sticky `<label>-latest.json`.

Use `--label=stage-N` (e.g. `node scripts/perf-bench.mjs --label=stage-2-createSelector`) to tag a snapshot for a specific optimization stage.

The baseline and any stage snapshots committed in this directory document the perf delta of each optimization in `PLAN.md`.
