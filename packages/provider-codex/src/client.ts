import type {
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";

export type { AgentCompleteResult };
import { CONNECTION_CHECK_TTL_MS, DEFAULT_PORT } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;
const STORAGE_KEY = "react-grab:agent-sessions";

export interface CodexAgentOptions {
  model?: string;
  workingDirectory?: string;
}

type CodexAgentContext = AgentContext<CodexAgentOptions>;

interface CodexAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<CodexAgentOptions>;
}

interface SSEEvent {
  eventType: string;
  data: string;
}

const parseServerSentEvent = (eventStringBlock: string): SSEEvent => {
  let eventType = "";
  let data = "";
  for (const line of eventStringBlock.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { eventType, data };
};

const streamSSE = async function* (
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
) {
  const streamReader = stream.getReader();
  const textDecoder = new TextDecoder();
  let textBuffer = "";
  let aborted = false;

  const onAbort = () => {
    aborted = true;
    streamReader.cancel().catch(() => {});
  };

  signal.addEventListener("abort", onAbort);

  try {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    while (true) {
      const result = await streamReader.read();

      if (aborted || signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const { done, value } = result;
      if (value) textBuffer += textDecoder.decode(value, { stream: true });

      let boundaryIndex;
      while ((boundaryIndex = textBuffer.indexOf("\n\n")) !== -1) {
        const { eventType, data } = parseServerSentEvent(
          textBuffer.slice(0, boundaryIndex),
        );
        textBuffer = textBuffer.slice(boundaryIndex + 2);

        if (eventType === "done") return;
        if (eventType === "error") throw new Error(data || "Agent error");
        if (data) yield data;
      }

      if (done) break;
    }
  } finally {
    signal.removeEventListener("abort", onAbort);
    try {
      streamReader.releaseLock();
    } catch {}
  }
};

const streamFromServer = async function* (
  serverUrl: string,
  context: CodexAgentContext,
  signal: AbortSignal,
) {
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

    yield* streamSSE(response.body, signal);
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
};

export const createCodexAgentProvider = (
  options: CodexAgentProviderOptions = {},
) => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = options;

  let connectionCache: { result: boolean; timestamp: number } | null = null;

  const mergeOptions = (
    contextOptions?: CodexAgentOptions,
  ): CodexAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  return {
    send: async function* (context: CodexAgentContext, signal: AbortSignal) {
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

      const context = session.context as CodexAgentContext;
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

  const provider = createCodexAgentProvider();

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
