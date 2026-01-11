import { chromium, type Browser, type Page, type ElementHandle } from "playwright";
import type {
  GetPageRequest,
  GetPageResponse,
  ListPagesResponse,
  ServerInfoResponse,
  ViewportSize,
  WaitForPageLoadOptions,
  WaitForPageLoadResult,
} from "./types.js";
import { getSnapshotScript } from "./snapshot/index.js";
import {
  PAGE_LOAD_TIMEOUT_MS,
  PAGE_LOAD_POLL_INTERVAL_MS,
  PAGE_LOAD_MINIMUM_WAIT_MS,
  NON_CRITICAL_RESOURCE_TIMEOUT_MS,
  LONG_RUNNING_REQUEST_TIMEOUT_MS,
  MAX_URL_LENGTH_FOR_LOGGING,
} from "./utils/constants.js";

export type { WaitForPageLoadOptions, WaitForPageLoadResult };

export interface PageOptions {
  viewport?: ViewportSize;
}

export interface ServerInfo {
  wsEndpoint: string;
  mode: "launch" | "extension";
  extensionConnected?: boolean;
}

export interface BrowserClient {
  page: (name: string, options?: PageOptions) => Promise<Page>;
  list: () => Promise<string[]>;
  close: (name: string) => Promise<void>;
  disconnect: () => Promise<void>;
  snapshot: (name: string) => Promise<string>;
  ref: (name: string, refId: string) => Promise<ElementHandle | null>;
  getServerInfo: () => Promise<ServerInfo>;
}

interface PageLoadState {
  documentReadyState: string;
  documentLoading: boolean;
  pendingRequests: Array<{ url: string; loadingDurationMs: number; resourceType: string }>;
}

const getPageLoadState = async (page: Page): Promise<PageLoadState> =>
  page.evaluate(
    ({ maxUrlLength, longRunningTimeout, nonCriticalTimeout }) => {
      const globals = globalThis as { document?: Document; performance?: Performance };
      const performance = globals.performance!;
      const document = globals.document!;

      const now = performance.now();
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const pending: Array<{ url: string; loadingDurationMs: number; resourceType: string }> = [];

      const adPatterns = [
        "doubleclick.net", "googlesyndication.com", "googletagmanager.com",
        "google-analytics.com", "facebook.net", "connect.facebook.net",
        "analytics", "ads", "tracking", "pixel", "hotjar.com", "clarity.ms",
        "mixpanel.com", "segment.com", "newrelic.com", "nr-data.net",
        "/tracker/", "/collector/", "/beacon/", "/telemetry/", "/log/",
        "/events/", "/track.", "/metrics/",
      ];

      const nonCriticalTypes = ["img", "image", "icon", "font"];

      for (const entry of resources) {
        if (entry.responseEnd === 0) {
          const url = entry.name;
          const isAd = adPatterns.some((pattern) => url.includes(pattern));
          if (isAd) continue;
          if (url.startsWith("data:") || url.length > maxUrlLength) continue;

          const loadingDuration = now - entry.startTime;
          if (loadingDuration > longRunningTimeout) continue;

          const resourceType = entry.initiatorType || "unknown";
          if (nonCriticalTypes.includes(resourceType) && loadingDuration > nonCriticalTimeout) continue;

          const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i.test(url);
          if (isImageUrl && loadingDuration > nonCriticalTimeout) continue;

          pending.push({
            url,
            loadingDurationMs: Math.round(loadingDuration),
            resourceType,
          });
        }
      }

      return {
        documentReadyState: document.readyState,
        documentLoading: document.readyState !== "complete",
        pendingRequests: pending,
      };
    },
    {
      maxUrlLength: MAX_URL_LENGTH_FOR_LOGGING,
      longRunningTimeout: LONG_RUNNING_REQUEST_TIMEOUT_MS,
      nonCriticalTimeout: NON_CRITICAL_RESOURCE_TIMEOUT_MS,
    }
  );

export const waitForPageLoad = async (
  page: Page,
  options: WaitForPageLoadOptions = {}
): Promise<WaitForPageLoadResult> => {
  const {
    timeout = PAGE_LOAD_TIMEOUT_MS,
    pollInterval = PAGE_LOAD_POLL_INTERVAL_MS,
    minimumWait = PAGE_LOAD_MINIMUM_WAIT_MS,
    waitForNetworkIdle = true,
  } = options;

  const startTime = Date.now();
  let lastState: PageLoadState | null = null;

  if (minimumWait > 0) {
    await new Promise((resolve) => setTimeout(resolve, minimumWait));
  }

  while (Date.now() - startTime < timeout) {
    try {
      lastState = await getPageLoadState(page);
      const documentReady = lastState.documentReadyState === "complete";
      const networkIdle = !waitForNetworkIdle || lastState.pendingRequests.length === 0;

      if (documentReady && networkIdle) {
        return {
          success: true,
          readyState: lastState.documentReadyState,
          pendingRequests: lastState.pendingRequests.length,
          waitTimeMs: Date.now() - startTime,
          timedOut: false,
        };
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return {
    success: false,
    readyState: lastState?.documentReadyState ?? "unknown",
    pendingRequests: lastState?.pendingRequests.length ?? 0,
    waitTimeMs: Date.now() - startTime,
    timedOut: true,
  };
};

export const findPageByTargetId = async (browserInstance: Browser, targetId: string): Promise<Page | null> => {
  for (const context of browserInstance.contexts()) {
    for (const currentPage of context.pages()) {
      let cdpSession;
      try {
        cdpSession = await context.newCDPSession(currentPage);
        const { targetInfo } = await cdpSession.send("Target.getTargetInfo");
        if (targetInfo.targetId === targetId) {
          return currentPage;
        }
      } catch {} finally {
        await cdpSession?.detach().catch(() => {});
      }
    }
  }
  return null;
};

export const connect = async (serverUrl = "http://localhost:9222"): Promise<BrowserClient> => {
  let browser: Browser | null = null;
  let connectingPromise: Promise<Browser> | null = null;

  const ensureConnected = async (): Promise<Browser> => {
    if (browser && browser.isConnected()) {
      return browser;
    }

    if (connectingPromise) {
      return connectingPromise;
    }

    connectingPromise = (async () => {
      try {
        const response = await fetch(serverUrl);
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${await response.text()}`);
        }
        const info = (await response.json()) as ServerInfoResponse;

        browser = await chromium.connectOverCDP(info.wsEndpoint);
        return browser;
      } finally {
        connectingPromise = null;
      }
    })();

    return connectingPromise;
  };

  const getPage = async (name: string, options?: PageOptions): Promise<Page> => {
    const response = await fetch(`${serverUrl}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, viewport: options?.viewport } satisfies GetPageRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to get page: ${await response.text()}`);
    }

    const pageInfo = (await response.json()) as GetPageResponse & { url?: string };
    const { targetId } = pageInfo;

    const browserInstance = await ensureConnected();

    const infoResponse = await fetch(serverUrl);
    const serverInfo = (await infoResponse.json()) as { mode?: string };
    const isExtensionMode = serverInfo.mode === "extension";

    if (isExtensionMode) {
      const allPages = browserInstance.contexts().flatMap((context) => context.pages());

      if (allPages.length === 0) {
        throw new Error(`No pages available in browser`);
      }

      if (pageInfo.url) {
        const matchingPage = allPages.find((currentPage) => currentPage.url() === pageInfo.url);
        if (matchingPage) {
          return matchingPage;
        }
      }

      return allPages[0];
    }

    const foundPage = await findPageByTargetId(browserInstance, targetId);
    if (!foundPage) {
      throw new Error(`Page "${name}" not found in browser contexts`);
    }

    return foundPage;
  };

  return {
    page: getPage,

    async list(): Promise<string[]> {
      const response = await fetch(`${serverUrl}/pages`);
      const data = (await response.json()) as ListPagesResponse;
      return data.pages.map((pageInfo) => pageInfo.name);
    },

    async close(name: string): Promise<void> {
      const response = await fetch(`${serverUrl}/pages/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to close page: ${await response.text()}`);
      }
    },

    async disconnect(): Promise<void> {
      if (browser) {
        await browser.close();
        browser = null;
      }
    },

    async snapshot(name: string, options?: { maxDepth?: number; interactableOnly?: boolean }): Promise<string> {
      const page = await getPage(name);
      const snapshotScript = getSnapshotScript();

      return page.evaluate(({ script, opts }: { script: string; opts?: { maxDepth?: number; interactableOnly?: boolean } }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowGlobal = globalThis as any;
        if (!windowGlobal.__REACT_GRAB_SNAPSHOT__) {
          // eslint-disable-next-line no-eval
          eval(script);
        }
        return windowGlobal.__REACT_GRAB_SNAPSHOT__(opts);
      }, { script: snapshotScript, opts: options });
    },

    async ref(name: string, refId: string): Promise<ElementHandle | null> {
      const page = await getPage(name);

      const elementHandle = await page.evaluateHandle((id: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowGlobal = globalThis as any;
        const refs = windowGlobal.__REACT_GRAB_REFS__;
        if (!refs) {
          throw new Error("No refs found. Call snapshot() first.");
        }
        const element = refs[id];
        if (!element) {
          throw new Error(
            `Ref "${id}" not found. Available refs: ${Object.keys(refs).join(", ")}`
          );
        }
        return element;
      }, refId);

      const element = elementHandle.asElement();
      if (!element) {
        await elementHandle.dispose();
        return null;
      }

      return element;
    },

    async getServerInfo(): Promise<ServerInfo> {
      const response = await fetch(serverUrl);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }
      const info = (await response.json()) as ServerInfoResponse;
      return {
        wsEndpoint: info.wsEndpoint,
        mode: (info.mode as "launch" | "extension") ?? "launch",
        extensionConnected: info.extensionConnected,
      };
    },
  };
}
