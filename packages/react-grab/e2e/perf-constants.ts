export const PERF_REPORT_SCHEMA_VERSION = 4;
export const PERF_PLAYWRIGHT_SUITE_MODE =
  process.env.PERF_SHARDABLE === "1" ? "parallel" : "serial";
export const PERF_PROCESS_CPU_SAMPLE_INTERVAL_MS = 100;
export const PERF_ANIMATION_COUNTERFACTUAL_REPETITIONS = 3;
export const PERF_ANIMATION_CONTROL_SAMPLE_MS = 2_000;
export const PERF_ANIMATION_CONTROL_WARMUP_MS = 250;
export const PERF_ANIMATION_PRODUCTION_INDICATOR_COUNT = 24;
export const PERF_ANIMATION_SINGLE_INDICATOR_COUNT = 1;
export const PERF_ANIMATION_FINITE_ACTIVE_MS = 200;
export const PERF_ANIMATION_FINITE_HOLD_MS = 800;
export const PERF_ANIMATION_INDICATOR_SIZE_PX = 12;
export const PERF_ANIMATION_INDICATOR_GAP_PX = 8;
export const PERF_ANIMATION_INDICATOR_OFFSET_PX = 16;
export const PERF_ANIMATION_LOW_OPACITY = 0.35;
export const PERF_ANIMATION_HIGH_OPACITY = 1;
// Five isolated trace finalizations can each consume the full trace deadline
// after the paired CPU controls have already run.
export const PERF_ANIMATION_CONTROL_TEST_TIMEOUT_MS = 480_000;
export const PERF_DEFAULT_TEST_TIMEOUT_MS = 60_000;
export const PERF_DEEP_TEST_TIMEOUT_MS = 360_000;
export const PERF_COPY_COMPLETION_TIMEOUT_MS = 5_000;
export const PERF_CPU_PROFILE_SAMPLING_INTERVAL_US = 1_000;
export const PERF_CPU_PROFILE_CAPTURE_DEADLINE_MS = 60_000;
export const PERF_CPU_PROFILE_STOP_DEADLINE_MS = 10_000;
export const PERF_ANIMATION_LIFECYCLE_SAMPLE_INTERVAL_MS = 50;
export const PERF_DOM_BREAKPOINT_HIT_LIMIT = 40;
export const PERF_DOM_BREAKPOINT_FRAME_LIMIT = 64;
export const PERF_DOM_BREAKPOINT_SINK_FRAME_LIMIT = 8;
export const PERF_DOM_BREAKPOINT_ASYNC_STACK_DEPTH = 8;
export const PERF_DOM_BREAKPOINT_SOURCE_SNIPPET_LIMIT = 240;
export const PERF_TRACE_DEADLINE_MS = 60_000;
export const PERF_TRACE_BUFFER_SIZE_KB = 1_200_000;
export const PERF_TRACE_EVENT_LIMIT = 40;
export const PERF_SELECTOR_STATS_LIMIT = 30;
export const PERF_PAINT_DISPLAY_ITEM_LIMIT = 30;
export const PERF_PAINT_PROFILE_LAYER_LIMIT = 3;
export const PERF_PAINT_PROFILE_COMMAND_LIMIT = 20;
export const PERF_PAINT_PROFILE_MIN_REPEAT_COUNT = 5;
export const PERF_PAINT_PROFILE_MIN_DURATION_SECONDS = 1;
export const PERF_CSS_RULE_TEXT_LIMIT = 500;
export const PERF_MUTATION_TARGET_LIMIT = 20;
export const PERF_ANIMATION_INVENTORY_LIMIT = 100;
export const PERF_COMPOSITED_LAYER_LIMIT = 20;
export const PERF_COMPOSITING_EVENT_SETTLE_MS = 50;
export const PERF_COMPOSITING_REFRESH_TIMEOUT_MS = 1_000;
export const PERF_HARDWARE_GPU_SAMPLE_INTERVAL_MS = 100;
export const PERF_HARDWARE_GPU_STOP_DEADLINE_MS = 5_000;
export const PERF_NANOSECONDS_PER_MILLISECOND = 1_000_000;
export const PERF_MICROSECONDS_PER_MILLISECOND = 1_000;
export const PERF_MICROSECONDS_PER_SECOND = 1_000_000;
export const PERF_MILLISECONDS_PER_SECOND = 1_000;
export const PERF_MILLIWATTS_PER_WATT = 1_000;
export const PERF_PERCENT_SCALE = 100;
export const PERF_P95_PERCENTILE = 0.95;
export const PERF_ROUND_DECIMAL_PLACES = 3;

export const PERF_TRACE_MARKER_START = "react-grab-perf-scenario-start";
export const PERF_TRACE_MARKER_END = "react-grab-perf-scenario-end";

export const PERF_RENDER_TRACE_CATEGORIES = [
  "benchmark",
  "blink",
  "blink.user_timing",
  "cc",
  "devtools.timeline",
  "disabled-by-default-blink.debug",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "disabled-by-default-devtools.timeline.invalidationTracking",
  "disabled-by-default-devtools.timeline.layers",
  "disabled-by-default-devtools.timeline.picture",
  "disabled-by-default-devtools.timeline.stack",
  "disabled-by-default-blink.graphics_context_annotations",
  "gpu",
  "renderer.scheduler",
  "toplevel",
  "viz",
];
