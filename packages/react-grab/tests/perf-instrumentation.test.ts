import { describe, expect, it } from "vite-plus/test";
import { PERF_TRACE_MARKER_END, PERF_TRACE_MARKER_START } from "../e2e/perf-constants.js";
import { summarizeProcessCpuSnapshots } from "../e2e/perf-process-cpu.js";
import { summarizeRenderTrace } from "../e2e/perf-render-trace.js";

describe("perf instrumentation", () => {
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
    );

    expect(summary.available).toBe(true);
    expect(summary.totalCpuSeconds).toBe(0.35);
    expect(summary.totalCorePercent).toBe(35);
    expect(summary.hostNormalizedPercent).toBe(8.75);
    expect(summary.harnessCorePercent).toBe(10);
    expect(summary.byType.renderer.corePercent).toBe(20);
    expect(summary.byType.GPU.corePercent).toBe(10);
    expect(summary.byType.utility.corePercent).toBe(5);
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
});
