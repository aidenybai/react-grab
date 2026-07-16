import type { CDPSession, Page } from "@playwright/test";
import { roundTo3 } from "./perf-statistics.js";

declare global {
  interface Window {
    __PERF_RUN_VALIDITY__?: {
      stop(): PerfPageValiditySnapshot;
    };
  }
}

export interface PerfPageValiditySnapshot {
  probeCompleted: boolean;
  startedVisible: boolean;
  endedVisible: boolean;
  startedFocused: boolean;
  endedFocused: boolean;
  visibilityChangeCount: number;
  focusEventCount: number;
  blurEventCount: number;
  hiddenDurationMs: number;
  unfocusedDurationMs: number;
  frozenLifecycleCount: number;
  hiddenLifecycleCount: number;
}

export interface PerfRunValiditySummary extends PerfPageValiditySnapshot {
  devToolsTargetCountAtStart: number;
  devToolsTargetCountAtEnd: number;
  occlusionSignal: "document-and-page-lifecycle";
  validForHeadedMeasurement: boolean;
  violations: string[];
}

export interface PerfRunValidityMetrics {
  aggregate: PerfRunValiditySummary;
  perSample: PerfRunValiditySummary[];
}

export interface PerfRunValidityProbe {
  stop(): Promise<PerfRunValiditySummary>;
}

interface TargetInfo {
  url: string;
}

interface TargetInfoResponse {
  targetInfos: TargetInfo[];
}

const countDevToolsTargets = async (browserSession: CDPSession): Promise<number> => {
  const response: TargetInfoResponse = await browserSession.send("Target.getTargets");
  return response.targetInfos.filter(
    (target) => target.url.startsWith("devtools://") || target.url.startsWith("chrome-devtools://"),
  ).length;
};

const installPageValidityProbe = (): void => {
  window.__PERF_RUN_VALIDITY__?.stop();
  const startedAtMs = performance.now();
  const startedVisible = document.visibilityState === "visible";
  const startedFocused = document.hasFocus();
  let visibilityChangeCount = 0;
  let focusEventCount = 0;
  let blurEventCount = 0;
  let hiddenDurationMs = 0;
  let unfocusedDurationMs = 0;
  let frozenLifecycleCount = 0;
  let hiddenLifecycleCount = 0;
  let hiddenStartedAtMs = startedVisible ? null : startedAtMs;
  let unfocusedStartedAtMs = startedFocused ? null : startedAtMs;

  const handleVisibilityChange = (): void => {
    const timestampMs = performance.now();
    visibilityChangeCount += 1;
    if (document.visibilityState === "visible") {
      if (hiddenStartedAtMs !== null) hiddenDurationMs += timestampMs - hiddenStartedAtMs;
      hiddenStartedAtMs = null;
    } else if (hiddenStartedAtMs === null) {
      hiddenLifecycleCount += 1;
      hiddenStartedAtMs = timestampMs;
    }
  };
  const handleFreeze = (): void => {
    frozenLifecycleCount += 1;
  };
  const handleFocus = (): void => {
    const timestampMs = performance.now();
    focusEventCount += 1;
    if (unfocusedStartedAtMs !== null) unfocusedDurationMs += timestampMs - unfocusedStartedAtMs;
    unfocusedStartedAtMs = null;
  };
  const handleBlur = (): void => {
    blurEventCount += 1;
    if (unfocusedStartedAtMs === null) unfocusedStartedAtMs = performance.now();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange, true);
  document.addEventListener("freeze", handleFreeze, true);
  window.addEventListener("focus", handleFocus, true);
  window.addEventListener("blur", handleBlur, true);
  window.__PERF_RUN_VALIDITY__ = {
    stop() {
      const endedAtMs = performance.now();
      const endedVisible = document.visibilityState === "visible";
      const endedFocused = document.hasFocus();
      if (hiddenStartedAtMs !== null) hiddenDurationMs += endedAtMs - hiddenStartedAtMs;
      if (unfocusedStartedAtMs !== null) unfocusedDurationMs += endedAtMs - unfocusedStartedAtMs;
      document.removeEventListener("visibilitychange", handleVisibilityChange, true);
      document.removeEventListener("freeze", handleFreeze, true);
      window.removeEventListener("focus", handleFocus, true);
      window.removeEventListener("blur", handleBlur, true);
      delete window.__PERF_RUN_VALIDITY__;
      return {
        probeCompleted: true,
        startedVisible,
        endedVisible,
        startedFocused,
        endedFocused,
        visibilityChangeCount,
        focusEventCount,
        blurEventCount,
        hiddenDurationMs,
        unfocusedDurationMs,
        frozenLifecycleCount,
        hiddenLifecycleCount,
      };
    },
  };
};

const unavailablePageSnapshot = (): PerfPageValiditySnapshot => ({
  probeCompleted: false,
  startedVisible: false,
  endedVisible: false,
  startedFocused: false,
  endedFocused: false,
  visibilityChangeCount: 0,
  focusEventCount: 0,
  blurEventCount: 0,
  hiddenDurationMs: 0,
  unfocusedDurationMs: 0,
  frozenLifecycleCount: 0,
  hiddenLifecycleCount: 0,
});

export const startPerfRunValidityProbe = async (page: Page): Promise<PerfRunValidityProbe> => {
  const browser = page.context().browser();
  if (!browser) {
    return {
      stop: async () => ({
        ...unavailablePageSnapshot(),
        devToolsTargetCountAtStart: 0,
        devToolsTargetCountAtEnd: 0,
        occlusionSignal: "document-and-page-lifecycle",
        validForHeadedMeasurement: false,
        violations: ["browser-disconnected"],
      }),
    };
  }

  let browserSession: CDPSession | null = null;
  try {
    browserSession = await browser.newBrowserCDPSession();
    const activeBrowserSession = browserSession;
    const devToolsTargetCountAtStart = await countDevToolsTargets(activeBrowserSession);
    await page.evaluate(installPageValidityProbe);

    return {
      async stop() {
        let pageSnapshot = unavailablePageSnapshot();
        let devToolsTargetCountAtEnd = devToolsTargetCountAtStart;
        try {
          const completedSnapshot = await page.evaluate(
            () => window.__PERF_RUN_VALIDITY__?.stop() ?? null,
          );
          if (completedSnapshot) pageSnapshot = completedSnapshot;
          devToolsTargetCountAtEnd = await countDevToolsTargets(activeBrowserSession);
        } finally {
          await Promise.allSettled([activeBrowserSession.detach()]);
        }
        const violations: string[] = [];
        if (!pageSnapshot.probeCompleted) violations.push("validity-probe-detached");
        if (!pageSnapshot.startedVisible || !pageSnapshot.endedVisible)
          violations.push("not-visible");
        if (pageSnapshot.visibilityChangeCount > 0 || pageSnapshot.hiddenDurationMs > 0) {
          violations.push("visibility-changed");
        }
        if (!pageSnapshot.startedFocused || !pageSnapshot.endedFocused)
          violations.push("not-focused");
        if (pageSnapshot.blurEventCount > 0 || pageSnapshot.unfocusedDurationMs > 0) {
          violations.push("focus-lost");
        }
        if (pageSnapshot.frozenLifecycleCount > 0) violations.push("page-frozen");
        if (pageSnapshot.hiddenLifecycleCount > 0) violations.push("page-hidden");
        if (devToolsTargetCountAtStart > 0 || devToolsTargetCountAtEnd > 0) {
          violations.push("devtools-open");
        }
        return {
          ...pageSnapshot,
          hiddenDurationMs: roundTo3(pageSnapshot.hiddenDurationMs),
          unfocusedDurationMs: roundTo3(pageSnapshot.unfocusedDurationMs),
          devToolsTargetCountAtStart,
          devToolsTargetCountAtEnd,
          occlusionSignal: "document-and-page-lifecycle",
          validForHeadedMeasurement: violations.length === 0,
          violations,
        };
      },
    };
  } catch (setupError) {
    await page.evaluate(() => window.__PERF_RUN_VALIDITY__?.stop()).catch(() => {});
    const sessionDetachments: Promise<void>[] = [];
    if (browserSession) sessionDetachments.push(browserSession.detach());
    await Promise.allSettled(sessionDetachments);
    throw setupError;
  }
};

export const aggregatePerfRunValidity = (
  samples: PerfRunValiditySummary[],
): PerfRunValidityMetrics => {
  const firstSample = samples[0];
  const lastSample = samples.at(-1);
  const violations = [...new Set(samples.flatMap((sample) => sample.violations))];
  return {
    aggregate: {
      probeCompleted: samples.length > 0 && samples.every((sample) => sample.probeCompleted),
      startedVisible: firstSample?.startedVisible ?? false,
      endedVisible: lastSample?.endedVisible ?? false,
      startedFocused: firstSample?.startedFocused ?? false,
      endedFocused: lastSample?.endedFocused ?? false,
      visibilityChangeCount: samples.reduce(
        (total, sample) => total + sample.visibilityChangeCount,
        0,
      ),
      focusEventCount: samples.reduce((total, sample) => total + sample.focusEventCount, 0),
      blurEventCount: samples.reduce((total, sample) => total + sample.blurEventCount, 0),
      hiddenDurationMs: roundTo3(
        samples.reduce((total, sample) => total + sample.hiddenDurationMs, 0),
      ),
      unfocusedDurationMs: roundTo3(
        samples.reduce((total, sample) => total + sample.unfocusedDurationMs, 0),
      ),
      devToolsTargetCountAtStart: Math.max(
        0,
        ...samples.map((sample) => sample.devToolsTargetCountAtStart),
      ),
      devToolsTargetCountAtEnd: Math.max(
        0,
        ...samples.map((sample) => sample.devToolsTargetCountAtEnd),
      ),
      frozenLifecycleCount: samples.reduce(
        (total, sample) => total + sample.frozenLifecycleCount,
        0,
      ),
      hiddenLifecycleCount: samples.reduce(
        (total, sample) => total + sample.hiddenLifecycleCount,
        0,
      ),
      occlusionSignal: "document-and-page-lifecycle",
      validForHeadedMeasurement:
        samples.length > 0 && samples.every((sample) => sample.validForHeadedMeasurement),
      violations,
    },
    perSample: samples,
  };
};

export const assertValidHeadedPerfRun = (
  summary: PerfRunValiditySummary,
  scenarioName: string,
): void => {
  if (process.env.PERF_HEADED !== "1" || summary.validForHeadedMeasurement) return;
  throw new Error(
    `[perf] ${scenarioName} is invalid for headed measurement: ${summary.violations.join(", ")}`,
  );
};
