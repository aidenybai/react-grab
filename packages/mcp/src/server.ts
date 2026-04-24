import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import clipboard from "clipboardy";
import fkill from "fkill";
import { z } from "zod";
import {
  DEFAULT_MCP_PORT,
  HEALTH_CHECK_TIMEOUT_MS,
  POST_KILL_DELAY_MS,
  REACT_GRAB_CLIPBOARD_END_MARKER,
  REACT_GRAB_CLIPBOARD_START_MARKER,
} from "./constants.js";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const agentContextSchema = z.object({
  content: z.array(z.string()).describe("Array of context strings (HTML + component stack traces)"),
  prompt: z.string().optional().describe("User prompt or instruction"),
});

interface AgentContext extends z.infer<typeof agentContextSchema> {}

const reactGrabEntrySchema = z.object({
  content: z.string(),
  commentText: z.string().optional(),
});

const reactGrabMetadataSchema = z.object({
  content: z.string(),
  entries: z.array(reactGrabEntrySchema).optional(),
});

const textResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

const formatContext = (context: AgentContext): string => {
  const parts: string[] = [];
  if (context.prompt) {
    parts.push(`Prompt: ${context.prompt}`);
  }
  parts.push(`Elements:\n${context.content.join("\n\n")}`);
  return parts.join("\n\n");
};

const normalizeReactGrabPayload = (payload: unknown): AgentContext | null => {
  const agentContext = agentContextSchema.safeParse(payload);
  if (agentContext.success) return agentContext.data;

  const reactGrabMetadata = reactGrabMetadataSchema.safeParse(payload);
  if (!reactGrabMetadata.success) return null;

  const entries = reactGrabMetadata.data.entries;
  return {
    content: entries?.map((entry) => entry.content) ?? [reactGrabMetadata.data.content],
    prompt: entries?.find((entry) => entry.commentText)?.commentText,
  };
};

export const parseClipboardContext = (clipboardText: string): AgentContext | null => {
  const startIndex = clipboardText.indexOf(REACT_GRAB_CLIPBOARD_START_MARKER);
  if (startIndex === -1) return null;

  const jsonStartIndex = startIndex + REACT_GRAB_CLIPBOARD_START_MARKER.length;
  const endIndex = clipboardText.indexOf(REACT_GRAB_CLIPBOARD_END_MARKER, jsonStartIndex);
  if (endIndex === -1) return null;

  try {
    const jsonText = clipboardText.slice(jsonStartIndex, endIndex).trim();
    return normalizeReactGrabPayload(JSON.parse(jsonText));
  } catch {
    return null;
  }
};

const readClipboardContext = async (): Promise<AgentContext | null> => {
  try {
    const clipboardText = await clipboard.read();
    return parseClipboardContext(clipboardText);
  } catch {
    return null;
  }
};

const createMcpServer = (): McpServer => {
  const server = new McpServer(
    { name: "react-grab-mcp", version: "0.1.0" },
    { capabilities: { logging: {} } },
  );

  server.registerTool(
    "get_element_context",
    {
      description:
        "Read React Grab context from the clipboard. Returns the most recent copied UI element selection with its prompt.",
    },
    async () => {
      const clipboardContext = await readClipboardContext();
      if (!clipboardContext) {
        return textResult("No context has been submitted yet.");
      }

      return textResult(formatContext(clipboardContext));
    },
  );

  return server;
};

const checkIfServerIsRunning = async (port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
};

interface McpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, McpSession>();

const createHttpServer = (port: number): Server => {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
    response.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    if (url.pathname === "/health") {
      response
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (url.pathname === "/mcp") {
      const sessionId = request.headers["mcp-session-id"] as string | undefined;
      const existingSession = sessionId ? sessions.get(sessionId) : undefined;

      if (existingSession) {
        await existingSession.transport.handleRequest(request, response);
        return;
      }

      if (request.method === "POST") {
        const mcpServer = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            sessions.delete(transport.sessionId);
          }
        };

        await mcpServer.server.connect(transport);
        await transport.handleRequest(request, response);

        if (transport.sessionId) {
          sessions.set(transport.sessionId, { server: mcpServer, transport });
        }
        return;
      }

      response.writeHead(400, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          error: "No valid session. Send an initialize request first.",
        }),
      );
      return;
    }

    response.writeHead(404).end("Not found");
  });
};

const listenWithRetry = (httpServer: Server, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    httpServer.once("error", async (error: NodeJS.ErrnoException) => {
      if (error.code !== "EADDRINUSE") {
        reject(error);
        return;
      }

      await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
      await sleep(POST_KILL_DELAY_MS);

      httpServer.once("error", reject);
      httpServer.listen(port, () => resolve());
    });

    httpServer.listen(port, "127.0.0.1", () => resolve());
  });

const startHttpServer = async (port: number): Promise<Server> => {
  const isAlreadyRunning = await checkIfServerIsRunning(port);

  if (!isAlreadyRunning) {
    await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
    await sleep(POST_KILL_DELAY_MS);
  }

  const httpServer = createHttpServer(port);
  await listenWithRetry(httpServer, port);

  const handleShutdown = () => {
    httpServer.close();
    process.exit(0);
  };

  process.on("SIGTERM", handleShutdown);
  process.on("SIGINT", handleShutdown);

  return httpServer;
};

interface StartMcpServerOptions {
  port?: number;
  stdio?: boolean;
}

export const startMcpServer = async ({
  port = DEFAULT_MCP_PORT,
  stdio = false,
}: StartMcpServerOptions = {}): Promise<void> => {
  if (stdio) {
    const mcpServer = createMcpServer();
    const transport = new StdioServerTransport();
    await mcpServer.server.connect(transport);
    return;
  }

  await startHttpServer(port);
  console.log(`React Grab MCP server listening on http://localhost:${port}/mcp`);
};
