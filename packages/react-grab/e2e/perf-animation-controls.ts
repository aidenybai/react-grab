import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, TestInfo } from "@playwright/test";
import {
  pauseRunningAnimations,
  resumePausedAnimations,
  subtractAnimationCpu,
  summarizeAnimationCpu,
  type PerfAnimationCounterfactualDelta,
  type PerfAnimationCpuSummary,
} from "./perf-animation-counterfactual.js";
import {
  PERF_ANIMATION_CONTROL_SAMPLE_MS,
  PERF_ANIMATION_CONTROL_WARMUP_MS,
  PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS,
  PERF_ANIMATION_FINITE_ACTIVE_MS,
  PERF_ANIMATION_FINITE_HOLD_MS,
  PERF_ANIMATION_HIGH_OPACITY,
  PERF_ANIMATION_INDICATOR_GAP_PX,
  PERF_ANIMATION_INDICATOR_OFFSET_PX,
  PERF_ANIMATION_INDICATOR_SIZE_PX,
  PERF_ANIMATION_LOW_OPACITY,
  PERF_ANIMATION_PRODUCTION_INDICATOR_COUNT,
  PERF_REPORT_SCHEMA_VERSION,
} from "./perf-constants.js";
import { capturePerfEnvironment, type PerfEnvironment } from "./perf-environment.js";
import {
  aggregateProcessCpuSamples,
  startProcessCpuProbe,
  type PerfProcessCpuMetrics,
  type PerfProcessCpuSample,
} from "./perf-process-cpu.js";
import { captureRenderTrace, type PerfRenderTraceReport } from "./perf-render-trace.js";
import {
  aggregatePerfRunValidity,
  assertValidHeadedPerfRun,
  startPerfRunValidityProbe,
  type PerfRunValidityMetrics,
  type PerfRunValiditySummary,
} from "./perf-validity.js";

declare global {
  interface Window {
    __PERF_ANIMATION_CONTROL__?: {
      cleanup(): void;
    };
  }
}

export interface PerfAnimationControlFixtureOptions {
  mode: PerfAnimationControlMode;
  indicatorCount: number;
  activeDurationMs: number;
  holdDurationMs: number;
  indicatorSizePx: number;
  indicatorGapPx: number;
  indicatorOffsetPx: number;
  lowOpacity: number;
  highOpacity: number;
}

export interface PerfAnimationControlSample {
  mode: PerfAnimationControlMode;
  repetition: number;
  order: number;
  processCpu: PerfProcessCpuSample;
  validity: PerfRunValiditySummary;
}

export interface PerfAnimationControlComparison {
  mode: Exclude<PerfAnimationControlMode, "animations-paused">;
  sequence: PerfAnimationControlMode[];
  active: {
    processCpu: PerfProcessCpuMetrics;
    cpu: PerfAnimationCpuSummary;
    validity: PerfRunValidityMetrics;
  };
  paused: {
    processCpu: PerfProcessCpuMetrics;
    cpu: PerfAnimationCpuSummary;
    validity: PerfRunValidityMetrics;
  };
  activeMinusPaused: PerfAnimationCounterfactualDelta;
  samples: PerfAnimationControlSample[];
}

export interface PerfAnimationControlTrace {
  mode: PerfAnimationControlMode;
  renderTrace: PerfRenderTraceReport;
}

export interface PerfAnimationControlReport {
  kind: "animation-scheduling-controls";
  schemaVersion: number;
  label: string;
  environment: PerfEnvironment;
  repetitions: number;
  sampleDurationMs: number;
  productionIndicatorCount: number;
  comparisons: PerfAnimationControlComparison[];
  traces: PerfAnimationControlTrace[];
  recordedAt: string;
}

export type PerfAnimationControlMode =
  | "legacy-one-indicator"
  | "legacy-production-count"
  | "animations-paused"
  | "infinite-stepped"
  | "finite-static-holds";

const E2E_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIRECTORY = resolve(E2E_DIRECTORY, "../perf");
const CONTROL_SCENARIO_NAME = "animation-scheduling-controls";

const controlModes: Array<Exclude<PerfAnimationControlMode, "animations-paused">> = [
  "legacy-production-count",
  "legacy-one-indicator",
  "infinite-stepped",
  "finite-static-holds",
];

const installAnimationControlFixture = (options: PerfAnimationControlFixtureOptions): void => {
  window.__PERF_ANIMATION_CONTROL__?.cleanup();
  let isDisposed = false;
  const timers: number[] = [];
  const animations: Animation[] = [];
  const root = document.createElement("div");
  const style = document.createElement("style");
  root.dataset.perfAnimationControl = options.mode;
  style.textContent = `
    @keyframes perf-legacy-pulse {
      0%, 100% { opacity: ${options.lowOpacity}; }
      50% { opacity: ${options.highOpacity}; }
    }
    [data-perf-animation-control] {
      position: fixed;
      top: ${options.indicatorOffsetPx}px;
      left: ${options.indicatorOffsetPx}px;
      z-index: 2147483647;
      display: flex;
      gap: ${options.indicatorGapPx}px;
      pointer-events: none;
    }
    [data-perf-animation-indicator] {
      width: ${options.indicatorSizePx}px;
      height: ${options.indicatorSizePx}px;
      border-radius: 50%;
      background: rgb(59 130 246);
      opacity: ${options.lowOpacity};
      will-change: opacity;
    }
  `;
  document.head.append(style);
  document.body.append(root);
  const indicators: HTMLElement[] = [];
  for (let indicatorIndex = 0; indicatorIndex < options.indicatorCount; indicatorIndex++) {
    const indicator = document.createElement("div");
    indicator.dataset.perfAnimationIndicator = String(indicatorIndex);
    root.append(indicator);
    indicators.push(indicator);
  }

  const startFinitePulse = (indicator: HTMLElement, targetOpacity: number): void => {
    if (isDisposed) return;
    const animation = indicator.animate(
      [{ opacity: getComputedStyle(indicator).opacity }, { opacity: targetOpacity }],
      { duration: options.activeDurationMs, easing: "ease-in-out", fill: "forwards" },
    );
    animations.push(animation);
    animation.finished.then(
      () => {
        if (isDisposed) return;
        animation.commitStyles();
        animation.cancel();
        const nextOpacity =
          targetOpacity === options.highOpacity ? options.lowOpacity : options.highOpacity;
        timers.push(
          window.setTimeout(() => startFinitePulse(indicator, nextOpacity), options.holdDurationMs),
        );
      },
      () => {},
    );
  };

  if (options.mode === "finite-static-holds") {
    for (const indicator of indicators) startFinitePulse(indicator, options.highOpacity);
  } else {
    const timingFunction = options.mode === "infinite-stepped" ? "steps(1, end)" : "ease-in-out";
    for (const indicator of indicators) {
      indicator.style.animation = `perf-legacy-pulse ${options.activeDurationMs + options.holdDurationMs}ms ${timingFunction} infinite`;
    }
    if (options.mode === "animations-paused") {
      for (const indicator of indicators) indicator.style.animationPlayState = "paused";
    }
  }

  window.__PERF_ANIMATION_CONTROL__ = {
    cleanup() {
      isDisposed = true;
      for (const timer of timers) window.clearTimeout(timer);
      for (const animation of animations) animation.cancel();
      root.remove();
      style.remove();
      delete window.__PERF_ANIMATION_CONTROL__;
    },
  };
};

const setupAnimationControl = async (page: Page, mode: PerfAnimationControlMode): Promise<void> => {
  const indicatorCount =
    mode === "legacy-one-indicator" ? 1 : PERF_ANIMATION_PRODUCTION_INDICATOR_COUNT;
  await pauseRunningAnimations(page);
  try {
    await page.evaluate(installAnimationControlFixture, {
      mode,
      indicatorCount,
      activeDurationMs: PERF_ANIMATION_FINITE_ACTIVE_MS,
      holdDurationMs: PERF_ANIMATION_FINITE_HOLD_MS,
      indicatorSizePx: PERF_ANIMATION_INDICATOR_SIZE_PX,
      indicatorGapPx: PERF_ANIMATION_INDICATOR_GAP_PX,
      indicatorOffsetPx: PERF_ANIMATION_INDICATOR_OFFSET_PX,
      lowOpacity: PERF_ANIMATION_LOW_OPACITY,
      highOpacity: PERF_ANIMATION_HIGH_OPACITY,
    });
    await page.waitForTimeout(PERF_ANIMATION_CONTROL_WARMUP_MS);
    if (mode === "animations-paused") {
      await page.evaluate(() => {
        const root = document.querySelector("[data-perf-animation-control]");
        for (const animation of root?.getAnimations() ?? []) animation.pause();
      });
    }
  } catch (setupError) {
    await resumePausedAnimations(page);
    throw setupError;
  }
};

const cleanupAnimationControl = async (page: Page): Promise<void> => {
  try {
    await page.evaluate(() => window.__PERF_ANIMATION_CONTROL__?.cleanup());
  } finally {
    await resumePausedAnimations(page);
  }
};

const captureControlSample = async (
  page: Page,
  scenarioName: string,
  mode: PerfAnimationControlMode,
  logicalCpuCount: number,
  repetition: number,
  order: number,
): Promise<PerfAnimationControlSample> => {
  await setupAnimationControl(page, mode);
  const validityProbe = await startPerfRunValidityProbe(page);
  const processCpuProbe = await startProcessCpuProbe(page, logicalCpuCount);
  let processCpu: PerfProcessCpuSample | undefined;
  let validity: PerfRunValiditySummary | undefined;
  try {
    await page.waitForTimeout(PERF_ANIMATION_CONTROL_SAMPLE_MS);
  } finally {
    try {
      processCpu = await processCpuProbe.stop();
    } finally {
      try {
        validity = await validityProbe.stop();
      } finally {
        await cleanupAnimationControl(page);
      }
    }
  }
  if (!processCpu || !validity) throw new Error(`${scenarioName} ${mode} produced no sample`);
  assertValidHeadedPerfRun(validity, `${scenarioName} ${mode} repetition ${repetition}`);
  return { mode, repetition, order, processCpu, validity };
};

const buildComparison = (
  mode: Exclude<PerfAnimationControlMode, "animations-paused">,
  samples: PerfAnimationControlSample[],
): PerfAnimationControlComparison => {
  const activeSamples = samples.filter((sample) => sample.mode === mode);
  const pausedSamples = samples.filter((sample) => sample.mode === "animations-paused");
  const activeProcessCpu = aggregateProcessCpuSamples(
    activeSamples.map((sample) => sample.processCpu),
  );
  const pausedProcessCpu = aggregateProcessCpuSamples(
    pausedSamples.map((sample) => sample.processCpu),
  );
  const activeCpu = summarizeAnimationCpu(activeProcessCpu);
  const pausedCpu = summarizeAnimationCpu(pausedProcessCpu);
  return {
    mode,
    sequence: samples.map((sample) => sample.mode),
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

export const captureAnimationSchedulingControls = async (
  page: Page,
  testInfo: TestInfo,
): Promise<PerfAnimationControlReport> => {
  const environment = await capturePerfEnvironment(page);
  const comparisons: PerfAnimationControlComparison[] = [];
  let order = 0;
  for (const mode of controlModes) {
    const samples: PerfAnimationControlSample[] = [];
    for (let repetition = 0; repetition < PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS; repetition++) {
      const pair: PerfAnimationControlMode[] =
        repetition % 2 === 0 ? [mode, "animations-paused"] : ["animations-paused", mode];
      for (const sampleMode of pair) {
        order += 1;
        samples.push(
          await captureControlSample(
            page,
            CONTROL_SCENARIO_NAME,
            sampleMode,
            environment.host.logicalCpuCount,
            repetition + 1,
            order,
          ),
        );
      }
    }
    comparisons.push(buildComparison(mode, samples));
  }

  const traces: PerfAnimationControlTrace[] = [];
  const traceModes: PerfAnimationControlMode[] = [...controlModes, "animations-paused"];
  for (const mode of traceModes) {
    await setupAnimationControl(page, mode);
    try {
      const renderTrace = await captureRenderTrace(
        page,
        testInfo,
        `${CONTROL_SCENARIO_NAME}-${mode}`,
        PACKAGE_PERF_DIRECTORY,
        async () => page.waitForTimeout(PERF_ANIMATION_CONTROL_SAMPLE_MS),
      );
      if (renderTrace.validity) {
        assertValidHeadedPerfRun(renderTrace.validity, `${CONTROL_SCENARIO_NAME} ${mode} trace`);
      }
      traces.push({ mode, renderTrace });
    } finally {
      await cleanupAnimationControl(page);
    }
  }

  const runLabel = process.env.PERF_LABEL ?? "current";
  const report: PerfAnimationControlReport = {
    kind: "animation-scheduling-controls",
    schemaVersion: PERF_REPORT_SCHEMA_VERSION,
    label: runLabel,
    environment,
    repetitions: PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS,
    sampleDurationMs: PERF_ANIMATION_CONTROL_SAMPLE_MS,
    productionIndicatorCount: PERF_ANIMATION_PRODUCTION_INDICATOR_COUNT,
    comparisons,
    traces,
    recordedAt: new Date().toISOString(),
  };
  const reportJson = JSON.stringify(report, null, 2);
  const labelDirectory = resolve(PACKAGE_PERF_DIRECTORY, runLabel);
  await mkdir(labelDirectory, { recursive: true });
  await writeFile(resolve(labelDirectory, `${CONTROL_SCENARIO_NAME}.json`), reportJson);
  await testInfo.attach(`perf-${CONTROL_SCENARIO_NAME}.json`, {
    body: reportJson,
    contentType: "application/json",
  });
  return report;
};
