import type {
  AgentContext,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import {
  CONNECTION_CHECK_TTL_MS,
  createCachedConnectionChecker,
  getStoredAgentContext,
  streamAgentStatusFromServer,
} from "@react-grab/utils/client";

export type { AgentCompleteResult };
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;

export interface CodexAgentOptions {
  model?: string;
  workingDirectory?: string;
}

type CodexAgentContext = AgentContext<CodexAgentOptions>;

interface CodexAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<CodexAgentOptions>;
}

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setOptions" in value;

export const createCodexAgentProvider = (
  options: CodexAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = options;

  const mergeOptions = (
    contextOptions?: CodexAgentOptions,
  ): CodexAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  const checkConnection = createCachedConnectionChecker(async () => {
    const response = await fetch(`${serverUrl}/health`, { method: "GET" });
    return response.ok;
  }, CONNECTION_CHECK_TTL_MS);

  return {
    send: async function* (context: CodexAgentContext, signal: AbortSignal) {
      const combinedContext = {
        ...context,
        options: mergeOptions(context.options),
      };
      yield* streamAgentStatusFromServer(
        { serverUrl, completedStatus: COMPLETED_STATUS },
        combinedContext,
        signal,
      );
    },

    resume: async function* (
      sessionId: string,
      signal: AbortSignal,
      storage: AgentSessionStorage,
    ) {
      const storedContext = getStoredAgentContext(storage, sessionId);
      const context: CodexAgentContext = {
        content: storedContext.content,
        prompt: storedContext.prompt,
        options: storedContext.options as CodexAgentOptions | undefined,
        sessionId: storedContext.sessionId ?? sessionId,
      };
      const combinedContext = {
        ...context,
        options: mergeOptions(context.options),
      };

      yield "Resuming...";
      yield* streamAgentStatusFromServer(
        { serverUrl, completedStatus: COMPLETED_STATUS },
        combinedContext,
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

  const provider = createCodexAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.setOptions({ agent: { provider, storage: sessionStorage } });
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

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
