import { defineConfig, devices } from "@playwright/test";
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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  reporter: "html",
  // Build react-grab's dist once before either dev server serves a page, so
  // neither turbopack nor vite imports a half-written bundle on its readiness
  // probe. Both webServers below only run their dev command.
  globalSetup: "./e2e/global-setup.ts",
  use: {
    trace: "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
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
    {
      name: "chromium-next",
      use: { ...devices["Desktop Chrome"], baseURL: NEXT_URL },
      testMatch: [NEXT_SPEC_PATTERN, CROSS_FRAMEWORK_PATTERN],
    },
  ],
  webServer: [
    {
      command: "pnpm dev",
      url: VITE_URL,
      reuseExistingServer: !process.env.CI,
      cwd: path.resolve(__dirname, "../../apps/e2e-app-vite"),
      timeout: 30_000,
    },
    {
      command: "pnpm dev",
      url: NEXT_URL,
      reuseExistingServer: !process.env.CI,
      cwd: path.resolve(__dirname, "../../apps/e2e-app-next"),
      timeout: 60_000,
    },
  ],
});
