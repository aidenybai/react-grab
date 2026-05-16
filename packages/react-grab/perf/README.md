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

## Stage results (single-snapshot per file; medians in ms)

Captured headless Chromium 1280×720, dev build, 50×10 grid (500 cells). Single-snapshot numbers — see commit messages for variance bands across 4-run checks where they were taken.

| stage | scenario `viewportInvalidationBurst` (median) | scenario `multiFreezeInvalidationBurst` (median) | `hoverSweep` (total over 1500 events) |
|---|---|---|---|
| `stage-0-baseline` | 70.4 | 77.3 | 38.9 |
| `stage-3-mapArray` | 70.0 | 78.1 | 42.6 |
| `stage-4-hoist-signals` | 74.25 | 78.7 | 35.4 |
| `stage-5-no-produce` | 71.0 | 76.8 | 35.8 |
| `stage-6-current-signal` | 76.15 | 81.95 | 47.2 |

The synthetic grid bench is dominated by the `incrementViewportVersion` →
downstream-memo invalidation chain. It does not exercise per-component-name
fiber walks, the pointermove hot path, or proxy-mutation throughput in any
realistic mix. All visible deltas across stages are within ±5 ms (~7%) and
within run-to-run noise — see commit messages for the multi-run variance
bands. Treat this dashboard as a regression detector, not as proof of an
absolute speedup. The stages remain valuable because they reduce per-call
overhead and allocations on real workloads where these synthetic scenarios
do not stress the relevant code paths.
