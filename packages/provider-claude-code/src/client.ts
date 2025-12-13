import type {
  AgentContext,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import type { Options as ClaudeOptions } from "@anthropic-ai/claude-agent-sdk";
import {
  CONNECTION_CHECK_TTL_MS,
  createCachedConnectionChecker,
  getStoredAgentContext,
  streamAgentStatusFromServer,
} from "@react-grab/utils/client";

export type { AgentCompleteResult };
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants.js";

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

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setAgent" in value;

export const createClaudeAgentProvider = (
  providerOptions: ClaudeAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

  const mergeOptions = (contextOptions?: ClaudeOptions): ClaudeOptions => ({
    ...DEFAULT_OPTIONS,
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  const checkConnection = createCachedConnectionChecker(
    async () => {
      const response = await fetch(`${serverUrl}/health`, { method: "GET" });
      return response.ok;
    },
    CONNECTION_CHECK_TTL_MS,
  );

  return {
    send: async function* (context: ClaudeAgentContext, signal: AbortSignal) {
      const mergedContext = {
        ...context,
        options: mergeOptions(context.options),
      };
      yield* streamAgentStatusFromServer(
        { serverUrl, completedStatus: COMPLETED_STATUS },
        mergedContext,
        signal,
      );
    },

    resume: async function* (
      sessionId: string,
      signal: AbortSignal,
      storage: AgentSessionStorage,
    ) {
      const storedContext = getStoredAgentContext(storage, sessionId);
      const context: ClaudeAgentContext = {
        content: storedContext.content,
        prompt: storedContext.prompt,
        options: storedContext.options as ClaudeOptions | undefined,
        sessionId: storedContext.sessionId ?? sessionId,
      };
      const mergedContext = {
        ...context,
        options: mergeOptions(context.options),
      };

      yield "Resuming...";
      yield* streamAgentStatusFromServer(
        { serverUrl, completedStatus: COMPLETED_STATUS },
        mergedContext,
        signal,
      );
    },

    supportsResume: true,
    supportsFollowUp: true,

    checkConnection,

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

  const provider = createClaudeAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setAgent({ provider, storage: sessionStorage });
  };

  const existingApi = window.__REACT_GRAB__;
  if (isReactGrabApi(existingApi)) {
    attach(existingApi);
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      if (!isReactGrabApi(event.detail)) return;
      attach(event.detail);
    },
    { once: true },
  );

  // HACK: check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
