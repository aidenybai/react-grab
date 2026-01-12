import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Page } from "playwright-core";
import { DEFAULT_NAVIGATION_TIMEOUT_MS } from "@react-grab/browser";
import {
  connectToBrowserPage,
  createMcpErrorResponse,
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

export const startMcpServer = async (): Promise<void> => {
  const server = new McpServer({
    name: "react-grab-browser",
    version: "1.0.0",
  });

  server.registerTool(
    "browser_snapshot",
    {
      description: `Get ARIA accessibility tree with element refs (e1, e2...) and React component info.

OUTPUT INCLUDES:
- ARIA roles and accessible names
- Element refs (e1, e2...) for interaction
- [component=ComponentName] for React components
- [source=file.tsx:line] for source location

SCREENSHOT STRATEGY - ALWAYS prefer element screenshots over full page:
1. First: Get refs with snapshot (this tool)
2. Then: Screenshot specific element via browser_execute: return await ref('e1').screenshot()

USE ELEMENT SCREENSHOTS (ref('eX').screenshot()) FOR:
- Visual bugs: "wrong color", "broken", "misaligned", "styling issue", "CSS bug"
- Appearance checks: "how does X look", "show me the button", "what does Y display"
- UI verification: "is it visible", "check the layout", "verify the design"
- Any visual concern about a SPECIFIC component

USE VIEWPORT screenshot=true ONLY FOR:
- "screenshot the page", "what's on screen"
- No specific element mentioned AND need visual context

PERFORMANCE:
- interactableOnly:true = much smaller output (recommended)
- format:'compact' = minimal ref:role:name@Component output
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
            "Viewport screenshot. For element screenshots (PREFERRED), use browser_execute: ref('eX').screenshot()",
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
      let browser: Awaited<ReturnType<typeof import("playwright-core").chromium.connectOverCDP>> | null = null;

      try {
        const connection = await connectToBrowserPage(pageName);
        browser = connection.browser;
        const activePage = connection.page;

        const getActivePage = (): Page => activePage;
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
        return createMcpErrorResponse(error);
      } finally {
        await browser?.close();
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
- snapshot(opts?): Get ARIA tree with React component info. opts: {maxDepth, interactableOnly, format}
- ref(id): Get element by ref ID, chainable with all ElementHandle methods
- ref(id).source(): Get React component source {filePath, lineNumber, componentName}
- ref(id).props(): Get React component props (serialized)
- ref(id).state(): Get React component state/hooks (serialized)
- component(name, opts?): Find elements by React component name. opts: {nth: number}
- fill(id, text): Clear and fill input (works with rich text editors)
- drag({from, to, dataTransfer?}): Drag with custom MIME types
- dispatch({target, event, dataTransfer?, detail?}): Dispatch custom events
- waitFor(target): Wait for selector/ref/state. e.g. waitFor('e1'), waitFor('networkidle')
- grab: React Grab client API (activate, deactivate, toggle, isActive, copyElement, getState)

REACT-SPECIFIC PATTERNS:
- Get React source: return await ref('e1').source()
- Get component props: return await ref('e1').props()
- Get component state: return await ref('e1').state()
- Find by component: const btn = await component('Button', {nth: 0})

ELEMENT SCREENSHOTS (PREFERRED for visual issues):
- return await ref('e1').screenshot()
Use for: wrong color, broken styling, visual bugs, "how does X look", UI verification

COMMON PATTERNS:
- Click: await ref('e1').click()
- Fill input: await fill('e1', 'hello')
- Get attribute: return await ref('e1').getAttribute('href')
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
      let browser: Awaited<ReturnType<typeof import("playwright-core").chromium.connectOverCDP>> | null = null;
      let pageOpenHandler: ((newPage: Page) => void) | null = null;
      const outputJson = createOutputJson(() => activePage, pageName);

      try {
        const connection = await connectToBrowserPage(pageName);
        browser = connection.browser;
        activePage = connection.page;

        if (url) {
          await activePage.goto(url, {
            waitUntil: "domcontentloaded",
            timeout,
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
          component,
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
      } finally {
        if (activePage && pageOpenHandler) {
          activePage.context().off("page", pageOpenHandler);
        }
        await browser?.close();
      }
    },
  );

  server.registerTool(
    "browser_react_tree",
    {
      description: `Get React component tree hierarchy (separate from ARIA tree).

Shows the React component structure with:
- Component names and nesting
- Source file locations
- Element refs where available
- Optional props (serialized)

Use this when you need to understand React component architecture rather than accessibility tree.
For interacting with elements, use browser_snapshot to get refs first.`,
      inputSchema: {
        page: z
          .string()
          .optional()
          .default("default")
          .describe("Named page context"),
        maxDepth: z.number().optional().default(50).describe("Maximum tree depth"),
        includeProps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include component props (increases output size)"),
      },
    },
    async ({ page: pageName, maxDepth, includeProps }) => {
      let browser: Awaited<ReturnType<typeof import("playwright-core").chromium.connectOverCDP>> | null = null;

      try {
        const connection = await connectToBrowserPage(pageName);
        browser = connection.browser;
        const activePage = connection.page;

        interface ComponentNode {
          name: string;
          depth: number;
          path: string;
          ref?: string;
          source?: string;
          props?: Record<string, unknown>;
        }

        const componentTree = await activePage.evaluate(
          async (opts: { maxDepth: number; includeProps: boolean }) => {
            type GetComponentTreeFn = (o: {
              maxDepth: number;
              includeProps: boolean;
            }) => Promise<ComponentNode[]>;

            const g = globalThis as { __REACT_GRAB_GET_COMPONENT_TREE__?: GetComponentTreeFn };
            if (!g.__REACT_GRAB_GET_COMPONENT_TREE__) {
              return [];
            }
            return g.__REACT_GRAB_GET_COMPONENT_TREE__(opts);
          },
          { maxDepth: maxDepth ?? 50, includeProps: includeProps ?? false },
        );

        const renderTree = (nodes: ComponentNode[]): string => {
          const lines: string[] = [];
          for (const node of nodes) {
            const indent = "  ".repeat(node.depth);
            let line = `${indent}- ${node.name}`;
            if (node.ref) line += ` [ref=${node.ref}]`;
            if (node.source) line += ` [source=${node.source}]`;
            if (node.props && Object.keys(node.props).length > 0) {
              const propsStr = JSON.stringify(node.props);
              if (propsStr.length < 100) {
                line += ` [props=${propsStr}]`;
              } else {
                line += ` [props=...]`;
              }
            }
            lines.push(line);
          }
          return lines.join("\n");
        };

        const treeOutput = renderTree(componentTree);

        return {
          content: [
            {
              type: "text" as const,
              text: treeOutput || "No React components found. Make sure react-grab is installed and the page uses React.",
            },
          ],
        };
      } catch (error) {
        return createMcpErrorResponse(error);
      } finally {
        await browser?.close();
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
