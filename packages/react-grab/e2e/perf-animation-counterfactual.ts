import type { Page } from "@playwright/test";
import { PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS } from "./perf-constants.js";
import {
  aggregateProcessCpuSamples,
  startProcessCpuProbe,
  type PerfProcessCpuMetrics,
  type PerfProcessCpuProbe,
  type PerfProcessCpuSample,
} from "./perf-process-cpu.js";
import { roundTo3 } from "./perf-statistics.js";
import {
  aggregatePerfRunValidity,
  assertValidHeadedPerfRun,
  startPerfRunValidityProbe,
  type PerfRunValidityMetrics,
  type PerfRunValidityProbe,
  type PerfRunValiditySummary,
} from "./perf-validity.js";
import type { PerfRenderTraceReport } from "./perf-render-trace.js";

declare global {
  interface Window {
    __PERF_PAUSED_ANIMATIONS__?: {
      pausedAnimationCount: number;
      resume(): void;
    };
  }
}

export interface PerfAnimationCpuSummary {
  gpuProcessCorePercent: number;
  rendererCorePercent: number;
  combinedGraphicsPipelineCorePercent: number;
  totalBrowserCorePercent: number;
}

export interface PerfAnimationCounterfactualSample {
  mode: "active" | "paused";
  repetition: number;
  order: number;
  pausedAnimationCount: number;
  processCpu: PerfProcessCpuSample;
  validity: PerfRunValiditySummary;
}

export interface PerfAnimationCounterfactualMode {
  processCpu: PerfProcessCpuMetrics;
  cpu: PerfAnimationCpuSummary;
  validity: PerfRunValidityMetrics;
}

export interface PerfAnimationCounterfactualDelta {
  gpuProcessCorePercent: number;
  rendererCorePercent: number;
  combinedGraphicsPipelineCorePercent: number;
  totalBrowserCorePercent: number;
}

export interface PerfAnimationCounterfactualReport {
  repetitions: number;
  sequence: Array<"active" | "paused">;
  active: PerfAnimationCounterfactualMode;
  paused: PerfAnimationCounterfactualMode;
  activeMinusPaused: PerfAnimationCounterfactualDelta;
  activeRenderTrace?: PerfRenderTraceReport;
  pausedRenderTrace?: PerfRenderTraceReport;
  samples: PerfAnimationCounterfactualSample[];
}

export const resumePausedAnimations = (page: Page): Promise<void> =>
  page.evaluate(() => window.__PERF_PAUSED_ANIMATIONS__?.resume());

export const pauseRunningAnimations = (page: Page): Promise<number> =>
  page.evaluate(() => {
    window.__PERF_PAUSED_ANIMATIONS__?.resume();
    const runningAnimations = document
      .getAnimations()
      .filter((animation) => animation.playState === "running");
    for (const animation of runningAnimations) animation.pause();
    window.__PERF_PAUSED_ANIMATIONS__ = {
      pausedAnimationCount: runningAnimations.length,
      resume() {
        for (const animation of runningAnimations) {
          if (animation.playState === "paused") animation.play();
        }
        delete window.__PERF_PAUSED_ANIMATIONS__;
      },
    };
    return runningAnimations.length;
  });

export const summarizeAnimationCpu = (
  processCpu: PerfProcessCpuMetrics,
): PerfAnimationCpuSummary => {
  const gpuProcessCorePercent =
    processCpu.aggregate.byType.GPU?.corePercent ??
    processCpu.aggregate.byType.gpu?.corePercent ??
    0;
  const rendererCorePercent = processCpu.aggregate.byType.renderer?.corePercent ?? 0;
  return {
    gpuProcessCorePercent: roundTo3(gpuProcessCorePercent),
    rendererCorePercent: roundTo3(rendererCorePercent),
    combinedGraphicsPipelineCorePercent: roundTo3(gpuProcessCorePercent + rendererCorePercent),
    totalBrowserCorePercent: roundTo3(processCpu.aggregate.totalCorePercent),
  };
};

export const subtractAnimationCpu = (
  active: PerfAnimationCpuSummary,
  paused: PerfAnimationCpuSummary,
): PerfAnimationCounterfactualDelta => ({
  gpuProcessCorePercent: roundTo3(active.gpuProcessCorePercent - paused.gpuProcessCorePercent),
  rendererCorePercent: roundTo3(active.rendererCorePercent - paused.rendererCorePercent),
  combinedGraphicsPipelineCorePercent: roundTo3(
    active.combinedGraphicsPipelineCorePercent - paused.combinedGraphicsPipelineCorePercent,
  ),
  totalBrowserCorePercent: roundTo3(
    active.totalBrowserCorePercent - paused.totalBrowserCorePercent,
  ),
});

export const captureAnimationCounterfactual = async (
  page: Page,
  scenarioName: string,
  logicalCpuCount: number,
  scenarioBody: () => Promise<void>,
  beforeEachSample?: () => Promise<void>,
): Promise<PerfAnimationCounterfactualReport> => {
  const sequence: Array<"active" | "paused"> = [];
  const samples: PerfAnimationCounterfactualSample[] = [];
  let order = 0;
  try {
    for (let repetition = 0; repetition < PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS; repetition++) {
      const modes: Array<"active" | "paused"> =
        repetition % 2 === 0 ? ["active", "paused"] : ["paused", "active"];
      for (const mode of modes) {
        order += 1;
        sequence.push(mode);
        await resumePausedAnimations(page);
        if (beforeEachSample) await beforeEachSample();
        const pausedAnimationCount = mode === "paused" ? await pauseRunningAnimations(page) : 0;
        let validityProbe: PerfRunValidityProbe | undefined;
        let processCpuProbe: PerfProcessCpuProbe | undefined;
        let processCpu: PerfProcessCpuSample | undefined;
        let validity: PerfRunValiditySummary | undefined;
        try {
          validityProbe = await startPerfRunValidityProbe(page);
          processCpuProbe = await startProcessCpuProbe(page, logicalCpuCount);
          await scenarioBody();
        } finally {
          try {
            if (processCpuProbe) processCpu = await processCpuProbe.stop();
          } finally {
            try {
              if (validityProbe) validity = await validityProbe.stop();
            } finally {
              await resumePausedAnimations(page);
            }
          }
        }
        if (!processCpu || !validity) {
          throw new Error(`${scenarioName} ${mode} did not stop every probe`);
        }
        assertValidHeadedPerfRun(validity, `${scenarioName} ${mode} control ${repetition + 1}`);
        samples.push({
          mode,
          repetition: repetition + 1,
          order,
          pausedAnimationCount,
          processCpu,
          validity,
        });
      }
    }
  } finally {
    await resumePausedAnimations(page);
  }

  const activeSamples = samples.filter((sample) => sample.mode === "active");
  const pausedSamples = samples.filter((sample) => sample.mode === "paused");
  const activeProcessCpu = aggregateProcessCpuSamples(
    activeSamples.map((sample) => sample.processCpu),
  );
  const pausedProcessCpu = aggregateProcessCpuSamples(
    pausedSamples.map((sample) => sample.processCpu),
  );
  const activeCpu = summarizeAnimationCpu(activeProcessCpu);
  const pausedCpu = summarizeAnimationCpu(pausedProcessCpu);
  return {
    repetitions: PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS,
    sequence,
    active: {
      processCpu: activeProcessCpu,
      cpu: activeCpu,
      validity: aggregatePerfRunValidity(activeSamples.map((sample) => sample.validity)),
    },
    paused: {
      processCpu: pausedProcessCpu,
      cpu: pausedCpu,
      validity: aggregatePerfRunValidity(pausedSamples.map((sample) => sample.validity)),
    },
    activeMinusPaused: subtractAnimationCpu(activeCpu, pausedCpu),
    samples,
  };
};
