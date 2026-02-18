import pc from "picocolors";
import fkill from "fkill";
import type { AgentHandler } from "./protocol.js";
import {
  DEFAULT_RELAY_PORT,
  HEALTH_CHECK_TIMEOUT_MS,
  POST_KILL_DELAY_MS,
  RELAY_TOKEN_PARAM,
} from "./protocol.js";
import { createRelayServer, type RelayServer } from "./server.js";
import { sleep } from "@react-grab/utils/server";

const VERSION = process.env.VERSION ?? "0.0.0";

interface ConnectRelayOptions {
  port?: number;
  handler: AgentHandler;
  token?: string;
}

interface RelayConnection {
  disconnect: () => Promise<void>;
}

const checkIfRelayServerIsRunning = async (
  port: number,
  token?: string,
): Promise<boolean> => {
  try {
    const healthUrl = token
      ? `http://localhost:${port}/health?${RELAY_TOKEN_PARAM}=${encodeURIComponent(token)}`
      : `http://localhost:${port}/health`;
    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const connectRelay = async (
  options: ConnectRelayOptions,
): Promise<RelayConnection> => {
  const relayPort = options.port ?? DEFAULT_RELAY_PORT;
  const { handler, token } = options;

  let relayServer: RelayServer | null = null;
  let isRelayHost = false;

  const isRelayServerRunning = await checkIfRelayServerIsRunning(
    relayPort,
    token,
  );

  if (isRelayServerRunning) {
    relayServer = await connectToExistingRelay(relayPort, handler, token);
  } else {
    await fkill(`:${relayPort}`, { force: true, silent: true }).catch(() => {});
    await sleep(POST_KILL_DELAY_MS);

    relayServer = createRelayServer({ port: relayPort, token });
    relayServer.registerHandler(handler);

    try {
      await relayServer.start();
      isRelayHost = true;
    } catch (error) {
      const isAddressInUse =
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EADDRINUSE";

      if (!isAddressInUse) throw error;

      await sleep(POST_KILL_DELAY_MS);
      const isNowRunning = await checkIfRelayServerIsRunning(relayPort, token);

      if (!isNowRunning) throw error;

      relayServer = await connectToExistingRelay(relayPort, handler, token);
    }
  }

  printStartupMessage(handler.agentId, relayPort);

  const handleShutdown = async () => {
    if (isRelayHost) {
      await relayServer?.stop();
    } else {
      relayServer?.unregisterHandler(handler.agentId);
    }
    process.exit(0);
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);

  return {
    disconnect: async () => {
      process.off("SIGTERM", handleShutdown);
      process.off("SIGINT", handleShutdown);
      if (isRelayHost) {
        await relayServer?.stop();
      } else {
        relayServer?.unregisterHandler(handler.agentId);
      }
    },
  };
};

const connectToExistingRelay = async (
  port: number,
  handler: AgentHandler,
  token?: string,
): Promise<RelayServer> => {
  const { WebSocket } = await import("ws");

  return new Promise((resolve, reject) => {
    const connectionUrl = token
      ? `ws://localhost:${port}?${RELAY_TOKEN_PARAM}=${encodeURIComponent(token)}`
      : `ws://localhost:${port}`;
    const socket = new WebSocket(connectionUrl, {
      headers: { "x-relay-handler": "true" },
    });

    socket.on("open", () => {
      let isSocketClosed = false;
      const activeSessionIds = new Set<string>();

      const sendData = (data: string): boolean => {
        if (isSocketClosed || socket.readyState !== WebSocket.OPEN) {
          return false;
        }
        try {
          socket.send(data);
          return true;
        } catch {
          return false;
        }
      };

      socket.on("close", () => {
        isSocketClosed = true;
        for (const sessionId of activeSessionIds) {
          try {
            handler.abort?.(sessionId);
          } catch {}
        }
        activeSessionIds.clear();
      });

      socket.send(
        JSON.stringify({
          type: "register-handler",
          agentId: handler.agentId,
        }),
      );

      socket.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === "invoke-handler") {
            const { method, sessionId, payload } = message;

            if (method === "run" && payload?.prompt) {
              activeSessionIds.add(sessionId);
              try {
                let didComplete = false;
                for await (const agentMessage of handler.run(payload.prompt, {
                  sessionId,
                })) {
                  if (isSocketClosed) {
                    break;
                  }
                  sendData(
                    JSON.stringify({
                      type:
                        agentMessage.type === "status"
                          ? "agent-status"
                          : agentMessage.type === "error"
                            ? "agent-error"
                            : "agent-done",
                      sessionId,
                      agentId: handler.agentId,
                      content: agentMessage.content,
                    }),
                  );
                  if (
                    agentMessage.type === "done" ||
                    agentMessage.type === "error"
                  ) {
                    didComplete = true;
                  }
                }
                if (!didComplete && !isSocketClosed) {
                  sendData(
                    JSON.stringify({
                      type: "agent-done",
                      sessionId,
                      agentId: handler.agentId,
                      content: "",
                    }),
                  );
                }
              } catch (error) {
                sendData(
                  JSON.stringify({
                    type: "agent-error",
                    sessionId,
                    agentId: handler.agentId,
                    content:
                      error instanceof Error ? error.message : "Unknown error",
                  }),
                );
              } finally {
                activeSessionIds.delete(sessionId);
              }
            } else if (method === "abort") {
              handler.abort?.(sessionId);
            } else if (method === "undo") {
              try {
                await handler.undo?.();
                sendData(
                  JSON.stringify({
                    type: "agent-done",
                    sessionId,
                    agentId: handler.agentId,
                    content: "",
                  }),
                );
              } catch (error) {
                sendData(
                  JSON.stringify({
                    type: "agent-error",
                    sessionId,
                    agentId: handler.agentId,
                    content:
                      error instanceof Error ? error.message : "Unknown error",
                  }),
                );
              }
            } else if (method === "redo") {
              try {
                await handler.redo?.();
                sendData(
                  JSON.stringify({
                    type: "agent-done",
                    sessionId,
                    agentId: handler.agentId,
                    content: "",
                  }),
                );
              } catch (error) {
                sendData(
                  JSON.stringify({
                    type: "agent-error",
                    sessionId,
                    agentId: handler.agentId,
                    content:
                      error instanceof Error ? error.message : "Unknown error",
                  }),
                );
              }
            }
          }
        } catch {}
      });

      const proxyServer: RelayServer = {
        start: async () => {},
        stop: async () => {
          socket.close();
        },
        registerHandler: () => {},
        unregisterHandler: (agentId) => {
          sendData(
            JSON.stringify({
              type: "unregister-handler",
              agentId,
            }),
          );
          socket.close();
        },
        getRegisteredHandlerIds: () => [handler.agentId],
      };

      resolve(proxyServer);
    });

    socket.on("error", (error) => {
      reject(error);
    });
  });
};

const printStartupMessage = (agentId: string, port: number) => {
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim(`(${agentId})`)}`,
  );
  console.log(`- Local:    ${pc.cyan(`ws://localhost:${port}`)}`);
};

export const startProviderServer = (source: string, handler: AgentHandler) => {
  fetch(
    `https://www.react-grab.com/api/version?source=${source}&t=${Date.now()}`,
  ).catch(() => {});

  connectRelay({ handler });
};
