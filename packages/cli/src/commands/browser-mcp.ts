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

  server.registerTool(
    "browser_snapshot",
    {
      description: "Get accessibility tree with element refs (e1, e2...). ALWAYS use the a11y tree for finding and interacting with elements - it is more reliable and structured than screenshots. Use refs with browser_execute: ref('e1').click(). Use interactableOnly:true for smaller output. DO NOT use screenshot:true unless the user explicitly asks about visual appearance, layout, or styling.",
      inputSchema: {
        page: z.string().optional().default("default").describe("Named page context for multi-turn sessions"),
        maxDepth: z.number().optional().describe("Limit tree depth (e.g., 5)"),
        interactableOnly: z.boolean().optional().describe("Only show elements with refs"),
        format: z.enum(["yaml", "compact"]).optional().default("yaml").describe("Output format: 'yaml' (default) or 'compact' (ref:role:name|...)"),
        screenshot: z.boolean().optional().default(false).describe("Only use when user asks about visuals/layout/styling - not for element discovery"),
      },
    },
    async ({ page: pageName, maxDepth, interactableOnly, format, screenshot }) => {
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

        if (screenshot) {
          const { tmpdir } = await import("os");
          const { join } = await import("path");
          const screenshotPath = join(tmpdir(), `react-grab-screenshot-${Date.now()}.png`);
          await activePage.screenshot({ path: screenshotPath, fullPage: false });
          return {
            content: [
              { type: "text" as const, text: snapshotResult },
              { type: "text" as const, text: `\n\nScreenshot saved: ${screenshotPath}` },
            ],
          };
        }

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

  server.registerTool(
    "browser_execute",
    {
      description: "Execute Playwright code. IMPORTANT: Always call snapshot() first to get element refs from the a11y tree (e1, e2...), then use ref('e1').click() to interact. The a11y tree is the source of truth for element discovery. ref() is chainable: .click(), .fill(), .source() (React file). Avoid page.locator() - use refs instead.",
      inputSchema: {
        code: z.string().describe("JavaScript code to execute (use 'page' for Playwright Page, 'return' for output)"),
        page: z.string().optional().default("default").describe("Named page context for multi-turn sessions"),
        url: z.string().optional().describe("Navigate to URL before executing"),
        timeout: z.number().optional().default(DEFAULT_NAVIGATION_TIMEOUT_MS).describe("Navigation timeout in milliseconds"),
      },
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

        const resolveSelector = (target: string): string => {
          if (/^e\d+$/.test(target)) {
            return `[aria-ref="${target}"]`;
          }
          return target;
        };

        interface SourceInfo {
          filePath: string;
          lineNumber: number | null;
          componentName: string | null;
        }

        const ref = (refId: string): ElementHandle & PromiseLike<ElementHandle> & { source: () => Promise<SourceInfo | null> } => {
          const getElement = async (): Promise<ElementHandle> => {
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
              throw new Error(`Ref "${refId}" is not an element`);
            }
            return element;
          };

          const getSource = async (): Promise<SourceInfo | null> => {
            const element = await getElement();
            const currentPage = getActivePage();
            return currentPage.evaluate((el) => {
              const api = (globalThis as { __REACT_GRAB__?: { getSource: (element: Element) => Promise<SourceInfo | null> } }).__REACT_GRAB__;
              if (!api) return null;
              return api.getSource(el as Element);
            }, element);
          };

          return new Proxy({} as ElementHandle & PromiseLike<ElementHandle> & { source: () => Promise<SourceInfo | null> }, {
            get(_, prop: string) {
              if (prop === "then") {
                return (
                  resolve: (value: ElementHandle) => void,
                  reject: (error: Error) => void
                ) => getElement().then(resolve, reject);
              }
              if (prop === "source") {
                return getSource;
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (...args: unknown[]) => getElement().then((element) => (element as any)[prop](...args));
            },
          });
        };

        const fill = async (refId: string, text: string): Promise<void> => {
          const element = await ref(refId);
          await element.click();
          const currentPage = getActivePage();
          const isMac = process.platform === "darwin";
          const modifier = isMac ? "Meta" : "Control";
          await currentPage.keyboard.press(`${modifier}+a`);
          await currentPage.keyboard.type(text);
        };

        interface DragOptions {
          from: string;
          to: string;
          dataTransfer?: Record<string, string>;
        }

        const drag = async (options: DragOptions): Promise<void> => {
          const currentPage = getActivePage();
          const { from, to, dataTransfer = {} } = options;
          const fromSelector = resolveSelector(from);
          const toSelector = resolveSelector(to);

          await currentPage.evaluate(
            ({ fromSel, toSel, data }: { fromSel: string; toSel: string; data: Record<string, string> }) => {
              const fromElement = document.querySelector(fromSel);
              const toElement = document.querySelector(toSel);
              if (!fromElement) throw new Error(`Source element not found: ${fromSel}`);
              if (!toElement) throw new Error(`Target element not found: ${toSel}`);

              const dataTransferObject = new DataTransfer();
              for (const [type, value] of Object.entries(data)) {
                dataTransferObject.setData(type, value);
              }

              const dragStartEvent = new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dataTransferObject });
              const dragOverEvent = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dataTransferObject });
              const dropEvent = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dataTransferObject });
              const dragEndEvent = new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer: dataTransferObject });

              fromElement.dispatchEvent(dragStartEvent);
              toElement.dispatchEvent(dragOverEvent);
              toElement.dispatchEvent(dropEvent);
              fromElement.dispatchEvent(dragEndEvent);
            },
            { fromSel: fromSelector, toSel: toSelector, data: dataTransfer }
          );
        };

        interface DispatchOptions {
          target: string;
          event: string;
          bubbles?: boolean;
          cancelable?: boolean;
          dataTransfer?: Record<string, string>;
          detail?: unknown;
        }

        const dispatch = async (options: DispatchOptions): Promise<boolean> => {
          const currentPage = getActivePage();
          const { target, event, bubbles = true, cancelable = true, dataTransfer, detail } = options;
          const selector = resolveSelector(target);

          return currentPage.evaluate(
            ({ sel, eventType, opts }: { sel: string; eventType: string; opts: { bubbles: boolean; cancelable: boolean; dataTransfer?: Record<string, string>; detail?: unknown } }) => {
              const element = document.querySelector(sel);
              if (!element) throw new Error(`Element not found: ${sel}`);

              let evt: Event;
              if (opts.dataTransfer) {
                const dataTransferObject = new DataTransfer();
                for (const [type, value] of Object.entries(opts.dataTransfer)) {
                  dataTransferObject.setData(type, value);
                }
                evt = new DragEvent(eventType, {
                  bubbles: opts.bubbles,
                  cancelable: opts.cancelable,
                  dataTransfer: dataTransferObject,
                });
              } else if (opts.detail !== undefined) {
                evt = new CustomEvent(eventType, {
                  bubbles: opts.bubbles,
                  cancelable: opts.cancelable,
                  detail: opts.detail,
                });
              } else {
                evt = new Event(eventType, { bubbles: opts.bubbles, cancelable: opts.cancelable });
              }

              return element.dispatchEvent(evt);
            },
            { sel: selector, eventType: event, opts: { bubbles, cancelable, dataTransfer, detail } }
          );
        };

        const executeFunction = new Function(
          "page",
          "getActivePage",
          "snapshot",
          "ref",
          "fill",
          "drag",
          "dispatch",
          `return (async () => { ${code} })();`
        );

        const result = await executeFunction(getActivePage(), getActivePage, snapshot, ref, fill, drag, dispatch);
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
