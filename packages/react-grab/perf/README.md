# Perf bench

The `@perf` scenarios run under the same Playwright project as the rest of the e2e suite and capture browser-native signals per scenario via `e2e/perf-recorder.ts`:

- **INP** — 98th-percentile worst `interactionId` duration (web-vitals convention).
- **Long Tasks** — count / sum / max from `PerformanceObserver({ entryType: "longtask" })`.
- **Long Animation Frames** — count / sum / max duration / max blocking from `entryType: "long-animation-frame"`.
- **Frame deltas** — p50 / p95 / max via `requestAnimationFrame` deltas.
- **FPS** — mean / 5% low / missed-vsync count and % derived from frame deltas and the display interval observed for this browser run. This works on 60Hz, 120Hz, and variable test environments without a hard-coded 25ms threshold.
- **Memory** — JS heap used/total, DOM nodes, JS event listeners, and documents via CDP `Performance.getMetrics`, read before and after the metric samples with a forced GC (`HeapProfiler.collectGarbage`) so the delta approximates _retained_ growth (leaks) rather than transient garbage.
- **Chromium process CPU** — samples cumulative CPU time for every browser, renderer, GPU, Viz/utility, worker, and OOPIF process during the scenario. Reports core-equivalent percentage, host-normalized percentage, per-process-type totals, PID-level evidence, and Playwright-worker overhead.
- **CSS activity** — active animation counts, CSS animation/transition lifecycle events, class/style/attribute mutations, subtree churn, and the most frequently mutated targets.
- **Workload shape** — DOM size/depth, open shadow roots, frames, stylesheets/rules, animations and animated properties, canvases, images, and videos before and after the scenario.
- **Environment provenance** — browser/protocol/V8 versions, OS and CPU, logical cores, memory, viewport, DPR, focus/visibility, observed refresh rate, Chrome command line, GPU device/driver, feature status, and workarounds.
- **Hardware GPU** — capability-gated operating-system sampling. Linux uses DRM fdinfo engine counters. macOS uses a pre-authorized, non-interactive `powermetrics` process and records system GPU residency/power plus per-Chromium-process GPU time where the platform exposes it. Missing permission or driver support is reported as a state, never `0%`.
- **Continuous run validity** — visibility, focus, blur/focus transitions, hidden and unfocused duration, page lifecycle freezes, and open DevTools targets are monitored throughout every sample. A headed run fails immediately if any sample or trace replay is hidden, unfocused, frozen, or DevTools-attached.

An opt-in render replay (`PERF_RENDER_TRACE=1`) adds:

- CSS rule usage with stylesheet URL, offsets, and source text;
- CDP animation start/cancel records with backend-node and timing data;
- animation ticks/second, `AnimateLayers`, `NeedsTickAnimations`, `DrawFrame`, and draws per animation tick;
- animation lifecycle accounting: active-animation milliseconds, active-timeline duty cycle, zero-animation time, longest active/idle interval, finish/cancel timestamps, and whether an active timeline prevented idle;
- style, layout, paint, raster, compositor, Viz, and GPU-category trace summaries;
- submitted/drawn/presented/dropped frame-stage counts;
- compositor frame-production rate, no-damage skips, and production duty cycle;
- composited-layer count, churn, paint count, viewport-normalized surface/paint area, and top-layer promotion reasons;
- selector-engine timings by selector and stylesheet: elapsed time, match attempts, matches, fast rejects, invalidation count, and slow-path non-match percentage;
- invalidation event counts;
- DevTools advanced-paint picture/display-list trace snapshots plus isolated LayerTree Paint Profiler replays for the largest content layers, including canvas command logs and per-command replay timing;
- top trace events plus the compressed raw trace (`*.render-trace.json.gz`).

The render trace, V8 profiler, and deopt tracer are separate replay passes. Their instrumentation never supplies the clean benchmark's wall-time, frame, CPU, or memory regression numbers. Chromium disables selector stats and advanced paint instrumentation by default because both add tracing overhead. Their results are forensic evidence for comparing equivalent replays, not clean-pass timings. Layer paint profiles replay captured paint commands after the marked scenario window. Summed display-item visual areas can overlap and must not be read as unique painted pixels.

An opt-in DOM-mutation attribution replay (`PERF_DOM_BREAKPOINTS=1`) sets a subtree breakpoint on the document plus attribute/removal breakpoints on the clean run's most frequently mutated targets. Each pause records mutation type, target node, synchronous and async call frames, generated URL/line/column, source-map-resolved application location, and source-line snippet. It resumes immediately, stops after 40 hits, compacts repetitive framework frames, and writes `*.dom-mutation-attribution.json`. DOM breakpoints fundamentally perturb scheduling, so this artifact explains which code owns a mutation but never contributes timing or regression metrics.

The idle-after-activation canary always records an active replay and an animations-paused replay. It also runs three alternating active/paused CPU pairs and reports renderer, GPU-process, and combined graphics-pipeline deltas with a lower noise floor than the unpaired absolute counters. This catches visually-idle CSS animations that produce a frame every vsync. `requestAnimationFrame` FPS cannot detect this failure mode because callback cadence does not prove that Chromium skipped an unchanged display frame.

The `animation-scheduling-controls` canary verifies that the harness itself separates five known mechanisms: one legacy indicator, the production count of 24 legacy indicators, all animations paused, an infinite stepped animation, and finite 200ms animations with genuine 800ms static holds. Every active mode is paired with a paused production-count control in alternating order for three repetitions, then traced once for scheduler and lifecycle evidence. If Chromium changes its trace vocabulary or damage-tracking behavior, this canary makes the instrumentation failure visible instead of silently reporting a clean app.

Render-stage durations are sums of trace events that can overlap across nested events and threads. Compare the same stage between paired runs; do not add stages together or interpret them as a wall-time breakdown.

Per-sample median across N samples (default 3, configurable per scenario; js-framework-benchmark methodology). Mean + stddev are also recorded so variance is visible.

## Commands

Run from `packages/react-grab/` (the `test:perf*` scripts live in that package's `package.json`; the repo root has no equivalents):

```bash
nr test                                      # everything, perf scenarios included (root or package)
nr test:perf                                 # only @perf scenarios via --grep
nr test:perf:animation                       # compositor-animation controls only
nr test:perf:idle                            # real-app active/paused idle canary only
nr test:perf:dom-breakpoints                 # DOM mutation → source-stack forensic replay
nr test:perf:baseline                        # writes perf/baseline/<scenario>.json
PERF_LABEL=feature nr test:perf              # writes perf/feature/<scenario>.json
E2E_VITE_PLUS_DEVELOPMENT_PORT=5190 nr test:perf # avoid a local fixture-port collision
nr test:perf:trace                           # isolated V8 CPU-profile replay
nr test:perf:render                          # isolated CSS/compositor/Viz trace replay
nr perf:deopt                                # V8 deopt/bailout trace → perf/<label>/deopt.summary.json (own Chrome launch with --js-flags)
nr test:perf:full                            # clean metrics + both replay passes + deopts + analysis
nr perf:analyze -- perf/<label>              # combined report: scenario metrics (INP/LoAF/FPS/memory), cpuprofile hotspots, deopt sites
# Or load a .cpuprofile in Chrome DevTools "Performance" panel for the full flame chart.
# Pair with `pnpm build:profiling` (or `pnpm --filter react-grab build:profiling` from root) so symbols are unminified.
#
# The .cpuprofile comes from a dedicated extra pass per scenario (V8 sampling
# profiler via the CDP Profiler domain), so sampler overhead never pollutes the
# metric samples. The sampler can sporadically wedge the headless renderer for
# seconds to minutes (see e2e/perf-recorder.ts); the capture is deadline-bounded
# and best-effort — a wedged capture only skips that scenario's profile.
```

On macOS, hardware GPU counters require a privileged system sampler. Pre-authorize it explicitly, then opt in:

```bash
sudo -v
PERF_HEADED=1 PERF_BROWSER_CHANNEL=chrome PERF_GPU=1 PERF_LABEL=feature pnpm test:perf
```

`PERF_HEADED=1` keeps graphics hardware enabled and `PERF_BROWSER_CHANNEL=chrome` uses the installed Chrome build instead of bundled headless Chromium. Keep the window foregrounded. The harness continuously validates focus and visibility and fails a headed measurement if the window is hidden, loses focus, is lifecycle-frozen, or a DevTools target is open. Chromium does not expose a cross-platform signal for a visible window merely covered by another window; the recorded `document-and-page-lifecycle` signal covers tab switches, minimization, hiding, and freezing. The harness invokes `sudo -n`, so automation never opens a password prompt. If authorization expires or the machine does not expose per-process GPU time, the report records `permission-denied` or `unavailable` and continues. GPU power estimates are valid only for same-machine optimization work.

## Baselines are machine-local

`perf/<label>/*.json` and `*.cpuprofile` are gitignored (see `perf/.gitignore`), so per-run bench outputs and CDP traces stay local. **Per-scenario baselines aren't committed.** That's intentional — headless Chromium timings on a 4-core Linux runner look nothing like an M-series Mac. Committing one machine's numbers as the canonical baseline would be misleading the moment anyone else opened the file.

The intended workflow is:

- **Local optimization work** — record a baseline before your change with `pnpm test:perf:baseline`, then re-run `pnpm test:perf` after each iteration. `recordScenario` auto-loads `perf/baseline/<scenario>.json` and embeds it under the `baseline` key in every report, so diffs are doable straight from the per-scenario JSON.
- **CI regression tracking** — `.github/workflows/test-perf.yml` runs the bench on a dedicated `ubuntu-latest` runner with `--workers=1` (no shard contention). On PRs it runs the bench **twice on the same runner**: once with `packages/react-grab/src/` swapped to the PR's base ref (`PERF_LABEL=baseline`), then once with HEAD's src (`PERF_LABEL=current`). The bench harness, e2e-app, and Playwright config all stay at HEAD across both runs so the only variable is react-grab's source. A markdown diff table (via `scripts/diff-perf-runs.mjs`) is written to the job summary, and the full `perf/` directory (both runs + diff input) is uploaded as an artifact (14-day retention). On pushes to `main`, only the HEAD run executes — single trend snapshot, no diff.

The only thresholds asserted in-test are absolute Web Vitals caps (currently `INP < 100ms` soft-asserted on a couple of interaction-heavy scenarios). These hold across reasonable hardware; they're not derived from a committed baseline.

## Report shape

Each `perf/<label>/<scenario>.json` looks like:

```json
{
  "schemaVersion": 4,
  "scenario": "hover-in-selection-mode",
  "label": "current",
  "samples": 3,
  "warmupSamples": 0,
  "environment": { "browser": {...}, "page": {...}, "gpu": {...} },
  "workload": { "before": {...}, "after": {...}, "metadata": {...} },
  "aggregate": { "inp": 0, "longTasks": {...}, "frames": {...}, "fps": {...}, ... },
  "memory": { "before": {...}, "after": {...}, "delta": {...} },
  "processCpu": { "aggregate": {...}, "perSample": [...] },
  "hardwareGpu": { "aggregate": {...}, "perSample": [...] },
  "rendering": { "style": {...}, "paint": {...}, "compositor": {...}, ... },
  "animationLifecycle": { "activeTimelineDutyCyclePercent": 100, "zeroActiveAnimationMilliseconds": 0, ... },
  "animationCounterfactual": { "active": {...}, "paused": {...}, "activeMinusPaused": {...}, ... },
  "domMutationAttribution": { "hitCount": 12, "topSources": [...], "topMutationSinks": [...], "hits": [...] },
  "compositing": { "maximumContentLayerCount": 8, "maximumClippedContentAreaViewportMultiple": 4.2, "topLayers": [...] },
  "css": { "stylesheets": [...], "animationsStarted": [...] },
  "validity": { "samples": {...}, "renderReplay": {...} },
  "capabilities": {...},
  "artifacts": { "renderTrace": "hover-in-selection-mode.render-trace.json.gz" },
  "perSample": [ ... ],
  "baseline": { ... },
  "recordedAt": "..."
}
```

- `aggregate` — median across `samples` runs.
- `perSample` — raw per-run aggregates so you can eyeball variance / spot outlier samples.
- `baseline` — the previous local baseline (from `perf/baseline/<scenario>.json` if present, else `null`).
- `memory` — GC-forced CDP memory counters before/after the samples plus their delta; a persistent positive `delta` across runs points at a leak (retained nodes/listeners).
- `processCpu` — sampled CPU consumed by the Chromium process tree during the clean scenario window. `totalCorePercent` can exceed 100% because it represents core equivalents; `hostNormalizedPercent` cannot.
- `hardwareGpu` — OS GPU counters and explicit capability status. On macOS, browser busy percentage combines the attributable shares of every Chromium process and caps the physical utilization at 100%. GPU-process CPU is separately available in `processCpu.byType` and is not mislabeled as hardware GPU utilization.
- `rendering` / `css` — present only after an opt-in render replay. These explain a regression but do not replace the clean pass's numbers.
- `animationLifecycle` — passive CDP lifecycle timestamps and integrated active/idle timeline duration for the render replay.
- `animationCounterfactual` — three alternating active/paused process-CPU pairs plus both render traces. `activeMinusPaused.combinedGraphicsPipelineCorePercent` is the renderer + GPU-process CPU attributable to live animations in the scenario.
- `validity` — continuous focus, visibility, lifecycle, and DevTools evidence for clean samples and trace replays.
- `domMutationAttribution` — optional intrusive replay correlating subtree, attribute, and removal mutations with paused JavaScript call stacks. `topSources` identifies source-map-resolved application owners while `topMutationSinks` preserves the low-level DOM-writing frame. It is capped evidence rather than a performance metric.
- `workload` — machine-readable canary shape, inspired by Pretext's corpus metadata. A timing comparison is suspect when workload structure changed.

`recordScenario` also accepts `warmupSamples` for deterministic scenarios and `collectWorkloadMetadata` for domain-specific canary shape. Warmups run outside every probe and are recorded in the artifact rather than silently mixed into steady-state samples.

## Deopt trace

`pnpm perf:deopt` (`scripts/deopt-trace.mjs`) launches its own Chrome with `--js-flags="--trace-deopt ..."` (V8 flags must be set at process launch, so this can't run inside the Playwright-managed browser), drives synthetic + full-app scenarios, and parses the deopt/bailout lines from Chrome's stderr into `perf/<label>/deopt.summary.json`. `perf:analyze` folds the top sites into its report. Pair with `pnpm build:profiling` so function names in deopt lines are unminified.

## Scenarios

Activation & lifecycle:
`rapid-toggle-active-inactive` · `idle-after-activation` · `animation-scheduling-controls` · `activate-with-many-animations` · `deactivate-with-many-frozen-elements`

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
