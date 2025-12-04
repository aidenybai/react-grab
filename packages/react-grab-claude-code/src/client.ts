import type {
  AgentContext,
  AgentProvider,
  AgentSession,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import type { Options as ClaudeOptions } from "@anthropic-ai/claude-agent-sdk";
import { DEFAULT_PORT } from "./constants.js";

const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_PORT}`;
const STORAGE_KEY = "react-grab:agent-sessions";

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

interface SSEEvent {
  eventType: string;
  data: string;
}

const parseSSEEvent = (eventBlock: string): SSEEvent => {
  let eventType = "";
  let data = "";
  for (const line of eventBlock.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { eventType, data };
};

async function* streamSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const { eventType, data } = parseSSEEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);

        if (eventType === "done") return;
        if (eventType === "error") throw new Error(data || "Agent error");
        if (data) yield data;
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamFromServer(
  serverUrl: string,
  context: ClaudeAgentContext,
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
}

export const createClaudeAgentProvider = (
  providerOptions: ClaudeAgentProviderOptions = {},
): AgentProvider<ClaudeOptions> => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

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

    resume: async function* (sessionId: string, signal: AbortSignal) {
      const savedSessions = sessionStorage.getItem(STORAGE_KEY);
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

  const api = window.__REACT_GRAB__;
  if (api) {
    api.setAgent({ provider });
    return;
  }

  window.addEventListener(
    "react-grab:init",
    (event: Event) => {
      const customEvent = event as CustomEvent<ReactGrabAPI>;
      customEvent.detail.setAgent({ provider });
    },
    { once: true },
  );
};

attachAgent();
