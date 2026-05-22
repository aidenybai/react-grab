// React-style profiling instrumentation. The `define` in vite.config.ts
// replaces `process.env.NODE_ENV` with a string literal, so production
// builds collapse to `if (true) return;` and minify to a no-op. Verified
// with `pnpm build`: production dist contains 0 `performance.mark` calls.
// Opt in via `pnpm build:profiling`.

const IS_PROFILING_BUILD = process.env.NODE_ENV === "profiling";

export const markPerf = (markName: string): void => {
  if (!IS_PROFILING_BUILD) return;
  performance.mark(`rg:${markName}`);
};

export const measureSincePerf = (measureName: string, startMarkName: string): void => {
  if (!IS_PROFILING_BUILD) return;
  try {
    performance.measure(`rg:${measureName}`, `rg:${startMarkName}`);
  } catch {
    return;
  }
};
