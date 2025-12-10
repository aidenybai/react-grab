import spawn from "cross-spawn";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import killPort from "kill-port";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

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

const cursorSessionMap = new Map<string, string>();
const activeProcesses = new Map<string, ReturnType<typeof spawn>>();

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

  app.use("*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<CursorAgentContext>();
    const { content, prompt, options, sessionId } = body;

    const cursorChatId = sessionId
      ? cursorSessionMap.get(sessionId)
      : undefined;
    const isFollowUp = Boolean(cursorChatId);

    const userPrompt = isFollowUp ? prompt : `${prompt}\n\n${content}`;

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

      if (isFollowUp && cursorChatId) {
        cursorAgentArgs.push("--resume", cursorChatId);
      }

      let cursorProcess: ReturnType<typeof spawn> | undefined;
      let stderrBuffer = "";

      try {
        await stream.writeSSE({ data: "Thinking...", event: "status" });

        cursorProcess = spawn("cursor-agent", cursorAgentArgs, {
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        });

        if (sessionId) {
          activeProcesses.set(sessionId, cursorProcess);
        }

        if (cursorProcess.stderr) {
          cursorProcess.stderr.on("data", (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
          });
        }

        let buffer = "";
        let capturedCursorChatId: string | undefined;

        const processLine = async (line: string) => {
          const event = parseStreamLine(line);
          if (!event) return;

          if (!capturedCursorChatId && event.session_id) {
            capturedCursorChatId = event.session_id;
          }

          switch (event.type) {
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

        if (cursorProcess.stdout) {
          cursorProcess.stdout.on("data", async (chunk: Buffer) => {
            buffer += chunk.toString();

            let newlineIndex;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              await processLine(line);
            }
          });
        }

        if (cursorProcess.stdin) {
          cursorProcess.stdin.write(userPrompt);
          cursorProcess.stdin.end();
        }

        if (cursorProcess) {
          const childProcess = cursorProcess;
          await new Promise<void>((resolve, reject) => {
            childProcess.on("close", (code) => {
              if (sessionId) {
                activeProcesses.delete(sessionId);
              }
              if (code === 0 || childProcess.killed) {
                resolve();
              } else {
                reject(new Error(`cursor-agent exited with code ${code}`));
              }
            });

            childProcess.on("error", (error) => {
              if (sessionId) {
                activeProcesses.delete(sessionId);
              }
              reject(error);
            });
          });
        }

        if (buffer.trim()) {
          await processLine(buffer);
        }

        if (sessionId && capturedCursorChatId) {
          cursorSessionMap.set(sessionId, capturedCursorChatId);
        }

        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const stderrContent = stderrBuffer.trim();
        const fullError = stderrContent
          ? `${errorMessage}\n\nstderr:\n${stderrContent}`
          : errorMessage;
        await stream.writeSSE({
          data: `Error: ${fullError}`,
          event: "error",
        });
      }
    });
  });

  app.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    const activeProcess = activeProcesses.get(sessionId);
    if (activeProcess && !activeProcess.killed) {
      activeProcess.kill("SIGTERM");
      activeProcesses.delete(sessionId);
    }
    return context.json({ status: "ok" });
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "cursor" });
  });

  return app;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await killPort(port).catch(() => {});

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Cursor)")}`);
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
