import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "playwright";
import { getSnapshotScript } from "./snapshot/index.js";
import {
  DEFAULT_SERVER_PORT,
  DEFAULT_CDP_PORT,
  MAX_CDP_READY_ATTEMPTS,
  CDP_READY_DELAY_MS,
  MAX_SERVER_SPAWN_ATTEMPTS,
  SERVER_SPAWN_DELAY_MS,
} from "./utils/constants.js";

const SERVER_INFO_PATH = join(tmpdir(), "react-grab-browser-server.json");

let cachedReactGrabScript: string | null = null;

const fetchReactGrabScript = async (): Promise<string> => {
  if (cachedReactGrabScript) return cachedReactGrabScript;
  try {
    const response = await fetch("https://unpkg.com/react-grab/dist/index.global.js");
    if (response.ok) {
      cachedReactGrabScript = await response.text();
      return cachedReactGrabScript;
    }
  } catch {}
  return "";
};

interface PageEntry {
  page: Page;
  targetId: string;
}

interface ServerInfo {
  port: number;
  cdpPort: number;
  wsEndpoint: string;
  pid: number;
}

export interface BrowserServer {
  port: number;
  cdpPort: number;
  wsEndpoint: string;
  stop: () => Promise<void>;
}

export const getServerInfo = (): ServerInfo | null => {
  if (!existsSync(SERVER_INFO_PATH)) {
    return null;
  }
  try {
    const content = readFileSync(SERVER_INFO_PATH, "utf-8");
    return JSON.parse(content) as ServerInfo;
  } catch {
    return null;
  }
};

export const saveServerInfo = (info: ServerInfo): void => {
  writeFileSync(SERVER_INFO_PATH, JSON.stringify(info));
};

export const deleteServerInfo = (): void => {
  if (existsSync(SERVER_INFO_PATH)) {
    unlinkSync(SERVER_INFO_PATH);
  }
};

export const isServerRunning = async (): Promise<boolean> => {
  const info = getServerInfo();
  if (!info) return false;

  try {
    const res = await fetch(`http://127.0.0.1:${info.port}/`);
    return res.ok;
  } catch {
    deleteServerInfo();
    return false;
  }
};

export const isServerHealthy = async (): Promise<boolean> => {
  const info = getServerInfo();
  if (!info) return false;

  try {
    const res = await fetch(`http://127.0.0.1:${info.port}/health`);
    if (!res.ok) return false;
    const data = (await res.json()) as { healthy: boolean };
    return data.healthy === true;
  } catch {
    return false;
  }
};

export const stopServer = async (): Promise<void> => {
  const info = getServerInfo();
  if (!info) return;

  try {
    process.kill(info.pid, "SIGTERM");
  } catch {}
  deleteServerInfo();
};

const getTargetId = async (context: BrowserContext, page: Page): Promise<string> => {
  const cdpSession = await context.newCDPSession(page);
  try {
    const { targetInfo } = await cdpSession.send("Target.getTargetInfo");
    return targetInfo.targetId;
  } finally {
    await cdpSession.detach();
  }
};

const parseBody = (req: IncomingMessage): Promise<Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
};

const sendJson = (res: ServerResponse, status: number, data: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

export interface ServeOptions {
  port?: number;
  cdpPort?: number;
  headless?: boolean;
  profileDir?: string;
}

export const serve = async (options: ServeOptions = {}): Promise<BrowserServer> => {
  const port = options.port ?? DEFAULT_SERVER_PORT;
  const cdpPort = options.cdpPort ?? DEFAULT_CDP_PORT;
  const headless = options.headless ?? true;

  const userDataDir = options.profileDir
    ? join(options.profileDir, "browser-data")
    : join(tmpdir(), "react-grab-browser-data");

  mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      `--remote-debugging-port=${cdpPort}`,
      ...(headless ? [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
      ] : []),
    ],
  });

  const reactGrabScript = await fetchReactGrabScript();
  if (reactGrabScript) {
    await context.addInitScript(reactGrabScript);
  }
  await context.addInitScript(getSnapshotScript());

  const fetchUntilReady = async (url: string, maxAttempts = MAX_CDP_READY_ATTEMPTS, delayMs = CDP_READY_DELAY_MS): Promise<Response> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
      } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`Failed to fetch ${url} after ${maxAttempts} retries`);
  };

  const cdpResponse = await fetchUntilReady(`http://127.0.0.1:${cdpPort}/json/version`);
  const cdpInfo = await cdpResponse.json() as { webSocketDebuggerUrl: string };
  const wsEndpoint = cdpInfo.webSocketDebuggerUrl;

  const registry = new Map<string, PageEntry>();

  const handleRequest = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const method = req.method ?? "GET";

    if (method === "GET" && url.pathname === "/") {
      sendJson(res, 200, { wsEndpoint, port, cdpPort });
      return;
    }

    if (method === "GET" && url.pathname === "/health") {
      try {
        const testPage = await context.newPage();
        await testPage.close();
        sendJson(res, 200, { healthy: true });
      } catch {
        sendJson(res, 503, { healthy: false, error: "Browser context is closed" });
      }
      return;
    }

    if (method === "GET" && url.pathname === "/pages") {
      const pages = Array.from(registry.entries()).map(([name, entry]) => ({
        name,
        targetId: entry.targetId,
        url: entry.page.url(),
      }));
      sendJson(res, 200, { pages });
      return;
    }

    if (method === "POST" && url.pathname === "/pages") {
      const body = await parseBody(req);
      const name = body.name as string;

      if (!name || typeof name !== "string") {
        sendJson(res, 400, { error: "name is required" });
        return;
      }

      let entry = registry.get(name);
      if (!entry) {
        const page = await context.newPage();
        const targetId = await getTargetId(context, page);
        entry = { page, targetId };
        registry.set(name, entry);

        page.on("close", () => {
          registry.delete(name);
        });
      }

      sendJson(res, 200, {
        name,
        targetId: entry.targetId,
        url: entry.page.url(),
        wsEndpoint,
      });
      return;
    }

    if (method === "DELETE" && url.pathname.startsWith("/pages/")) {
      const name = decodeURIComponent(url.pathname.slice(7));
      const entry = registry.get(name);

      if (entry) {
        registry.delete(name);
        sendJson(res, 200, { success: true });
      } else {
        sendJson(res, 404, { error: "page not found" });
      }
      return;
    }

    sendJson(res, 404, { error: "not found" });
  };

  const server: Server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      sendJson(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", resolve);
  });

  saveServerInfo({ port, cdpPort, wsEndpoint, pid: process.pid });

  const cleanup = async (): Promise<void> => {
    deleteServerInfo();

    for (const entry of registry.values()) {
      try {
        await entry.page.close();
      } catch {}
    }
    registry.clear();

    try {
      await context.close();
    } catch {}

    server.close();
  };

  const signalHandler = async (): Promise<void> => {
    await cleanup();
    process.exit(0);
  };

  process.on("SIGINT", signalHandler);
  process.on("SIGTERM", signalHandler);

  return {
    port,
    cdpPort,
    wsEndpoint,
    stop: cleanup,
  };
};

export interface SpawnServerOptions {
  port?: number;
  cdpPort?: number;
  headless?: boolean;
  cliPath: string;
  browser?: string;
  domain?: string;
}

export const spawnServer = async (options: SpawnServerOptions): Promise<BrowserServer> => {
  const port = options.port ?? DEFAULT_SERVER_PORT;
  const headless = options.headless ?? false;

  const args = ["browser", "start", "-p", String(port)];
  if (headless) args.push("--headless");
  if (options.browser) args.push("-b", options.browser);
  if (options.domain) args.push("-d", options.domain);

  const child = spawn(process.execPath, [options.cliPath, ...args], {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  for (let i = 0; i < MAX_SERVER_SPAWN_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, SERVER_SPAWN_DELAY_MS));

    const info = getServerInfo();
    if (info) {
      try {
        const res = await fetch(`http://127.0.0.1:${info.port}/`);
        if (res.ok) {
          const data = (await res.json()) as { wsEndpoint: string };
          return {
            port: info.port,
            cdpPort: info.cdpPort,
            wsEndpoint: data.wsEndpoint,
            stop: async () => {
              try {
                process.kill(info.pid, "SIGTERM");
              } catch {}
              deleteServerInfo();
            },
          };
        }
      } catch {}
    }
  }

  throw new Error("Failed to start server in background");
};
