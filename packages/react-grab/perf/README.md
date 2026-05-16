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

## V8 deopt + IC capture (dexnode-equivalent)

For shape/IC investigations there is also a `dexnode`-style profiling pass:

```bash
pnpm --filter react-grab perf:deopt          # capture v8.log via headless Chromium with --js-flags
pnpm --filter react-grab perf:deopt:analyze  # parse v8.log into summary.json / summary.md
```

`perf:deopt` launches Chromium with the same V8 flags `dexnode` would inject
for a `chrome_stable` host (`--log-deopt --log-ic --log-maps --log-code
--log-source-code --prof --no-logfile-per-isolate …`), drives the same perf
grid through the bench scenarios, and writes the raw `v8.log` to
`perf/v8-log/`. `perf:deopt:analyze` resolves IC `pc` addresses back to
their containing function via the `code-creation` records and groups the
deopt + megamorphic/polymorphic IC sites by location.

Curated findings live in `perf/v8-deopt-findings.md`. The raw `v8.log` is
gitignored; `summary.json` / `summary.md` / `manifest.json` are not. The
raw log can also be opened directly with the Microsoft "Deopt Explorer" VS
Code extension.

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
