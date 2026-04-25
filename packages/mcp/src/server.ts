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

const stripLeadingPromptPrefix = (content: string, rawPrompts: string[]): string => {
  // The browser-side producer prepends the *untrimmed* prompt followed by
  // "\n\n" to payload.content, so we match against the raw commentText.
  // We deliberately do not also try a trimmed candidate: that would risk
  // stripping legitimate element content that happens to start with the
  // prompt text (e.g. prompt "Click me" + element body "Click me\n\n...").
  for (const rawPrompt of rawPrompts) {
    if (rawPrompt.length === 0) continue;
    const candidate = `${rawPrompt}\n\n`;
    if (content.startsWith(candidate)) {
      return content.slice(candidate.length);
    }
  }
  return content;
};

const formatPayload = (payload: ReactGrabPayload): string => {
  // The producer assigns the prompt to every entry's commentText, so dedupe
  // via a Set to surface a single Prompt: line regardless of how many
  // elements were copied. We keep the raw values around for prefix matching
  // (the producer doesn't trim) and surface trimmed values to the LLM.
  const rawPrompts: string[] = [];
  const trimmedPrompts: string[] = [];
  const seenTrimmed = new Set<string>();
  for (const entry of payload.entries) {
    const rawPrompt = entry.commentText;
    if (typeof rawPrompt !== "string" || rawPrompt.length === 0) continue;
    rawPrompts.push(rawPrompt);
    const trimmed = rawPrompt.trim();
    if (trimmed.length === 0 || seenTrimmed.has(trimmed)) continue;
    seenTrimmed.add(trimmed);
    trimmedPrompts.push(trimmed);
  }
  // Use payload.content as the body so we preserve canonical formatting:
  // the [1]/[2]/[3] labels added by joinSnippets for multi-element copies
  // and any transformCopyContent output contributed by plugins
  // (e.g. copy-html, copy-styles).
  const elementsBody = stripLeadingPromptPrefix(payload.content, rawPrompts);
  const elementsSection = `Elements (${payload.entries.length}):\n${elementsBody}`;
  return trimmedPrompts.length > 0
    ? `Prompt: ${trimmedPrompts.join("\n")}\n\n${elementsSection}`
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
