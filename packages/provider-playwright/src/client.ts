import type { Command, Response, Message } from "./protocol";
import { handleCommand } from "./handlers";
import {
  DEFAULT_PORT,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_INTERVAL_MS,
  MAX_RECONNECT_INTERVAL_MS,
} from "./constants";

export interface ClientOptions {
  port?: number;
  host?: string;
  autoReconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface PlaywrightClient {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

export const createClient = (options: ClientOptions = {}): PlaywrightClient => {
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? "localhost";
  const autoReconnect = options.autoReconnect ?? true;

  let websocket: WebSocket | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let shouldReconnect = true;

  const clearHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatInterval = setInterval(() => {
      if (websocket?.readyState === WebSocket.OPEN) {
        const pingCommand: Command = {
          id: crypto.randomUUID(),
          method: "ping",
        };
        websocket.send(JSON.stringify(pingCommand));
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const scheduleReconnect = () => {
    if (!autoReconnect || !shouldReconnect) return;

    clearReconnectTimeout();
    const delay = Math.min(
      RECONNECT_INTERVAL_MS * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_INTERVAL_MS,
    );
    reconnectAttempts++;

    console.log(`[playwright] reconnecting in ${delay}ms...`);
    reconnectTimeout = setTimeout(() => {
      connect();
    }, delay);
  };

  const handleMessage = async (event: MessageEvent) => {
    try {
      const message: Message = JSON.parse(event.data);

      if ("type" in message && message.type === "relay-ready") {
        const readyMessage = { type: "client-ready" };
        websocket?.send(JSON.stringify(readyMessage));
        return;
      }

      if ("method" in message && "id" in message) {
        const command = message as Command;
        const response = await handleCommand(command);
        websocket?.send(JSON.stringify(response));
      }
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  const connect = () => {
    if (websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    clearReconnectTimeout();

    const url = `ws://${host}:${port}`;
    websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("[playwright] connected");
      reconnectAttempts = 0;
      startHeartbeat();
      options.onConnect?.();
    };

    websocket.onclose = () => {
      console.log("[playwright] disconnected");
      clearHeartbeat();
      options.onDisconnect?.();
      scheduleReconnect();
    };

    websocket.onerror = (event) => {
      options.onError?.(new Error(`WebSocket error: ${event}`));
    };

    websocket.onmessage = handleMessage;
  };

  const disconnect = () => {
    shouldReconnect = false;
    clearHeartbeat();
    clearReconnectTimeout();
    if (websocket) {
      websocket.close();
      websocket = null;
    }
  };

  const isConnected = () => websocket?.readyState === WebSocket.OPEN;

  return { connect, disconnect, isConnected };
};
