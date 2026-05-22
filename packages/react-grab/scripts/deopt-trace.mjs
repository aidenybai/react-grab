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
const REPO_ROOT = resolve(__dirname, "../../..");
const OUTPUT_DIR = resolve(__dirname, "../perf");

const E2E_APP_URL = "http://localhost:5175";
const PERF_GRID_PATH = "/?perf=grid&rows=50&cols=10";
const SERVER_READY_TIMEOUT_MS = 60_000;
const CHROME_BINARY =
  process.env.CHROME_BINARY ||
  "/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell";

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
  if (!existsSync(CHROME_BINARY)) {
    throw new Error(`chromium binary not found at ${CHROME_BINARY}`);
  }
  const port = await findFreePort();
  const userDataDir = `/tmp/deopt-trace-profile-${Date.now()}`;
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
  log(`launching chrome with js-flags: ${jsFlags}`);
  const child = spawn(CHROME_BINARY, args, {
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
  const ready = await waitForUrlReady(cdpUrl, 20_000);
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
  if (!existsSync(resolve(REPO_ROOT, "packages/react-grab/dist/index.js"))) {
    log("dist missing; please run `pnpm build` first");
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
    await runScenarios(page);
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
