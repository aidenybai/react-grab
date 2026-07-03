import { defineConfig } from "@playwright/test";
import type { PlaywrightTestOptions, PlaywrightWorkerOptions } from "@playwright/test";
import { BENCH_TEST_TIMEOUT_MS } from "./bench/constants";
import {
  DEVICE_SCALE_FACTOR,
  FIXTURE_SERVER_ORIGIN,
  FIXTURE_SERVER_PORT,
  VIEWPORT_HEIGHT_PX,
  VIEWPORT_WIDTH_PX,
} from "./e2e/constants";

const chromiumDeterminismUse: Partial<PlaywrightWorkerOptions & PlaywrightTestOptions> = {
  browserName: "chromium",
  viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX },
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
  contextOptions: {
    reducedMotion: "reduce",
  },
  launchOptions: {
    args: [
      `--force-device-scale-factor=${DEVICE_SCALE_FACTOR}`,
      "--hide-scrollbars",
      "--disable-lcd-text",
      "--font-render-hinting=none",
    ],
  },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FIXTURE_SERVER_ORIGIN,
  },
  projects: [
    {
      name: "chromium-fidelity",
      testDir: "e2e",
      use: chromiumDeterminismUse,
    },
    {
      name: "webkit-fidelity",
      testDir: "e2e",
      use: {
        browserName: "webkit",
        viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX },
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
        contextOptions: { reducedMotion: "reduce" },
      },
    },
    {
      name: "firefox-fidelity",
      testDir: "e2e",
      use: {
        browserName: "firefox",
        viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX },
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
        contextOptions: { reducedMotion: "reduce" },
      },
    },
    {
      name: "chromium-bench",
      testDir: "bench",
      timeout: BENCH_TEST_TIMEOUT_MS,
      use: chromiumDeterminismUse,
    },
  ],
  webServer: {
    command: "node scripts/serve-fixtures.mjs",
    env: { PORT: String(FIXTURE_SERVER_PORT) },
    port: FIXTURE_SERVER_PORT,
    reuseExistingServer: !process.env.CI,
  },
});
