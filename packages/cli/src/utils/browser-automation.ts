import type { Page, ElementHandle } from "playwright";
import {
  getSnapshotScript,
  getServerInfo,
  isServerRunning,
  isServerHealthy,
  stopServer,
  spawnServer,
} from "@react-grab/browser";

export interface PageInfo {
  name: string;
  targetId: string;
  url: string;
  wsEndpoint: string;
}

export interface ExecuteResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  url: string;
  title: string;
  page?: string;
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

export const createOutputJson = (
  getPage: () => Page | null,
  pageName: string,
): ((ok: boolean, result?: unknown, error?: string) => Promise<ExecuteResult>) => {
  return async (ok, result, error) => {
    const page = getPage();
    return {
      ok,
      url: page?.url() ?? "",
      title: page ? await page.title().catch(() => "") : "",
      page: pageName,
      ...(result !== undefined && { result }),
      ...(error && { error }),
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

export type RefFunction = (
  refId: string,
) => ElementHandle &
  PromiseLike<ElementHandle> & {
    source: () => Promise<SourceInfo | null>;
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
      const g = globalThis as { __REACT_GRAB__?: { getSource: (e: Element) => unknown } };
      if (!g.__REACT_GRAB__) return null;
      return g.__REACT_GRAB__.getSource(el as Element);
    }, element);
  };

  return (refId: string) => {
    return new Proxy(
      {} as ElementHandle &
        PromiseLike<ElementHandle> & {
          source: () => Promise<SourceInfo | null>;
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
          return (...args: unknown[]) =>
            getElement(refId).then((el) =>
              (el as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args),
            );
        },
      },
    );
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
          evt = new Event(eventType, {
            bubbles: opts.bubbles,
            cancelable: opts.cancelable,
          });
        }

        return element.dispatchEvent(evt);
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
