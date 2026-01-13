import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Browser, Page } from "playwright-core";
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
import {
  DEFAULT_COMPONENT_TREE_MAX_DEPTH,
  MAX_PROPS_DISPLAY_LENGTH,
} from "../utils/constants.js";

interface ComponentNode {
  name: string;
  depth: number;
  ref?: string;
  source?: string;
  props?: Record<string, unknown>;
}

export const startMcpServer = async (): Promise<void> => {
  const server = new McpServer({
    name: "react-grab-browser",
    version: "1.0.0",
  });

  server.registerTool(
    "browser_snapshot",
    {
      description: `Get ARIA accessibility tree with element refs and React component info.

OUTPUT FORMAT:
- button "Submit" [ref=e1] [component=Button] [source=form.tsx:42]
- ComponentName [ref=e2] [source=file.tsx:10]: text content

REACT INFO IS ALREADY INCLUDED (no extra calls needed):
- [component=X] — React component name (replaces "generic" when available)
- [source=file.tsx:line] — Source file location
Just parse these from the snapshot string.

FOR MORE REACT DETAILS on a specific element:
Use browser_execute: return await getRef('e1').source()
Returns: { filePath, lineNumber, componentName }

SCREENSHOT STRATEGY - prefer element screenshots:
1. First: Get refs with snapshot (this tool)
2. Then: Screenshot specific element via browser_execute: return await getRef('e1').screenshot()

USE ELEMENT SCREENSHOTS (getRef('eX').screenshot()) FOR:
- Visual bugs: "wrong color", "broken", "misaligned", "styling issue"
- Appearance checks: "how does X look", "show me the button"
- UI verification: "is it visible", "check the layout"

USE VIEWPORT screenshot=true ONLY FOR:
- "screenshot the page", "what's on screen"
- No specific element mentioned

After getting refs, use browser_execute with: getRef('e1').click()`,
      inputSchema: {
        page: z
          .string()
          .optional()
          .default("default")
          .describe("Named page context"),
        maxDepth: z.number().optional().describe("Limit tree depth"),
        screenshot: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Viewport screenshot. For element screenshots (PREFERRED), use browser_execute: getRef('eX').screenshot()",
          ),
        reactTree: z
          .boolean()
          .optional()
          .default(false)
          .describe("(Experimental) React tree view. Note: Regular snapshot already includes [component=X] and [source=X] - prefer that."),
        includeProps: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include props when reactTree=true"),
      },
    },
    async ({
      page: pageName,
      maxDepth,
      screenshot,
      reactTree,
      includeProps,
    }) => {
      let browser: Browser | null = null;

      try {
        const connection = await connectToBrowserPage(pageName);
        browser = connection.browser;
        const activePage = connection.page;

        let textResult: string;

        if (reactTree) {
          const componentTree = await activePage.evaluate(
            async (opts: { maxDepth: number; includeProps: boolean }) => {
              type GetSnapshotFn = () => Promise<unknown>;
              type GetComponentTreeFn = (o: {
                maxDepth: number;
                includeProps: boolean;
              }) => Promise<ComponentNode[]>;

              const g = globalThis as { 
                __REACT_GRAB_SNAPSHOT__?: GetSnapshotFn;
                __REACT_GRAB_GET_COMPONENT_TREE__?: GetComponentTreeFn;
              };
              
              if (g.__REACT_GRAB_SNAPSHOT__) {
                await g.__REACT_GRAB_SNAPSHOT__();
              }
              
              if (!g.__REACT_GRAB_GET_COMPONENT_TREE__) {
                return [];
              }
              return g.__REACT_GRAB_GET_COMPONENT_TREE__(opts);
            },
            { maxDepth: maxDepth ?? DEFAULT_COMPONENT_TREE_MAX_DEPTH, includeProps: includeProps ?? false },
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
                if (propsStr.length < MAX_PROPS_DISPLAY_LENGTH) {
                  line += ` [props=${propsStr}]`;
                }
              }
              lines.push(line);
            }
            return lines.join("\n");
          };

          textResult = renderTree(componentTree) || "No React components found. Make sure react-grab is installed and the page uses React.";
        } else {
          textResult = await createSnapshotHelper(() => activePage)({ maxDepth });
        }

        if (screenshot) {
          const screenshotBuffer = await activePage.screenshot({
            fullPage: false,
            scale: "css",
          });
          return {
            content: [
              { type: "text", text: textResult },
              {
                type: "image",
                data: screenshotBuffer.toString("base64"),
                mimeType: "image/png",
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: textResult }],
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

IMPORTANT: Always call getSnapshot() first to get element refs (e1, e2...), then use getRef('e1') to interact.

AVAILABLE HELPERS:
- page: Playwright Page object
- getSnapshot(opts?): Get ARIA tree with React info. opts: {maxDepth}
- getRef(id): Get element by ref ID, chainable with ElementHandle methods
- getRef(id).source(): Get React source {filePath, lineNumber, componentName}
- getRef(id).props(): Get React component props
- getRef(id).state(): Get React component state/hooks
- fill(id, text): Clear and fill input
- drag({from, to, dataTransfer?}): Drag with custom MIME types
- dispatch({target, event, dataTransfer?, detail?}): Dispatch custom events
- waitFor(target): Wait for selector/ref/state. e.g. waitFor('e1'), waitFor('networkidle')
- grab: React Grab client API (activate, deactivate, toggle, isActive, copyElement, getState)

GETTING REACT INFO (ranked by preference):
1. Parse snapshot — [component=X] and [source=file:line] are already in the output
2. getRef('eX').source() — for detailed info on a specific element

ELEMENT SCREENSHOTS (for visual issues):
- return await getRef('e1').screenshot()
Use for: wrong color, broken styling, visual bugs, UI verification

COMMON PATTERNS:
- Click: await getRef('e1').click()
- Fill input: await fill('e1', 'hello')
- Get attribute: return await getRef('e1').getAttribute('href')
- Navigate: await page.goto('https://example.com')

DON'T manually traverse __reactFiber$ — use getRef('eX').source() instead.

PERFORMANCE: Batch multiple actions in one execute call.`,
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
      let browser: Browser | null = null;
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

        const getSnapshot = createSnapshotHelper(getActivePage);
        const getRef = createRefHelper(getActivePage);
        const fill = createFillHelper(getRef, getActivePage);
        const drag = createDragHelper(getActivePage);
        const dispatch = createDispatchHelper(getActivePage);
        const grab = createGrabHelper(getRef, getActivePage);
        const waitFor = createWaitForHelper(getActivePage);
        const component = createComponentHelper(getActivePage);

        const executeFunction = new Function(
          "page",
          "getActivePage",
          "getSnapshot",
          "getRef",
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
          getSnapshot,
          getRef,
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
              { type: "text", text: JSON.stringify(output) },
              {
                type: "image",
                data: result.toString("base64"),
                mimeType: "image/png",
              },
            ],
          };
        }

        const output = await outputJson(true, result);

        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
        };
      } catch (error) {
        const output = await outputJson(
          false,
          undefined,
          error instanceof Error ? error.message : "Failed",
        );

        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
