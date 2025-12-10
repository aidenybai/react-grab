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
import { DEFAULT_PORT } from "./constants";

const VERSION = process.env.VERSION ?? "0.0.0";

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
type ClaudeAgentContext = AgentContext<Options>;

const claudeSessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();

const isTextBlock = (block: ContentBlock): block is TextContentBlock =>
  block.type === "text";

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
      const isAborted = () => sessionId && abortedSessions.has(sessionId);

      try {
        await stream.writeSSE({ data: "Thinking...", event: "status" });

        // https://github.com/anthropics/claude-code/issues/4619#issuecomment-3217014571
        const env = { ...process.env };
        delete env.NODE_OPTIONS;
        delete env.VSCODE_INSPECTOR_OPTIONS;

        const queryResult = query({
          prompt: userPrompt,
          options: {
            pathToClaudeCodeExecutable: resolveClaudePath(),
            cwd: process.cwd(),
            includePartialMessages: true,
            env,
            ...options,
            ...(isFollowUp && claudeSessionId
              ? { resume: claudeSessionId }
              : {}),
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
              await stream.writeSSE({ data: textContent, event: "status" });
            }
          }

          if (message.type === "result") {
            await stream.writeSSE({
              data:
                message.subtype === "success"
                  ? "Completed successfully"
                  : "Task finished",
              event: "status",
            });
          }
        }

        if (!isAborted() && capturedClaudeSessionId) {
          if (sessionId) {
            claudeSessionMap.set(sessionId, capturedClaudeSessionId);
          }
        }

        if (!isAborted()) {
          await stream.writeSSE({ data: "", event: "done" });
        }
      } catch (error) {
        if (!isAborted()) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const stderr =
            error instanceof Error && "stderr" in error
              ? String(error.stderr)
              : undefined;
          const fullError =
            stderr && stderr.trim()
              ? `${errorMessage}\n\nstderr:\n${stderr.trim()}`
              : errorMessage;
          await stream.writeSSE({
            data: `Error: ${fullError}`,
            event: "error",
          });
        }
      } finally {
        if (sessionId) {
          abortedSessions.delete(sessionId);
        }
      }
    });
  });

  app.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    abortedSessions.add(sessionId);
    return context.json({ status: "ok" });
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "claude" });
  });

  return app;
};

import { sleep } from "@react-grab/utils/server";

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Claude Code)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
