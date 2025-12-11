import type {
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import type { Options as ClaudeOptions } from "@anthropic-ai/claude-agent-sdk";
import {
  streamSSE,
  CONNECTION_CHECK_TTL_MS,
  STORAGE_KEY,
} from "@react-grab/utils/client";

export type { AgentCompleteResult };
import { DEFAULT_PORT } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;

const DEFAULT_OPTIONS: ClaudeOptions = {
  systemPrompt: {
    type: "preset",
    preset: "claude_code",
    append: `You are helping a user make changes to a React component based on a selected element.
The user has selected an element from their UI and wants you to help modify it.
Provide clear, concise status updates as you work.`,
  },
  model: "haiku",
  permissionMode: "bypassPermissions",
  maxTurns: 10,
};

type ClaudeAgentContext = AgentContext<ClaudeOptions>;

interface ClaudeAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<ClaudeOptions>;
}

async function* streamFromServer(
  serverUrl: string,
  context: ClaudeAgentContext,
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

      if (result.type === "timeout") {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        if (lastStatus) {
          if (lastStatus === "Completed successfully") {
            yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
          } else {
            yield `${lastStatus} ${elapsedSeconds.toFixed(1)}s`;
          }
        } else {
          yield `Working… ${elapsedSeconds.toFixed(1)}s`;
        }
      } else {
        const iteratorResult = result.iteratorResult;
        done = iteratorResult.done ?? false;
        if (!done && iteratorResult.value) {
          const status = iteratorResult.value;
          lastStatus = status;
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
}

export const createClaudeAgentProvider = (
  providerOptions: ClaudeAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

  let connectionCache: { result: boolean; timestamp: number } | null = null;

  const mergeOptions = (contextOptions?: ClaudeOptions): ClaudeOptions => ({
    ...DEFAULT_OPTIONS,
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  return {
    send: async function* (context: ClaudeAgentContext, signal: AbortSignal) {
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

      const context = session.context as ClaudeAgentContext;
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
  };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const provider = createClaudeAgentProvider();

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

  // HACK: check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (apiAfterListener) {
    attach(apiAfterListener);
  }
};

attachAgent();
