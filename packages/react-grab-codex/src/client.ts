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

interface CodexAgentOptions {
  model?: string;
  workspace?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  fullAuto?: boolean;
  yolo?: boolean;
  profile?: string;
  skipGitRepoCheck?: boolean;
  config?: string[];
  outputSchemaPath?: string;
}

interface CodexAgentContext extends AgentContext<CodexAgentOptions> {}

interface CodexAgentProviderOptions {
  serverUrl?: string;
  getOptions?: () => Partial<CodexAgentOptions>;
}

interface StoredSessions {
  [sessionId: string]: AgentSession;
}

interface SSEEvent {
  eventType: string;
  data: string;
}

const parseSSEEvent = (eventBlock: string): SSEEvent => {
  let eventType = "";
  let data = "";
  for (const line of eventBlock.split("\n")) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice(5).trim();
    }
  }
  return { eventType, data };
};

const createSSEStream = (stream: ReadableStream<Uint8Array>) => {
  const iterate = async function* (): AsyncGenerator<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const { eventType, data } = parseSSEEvent(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);

          if (eventType === "done") {
            return;
          }
          if (eventType === "error") {
            throw new Error(data || "Agent error");
          }
          if (data) {
            yield data;
          }

          boundary = buffer.indexOf("\n\n");
        }

        if (done) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  return iterate();
};

const streamFromServer = (
  serverUrl: string,
  context: CodexAgentContext,
  signal: AbortSignal,
) => {
  const iterate = async function* (): AsyncGenerator<string> {
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

    const stream = createSSEStream(response.body);
    for await (const chunk of stream) {
      yield chunk;
    }
  };

  return iterate();
};

export const createCodexAgentProvider = (
  providerOptions: CodexAgentProviderOptions = {},
): AgentProvider<CodexAgentOptions> => {
  const { serverUrl = DEFAULT_SERVER_URL, getOptions } = providerOptions;

  const mergeOptions = (contextOptions: unknown): CodexAgentOptions => {
    const merged: CodexAgentOptions = { fullAuto: true };

    const providerOptionValues = getOptions ? getOptions() : undefined;
    if (providerOptionValues && typeof providerOptionValues === "object") {
      Object.assign(merged, providerOptionValues);
    }

    if (contextOptions && typeof contextOptions === "object") {
      Object.assign(merged, contextOptions);
    }

    return merged;
  };

  const send = (
    context: CodexAgentContext,
    signal: AbortSignal,
  ): AsyncIterable<string> => {
    const mergedContext: CodexAgentContext = {
      ...context,
      options: mergeOptions(context.options),
    };
    return streamFromServer(serverUrl, mergedContext, signal);
  };

  const resume = (
    sessionId: string,
    signal: AbortSignal,
    storage: AgentSessionStorage,
  ): AsyncIterable<string> => {
    const iterate = async function* (): AsyncGenerator<string> {
      const savedSessions = storage.getItem(STORAGE_KEY);
      if (!savedSessions) {
        throw new Error("No sessions to resume");
      }

      const sessionsObject: StoredSessions = JSON.parse(savedSessions);
      const session = sessionsObject[sessionId];
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const sessionContext = session.context;
      const mergedContext: CodexAgentContext = {
        content: sessionContext.content,
        prompt: sessionContext.prompt,
        options: mergeOptions(sessionContext.options),
      };

      yield "Resuming...";
      const stream = streamFromServer(serverUrl, mergedContext, signal);
      for await (const chunk of stream) {
        yield chunk;
      }
    };

    return iterate();
  };

  return {
    send,
    resume,
    supportsResume: true,
  };
};

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") {
    return;
  }

  const provider = createCodexAgentProvider();

  const api = window.__REACT_GRAB__;
  if (api) {
    api.setAgent({ provider, storage: sessionStorage });
    return;
  }

  const handleInit = (event: Event & { detail?: ReactGrabAPI }) => {
    if (event.detail) {
      event.detail.setAgent({ provider, storage: sessionStorage });
    }
  };

  window.addEventListener("react-grab:init", handleInit, { once: true });
};

attachAgent();