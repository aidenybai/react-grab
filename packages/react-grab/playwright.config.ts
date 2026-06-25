import { defineConfig, devices, type Project } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_URL = "http://localhost:5175";
const NEXT_URL = "http://localhost:5176";

// Specs targeting the Next runtime (server-frame symbolication, blocking
// requests). They run only under chromium-next.
const NEXT_SPEC_PATTERN = /next-.*\.spec\.ts/;
// Smoke specs that must hold on both frameworks; they run under both projects.
const CROSS_FRAMEWORK_PATTERN = /\.both\.spec\.ts/;

// The @perf bench (PERF_LABEL set by test-perf.yml) only stimulates the Vite
// app, and that workflow has no separate build step. Skip the Next dev server
// and project there so the run stays Vite-only and never blocks on a second
// dev server it doesn't use.
const isPerfRun = Boolean(process.env.PERF_LABEL);

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
const reactGrabBuildCommand = process.env.COVERAGE
  ? "pnpm --filter react-grab build:coverage"
  : "pnpm --filter react-grab build";

const viteWebServer = {
  // Builds react-grab so the dev server picks up whichever src is checked out
  // (the perf workflow swaps it to the base ref). react-grab's build does not
  // clean dist, so the Next server reading it concurrently is safe.
  command: `${reactGrabBuildCommand} && pnpm dev`,
  url: VITE_URL,
  reuseExistingServer: !process.env.CI,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite"),
  timeout: 60_000,
};

const nextWebServer = {
  command: "pnpm dev",
  url: NEXT_URL,
  reuseExistingServer: !process.env.CI,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-next"),
  timeout: 120_000,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: isPerfRun ? viteProjects : [...viteProjects, nextProject],
  webServer: isPerfRun ? [viteWebServer] : [viteWebServer, nextWebServer],
});
