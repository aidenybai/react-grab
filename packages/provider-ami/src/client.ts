import {
  AMI_BRIDGE_URL,
  authenticate,
  convertToAmiMessage,
  generateId,
  getEnvironmentFromProjectId,
  getUserIdFromBridgeToken,
  initCliRpc,
  listProjects,
  revertFileEdits,
  runAgentLoop,
} from "ami-sdk";
import type { AmiUIMessage, AmiUIMessagePart, ToolUIPart } from "ami-sdk";
import type {
  AgentContext,
  AgentProvider,
  AgentSessionStorage,
  AgentCompleteResult,
  init,
  ReactGrabAPI,
} from "react-grab/core";
import {
  CONNECTION_CHECK_TTL_MS,
  createCachedConnectionChecker,
  getStoredAgentContext,
} from "@react-grab/utils/client";

export type { AgentCompleteResult };
import { COMPLETED_STATUS } from "./constants.js";

const TOKEN_STORAGE_KEY = "react-grab:ami-token";
const BRIDGE_TOKEN_STORAGE_KEY = "react-grab:ami-bridge-token";

interface CachedAuth {
  token: string;
  bridgeToken: string;
  userId: string;
}

const loadCachedAuth = (): CachedAuth | null => {
  try {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const bridgeToken = sessionStorage.getItem(BRIDGE_TOKEN_STORAGE_KEY);
    if (!token || !bridgeToken) return null;
    const userId = getUserIdFromBridgeToken(bridgeToken);
    return { token, bridgeToken, userId };
  } catch {
    return null;
  }
};

const saveCachedAuth = (auth: CachedAuth) => {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
    sessionStorage.setItem(BRIDGE_TOKEN_STORAGE_KEY, auth.bridgeToken);
  } catch {}
};

const performAuthentication = async (): Promise<CachedAuth> => {
  const result = await authenticate();

  if (!result.success || !result.token || !result.bridgeToken) {
    throw new Error("Authentication failed");
  }

  const auth: CachedAuth = {
    token: result.token,
    bridgeToken: result.bridgeToken,
    userId: result.userId,
  };

  saveCachedAuth(auth);

  initCliRpc({
    bridgeToken: auth.bridgeToken,
    userId: auth.userId,
  });

  return auth;
};

const getOrCreateAuth = async (): Promise<CachedAuth> => {
  const cachedAuth = loadCachedAuth();
  if (cachedAuth) {
    initCliRpc({
      bridgeToken: cachedAuth.bridgeToken,
      userId: cachedAuth.userId,
    });
    return cachedAuth;
  }

  return performAuthentication();
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

interface RunAgentResult {
  status: string;
  messages: AmiUIMessage[];
  chatId: string;
}

const runAgent = async (
  context: AgentContext,
  token: string,
  projectId: string,
  onStatus: StatusCallback,
  existingMessages?: AmiUIMessage[],
  existingChatId?: string,
): Promise<RunAgentResult> => {
  const isFollowUp = Boolean(existingMessages && existingMessages.length > 0);
  const userMessageContent = isFollowUp
    ? context.prompt
    : `${context.prompt}\n\n${context.content}`;

  const messages: AmiUIMessage[] = existingMessages
    ? [...existingMessages]
    : [];

  messages.push(
    convertToAmiMessage({
      id: generateId(),
      role: "user",
      content: userMessageContent,
    }),
  );

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

  const environmentResult = await getEnvironmentFromProjectId(projectId);
  if (environmentResult._tag !== "Success") {
    throw new Error("Failed to get environment");
  }
  const { status, chatId } = await runAgentLoop({
    messages: sanitizeMessages(messages),
    context: {
      environment: environmentResult.environment,
      systemContext: [],
      attachments: [],
    },
    url: `${AMI_BRIDGE_URL}/api/v1/agent-proxy`,
    chatId: existingChatId,
    projectId,
    token,
    upsertMessage,
    getMessages: () => sanitizeMessages(messages),
  });

  switch (status) {
    case "error":
      throw new Error("Failed to complete task");
    case "aborted":
      throw new Error("User aborted task");
    default:
      return { status: COMPLETED_STATUS, messages, chatId };
  }
};

const isReactGrabApi = (value: unknown): value is ReactGrabAPI =>
  typeof value === "object" && value !== null && "setAgent" in value;

interface SessionData {
  messages: AmiUIMessage[];
  chatId: string;
}

export const createAmiAgentProvider = (projectId?: string): AgentProvider => {
  let lastAgentMessages: AmiUIMessage[] | null = null;
  const sessionData = new Map<string, SessionData>();

  const getLatestProjectId = async (token: string): Promise<string> => {
    const projects = await listProjects({ token, limit: 1 });
    const latestProject = projects.projects[0];
    return latestProject?.id;
  };

  return {
    send: async function* (context: AgentContext, signal: AbortSignal) {
      const startTime = Date.now();
      const auth = await getOrCreateAuth();

      projectId = await getLatestProjectId(auth.token);
      if (!projectId) {
        throw new Error("No project found");
      }

      yield "Thinking…";

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

      const existingData = context.sessionId
        ? sessionData.get(context.sessionId)
        : undefined;

      const agentPromise = runAgent(
        context,
        auth.token,
        projectId,
        onStatus,
        existingData?.messages,
        existingData?.chatId,
      );

      let done = false;
      let caughtError: Error | null = null;
      agentPromise
        .then((result) => {
          if (aborted) return;
          lastAgentMessages = result.messages;
          if (context.sessionId) {
            sessionData.set(context.sessionId, {
              messages: result.messages,
              chatId: result.chatId,
            });
          }
          statusQueue.push(result.status);
          done = true;
          if (resolveWait) {
            resolveWait();
            resolveWait = null;
          }
        })
        .catch((error) => {
          if (aborted) return;
          caughtError =
            error instanceof Error ? error : new Error("Unknown error");
          done = true;
          if (resolveWait) {
            resolveWait();
            resolveWait = null;
          }
        });

      let lastStatus: string | null = null;
      try {
        while (!done && !aborted) {
          if (signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          if (statusQueue.length > 0) {
            const status = statusQueue.shift()!;
            lastStatus = status;
          }
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          if (lastStatus) {
            if (lastStatus === COMPLETED_STATUS) {
              yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
            } else {
              yield `${lastStatus} ${elapsedSeconds.toFixed(1)}s`;
            }
          } else {
            yield `Working… ${elapsedSeconds.toFixed(1)}s`;
          }
          await Promise.race([
            new Promise<"status">((resolve) => {
              resolveWait = () => resolve("status");
            }),
            new Promise<"timeout">((resolve) =>
              setTimeout(() => resolve("timeout"), 100),
            ),
          ]);
        }
        while (statusQueue.length > 0 && !aborted) {
          const status = statusQueue.shift()!;
          lastStatus = status;
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          if (status === COMPLETED_STATUS) {
            yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
          } else {
            yield `${status} ${elapsedSeconds.toFixed(1)}s`;
          }
        }
        if (aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (caughtError) {
          throw caughtError;
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
      const startTime = Date.now();
      const storedContext = getStoredAgentContext(storage, sessionId);
      const context: AgentContext = {
        content: storedContext.content,
        prompt: storedContext.prompt,
        options: storedContext.options,
        sessionId: storedContext.sessionId ?? sessionId,
      };
      const auth = await getOrCreateAuth();

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

      projectId = await getLatestProjectId(auth.token);
      if (!projectId) {
        throw new Error("No project found");
      }

      const agentPromise = runAgent(context, auth.token, projectId, onStatus);

      let done = false;
      let caughtError: Error | null = null;
      agentPromise
        .then((result) => {
          if (aborted) return;
          lastAgentMessages = result.messages;
          statusQueue.push(result.status);
          done = true;
          if (resolveWait) {
            resolveWait();
            resolveWait = null;
          }
        })
        .catch((error) => {
          if (aborted) return;
          caughtError =
            error instanceof Error ? error : new Error("Unknown error");
          done = true;
          if (resolveWait) {
            resolveWait();
            resolveWait = null;
          }
        });

      let lastStatus: string | null = null;
      try {
        while (!done && !aborted) {
          if (signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          if (statusQueue.length > 0) {
            const status = statusQueue.shift()!;
            lastStatus = status;
          }
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          if (lastStatus) {
            if (lastStatus === COMPLETED_STATUS) {
              yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
            } else {
              yield `${lastStatus} ${elapsedSeconds.toFixed(1)}s`;
            }
          } else {
            yield `Working… ${elapsedSeconds.toFixed(1)}s`;
          }
          await Promise.race([
            new Promise<"status">((resolve) => {
              resolveWait = () => resolve("status");
            }),
            new Promise<"timeout">((resolve) =>
              setTimeout(() => resolve("timeout"), 100),
            ),
          ]);
        }
        while (statusQueue.length > 0 && !aborted) {
          const status = statusQueue.shift()!;
          lastStatus = status;
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          if (status === COMPLETED_STATUS) {
            yield `Completed in ${elapsedSeconds.toFixed(1)}s`;
          } else {
            yield `${status} ${elapsedSeconds.toFixed(1)}s`;
          }
        }
        if (aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (caughtError) {
          throw caughtError;
        }
      } finally {
        signal.removeEventListener("abort", handleAbort);
      }
    },

    supportsResume: true,
    supportsFollowUp: true,

    checkConnection: createCachedConnectionChecker(async () => {
      const response = await fetch(AMI_BRIDGE_URL, { method: "HEAD" });
      return response.ok;
    }, CONNECTION_CHECK_TTL_MS),

    undo: async () => {
      if (!lastAgentMessages) return;

      try {
        await revertFileEdits({
          messages: lastAgentMessages,
          cwd: window.location.href,
        });
        lastAgentMessages = null;
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

  const provider = createAmiAgentProvider();

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

  // HACK: Check again after adding listener in case of race condition
  const apiAfterListener = window.__REACT_GRAB__;
  if (isReactGrabApi(apiAfterListener)) {
    attach(apiAfterListener);
  }
};

attachAgent();
