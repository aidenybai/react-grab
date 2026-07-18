import { defineConfig, devices, type Project } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { PERF_DEEP_TEST_TIMEOUT_MS, PERF_DEFAULT_TEST_TIMEOUT_MS } from "./e2e/perf-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// COVERAGE wires a sourcemapped/unminified build, the per-test V8 capture
// fixture, and globalSetup/globalTeardown that clear the raw dir and write the
// report. The coverage package (and its build) is only touched on these runs:
// globalSetup/Teardown and the fixture all load it lazily, so normal and perf
// runs never need @react-grab/playwright-coverage to be built.
const isCoverageRun = Boolean(process.env.COVERAGE);

const VITE_PLUS_DEVELOPMENT_DEFAULT_PORT = 5175;
const configuredVitePlusDevelopmentPort = Number(process.env.E2E_VITE_PLUS_DEVELOPMENT_PORT);
const VITE_PLUS_DEVELOPMENT_PORT =
  Number.isInteger(configuredVitePlusDevelopmentPort) && configuredVitePlusDevelopmentPort > 0
    ? configuredVitePlusDevelopmentPort
    : VITE_PLUS_DEVELOPMENT_DEFAULT_PORT;
const VITE_PLUS_DEVELOPMENT_URL = `http://localhost:${VITE_PLUS_DEVELOPMENT_PORT}`;
const NEXT_DEVELOPMENT_URL = "http://localhost:5176";
const NEXT_PRODUCTION_URL = "http://localhost:5177";
const TANSTACK_DEVELOPMENT_URL = "http://localhost:5178";
const TANSTACK_PRODUCTION_URL = "http://localhost:5179";
const VITE_PLUS_PRODUCTION_URL = "http://localhost:5180";
const VITE_UPSTREAM_DEVELOPMENT_URL = "http://localhost:5181";
const VITE_UPSTREAM_PRODUCTION_URL = "http://localhost:5182";

const NEXT_DEVELOPMENT_SPEC_PATTERN = /next-(?!production-).*\.spec\.ts/;
const VITE_PLUS_PRODUCTION_SPEC_PATTERN = /framework-production\.spec\.ts/;
const FRAMEWORK_SPEC_PATTERN = /framework\/.*\.spec\.ts/;
const SOLID_SOURCE_LOCATION_SPEC_PATTERN = /solid-source-location\.spec\.ts/;

// The @perf bench (PERF_LABEL set by test-perf.yml) and coverage runs only
// stimulate the Vite development app. Skip all other framework servers and
// projects so those runs stay isolated from servers they don't use.
const isPerfRun = Boolean(
  process.env.PERF_LABEL ||
  process.env.PERF_TRACE === "1" ||
  process.env.PERF_RENDER_TRACE === "1" ||
  process.env.PERF_DOM_BREAKPOINTS === "1" ||
  process.env.PERF_HEADED === "1" ||
  process.env.PERF_BROWSER_CHANNEL,
);
const isDeepPerfRun =
  process.env.PERF_TRACE === "1" ||
  process.env.PERF_RENDER_TRACE === "1" ||
  process.env.PERF_DOM_BREAKPOINTS === "1";
const shouldRunViteOnly = isPerfRun || isCoverageRun;
const perfBrowserUseOptions = isPerfRun
  ? {
      headless: process.env.PERF_HEADED !== "1",
      channel: process.env.PERF_BROWSER_CHANNEL,
    }
  : {};

const vitePlusDevelopmentProject: Project = {
  name: "vite-plus-development",
  use: {
    ...devices["Desktop Chrome"],
    ...perfBrowserUseOptions,
    baseURL: VITE_PLUS_DEVELOPMENT_URL,
  },
  testIgnore: [
    /touch-mode\.spec\.ts/,
    NEXT_DEVELOPMENT_SPEC_PATTERN,
    VITE_PLUS_PRODUCTION_SPEC_PATTERN,
    FRAMEWORK_SPEC_PATTERN,
  ],
};

const vitePlusTouchProject: Project = {
  name: "vite-plus-touch",
  use: {
    ...devices["Desktop Chrome"],
    hasTouch: true,
    baseURL: VITE_PLUS_DEVELOPMENT_URL,
  },
  testMatch: /touch-mode\.spec\.ts/,
};

const vitePlusProductionProject: Project = {
  name: "vite-plus-production",
  use: { ...devices["Desktop Chrome"], baseURL: VITE_PLUS_PRODUCTION_URL },
  testMatch: [VITE_PLUS_PRODUCTION_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

const viteUpstreamDevelopmentProject: Project = {
  name: "vite-upstream-development",
  use: { ...devices["Desktop Chrome"], baseURL: VITE_UPSTREAM_DEVELOPMENT_URL },
  testMatch: [FRAMEWORK_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

const viteUpstreamProductionProject: Project = {
  name: "vite-upstream-production",
  use: { ...devices["Desktop Chrome"], baseURL: VITE_UPSTREAM_PRODUCTION_URL },
  testMatch: [FRAMEWORK_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

const nextDevelopmentProject: Project = {
  name: "next-development",
  use: { ...devices["Desktop Chrome"], baseURL: NEXT_DEVELOPMENT_URL },
  testMatch: [
    NEXT_DEVELOPMENT_SPEC_PATTERN,
    FRAMEWORK_SPEC_PATTERN,
    SOLID_SOURCE_LOCATION_SPEC_PATTERN,
  ],
};

const nextProductionProject: Project = {
  name: "next-production",
  use: { ...devices["Desktop Chrome"], baseURL: NEXT_PRODUCTION_URL },
  testMatch: [FRAMEWORK_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

const tanstackDevelopmentProject: Project = {
  name: "tanstack-development",
  fullyParallel: false,
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: TANSTACK_DEVELOPMENT_URL },
  testMatch: [FRAMEWORK_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

const tanstackProductionProject: Project = {
  name: "tanstack-production",
  fullyParallel: false,
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: TANSTACK_PRODUCTION_URL },
  testMatch: [FRAMEWORK_SPEC_PATTERN, SOLID_SOURCE_LOCATION_SPEC_PATTERN],
};

// Under COVERAGE the dist must carry source maps (and stay unminified) so V8
// byte ranges remap cleanly back onto src/*.ts(x).
const reactGrabProductionBuildCommand = isCoverageRun
  ? "pnpm --filter react-grab build:coverage"
  : "pnpm --filter react-grab build";
const reactGrabDevelopmentBuildCommand = isCoverageRun
  ? "pnpm --filter react-grab build:e2e-development:coverage"
  : "pnpm --filter react-grab build:e2e-development";

const requestedEnvironment = shouldRunViteOnly
  ? "vite-plus-development"
  : process.env.E2E_ENVIRONMENT;
const withRequestedEnvironmentBuild = (command: string): string =>
  requestedEnvironment ? `${reactGrabProductionBuildCommand} && ${command}` : command;

const vitePlusDevelopmentWebServer = {
  command: `${reactGrabDevelopmentBuildCommand} && pnpm dev --port ${VITE_PLUS_DEVELOPMENT_PORT}`,
  url: VITE_PLUS_DEVELOPMENT_URL,
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite"),
  timeout: 60_000,
};

const vitePlusProductionWebServer = {
  command: withRequestedEnvironmentBuild("pnpm build && pnpm start:production-test"),
  url: VITE_PLUS_PRODUCTION_URL,
  reuseExistingServer: false,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite"),
  timeout: 120_000,
};

const viteUpstreamDevelopmentWebServer = {
  command: requestedEnvironment ? `${reactGrabDevelopmentBuildCommand} && pnpm dev` : "pnpm dev",
  url: VITE_UPSTREAM_DEVELOPMENT_URL,
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite-upstream"),
  timeout: 60_000,
};

const viteUpstreamProductionWebServer = {
  command: withRequestedEnvironmentBuild("pnpm build && pnpm start:production-test"),
  url: VITE_UPSTREAM_PRODUCTION_URL,
  reuseExistingServer: false,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-vite-upstream"),
  timeout: 120_000,
};

const nextDevelopmentWebServer = {
  command: requestedEnvironment ? `${reactGrabDevelopmentBuildCommand} && pnpm dev` : "pnpm dev",
  url: NEXT_DEVELOPMENT_URL,
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-next"),
  timeout: 120_000,
};

const nextProductionWebServer = {
  command: withRequestedEnvironmentBuild(
    "pnpm build:production-test && NEXT_DIST_DIR=.next-production pnpm start:production-test",
  ),
  url: NEXT_PRODUCTION_URL,
  reuseExistingServer: false,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-next"),
  timeout: 180_000,
};

const tanstackDevelopmentWebServer = {
  command: requestedEnvironment ? `${reactGrabDevelopmentBuildCommand} && pnpm dev` : "pnpm dev",
  url: TANSTACK_DEVELOPMENT_URL,
  reuseExistingServer: !process.env.CI && !isCoverageRun,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-tanstack-start"),
  timeout: 120_000,
};

const tanstackProductionWebServer = {
  command: withRequestedEnvironmentBuild("pnpm build && pnpm start:production-test"),
  url: TANSTACK_PRODUCTION_URL,
  reuseExistingServer: false,
  cwd: path.resolve(__dirname, "../../apps/e2e-app-tanstack-start"),
  timeout: 180_000,
};

const allProjects = [
  vitePlusDevelopmentProject,
  vitePlusTouchProject,
  vitePlusProductionProject,
  viteUpstreamDevelopmentProject,
  viteUpstreamProductionProject,
  nextDevelopmentProject,
  nextProductionProject,
  tanstackDevelopmentProject,
  tanstackProductionProject,
];

const allWebServers = [
  vitePlusDevelopmentWebServer,
  vitePlusProductionWebServer,
  viteUpstreamDevelopmentWebServer,
  viteUpstreamProductionWebServer,
  nextDevelopmentWebServer,
  nextProductionWebServer,
  tanstackDevelopmentWebServer,
  tanstackProductionWebServer,
];

const getRequestedEnvironmentConfig = (environmentName: string) => {
  switch (environmentName) {
    case "vite-plus-development":
      return {
        projects: [vitePlusDevelopmentProject, vitePlusTouchProject],
        webServers: [vitePlusDevelopmentWebServer],
      };
    case "vite-plus-production":
      return {
        projects: [vitePlusProductionProject],
        webServers: [vitePlusProductionWebServer],
      };
    case "vite-upstream-development":
      return {
        projects: [viteUpstreamDevelopmentProject],
        webServers: [viteUpstreamDevelopmentWebServer],
      };
    case "vite-upstream-production":
      return {
        projects: [viteUpstreamProductionProject],
        webServers: [viteUpstreamProductionWebServer],
      };
    case "next-development":
      return {
        projects: [nextDevelopmentProject],
        webServers: [nextDevelopmentWebServer],
      };
    case "next-production":
      return {
        projects: [nextProductionProject],
        webServers: [nextProductionWebServer],
      };
    case "tanstack-development":
      return {
        projects: [tanstackDevelopmentProject],
        webServers: [tanstackDevelopmentWebServer],
      };
    case "tanstack-production":
      return {
        projects: [tanstackProductionProject],
        webServers: [tanstackProductionWebServer],
      };
    default:
      throw new Error(`Unknown E2E_ENVIRONMENT: ${environmentName}`);
  }
};

const environmentConfig = requestedEnvironment
  ? getRequestedEnvironmentConfig(requestedEnvironment)
  : { projects: allProjects, webServers: allWebServers };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  // Deep profiler, render-trace, and DOM-breakpoint replays add extra passes.
  // The V8 sampler can sporadically wedge the headless renderer for minutes
  // (see perf-recorder.ts), so these modes receive enough headroom to recover.
  timeout: isDeepPerfRun ? PERF_DEEP_TEST_TIMEOUT_MS : PERF_DEFAULT_TEST_TIMEOUT_MS,
  reporter: "html",
  use: {
    trace: process.env.PERF_RENDER_TRACE === "1" ? "off" : "on-first-retry",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  globalSetup: isCoverageRun ? path.resolve(__dirname, "e2e/coverage-setup.ts") : undefined,
  globalTeardown: isCoverageRun ? path.resolve(__dirname, "e2e/coverage-teardown.ts") : undefined,
  projects: environmentConfig.projects,
  webServer: environmentConfig.webServers,
});
