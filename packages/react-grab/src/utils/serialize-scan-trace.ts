import type { ScanFiberChange, ScanTrace } from "../types.js";

const round1 = (value: number): number => Math.round(value * 10) / 10;

const formatChange = (change: ScanFiberChange | null): string => {
  if (!change) return "?";
  if (change.isFirstMount) return "mount";
  const parts: string[] = [];
  if (change.props && change.props.length > 0) parts.push(`props:${change.props.join(",")}`);
  if (change.state) parts.push("state");
  if (change.hooks.length > 0) parts.push(`hooks:${change.hooks.join(",")}`);
  if (change.context) parts.push("context");
  if (change.parent) parts.push("parent");
  return parts.length > 0 ? parts.join(" ") : "?";
};

// Compact, token-efficient log (not JSON) of the trace for pasting to an agent.
export const serializeScanTrace = (trace: ScanTrace): string => {
  const lines: string[] = [];

  lines.push(
    `react-grab render scan: ${(trace.durationMs / 1000).toFixed(1)}s, ` +
      `${trace.commitCount} commits, ${trace.longAnimationFrames.length} long frames (>50ms)`,
  );

  lines.push("");
  lines.push("commits — @start totalMs (rendered); fibers: name selfMs why @source, slowest first:");
  if (trace.commits.length === 0) {
    lines.push("  none");
  } else {
    const commits = trace.commits
      .slice()
      .sort((first, second) => second.totalActualDurationMs - first.totalActualDurationMs);
    for (const commit of commits) {
      lines.push(
        `  @${round1(commit.timestampMs)} ${round1(commit.totalActualDurationMs)}ms` +
          ` (${commit.renderedFiberCount} rendered)`,
      );
      for (const fiber of commit.fibers) {
        const source = fiber.source ? ` @${fiber.source}` : "";
        lines.push(
          `    ${fiber.name} ${round1(fiber.selfDurationMs)}ms ${formatChange(fiber.change)}${source}`,
        );
      }
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
