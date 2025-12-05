import type {
  AgentContext,
  AgentProvider,
  AgentSession,
  AgentSessionStorage,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;
const STORAGE_KEY = "react-grab:agent-sessions";

export interface OpencodeAgentOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpencodeAgentContext = AgentContext<OpencodeAgentOptions>;

interface OpencodeAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<OpencodeAgentOptions>;
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

const streamSSE = async function* (stream: ReadableStream<Uint8Array>) {
  const streamReader = stream.getReader();
  const textDecoder = new TextDecoder();
  let textBuffer = "";

  try {
    while (true) {
      const { done, value } = await streamReader.read();
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
    streamReader.releaseLock();
  }
};

const streamFromServer = async function* (
  serverUrl: string,
  context: OpencodeAgentContext,
  signal: AbortSignal,
) {
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

  yield* streamSSE(response.body);
};

export const createOpencodeAgentProvider = (
  options: OpencodeAgentProviderOptions = {},
): AgentProvider<OpencodeAgentOptions> => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = options;

  const mergeOptions = (
    contextOptions?: OpencodeAgentOptions,
  ): OpencodeAgentOptions => ({
    ...(getOptions?.() ?? {}),
    ...(contextOptions ?? {}),
  });

  return {
    send: async function* (context: OpencodeAgentContext, signal: AbortSignal) {
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

      const context = session.context as OpencodeAgentContext;
      const combinedContext = {
        ...context,
        options: mergeOptions(context.options),
      };

      yield "Resuming...";
      yield* streamFromServer(serverUrl, combinedContext, signal);
    },

    supportsResume: true,
  };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const provider = createOpencodeAgentProvider();

  const api = window.__REACT_GRAB__;
  if (api) {
    api.setAgent({ provider, storage: sessionStorage });
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      if (event instanceof CustomEvent) {
        const customEvent = event;
        if (
          customEvent.detail &&
          typeof customEvent.detail.setAgent === "function"
        ) {
          (customEvent.detail as ReactGrabAPI).setAgent({
            provider,
            storage: sessionStorage,
          });
        }
      }
    },
    { once: true },
  );
};

attachAgent();
