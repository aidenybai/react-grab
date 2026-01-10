import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, type Browser, type Page } from "playwright";
import {
  getServerInfo,
  isServerRunning,
  isServerHealthy,
  stopServer,
  spawnServer,
  findPageByTargetId,
  getSnapshotScript,
} from "@react-grab/browser";
import type { ElementHandle } from "playwright";

interface PageInfo {
  name: string;
  targetId: string;
  url: string;
  wsEndpoint: string;
}

interface ExecuteResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  url: string;
  title: string;
  page?: string;
}

const DEFAULT_NAVIGATION_TIMEOUT_MS = 30000;

const getOrCreatePage = async (serverUrl: string, name: string): Promise<PageInfo> => {
  const response = await fetch(`${serverUrl}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`Failed to get page: ${await response.text()}`);
  return response.json() as Promise<PageInfo>;
};

const ensureHealthyServer = async (): Promise<{ serverUrl: string }> => {
  const cliPath = process.argv[1];

  const serverRunning = await isServerRunning();
  if (serverRunning) {
    const healthy = await isServerHealthy();
    if (healthy) {
      const info = getServerInfo()!;
      return { serverUrl: `http://127.0.0.1:${info.port}` };
    }
    await stopServer();
  }

  const browserServer = await spawnServer({
    headless: true,
    cliPath,
  });
  return { serverUrl: `http://127.0.0.1:${browserServer.port}` };
};

export const startMcpServer = async (): Promise<void> => {
  const server = new McpServer({
    name: "react-grab-browser",
    version: "1.0.0",
  });

  server.tool(
    "browser_snapshot",
    "Get an accessibility tree snapshot of the current page with element refs for interaction. Use format:'compact' for minimal output.",
    {
      page: z.string().optional().default("default").describe("Named page context for multi-turn sessions"),
      maxDepth: z.number().optional().describe("Limit tree depth (e.g., 5)"),
      interactableOnly: z.boolean().optional().describe("Only show elements with refs"),
      format: z.enum(["yaml", "compact"]).optional().default("yaml").describe("Output format: 'yaml' (default) or 'compact' (ref:role:name|...)"),
    },
    async ({ page: pageName, maxDepth, interactableOnly, format }) => {
      let browser: Browser | null = null;
      let activePage: Page | null = null;

      try {
        const { serverUrl } = await ensureHealthyServer();
        const pageInfo = await getOrCreatePage(serverUrl, pageName);

        browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
        activePage = await findPageByTargetId(browser, pageInfo.targetId);

        if (!activePage) {
          throw new Error(`Page "${pageName}" not found`);
        }

        const snapshotScript = getSnapshotScript();

        interface SnapshotOptions {
          maxDepth?: number;
          interactableOnly?: boolean;
          format?: string;
        }

        const snapshotResult = await activePage.evaluate(
          ({ script, opts }: { script: string; opts?: SnapshotOptions }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const windowGlobal = globalThis as any;
            if (!windowGlobal.__REACT_GRAB_SNAPSHOT__) {
              eval(script);
            }
            return windowGlobal.__REACT_GRAB_SNAPSHOT__(opts);
          },
          { script: snapshotScript, opts: { maxDepth, interactableOnly, format } }
        );

        return {
          content: [{ type: "text" as const, text: snapshotResult }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : "Failed",
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "browser_execute",
    "Execute Playwright code with 'page' variable available. Use 'return' for output. Helpers: snapshot(opts?), ref(id), fill(id, text)",
    {
      code: z.string().describe("JavaScript code to execute (use 'page' for Playwright Page, 'return' for output)"),
      page: z.string().optional().default("default").describe("Named page context for multi-turn sessions"),
      url: z.string().optional().describe("Navigate to URL before executing"),
      timeout: z.number().optional().default(DEFAULT_NAVIGATION_TIMEOUT_MS).describe("Navigation timeout in milliseconds"),
    },
    async ({ code, page: pageName, url, timeout }) => {
      let browser: Browser | null = null;
      let activePage: Page | null = null;

      const outputJson = async (ok: boolean, result?: unknown, error?: string): Promise<ExecuteResult> => {
        return {
          ok,
          url: activePage ? activePage.url() : "",
          title: activePage ? await activePage.title().catch(() => "") : "",
          page: pageName,
          ...(result !== undefined && { result }),
          ...(error && { error }),
        };
      };

      try {
        const { serverUrl } = await ensureHealthyServer();
        const pageInfo = await getOrCreatePage(serverUrl, pageName);

        browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
        activePage = await findPageByTargetId(browser, pageInfo.targetId);

        if (!activePage) {
          throw new Error(`Page "${pageName}" not found`);
        }

        if (url) {
          await activePage.goto(url, {
            waitUntil: "domcontentloaded",
            timeout,
          });
        }

        const context = activePage.context();
        context.on("page", (newPage) => {
          activePage = newPage;
        });

        const getActivePage = (): Page => {
          const allPages = context.pages();
          if (allPages.length === 0) throw new Error("No pages available");
          return activePage && allPages.includes(activePage) ? activePage : allPages[allPages.length - 1];
        };

        const snapshotScript = getSnapshotScript();

        interface SnapshotOptions {
          maxDepth?: number;
          interactableOnly?: boolean;
        }

        const snapshot = async (options?: SnapshotOptions): Promise<string> => {
          const currentPage = getActivePage();
          return currentPage.evaluate(
            ({ script, opts }: { script: string; opts?: SnapshotOptions }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const windowGlobal = globalThis as any;
              if (!windowGlobal.__REACT_GRAB_SNAPSHOT__) {
                eval(script);
              }
              return windowGlobal.__REACT_GRAB_SNAPSHOT__(opts);
            },
            { script: snapshotScript, opts: options }
          );
        };

        const ref = async (refId: string): Promise<ElementHandle | null> => {
          const currentPage = getActivePage();
          const elementHandle = await currentPage.evaluateHandle((id: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const windowGlobal = globalThis as any;
            const refs = windowGlobal.__REACT_GRAB_REFS__;
            if (!refs) {
              throw new Error("No refs found. Call snapshot() first.");
            }
            const element = refs[id];
            if (!element) {
              throw new Error(`Ref "${id}" not found. Available refs: ${Object.keys(refs).join(", ")}`);
            }
            return element;
          }, refId);

          const element = elementHandle.asElement();
          if (!element) {
            await elementHandle.dispose();
            return null;
          }
          return element;
        };

        const fill = async (refId: string, text: string): Promise<void> => {
          const element = await ref(refId);
          if (!element) {
            throw new Error(`Element "${refId}" not found`);
          }
          await element.click();
          const currentPage = getActivePage();
          const isMac = process.platform === "darwin";
          const modifier = isMac ? "Meta" : "Control";
          await currentPage.keyboard.press(`${modifier}+a`);
          await currentPage.keyboard.type(text);
        };

        const executeFunction = new Function(
          "page",
          "getActivePage",
          "snapshot",
          "ref",
          "fill",
          `return (async () => { ${code} })();`
        );

        const result = await executeFunction(getActivePage(), getActivePage, snapshot, ref, fill);
        const output = await outputJson(true, result);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
        };
      } catch (error) {
        const output = await outputJson(false, undefined, error instanceof Error ? error.message : "Failed");

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
          isError: true,
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
