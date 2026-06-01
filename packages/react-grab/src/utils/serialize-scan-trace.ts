import type { ScanTrace } from "../types.js";

const round1 = (value: number): number => Math.round(value * 10) / 10;

// Renders a render-scan trace as a compact, token-efficient log (not JSON) for
// pasting to a coding agent. Columns are positional with terse labels and a
// per-section legend, mirroring the react-scan/lite + LoAF correlation model:
// rank components by render cost, then list the long-animation-frames so an
// agent can attribute jank to a component and the script that blocked the frame.
export const serializeScanTrace = (trace: ScanTrace): string => {
  const lines: string[] = [];

  lines.push(
    `react-grab render scan: ${(trace.durationMs / 1000).toFixed(1)}s, ` +
      `${trace.commitCount} commits, ${trace.components.length} components, ` +
      `${trace.longAnimationFrames.length} long frames (>50ms)`,
  );

  lines.push("");
  lines.push("components — name total ×renders avg max self (render ms), worst first:");
  if (trace.components.length === 0) {
    lines.push("  none");
  } else {
    for (const component of trace.components) {
      lines.push(
        `  ${component.componentName} ${round1(component.totalActualDurationMs)}` +
          ` ×${component.renderCount}` +
          ` avg${round1(component.totalActualDurationMs / component.renderCount)}` +
          ` max${round1(component.maxActualDurationMs)}` +
          ` self${round1(component.totalSelfDurationMs)}`,
      );
    }
  }

  lines.push("");
  lines.push(
    "long animation frames — @start dur block (ms); scripts url:fn@char dur reflow:",
  );
  if (trace.longAnimationFrames.length === 0) {
    lines.push("  none");
  } else {
    for (const frame of trace.longAnimationFrames) {
      const uiWait =
        frame.firstUIEventTimestampMs > 0
          ? ` ui+${round1(frame.firstUIEventTimestampMs - frame.startTimeMs)}`
          : "";
      lines.push(
        `  @${round1(frame.startTimeMs)} dur${round1(frame.durationMs)}` +
          ` block${round1(frame.blockingDurationMs)}${uiWait}`,
      );
      for (const script of frame.scripts) {
        const reflow =
          script.forcedStyleAndLayoutDurationMs > 0
            ? ` reflow${round1(script.forcedStyleAndLayoutDurationMs)}`
            : "";
        const url = script.sourceURL || "(inline)";
        const fn = script.sourceFunctionName || "(anonymous)";
        lines.push(`    ${url}:${fn}@${script.sourceCharPosition} ${round1(script.durationMs)}ms${reflow}`);
      }
    }
  }

  return lines.join("\n");
};
