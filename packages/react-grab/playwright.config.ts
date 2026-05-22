import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When PERF=1 we ask the dev server to use the profiling (unminified +
// sourcemaps) build of react-grab so Chrome perf traces show readable
// function names instead of minified `B`/`na`/etc. Production build is
// fine for INP/LoAF/Long Tasks (browser-native, name-agnostic), but
// pairing PERF=1 with PERF_TRACE=1 is what makes the dumped trace useful.
const reactGrabBuildScript = process.env.PERF === "1" ? "build:profiling" : "build";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/touch-mode\.spec\.ts/, /perf-bench\.spec\.ts/],
    },
    {
      name: "chromium-touch",
      use: {
        ...devices["Desktop Chrome"],
        hasTouch: true,
      },
      testMatch: /touch-mode\.spec\.ts/,
    },
    {
      name: "perf",
      use: {
        ...devices["Desktop Chrome"],
        // Trace adds non-trivial overhead; we capture our own metrics so
        // the playwright trace just gets in the way.
        trace: "off",
        video: "off",
      },
      testMatch: /perf-bench\.spec\.ts/,
      // Perf scenarios are CPU-heavy and concurrent runs would skew the
      // measurements; pin to one worker and let them run serially.
      fullyParallel: false,
      retries: 0,
      timeout: 120_000,
    },
  ],
  webServer: {
    command: `pnpm --filter react-grab ${reactGrabBuildScript} && pnpm dev`,
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI && process.env.PERF !== "1",
    cwd: path.resolve(__dirname, "../../apps/e2e-app"),
    timeout: 60_000,
  },
});
