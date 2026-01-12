import type { Page, ElementHandle, BrowserContext } from "playwright-core";
import {
  getSnapshotScript,
  getServerInfo,
  isServerRunning,
  isServerHealthy,
  stopServer,
  spawnServer,
} from "@react-grab/browser";
import { COMPONENT_STACK_MAX_DEPTH } from "./constants.js";

export interface PageInfo {
  name: string;
  targetId: string;
  url: string;
  wsEndpoint: string;
}

export interface ReactContextInfo {
  element?: string;
  component?: string;
  source?: string;
  componentStack?: string[];
}

export interface ExecuteResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  url: string;
  title: string;
  page?: string;
  reactContext?: ReactContextInfo;
}

export interface SourceInfo {
  filePath: string;
  lineNumber: number | null;
  componentName: string | null;
}

export interface SnapshotOptions {
  maxDepth?: number;
  interactableOnly?: boolean;
  format?: "yaml" | "compact";
}

export interface EnsureServerOptions {
  browser?: string;
  domain?: string;
}

export const ensureHealthyServer = async (
  options: EnsureServerOptions = {},
): Promise<{ serverUrl: string }> => {
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

export const getOrCreatePage = async (
  serverUrl: string,
  name: string,
): Promise<PageInfo> => {
  const response = await fetch(`${serverUrl}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get page: ${await response.text()}`);
  }
  return response.json() as Promise<PageInfo>;
};

export const getReactContextForActiveElement = async (
  page: Page,
): Promise<ReactContextInfo | null> => {
  try {
    return page.evaluate(async (maxDepth: number) => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement === document.body) return null;

      const reactGrab = (globalThis as { __REACT_GRAB__?: { getSource: (e: Element) => Promise<{ filePath: string; lineNumber: number | null; componentName: string | null } | null> } }).__REACT_GRAB__;
      if (!reactGrab?.getSource) return null;

      const source = await reactGrab.getSource(activeElement);
      if (!source) return null;

      const componentStack: string[] = [];
      if (source.componentName) {
        componentStack.push(source.componentName);
      }

      const fiberKey = Object.keys(activeElement).find(
        (key) => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"),
      );
      if (fiberKey) {
        type Fiber = { return?: Fiber; type?: { displayName?: string; name?: string } | string; tag?: number };
        let fiber = (activeElement as unknown as Record<string, Fiber>)[fiberKey];
        let depth = 0;
        while (fiber?.return && depth < maxDepth) {
          fiber = fiber.return;
          if (fiber.tag === 0 || fiber.tag === 1 || fiber.tag === 11) {
            const name = typeof fiber.type === "object"
              ? fiber.type?.displayName || fiber.type?.name
              : null;
            if (name && !name.startsWith("_") && !componentStack.includes(name)) {
              componentStack.push(name);
            }
          }
          depth++;
        }
      }

      return {
        element: activeElement.tagName.toLowerCase(),
        component: source.componentName || undefined,
        source: source.filePath
          ? `${source.filePath}${source.lineNumber ? `:${source.lineNumber}` : ""}`
          : undefined,
        componentStack: componentStack.length > 0 ? componentStack : undefined,
      };
    }, COMPONENT_STACK_MAX_DEPTH);
  } catch {
    return null;
  }
};

export const createOutputJson = (
  getPage: () => Page | null,
  pageName: string,
): ((ok: boolean, result?: unknown, error?: string) => Promise<ExecuteResult>) => {
  return async (ok, result, error) => {
    const page = getPage();
    let reactContext: ReactContextInfo | undefined;

    if (page && ok) {
      const context = await getReactContextForActiveElement(page);
      if (context) {
        reactContext = context;
      }
    }

    return {
      ok,
      url: page?.url() ?? "",
      title: page ? await page.title().catch(() => "") : "",
      page: pageName,
      ...(result !== undefined && { result }),
      ...(error && { error }),
      ...(reactContext && { reactContext }),
    };
  };
};

export const resolveSelector = (target: string): string => {
  if (/^e\d+$/.test(target)) {
    return `[aria-ref="${target}"]`;
  }
  return target;
};

export const createSnapshotHelper = (
  getActivePage: () => Page,
): ((options?: SnapshotOptions) => Promise<string>) => {
  const snapshotScript = getSnapshotScript();

  return async (options?: SnapshotOptions): Promise<string> => {
    const currentPage = getActivePage();
    return currentPage.evaluate(
      ({ script, opts }: { script: string; opts?: SnapshotOptions }) => {
        const g = globalThis as { __REACT_GRAB_SNAPSHOT__?: (o?: unknown) => string };
        if (!g.__REACT_GRAB_SNAPSHOT__) {
          eval(script);
        }
        return g.__REACT_GRAB_SNAPSHOT__!(opts);
      },
      { script: snapshotScript, opts: options },
    );
  };
};

export interface ComponentMatch {
  element: Element;
  source: SourceInfo;
}

export interface ComponentOptions {
  nth?: number;
}

export type ComponentFunction = (
  componentName: string,
  options?: ComponentOptions,
) => Promise<ElementHandle | ElementHandle[] | null>;

export type RefFunction = (
  refId: string,
) => ElementHandle &
  PromiseLike<ElementHandle> & {
    source: () => Promise<SourceInfo | null>;
    props: () => Promise<Record<string, unknown> | null>;
    state: () => Promise<unknown[] | null>;
  };

export const createRefHelper = (getActivePage: () => Page): RefFunction => {
  const getElement = async (refId: string): Promise<ElementHandle> => {
    const currentPage = getActivePage();
    const elementHandle = await currentPage.evaluateHandle((id: string) => {
      const g = globalThis as { __REACT_GRAB_REFS__?: Record<string, Element> };
      const refs = g.__REACT_GRAB_REFS__;
      if (!refs) {
        throw new Error("No refs found. Call snapshot() first.");
      }
      const element = refs[id];
      if (!element) {
        throw new Error(
          `Ref "${id}" not found. Available refs: ${Object.keys(refs).join(", ")}`,
        );
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

  const getSource = async (refId: string): Promise<SourceInfo | null> => {
    const element = await getElement(refId);
    const currentPage = getActivePage();
    return currentPage.evaluate((el) => {
      const g = globalThis as { __REACT_GRAB__?: { getSource: (e: Element) => SourceInfo | null } };
      if (!g.__REACT_GRAB__) return null;
      return g.__REACT_GRAB__.getSource(el as Element);
    }, element);
  };

  const getProps = async (refId: string): Promise<Record<string, unknown> | null> => {
    const element = await getElement(refId);
    const currentPage = getActivePage();
    return currentPage.evaluate((el) => {
      const g = globalThis as { __REACT_GRAB_GET_PROPS__?: (e: Element) => Record<string, unknown> | null };
      if (!g.__REACT_GRAB_GET_PROPS__) return null;
      return g.__REACT_GRAB_GET_PROPS__(el as Element);
    }, element);
  };

  const getState = async (refId: string): Promise<unknown[] | null> => {
    const element = await getElement(refId);
    const currentPage = getActivePage();
    return currentPage.evaluate((el) => {
      const g = globalThis as { __REACT_GRAB_GET_STATE__?: (e: Element) => unknown[] | null };
      if (!g.__REACT_GRAB_GET_STATE__) return null;
      return g.__REACT_GRAB_GET_STATE__(el as Element);
    }, element);
  };

  // HACK: Use Proxy to make ref() chainable with ElementHandle methods without awaiting first
  return (refId: string) => {
    return new Proxy(
      {} as ElementHandle &
        PromiseLike<ElementHandle> & {
          source: () => Promise<SourceInfo | null>;
          props: () => Promise<Record<string, unknown> | null>;
          state: () => Promise<unknown[] | null>;
        },
      {
        get(_, prop: string) {
          if (prop === "then") {
            return (
              resolve: (value: ElementHandle) => void,
              reject: (error: Error) => void,
            ) => getElement(refId).then(resolve, reject);
          }
          if (prop === "source") {
            return () => getSource(refId);
          }
          if (prop === "props") {
            return () => getProps(refId);
          }
          if (prop === "state") {
            return () => getState(refId);
          }
          if (prop === "screenshot") {
            return (options?: Record<string, unknown>) =>
              getElement(refId).then((el) =>
                el.screenshot({ scale: "css", ...options }),
              );
          }
          return (...args: unknown[]) =>
            getElement(refId).then((el) =>
              (el as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args),
            );
        },
      },
    );
  };
};

export const createComponentHelper = (
  getActivePage: () => Page,
): ComponentFunction => {
  return async (
    componentName: string,
    options?: ComponentOptions,
  ): Promise<ElementHandle | ElementHandle[] | null> => {
    const currentPage = getActivePage();
    const nth = options?.nth;

    const elementHandles = await currentPage.evaluateHandle(
      async (args: { name: string; nth: number | undefined }) => {
        type FindByComponentFn = (
          n: string,
          o?: { nth?: number },
        ) => Promise<Array<{ element: Element }> | { element: Element } | null>;

        const g = globalThis as { __REACT_GRAB_FIND_BY_COMPONENT__?: FindByComponentFn };
        if (!g.__REACT_GRAB_FIND_BY_COMPONENT__) {
          throw new Error("React introspection not available. Make sure react-grab is installed.");
        }
        const result = await g.__REACT_GRAB_FIND_BY_COMPONENT__(args.name, args.nth !== undefined ? { nth: args.nth } : undefined);
        if (!result) return null;
        if (args.nth !== undefined) {
          const single = result as { element: Element };
          return single?.element || null;
        }
        const arr = result as Array<{ element: Element }>;
        return arr.map((m) => m.element);
      },
      { name: componentName, nth },
    );

    const value = await elementHandles.jsonValue().catch(() => null);
    if (value === null) {
      await elementHandles.dispose();
      return null;
    }

    if (nth !== undefined) {
      const element = elementHandles.asElement();
      if (!element) {
        await elementHandles.dispose();
        return null;
      }
      return element;
    }

    const jsHandles = await elementHandles.getProperties();
    const handles: ElementHandle[] = [];
    for (const [, handle] of jsHandles) {
      const element = handle.asElement();
      if (element) handles.push(element);
    }
    await elementHandles.dispose();
    return handles;
  };
};

export const createFillHelper = (
  ref: RefFunction,
  getActivePage: () => Page,
): ((refId: string, text: string) => Promise<void>) => {
  return async (refId: string, text: string): Promise<void> => {
    const element = await ref(refId);
    await element.click();
    const currentPage = getActivePage();
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await currentPage.keyboard.press(`${modifier}+a`);
    await currentPage.keyboard.type(text);
  };
};

export interface DragOptions {
  from: string;
  to: string;
  dataTransfer?: Record<string, string>;
}

export const createDragHelper = (
  getActivePage: () => Page,
): ((options: DragOptions) => Promise<void>) => {
  return async (options: DragOptions): Promise<void> => {
    const currentPage = getActivePage();
    const { from, to, dataTransfer = {} } = options;
    const fromSelector = resolveSelector(from);
    const toSelector = resolveSelector(to);

    await currentPage.evaluate(
      ({
        fromSel,
        toSel,
        data,
      }: {
        fromSel: string;
        toSel: string;
        data: Record<string, string>;
      }) => {
        const fromElement = document.querySelector(fromSel);
        const toElement = document.querySelector(toSel);
        if (!fromElement) throw new Error(`Source element not found: ${fromSel}`);
        if (!toElement) throw new Error(`Target element not found: ${toSel}`);

        const dataTransferObject = new DataTransfer();
        for (const [type, value] of Object.entries(data)) {
          dataTransferObject.setData(type, value);
        }

        const dragStartEvent = new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransferObject,
        });
        const dragOverEvent = new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransferObject,
        });
        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransferObject,
        });
        const dragEndEvent = new DragEvent("dragend", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransferObject,
        });

        fromElement.dispatchEvent(dragStartEvent);
        toElement.dispatchEvent(dragOverEvent);
        toElement.dispatchEvent(dropEvent);
        fromElement.dispatchEvent(dragEndEvent);
      },
      { fromSel: fromSelector, toSel: toSelector, data: dataTransfer },
    );
  };
};

export interface DispatchOptions {
  target: string;
  event: string;
  bubbles?: boolean;
  cancelable?: boolean;
  dataTransfer?: Record<string, string>;
  detail?: unknown;
}

export const createDispatchHelper = (
  getActivePage: () => Page,
): ((options: DispatchOptions) => Promise<boolean>) => {
  return async (options: DispatchOptions): Promise<boolean> => {
    const currentPage = getActivePage();
    const {
      target,
      event,
      bubbles = true,
      cancelable = true,
      dataTransfer,
      detail,
    } = options;
    const selector = resolveSelector(target);

    return currentPage.evaluate(
      ({
        sel,
        eventType,
        opts,
      }: {
        sel: string;
        eventType: string;
        opts: {
          bubbles: boolean;
          cancelable: boolean;
          dataTransfer?: Record<string, string>;
          detail?: unknown;
        };
      }) => {
        const element = document.querySelector(sel);
        if (!element) throw new Error(`Element not found: ${sel}`);

        const baseOpts = { bubbles: opts.bubbles, cancelable: opts.cancelable };

        const createEvent = (): Event => {
          if (opts.dataTransfer) {
            const dataTransferObject = new DataTransfer();
            for (const [type, value] of Object.entries(opts.dataTransfer)) {
              dataTransferObject.setData(type, value);
            }
            return new DragEvent(eventType, { ...baseOpts, dataTransfer: dataTransferObject });
          }

          if (opts.detail !== undefined) {
            return new CustomEvent(eventType, { ...baseOpts, detail: opts.detail });
          }

          return new Event(eventType, baseOpts);
        };

        return element.dispatchEvent(createEvent());
      },
      { sel: selector, eventType: event, opts: { bubbles, cancelable, dataTransfer, detail } },
    );
  };
};

export interface GrabApi {
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  toggle: () => Promise<void>;
  isActive: () => Promise<boolean>;
  copyElement: (refId: string) => Promise<boolean>;
  getState: () => Promise<unknown>;
}

export const createGrabHelper = (
  ref: RefFunction,
  getActivePage: () => Page,
): GrabApi => {
  return {
    activate: async (): Promise<void> => {
      const currentPage = getActivePage();
      await currentPage.evaluate(() => {
        const g = globalThis as { __REACT_GRAB__?: { activate: () => void } };
        g.__REACT_GRAB__?.activate();
      });
    },
    deactivate: async (): Promise<void> => {
      const currentPage = getActivePage();
      await currentPage.evaluate(() => {
        const g = globalThis as { __REACT_GRAB__?: { deactivate: () => void } };
        g.__REACT_GRAB__?.deactivate();
      });
    },
    toggle: async (): Promise<void> => {
      const currentPage = getActivePage();
      await currentPage.evaluate(() => {
        const g = globalThis as { __REACT_GRAB__?: { toggle: () => void } };
        g.__REACT_GRAB__?.toggle();
      });
    },
    isActive: async (): Promise<boolean> => {
      const currentPage = getActivePage();
      return currentPage.evaluate(() => {
        const g = globalThis as { __REACT_GRAB__?: { isActive: () => boolean } };
        return g.__REACT_GRAB__?.isActive() ?? false;
      });
    },
    copyElement: async (refId: string): Promise<boolean> => {
      const element = await ref(refId);
      if (!element) return false;
      const currentPage = getActivePage();
      return currentPage.evaluate((el) => {
        const g = globalThis as { __REACT_GRAB__?: { copyElement: (e: Element[]) => Promise<boolean> } };
        return g.__REACT_GRAB__?.copyElement([el as Element]) ?? false;
      }, element);
    },
    getState: async (): Promise<unknown> => {
      const currentPage = getActivePage();
      return currentPage.evaluate(() => {
        const g = globalThis as { __REACT_GRAB__?: { getState: () => unknown } };
        return g.__REACT_GRAB__?.getState() ?? null;
      });
    },
  };
};

export interface WaitForOptions {
  timeout?: number;
}

export const createActivePageGetter = (
  context: BrowserContext,
  getActivePage: () => Page | null,
): (() => Page) => {
  return (): Page => {
    const allPages = context.pages();
    if (allPages.length === 0) throw new Error("No pages available");
    const activePage = getActivePage();
    return activePage && allPages.includes(activePage) ? activePage : allPages[allPages.length - 1];
  };
};

export type WaitForFunction = (
  selectorOrState: string,
  options?: WaitForOptions,
) => Promise<void>;

export const createWaitForHelper = (
  getActivePage: () => Page,
): WaitForFunction => {
  return async (selectorOrState: string, options?: WaitForOptions): Promise<void> => {
    const currentPage = getActivePage();
    const timeout = options?.timeout;

    if (selectorOrState === "load" || selectorOrState === "domcontentloaded" || selectorOrState === "networkidle") {
      await currentPage.waitForLoadState(selectorOrState, { timeout });
      return;
    }

    if (selectorOrState.startsWith("e") && /^e\d+$/.test(selectorOrState)) {
      await currentPage.waitForSelector(`[aria-ref="${selectorOrState}"]`, { timeout });
      return;
    }

    await currentPage.waitForSelector(selectorOrState, { timeout });
  };
};

export interface BrowserConnection {
  browser: Awaited<ReturnType<typeof import("playwright-core").chromium.connectOverCDP>>;
  page: Page;
  serverUrl: string;
}

export const connectToBrowserPage = async (
  pageName: string,
): Promise<BrowserConnection> => {
  const { chromium } = await import("playwright-core");
  const { findPageByTargetId } = await import("@react-grab/browser");

  const { serverUrl } = await ensureHealthyServer();
  const pageInfo = await getOrCreatePage(serverUrl, pageName);

  const browser = await chromium.connectOverCDP(pageInfo.wsEndpoint);
  const page = await findPageByTargetId(browser, pageInfo.targetId);

  if (!page) {
    await browser.close();
    throw new Error(`Page "${pageName}" not found`);
  }

  return { browser, page, serverUrl };
};

export interface McpTextContent {
  type: "text";
  text: string;
}

export interface McpToolResponse {
  [key: string]: unknown;
  content: McpTextContent[];
  isError?: boolean;
}

export const createMcpErrorResponse = (error: unknown): McpToolResponse => {
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
};
