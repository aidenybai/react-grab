#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const PERF_OUTPUT_DIR = resolve(__dirname, "../perf");
const LOG_DIR = resolve(PERF_OUTPUT_DIR, "v8-log");

const E2E_APP_URL = "http://localhost:5175";
const PERF_GRID_PATH = "/?perf=grid&rows=50&cols=10";
const SERVER_READY_TIMEOUT_MS = 60_000;

const PRINT_PREFIX = "[deopt]";
const log = (message) => console.log(`${PRINT_PREFIX} ${message}`);

const DEXNODE_V8_FLAGS = [
  "--log",
  "--log-deopt",
  "--log-ic",
  "--log-maps",
  "--log-maps-details",
  "--log-code",
  "--log-source-code",
  "--prof",
  "--log-internal-timer-events",
  "--detailed-line-info",
  "--no-logfile-per-isolate",
  `--logfile=${resolve(LOG_DIR, "v8.log")}`,
];

const isServerReachable = async () => {
  try {
    const response = await fetch(E2E_APP_URL);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
};

const waitForServer = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReachable()) return true;
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 200));
  }
  return false;
};

const startDevServer = () => {
  log("starting e2e-app dev server ...");
  const child = spawn("pnpm", ["--filter", "@react-grab/e2e-app", "dev"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  child.stdout?.on("data", (chunk) => {
    const text = chunk.toString();
    if (text.includes("error") || text.includes("Local:")) process.stdout.write(`[dev] ${text}`);
  });
  child.stderr?.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));
  return child;
};

const stopDevServer = (child) => {
  if (!child || child.killed) return;
  try {
    child.kill("SIGINT");
  } catch {
    // ignore
  }
};

const driveScenarios = async (page) => {
  log("scenario: hover_sweep (3000 pointermove dispatches)");
  await page.evaluate(
    async ({ sampleCount }) => {
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      if (cells.length === 0) throw new Error("no perf cells found");

      const api = window.__REACT_GRAB__;
      api?.activate();
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));

      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
        const cell = cells[sampleIndex % cells.length];
        const rect = cell.getBoundingClientRect();
        cell.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
      }
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      api?.deactivate();
    },
    { sampleCount: 3000 },
  );

  log("scenario: scroll_invalidation (600 scrolls while frozen on a target)");
  await page.evaluate(
    async ({ scrollCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      const targetCell = cells[Math.floor(cells.length / 2)];
      const targetRect = targetCell.getBoundingClientRect();
      targetCell.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: targetRect.left + targetRect.width / 2,
          clientY: targetRect.top + targetRect.height / 2,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      for (let scrollIndex = 0; scrollIndex < scrollCount; scrollIndex++) {
        window.dispatchEvent(new Event("scroll"));
      }
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      api?.deactivate();
    },
    { scrollCount: 600 },
  );

  log("scenario: get_state_amplification (10000 api.getState calls)");
  await page.evaluate(
    async ({ callCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      api?.getState();
      for (let callIndex = 0; callIndex < callCount; callIndex++) api?.getState();
      api?.deactivate();
    },
    { callCount: 10_000 },
  );

  log("scenario: viewport_burst (300 bursts of 5 scroll+resize)");
  await page.evaluate(
    async ({ burstCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        for (let innerIndex = 0; innerIndex < 5; innerIndex++) {
          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        }
        await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      }
      api?.deactivate();
    },
    { burstCount: 300 },
  );

  log("scenario: multi_freeze_burst (8 shift-clicked cells, 300 bursts)");
  await page.evaluate(() => window.__REACT_GRAB__?.activate?.());
  const cellPositions = await page.evaluate(
    ({ elementsToFreeze }) => {
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      const stride = Math.max(1, Math.floor(cells.length / elementsToFreeze));
      const positions = [];
      for (let cellIndex = 0; cellIndex < elementsToFreeze; cellIndex++) {
        const cell = cells[cellIndex * stride];
        if (!cell) break;
        const rect = cell.getBoundingClientRect();
        positions.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      return positions;
    },
    { elementsToFreeze: 8 },
  );
  await page.keyboard.down("Shift");
  for (const position of cellPositions) {
    await page.mouse.click(position.x, position.y);
    await page.waitForTimeout(30);
  }
  await page.evaluate(
    async ({ burstCount }) => {
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        for (let innerIndex = 0; innerIndex < 5; innerIndex++) {
          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        }
        await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      }
    },
    { burstCount: 300 },
  );
  await page.keyboard.up("Shift");
  await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());
};

const collectV8LogPaths = async () => {
  const allEntries = await readdir(LOG_DIR);
  return allEntries.filter((name) => name.endsWith(".log")).map((name) => resolve(LOG_DIR, name));
};

const main = async () => {
  if (!existsSync(resolve(REPO_ROOT, "packages/react-grab/dist/index.js"))) {
    log("dist missing — run `pnpm --filter react-grab build` first.");
    process.exit(1);
  }

  await rm(LOG_DIR, { recursive: true, force: true });
  await mkdir(LOG_DIR, { recursive: true });

  let serverProcess = null;
  const wasServerAlreadyRunning = await isServerReachable();
  if (!wasServerAlreadyRunning) {
    serverProcess = startDevServer();
    const becameReady = await waitForServer(SERVER_READY_TIMEOUT_MS);
    if (!becameReady) {
      stopDevServer(serverProcess);
      throw new Error("dev server failed to start within timeout");
    }
    log("dev server ready");
  } else {
    log("dev server already running, reusing");
  }

  log("launching chromium with dexnode-equivalent --js-flags ...");
  log(`  flags: ${DEXNODE_V8_FLAGS.join(" ")}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-features=Translate,BackForwardCache",
      "--js-flags=" + DEXNODE_V8_FLAGS.join(","),
    ],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => log(`page error: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") log(`page console error: ${message.text()}`);
    });

    await page.goto(`${E2E_APP_URL}${PERF_GRID_PATH}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__REACT_GRAB__), null, { timeout: 10_000 });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 100,
      null,
      { timeout: 10_000 },
    );

    log("warming up ...");
    await page.evaluate(async () => {
      window.__REACT_GRAB__?.activate?.();
      await new Promise((resolveTimer) => setTimeout(resolveTimer, 50));
      window.__REACT_GRAB__?.deactivate?.();
    });

    await driveScenarios(page);

    log("scenarios complete; closing browser to flush v8.log ...");
    await context.close();
  } finally {
    await browser.close();
    if (serverProcess && !wasServerAlreadyRunning) stopDevServer(serverProcess);
  }

  const logPaths = await collectV8LogPaths();
  log(`v8 log files: ${logPaths.length}`);
  for (const logPath of logPaths) {
    const stat = await readFile(logPath).then((buffer) => buffer.length);
    log(`  ${basename(logPath)} — ${(stat / 1024).toFixed(1)} KiB`);
  }

  await writeFile(
    resolve(LOG_DIR, "manifest.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        chromiumVersion: process.env.CHROMIUM_VERSION ?? null,
        v8Flags: DEXNODE_V8_FLAGS,
        logFiles: logPaths.map((logPath) => basename(logPath)),
      },
      null,
      2,
    ),
  );

  log(`done — logs in ${LOG_DIR}`);
  log(`next: node packages/react-grab/scripts/perf-deopt-analyze.mjs`);
};

main().catch((error) => {
  console.error("[deopt] fatal:", error);
  process.exit(1);
});
