import { spawn } from "node:child_process";
import net from "node:net";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

interface CodexAgentOptions {
  model?: string;
  workspace?: string;
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  fullAuto?: boolean;
  yolo?: boolean;
  profile?: string;
  skipGitRepoCheck?: boolean;
  config?: string[];
  outputSchemaPath?: string;
}

interface CodexAgentContext extends AgentContext<CodexAgentOptions> {}

interface CodexStreamContentBlock {
  type?: string;
  text?: string;
}

interface CodexStreamMessage {
  content?: CodexStreamContentBlock[];
}

interface CodexStreamItem {
  type?: string;
  status?: string;
  text?: string;
  content?: CodexStreamContentBlock[];
  command?: string;
  output?: string;
  path?: string;
  summary?: string;
}

interface CodexStreamError {
  message?: string;
  type?: string;
}

interface CodexStreamEvent {
  type?: string;
  subtype?: string;
  message?: CodexStreamMessage;
  item?: CodexStreamItem;
  result?: string;
  error?: CodexStreamError;
  is_error?: boolean;
}

const isCodexStreamEvent = (value: unknown): value is CodexStreamEvent =>
  typeof value === "object" && value !== null;

const normalizeStreamEvent = (event: CodexStreamEvent): CodexStreamEvent => {
  if (event.type && event.type.includes(".")) {
    const [baseType, derivedSubtype] = event.type.split(".", 2);
    return {
      ...event,
      type: baseType,
      subtype: event.subtype ?? derivedSubtype,
    };
  }
  return event;
};

const parseStreamLine = (line: string): CodexStreamEvent | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (isCodexStreamEvent(parsed)) {
      return normalizeStreamEvent(parsed);
    }
    return null;
  } catch {
    return null;
  }
};

const collectText = (blocks?: CodexStreamContentBlock[]): string => {
  if (!blocks) return "";
  return blocks
    .filter(
      (block) =>
        block !== undefined &&
        block.type === "text" &&
        typeof block.text === "string",
    )
    .map((block) => block.text || "")
    .join(" ")
    .trim();
};

const deriveItemStatus = (item: CodexStreamItem): string => {
  if (item.type === "reasoning") {
    return item.text || collectText(item.content);
  }
  if (item.type === "agent_message") {
    return item.text || collectText(item.content);
  }
  if (item.type === "command_execution") {
    if (item.status === "started") {
      const commandText = item.command || item.text || item.summary || "Command";
      return `Running: ${commandText}`;
    }
    if (item.status === "completed") {
      return "Command finished";
    }
    const progress = item.text || collectText(item.content);
    if (progress) {
      return progress;
    }
    if (item.status) {
      return `Command ${item.status}`;
    }
  }
  if (item.type === "file_change") {
    const pathText =
      item.path || item.summary || item.text || collectText(item.content);
    return pathText ? `Editing: ${pathText}` : "Editing file";
  }
  if (item.type === "todo_list") {
    const todoText = item.text || collectText(item.content) || "Updated tasks";
    return `Plan updated: ${todoText}`;
  }
  return item.text || collectText(item.content);
};

export const createServer = () => {
  const app = new Hono();

  app.use("/*", cors());

  app.post("/agent", async (context) => {
    const body = await context.req.json<CodexAgentContext>();
    const { content, prompt, options } = body;
    const fullPrompt = `${prompt}\n\n${content}`;

    return streamSSE(context, async (stream) => {
      const codexArgs = ["exec", "--json", "--color", "never", "-"];
      const workspace = options?.workspace || process.cwd();

      codexArgs.push("--cd", workspace);

      if (options?.model) {
        codexArgs.push("--model", options.model);
      }
      if (options?.sandbox) {
        codexArgs.push("--sandbox", options.sandbox);
      }
      if (options?.fullAuto !== false) {
        codexArgs.push("--full-auto");
      }
      if (options?.yolo) {
        codexArgs.push("--yolo");
      }
      if (options?.profile) {
        codexArgs.push("--profile", options.profile);
      }
      if (options?.skipGitRepoCheck) {
        codexArgs.push("--skip-git-repo-check");
      }
      if (options?.config && Array.isArray(options.config)) {
        for (const entry of options.config) {
          codexArgs.push("--config", entry);
        }
      }
      if (options?.outputSchemaPath) {
        codexArgs.push("--output-schema", options.outputSchemaPath);
      }

      try {
        await stream.writeSSE({ data: "Planning next moves", event: "status" });

        const codexProcess = spawn("codex", codexArgs, {
          stdio: ["pipe", "pipe", "pipe"],
          cwd: workspace,
          env: { ...process.env },
        });

        let buffer = "";

        const sendError = async (message: string) => {
          await stream.writeSSE({ data: `Error: ${message}`, event: "error" });
        };

        const processEvent = async (event: CodexStreamEvent) => {
          if (event.type === "thread" && event.subtype === "started") {
            await stream.writeSSE({
              data: "Codex session started",
              event: "status",
            });
            return;
          }

          if (event.type === "turn") {
            if (event.subtype === "started") {
              await stream.writeSSE({
                data: "Planning next moves",
                event: "status",
              });
              return;
            }
            if (event.subtype === "completed") {
              await stream.writeSSE({ data: "Turn complete", event: "status" });
              return;
            }
            if (event.subtype === "failed") {
              await sendError(event.result || event.error?.message || "Turn failed");
              return;
            }
          }

          if (event.item) {
            const itemStatus = deriveItemStatus(event.item);
            if (itemStatus) {
              await stream.writeSSE({ data: itemStatus, event: "status" });
            }
          }

          if (event.message) {
            const text = collectText(event.message.content);
            if (text) {
              await stream.writeSSE({ data: text, event: "status" });
            }
          }

          if (event.type === "result") {
            if (event.subtype === "success") {
              await stream.writeSSE({
                data: "Completed successfully",
                event: "status",
              });
              return;
            }
            if (event.subtype === "error" || event.is_error || event.error) {
              await sendError(event.result || event.error?.message || "Unknown error");
              return;
            }
            await stream.writeSSE({ data: "Task finished", event: "status" });
            return;
          }

          if (event.type === "error" || event.is_error) {
            await sendError(event.result || event.error?.message || "Unknown error");
          }
        };

        const processLine = async (line: string) => {
          const event = parseStreamLine(line);
          if (!event) {
            return;
          }
          await processEvent(event);
        };

        codexProcess.stdout.on("data", async (chunk: Buffer) => {
          buffer += chunk.toString();

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            await processLine(line);
            newlineIndex = buffer.indexOf("\n");
          }
        });

        codexProcess.stderr.on("data", (chunk: Buffer) => {
          console.error("[codex stderr]:", chunk.toString());
        });

        codexProcess.stdin.write(fullPrompt);
        codexProcess.stdin.end();

        stream.onAbort(() => {
          if (!codexProcess.killed) {
            codexProcess.kill();
          }
        });

        await new Promise<void>((resolve, reject) => {
          codexProcess.on("close", (code) => {
            const finalize = async () => {
              if (buffer.trim()) {
                await processLine(buffer);
                buffer = "";
              }
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`codex exited with code ${code ?? "unknown"}`));
              }
            };
            finalize().catch(reject);
          });

          codexProcess.on("error", (error) => {
            reject(error);
          });
        });

        await stream.writeSSE({ data: "", event: "done" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await stream.writeSSE({ data: `Error: ${message}`, event: "error" });
        await stream.writeSSE({ data: "", event: "done" });
      }
    });
  });

  app.get("/health", (context) => {
    return context.json({ status: "ok", provider: "codex" });
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

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer(DEFAULT_PORT).catch(console.error);
}