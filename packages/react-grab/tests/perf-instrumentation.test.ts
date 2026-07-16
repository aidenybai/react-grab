import { spawn } from "node:child_process";
import { describe, expect, it } from "vite-plus/test";
import { PERF_TRACE_MARKER_END, PERF_TRACE_MARKER_START } from "../e2e/perf-constants.js";
import {
  parsePowermetricsOutput,
  summarizeDrmEngineSnapshots,
  waitForHardwareGpuProcessExit,
} from "../e2e/perf-hardware-gpu.js";
import {
  aggregateProcessCpuSamples,
  summarizeProcessCpuSnapshots,
} from "../e2e/perf-process-cpu.js";
import { summarizeRenderTrace } from "../e2e/perf-render-trace.js";

describe("perf instrumentation", () => {
  it("observes a GPU sampler that exited before teardown", async () => {
    const childProcess = spawn(process.execPath, ["-e", ""], { stdio: "pipe" });
    await new Promise<void>((resolveExit) => {
      childProcess.once("close", () => resolveExit());
    });

    const exit = await waitForHardwareGpuProcessExit(childProcess);

    expect(exit).toEqual({ exitCode: 0, signal: null });
  });

  it("attributes browser process CPU across process types and transient processes", () => {
    const summary = summarizeProcessCpuSnapshots(
      [
        {
          capturedAtMs: 0,
          processInfo: [
            { id: 10, type: "renderer", cpuTime: 1 },
            { id: 20, type: "GPU", cpuTime: 0.5 },
          ],
        },
        {
          capturedAtMs: 1000,
          processInfo: [
            { id: 10, type: "renderer", cpuTime: 1.2 },
            { id: 20, type: "GPU", cpuTime: 0.6 },
            { id: 30, type: "utility", cpuTime: 0.05 },
          ],
        },
      ],
      1000,
      4,
      100_000,
      "one process census failed",
    );

    expect(summary.available).toBe(true);
    expect(summary.totalCpuSeconds).toBe(0.35);
    expect(summary.totalCorePercent).toBe(35);
    expect(summary.hostNormalizedPercent).toBe(8.75);
    expect(summary.harnessCorePercent).toBe(10);
    expect(summary.byType.renderer.corePercent).toBe(20);
    expect(summary.byType.GPU.corePercent).toBe(10);
    expect(summary.byType.utility.corePercent).toBe(5);
    expect(summary.error).toBe("one process census failed");
  });

  it("rejects CPU samples without a measurement delta", () => {
    const failedSample = summarizeProcessCpuSnapshots(
      [
        {
          capturedAtMs: 0,
          processInfo: [{ id: 10, type: "renderer", cpuTime: 1 }],
        },
      ],
      1000,
      4,
      0,
      "process census failed",
    );
    const validSample = summarizeProcessCpuSnapshots(
      [
        {
          capturedAtMs: 0,
          processInfo: [{ id: 10, type: "renderer", cpuTime: 1 }],
        },
        {
          capturedAtMs: 1000,
          processInfo: [{ id: 10, type: "renderer", cpuTime: 1.5 }],
        },
      ],
      1000,
      4,
      0,
    );

    expect(failedSample.available).toBe(false);
    expect(failedSample.error).toBe("process census failed");
    expect(aggregateProcessCpuSamples([failedSample, validSample]).aggregate.totalCorePercent).toBe(
      50,
    );
  });

  it("combines browser GPU busy shares across Chromium processes", () => {
    const sample = parsePowermetricsOutput(
      [
        "GPU HW active residency: 70%",
        "pid 10 Chromium Renderer 5 ms (20%)",
        "pid 20 Chromium GPU 8 ms (35%)",
      ].join("\n"),
      new Set([10, 20]),
    );

    expect(sample.browserBusyMeanPercent).toBe(55);
    expect(sample.browserBusyMaxPercent).toBe(55);
    expect(sample.browserActiveTimeMs).toBe(13);
  });

  it("includes DRM engines that appear during the sample window", () => {
    const sample = summarizeDrmEngineSnapshots(
      {
        capturedAtMs: 0,
        activeNanosecondsByEngine: new Map([["render", 1_000_000]]),
      },
      {
        capturedAtMs: 100,
        activeNanosecondsByEngine: new Map([
          ["render", 11_000_000],
          ["copy", 20_000_000],
        ]),
      },
    );

    expect(sample.browserActiveTimeMs).toBe(30);
    expect(sample.engines).toEqual([
      { engine: "copy", activeTimeMs: 20, busyPercent: 20 },
      { engine: "render", activeTimeMs: 10, busyPercent: 10 },
    ]);
  });

  it("limits rendering attribution to the marked scenario window", () => {
    const summary = summarizeRenderTrace({
      traceEvents: [
        { name: PERF_TRACE_MARKER_START, ts: 100 },
        { name: "UpdateLayoutTree", cat: "devtools.timeline", ph: "X", ts: 200, dur: 1000 },
        { name: "Layout", cat: "devtools.timeline", ph: "X", ts: 1500, dur: 2000 },
        { name: "Paint", cat: "devtools.timeline", ph: "X", ts: 4000, dur: 3000 },
        { name: "RasterTask", cat: "cc", ph: "X", ts: 7500, dur: 500 },
        { name: "SubmitCompositorFrame", cat: "cc", ph: "X", ts: 8200, dur: 200 },
        { name: "LayerTreeHostImpl::DidNotProduceFrame", cat: "cc", ts: 8300 },
        { name: "Scheduler::BeginFrameDropped", cat: "cc", ts: 8400 },
        { name: "Display::DrawAndSwap", cat: "viz", ph: "X", ts: 8500, dur: 300 },
        { name: "DisplayScheduler::DrawAndSwap", cat: "viz", ph: "X", ts: 8600, dur: 200 },
        { name: "FramePresented", cat: "viz", ts: 9000 },
        { name: "AnimationHost::TickAnimations", cat: "cc", ts: 9100 },
        { name: "AnimationHost::TickAnimations", cat: "cc", ts: 9200 },
        { name: "LayerTreeHostImpl::AnimateLayers", cat: "cc", ts: 9300 },
        { name: "NeedsTickAnimations", cat: "cc", ts: 9400 },
        { name: "DrawFrame", cat: "cc", ts: 9500 },
        { name: PERF_TRACE_MARKER_END, ts: 10_000 },
        { name: "Layout", cat: "devtools.timeline", ph: "X", ts: 20_000, dur: 50_000 },
      ],
    });

    expect(summary.usedScenarioMarkers).toBe(true);
    expect(summary.windowDurationMs).toBe(9.9);
    expect(summary.style.totalDurationMs).toBe(1);
    expect(summary.layout.totalDurationMs).toBe(2);
    expect(summary.paint.totalDurationMs).toBe(3);
    expect(summary.raster.totalDurationMs).toBe(0.5);
    expect(summary.compositor.eventCount).toBe(8);
    expect(summary.viz.eventCount).toBe(3);
    expect(summary.frames.submittedFrames).toBe(1);
    expect(summary.frames.drawAndSwapFrames).toBe(1);
    expect(summary.frames.presentedFrames).toBe(1);
    expect(summary.frames.droppedFrames).toBe(0);
    expect(summary.frames.skippedFrames).toBe(1);
    expect(summary.frames.productionRateFps).toBeCloseTo(101.01, 2);
    expect(summary.frames.productionDutyCyclePercent).toBe(50);
    expect(summary.animationScheduling.animationTickCount).toBe(2);
    expect(summary.animationScheduling.animationTicksPerSecond).toBeCloseTo(202.02, 2);
    expect(summary.animationScheduling.animateLayersCount).toBe(1);
    expect(summary.animationScheduling.needsTickAnimationsCount).toBe(1);
    expect(summary.animationScheduling.drawFrameCount).toBe(1);
    expect(summary.animationScheduling.drawsPerAnimationTick).toBe(0.5);
    expect(summary.animationScheduling.drawEfficiencyPercent).toBe(50);
  });

  it("does not misclassify no-damage scheduler frames as visual drops", () => {
    const summary = summarizeRenderTrace({
      traceEvents: [
        { name: PERF_TRACE_MARKER_START, ts: 0 },
        { name: "Display::DrawAndSwap", cat: "viz", ts: 100_000 },
        { name: "Display::DrawAndSwap", cat: "viz", ts: 200_000 },
        { name: "LayerTreeHostImpl::DidNotProduceFrame", cat: "cc", ts: 300_000 },
        { name: "Scheduler::BeginFrameDropped", cat: "cc", ts: 300_001 },
        { name: "LayerTreeHostImpl::DidNotProduceFrame", cat: "cc", ts: 400_000 },
        { name: "Scheduler::BeginFrameDropped", cat: "cc", ts: 400_001 },
        { name: "Scheduler::MissedBeginFrameDropped", cat: "cc", ts: 500_000 },
        { name: PERF_TRACE_MARKER_END, ts: 1_000_000 },
      ],
    });

    expect(summary.frames.drawAndSwapFrames).toBe(2);
    expect(summary.frames.skippedFrames).toBe(2);
    expect(summary.frames.droppedFrames).toBe(1);
    expect(summary.frames.productionRateFps).toBe(2);
    expect(summary.frames.productionDutyCyclePercent).toBe(50);
  });

  it("does not count main-frame work as compositor work", () => {
    const summary = summarizeRenderTrace({
      traceEvents: [
        { name: PERF_TRACE_MARKER_START, ts: 0 },
        {
          name: "ProxyMain::BeginMainFrame",
          cat: "cc",
          ph: "X",
          ts: 100,
          dur: 5000,
        },
        { name: PERF_TRACE_MARKER_END, ts: 10_000 },
      ],
    });

    expect(summary.compositor.eventCount).toBe(0);
    expect(summary.compositor.totalDurationMs).toBe(0);
  });

  it("aggregates selector costs and advanced paint snapshots", () => {
    const summary = summarizeRenderTrace({
      traceEvents: [
        { name: PERF_TRACE_MARKER_START, ts: 0 },
        {
          name: "SelectorStats",
          ts: 100,
          args: {
            selector_stats: {
              selector_timings: [
                {
                  selector: ".card > .title",
                  style_sheet_id: "sheet-1",
                  "elapsed (us)": 1500,
                  match_attempts: 100,
                  match_count: 10,
                  fast_reject_count: 60,
                  invalidation_count: 2,
                },
                {
                  selector: "[data-active]",
                  style_sheet_id: "sheet-1",
                  "elapsed (us)": 500,
                  match_attempts: 20,
                  match_count: 5,
                  fast_reject_count: 10,
                },
              ],
            },
          },
        },
        {
          name: "SelectorStats",
          ts: 200,
          args: {
            selector_stats: {
              selector_timings: [
                {
                  selector: ".card > .title",
                  style_sheet_id: "sheet-1",
                  "elapsed (us)": 500,
                  match_attempts: 50,
                  match_count: 5,
                  fast_reject_count: 30,
                  invalidation_count: 1,
                },
              ],
            },
          },
        },
        {
          name: "cc::Picture",
          ts: 300,
          args: { snapshot: { skp64: "serialized-picture" } },
        },
        {
          name: "cc::DisplayItemList",
          ts: 400,
          args: {
            snapshot: {
              params: {
                items: [
                  { name: "DrawRect", visual_rect: [0, 0, 20, 10] },
                  { name: "DrawText", visual_rect: [0, 0, 10, 5] },
                  { name: "DrawRect", visual_rect: [5, 5, 4, 5] },
                ],
              },
            },
          },
        },
        { name: PERF_TRACE_MARKER_END, ts: 1000 },
      ],
    });

    expect(summary.selectorStats.eventCount).toBe(2);
    expect(summary.selectorStats.selectorCount).toBe(2);
    expect(summary.selectorStats.totalElapsedMs).toBe(2.5);
    expect(summary.selectorStats.matchAttempts).toBe(170);
    expect(summary.selectorStats.matchCount).toBe(20);
    expect(summary.selectorStats.slowPathNonMatchPercent).toBeCloseTo(33.333, 3);
    expect(summary.selectorStats.topSelectors[0]).toMatchObject({
      selector: ".card > .title",
      elapsedMs: 2,
      matchAttempts: 150,
      matchCount: 15,
      invalidationCount: 3,
      slowPathNonMatchPercent: 33.333,
    });
    expect(summary.advancedPaint.pictureSnapshotCount).toBe(1);
    expect(summary.advancedPaint.displayItemListSnapshotCount).toBe(1);
    expect(summary.advancedPaint.displayItemCount).toBe(3);
    expect(summary.advancedPaint.paintedVisualAreaPx).toBe(270);
    expect(summary.advancedPaint.topDisplayItems[0]).toEqual({
      name: "DrawRect",
      count: 2,
      paintedVisualAreaPx: 220,
    });
  });
});
