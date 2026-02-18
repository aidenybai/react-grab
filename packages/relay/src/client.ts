import type {
  AgentContext,
  BrowserToRelayMessage,
  RelayToBrowserMessage,
} from "./protocol.js";
import {
  DEFAULT_RELAY_PORT,
  DEFAULT_RECONNECT_INTERVAL_MS,
  RELAY_TOKEN_PARAM,
} from "./protocol.js";

export interface RelayClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  sendAgentRequest: (agentId: string, context: AgentContext) => boolean;
  abortAgent: (agentId: string, sessionId: string) => void;
  undoAgent: (agentId: string, sessionId: string) => boolean;
  redoAgent: (agentId: string, sessionId: string) => boolean;
  onMessage: (callback: (message: RelayToBrowserMessage) => void) => () => void;
  onHandlersChange: (callback: (handlers: string[]) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
  getAvailableHandlers: () => string[];
}

interface RelayClientOptions {
  serverUrl?: string;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
  token?: string;
}

export const createRelayClient = (
  options: RelayClientOptions = {},
): RelayClient => {
  const serverUrl = options.serverUrl ?? `ws://localhost:${DEFAULT_RELAY_PORT}`;
  const autoReconnect = options.autoReconnect ?? true;
  const reconnectIntervalMs =
    options.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL_MS;
  const token = options.token;

  let webSocketConnection: WebSocket | null = null;
  let isConnectedState = false;
  let availableHandlers: string[] = [];
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingConnectionPromise: Promise<void> | null = null;
  let pendingConnectionReject: ((error: Error) => void) | null = null;
  let isIntentionalDisconnect = false;

  const messageCallbacks = new Set<(message: RelayToBrowserMessage) => void>();
  const handlersChangeCallbacks = new Set<(handlers: string[]) => void>();
  const connectionChangeCallbacks = new Set<(connected: boolean) => void>();

  const scheduleReconnect = () => {
    if (!autoReconnect || reconnectTimeoutId || isIntentionalDisconnect) return;

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      connect().catch(() => {});
    }, reconnectIntervalMs);
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data as string) as RelayToBrowserMessage;

      if (message.type === "handlers" && message.handlers) {
        availableHandlers = message.handlers;
        for (const callback of handlersChangeCallbacks) {
          callback(availableHandlers);
        }
      }

      for (const callback of messageCallbacks) {
        callback(message);
      }
    } catch {}
  };

  const connect = (): Promise<void> => {
    if (webSocketConnection?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (pendingConnectionPromise) {
      return pendingConnectionPromise;
    }

    isIntentionalDisconnect = false;

    pendingConnectionPromise = new Promise((resolve, reject) => {
      pendingConnectionReject = reject;
      const connectionUrl = token
        ? `${serverUrl}?${RELAY_TOKEN_PARAM}=${encodeURIComponent(token)}`
        : serverUrl;
      webSocketConnection = new WebSocket(connectionUrl);

      webSocketConnection.onopen = () => {
        pendingConnectionPromise = null;
        pendingConnectionReject = null;
        isConnectedState = true;
        for (const callback of connectionChangeCallbacks) {
          callback(true);
        }
        resolve();
      };

      webSocketConnection.onmessage = handleMessage;

      webSocketConnection.onclose = () => {
        if (pendingConnectionReject) {
          pendingConnectionReject(new Error("WebSocket connection closed"));
          pendingConnectionReject = null;
        }
        pendingConnectionPromise = null;
        isConnectedState = false;
        availableHandlers = [];
        for (const callback of handlersChangeCallbacks) {
          callback(availableHandlers);
        }
        for (const callback of connectionChangeCallbacks) {
          callback(false);
        }
        scheduleReconnect();
      };

      webSocketConnection.onerror = () => {
        pendingConnectionPromise = null;
        pendingConnectionReject = null;
        isConnectedState = false;
        reject(new Error("WebSocket connection failed"));
      };
    });

    return pendingConnectionPromise;
  };

  const disconnect = () => {
    isIntentionalDisconnect = true;
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    if (pendingConnectionReject) {
      pendingConnectionReject(new Error("Connection aborted"));
      pendingConnectionReject = null;
    }
    pendingConnectionPromise = null;
    webSocketConnection?.close();
    webSocketConnection = null;
    isConnectedState = false;
    availableHandlers = [];
  };

  const isConnected = () => isConnectedState;

  const sendMessage = (message: BrowserToRelayMessage): boolean => {
    if (webSocketConnection?.readyState === WebSocket.OPEN) {
      webSocketConnection.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const sendAgentRequest = (
    agentId: string,
    context: AgentContext,
  ): boolean => {
    return sendMessage({
      type: "agent-request",
      agentId,
      sessionId: context.sessionId,
      context,
    });
  };

  const abortAgent = (agentId: string, sessionId: string) => {
    sendMessage({
      type: "agent-abort",
      agentId,
      sessionId,
    });
  };

  const undoAgent = (agentId: string, sessionId: string): boolean => {
    return sendMessage({
      type: "agent-undo",
      agentId,
      sessionId,
    });
  };

  const redoAgent = (agentId: string, sessionId: string): boolean => {
    return sendMessage({
      type: "agent-redo",
      agentId,
      sessionId,
    });
  };

  const onMessage = (
    callback: (message: RelayToBrowserMessage) => void,
  ): (() => void) => {
    messageCallbacks.add(callback);
    return () => messageCallbacks.delete(callback);
  };

  const onHandlersChange = (
    callback: (handlers: string[]) => void,
  ): (() => void) => {
    handlersChangeCallbacks.add(callback);
    return () => handlersChangeCallbacks.delete(callback);
  };

  const onConnectionChange = (
    callback: (connected: boolean) => void,
  ): (() => void) => {
    connectionChangeCallbacks.add(callback);
    queueMicrotask(() => {
      if (connectionChangeCallbacks.has(callback)) {
        callback(isConnectedState);
      }
    });
    return () => connectionChangeCallbacks.delete(callback);
  };

  const getAvailableHandlers = () => availableHandlers;

  return {
    connect,
    disconnect,
    isConnected,
    sendAgentRequest,
    abortAgent,
    undoAgent,
    redoAgent,
    onMessage,
    onHandlersChange,
    onConnectionChange,
    getAvailableHandlers,
  };
};

export interface AgentProvider {
  send: (context: AgentContext, signal: AbortSignal) => AsyncIterable<string>;
  abort?: (sessionId: string) => Promise<void>;
  undo?: () => Promise<void>;
  redo?: () => Promise<void>;
  checkConnection?: () => Promise<boolean>;
  supportsResume?: boolean;
  supportsFollowUp?: boolean;
}

interface CreateRelayAgentProviderOptions {
  relayClient: RelayClient;
  agentId: string;
}

export const createRelayAgentProvider = (
  options: CreateRelayAgentProviderOptions,
): AgentProvider => {
  const { relayClient, agentId } = options;

  const checkConnection = async (): Promise<boolean> => {
    if (!relayClient.isConnected()) {
      try {
        await relayClient.connect();
      } catch {
        return false;
      }
    }
    return relayClient.getAvailableHandlers().includes(agentId);
  };

  const send = async function* (
    context: AgentContext,
    signal: AbortSignal,
  ): AsyncIterable<string> {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    yield "Connecting…";

    const sessionId =
      context.sessionId ??
      `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const contextWithSession: AgentContext = {
      ...context,
      sessionId,
    };

    const messageQueue: string[] = [];
    let resolveNextMessage:
      | ((value: IteratorResult<string, void>) => void)
      | null = null;
    let rejectNextMessage: ((error: Error) => void) | null = null;
    let isDone = false;
    let errorMessage: string | null = null;

    const handleAbort = () => {
      relayClient.abortAgent(agentId, sessionId);
      isDone = true;
      if (resolveNextMessage) {
        resolveNextMessage({ value: undefined, done: true });
        resolveNextMessage = null;
        rejectNextMessage = null;
      }
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    const handleConnectionChange = (connected: boolean) => {
      if (!connected && !isDone) {
        errorMessage = "Relay connection lost";
        isDone = true;
        if (rejectNextMessage) {
          rejectNextMessage(new Error(errorMessage));
          resolveNextMessage = null;
          rejectNextMessage = null;
        }
      }
    };

    const unsubscribeConnection = relayClient.onConnectionChange(
      handleConnectionChange,
    );

    const unsubscribeMessage = relayClient.onMessage((message) => {
      if (message.sessionId !== sessionId) return;

      if (message.type === "agent-status" && message.content) {
        messageQueue.push(message.content);
        if (resolveNextMessage) {
          const nextMessage = messageQueue.shift();
          if (nextMessage !== undefined) {
            resolveNextMessage({ value: nextMessage, done: false });
            resolveNextMessage = null;
            rejectNextMessage = null;
          }
        }
      } else if (message.type === "agent-done") {
        isDone = true;
        if (resolveNextMessage) {
          resolveNextMessage({ value: undefined, done: true });
          resolveNextMessage = null;
          rejectNextMessage = null;
        }
      } else if (message.type === "agent-error") {
        errorMessage = message.content ?? "Unknown error";
        isDone = true;
        if (rejectNextMessage) {
          rejectNextMessage(new Error(errorMessage));
          resolveNextMessage = null;
          rejectNextMessage = null;
        }
      }
    });

    if (!relayClient.isConnected()) {
      unsubscribeConnection();
      unsubscribeMessage();
      signal.removeEventListener("abort", handleAbort);
      throw new Error("Relay connection is not open");
    }

    const didSendRequest = relayClient.sendAgentRequest(
      agentId,
      contextWithSession,
    );
    if (!didSendRequest) {
      unsubscribeConnection();
      unsubscribeMessage();
      signal.removeEventListener("abort", handleAbort);
      throw new Error("Failed to send agent request: connection not open");
    }

    try {
      while (true) {
        if (messageQueue.length > 0) {
          const next = messageQueue.shift();
          if (next !== undefined) {
            yield next;
          }
          continue;
        }

        if (isDone || signal.aborted) {
          break;
        }

        const result = await new Promise<IteratorResult<string, void>>(
          (resolve, reject) => {
            resolveNextMessage = resolve;
            rejectNextMessage = reject;
          },
        );

        if (result.done) break;
        yield result.value;
      }

      if (errorMessage) {
        throw new Error(errorMessage);
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
      unsubscribeConnection();
      unsubscribeMessage();
    }
  };

  const abort = async (sessionId: string): Promise<void> => {
    relayClient.abortAgent(agentId, sessionId);
  };

  const waitForOperationResponse = (sessionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let didCleanup = false;

      const cleanup = () => {
        if (didCleanup) return;
        didCleanup = true;
        unsubscribeMessage();
        unsubscribeConnection();
      };

      const unsubscribeMessage = relayClient.onMessage((message) => {
        if (message.sessionId !== sessionId) return;

        cleanup();

        if (message.type === "agent-done") {
          resolve();
        } else if (message.type === "agent-error") {
          reject(new Error(message.content ?? "Operation failed"));
        }
      });

      const unsubscribeConnection = relayClient.onConnectionChange(
        (connected) => {
          if (!connected) {
            cleanup();
            reject(
              new Error("Connection lost while waiting for operation response"),
            );
          }
        },
      );
    });
  };

  const undo = async (): Promise<void> => {
    const sessionId = `undo-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const didSend = relayClient.undoAgent(agentId, sessionId);
    if (!didSend) {
      throw new Error("Failed to send undo request: connection not open");
    }
    return waitForOperationResponse(sessionId);
  };

  const redo = async (): Promise<void> => {
    const sessionId = `redo-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const didSend = relayClient.redoAgent(agentId, sessionId);
    if (!didSend) {
      throw new Error("Failed to send redo request: connection not open");
    }
    return waitForOperationResponse(sessionId);
  };

  return {
    send,
    abort,
    undo,
    redo,
    checkConnection,
    supportsResume: true,
    supportsFollowUp: true,
  };
};

interface ReactGrabApi {
  registerPlugin: (plugin: unknown) => void;
}

declare global {
  interface Window {
    __REACT_GRAB_RELAY__?: RelayClient;
    __REACT_GRAB__?: ReactGrabApi;
  }
}

let defaultRelayClient: RelayClient | null = null;

export const getDefaultRelayClient = (): RelayClient | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.__REACT_GRAB_RELAY__) {
    defaultRelayClient = window.__REACT_GRAB_RELAY__;
    return defaultRelayClient;
  }

  if (!defaultRelayClient) {
    defaultRelayClient = createRelayClient();
    window.__REACT_GRAB_RELAY__ = defaultRelayClient;
  }
  return defaultRelayClient;
};

interface ProviderPluginConfig {
  agentId: string;
  pluginName: string;
  actionId: string;
  actionLabel: string;
}

const isReactGrabApi = (value: unknown): value is ReactGrabApi =>
  typeof value === "object" && value !== null && "registerPlugin" in value;

export const createProviderClientPlugin = (config: ProviderPluginConfig) => {
  const createAgentProvider = (
    providerOptions: { relayClient?: RelayClient } = {},
  ): AgentProvider => {
    const relayClient = providerOptions.relayClient ?? getDefaultRelayClient();
    if (!relayClient) {
      throw new Error("RelayClient is required in browser environments");
    }

    return createRelayAgentProvider({
      relayClient,
      agentId: config.agentId,
    });
  };

  const attachAgent = async () => {
    if (typeof window === "undefined") return;

    const relayClient = getDefaultRelayClient();
    if (!relayClient) return;

    try {
      await relayClient.connect();
    } catch {
      return;
    }

    const provider = createRelayAgentProvider({
      relayClient,
      agentId: config.agentId,
    });

    const attach = (api: ReactGrabApi) => {
      const agent = { provider, storage: sessionStorage };
      api.registerPlugin({
        name: config.pluginName,
        actions: [
          {
            id: config.actionId,
            label: config.actionLabel,
            shortcut: "Enter",
            onAction: (actionContext: {
              enterPromptMode?: (agent: unknown) => void;
            }) => {
              actionContext.enterPromptMode?.(agent);
            },
            agent,
          },
        ],
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

  return { createAgentProvider, attachAgent };
};
