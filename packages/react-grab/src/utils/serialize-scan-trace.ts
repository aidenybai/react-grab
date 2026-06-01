import { VERSION } from "../constants.js";
import type { ScanTrace } from "../types.js";

const roundToHundredths = (value: number): number => Math.round(value * 100) / 100;

// Serializes a render-scan trace into an agent-readable JSON payload. The
// shape mirrors the react-scan/lite + LoAF correlation model: rank components
// by render cost, and pair them with the long-animation-frames captured over
// the same window so an agent can attribute jank to a component and a script.
export const serializeScanTrace = (trace: ScanTrace): string => {
  const payload = {
    tool: "react-grab",
    type: "react-render-scan-trace",
    version: VERSION,
    description:
      "Performance trace captured by React Grab's render scan. `components` ranks " +
      "React components by total render time over the scan; `longAnimationFrames` " +
      "lists frames >50ms with the scripts that blocked them. Correlate a long " +
      "animation frame with the components rendering in the same window to find jank.",
    capturedAt: new Date(trace.startedAtEpochMs).toISOString(),
    scanDurationMs: Math.round(trace.durationMs),
    commitCount: trace.commitCount,
    components: trace.components.map((component) => ({
      name: component.componentName,
      renderCount: component.renderCount,
      totalActualDurationMs: roundToHundredths(component.totalActualDurationMs),
      avgActualDurationMs: roundToHundredths(
        component.totalActualDurationMs / component.renderCount,
      ),
      maxActualDurationMs: roundToHundredths(component.maxActualDurationMs),
      totalSelfDurationMs: roundToHundredths(component.totalSelfDurationMs),
    })),
    longAnimationFrames: trace.longAnimationFrames.map((frame) => ({
      startTimeMs: roundToHundredths(frame.startTimeMs),
      durationMs: roundToHundredths(frame.durationMs),
      blockingDurationMs: roundToHundredths(frame.blockingDurationMs),
      renderStartMs: roundToHundredths(frame.renderStartMs),
      styleAndLayoutStartMs: roundToHundredths(frame.styleAndLayoutStartMs),
      scripts: frame.scripts.map((script) => ({
        invoker: script.invoker,
        invokerType: script.invokerType,
        sourceURL: script.sourceURL,
        sourceFunctionName: script.sourceFunctionName,
        durationMs: roundToHundredths(script.durationMs),
        forcedStyleAndLayoutDurationMs: roundToHundredths(script.forcedStyleAndLayoutDurationMs),
      })),
    })),
  };

  return JSON.stringify(payload, null, 2);
};
