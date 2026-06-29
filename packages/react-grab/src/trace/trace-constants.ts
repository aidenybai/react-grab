export const CLIP_DURATION_MS = 12000;
export const RECORDER_TIMESLICE_MS = 250;
export const RECORDER_MIME_CANDIDATES: readonly string[] = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export const TARGET_FRAME_BUDGET_MS = 1000 / 60;
// A frame must overshoot the budget by this factor before it counts as jank, so
// ordinary scheduling jitter on a healthy 60fps page doesn't spam the buffer.
export const JANK_FRAME_THRESHOLD_MS = TARGET_FRAME_BUDGET_MS * 2;
export const LONG_TASK_THRESHOLD_MS = 50;

export const EVENT_BUFFER_WINDOW_MS = CLIP_DURATION_MS + 2000;
export const KEYFRAME_COUNT = 4;
export const KEYFRAME_MAX_WIDTH_PX = 960;
export const KEYFRAME_JPEG_QUALITY = 0.7;
