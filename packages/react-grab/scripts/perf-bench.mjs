#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const PERF_OUTPUT_DIR = resolve(__dirname, "../perf");

const E2E_APP_URL = "http://localhost:5175";
const PERF_GRID_PATH = "/?perf=grid&rows=50&cols=10";
const SERVER_READY_TIMEOUT_MS = 60_000;

const PRINT_PREFIX = "[perf]";
const log = (message) => console.log(`${PRINT_PREFIX} ${message}`);

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
  log("starting e2e-app dev server (pnpm --filter @react-grab/e2e-app dev) ...");
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

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const summarize = (values) => {
  if (values.length === 0) return { count: 0, total: 0, mean: 0, median: 0, p95: 0, max: 0 };
  const sum = values.reduce((accum, value) => accum + value, 0);
  const sorted = [...values].sort((a, b) => a - b);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    count: values.length,
    total: Number(sum.toFixed(3)),
    mean: Number((sum / values.length).toFixed(3)),
    median: Number(median(values).toFixed(3)),
    p95: Number(sorted[p95Index].toFixed(3)),
    max: Number(Math.max(...values).toFixed(3)),
  };
};

const runScenarios = async (page) => {
  const results = {};

  log("scenario: hover_sweep_pointermove (1500 dispatches, synchronous)");
  results.hoverSweep = await page.evaluate(
    async ({ sampleCount }) => {
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      if (cells.length === 0) throw new Error("no perf cells found");

      const api = window.__REACT_GRAB__;
      api?.activate();
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));

      cells[0].dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: cells[0].getBoundingClientRect().left + 1,
          clientY: cells[0].getBoundingClientRect().top + 1,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));

      const samples = [];
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
        const cell = cells[sampleIndex % cells.length];
        const rect = cell.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const startedAt = performance.now();
        cell.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
        samples.push(performance.now() - startedAt);
      }

      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      api?.deactivate();
      return samples;
    },
    { sampleCount: 1500 },
  );

  log("scenario: scroll_only_invalidation (300 scrolls, synchronous)");
  results.scrollOnly = await page.evaluate(
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

      const samples = [];
      for (let scrollIndex = 0; scrollIndex < scrollCount; scrollIndex++) {
        const startedAt = performance.now();
        window.dispatchEvent(new Event("scroll"));
        samples.push(performance.now() - startedAt);
      }

      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      api?.deactivate();
      return samples;
    },
    { scrollCount: 300 },
  );

  log("scenario: get_state_read_amplification (5000 calls)");
  results.getStateReadAmplification = await page.evaluate(
    async ({ callCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      api?.getState();
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));

      const samples = [];
      for (let callIndex = 0; callIndex < callCount; callIndex++) {
        const startedAt = performance.now();
        api?.getState();
        samples.push(performance.now() - startedAt);
      }

      api?.deactivate();
      return samples;
    },
    { callCount: 5000 },
  );

  log("scenario: viewport_invalidation_burst (100 bursts of 5 scroll+resize)");
  results.viewportInvalidationBurst = await page.evaluate(
    async ({ burstCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();

      const samples = [];
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        const startedAt = performance.now();
        for (let innerIndex = 0; innerIndex < 5; innerIndex++) {
          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        }
        await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
        samples.push(performance.now() - startedAt);
      }

      api?.deactivate();
      return samples;
    },
    { burstCount: 100 },
  );

  log("scenario: multi_freeze_invalidation (8 frozen elements, 100 bursts)");
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
    await page.waitForTimeout(40);
  }
  const frozenCount = await page.evaluate(() =>
    window.__REACT_GRAB__?.getState?.()?.targetElement ? 1 : 0,
  );
  log(`  ${cellPositions.length} cells shift-clicked (post-click hint: ${frozenCount})`);

  results.multiFreezeInvalidationBurst = await page.evaluate(
    async ({ burstCount }) => {
      const samples = [];
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        const startedAt = performance.now();
        for (let innerIndex = 0; innerIndex < 5; innerIndex++) {
          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        }
        await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
        samples.push(performance.now() - startedAt);
      }
      return samples;
    },
    { burstCount: 100 },
  );

  await page.keyboard.up("Shift");
  await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());

  return {
    scenarios: Object.fromEntries(
      Object.entries(results).map(([scenarioName, samples]) => [scenarioName, summarize(samples)]),
    ),
    rawSamples: results,
  };
};

const main = async () => {
  const cliArgs = process.argv.slice(2);
  const labelArg = cliArgs.find((arg) => arg.startsWith("--label="));
  const runLabel = labelArg ? labelArg.slice("--label=".length) : "baseline";

  if (!existsSync(resolve(REPO_ROOT, "packages/react-grab/dist/index.js"))) {
    log("dist missing — running `pnpm --filter react-grab build` first.");
    await new Promise((resolvePromise, rejectPromise) => {
      const buildChild = spawn("pnpm", ["--filter", "react-grab", "build"], {
        cwd: REPO_ROOT,
        stdio: "inherit",
      });
      buildChild.on("exit", (code) =>
        code === 0 ? resolvePromise() : rejectPromise(new Error(`build exited with code ${code}`)),
      );
    });
  }

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

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    page.on("pageerror", (error) => log(`page error: ${error.message}`));

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

    const measurement = await runScenarios(page);

    await mkdir(PERF_OUTPUT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = resolve(PERF_OUTPUT_DIR, `${runLabel}-${timestamp}.json`);
    const summaryReport = {
      label: runLabel,
      timestamp,
      gitSha: process.env.GIT_SHA ?? null,
      gridSize: { rows: 50, columns: 10, total: 500 },
      scenarios: measurement.scenarios,
    };
    await writeFile(outputPath, JSON.stringify(summaryReport, null, 2));
    log(`wrote summary to ${outputPath}`);
    console.log(JSON.stringify(summaryReport.scenarios, null, 2));

    const latestPath = resolve(PERF_OUTPUT_DIR, `${runLabel}-latest.json`);
    await writeFile(latestPath, JSON.stringify(summaryReport, null, 2));
    log(`wrote latest snapshot to ${latestPath}`);

    await browser.close();
  } finally {
    if (serverProcess && !wasServerAlreadyRunning) {
      stopDevServer(serverProcess);
    }
  }
};

main().catch((error) => {
  console.error("[perf] fatal:", error);
  process.exit(1);
});
