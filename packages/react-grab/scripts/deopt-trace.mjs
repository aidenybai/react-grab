#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import net from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(__dirname, "../../..");
const OUTPUT_DIR = resolve(PACKAGE_ROOT, "perf");

const E2E_APP_URL = process.env.DEOPT_TRACE_E2E_URL || "http://localhost:5175";
const PERF_GRID_PATH = process.env.DEOPT_TRACE_PAGE_PATH || "/?perf=grid&rows=50&cols=10";
const SERVER_READY_TIMEOUT_MS = Number(process.env.DEOPT_TRACE_SERVER_TIMEOUT_MS) || 60_000;
const CDP_READY_TIMEOUT_MS = Number(process.env.DEOPT_TRACE_CDP_TIMEOUT_MS) || 20_000;
const E2E_APP_FILTER = process.env.DEOPT_TRACE_E2E_FILTER || "@react-grab/e2e-app-vite";
const DIST_ENTRY = resolve(PACKAGE_ROOT, "dist/index.js");

const resolveChromeBinary = () => {
  if (process.env.CHROME_BINARY) return process.env.CHROME_BINARY;
  try {
    return chromium.executablePath();
  } catch {
    return null;
  }
};

const PRINT_PREFIX = "[deopt]";
const log = (message) => console.log(`${PRINT_PREFIX} ${message}`);

const isServerReachable = async (url) => {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
};

const waitForServer = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReachable(url)) return true;
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 200));
  }
  return false;
};

const startDevServer = () => {
  log(`starting e2e-app-vite dev server (pnpm --filter ${E2E_APP_FILTER} dev) ...`);
  const child = spawn("pnpm", ["--filter", E2E_APP_FILTER, "dev"], {
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
  } catch {}
};

const findFreePort = () =>
  new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();
    server.unref();
    server.on("error", rejectPromise);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePromise(port));
    });
  });

const waitForUrlReady = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 100));
  }
  return false;
};

const launchChromeWithDeoptTrace = async () => {
  const chromeBinary = resolveChromeBinary();
  if (!chromeBinary || !existsSync(chromeBinary)) {
    throw new Error(
      `chromium binary not found (resolved: ${chromeBinary ?? "<unset>"}); set CHROME_BINARY or run \`npx playwright install chromium\``,
    );
  }
  const port = await findFreePort();
  const userDataDir = resolve(
    process.env.DEOPT_TRACE_PROFILE_DIR || (process.env.TMPDIR ?? "/tmp"),
    `deopt-trace-profile-${Date.now()}`,
  );
  const jsFlags = ["--trace-deopt", "--trace-deopt-verbose", "--log-deopt", "--code-comments"].join(
    " ",
  );
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    `--js-flags=${jsFlags}`,
    "about:blank",
  ];
  log(`launching ${chromeBinary} with js-flags: ${jsFlags}`);
  const child = spawn(chromeBinary, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  const stderrChunks = [];
  child.stderr?.on("data", (chunk) => {
    stderrChunks.push(chunk.toString());
  });
  child.stdout?.on("data", (chunk) => {
    stderrChunks.push(chunk.toString());
  });

  child.on("exit", (code, signal) => log(`chrome process exited: code=${code} signal=${signal}`));
  const cdpUrl = `http://127.0.0.1:${port}/json/version`;
  const ready = await waitForUrlReady(cdpUrl, CDP_READY_TIMEOUT_MS);
  if (!ready) {
    log("--- chrome stderr ---");
    process.stderr.write(stderrChunks.join(""));
    log("--- end chrome stderr ---");
    try {
      child.kill("SIGKILL");
    } catch {}
    throw new Error("chrome CDP endpoint not reachable in time");
  }
  log(`chrome ready on port ${port}`);
  return {
    child,
    port,
    getStderr: () => stderrChunks.join(""),
  };
};

const runScenarios = async (page) => {
  log("warming up reactivity ...");
  await page.evaluate(async () => {
    window.__REACT_GRAB__?.activate?.();
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 50));
    window.__REACT_GRAB__?.deactivate?.();
  });

  log("scenario: hover sweep (1500 pointermove events)");
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
    { sampleCount: 1500 },
  );

  log("scenario: scroll-only invalidation (300 scrolls)");
  await page.evaluate(
    async ({ scrollCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      const target = cells[Math.floor(cells.length / 2)];
      const rect = target.getBoundingClientRect();
      target.dispatchEvent(
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
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      for (let scrollIndex = 0; scrollIndex < scrollCount; scrollIndex++) {
        window.dispatchEvent(new Event("scroll"));
      }
      await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      api?.deactivate();
    },
    { scrollCount: 300 },
  );

  log("scenario: viewport invalidation burst (100 bursts of 5 scroll+resize)");
  await page.evaluate(
    async ({ burstCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
        for (let inner = 0; inner < 5; inner++) {
          window.dispatchEvent(new Event("scroll"));
          window.dispatchEvent(new Event("resize"));
        }
        await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer()));
      }
      api?.deactivate();
    },
    { burstCount: 100 },
  );

  log("scenario: freeze/unfreeze cycles (200 toggles via shift-click + escape)");
  await page.evaluate(
    async ({ cycleCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      if (cells.length === 0) return;

      const dispatchPointer = (target, type, options = {}) => {
        const rect = target.getBoundingClientRect();
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            shiftKey: false,
            button: 0,
            ...options,
          }),
        );
      };

      for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++) {
        const cell = cells[cycleIndex % cells.length];
        dispatchPointer(cell, "pointermove");
        dispatchPointer(cell, "pointerdown");
        dispatchPointer(cell, "pointerup");
        await new Promise((r) => requestAnimationFrame(() => r()));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      api?.deactivate();
    },
    { cycleCount: 200 },
  );

  log("scenario: shift-multi-select freeze sweep (150 toggles)");
  await page.evaluate(
    async ({ toggleCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      if (cells.length === 0) return;

      const dispatchShiftClick = (target) => {
        const rect = target.getBoundingClientRect();
        const init = {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          shiftKey: true,
          button: 0,
        };
        target.dispatchEvent(new PointerEvent("pointermove", init));
        target.dispatchEvent(new PointerEvent("pointerdown", init));
        target.dispatchEvent(new PointerEvent("pointerup", init));
      };

      for (let toggleIndex = 0; toggleIndex < toggleCount; toggleIndex++) {
        dispatchShiftClick(cells[toggleIndex % cells.length]);
        if (toggleIndex % 8 === 7) {
          await new Promise((r) => requestAnimationFrame(() => r()));
        }
      }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => r()));
      api?.deactivate();
    },
    { toggleCount: 150 },
  );

  log("scenario: drag selection sweep (40 drag rectangles)");
  await page.evaluate(
    async ({ dragCount }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      if (cells.length < 20) return;

      const pointerInit = (clientX, clientY) => ({
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
      });

      for (let dragIndex = 0; dragIndex < dragCount; dragIndex++) {
        const startCell = cells[(dragIndex * 7) % cells.length];
        const endCell = cells[(dragIndex * 7 + 15) % cells.length];
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();
        const startX = startRect.left + 1;
        const startY = startRect.top + 1;
        const endX = endRect.right - 1;
        const endY = endRect.bottom - 1;

        document.dispatchEvent(new PointerEvent("pointermove", pointerInit(startX, startY)));
        startCell.dispatchEvent(new PointerEvent("pointerdown", pointerInit(startX, startY)));
        for (let step = 1; step <= 8; step++) {
          const fraction = step / 8;
          document.dispatchEvent(
            new PointerEvent(
              "pointermove",
              pointerInit(startX + (endX - startX) * fraction, startY + (endY - startY) * fraction),
            ),
          );
        }
        document.dispatchEvent(new PointerEvent("pointerup", pointerInit(endX, endY)));
        await new Promise((r) => requestAnimationFrame(() => r()));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
      api?.deactivate();
    },
    { dragCount: 40 },
  );

  log("scenario: toolbar hover rotation (240 pointer orbits around the toolbar)");
  await page.evaluate(
    async ({ steps, radius }) => {
      const api = window.__REACT_GRAB__;
      api?.activate();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const toolbar = document.querySelector("[data-react-grab-toolbar], react-grab-overlay");
      const fallbackCenter = { x: window.innerWidth / 2, y: window.innerHeight - 80 };
      const rect = toolbar?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : fallbackCenter.x;
      const cy = rect ? rect.top + rect.height / 2 : fallbackCenter.y;
      for (let stepIndex = 0; stepIndex < steps; stepIndex++) {
        const theta = (stepIndex / steps) * Math.PI * 6;
        const px = cx + Math.cos(theta) * radius;
        const py = cy + Math.sin(theta) * radius;
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: px,
            clientY: py,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
      }
      await new Promise((r) => requestAnimationFrame(() => r()));
      api?.deactivate();
    },
    { steps: 240, radius: 120 },
  );

  log("scenario: rapid activate/deactivate (60 cycles)");
  await page.evaluate(
    async ({ cycleCount }) => {
      const api = window.__REACT_GRAB__;
      for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++) {
        api?.activate();
        await new Promise((r) => requestAnimationFrame(() => r()));
        api?.deactivate();
        await new Promise((r) => requestAnimationFrame(() => r()));
      }
    },
    { cycleCount: 60 },
  );
};

// Mirrors the surfaces the e2e suite hits: real Playwright mouse/keyboard input
// against the full app (not the perf grid) so we trace deopts in code paths the
// synthetic per-cell loops above never touch (context menu, keyboard nav, copy
// flow, modals, drag through real listeners, etc.).
const runFullAppScenarios = async (page) => {
  log("navigating to full e2e-app-vite");
  await page.goto(E2E_APP_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__REACT_GRAB__), null, { timeout: 10_000 });
  await page.waitForSelector("[data-testid='todo-list']", { timeout: 10_000 });

  const activate = () =>
    page.evaluate(() => {
      window.__REACT_GRAB__?.activate?.();
    });
  const deactivate = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(60);
  };

  log("scenario(full): hover sweep across heterogeneous elements (60 hovers)");
  await activate();
  const hoverTargets = [
    "[data-testid='todo-list'] li:nth-child(1) span",
    "[data-testid='todo-list'] li:nth-child(4) span",
    "[data-testid='deeply-nested-text']",
    "[data-testid='nested-button']",
    "[data-testid='span-element']",
    "[data-testid='strong-element']",
    "[data-testid='code-element']",
    "[data-testid='link-element']",
    "[data-testid='th-1']",
    "[data-testid='td-2-2']",
    "[data-testid='article-content']",
    "[data-testid='animated-pulse']",
  ];
  for (let pass = 0; pass < 5; pass++) {
    for (const selector of hoverTargets) {
      const locator = page.locator(selector).first();
      if ((await locator.count()) === 0) continue;
      await locator.hover({ force: true });
      await page.waitForTimeout(20);
    }
  }
  await deactivate();

  log("scenario(full): context menu open/navigate/close (40 cycles)");
  await activate();
  const contextMenuTargets = [
    "[data-testid='todo-list'] li:nth-child(2)",
    "[data-testid='nested-card']",
    "[data-testid='span-element']",
    "[data-testid='td-1-2']",
  ];
  for (let cycleIndex = 0; cycleIndex < 40; cycleIndex++) {
    const selector = contextMenuTargets[cycleIndex % contextMenuTargets.length];
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    await locator.click({ button: "right", force: true });
    await page.waitForTimeout(40);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(40);
  }
  await deactivate();

  log("scenario(full): keyboard arrow navigation through selection (30 sequences)");
  await activate();
  for (let sequenceIndex = 0; sequenceIndex < 30; sequenceIndex++) {
    const locator = page.locator("[data-testid='scroll-container'] li").nth(sequenceIndex % 10);
    if ((await locator.count()) === 0) break;
    await locator.click({ force: true });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Escape");
  }
  await deactivate();

  log("scenario(full): drag selection across heterogeneous lists (15 drags)");
  await activate();
  const dragPairs = [
    ["[data-testid='todo-list'] li:nth-child(1)", "[data-testid='todo-list'] li:nth-child(4)"],
    [
      "[data-testid='scroll-container'] li:nth-child(2)",
      "[data-testid='scroll-container'] li:nth-child(6)",
    ],
    ["[data-testid='th-1']", "[data-testid='td-2-3']"],
    ["[data-testid='span-element']", "[data-testid='code-element']"],
    ["[data-testid='article-header']", "[data-testid='article-footer']"],
  ];
  for (let dragIndex = 0; dragIndex < 15; dragIndex++) {
    const [startSelector, endSelector] = dragPairs[dragIndex % dragPairs.length];
    const startLocator = page.locator(startSelector).first();
    const endLocator = page.locator(endSelector).first();
    if ((await startLocator.count()) === 0 || (await endLocator.count()) === 0) continue;
    const startBox = await startLocator.boundingBox();
    const endBox = await endLocator.boundingBox();
    if (!startBox || !endBox) continue;
    await page.mouse.move(startBox.x - 4, startBox.y - 4);
    await page.mouse.down();
    await page.mouse.move(endBox.x + endBox.width + 4, endBox.y + endBox.height + 4, {
      steps: 12,
    });
    await page.mouse.up();
    await page.waitForTimeout(60);
    await page.keyboard.press("Escape");
  }
  await deactivate();

  log("scenario(full): shift-multi-select across nested cards (25 toggles)");
  await activate();
  const multiSelectTargets = [
    "[data-testid='nested-card']",
    "[data-testid='span-element']",
    "[data-testid='strong-element']",
    "[data-testid='em-element']",
    "[data-testid='code-element']",
  ];
  await page.keyboard.down("Shift");
  for (let toggleIndex = 0; toggleIndex < 25; toggleIndex++) {
    const selector = multiSelectTargets[toggleIndex % multiSelectTargets.length];
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    await locator.click({ force: true });
    await page.waitForTimeout(20);
  }
  await page.keyboard.up("Shift");
  await deactivate();

  log("scenario(full): scroll while selection active (40 scrolls)");
  await activate();
  await page.locator("[data-testid='todo-list'] li:first-child").click({ force: true });
  for (let scrollIndex = 0; scrollIndex < 40; scrollIndex++) {
    const direction = scrollIndex % 2 === 0 ? 240 : -240;
    await page.mouse.wheel(0, direction);
    await page.waitForTimeout(15);
  }
  await deactivate();

  log("scenario(full): modal open/dismiss cycles (20 cycles)");
  await deactivate();
  for (let cycleIndex = 0; cycleIndex < 20; cycleIndex++) {
    const trigger = page.locator("[data-testid='modal-trigger']").first();
    if ((await trigger.count()) === 0) break;
    await trigger.click({ force: true });
    const backdrop = page.locator("[data-testid='modal-backdrop']").first();
    try {
      await backdrop.waitFor({ state: "visible", timeout: 1500 });
    } catch {
      continue;
    }
    await backdrop.click({ force: true });
    await page.waitForTimeout(40);
  }

  log("scenario(full): dropdown open/close cycles (20 cycles)");
  for (let cycleIndex = 0; cycleIndex < 20; cycleIndex++) {
    const trigger = page.locator("[data-testid='dropdown-trigger']").first();
    if ((await trigger.count()) === 0) break;
    await trigger.click({ force: true });
    await page.waitForTimeout(40);
    await trigger.click({ force: true });
    await page.waitForTimeout(40);
  }
};

const parseDeopts = (stderrText) => {
  const lines = stderrText.split(/\r?\n/);
  const deoptLines = lines.filter(
    (line) => line.startsWith("[deoptimizing") || line.startsWith("[bailout"),
  );
  const grouped = new Map();
  for (const line of deoptLines) {
    const reasonMatch = line.match(/reason: ([^,\]]+)/);
    const fnMatch =
      line.match(/<JSFunction ([^ ]+)\s+\(sfi = ([^)]+)\)>/) || line.match(/<JSFunction ([^>]+)>/);
    const kindMatch = line.match(/kind:\s*([A-Za-z]+)/);
    const positionMatch =
      line.match(/at\s+<([^>]+)>:(\d+)/) || line.match(/<([^:>]+):(\d+):(\d+)>/);
    const eventType = line.startsWith("[deoptimizing") ? "deopt" : "bailout";
    const reason = reasonMatch ? reasonMatch[1].trim() : "(unknown)";
    const fn = fnMatch ? fnMatch[1] : "(anonymous)";
    const kind = kindMatch ? kindMatch[1] : "?";
    const pos = positionMatch
      ? `${positionMatch[1]}:${positionMatch[2]}${positionMatch[3] ? `:${positionMatch[3]}` : ""}`
      : "?";
    const key = `${eventType}|${kind}|${reason}|${fn}|${pos}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  const summary = Array.from(grouped.entries())
    .map(([key, count]) => {
      const [eventType, kind, reason, fn, position] = key.split("|");
      return { eventType, kind, reason, fn, position, count };
    })
    .sort((a, b) => b.count - a.count);
  return { totalDeoptLines: deoptLines.length, deoptLines, summary };
};

const main = async () => {
  if (!existsSync(DIST_ENTRY)) {
    log(`dist missing at ${DIST_ENTRY}; please run \`pnpm build\` first`);
    process.exit(1);
  }

  let serverProcess = null;
  const wasServerAlreadyRunning = await isServerReachable(E2E_APP_URL);
  if (!wasServerAlreadyRunning) {
    serverProcess = startDevServer();
    const becameReady = await waitForServer(E2E_APP_URL, SERVER_READY_TIMEOUT_MS);
    if (!becameReady) {
      stopDevServer(serverProcess);
      throw new Error("dev server failed to start within timeout");
    }
    log("dev server ready");
  } else {
    log("dev server already running, reusing");
  }

  const chromeHandle = await launchChromeWithDeoptTrace();
  let browser = null;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${chromeHandle.port}`);
    const context =
      browser.contexts()[0] ??
      (await browser.newContext({ viewport: { width: 1280, height: 720 } }));
    const page = await context.newPage();
    page.on("pageerror", (error) => log(`page error: ${error.message}`));
    await page.goto(`${E2E_APP_URL}${PERF_GRID_PATH}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__REACT_GRAB__), null, { timeout: 10_000 });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 100,
      null,
      { timeout: 10_000 },
    );
    try {
      await runScenarios(page);
    } catch (error) {
      log(`runScenarios threw: ${error?.message ?? error}`);
    }
    try {
      await runFullAppScenarios(page);
    } catch (error) {
      log(`runFullAppScenarios threw: ${error?.message ?? error}`);
    }
    await page.close();
    await browser.close();
  } finally {
    try {
      chromeHandle.child.stdout?.destroy();
      chromeHandle.child.stderr?.destroy();
      chromeHandle.child.kill("SIGKILL");
    } catch {}
    if (serverProcess && !wasServerAlreadyRunning) stopDevServer(serverProcess);
  }

  const stderrText = chromeHandle.getStderr();
  await mkdir(OUTPUT_DIR, { recursive: true });
  const stderrPath = resolve(OUTPUT_DIR, "deopt-trace.stderr.log");
  await writeFile(stderrPath, stderrText);
  log(`wrote raw chrome stderr to ${stderrPath} (${stderrText.length} bytes)`);

  const { totalDeoptLines, deoptLines, summary } = parseDeopts(stderrText);
  const summaryPath = resolve(OUTPUT_DIR, "deopt-trace.summary.json");
  await writeFile(
    summaryPath,
    JSON.stringify({ totalDeoptLines, uniqueSites: summary.length, summary }, null, 2),
  );
  const rawDeoptPath = resolve(OUTPUT_DIR, "deopt-trace.lines.log");
  await writeFile(rawDeoptPath, deoptLines.join("\n"));
  log(
    `wrote ${totalDeoptLines} deopt lines (${summary.length} unique) to ${summaryPath} and ${rawDeoptPath}`,
  );

  if (summary.length === 0) {
    log("no deopts found");
  } else {
    log("top deopt sites:");
    for (const entry of summary.slice(0, 20)) {
      console.log(
        `  x${entry.count}\t${entry.eventType}\t${entry.kind}\tfn=${entry.fn}\treason=${entry.reason}`,
      );
    }
  }
};

main().catch((error) => {
  console.error("[deopt] fatal:", error);
  process.exit(1);
});
