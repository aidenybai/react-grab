import type { TraceClip, TraceEvent } from "./trace-types.js";

const formatOffset = (timestamp: number, clipStart: number): string => {
  const offsetSeconds = Math.max(0, (timestamp - clipStart) / 1000);
  return `${offsetSeconds.toFixed(2)}s`;
};

const describeEvent = (event: TraceEvent, clipStart: number): string => {
  const at = formatOffset(event.timestamp, clipStart);
  if (event.kind === "jank") {
    return `- [${at}] dropped ${event.droppedFrames ?? 0} frame(s) — ${event.durationMs.toFixed(0)}ms stall`;
  }
  if (event.kind === "longtask") {
    return `- [${at}] long task blocked the main thread for ${event.durationMs.toFixed(0)}ms`;
  }
  const scriptLines = (event.scripts ?? [])
    .filter((script) => script.durationMs > 0)
    .map((script) => {
      const where = script.sourceUrl
        ? `${script.sourceUrl}${script.sourceFunctionName ? ` (${script.sourceFunctionName})` : ""}`
        : script.name;
      return `    • ${script.durationMs.toFixed(0)}ms in ${where}`;
    });
  const header = `- [${at}] long animation frame: ${event.durationMs.toFixed(0)}ms`;
  return scriptLines.length > 0 ? `${header}\n${scriptLines.join("\n")}` : header;
};

const summarize = (events: TraceEvent[]): string => {
  const droppedFrames = events
    .filter((event) => event.kind === "jank")
    .reduce((total, event) => total + (event.droppedFrames ?? 0), 0);
  const longTasks = events.filter((event) => event.kind === "longtask").length;
  const longAnimationFrames = events.filter(
    (event) => event.kind === "long-animation-frame",
  ).length;
  return `${droppedFrames} dropped frames, ${longTasks} long task(s), ${longAnimationFrames} long animation frame(s)`;
};

export const formatTraceClip = (clip: TraceClip): string => {
  const clipStart = clip.capturedAt - clip.durationMs;
  const sortedEvents = [...clip.events].sort((a, b) => a.timestamp - b.timestamp);

  const lines = [
    `[react-grab performance trace — last ${(clip.durationMs / 1000).toFixed(1)}s]`,
    `Summary: ${summarize(sortedEvents)}`,
    "",
    "Timeline:",
    ...(sortedEvents.length > 0
      ? sortedEvents.map((event) => describeEvent(event, clipStart))
      : ["- (no jank, long tasks, or long animation frames detected)"]),
  ];

  if (clip.keyframes.length > 0) {
    lines.push("", `Keyframes: ${clip.keyframes.length} attached (see exported files).`);
  }

  return lines.join("\n");
};
