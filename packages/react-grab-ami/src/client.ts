import {
  AMI_BRIDGE_URL,
  convertToAmiMessage,
  createExchangeToken,
  createMinimalEnvironment,
  generateId,
  getExchangeTokenAuthUrl,
  getToken,
  runAgentLoop,
} from "ami-sdk";
import type { AmiUIMessage, AmiUIMessagePart, ToolUIPart } from "ami-sdk";
import type {
  AgentContext,
  AgentProvider,
  AgentSession,
  AgentSessionStorage,
  init,
  ReactGrabAPI,
} from "react-grab/core";

const STORAGE_KEY = "react-grab:agent-sessions";
const TOKEN_STORAGE_KEY = "react-grab:ami-token";
const DEFAULT_PROJECT_ID = "react-grab-agent";

const loadCachedToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveCachedToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
};

const authenticate = async (): Promise<string> => {
  const exchangeToken = await createExchangeToken();
  const authUrl = getExchangeTokenAuthUrl(exchangeToken);

  window.open(authUrl, "_blank");

  const result = await getToken(exchangeToken, () => {});

  if (!result.success || !result.token) {
    throw new Error("Authentication failed");
  }

  saveCachedToken(result.token);
  return result.token;
};

const getOrCreateToken = async (): Promise<string> => {
  const cachedToken = loadCachedToken();
  if (cachedToken) {
    return cachedToken;
  }

  return authenticate();
};

const isToolPart = (part: AmiUIMessagePart): part is ToolUIPart => {
  return part.type.startsWith("tool-");
};

const isToolCallComplete = (part: ToolUIPart): boolean => {
  return part.state === "output-available" && part.output !== undefined;
};

const hasIncompleteToolCalls = (message: AmiUIMessage): boolean => {
  if (message.role !== "assistant") return false;
  const toolParts = message.parts.filter(isToolPart);
  if (toolParts.length === 0) return false;
  return toolParts.some((part) => !isToolCallComplete(part));
};

const sanitizeMessages = (messages: AmiUIMessage[]): AmiUIMessage[] => {
  const sanitized: AmiUIMessage[] = [];
  for (const message of messages) {
    if (hasIncompleteToolCalls(message)) {
      break;
    }
    sanitized.push(message);
  }
  return sanitized;
};

interface StatusCallback {
  (status: string): void;
}

const runAgent = async (
  context: AgentContext,
  token: string,
  projectId: string,
  onStatus: StatusCallback,
): Promise<string> => {
  const fullPrompt = `${context.prompt}\n\n${context.content}`;

  const messages: AmiUIMessage[] = [
    convertToAmiMessage({
      id: generateId(),
      role: "user",
      content: fullPrompt,
    }),
  ];

  const chatId = generateId();
  const environment = createMinimalEnvironment(window.location.href);

  const upsertMessage = async (message: AmiUIMessage) => {
    const existingIndex = messages.findIndex((m) => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }

    for (const part of message.parts) {
      if (part.type === "text" && part.text) {
        const statusUpdate =
          part.text.length > 100 ? `${part.text.slice(0, 100)}...` : part.text;
        onStatus(statusUpdate);
      }
    }
  };

  const status = await runAgentLoop({
    messages: sanitizeMessages(messages),
    context: {
      environment,
      systemContext: [],
      attachments: [],
    },
    url: `${AMI_BRIDGE_URL}/api/v1/agent-proxy`,
    chatId,
    projectId,
    token,
    upsertMessage,
    getMessages: () => sanitizeMessages(messages),
  });

  return status === "completed"
    ? "Completed successfully"
    : `Task finished (${status})`;
};

export const createAmiAgentProvider = (
  projectId: string = DEFAULT_PROJECT_ID,
): AgentProvider => ({
  send: async function* (context: AgentContext, signal: AbortSignal) {
    const token = await getOrCreateToken();

    yield "Please wait...";

    const statusQueue: string[] = [];
    let resolveWait: (() => void) | null = null;
    let aborted = false;

    const handleAbort = () => {
      aborted = true;
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    signal.addEventListener("abort", handleAbort);

    const onStatus = (status: string) => {
      if (aborted) return;
      statusQueue.push(status);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    const agentPromise = runAgent(context, token, projectId, onStatus);

    let done = false;
    agentPromise
      .then((finalStatus) => {
        if (aborted) return;
        statusQueue.push(finalStatus);
        done = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      })
      .catch((error) => {
        if (aborted) return;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        statusQueue.push(`Error: ${errorMessage}`);
        done = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      });

    try {
      while (!done && !aborted) {
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (statusQueue.length > 0) {
          yield statusQueue.shift()!;
        } else {
          await new Promise<void>((resolve) => {
            resolveWait = resolve;
          });
        }
      }
      while (statusQueue.length > 0 && !aborted) {
        yield statusQueue.shift()!;
      }
      if (aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
    }
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

    const context = session.context;
    const token = await getOrCreateToken();

    yield "Resuming...";

    const statusQueue: string[] = [];
    let resolveWait: (() => void) | null = null;
    let aborted = false;

    const handleAbort = () => {
      aborted = true;
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    signal.addEventListener("abort", handleAbort);

    const onStatus = (status: string) => {
      if (aborted) return;
      statusQueue.push(status);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    const agentPromise = runAgent(context, token, DEFAULT_PROJECT_ID, onStatus);

    let done = false;
    agentPromise
      .then((finalStatus) => {
        if (aborted) return;
        statusQueue.push(finalStatus);
        done = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      })
      .catch((error) => {
        if (aborted) return;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        statusQueue.push(`Error: ${errorMessage}`);
        done = true;
        if (resolveWait) {
          resolveWait();
          resolveWait = null;
        }
      });

    try {
      while (!done && !aborted) {
        if (signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (statusQueue.length > 0) {
          yield statusQueue.shift()!;
        } else {
          await new Promise<void>((resolve) => {
            resolveWait = resolve;
          });
        }
      }
      while (statusQueue.length > 0 && !aborted) {
        yield statusQueue.shift()!;
      }
      if (aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
    }
  },

  supportsResume: true,
});

declare global {
  interface Window {
    __REACT_GRAB__?: ReturnType<typeof init>;
  }
}

export const attachAgent = async () => {
  if (typeof window === "undefined") return;

  const provider = createAmiAgentProvider();

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
