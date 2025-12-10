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
import { DEFAULT_PORT } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;

export interface OpenCodeAgentOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpenCodeAgentContext = AgentContext<OpenCodeAgentOptions>;

interface OpenCodeAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<OpenCodeAgentOptions>;
}

const streamFromServer = async function* (
  serverUrl: string,
  context: OpenCodeAgentContext,
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

      if (result.type === "timeout") {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        yield `Working… ${elapsedSeconds.toFixed(1)}s`;
      } else {
        const iteratorResult = result.iteratorResult;
        done = iteratorResult.done ?? false;
        if (!done && iteratorResult.value) {
          const status = iteratorResult.value;
          if (status === "Completed successfully") {
            const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
            yield `Completed in ${totalSeconds}s`;
          } else {
            yield status;
          }
          pendingNext = iterator.next();
        }
      }
    }
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
};

export const createOpenCodeAgentProvider = (
  options: OpenCodeAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = options;

  let connectionCache: { result: boolean; timestamp: number } | null = null;

  const mergeOptions = (
    contextOptions?: OpenCodeAgentOptions,
  ): OpenCodeAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  return {
    send: async function* (context: OpenCodeAgentContext, signal: AbortSignal) {
      const combinedContext = {
        ...context,
        options: mergeOptions(context.options),
      };
      yield* streamFromServer(serverUrl, combinedContext, signal);
    },

    resume: async function* (
      sessionId: string,
      signal: AbortSignal,
      storage: AgentSessionStorage,
    ) {
      const storedSessions = storage.getItem(STORAGE_KEY);
      if (!storedSessions) {
        throw new Error("No sessions to resume");
      }

      const parsedSessions: Record<string, AgentSession> =
        JSON.parse(storedSessions);
      const session = parsedSessions[sessionId];
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const context = session.context as OpenCodeAgentContext;
      const combinedContext = {
        ...context,
        options: mergeOptions(context.options),
      };

      yield "Resuming...";
      yield* streamFromServer(serverUrl, combinedContext, signal);
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

  const provider = createOpenCodeAgentProvider();

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
