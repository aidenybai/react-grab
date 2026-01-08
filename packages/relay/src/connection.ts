import pc from "picocolors";
import fkill from "fkill";
import type { AgentHandler } from "./protocol.js";
import { DEFAULT_RELAY_PORT } from "./protocol.js";
import { createRelayServer, type RelayServer } from "./server.js";

const VERSION = process.env.VERSION ?? "0.0.0";

interface ConnectRelayOptions {
  port?: number;
  handler: AgentHandler;
}

interface RelayConnection {
  disconnect: () => Promise<void>;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const checkIfRelayServerIsRunning = async (port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
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
  const { handler } = options;

  let relayServer: RelayServer | null = null;
  let isRelayHost = false;

  const isRelayServerRunning = await checkIfRelayServerIsRunning(relayPort);

  if (isRelayServerRunning) {
    relayServer = await connectToExistingRelay(relayPort, handler);
  } else {
    await fkill(`:${relayPort}`, { force: true, silent: true }).catch(() => {});
    await sleep(100);

    relayServer = createRelayServer({ port: relayPort });
    relayServer.registerHandler(handler);
    await relayServer.start();
    isRelayHost = true;
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
): Promise<RelayServer> => {
  const { WebSocket } = await import("ws");

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${port}`, {
      headers: { "x-relay-handler": "true" },
    });

    socket.on("open", () => {
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
              try {
                for await (const agentMessage of handler.run(payload.prompt, {
                  sessionId,
                })) {
                  socket.send(
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
                }
              } catch (error) {
                socket.send(
                  JSON.stringify({
                    type: "agent-error",
                    sessionId,
                    agentId: handler.agentId,
                    content:
                      error instanceof Error ? error.message : "Unknown error",
                  }),
                );
              }
            } else if (method === "abort") {
              handler.abort?.(sessionId);
            } else if (method === "undo") {
              try {
                await handler.undo?.();
                socket.send(
                  JSON.stringify({
                    type: "agent-done",
                    sessionId,
                    agentId: handler.agentId,
                    content: "",
                  }),
                );
              } catch (error) {
                socket.send(
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
                socket.send(
                  JSON.stringify({
                    type: "agent-done",
                    sessionId,
                    agentId: handler.agentId,
                    content: "",
                  }),
                );
              } catch (error) {
                socket.send(
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
          socket.send(
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
