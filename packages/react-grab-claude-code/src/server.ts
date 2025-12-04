import net from "node:net";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import {
  query,
  type Options,
  type SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants";

type ContentBlock = SDKAssistantMessage["message"]["content"][number];
type TextContentBlock = Extract<ContentBlock, { type: "text" }>;
type ClaudeAgentContext = AgentContext<Options>;

const isTextBlock = (block: ContentBlock): block is TextContentBlock =>
  block.type === "text";

export const createServer = () => {
  const app = new Hono();

  app.use("/*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<ClaudeAgentContext>();
    const { content, prompt, options } = body;

    const fullPrompt = `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      try {
        await stream.writeSSE({ data: "Please wait...", event: "status" });

        const queryResult = query({
          prompt: fullPrompt,
          options: {
            pathToClaudeCodeExecutable: "claude",
            cwd: process.cwd(),
            includePartialMessages: true,
            ...options,
          },
        });

        for await (const message of queryResult) {
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

        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await stream.writeSSE({
          data: `Error: ${errorMessage}`,
          event: "error",
        });
        await stream.writeSSE({ data: "", event: "done" });
      }
    });
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "claude" });
  });

  return app;
};

const isPortInUse = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });

export const startServer = async (port: number = DEFAULT_PORT) => {
  if (await isPortInUse(port)) {
    return;
  }

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(`[React Grab] Server started on port ${port}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
