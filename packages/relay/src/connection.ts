import pc from "picocolors";
import fkill from "fkill";
import type { AgentHandler } from "./protocol.js";
import {
  DEFAULT_RELAY_PORT,
  HANDLER_RECONNECT_DELAY_MS,
  HEALTH_CHECK_TIMEOUT_MS,
  POST_KILL_DELAY_MS,
  RELAY_TOKEN_PARAM,
} from "./protocol.js";
import { createRelayServer, type RelayServer } from "./server.js";
import { sleep } from "@react-grab/utils/server";

const VERSION = process.env.VERSION ?? "0.0.0";

const getRelayMessageType = (
  agentMessageType: string,
): "agent-status" | "agent-error" | "agent-done" => {
  if (agentMessageType === "status") return "agent-status";
  if (agentMessageType === "error") return "agent-error";
  return "agent-done";
};

interface ConnectRelayOptions {
  port?: number;
  handler: AgentHandler;
  token?: string;
  secure?: boolean;
  certHostnames?: string[];
}

interface RelayConnection {
  disconnect: () => Promise<void>;
}

interface HealthCheckResult {
  isRunning: true;
  isSecure: boolean;
}

const checkIfRelayServerIsRunning = async (
  port: number,
  token?: string,
  secure?: boolean,
): Promise<false | HealthCheckResult> => {
  const tryProtocol = async (useHttps: boolean): Promise<boolean> => {
    try {
      const httpProtocol = useHttps ? "https" : "http";
      const healthUrl = token
        ? `${httpProtocol}://localhost:${port}/health?${RELAY_TOKEN_PARAM}=${encodeURIComponent(token)}`
        : `${httpProtocol}://localhost:${port}/health`;

      if (useHttps) {
        // HACK: rejectUnauthorized: false is needed because mkcert generates self-signed certs
        const https = await import("node:https");
        return new Promise((resolve) => {
          const request = https.get(
            healthUrl,
            { rejectUnauthorized: false, timeout: HEALTH_CHECK_TIMEOUT_MS },
            (response) => resolve(response.statusCode === 200),
          );
          request.on("error", () => resolve(false));
          request.on("timeout", () => {
            request.destroy();
            resolve(false);
          });
        });
      }

      const response = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  if (secure !== undefined) {
    const result = await tryProtocol(secure);
    if (result) return { isRunning: true, isSecure: secure };
    const fallbackResult = await tryProtocol(!secure);
    if (fallbackResult) return { isRunning: true, isSecure: !secure };
    return false;
  }

  const httpResult = await tryProtocol(false);
  if (httpResult) return { isRunning: true, isSecure: false };
  const httpsResult = await tryProtocol(true);
  if (httpsResult) return { isRunning: true, isSecure: true };
  return false;
};

export const connectRelay = async (
  options: ConnectRelayOptions,
): Promise<RelayConnection> => {
  const relayPort = options.port ?? DEFAULT_RELAY_PORT;
  const { handler, token, secure, certHostnames } = options;

  let relayServer: RelayServer | null = null;
  let isRelayHost = false;

  const healthCheckResult = await checkIfRelayServerIsRunning(
    relayPort,
    token,
    secure,
  );

  const isRelayServerRunning = Boolean(healthCheckResult);
  const detectedSecure = healthCheckResult
    ? healthCheckResult.isSecure
    : undefined;

  let isSecureMode = secure ?? detectedSecure ?? false;

  const startServer = async (useSecure: boolean): Promise<void> => {
    const onSecureUpgradeRequested = async () => {
      if (isSecureMode || !isRelayHost) return;
      isSecureMode = true;

      console.log(
        pc.yellow(
          "Secure connection requested by browser, upgrading to HTTPS...",
        ),
      );

      await relayServer?.stop();

      try {
        relayServer = createRelayServer({
          port: relayPort,
          token,
          secure: true,
          onSecureUpgradeRequested,
          certHostnames,
        });
        relayServer.registerHandler(handler);
        await relayServer.start();

        printStartupMessage(handler.agentId, relayPort, true);
      } catch (error) {
        // HACK: process.exit(1) because the old HTTP server is already stopped, so fallback isn't possible
        console.error(
          pc.red("Failed to upgrade to HTTPS:"),
          error instanceof Error ? error.message : error,
        );
        process.exit(1);
      }
    };

    relayServer = createRelayServer({
      port: relayPort,
      token,
      secure: useSecure,
      onSecureUpgradeRequested,
      certHostnames,
    });
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
      const isNowRunning = await checkIfRelayServerIsRunning(
        relayPort,
        token,
        useSecure,
      );

      if (!isNowRunning) throw error;

      relayServer = await connectToExistingRelay(
        relayPort,
        handler,
        token,
        useSecure,
      );
    }
  };

  if (isRelayServerRunning) {
    const actualSecure = detectedSecure ?? secure;
    relayServer = await connectToExistingRelay(
      relayPort,
      handler,
      token,
      actualSecure,
    );
    isSecureMode = actualSecure ?? false;
  } else {
    await fkill(`:${relayPort}`, { force: true, silent: true }).catch(() => {});
    await sleep(POST_KILL_DELAY_MS);
    await startServer(isSecureMode);
  }

  printStartupMessage(handler.agentId, relayPort, isSecureMode);

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
  secure?: boolean,
): Promise<RelayServer> => {
  const { WebSocket } = await import("ws");

  let currentSocket: typeof WebSocket.prototype | null = null;
  let isSocketClosed = false;
  let isExplicitDisconnect = false;
  let hasConnectedOnce = false;
  const activeSessionIds = new Set<string>();
  let currentSecure = secure;

  const sendData = (data: string): boolean => {
    if (
      isSocketClosed ||
      !currentSocket ||
      currentSocket.readyState !== WebSocket.OPEN
    ) {
      return false;
    }
    try {
      currentSocket.send(data);
      return true;
    } catch {
      return false;
    }
  };

  const sendOperationResult = async (
    operation: () => Promise<void> | undefined,
    sessionId: string,
  ): Promise<void> => {
    try {
      await operation();
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
          content: error instanceof Error ? error.message : "Unknown error",
        }),
      );
    }
  };

  const attemptConnection = async (): Promise<void> => {
    if (hasConnectedOnce) {
      const healthCheckResult = await checkIfRelayServerIsRunning(
        port,
        token,
        currentSecure,
      );
      if (healthCheckResult) {
        currentSecure = healthCheckResult.isSecure;
      }
    }

    return new Promise((resolve, reject) => {
      const webSocketProtocol = currentSecure ? "wss" : "ws";
      const connectionUrl = token
        ? `${webSocketProtocol}://localhost:${port}?${RELAY_TOKEN_PARAM}=${encodeURIComponent(token)}`
        : `${webSocketProtocol}://localhost:${port}`;
      // HACK: rejectUnauthorized: false is needed because mkcert generates self-signed certs
      const socket = new WebSocket(connectionUrl, {
        headers: { "x-relay-handler": "true" },
        rejectUnauthorized: false,
      });

      socket.on("close", () => {
        isSocketClosed = true;
        for (const sessionId of activeSessionIds) {
          try {
            handler.abort?.(sessionId);
          } catch {}
        }
        activeSessionIds.clear();

        if (!isExplicitDisconnect && hasConnectedOnce) {
          setTimeout(() => {
            attemptConnection().catch(() => {});
          }, HANDLER_RECONNECT_DELAY_MS);
        }
      });

      socket.on("open", () => {
        currentSocket = socket;
        isSocketClosed = false;
        hasConnectedOnce = true;

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
                        type: getRelayMessageType(agentMessage.type),
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
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    }),
                  );
                } finally {
                  activeSessionIds.delete(sessionId);
                }
              } else if (method === "abort") {
                handler.abort?.(sessionId);
              } else if (method === "undo") {
                await sendOperationResult(
                  async () => handler.undo?.(),
                  sessionId,
                );
              } else if (method === "redo") {
                await sendOperationResult(
                  async () => handler.redo?.(),
                  sessionId,
                );
              }
            }
          } catch {}
        });

        resolve();
      });

      socket.on("error", (error) => {
        reject(error);
      });
    });
  };

  await attemptConnection();

  const proxyServer: RelayServer = {
    start: async () => {},
    stop: async () => {
      isExplicitDisconnect = true;
      currentSocket?.close();
    },
    registerHandler: () => {},
    unregisterHandler: (agentId) => {
      isExplicitDisconnect = true;
      sendData(
        JSON.stringify({
          type: "unregister-handler",
          agentId,
        }),
      );
      currentSocket?.close();
    },
    getRegisteredHandlerIds: () => [handler.agentId],
  };

  return proxyServer;
};

const printStartupMessage = (
  agentId: string,
  port: number,
  secure: boolean,
) => {
  const webSocketProtocol = secure ? "wss" : "ws";
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim(`(${agentId})`)}`,
  );
  console.log(
    `- Local:    ${pc.cyan(`${webSocketProtocol}://localhost:${port}`)}`,
  );
};
