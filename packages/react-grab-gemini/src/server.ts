import net from "node:net";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

export interface GeminiAgentOptions {
  model?: string;
  sandbox?: boolean;
}

type GeminiAgentContext = AgentContext<GeminiAgentOptions>;

interface GeminiStreamEvent {
  type: string;
  role?: string;
  content?: string;
  message?: string;
  text?: string;
  delta?: boolean;
}

const executeGeminiPrompt = async (
  prompt: string,
  options: GeminiAgentOptions | undefined,
  onStatus: (text: string) => void,
  signal: AbortSignal,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const args = ["-p", prompt, "--output-format", "stream-json"];

    if (options?.model) {
      args.push("--model", options.model);
    }

    if (options?.sandbox === false) {
      args.push("--sandbox", "false");
    }

    const geminiProcess = spawn("gemini", args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buffer = "";
    let aborted = false;

    const cleanup = () => {
      if (!aborted) {
        aborted = true;
        geminiProcess.kill("SIGTERM");
      }
    };

    signal.addEventListener("abort", cleanup);

    geminiProcess.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();

      // Process newline-delimited JSON events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line) as GeminiStreamEvent;

          // Handle different event types from Gemini CLI
          // Format: {"type":"message","role":"assistant","content":"...","delta":true}
          if (event.type === "message" && event.role === "assistant" && event.content) {
            onStatus(event.content);
          } else if (event.type === "text" && event.content) {
            onStatus(event.content);
          } else if (event.type === "thinking") {
            onStatus("Thinking...");
          } else if (event.type === "tool_use") {
            onStatus("Using tool...");
          } else if (event.type === "tool_result") {
            onStatus("Tool completed");
          } else if (event.type === "init") {
            // Session initialized, ignore
          } else if (event.type === "message" && event.role === "user") {
            // User message echo, ignore
          }
        } catch {
          // If not JSON, treat as plain text status
          if (line.trim()) {
            onStatus(line.trim());
          }
        }
      }
    });

    geminiProcess.stderr.on("data", (data: Buffer) => {
      const errorText = data.toString().trim();
      if (errorText) {
        console.error("[gemini stderr]", errorText);
      }
    });

    geminiProcess.on("close", (code) => {
      signal.removeEventListener("abort", cleanup);

      if (aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      } else if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Gemini CLI exited with code ${code}`));
      }
    });

    geminiProcess.on("error", (error) => {
      signal.removeEventListener("abort", cleanup);
      reject(error);
    });
  });
};

export const createServer = () => {
  const app = new Hono();

  app.use("/*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<GeminiAgentContext>();
    const { content, prompt, options } = body;

    const fullPrompt = `You are helping a user make changes to a React component based on a selected element.
The user has selected an element from their UI and wants you to help modify it.
Provide clear, concise status updates as you work.

User Request: ${prompt}

Selected Element Context:
${content}`;

    return streamSSE(context, async (stream) => {
      const controller = new AbortController();

      context.req.raw.signal.addEventListener("abort", () => {
        controller.abort();
      });

      try {
        await stream.writeSSE({ data: "Thinking...", event: "status" });

        await executeGeminiPrompt(
          fullPrompt,
          options,
          (text) => {
            stream.writeSSE({ data: text, event: "status" }).catch(() => {});
          },
          controller.signal,
        );

        await stream.writeSSE({
          data: "Completed successfully",
          event: "status",
        });
        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          await stream.writeSSE({ data: "Aborted", event: "done" });
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await stream.writeSSE({
            data: `Error: ${errorMessage}`,
            event: "error",
          });
        }
      }
    });
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "gemini" });
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

export const startServer = async (
  port: number = DEFAULT_PORT,
): Promise<boolean> => {
  if (await isPortInUse(port)) {
    return false;
  }

  const app = createServer();
  serve({ fetch: app.fetch, port });
  console.log(
    `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Gemini CLI)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
  return true;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
