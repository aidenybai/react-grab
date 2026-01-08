import { WebSocketServer, WebSocket } from "ws";
import { createServer as createHttpServer } from "node:http";
import type {
  AgentHandler,
  AgentMessage,
  BrowserToRelayMessage,
  HandlerMessage,
  RelayToHandlerMessage,
  RelayToBrowserMessage,
  AgentContext,
} from "./protocol.js";
import { DEFAULT_RELAY_PORT } from "./protocol.js";

interface RegisteredHandler {
  agentId: string;
  handler: AgentHandler;
  socket?: WebSocket;
}

interface SessionMessageQueue {
  push: (message: AgentMessage) => void;
  close: () => void;
  [Symbol.asyncIterator]: () => AsyncIterator<AgentMessage>;
}

const createSessionMessageQueue = (): SessionMessageQueue => {
  const pendingMessages: AgentMessage[] = [];
  let resolveNextMessage:
    | ((result: IteratorResult<AgentMessage>) => void)
    | null = null;
  let isClosed = false;

  return {
    push: (message) => {
      if (isClosed) return;
      if (resolveNextMessage) {
        resolveNextMessage({ value: message, done: false });
        resolveNextMessage = null;
      } else {
        pendingMessages.push(message);
      }
    },
    close: () => {
      isClosed = true;
      if (resolveNextMessage) {
        resolveNextMessage({
          value: undefined,
          done: true,
        } as IteratorResult<AgentMessage>);
        resolveNextMessage = null;
      }
    },
    [Symbol.asyncIterator]: () => ({
      next: () => {
        if (pendingMessages.length > 0) {
          return Promise.resolve({
            value: pendingMessages.shift()!,
            done: false,
          });
        }
        if (isClosed) {
          return Promise.resolve({
            value: undefined,
            done: true,
          } as IteratorResult<AgentMessage>);
        }
        return new Promise((resolve) => {
          resolveNextMessage = resolve;
        });
      },
    }),
  };
};

interface ActiveSession {
  sessionId: string;
  agentId: string;
  browserSocket: WebSocket;
  abortController: AbortController;
}

interface RelayServerOptions {
  port?: number;
}

export interface RelayServer {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  registerHandler: (handler: AgentHandler) => void;
  unregisterHandler: (agentId: string) => void;
  getRegisteredHandlerIds: () => string[];
}

export const createRelayServer = (
  options: RelayServerOptions = {},
): RelayServer => {
  const port = options.port ?? DEFAULT_RELAY_PORT;

  const registeredHandlers = new Map<string, RegisteredHandler>();
  const activeSessions = new Map<string, ActiveSession>();
  const browserSockets = new Set<WebSocket>();
  const handlerSockets = new Map<WebSocket, string>();
  const sessionMessageQueues = new Map<string, SessionMessageQueue>();

  let httpServer: ReturnType<typeof createHttpServer> | null = null;
  let wss: WebSocketServer | null = null;

  const broadcastHandlerList = () => {
    const handlerIds = Array.from(registeredHandlers.keys());
    const message: RelayToBrowserMessage = {
      type: "handlers",
      handlers: handlerIds,
    };
    const messageStr = JSON.stringify(message);

    for (const socket of browserSockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(messageStr);
      }
    }
  };

  const sendToBrowser = (
    socket: WebSocket,
    message: RelayToBrowserMessage,
  ) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const handleBrowserMessage = async (
    socket: WebSocket,
    message: BrowserToRelayMessage,
  ) => {
    const { type, agentId, sessionId, context } = message;

    if (type === "health") {
      sendToBrowser(socket, { type: "health" });
      return;
    }

    const registered = registeredHandlers.get(agentId);
    if (!registered) {
      sendToBrowser(socket, {
        type: "agent-error",
        agentId,
        sessionId,
        content: `Agent "${agentId}" is not registered`,
      });
      return;
    }

    const effectiveSessionId =
      sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (type === "agent-request") {
      if (
        !context ||
        typeof context.prompt !== "string" ||
        !Array.isArray(context.content)
      ) {
        sendToBrowser(socket, {
          type: "agent-error",
          agentId,
          sessionId: effectiveSessionId,
          content: "Invalid context: missing or malformed prompt/content",
        });
        return;
      }

      const abortController = new AbortController();
      activeSessions.set(effectiveSessionId, {
        sessionId: effectiveSessionId,
        agentId,
        browserSocket: socket,
        abortController,
      });

      runAgentTask(
        registered.handler,
        context,
        effectiveSessionId,
        socket,
        abortController.signal,
      );
    } else if (type === "agent-abort") {
      const session = activeSessions.get(effectiveSessionId);
      if (session) {
        session.abortController.abort();
        registered.handler.abort?.(effectiveSessionId);
        activeSessions.delete(effectiveSessionId);
      }
    } else if (type === "agent-undo") {
      try {
        await registered.handler.undo?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendToBrowser(socket, {
          type: "agent-error",
          agentId,
          sessionId: effectiveSessionId,
          content: `Undo failed: ${errorMessage}`,
        });
      }
    } else if (type === "agent-redo") {
      try {
        await registered.handler.redo?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendToBrowser(socket, {
          type: "agent-error",
          agentId,
          sessionId: effectiveSessionId,
          content: `Redo failed: ${errorMessage}`,
        });
      }
    }
  };

  const runAgentTask = async (
    handler: AgentHandler,
    context: AgentContext,
    sessionId: string,
    browserSocket: WebSocket,
    signal: AbortSignal,
  ) => {
    const combinedPrompt = `${context.prompt}\n\n${context.content.join("\n\n")}`;

    try {
      let didComplete = false;

      for await (const message of handler.run(combinedPrompt, {
        sessionId,
        signal,
      })) {
        if (signal.aborted) break;

        sendToBrowser(browserSocket, {
          type:
            message.type === "status"
              ? "agent-status"
              : message.type === "error"
                ? "agent-error"
                : "agent-done",
          agentId: handler.agentId,
          sessionId,
          content: message.content,
        });

        if (message.type === "done" || message.type === "error") {
          didComplete = true;
          break;
        }
      }

      if (!signal.aborted && !didComplete) {
        sendToBrowser(browserSocket, {
          type: "agent-done",
          agentId: handler.agentId,
          sessionId,
        });
      }
    } catch (error) {
      if (!signal.aborted) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendToBrowser(browserSocket, {
          type: "agent-error",
          agentId: handler.agentId,
          sessionId,
          content: errorMessage,
        });
      }
    } finally {
      activeSessions.delete(sessionId);
    }
  };

  const createRemoteHandler = (
    agentId: string,
    socket: WebSocket,
  ): AgentHandler => {
    return {
      agentId,
      run: async function* (userPrompt, options) {
        const sessionId =
          options?.sessionId ??
          `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const signal = options?.signal;

        const messageQueue = createSessionMessageQueue();
        sessionMessageQueues.set(sessionId, messageQueue);

        const cleanupQueue = () => {
          messageQueue.close();
          sessionMessageQueues.delete(sessionId);
        };

        if (signal) {
          signal.addEventListener("abort", cleanupQueue, { once: true });

          if (signal.aborted) {
            cleanupQueue();
            return;
          }
        }

        const invokeMessage: RelayToHandlerMessage = {
          type: "invoke-handler",
          method: "run",
          sessionId,
          payload: { prompt: userPrompt },
        };

        if (socket.readyState !== WebSocket.OPEN) {
          yield { type: "error", content: "Handler disconnected" };
          cleanupQueue();
          return;
        }

        socket.send(JSON.stringify(invokeMessage));

        try {
          for await (const message of messageQueue) {
            if (signal?.aborted) break;
            yield message;
            if (message.type === "done" || message.type === "error") {
              break;
            }
          }
        } finally {
          if (signal) {
            signal.removeEventListener("abort", cleanupQueue);
          }
          cleanupQueue();
        }
      },
      abort: (sessionId) => {
        if (socket.readyState === WebSocket.OPEN) {
          const abortMessage: RelayToHandlerMessage = {
            type: "invoke-handler",
            method: "abort",
            sessionId,
          };
          socket.send(JSON.stringify(abortMessage));
        }
      },
      undo: async () => {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error("Handler disconnected");
        }

        const sessionId = `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const messageQueue = createSessionMessageQueue();
        sessionMessageQueues.set(sessionId, messageQueue);

        const undoMessage: RelayToHandlerMessage = {
          type: "invoke-handler",
          method: "undo",
          sessionId,
        };
        socket.send(JSON.stringify(undoMessage));

        try {
          for await (const message of messageQueue) {
            if (message.type === "error") {
              throw new Error(message.content);
            }
            if (message.type === "done") {
              return;
            }
          }
        } finally {
          messageQueue.close();
          sessionMessageQueues.delete(sessionId);
        }
      },
      redo: async () => {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error("Handler disconnected");
        }

        const sessionId = `redo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const messageQueue = createSessionMessageQueue();
        sessionMessageQueues.set(sessionId, messageQueue);

        const redoMessage: RelayToHandlerMessage = {
          type: "invoke-handler",
          method: "redo",
          sessionId,
        };
        socket.send(JSON.stringify(redoMessage));

        try {
          for await (const message of messageQueue) {
            if (message.type === "error") {
              throw new Error(message.content);
            }
            if (message.type === "done") {
              return;
            }
          }
        } finally {
          messageQueue.close();
          sessionMessageQueues.delete(sessionId);
        }
      },
    };
  };

  const handleHandlerMessage = (socket: WebSocket, message: HandlerMessage) => {
    if (message.type === "register-handler") {
      const remoteHandler = createRemoteHandler(message.agentId, socket);
      registeredHandlers.set(message.agentId, {
        agentId: message.agentId,
        handler: remoteHandler,
        socket,
      });
      handlerSockets.set(socket, message.agentId);
      broadcastHandlerList();
    } else if (message.type === "unregister-handler") {
      const agentId = handlerSockets.get(socket);
      if (agentId) {
        const registeredHandler = registeredHandlers.get(agentId);
        if (registeredHandler?.socket === socket) {
          registeredHandlers.delete(agentId);
          broadcastHandlerList();
        }
        handlerSockets.delete(socket);
      }
    } else if (
      message.type === "agent-status" ||
      message.type === "agent-done" ||
      message.type === "agent-error"
    ) {
      const messageQueue = sessionMessageQueues.get(message.sessionId);
      if (messageQueue) {
        const mappedType =
          message.type === "agent-status"
            ? "status"
            : message.type === "agent-done"
              ? "done"
              : "error";

        messageQueue.push({
          type: mappedType,
          content: message.content ?? "",
        });

        if (message.type === "agent-done" || message.type === "agent-error") {
          messageQueue.close();
        }
      }
    }
  };

  const start = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      httpServer = createHttpServer((req, res) => {
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", handlers: getRegisteredHandlerIds() }));
          return;
        }
        res.writeHead(404);
        res.end();
      });

      httpServer.on("error", (error) => {
        reject(error);
      });

      wss = new WebSocketServer({ server: httpServer });

      wss.on("connection", (socket, request) => {
        const isHandlerConnection = request.headers["x-relay-handler"] === "true";

        if (isHandlerConnection) {
          socket.on("message", (data) => {
            try {
              const message = JSON.parse(data.toString()) as HandlerMessage;
              handleHandlerMessage(socket, message);
            } catch {}
          });

          const cleanupHandlerSocket = () => {
            const agentId = handlerSockets.get(socket);
            if (agentId) {
              const registeredHandler = registeredHandlers.get(agentId);
              const isCurrentHandler = registeredHandler?.socket === socket;

              if (isCurrentHandler) {
                for (const [sessionId, session] of activeSessions) {
                  if (session.agentId === agentId) {
                    const queue = sessionMessageQueues.get(sessionId);
                    if (queue) {
                      queue.push({
                        type: "error",
                        content: "Handler disconnected unexpectedly",
                      });
                      queue.close();
                      sessionMessageQueues.delete(sessionId);
                    }
                    session.abortController.abort();
                    activeSessions.delete(sessionId);
                  }
                }

                for (const [sessionId, queue] of sessionMessageQueues) {
                  if (sessionId.startsWith("undo-") || sessionId.startsWith("redo-")) {
                    queue.push({
                      type: "error",
                      content: "Handler disconnected",
                    });
                    queue.close();
                    sessionMessageQueues.delete(sessionId);
                  }
                }

                registeredHandlers.delete(agentId);
                broadcastHandlerList();
              }

              handlerSockets.delete(socket);
            }
          };

          socket.on("close", cleanupHandlerSocket);
          socket.on("error", () => {
            cleanupHandlerSocket();
          });
        } else {
          browserSockets.add(socket);

          sendToBrowser(socket, {
            type: "handlers",
            handlers: getRegisteredHandlerIds(),
          });

          socket.on("message", (data) => {
            try {
              const message = JSON.parse(data.toString()) as BrowserToRelayMessage;
              handleBrowserMessage(socket, message);
            } catch {}
          });

          socket.on("close", () => {
            browserSockets.delete(socket);

            for (const [sessionId, session] of activeSessions) {
              if (session.browserSocket === socket) {
                session.abortController.abort();
                const handler = registeredHandlers.get(session.agentId);
                handler?.handler.abort?.(sessionId);
                activeSessions.delete(sessionId);
              }
            }
          });
        }
      });

      httpServer.listen(port, () => {
        resolve();
      });
    });
  };

  const stop = async (): Promise<void> => {
    for (const session of activeSessions.values()) {
      session.abortController.abort();
    }
    activeSessions.clear();

    for (const queue of sessionMessageQueues.values()) {
      queue.close();
    }
    sessionMessageQueues.clear();

    for (const socket of browserSockets) {
      socket.close();
    }
    browserSockets.clear();

    for (const socket of handlerSockets.keys()) {
      socket.close();
    }
    handlerSockets.clear();

    wss?.close();
    httpServer?.close();
  };

  const registerHandler = (handler: AgentHandler) => {
    registeredHandlers.set(handler.agentId, { agentId: handler.agentId, handler });
    broadcastHandlerList();
  };

  const unregisterHandler = (agentId: string) => {
    registeredHandlers.delete(agentId);
    broadcastHandlerList();
  };

  const getRegisteredHandlerIds = (): string[] => {
    return Array.from(registeredHandlers.keys());
  };

  return {
    start,
    stop,
    registerHandler,
    unregisterHandler,
    getRegisteredHandlerIds,
  };
};
