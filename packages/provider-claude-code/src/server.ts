import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import fkill from "fkill";
import pc from "picocolors";
import {
  query,
  type Options,
  type SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT, COMPLETED_STATUS } from "./constants";
import {
  sleep,
  formatSpawnError,
  type AgentMessage,
  type AgentCoreOptions,
} from "@react-grab/utils/server";

const VERSION = process.env.VERSION ?? "0.0.0";

try {
  fetch(
    `https://www.react-grab.com/api/version?source=claude-code&t=${Date.now()}`,
  ).catch(() => {});
} catch {}

const resolveClaudePath = (): string => {
  const command =
    process.platform === "win32" ? "where claude" : "which claude";
  try {
    const result = execSync(command, { encoding: "utf8" }).trim();
    return result.split("\n")[0];
  } catch {
    return "claude";
  }
};

type ContentBlock = SDKAssistantMessage["message"]["content"][number];
type TextContentBlock = Extract<ContentBlock, { type: "text" }>;

export interface ClaudeAgentOptions
  extends AgentCoreOptions,
    Omit<Options, "cwd"> {}

type ClaudeAgentContext = AgentContext<ClaudeAgentOptions>;

const claudeSessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();
let lastClaudeSessionId: string | undefined;

const isTextBlock = (block: ContentBlock): block is TextContentBlock =>
  block.type === "text";

export const runAgent = async function* (
  prompt: string,
  options?: ClaudeAgentOptions,
): AsyncGenerator<AgentMessage> {
  const sessionId = options?.sessionId;
  const isAborted = () => {
    if (options?.signal?.aborted) return true;
    if (sessionId && abortedSessions.has(sessionId)) return true;
    return false;
  };

  try {
    yield { type: "status", content: "Thinking…" };

    // HACK: https://github.com/anthropics/claude-code/issues/4619#issuecomment-3217014571
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    delete env.VSCODE_INSPECTOR_OPTIONS;

    const claudeSessionId = sessionId
      ? claudeSessionMap.get(sessionId)
      : undefined;

    const queryResult = query({
      prompt,
      options: {
        pathToClaudeCodeExecutable: resolveClaudePath(),
        includePartialMessages: true,
        env,
        ...options,
        cwd: options?.cwd ?? process.env.REACT_GRAB_CWD ?? process.cwd(),
        ...(claudeSessionId ? { resume: claudeSessionId } : {}),
      },
    });

    let capturedClaudeSessionId: string | undefined;

    for await (const message of queryResult) {
      if (isAborted()) break;

      if (!capturedClaudeSessionId && message.session_id) {
        capturedClaudeSessionId = message.session_id;
      }

      if (message.type === "assistant") {
        const textContent = message.message.content
          .filter(isTextBlock)
          .map((block: TextContentBlock) => block.text)
          .join(" ");

        if (textContent) {
          yield { type: "status", content: textContent };
        }
      }

      if (message.type === "result") {
        yield {
          type: "status",
          content:
            message.subtype === "success" ? COMPLETED_STATUS : "Task finished",
        };
      }
    }

    if (!isAborted() && capturedClaudeSessionId) {
      if (sessionId) {
        claudeSessionMap.set(sessionId, capturedClaudeSessionId);
      }
      lastClaudeSessionId = capturedClaudeSessionId;
    }

    if (!isAborted()) {
      yield { type: "done", content: "" };
    }
  } catch (error) {
    if (!isAborted()) {
      const errorMessage =
        error instanceof Error
          ? formatSpawnError(error, "claude")
          : "Unknown error";
      const stderr =
        error instanceof Error && "stderr" in error
          ? String(error.stderr)
          : undefined;
      const fullError =
        stderr && stderr.trim()
          ? `${errorMessage}\n\nstderr:\n${stderr.trim()}`
          : errorMessage;
      yield { type: "error", content: fullError };
      yield { type: "done", content: "" };
    }
  } finally {
    if (sessionId) {
      abortedSessions.delete(sessionId);
    }
  }
};

export const createServer = () => {
  const app = new Hono();

  app.use("*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<ClaudeAgentContext>();
    const { content, prompt, options, sessionId } = body;

    const claudeSessionId = sessionId
      ? claudeSessionMap.get(sessionId)
      : undefined;
    const isFollowUp = Boolean(claudeSessionId);

    const userPrompt = isFollowUp ? prompt : `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      for await (const message of runAgent(userPrompt, {
        ...options,
        sessionId,
      })) {
        if (message.type === "error") {
          await stream.writeSSE({
            data: `Error: ${message.content}`,
            event: "error",
          });
        } else {
          await stream.writeSSE({ data: message.content, event: message.type });
        }
      }
    });
  });

  app.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    abortedSessions.add(sessionId);
    return context.json({ status: "ok" });
  });

  app.post("/undo", async (context) => {
    if (!lastClaudeSessionId) {
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      const env = { ...process.env };
      delete env.NODE_OPTIONS;
      delete env.VSCODE_INSPECTOR_OPTIONS;

      const queryResult = query({
        prompt: "undo",
        options: {
          pathToClaudeCodeExecutable: resolveClaudePath(),
          env,
          cwd: process.env.REACT_GRAB_CWD ?? process.cwd(),
          resume: lastClaudeSessionId,
        },
      });

      for await (const _message of queryResult) {
        // HACK: consume all messages to complete the undo
      }

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "claude" });
  });

  return app;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("✿")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Claude Code)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
