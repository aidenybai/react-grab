import {
  chromium,
  type Browser,
  type Page,
  type ElementHandle,
} from "playwright-core";
import type {
  GetPageRequest,
  GetPageResponse,
  ListPagesResponse,
  ServerInfoResponse,
  ViewportSize,
} from "./types.js";
import { getSnapshotScript } from "./snapshot/index.js";

export interface PageOptions {
  viewport?: ViewportSize;
}

export interface ServerInfo {
  wsEndpoint: string;
  mode: "launch" | "extension";
  extensionConnected?: boolean;
}

export interface SnapshotOptions {
  maxDepth?: number;
}

export interface BrowserClient {
  page: (name: string, options?: PageOptions) => Promise<Page>;
  list: () => Promise<string[]>;
  close: (name: string) => Promise<void>;
  disconnect: () => Promise<void>;
  snapshot: (name: string, options?: SnapshotOptions) => Promise<string>;
  ref: (name: string, refId: string) => Promise<ElementHandle | null>;
  getServerInfo: () => Promise<ServerInfo>;
}

export const findPageByTargetId = async (
  browserInstance: Browser,
  targetId: string,
): Promise<Page | null> => {
  for (const context of browserInstance.contexts()) {
    for (const currentPage of context.pages()) {
      let cdpSession;
      try {
        cdpSession = await context.newCDPSession(currentPage);
        const { targetInfo } = await cdpSession.send("Target.getTargetInfo");
        if (targetInfo.targetId === targetId) {
          return currentPage;
        }
      } catch {
      } finally {
        await cdpSession?.detach().catch(() => {});
      }
    }
  }
  return null;
};

export const connect = async (
  serverUrl = "http://localhost:9222",
): Promise<BrowserClient> => {
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
          throw new Error(
            `Server returned ${response.status}: ${await response.text()}`,
          );
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

  const getPage = async (
    name: string,
    options?: PageOptions,
  ): Promise<Page> => {
    const response = await fetch(`${serverUrl}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        viewport: options?.viewport,
      } satisfies GetPageRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to get page: ${await response.text()}`);
    }

    const pageInfo = (await response.json()) as GetPageResponse & {
      url?: string;
    };
    const { targetId } = pageInfo;

    const browserInstance = await ensureConnected();

    const infoResponse = await fetch(serverUrl);
    const serverInfo = (await infoResponse.json()) as { mode?: string };
    const isExtensionMode = serverInfo.mode === "extension";

    if (isExtensionMode) {
      const allPages = browserInstance
        .contexts()
        .flatMap((context) => context.pages());

      if (allPages.length === 0) {
        throw new Error(`No pages available in browser`);
      }

      return allPages.find((p) => p.url() === pageInfo.url) ?? allPages[0];
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
      const response = await fetch(
        `${serverUrl}/pages/${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        },
      );

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

    async snapshot(name: string, options?: SnapshotOptions): Promise<string> {
      const page = await getPage(name);
      const snapshotScript = getSnapshotScript();

      return page.evaluate(
        ({
          script,
          opts,
        }: {
          script: string;
          opts?: { maxDepth?: number };
        }) => {
          const windowGlobal = globalThis as {
            __REACT_GRAB_SNAPSHOT__?: (o?: { maxDepth?: number }) => string;
          };
          if (!windowGlobal.__REACT_GRAB_SNAPSHOT__) {
            eval(script);
          }
          return windowGlobal.__REACT_GRAB_SNAPSHOT__!(opts);
        },
        { script: snapshotScript, opts: options },
      );
    },

    async ref(name: string, refId: string): Promise<ElementHandle | null> {
      const page = await getPage(name);

      const elementHandle = await page.evaluateHandle((id: string) => {
        const windowGlobal = globalThis as {
          __REACT_GRAB_REFS__?: Record<string, Element>;
        };
        const refs = windowGlobal.__REACT_GRAB_REFS__;
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
        return null;
      }

      return element;
    },

    async getServerInfo(): Promise<ServerInfo> {
      const response = await fetch(serverUrl);
      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${await response.text()}`,
        );
      }
      const info = (await response.json()) as ServerInfoResponse;
      return {
        wsEndpoint: info.wsEndpoint,
        mode: info.mode ?? "launch",
        extensionConnected: info.extensionConnected,
      };
    },
  };
};
