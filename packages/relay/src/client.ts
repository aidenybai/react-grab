import type {
  AgentContext,
  BrowserToRelayMessage,
  RelayToBrowserMessage,
} from "./protocol.js";
import { DEFAULT_RELAY_PORT } from "./protocol.js";

export interface RelayClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  sendAgentRequest: (agentId: string, context: AgentContext) => void;
  abortAgent: (agentId: string, sessionId: string) => void;
  undoAgent: (agentId: string) => void;
  redoAgent: (agentId: string) => void;
  onMessage: (callback: (message: RelayToBrowserMessage) => void) => () => void;
  onHandlersChange: (callback: (handlers: string[]) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
  getAvailableHandlers: () => string[];
}

interface RelayClientOptions {
  serverUrl?: string;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
}

export const createRelayClient = (
  options: RelayClientOptions = {},
): RelayClient => {
  const serverUrl =
    options.serverUrl ?? `ws://localhost:${DEFAULT_RELAY_PORT}`;
  const autoReconnect = options.autoReconnect ?? true;
  const reconnectIntervalMs = options.reconnectIntervalMs ?? 3000;

  let webSocketConnection: WebSocket | null = null;
  let isConnectedState = false;
  let availableHandlers: string[] = [];
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingConnectionPromise: Promise<void> | null = null;
  let pendingConnectionReject: ((error: Error) => void) | null = null;

  const messageCallbacks = new Set<(message: RelayToBrowserMessage) => void>();
  const handlersChangeCallbacks = new Set<(handlers: string[]) => void>();
  const connectionChangeCallbacks = new Set<(connected: boolean) => void>();

  const scheduleReconnect = () => {
    if (!autoReconnect || reconnectTimeoutId) return;

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

    pendingConnectionPromise = new Promise((resolve, reject) => {
      pendingConnectionReject = reject;
      webSocketConnection = new WebSocket(serverUrl);

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
        pendingConnectionPromise = null;
        pendingConnectionReject = null;
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

  const sendMessage = (message: BrowserToRelayMessage) => {
    if (webSocketConnection?.readyState === WebSocket.OPEN) {
      webSocketConnection.send(JSON.stringify(message));
    }
  };

  const sendAgentRequest = (agentId: string, context: AgentContext) => {
    sendMessage({
      type: "agent-request",
      agentId,
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

  const undoAgent = (agentId: string) => {
    sendMessage({
      type: "agent-undo",
      agentId,
    });
  };

  const redoAgent = (agentId: string) => {
    sendMessage({
      type: "agent-redo",
      agentId,
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
  send: (
    context: AgentContext,
    signal: AbortSignal,
  ) => AsyncIterable<string>;
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
    const sessionId =
      context.sessionId ??
      `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const contextWithSession: AgentContext = {
      ...context,
      sessionId,
    };

    const messageQueue: string[] = [];
    let resolveNext: ((value: IteratorResult<string>) => void) | null = null;
    let rejectNext: ((error: Error) => void) | null = null;
    let isDone = false;
    let errorMessage: string | null = null;

    const handleAbort = () => {
      relayClient.abortAgent(agentId, sessionId);
      isDone = true;
      if (resolveNext) {
        resolveNext({ value: undefined as unknown as string, done: true });
        resolveNext = null;
        rejectNext = null;
      }
    };

    signal.addEventListener("abort", handleAbort);

    const handleConnectionChange = (connected: boolean) => {
      if (!connected && !isDone) {
        errorMessage = "Relay connection lost";
        isDone = true;
        if (rejectNext) {
          rejectNext(new Error(errorMessage));
          resolveNext = null;
          rejectNext = null;
        }
      }
    };

    const unsubscribeConnection =
      relayClient.onConnectionChange(handleConnectionChange);

    const unsubscribeMessage = relayClient.onMessage((message) => {
      if (message.sessionId !== sessionId) return;

      if (message.type === "agent-status" && message.content) {
        messageQueue.push(message.content);
        if (resolveNext) {
          const next = messageQueue.shift();
          if (next !== undefined) {
            resolveNext({ value: next, done: false });
            resolveNext = null;
            rejectNext = null;
          }
        }
      } else if (message.type === "agent-done") {
        isDone = true;
        if (resolveNext) {
          resolveNext({ value: undefined as unknown as string, done: true });
          resolveNext = null;
          rejectNext = null;
        }
      } else if (message.type === "agent-error") {
        errorMessage = message.content ?? "Unknown error";
        isDone = true;
        if (resolveNext) {
          resolveNext({ value: undefined as unknown as string, done: true });
          resolveNext = null;
          rejectNext = null;
        }
      }
    });

    relayClient.sendAgentRequest(agentId, contextWithSession);

    try {
      while (true) {
        // Drain pending messages first (matching server-side pattern)
        if (messageQueue.length > 0) {
          const next = messageQueue.shift();
          if (next !== undefined) {
            yield next;
          }
          continue;
        }

        // Only check done/aborted state after queue is empty
        if (isDone || signal.aborted) {
          break;
        }

        const result = await new Promise<IteratorResult<string>>(
          (resolve, reject) => {
            resolveNext = resolve;
            rejectNext = reject;
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

  const undo = async (): Promise<void> => {
    relayClient.undoAgent(agentId);
  };

  const redo = async (): Promise<void> => {
    relayClient.redoAgent(agentId);
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

let defaultRelayClient: RelayClient | null = null;

export const getDefaultRelayClient = (): RelayClient => {
  if (!defaultRelayClient) {
    defaultRelayClient = createRelayClient();
  }
  return defaultRelayClient;
};
