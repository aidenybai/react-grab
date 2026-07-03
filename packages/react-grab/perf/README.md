# Perf bench

The 25 `@perf` scenarios in `e2e/perf-bench.spec.ts` run under the same Playwright project as the rest of the e2e suite and capture browser-native signals per scenario via `e2e/perf-recorder.ts`:

- **INP** — 98th-percentile worst `interactionId` duration (web-vitals convention).
- **Long Tasks** — count / sum / max from `PerformanceObserver({ entryType: "longtask" })`.
- **Long Animation Frames** — count / sum / max duration / max blocking from `entryType: "long-animation-frame"`.
- **Frame deltas** — p50 / p95 / max via `requestAnimationFrame` deltas.
- **FPS** — mean / 5% low / dropped-frame count and % derived from the frame deltas (a delta > 25ms counts as at least one skipped 60Hz frame).
- **Memory** — JS heap used/total, DOM nodes, JS event listeners, and documents via CDP `Performance.getMetrics`, read before and after the metric samples with a forced GC (`HeapProfiler.collectGarbage`) so the delta approximates _retained_ growth (leaks) rather than transient garbage.

Per-sample median across N samples (default 3, configurable per scenario; js-framework-benchmark methodology). Mean + stddev are also recorded so variance is visible.

## Commands

Run from `packages/react-grab/` (the `test:perf*` scripts live in that package's `package.json`; the repo root has no equivalents):

```bash
pnpm test                                     # everything, perf scenarios included (root or package)
pnpm test:perf                                # only @perf scenarios via --grep
pnpm test:perf:baseline                       # writes perf/baseline/<scenario>.json
PERF_LABEL=feature pnpm test:perf             # writes perf/feature/<scenario>.json
pnpm test:perf:trace                          # also dumps perf/<label>/<scenario>.cpuprofile
pnpm perf:deopt                               # V8 deopt/bailout trace → perf/<label>/deopt.summary.json (own Chrome launch with --js-flags)
pnpm test:perf:full                           # trace suite + deopt trace + combined analysis in one go
pnpm perf:analyze perf/<label>                # combined report: scenario metrics (INP/LoAF/FPS/memory), cpuprofile hotspots, deopt sites
# Or load a .cpuprofile in Chrome DevTools "Performance" panel for the full flame chart.
# Pair with `pnpm build:profiling` (or `pnpm --filter react-grab build:profiling` from root) so symbols are unminified.
#
# The .cpuprofile comes from a dedicated extra pass per scenario (V8 sampling
# profiler via the CDP Profiler domain), so sampler overhead never pollutes the
# metric samples. The sampler can sporadically wedge the headless renderer for
# seconds to minutes (see e2e/perf-recorder.ts); the capture is deadline-bounded
# and best-effort — a wedged capture only skips that scenario's profile.
```

## Baselines are machine-local

`perf/<label>/*.json` and `*.cpuprofile` are gitignored (see `perf/.gitignore`), so per-run bench outputs and CDP traces stay local. **Per-scenario baselines aren't committed.** That's intentional — headless Chromium timings on a 4-core Linux runner look nothing like an M-series Mac. Committing one machine's numbers as the canonical baseline would be misleading the moment anyone else opened the file.

(The `stage-*.json` files at the top of `perf/` are an exception: they're snapshots of an older deopt-trace bench kept as historical context for prior optimization passes, not active baselines for this suite.)

The intended workflow is:

- **Local optimization work** — record a baseline before your change with `pnpm test:perf:baseline`, then re-run `pnpm test:perf` after each iteration. `recordScenario` auto-loads `perf/baseline/<scenario>.json` and embeds it under the `baseline` key in every report, so diffs are doable straight from the per-scenario JSON.
- **CI regression tracking** — `.github/workflows/test-perf.yml` runs the bench on a dedicated `ubuntu-latest` runner with `--workers=1` (no shard contention). On PRs it runs the bench **twice on the same runner**: once with `packages/react-grab/src/` swapped to the PR's base ref (`PERF_LABEL=baseline`), then once with HEAD's src (`PERF_LABEL=current`). The bench harness, e2e-app, and Playwright config all stay at HEAD across both runs so the only variable is react-grab's source. A markdown diff table (via `scripts/diff-perf-runs.mjs`) is written to the job summary, and the full `perf/` directory (both runs + diff input) is uploaded as an artifact (14-day retention). On pushes to `main`, only the HEAD run executes — single trend snapshot, no diff.

The only thresholds asserted in-test are absolute Web Vitals caps (currently `INP < 100ms` soft-asserted on a couple of interaction-heavy scenarios). These hold across reasonable hardware; they're not derived from a committed baseline.

## Report shape

Each `perf/<label>/<scenario>.json` looks like:

```json
{
  "scenario": "hover-in-selection-mode",
  "label": "current",
  "samples": 3,
  "aggregate": { "inp": 0, "longTasks": {...}, "frames": {...}, "fps": {...}, ... },
  "memory": { "before": {...}, "after": {...}, "delta": {...} },
  "perSample": [ ... ],
  "baseline": { ... },
  "recordedAt": "..."
}
```

- `aggregate` — median across `samples` runs.
- `perSample` — raw per-run aggregates so you can eyeball variance / spot outlier samples.
- `baseline` — the previous local baseline (from `perf/baseline/<scenario>.json` if present, else `null`).
- `memory` — GC-forced CDP memory counters before/after the samples plus their delta; a persistent positive `delta` across runs points at a leak (retained nodes/listeners).

## Deopt trace

`pnpm perf:deopt` (`scripts/deopt-trace.mjs`) launches its own Chrome with `--js-flags="--trace-deopt ..."` (V8 flags must be set at process launch, so this can't run inside the Playwright-managed browser), drives synthetic + full-app scenarios, and parses the deopt/bailout lines from Chrome's stderr into `perf/<label>/deopt.summary.json`. `perf:analyze` folds the top sites into its report. Pair with `pnpm build:profiling` so function names in deopt lines are unminified.

## Scenarios

Activation & lifecycle:
`rapid-toggle-active-inactive` · `idle-after-activation` · `activate-with-many-animations` · `deactivate-with-many-frozen-elements`

Hover paths under different DOM densities:
`hover-in-selection-mode` · `hover-over-animated-elements` · `hover-dense-flat-dom` (3000 tiles) · `hover-deep-nested-dom` (60-level ancestors) · `deep-element-stack-hover` (2000 stacked at one point) · `pointermove-storm-synthetic` (10k synthetic events)

Drag:
`drag-selection-sweep` · `large-drag-selection` · `drag-with-autoscroll` · `drag-rapid-zigzag`

Copy / multi-select:
`copy-then-deactivate-stress` · `copy-multi-element-batch`

Keyboard / menu:
`keyboard-rapid-arrows` · `context-menu-open-close-cycle` · `context-menu-arrow-navigation`

Other:
`prompt-mode-typing` · `toolbar-drag-to-edges` · `toolbar-collapse-expand-cycle` · `dom-rerender-during-selection` · `scroll-during-selection` · `viewport-resize-during-selection`
