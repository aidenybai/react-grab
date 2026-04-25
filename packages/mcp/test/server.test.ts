import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../src/utils/read-clipboard-payload.js", () => ({
  readClipboardPayload: vi.fn(),
}));

import { readClipboardPayload } from "../src/utils/read-clipboard-payload.js";
import { createMcpServer, handleGetElementContext } from "../src/server.js";
import { CONTEXT_TTL_MS } from "../src/constants.js";

const mockReadClipboardPayload = vi.mocked(readClipboardPayload);

const buildPayload = (overrides: { timestamp?: number; commentText?: string } = {}) => ({
  version: "0.1.32",
  content: "<button>Click me</button>",
  entries: [
    {
      tagName: "button",
      componentName: "Button",
      content: "<button>Click me</button>",
      commentText: overrides.commentText ?? "Make this larger",
    },
  ],
  timestamp: overrides.timestamp ?? Date.now(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleGetElementContext", () => {
  it("returns no-context message when clipboard is empty", async () => {
    mockReadClipboardPayload.mockResolvedValue({ env: "macos", payload: null });

    const result = await handleGetElementContext();
    expect(result.content[0].text).toContain("No React Grab context found");
  });

  it("appends the hint when provided", async () => {
    mockReadClipboardPayload.mockResolvedValue({
      env: "ssh",
      payload: null,
      hint: "Clipboard channel is unavailable in SSH sessions.",
    });

    const result = await handleGetElementContext();
    expect(result.content[0].text).toContain("No React Grab context found");
    expect(result.content[0].text).toContain("SSH sessions");
  });

  it("returns formatted prompt and content for a fresh payload", async () => {
    mockReadClipboardPayload.mockResolvedValue({
      env: "macos",
      payload: buildPayload({ commentText: "Refactor this" }),
    });

    const result = await handleGetElementContext();
    expect(result.content[0].text).toContain("Prompt: Refactor this");
    expect(result.content[0].text).toContain("Elements (1):");
    expect(result.content[0].text).toContain("<button>Click me</button>");
  });

  it("treats payloads older than CONTEXT_TTL_MS as no context", async () => {
    mockReadClipboardPayload.mockResolvedValue({
      env: "macos",
      payload: buildPayload({ timestamp: Date.now() - CONTEXT_TTL_MS - 1000 }),
    });

    const result = await handleGetElementContext();
    expect(result.content[0].text).toContain("No React Grab context found");
  });

  it("omits the prompt section when no entries carry commentText", async () => {
    const payloadWithoutPrompt = buildPayload();
    payloadWithoutPrompt.entries[0].commentText = undefined;
    mockReadClipboardPayload.mockResolvedValue({
      env: "linux",
      payload: payloadWithoutPrompt,
    });

    const result = await handleGetElementContext();
    expect(result.content[0].text.startsWith("Elements (1):")).toBe(true);
  });
});

describe("createMcpServer", () => {
  it("registers get_element_context wired to handleGetElementContext", () => {
    const server = createMcpServer();
    const internals = server as unknown as {
      _registeredTools?: Record<string, unknown>;
    };
    expect(internals._registeredTools).toBeDefined();
    expect(internals._registeredTools?.get_element_context).toBeDefined();
  });

  it("invokes handleGetElementContext via the registered tool handler", async () => {
    mockReadClipboardPayload.mockResolvedValue({ env: "macos", payload: null });

    const server = createMcpServer();
    const internals = server as unknown as {
      _registeredTools?: Record<
        string,
        { handler: () => Promise<{ content: { text: string }[] }> }
      >;
    };
    const registeredTool = internals._registeredTools?.get_element_context;
    expect(registeredTool).toBeDefined();

    const toolResult = await registeredTool?.handler();
    expect(toolResult?.content[0].text).toContain("No React Grab context found");
  });
});
