import { spawn } from "node:child_process";
import net from "node:net";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

interface CursorAgentOptions {
  model?: string;
  workspace?: string;
}

type CursorAgentContext = AgentContext<CursorAgentOptions>;

interface CursorStreamEvent {
  type: "system" | "user" | "thinking" | "assistant" | "result";
  subtype?: "init" | "delta" | "completed" | "success" | "error";
  message?: {
    role: string;
    content: Array<{ type: string; text: string }>;
  };
  result?: string;
  is_error?: boolean;
  session_id?: string;
}

const parseStreamLine = (line: string): CursorStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as CursorStreamEvent;
  } catch {
    return null;
  }
};

const extractTextFromMessage = (
  message: CursorStreamEvent["message"],
): string => {
  if (!message?.content) return "";

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();
};

export const createServer = () => {
  const app = new Hono();

  app.use("/*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<CursorAgentContext>();
    const { content, prompt, options } = body;

    const fullPrompt = `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      const cursorAgentArgs = [
        "--print",
        "--output-format",
        "stream-json",
        "--force",
      ];

      if (options?.model) {
        cursorAgentArgs.push("--model", options.model);
      }

      if (options?.workspace) {
        cursorAgentArgs.push("--workspace", options.workspace);
      } else {
        cursorAgentArgs.push("--workspace", process.cwd());
      }

      try {
        await stream.writeSSE({ data: "Planning next moves", event: "status" });

        const cursorProcess = spawn("cursor-agent", cursorAgentArgs, {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        });

        let buffer = "";

        const processLine = async (line: string) => {
          const event = parseStreamLine(line);
          if (!event) return;

          switch (event.type) {
            case "system":
              if (event.subtype === "init") {
                await stream.writeSSE({
                  data: "Planning next moves",
                  event: "status",
                });
              }
              break;

            case "thinking":
              if (event.subtype === "completed") {
                await stream.writeSSE({
                  data: "Thinking…",
                  event: "status",
                });
              }
              break;

            case "assistant": {
              const textContent = extractTextFromMessage(event.message);
              if (textContent) {
                await stream.writeSSE({ data: textContent, event: "status" });
              }
              break;
            }

            case "result":
              if (event.subtype === "success") {
                await stream.writeSSE({
                  data: "Completed successfully",
                  event: "status",
                });
              } else if (event.subtype === "error" || event.is_error) {
                await stream.writeSSE({
                  data: `Error: ${event.result || "Unknown error"}`,
                  event: "error",
                });
              } else {
                await stream.writeSSE({
                  data: "Task finished",
                  event: "status",
                });
              }
              break;
          }
        };

        cursorProcess.stdout.on("data", async (chunk: Buffer) => {
          buffer += chunk.toString();

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            await processLine(line);
          }
        });

        cursorProcess.stderr.on("data", (chunk: Buffer) => {
          console.error("[cursor-agent stderr]:", chunk.toString());
        });

        cursorProcess.stdin.write(fullPrompt);
        cursorProcess.stdin.end();

        await new Promise<void>((resolve, reject) => {
          cursorProcess.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`cursor-agent exited with code ${code}`));
            }
          });

          cursorProcess.on("error", (error) => {
            reject(error);
          });
        });

        if (buffer.trim()) {
          await processLine(buffer);
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
    return context.json({ status: "ok", provider: "cursor" });
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
