import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CONTEXT_TTL_MS } from "./constants.js";
import {
  readClipboardPayload,
  type ReadClipboardPayloadResult,
} from "./utils/read-clipboard-payload.js";
import type { ReactGrabPayload } from "./utils/parse-react-grab-payload.js";

interface TextToolResult {
  content: { type: "text"; text: string }[];
}

const textResult = (text: string): TextToolResult => ({
  content: [{ type: "text", text }],
});

const formatPayload = (payload: ReactGrabPayload): string => {
  const promptLines = payload.entries
    .map((entry) => entry.commentText)
    .filter((commentText): commentText is string => Boolean(commentText));
  const elementsSection = `Elements (${payload.entries.length}):\n${payload.content}`;
  return promptLines.length > 0
    ? `Prompt: ${promptLines.join("\n")}\n\n${elementsSection}`
    : elementsSection;
};

const formatNoContextMessage = (result: ReadClipboardPayloadResult): string => {
  const baseMessage =
    "No React Grab context found on the clipboard. Click an element in the React Grab toolbar and try again.";
  return result.hint ? `${baseMessage}\n\n${result.hint}` : baseMessage;
};

const isPayloadExpired = (payload: ReactGrabPayload): boolean =>
  Date.now() - payload.timestamp > CONTEXT_TTL_MS;

export const handleGetElementContext = async (): Promise<TextToolResult> => {
  const result = await readClipboardPayload();

  if (!result.payload || isPayloadExpired(result.payload)) {
    return textResult(formatNoContextMessage(result));
  }

  return textResult(formatPayload(result.payload));
};

export const createMcpServer = (): McpServer => {
  const server = new McpServer(
    { name: "react-grab-mcp", version: "0.1.0" },
    { capabilities: { logging: {} } },
  );

  server.registerTool(
    "get_element_context",
    {
      description:
        "Get the latest React Grab context from the user's clipboard. Returns the most recent UI element selection (with prompt, HTML snippet, and entries) that was copied via the React Grab toolbar.",
    },
    handleGetElementContext,
  );

  return server;
};

export const startMcpServer = async (): Promise<void> => {
  const mcpServer = createMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.server.connect(transport);
};
