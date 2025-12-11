import type {
  AgentContext,
  AgentProvider,
  AgentSession,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import {
  streamSSE,
  CONNECTION_CHECK_TTL_MS,
  STORAGE_KEY,
} from "@react-grab/utils/client";

export type { AgentCompleteResult };
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;

interface CursorAgentOptions {
  model?: string;
  workspace?: string;
}

type CursorAgentContext = AgentContext<CursorAgentOptions>;

interface CursorAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<CursorAgentOptions>;
}

async function* streamFromServer(
  serverUrl: string,
  context: CursorAgentContext,
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const startTime = Date.now();
  const sessionId = context.sessionId;

  const handleAbort = () => {
    if (sessionId) {
      fetch(`${serverUrl}/abort/${sessionId}`, { method: "POST" }).catch(
        () => {},
      );
    }
  };

  signal.addEventListener("abort", handleAbort);

  try {
    const response = await fetch(`${serverUrl}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const iterator = streamSSE(response.body, signal)[Symbol.asyncIterator]();
    let done = false;
    let pendingNext = iterator.next();
    let lastStatus: string | null = null;

    while (!done) {
      const result = await Promise.race([
        pendingNext.then((iteratorResult: IteratorResult<string, void>) => ({
          type: "status" as const,
          iteratorResult,
        })),
        new Promise<{ type: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ type: "timeout" }), 100),
        ),
      ]);

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      if (result.type === "status") {
        const iteratorResult = result.iteratorResult;
        done = iteratorResult.done ?? false;
        if (!done && iteratorResult.value) {
          lastStatus = iteratorResult.value;
          pendingNext = iterator.next();
        }
      }

      if (lastStatus === COMPLETED_STATUS) {
        yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
      } else if (lastStatus) {
        yield `${lastStatus} ${elapsedSeconds.toFixed(1)}s`;
      } else {
        yield `Working… ${elapsedSeconds.toFixed(1)}s`;
      }
    }
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
}

export const createCursorAgentProvider = (
  providerOptions: CursorAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

  let connectionCache: { result: boolean; timestamp: number } | null = null;

  const mergeOptions = (
    contextOptions?: CursorAgentOptions,
  ): CursorAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  return {
    send: async function* (context: CursorAgentContext, signal: AbortSignal) {
      const mergedContext = {
        ...context,
        options: mergeOptions(context.options),
      };
      yield* streamFromServer(serverUrl, mergedContext, signal);
    },

    resume: async function* (
      sessionId: string,
      signal: AbortSignal,
      storage: AgentSessionStorage,
    ) {
      const savedSessions = storage.getItem(STORAGE_KEY);
      if (!savedSessions) {
        throw new Error("No sessions to resume");
      }

      const sessionsObject = JSON.parse(savedSessions) as Record<
        string,
        AgentSession
      >;
      const session = sessionsObject[sessionId];
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const context = session.context as CursorAgentContext;
      const mergedContext = {
        ...context,
        options: mergeOptions(context.options),
      };

      yield "Resuming...";
      yield* streamFromServer(serverUrl, mergedContext, signal);
    },

    supportsResume: true,
    supportsFollowUp: true,

    checkConnection: async () => {
      const now = Date.now();
      if (
        connectionCache &&
        now - connectionCache.timestamp < CONNECTION_CHECK_TTL_MS
      ) {
        return connectionCache.result;
      }

      try {
        const response = await fetch(`${serverUrl}/health`, { method: "GET" });
        const result = response.ok;
        connectionCache = { result, timestamp: now };
        return result;
      } catch {
        connectionCache = { result: false, timestamp: now };
        return false;
      }
    },

    abort: async (sessionId: string) => {
      try {
        await fetch(`${serverUrl}/abort/${sessionId}`, { method: "POST" });
      } catch {}
    },

    undo: async () => {
      try {
        await fetch(`${serverUrl}/undo`, { method: "POST" });
      } catch {}
    },
  };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const provider = createCursorAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setAgent({ provider, storage: sessionStorage });
  };

  const api = window.__REACT_GRAB__;
  if (api) {
    attach(api);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      const customEvent = event as CustomEvent<ReactGrabAPI>;
      attach(customEvent.detail);
    },
    { once: true },
  );

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (apiAfterListener) {
    attach(apiAfterListener);
  }
};

attachAgent();
