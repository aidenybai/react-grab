import { Command } from "commander";
import { chromium, type Browser, type Page } from "playwright";
import {
  SUPPORTED_BROWSERS,
  BROWSER_DISPLAY_NAMES,
  DEFAULT_SERVER_PORT,
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  COOKIE_PREVIEW_LIMIT,
  type SupportedBrowser,
  dumpCookies,
  findInstalledBrowsers,
  findPageByTargetId,
  getDefaultBrowser,
  toPlaywrightCookies,
  applyStealthScripts,
  serve,
  spawnServer,
  getServerInfo,
  isServerRunning,
  isServerHealthy,
  stopServer,
  deleteServerInfo,
  getSnapshotScript,
} from "@react-grab/browser";
import type { ElementHandle } from "playwright";
import { highlighter } from "../utils/highlighter.js";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import { startMcpServer } from "./browser-mcp.js";

const handleError = (error: unknown): never => {
  logger.error(error instanceof Error ? error.message : "Failed");
  process.exit(1);
};

const isSupportedBrowser = (value: string): value is SupportedBrowser => {
  return SUPPORTED_BROWSERS.includes(value as SupportedBrowser);
};

const resolveSourceBrowser = (browserOption?: string): SupportedBrowser => {
  if (!browserOption) {
    const defaultBrowser = getDefaultBrowser();
    if (defaultBrowser) return defaultBrowser;
    const installedBrowsers = findInstalledBrowsers();
    if (installedBrowsers.length === 0) {
      logger.error("No supported browsers found.");
      process.exit(1);
    }
    return installedBrowsers[0];
  }

  if (!isSupportedBrowser(browserOption)) {
    logger.error(`Unknown browser: ${browserOption}`);
    logger.log(`Supported: ${SUPPORTED_BROWSERS.join(", ")}`);
    process.exit(1);
  }
  return browserOption;
};

interface PageInfo {
  name: string;
  targetId: string;
  url: string;
  wsEndpoint: string;
}

const getOrCreatePage = async (serverUrl: string, name: string): Promise<PageInfo> => {
  const response = await fetch(`${serverUrl}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`Failed to get page: ${await response.text()}`);
  return response.json() as Promise<PageInfo>;
};

const list = new Command()
  .name("list")
  .description("list installed browsers")
  .action(() => {
    const browsers = findInstalledBrowsers();
    if (browsers.length === 0) {
      logger.warn("No supported browsers found.");
      return;
    }
    for (const browserName of browsers) {
      logger.log(`${highlighter.success("●")} ${BROWSER_DISPLAY_NAMES[browserName]}`);
    }
  });

const dump = new Command()
  .name("dump")
  .description("dump cookies from a browser")
  .argument("[browser]", "browser to dump from")
  .option("-d, --domain <domain>", "filter by domain")
  .option("-l, --limit <limit>", "limit count", parseInt)
  .option("-j, --json", "output JSON", false)
  .action((browserArg: string | undefined, opts) => {
    const sourceBrowser = resolveSourceBrowser(browserArg);
    try {
      const cookies = dumpCookies(sourceBrowser, {
        domain: opts.domain,
        limit: opts.limit,
      });

      if (opts.json) {
        console.log(JSON.stringify(cookies, null, 2));
        return;
      }

      logger.success(`Found ${highlighter.info(cookies.length.toString())} cookies`);
      for (const cookie of cookies.slice(0, COOKIE_PREVIEW_LIMIT)) {
        logger.log(`  ${highlighter.dim(cookie.hostKey)}: ${cookie.name}`);
      }
      if (cookies.length > COOKIE_PREVIEW_LIMIT) {
        logger.dim(`  ... and ${cookies.length - COOKIE_PREVIEW_LIMIT} more`);
      }
    } catch (error) {
      handleError(error);
    }
  });

const start = new Command()
  .name("start")
  .description("start browser server manually (auto-starts on first execute)")
  .option("-p, --port <port>", "HTTP API port", String(DEFAULT_SERVER_PORT))
  .option("--headed", "show browser window (default is headless)")
  .option("-b, --browser <browser>", "source browser for cookies (chrome, edge, brave, arc)")
  .option("-d, --domain <domain>", "only load cookies matching this domain")
  .action(async (options) => {
    if (await isServerRunning()) {
      const info = getServerInfo();
      logger.error(`Server already running on port ${info?.port}`);
      process.exit(1);
    }

    const sourceBrowser = resolveSourceBrowser(options.browser);
    const port = parseInt(options.port, 10);

    const serverSpinner = spinner("Starting server").start();

    try {
      const browserServer = await serve({
        port,
        headless: !options.headed,
      });

      serverSpinner.succeed(`Server running on port ${browserServer.port}`);
      logger.dim(`CDP: ${browserServer.wsEndpoint}`);
      logger.break();

      try {
        const cookies = dumpCookies(sourceBrowser, { domain: options.domain });
        const playwrightCookies = toPlaywrightCookies(cookies);
        logger.info(`Loaded ${playwrightCookies.length} cookies from ${sourceBrowser}`);

        const browser = await chromium.connectOverCDP(browserServer.wsEndpoint);
        const contexts = browser.contexts();
        if (contexts.length > 0 && playwrightCookies.length > 0) {
          await contexts[0].addCookies(playwrightCookies);
          await applyStealthScripts(contexts[0]);
        }
        await browser.close();
      } catch (cookieError) {
        logger.warn(`Failed to load cookies from ${sourceBrowser}: ${cookieError instanceof Error ? cookieError.message : "Unknown error"}`);
        logger.dim("Continuing without cookies");
      }

      logger.break();
      logger.success("Server ready. Use 'browser execute' to connect.");
      logger.dim("Press Ctrl+C to stop.");

      await new Promise(() => {});
    } catch (error) {
      serverSpinner.fail();
      handleError(error);
    }
  });

const stop = new Command()
  .name("stop")
  .description("stop the browser server")
  .action(async () => {
    const info = getServerInfo();
    if (!info) {
      logger.dim("No server running");
      return;
    }

    try {
      process.kill(info.pid, "SIGTERM");
      deleteServerInfo();
      logger.success("Server stopped");
    } catch {
      deleteServerInfo();
      logger.dim("Server was not running");
    }
  });

const status = new Command()
  .name("status")
  .description("check server status")
  .option("-j, --json", "output structured JSON: {running, port, pages}", false)
  .action(async (options) => {
    const jsonMode = options.json as boolean;

    if (await isServerRunning()) {
      const info = getServerInfo();

      let pagesData: Array<{ name: string; url: string }> = [];
      try {
        const pagesResponse = await fetch(`http://127.0.0.1:${info?.port}/pages`);
        const pagesResult = await pagesResponse.json() as { pages: Array<{ name: string; url: string }> };
        pagesData = pagesResult.pages;
      } catch {}

      if (jsonMode) {
        console.log(JSON.stringify({
          running: true,
          port: info?.port,
          pages: pagesData,
        }));
      } else {
        logger.log(`${highlighter.success("●")} Server running on port ${info?.port}`);

        if (pagesData.length > 0) {
          logger.break();
          logger.info("Pages:");
          for (const page of pagesData) {
            logger.log(`  ${page.name}: ${highlighter.dim(page.url)}`);
          }
        }
      }
    } else {
      if (jsonMode) {
        console.log(JSON.stringify({
          running: false,
          port: null,
          pages: [],
        }));
      } else {
        logger.log(`${highlighter.error("○")} Server not running`);
      }
    }
  });

interface ExecuteResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  url: string;
  title: string;
  page?: string;
}

const execute = new Command()
  .name("execute")
  .description("run Playwright code with 'page' variable available")
  .argument("<code>", "JavaScript code to execute (use 'page' for Playwright Page, 'return' for output)")
  .option("-b, --browser <browser>", "source browser for cookies")
  .option("-d, --domain <domain>", "filter cookies by domain")
  .option("-u, --url <url>", "navigate to URL before executing")
  .option("-p, --page <name>", "named page context for multi-turn sessions", "default")
  .option("-t, --timeout <ms>", `navigation timeout in milliseconds (default: ${DEFAULT_NAVIGATION_TIMEOUT_MS})`, String(DEFAULT_NAVIGATION_TIMEOUT_MS))
  .action(async (code: string, options) => {
    const pageName = options.page as string;
    const navigationTimeout = parseInt(options.timeout as string, 10);

    let browser: Browser | null = null;
    let activePage: Page | null = null;

    const outputJson = async (ok: boolean, result?: unknown, error?: string) => {
      const output: ExecuteResult = {
        ok,
        url: activePage ? activePage.url() : "",
        title: activePage ? await activePage.title().catch(() => "") : "",
        page: pageName,
        ...(result !== undefined && { result }),
        ...(error && { error }),
      };
      console.log(JSON.stringify(output));
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
        browser: options.browser,
        domain: options.domain,
      });
      return { serverUrl: `http://127.0.0.1:${browserServer.port}` };
    };

    try {
      const { serverUrl } = await ensureHealthyServer();
      const pageInfo = await getOrCreatePage(serverUrl, pageName);

      browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
      activePage = await findPageByTargetId(browser, pageInfo.targetId);

      if (!activePage) {
        throw new Error(`Page "${pageName}" not found`);
      }

      if (options.url) {
        await activePage.goto(options.url, {
          waitUntil: "domcontentloaded",
          timeout: navigationTimeout,
        });
      }

      const context = activePage.context();
      context.on("page", (newPage) => { activePage = newPage; });

      const getActivePage = (): Page => {
        const allPages = context.pages();
        if (allPages.length === 0) throw new Error("No pages available");
        return activePage && allPages.includes(activePage) ? activePage : allPages[allPages.length - 1];
      };

      const snapshotScript = getSnapshotScript();

      interface SnapshotOptions {
        maxDepth?: number;
        interactableOnly?: boolean;
        format?: "yaml" | "compact";
      }

      const snapshot = async (options?: SnapshotOptions): Promise<string> => {
        const currentPage = getActivePage();
        return currentPage.evaluate(({ script, opts }: { script: string; opts?: SnapshotOptions }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const windowGlobal = globalThis as any;
          if (!windowGlobal.__REACT_GRAB_SNAPSHOT__) {
            eval(script);
          }
          return windowGlobal.__REACT_GRAB_SNAPSHOT__(opts);
        }, { script: snapshotScript, opts: options });
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

      const grab = {
        activate: async (): Promise<void> => {
          const currentPage = getActivePage();
          await currentPage.evaluate(() => {
            const api = (globalThis as { __REACT_GRAB__?: { activate: () => void } }).__REACT_GRAB__;
            if (api) api.activate();
          });
        },
        deactivate: async (): Promise<void> => {
          const currentPage = getActivePage();
          await currentPage.evaluate(() => {
            const api = (globalThis as { __REACT_GRAB__?: { deactivate: () => void } }).__REACT_GRAB__;
            if (api) api.deactivate();
          });
        },
        toggle: async (): Promise<void> => {
          const currentPage = getActivePage();
          await currentPage.evaluate(() => {
            const api = (globalThis as { __REACT_GRAB__?: { toggle: () => void } }).__REACT_GRAB__;
            if (api) api.toggle();
          });
        },
        isActive: async (): Promise<boolean> => {
          const currentPage = getActivePage();
          return currentPage.evaluate(() => {
            const api = (globalThis as { __REACT_GRAB__?: { isActive: () => boolean } }).__REACT_GRAB__;
            return api ? api.isActive() : false;
          });
        },
        copyElement: async (refId: string): Promise<boolean> => {
          const element = await ref(refId);
          if (!element) return false;
          const currentPage = getActivePage();
          return currentPage.evaluate((el) => {
            const api = (globalThis as { __REACT_GRAB__?: { copyElement: (elements: Element[]) => Promise<boolean> } }).__REACT_GRAB__;
            if (!api) return false;
            return api.copyElement([el as Element]);
          }, element);
        },
        getState: async (): Promise<unknown> => {
          const currentPage = getActivePage();
          return currentPage.evaluate(() => {
            const api = (globalThis as { __REACT_GRAB__?: { getState: () => unknown } }).__REACT_GRAB__;
            return api ? api.getState() : null;
          });
        },
      };

      const executeFunction = new Function(
        "page",
        "getActivePage",
        "snapshot",
        "ref",
        "fill",
        "drag",
        "dispatch",
        "grab",
        `return (async () => { ${code} })();`,
      );

      const result = await executeFunction(getActivePage(), getActivePage, snapshot, ref, fill, drag, dispatch, grab);
      await outputJson(true, result);
      process.exit(0);
    } catch (error) {
      await outputJson(false, undefined, error instanceof Error ? error.message : "Failed");
      process.exit(1);
    }
  });

const pages = new Command()
  .name("pages")
  .description("manage server pages")
  .option("-k, --kill <name>", "unregister a page (tab stays open)")
  .option("--kill-all", "unregister all pages")
  .action(async (options) => {
    const serverInfo = getServerInfo();
    if (!serverInfo || !(await isServerRunning())) {
      logger.error("Server not running. Start with 'browser start'");
      process.exit(1);
    }

    const serverUrl = `http://127.0.0.1:${serverInfo.port}`;

    if (options.killAll) {
      const pagesResponse = await fetch(`${serverUrl}/pages`);
      const pagesResult = await pagesResponse.json() as { pages: Array<{ name: string }> };
      for (const pageEntry of pagesResult.pages) {
        await fetch(`${serverUrl}/pages/${encodeURIComponent(pageEntry.name)}`, { method: "DELETE" });
        logger.success(`Unregistered ${pageEntry.name}`);
      }
      return;
    }

    if (options.kill) {
      const deleteResponse = await fetch(`${serverUrl}/pages/${encodeURIComponent(options.kill)}`, { method: "DELETE" });
      if (deleteResponse.ok) {
        logger.success(`Unregistered ${options.kill}`);
      } else {
        logger.error(`Page not found: ${options.kill}`);
      }
      return;
    }

    const pagesResponse = await fetch(`${serverUrl}/pages`);
    const pagesResult = await pagesResponse.json() as { pages: Array<{ name: string; url: string }> };

    if (pagesResult.pages.length === 0) {
      logger.dim("No pages");
      return;
    }

    for (const pageEntry of pagesResult.pages) {
      logger.log(`${highlighter.success("●")} ${pageEntry.name}: ${highlighter.dim(pageEntry.url)}`);
    }
  });

const BROWSER_HELP = `
Playwright automation with your real browser cookies. Pages persist across
executions. Output is always JSON: {ok, result, error, url, title, logs}

PERFORMANCE TIPS
  1. Batch multiple actions in a single execute call to minimize round-trips.
     Each execute spawns a new connection, so combining actions is 3-5x faster.

  2. Use compact format or limit depth for smaller snapshots (faster, fewer tokens).
     - snapshot({format: 'compact'})      -> minimal ref:role:name output
     - snapshot({interactableOnly: true}) -> only clickable/input elements
     - snapshot({maxDepth: 5})            -> limit tree depth

  # SLOW: 3 separate round-trips, full snapshot
  execute "await page.goto('https://example.com')"
  execute "await ref('e1').click()"
  execute "return await snapshot()"

  # FAST: 1 round-trip, compact output
  execute "
    await page.goto('https://example.com');
    await ref('e1').click();
    return await snapshot({format: 'compact'});
  "

HELPERS
  page              - Playwright Page object
  snapshot(opts?)   - Get ARIA accessibility tree with refs
                      opts.maxDepth: limit tree depth (e.g., 5)
                      opts.interactableOnly: only show elements with refs
                      opts.format: "yaml" (default) or "compact"
  ref(id)           - Get element by ref ID (chainable - supports all ElementHandle methods)
                      Example: await ref('e1').click()
                      Example: await ref('e1').getAttribute('data-foo')
  fill(id, text)    - Clear and fill input (works with rich text editors)
  drag(opts)        - Drag with custom MIME types
                      opts.from: source selector or ref ID (e.g., "e1" or "text=src")
                      opts.to: target selector or ref ID
                      opts.dataTransfer: { "mime/type": "value" }
  dispatch(opts)    - Dispatch custom events (drag, custom, etc)
                      opts.target: selector or ref ID
                      opts.event: event type name
                      opts.dataTransfer: for drag events
                      opts.detail: for CustomEvent
  ref(id).source()  - Get React component source file info for element
                      Returns { filePath, lineNumber, componentName } or null
  grab              - React Grab client API (activate, copyElement, etc)

SNAPSHOT FORMATS
  # Full YAML tree (default, can be large)
  execute "return await snapshot()"

  # Interactable only (recommended - much smaller!)
  execute "return await snapshot({interactableOnly: true})"

  # Compact format (minimal output: ref:role:name|ref:role:name)
  execute "return await snapshot({format: 'compact'})"

  # Combined options
  execute "return await snapshot({interactableOnly: true, maxDepth: 6})"

COMMON PATTERNS
  # Click by ref (chainable - no double await needed!)
  execute "await ref('e1').click()"

  # Get element attribute
  execute "return await ref('e1').getAttribute('data-id')"

  # Fill input (clears existing content)
  execute "await fill('e1', 'text')"

  # Drag with custom MIME types
  execute "await drag({
    from: 'text=src',
    to: '[contenteditable]',
    dataTransfer: { 'application/x-custom': 'data', 'text/plain': 'src' }
  })"

  # Dispatch custom event
  execute "await dispatch({
    target: '[contenteditable]',
    event: 'drop',
    dataTransfer: { 'application/x-custom': 'data' }
  })"

  # Get React component source file
  execute "return await ref('e1').source()"

  # Screenshot
  execute "await page.screenshot({path:'/tmp/shot.png'})"

  # Get page info
  execute "return {url: page.url(), title: await page.title()}"

  # CSS selector fallback (refs are now in DOM as aria-ref)
  execute "await page.click('[aria-ref=\"e1\"]')"

MULTI-PAGE SESSIONS
  execute "await page.goto('https://github.com')" --page github
  execute "return await snapshot({interactableOnly: true})" --page github

PLAYWRIGHT DOCS: https://playwright.dev/docs/api/class-page
`;

export const browser = new Command()
  .name("browser")
  .description("browser automation with persistent page state and real cookie injection")
  .addHelpText("after", BROWSER_HELP)
  .action(() => {
    browser.help();
  });

const mcp = new Command()
  .name("mcp")
  .description("start MCP server for browser automation (stdio transport)")
  .action(async () => {
    await startMcpServer();
  });

browser.addCommand(list);
browser.addCommand(dump);
browser.addCommand(start);
browser.addCommand(stop);
browser.addCommand(status);
browser.addCommand(execute);
browser.addCommand(pages);
browser.addCommand(mcp);
