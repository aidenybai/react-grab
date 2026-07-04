export interface CapturePhaseTimings {
  snapshotMs: number;
  iframesMs: number;
  backdropMs: number;
  buildMs: number;
  inlineMs: number;
  serializeMs: number;
  decodeMs: number;
  rasterMs: number;
  encodeMs: number;
}

export const lastCaptureTimings: CapturePhaseTimings = {
  snapshotMs: 0,
  iframesMs: 0,
  backdropMs: 0,
  buildMs: 0,
  inlineMs: 0,
  serializeMs: 0,
  decodeMs: 0,
  rasterMs: 0,
  encodeMs: 0,
};
