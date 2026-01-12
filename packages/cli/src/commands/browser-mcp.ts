import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, type Page } from "playwright-core";
import {
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  findPageByTargetId,
} from "@react-grab/browser";
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
} from "../utils/browser-automation.js";

export const startMcpServer = async (): Promise<void> => {
  const server = new McpServer({
    name: "react-grab-browser",
    version: "1.0.0",
  });

  server.registerTool(
    "browser_snapshot",
    {
      description: `Get ARIA accessibility tree with element refs (e1, e2...).

SCREENSHOT STRATEGY - ALWAYS prefer element screenshots over full page:
1. First: Get refs with snapshot (this tool)
2. Then: Screenshot specific element via browser_execute: return await ref('e1').screenshot()

USE ELEMENT SCREENSHOTS (ref('eX').screenshot()) FOR:
- Visual bugs: "wrong color", "broken", "misaligned", "styling issue", "CSS bug"
- Appearance checks: "how does X look", "show me the button", "what does Y display"
- UI verification: "is it visible", "check the layout", "verify the design"
- Any visual concern about a SPECIFIC component

USE FULL PAGE screenshot=true ONLY FOR:
- "screenshot the whole page", "full page", "entire screen"
- No specific element mentioned AND need visual context

PERFORMANCE:
- interactableOnly:true = much smaller output (recommended)
- format:'compact' = minimal ref:role:name output
- maxDepth = limit tree depth

After getting refs, use browser_execute with: ref('e1').click()`,
      inputSchema: {
        page: z
          .string()
          .optional()
          .default("default")
          .describe("Named page context"),
        maxDepth: z.number().optional().describe("Limit tree depth"),
        interactableOnly: z
          .boolean()
          .optional()
          .describe("Only clickable/input elements (recommended)"),
        format: z
          .enum(["yaml", "compact"])
          .optional()
          .default("yaml")
          .describe("'yaml' or 'compact'"),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Full page only. For element screenshots (PREFERRED), use browser_execute: ref('eX').screenshot()",
          ),
      },
    },
    async ({
      page: pageName,
      maxDepth,
      interactableOnly,
      format,
      screenshot,
    }) => {
      let activePage: Page | null = null;

      try {
        const { serverUrl } = await ensureHealthyServer();
        const pageInfo = await getOrCreatePage(serverUrl, pageName);

        const browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
        activePage = await findPageByTargetId(browser, pageInfo.targetId);

        if (!activePage) {
          throw new Error(`Page "${pageName}" not found`);
        }

        const getActivePage = (): Page => activePage!;
        const snapshot = createSnapshotHelper(getActivePage);

        const snapshotResult = await snapshot({ maxDepth, interactableOnly, format });

        if (screenshot) {
          const screenshotBuffer = await activePage.screenshot({
            fullPage: false,
            scale: "css",
          });
          return {
            content: [
              { type: "text" as const, text: snapshotResult },
              {
                type: "image" as const,
                data: screenshotBuffer.toString("base64"),
                mimeType: "image/png",
              },
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
    },
  );

  server.registerTool(
    "browser_execute",
    {
      description: `Execute Playwright code with helpers for element interaction.

IMPORTANT: Always call snapshot() first to get element refs from the a11y tree (e1, e2...), then use ref('e1') to interact.

AVAILABLE HELPERS:
- page: Playwright Page object (https://playwright.dev/docs/api/class-page)
- snapshot(opts?): Get ARIA tree. opts: {maxDepth, interactableOnly, format}
- ref(id): Get element by ref ID, chainable with all ElementHandle methods
- fill(id, text): Clear and fill input (works with rich text editors)
- drag({from, to, dataTransfer?}): Drag with custom MIME types
- dispatch({target, event, dataTransfer?, detail?}): Dispatch custom events
- waitFor(target): Wait for selector/ref/state. e.g. waitFor('e1'), waitFor('networkidle')
- grab: React Grab client API (activate, deactivate, toggle, isActive, copyElement, getState)

ELEMENT SCREENSHOTS (PREFERRED for visual issues):
- return await ref('e1').screenshot()
- return await ref('e2').screenshot()
Use for: wrong color, broken styling, visual bugs, "how does X look", UI verification
Returns image directly - no file path needed.

COMMON PATTERNS:
- Click: await ref('e1').click()
- Fill input: await fill('e1', 'hello')
- Get attribute: return await ref('e1').getAttribute('href')
- Get React source: return await ref('e1').source()
- Navigate: await page.goto('https://example.com')
- Full page screenshot (rare): return await page.screenshot()

PERFORMANCE: Batch multiple actions in one execute call to minimize round-trips.`,
      inputSchema: {
        code: z
          .string()
          .describe(
            "JavaScript code. Use 'page' for Playwright, 'ref(id)' for elements, 'return' for output",
          ),
        page: z
          .string()
          .optional()
          .default("default")
          .describe("Named page context for multi-turn sessions"),
        url: z
          .string()
          .optional()
          .describe("Navigate to URL before executing code"),
        timeout: z
          .number()
          .optional()
          .default(DEFAULT_NAVIGATION_TIMEOUT_MS)
          .describe("Navigation timeout in ms"),
      },
    },
    async ({ code, page: pageName, url, timeout }) => {
      let activePage: Page | null = null;
      const outputJson = createOutputJson(() => activePage, pageName);

      try {
        const { serverUrl } = await ensureHealthyServer();
        const pageInfo = await getOrCreatePage(serverUrl, pageName);

        const browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
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

        const getActivePage = createActivePageGetter(context, () => activePage);

        const snapshot = createSnapshotHelper(getActivePage);
        const ref = createRefHelper(getActivePage);
        const fill = createFillHelper(ref, getActivePage);
        const drag = createDragHelper(getActivePage);
        const dispatch = createDispatchHelper(getActivePage);
        const grab = createGrabHelper(ref, getActivePage);
        const waitFor = createWaitForHelper(getActivePage);

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
          `return (async () => { ${code} })();`,
        );

        const result = await executeFunction(
          getActivePage(),
          getActivePage,
          snapshot,
          ref,
          fill,
          drag,
          dispatch,
          grab,
          waitFor,
        );

        if (Buffer.isBuffer(result)) {
          const output = await outputJson(true, undefined);
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(output) },
              {
                type: "image" as const,
                data: result.toString("base64"),
                mimeType: "image/png",
              },
            ],
          };
        }

        const output = await outputJson(true, result);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
        };
      } catch (error) {
        const output = await outputJson(
          false,
          undefined,
          error instanceof Error ? error.message : "Failed",
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
