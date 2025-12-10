import net from "node:net";
import { createOpencode } from "@opencode-ai/sdk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

export interface OpencodeAgentOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpencodeAgentContext = AgentContext<OpencodeAgentOptions>;

interface OpencodeInstance {
  client: Awaited<ReturnType<typeof createOpencode>>["client"];
  server: Awaited<ReturnType<typeof createOpencode>>["server"];
}

let opencodeInstance: OpencodeInstance | null = null;
const sessionMap = new Map<string, string>();

const getOpencodeClient = async () => {
  if (!opencodeInstance) {
    const instance = await createOpencode({
      hostname: "127.0.0.1",
      port: 4096,
    });
    opencodeInstance = instance;
  }
  return opencodeInstance.client;
};

const executeOpencodePrompt = async (
  prompt: string,
  options?: OpencodeAgentOptions,
  onStatus?: (text: string) => void,
  reactGrabSessionId?: string,
): Promise<string> => {
  const client = await getOpencodeClient();

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

  honoApplication.use("/*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<OpencodeAgentContext>();
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
      try {
        await executeOpencodePrompt(
          formattedPrompt,
          options,
          (text) => {
            stream
              .writeSSE({
                data: text,
                event: "status",
              })
              .catch(() => {});
          },
          sessionId,
        );

        await stream.writeSSE({
          data: "Completed successfully",
          event: "status",
        });
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

  honoApplication.get("/health", (context) => {
    return context.json({ status: "ok", provider: "opencode" });
  });

  return honoApplication;
};

const isPortInUse = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const netServer = net.createServer();
    netServer.once("error", () => resolve(true));
    netServer.once("listening", () => {
      netServer.close();
      resolve(false);
    });
    netServer.listen(port);
  });

export const startServer = async (port: number = DEFAULT_PORT) => {
  if (await isPortInUse(port)) {
    return;
  }

  const honoApplication = createServer();
  serve({ fetch: honoApplication.fetch, port });
  console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)} ${pc.dim("(Opencode)")}`);
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
