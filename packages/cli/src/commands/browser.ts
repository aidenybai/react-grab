import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import { chromium, type Page } from "playwright-core";
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
  deleteServerInfo,
  installLinuxDeps,
  isLinux,
} from "@react-grab/browser";
import { logger } from "../utils/logger.js";
import { spinner } from "../utils/spinner.js";
import {
  getOrCreatePage,
  ensureHealthyServer,
  createSnapshotHelper,
  createRefHelper,
  createFillHelper,
  createDragHelper,
  createDispatchHelper,
  createGrabHelper,
  createWaitForHelper,
  createOutputJson,
  createActivePageGetter,
  createComponentHelper,
} from "../utils/browser-automation.js";
import { startMcpServer } from "./browser-mcp.js";

const VERSION = process.env.VERSION ?? "0.0.1";

const printHeader = (): void => {
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`,
  );
  console.log();
};

const exitWithError = (error: unknown): never => {
  logger.error(error instanceof Error ? error.message : "Failed");
  process.exit(1);
};

const rebuildNativeModuleAndRestart = async (browserPkgDir: string): Promise<void> => {
  execSync("npm rebuild better-sqlite3", {
    stdio: "ignore",
    cwd: browserPkgDir,
  });

  const rebuildSpinner = spinner("Restarting server").start();
  rebuildSpinner.succeed("Restarting server");

  const args = process.argv.slice(2);
  const child = spawn(process.argv[0], [process.argv[1], ...args], {
    stdio: "inherit",
    detached: false,
  });
  child.on("error", (error) => {
    console.error(`Failed to restart: ${error.message}`);
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
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

const list = new Command()
  .name("list")
  .description("list installed browsers")
  .action(() => {
    printHeader();
    const browsers = findInstalledBrowsers();
    if (browsers.length === 0) {
      logger.warn("No supported browsers found.");
      return;
    }
    for (const browserName of browsers) {
      logger.log(`  ${BROWSER_DISPLAY_NAMES[browserName]}`);
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
    if (!opts.json) printHeader();
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

      logger.success(`Found ${cookies.length} cookies`);
      for (const cookie of cookies.slice(0, COOKIE_PREVIEW_LIMIT)) {
        logger.dim(`  ${cookie.hostKey}: ${cookie.name}`);
      }
      if (cookies.length > COOKIE_PREVIEW_LIMIT) {
        logger.dim(`  ... and ${cookies.length - COOKIE_PREVIEW_LIMIT} more`);
      }
    } catch (error) {
      exitWithError(error);
    }
  });

const start = new Command()
  .name("start")
  .description("start browser server manually (auto-starts on first execute)")
  .option("-p, --port <port>", "HTTP API port", String(DEFAULT_SERVER_PORT))
  .option("--headed", "show browser window (default is headless)")
  .option("-b, --browser <browser>", "source browser for cookies (chrome, edge, brave, arc)")
  .option("-d, --domain <domain>", "only load cookies matching this domain")
  .option("--foreground", "run in foreground instead of detaching")
  .action(async (options) => {
    printHeader();

    if (await isServerRunning()) {
      const info = getServerInfo();
      logger.error(`Server already running on port ${info?.port}`);
      process.exit(1);
    }

    const sourceBrowser = resolveSourceBrowser(options.browser);
    const port = parseInt(options.port, 10);

    if (!options.foreground) {
      const serverSpinner = spinner("Starting server").start();
      try {
        const browserServer = await spawnServer({
          port,
          headless: !options.headed,
          cliPath: process.argv[1],
          browser: options.browser,
          domain: options.domain,
        });
        serverSpinner.succeed(`Server running on port ${browserServer.port}`);
        logger.dim(`CDP: ${browserServer.wsEndpoint}`);
      } catch (error) {
        serverSpinner.fail();
        exitWithError(error);
      }
      return;
    }

    const serverSpinner = spinner("Starting server").start();

    try {
      const browserServer = await serve({
        port,
        headless: !options.headed,
      });

      serverSpinner.succeed(`Server running on port ${browserServer.port}`);
      logger.dim(`CDP: ${browserServer.wsEndpoint}`);
      const cookieSpinner = spinner("Loading cookies").start();
      try {
        const cookies = dumpCookies(sourceBrowser, { domain: options.domain });
        const playwrightCookies = toPlaywrightCookies(cookies);

        const browser = await chromium.connectOverCDP(browserServer.wsEndpoint);
        const contexts = browser.contexts();
        if (contexts.length > 0) {
          if (playwrightCookies.length > 0) {
            await contexts[0].addCookies(playwrightCookies);
          }
          await applyStealthScripts(contexts[0]);
        }
        await browser.close();
        cookieSpinner.succeed(`Loaded ${playwrightCookies.length} cookies from ${sourceBrowser}`);
      } catch (cookieError) {
        const errorMessage = cookieError instanceof Error ? cookieError.message : "Unknown error";
        const isModuleVersionError = errorMessage.includes("NODE_MODULE_VERSION");

        if (!isModuleVersionError) {
          cookieSpinner.fail(`Failed to load cookies from ${sourceBrowser}`);
        } else {
          cookieSpinner.info("Native module mismatch. Rebuilding...");
          try {
            const require = createRequire(import.meta.url);
            const browserPkgPath = require.resolve("@react-grab/browser");
            const browserPkgDir = join(dirname(browserPkgPath), "..");

            await browserServer.stop();
            await rebuildNativeModuleAndRestart(browserPkgDir);
            return;
          } catch {
            cookieSpinner.fail("Auto-rebuild failed. Run: npm rebuild better-sqlite3");
          }
        }
      }
      spinner("Server ready. Press Ctrl+C to stop.").succeed();

      const shutdownHandler = (): void => {
        browserServer.stop().catch(() => {}).finally(() => process.exit(0));
      };
      process.on("SIGINT", shutdownHandler);
      process.on("SIGTERM", shutdownHandler);
      process.on("SIGHUP", shutdownHandler);

      await new Promise(() => {});
    } catch (error) {
      serverSpinner.fail();
      exitWithError(error);
    }
  });

const stop = new Command()
  .name("stop")
  .description("stop the browser server")
  .action(async () => {
    printHeader();
    const info = getServerInfo();
    if (!info) {
      logger.log("No server running");
      return;
    }

    try {
      process.kill(info.pid, "SIGTERM");
      deleteServerInfo();
      logger.success("Server stopped");
    } catch {
      deleteServerInfo();
      logger.log("Server was not running");
    }
  });

const status = new Command()
  .name("status")
  .description("check server status")
  .option("-j, --json", "output structured JSON: {running, port, pages}", false)
  .action(async (options) => {
    const jsonMode = options.json as boolean;
    if (!jsonMode) printHeader();

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
        logger.success(`Server running on port ${info?.port}`);
        if (pagesData.length > 0) {
          logger.break();
          logger.info("Pages:");
          for (const page of pagesData) {
            logger.dim(`  ${page.name}: ${page.url}`);
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
        logger.log("Server not running");
      }
    }
  });

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

    let activePage: Page | null = null;
    let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
    let pageOpenHandler: ((newPage: Page) => void) | null = null;
    const buildOutput = createOutputJson(() => activePage, pageName);
    let exitCode = 0;

    try {
      const { serverUrl } = await ensureHealthyServer({
        browser: options.browser,
        domain: options.domain,
      });
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
      pageOpenHandler = (newPage: Page) => {
        activePage = newPage;
      };
      context.on("page", pageOpenHandler);

      const getActivePage = createActivePageGetter(context, () => activePage);

      const snapshot = createSnapshotHelper(getActivePage);
      const ref = createRefHelper(getActivePage);
      const fill = createFillHelper(ref, getActivePage);
      const drag = createDragHelper(getActivePage);
      const dispatch = createDispatchHelper(getActivePage);
      const grab = createGrabHelper(ref, getActivePage);
      const waitFor = createWaitForHelper(getActivePage);
      const component = createComponentHelper(getActivePage);

      const executeFunction = new Function(
        "page",
        "getActivePage",
        "snapshot",
        "ref",
        "fill",
        "drag",
        "dispatch",
        "grab",
        "waitFor",
        "component",
        `return (async () => { ${code} })();`,
      );

      const result = await executeFunction(getActivePage(), getActivePage, snapshot, ref, fill, drag, dispatch, grab, waitFor, component);
      console.log(JSON.stringify(await buildOutput(true, result)));
    } catch (error) {
      console.log(JSON.stringify(await buildOutput(false, undefined, error instanceof Error ? error.message : "Failed")));
      exitCode = 1;
    } finally {
      if (activePage && pageOpenHandler) {
        activePage.context().off("page", pageOpenHandler);
      }
      await browser?.close();
    }
    process.exit(exitCode);
  });

const pages = new Command()
  .name("pages")
  .description("manage server pages")
  .option("-k, --kill <name>", "unregister a page (tab stays open)")
  .option("--kill-all", "unregister all pages")
  .action(async (options) => {
    printHeader();
    const serverInfo = getServerInfo();
    if (!serverInfo || !(await isServerRunning())) {
      logger.log("Server not running. Start with 'browser start'");
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
      logger.info("No pages");
      return;
    }

    for (const pageEntry of pagesResult.pages) {
      logger.log(`  ${pageEntry.name}`);
      logger.dim(`    ${pageEntry.url}`);
    }
  });

const BROWSER_HELP = `
Playwright automation with your real browser cookies. Pages persist across
executions. Output is always JSON: {ok, result, error, url, title, logs}

PERFORMANCE TIPS
  1. Batch multiple actions in a single execute call to minimize round-trips.
     Each execute spawns a new connection, so combining actions is 3-5x faster.

  2. Use interactableOnly or limit depth for smaller snapshots (faster, fewer tokens).
     - snapshot({interactableOnly: true}) -> only clickable/input elements
     - snapshot({maxDepth: 5})            -> limit tree depth

  # SLOW: 3 separate round-trips, full snapshot
  execute "await page.goto('https://example.com')"
  execute "await ref('e1').click()"
  execute "return await snapshot()"

  # FAST: 1 round-trip, interactable only
  execute "
    await page.goto('https://example.com');
    await ref('e1').click();
    return await snapshot({interactableOnly: true});
  "

HELPERS
  page              - Playwright Page object
  snapshot(opts?)   - Get ARIA accessibility tree with refs
                      opts.maxDepth: limit tree depth (e.g., 5)
                      opts.interactableOnly: only clickable/input elements
  ref(id)           - Get element by ref ID (chainable - supports all ElementHandle methods)
                      Example: await ref('e1').click()
                      Example: await ref('e1').getAttribute('data-foo')
  ref(id).source()  - Get React component source file info for element
                      Returns { filePath, lineNumber, componentName } or null
  ref(id).props()   - Get React component props (serialized)
  ref(id).state()   - Get React component state/hooks (serialized)
  component(name, opts?) - Find elements by React component name
                      opts.nth: get the nth matching element (0-indexed)
                      Example: await component('Button', {nth: 0})
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
  waitFor(target)   - Wait for selector, ref, or page state
                      await waitFor('e1')           - wait for ref to appear
                      await waitFor('.btn')         - wait for selector
                      await waitFor('networkidle')  - wait for network idle
                      await waitFor('load')         - wait for page load
  grab              - React Grab client API (activate, copyElement, etc)

SNAPSHOT OPTIONS
  # Full YAML tree (default, can be large)
  execute "return await snapshot()"

  # Interactable only (recommended - much smaller!)
  execute "return await snapshot({interactableOnly: true})"

  # With depth limit
  execute "return await snapshot({interactableOnly: true, maxDepth: 6})"

SCREENSHOTS - PREFER ELEMENT OVER FULL PAGE
  For visual issues (wrong color, broken styling, misalignment), ALWAYS screenshot
  the specific element instead of the full page. Element screenshots are:
  - Faster (smaller image)
  - More precise (shows exactly what's wrong)
  - Easier to compare

  # Element screenshot (PREFERRED)
  execute "await ref('e1').screenshot({path: '/tmp/button.png'})"
  execute "await ref('e5').screenshot({path: '/tmp/card.png'})"

  # Full page (only when needed)
  execute "await page.screenshot({path: '/tmp/full.png'})"

  Use element screenshots for: color bugs, styling issues, broken UI, "how does X look"
  Use full page only for: layout overview, "screenshot entire page"

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

  # Get page info
  execute "return {url: page.url(), title: await page.title()}"

  # CSS selector fallback (refs are now in DOM as aria-ref)
  execute "await page.click('[aria-ref=\"e1\"]')"

REACT-SPECIFIC PATTERNS
  # Get React component source file
  execute "return await ref('e1').source()"

  # Get component props
  execute "return await ref('e1').props()"

  # Get component state
  execute "return await ref('e1').state()"

  # Find elements by React component name
  execute "const buttons = await component('Button'); return buttons.length"

  # Get the first Button component and click it
  execute "const btn = await component('Button', {nth: 0}); await btn.click()"

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

const install = new Command()
  .name("install")
  .description("install Chromium browser and optionally system dependencies")
  .option("--with-deps", "install Linux system dependencies (requires sudo)")
  .action(async (options) => {
    printHeader();

    if (options.withDeps) {
      if (!isLinux()) {
        logger.info("System dependencies only needed on Linux, skipping...");
      } else {
        const depsSpinner = spinner("Installing system dependencies").start();
        const result = installLinuxDeps();
        if (result.success) {
          depsSpinner.succeed(result.message);
        } else {
          depsSpinner.fail(result.message);
          if (!result.message.includes("only needed")) {
            logger.warn("Continuing with browser installation anyway...");
          }
        }
      }
    } else if (isLinux()) {
      logger.dim("Tip: If browser fails to launch, run with --with-deps");
    }

    const browserSpinner = spinner("Installing Chromium browser").start();

    try {
      const require = createRequire(import.meta.url);
      const playwrightCorePath = require.resolve("playwright-core");
      const playwrightCli = join(dirname(playwrightCorePath), "cli.js");

      execSync(`${process.execPath} "${playwrightCli}" install chromium`, {
        stdio: "inherit",
      });

      browserSpinner.succeed("Chromium installed successfully");
    } catch {
      browserSpinner.fail("Failed to install Chromium");
      logger.error("Try running manually: npx playwright install chromium");
      process.exit(1);
    }
  });

browser.addCommand(install);
browser.addCommand(list);
browser.addCommand(dump);
browser.addCommand(start);
browser.addCommand(stop);
browser.addCommand(status);
browser.addCommand(execute);
browser.addCommand(pages);
browser.addCommand(mcp);
