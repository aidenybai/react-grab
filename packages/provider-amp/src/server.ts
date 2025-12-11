import { execute, createUserMessage } from "@sourcegraph/amp-sdk";
import fkill from "fkill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

try {
  fetch(`https://www.react-grab.com/api/version?source=amp&t=${Date.now()}`).catch(() => {});
} catch {}

import { sleep } from "@react-grab/utils/server";

export interface AmpAgentOptions {
  cwd?: string;
}

type AmpAgentContext = AgentContext<AmpAgentOptions>;

interface ThreadState {
  threadId: string;
}

const threadMap = new Map<string, ThreadState>();
const abortControllers = new Map<string, AbortController>();

const extractTextFromContent = (
  content: Array<{ type: string; text?: string; name?: string }>,
): string => {
  return content
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join(" ")
    .trim();
};

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<AmpAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const existingThread = sessionId ? threadMap.get(sessionId) : undefined;
    const isFollowUp = Boolean(existingThread);

    const userPrompt = isFollowUp ? prompt : `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      const abortController = new AbortController();
      if (sessionId) {
        abortControllers.set(sessionId, abortController);
      }

      const isAborted = () => abortController.signal.aborted;

      try {
        await stream.writeSSE({ data: "Thinking...", event: "status" });

        const executeOptions: {
          dangerouslyAllowAll: boolean;
          cwd?: string;
          continue?: boolean | string;
        } = {
          dangerouslyAllowAll: true,
        };

        if (options?.cwd) {
          executeOptions.cwd = options.cwd;
        } else {
          executeOptions.cwd = process.cwd();
        }

        if (isFollowUp && existingThread) {
          executeOptions.continue = existingThread.threadId;
        }

        let capturedThreadId: string | undefined;

        for await (const message of execute({
          prompt: userPrompt,
          options: executeOptions,
          signal: abortController.signal,
        })) {
          if (isAborted()) break;

          switch (message.type) {
            case "system":
              if (message.subtype === "init") {
                const systemMessage = message as { thread_id?: string };
                if (systemMessage.thread_id) {
                  capturedThreadId = systemMessage.thread_id;
                }
                await stream.writeSSE({
                  data: "Session started...",
                  event: "status",
                });
              }
              break;

            case "assistant": {
              const messageContent = message.message?.content;
              if (messageContent && Array.isArray(messageContent)) {
                const toolUse = messageContent.find(
                  (item: { type: string }) => item.type === "tool_use",
                );
                if (toolUse && "name" in toolUse) {
                  await stream.writeSSE({
                    data: `Using ${toolUse.name}...`,
                    event: "status",
                  });
                } else {
                  const textContent = extractTextFromContent(messageContent);
                  if (textContent && !isAborted()) {
                    await stream.writeSSE({
                      data: textContent,
                      event: "status",
                    });
                  }
                }
              }
              break;
            }

            case "result":
              if (message.is_error) {
                await stream.writeSSE({
                  data: `Error: ${message.error || "Unknown error"}`,
                  event: "error",
                });
              } else {
                await stream.writeSSE({
                  data: "Completed successfully",
                  event: "status",
                });
              }
              break;
          }
        }

        if (sessionId && capturedThreadId && !isAborted()) {
          threadMap.set(sessionId, { threadId: capturedThreadId });
        }

        if (!isAborted()) {
          await stream.writeSSE({ data: "", event: "done" });
        }
      } catch (error) {
        if (!isAborted()) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await stream.writeSSE({
            data: `Error: ${errorMessage}`,
            event: "error",
          });
          await stream.writeSSE({ data: "", event: "done" });
        }
      } finally {
        if (sessionId) {
          abortControllers.delete(sessionId);
        }
      }
    });
  });

  honoApplication.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    const abortController = abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      abortControllers.delete(sessionId);
    }
    return context.json({ status: "ok" });
  });

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "amp" });
  });

  return honoApplication;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(
    `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Amp)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
