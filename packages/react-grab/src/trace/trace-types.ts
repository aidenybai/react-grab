export type TraceEventKind = "jank" | "longtask" | "long-animation-frame";

export interface TraceScriptAttribution {
  name: string;
  sourceUrl?: string;
  sourceFunctionName?: string;
  durationMs: number;
}

export interface TraceEvent {
  kind: TraceEventKind;
  timestamp: number;
  durationMs: number;
  droppedFrames?: number;
  scripts?: TraceScriptAttribution[];
}

export interface TraceClip {
  events: TraceEvent[];
  durationMs: number;
  capturedAt: number;
  videoBlob: Blob | null;
  keyframes: string[];
}
