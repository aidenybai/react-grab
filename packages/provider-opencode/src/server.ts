import { createOpenCode } from "@opencode-ai/sdk";
import fkill from "fkill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

export interface OpenCodeAgentOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpenCodeAgentContext = AgentContext<OpenCodeAgentOptions>;

interface OpenCodeInstance {
  client: Awaited<ReturnType<typeof createOpenCode>>["client"];
  server: Awaited<ReturnType<typeof createOpenCode>>["server"];
}

const OPENCODE_SDK_PORT = 4096;

import { sleep } from "@react-grab/utils/server";

let opencodeInstance: OpenCodeInstance | null = null;
const sessionMap = new Map<string, string>();
const abortedSessions = new Set<string>();
let lastOpenCodeSessionId: string | undefined;

const getOpenCodeClient = async () => {
  if (!opencodeInstance) {
    await fkill(`:${OPENCODE_SDK_PORT}`, { force: true, silent: true }).catch(
      () => {},
    );
    await sleep(100);
    const instance = await createOpenCode({
      hostname: "127.0.0.1",
      port: OPENCODE_SDK_PORT,
    });
    opencodeInstance = instance;
  }
  return opencodeInstance.client;
};

const executeOpenCodePrompt = async (
  prompt: string,
  options?: OpenCodeAgentOptions,
  onStatus?: (text: string) => void,
  reactGrabSessionId?: string,
): Promise<string> => {
  const client = await getOpenCodeClient();

  onStatus?.("Thinking...");

  let opencodeSessionId: string;

  if (reactGrabSessionId && sessionMap.has(reactGrabSessionId)) {
    opencodeSessionId = sessionMap.get(reactGrabSessionId)!;
  } else {
    const sessionResponse = await client.session.create({
      body: { title: "React Grab Session" },
    });

    if (sessionResponse.error || !sessionResponse.data) {
      throw new Error("Failed to create session");
    }

    opencodeSessionId = sessionResponse.data.id;

    if (reactGrabSessionId) {
      sessionMap.set(reactGrabSessionId, opencodeSessionId);
    }
  }

  lastOpenCodeSessionId = opencodeSessionId;

  const modelConfig = options?.model
    ? {
        providerID: options.model.split("/")[0],
        modelID: options.model.split("/")[1] || options.model,
      }
    : undefined;

  const promptResponse = await client.session.prompt({
    path: { id: opencodeSessionId },
    body: {
      ...(modelConfig && { model: modelConfig }),
      parts: [{ type: "text", text: prompt }],
    },
  });

  if (promptResponse.data?.parts) {
    for (const part of promptResponse.data.parts) {
      if (part.type === "text" && part.text) {
        onStatus?.(part.text);
      }
    }
  }

  return opencodeSessionId;
};

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<OpenCodeAgentContext>();
    const { content, prompt, options, sessionId } = requestBody;

    const isFollowUp = Boolean(sessionId && sessionMap.has(sessionId));
    const formattedPrompt = isFollowUp
      ? prompt
      : `
User Request: ${prompt}

Context:
${content}
`;

    return streamSSE(context, async (stream) => {
      const isAborted = () => sessionId && abortedSessions.has(sessionId);

      try {
        await executeOpenCodePrompt(
          formattedPrompt,
          options,
          (text) => {
            if (isAborted()) return;
            stream
              .writeSSE({
                data: text,
                event: "status",
              })
              .catch(() => {});
          },
          sessionId,
        );

        if (!isAborted()) {
          await stream.writeSSE({
            data: "Completed successfully",
            event: "status",
          });
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
          await stream.writeSSE({ data: "", event: "done" });
        }
      } finally {
        if (sessionId) {
          abortedSessions.delete(sessionId);
        }
      }
    });
  });

  honoApplication.post("/abort/:sessionId", (context) => {
    const { sessionId } = context.req.param();
    abortedSessions.add(sessionId);
    return context.json({ status: "ok" });
  });

  honoApplication.post("/undo", async (context) => {
    if (!lastOpenCodeSessionId) {
      return context.json({ status: "error", message: "No session to undo" });
    }

    try {
      const client = await getOpenCodeClient();

      await client.session.prompt({
        path: { id: lastOpenCodeSessionId },
        body: {
          parts: [{ type: "text", text: "/undo" }],
        },
      });

      return context.json({ status: "ok" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return context.json({ status: "error", message: errorMessage });
    }
  });

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "opencode" });
  });

  return honoApplication;
};

export const startServer = async (port: number = DEFAULT_PORT) => {
  await fkill(`:${port}`, { force: true, silent: true }).catch(() => {});
  await sleep(100);

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(
    `${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(OpenCode)")}`,
  );
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
