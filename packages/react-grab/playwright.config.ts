import { defineConfig, devices, type Project } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// COVERAGE wires a sourcemapped/unminified build, the per-test V8 capture
// fixture, and globalSetup/globalTeardown that clear the raw dir and write the
// report. The coverage package (and its build) is only touched on these runs:
// globalSetup/Teardown and the fixture all load it lazily, so normal and perf
// runs never need @react-grab/playwright-coverage to be built.
const isCoverageRun = Boolean(process.env.COVERAGE);

const VITE_URL = "http://localhost:5175";
const NEXT_URL = "http://localhost:5176";

// Specs targeting the Next runtime (server-frame symbolication, blocking
// requests). They run only under chromium-next.
const NEXT_SPEC_PATTERN = /next-.*\.spec\.ts/;
// Smoke specs that must hold on both frameworks; they run under both projects.
const CROSS_FRAMEWORK_PATTERN = /\.both\.spec\.ts/;

// The @perf bench (PERF_LABEL set by test-perf.yml) and coverage runs only
// stimulate the Vite app. Skip the Next dev server and project there so those
// runs stay Vite-only and never block on a second dev server they don't use.
const isPerfRun = Boolean(process.env.PERF_LABEL);
const shouldRunViteOnly = isPerfRun || isCoverageRun;

const viteProjects: Project[] = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], baseURL: VITE_URL },
    testIgnore: [/touch-mode\.spec\.ts/, NEXT_SPEC_PATTERN],
  },
  {
    name: "chromium-touch",
    use: { ...devices["Desktop Chrome"], hasTouch: true, baseURL: VITE_URL },
    testMatch: /touch-mode\.spec\.ts/,
  },
];

const nextProject: Project = {
  name: "chromium-next",
  use: { ...devices["Desktop Chrome"], baseURL: NEXT_URL },
  testMatch: [NEXT_SPEC_PATTERN, CROSS_FRAMEWORK_PATTERN],
};

// Under COVERAGE the dist must carry source maps (and stay unminified) so V8
// byte ranges remap cleanly back onto src/*.ts(x).
const reactGrabBuildCommand = isCoverageRun
  ? "pnpm --filter react-grab build:coverage"
  : "pnpm --filter react-grab build";

const viteWebServer = {
  // Builds react-grab so the dev server picks up whichever src is checked out
  // (the perf workflow swaps it to the base ref). react-grab's build does not
  // clean dist, so the Next server reading it concurrently is safe.
  command: `${reactGrabBuildCommand} && pnpm dev`,
  url: VITE_URL,
  // Under COVERAGE never reuse a running server: it may serve a minified dist
  // with no sibling .map, which silently yields empty/misleading coverage.
  // Forcing a fresh start guarantees the sourcemapped build:coverage runs.
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite"),
  timeout: 60_000,
};

const nextWebServer = {
  command: "pnpm dev",
  url: NEXT_URL,
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-next"),
  timeout: 120_000,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  // Traced runs (PERF_TRACE=1) add a profiled extra pass per scenario, and the
  // V8 sampler can sporadically wedge the headless renderer for minutes (see
  // perf-recorder.ts); the extra headroom lets the wedge clear instead of
  // failing the run.
  timeout: process.env.PERF_TRACE === "1" ? 360_000 : 60_000,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  globalSetup: isCoverageRun ? path.resolve(__dirname, "e2e/coverage-setup.ts") : undefined,
  globalTeardown: isCoverageRun ? path.resolve(__dirname, "e2e/coverage-teardown.ts") : undefined,
  projects: shouldRunViteOnly ? viteProjects : [...viteProjects, nextProject],
  webServer: shouldRunViteOnly ? [viteWebServer] : [viteWebServer, nextWebServer],
});
