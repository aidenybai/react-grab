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

interface GeminiAgentOptions {
  model?: string;
  includeDirectories?: string;
}

type GeminiAgentContext = AgentContext<GeminiAgentOptions>;

interface GeminiAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<GeminiAgentOptions>;
}

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

export const createGeminiAgentProvider = (
  providerOptions: GeminiAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

  const mergeOptions = (
    contextOptions?: GeminiAgentOptions,
  ): GeminiAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  const checkConnection = createCachedConnectionChecker(async () => {
    const response = await fetch(`${serverUrl}/health`, { method: "GET" });
    return response.ok;
  }, CONNECTION_CHECK_TTL_MS);

  return {
    send: async function* (context: GeminiAgentContext, signal: AbortSignal) {
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
      const context: GeminiAgentContext = {
        content: storedContext.content,
        prompt: storedContext.prompt,
        options: storedContext.options as GeminiAgentOptions | undefined,
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

  const provider = createGeminiAgentProvider();

  const attach = (api: ReactGrabAPI) => {
    api.registerPlugin({
      name: "gemini-agent",
      agent: { provider, storage: sessionStorage },
    });
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
