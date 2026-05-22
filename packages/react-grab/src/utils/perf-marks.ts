// React-style profiling-only instrumentation. Calls compile to a single
// `return;` in production/development builds because the bundler replaces
// `process.env.NODE_ENV` with a string literal (see `vite.config.ts`
// `define`), letting V8 inline `if (!IS_PROFILING_BUILD)` as a constant.
// Profiling builds are produced with `NODE_ENV=profiling pnpm build`.
//
// All marks/measures are namespaced with the `rg:` prefix so the bench
// harness (`scripts/perf-bench.mjs`) and DevTools "Performance" panel
// filter input can isolate them from host-page entries.

const IS_PROFILING_BUILD = process.env.NODE_ENV === "profiling";

const PERF_NAMESPACE = "rg:";

export const isReactGrabProfilingBuild = (): boolean => IS_PROFILING_BUILD;

export const markPerf = (markName: string): void => {
  if (!IS_PROFILING_BUILD) return;
  performance.mark(`${PERF_NAMESPACE}${markName}`);
};

export const measureSincePerf = (measureName: string, startMarkName: string): void => {
  if (!IS_PROFILING_BUILD) return;
  // performance.measure throws if the start mark is missing (e.g. when an
  // early-return inside an instrumented function skipped the matching
  // mark()). Instrumentation must never affect production behavior, so we
  // swallow.
  try {
    performance.measure(`${PERF_NAMESPACE}${measureName}`, `${PERF_NAMESPACE}${startMarkName}`);
  } catch {
    return;
  }
};

export const clearReactGrabPerfEntries = (): void => {
  if (!IS_PROFILING_BUILD) return;
  if (typeof performance === "undefined") return;
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch {
    return;
  }
};
