import net from "node:net";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import pc from "picocolors";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

const VERSION = process.env.VERSION ?? "0.0.0";

const npmGlobalDirectory = join(homedir(), "AppData", "Roaming", "npm");
if (!process.env.PATH?.startsWith(npmGlobalDirectory)) {
  process.env.PATH = `${npmGlobalDirectory};${process.env.PATH}`;
}

export interface OpencodeAgentOptions {
  model?: string;
  agent?: string;
  directory?: string;
}

type OpencodeAgentContext = AgentContext<OpencodeAgentOptions>;

const executeOpencodePrompt = async (
  prompt: string,
  options?: OpencodeAgentOptions,
  onOutput?: (text: string) => void,
): Promise<string> => {
  const safePrompt = prompt
    .replace(/<(\w+)>/g, "[$1]")
    .replace(/<\/(\w+)>/g, "[/$1]")
    .replace(/</g, "(")
    .replace(/>/g, ")");

  return new Promise((resolve, reject) => {
    const opencodeArguments = [
      "run",
      "--format",
      "json",
      "--attach",
      "http://127.0.0.1:4096",
    ];

    opencodeArguments.push("--agent", options?.agent || "react-grab");

    if (options?.model) {
      opencodeArguments.push("--model", options.model);
    }

    const environmentVariables = {
      ...process.env,
      OPENCODE_PERMISSION: JSON.stringify({
        external_directory: "allow",
        edit: "allow",
      }),
    };

    const childProcess = spawn("opencode", opencodeArguments, {
      env: environmentVariables,
      cwd: options?.directory ?? process.cwd(),
      windowsHide: true,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (childProcess.stdin) {
      childProcess.stdin.write(safePrompt);
      childProcess.stdin.end();
    }

    let standardOutput = "";
    let standardError = "";

    childProcess.stdout?.on("data", (dataChunk: Buffer) => {
      const text = dataChunk.toString();
      standardOutput += text;

      if (onOutput) {
        const outputLines = text.split("\n").filter(Boolean);
        for (const outputLine of outputLines) {
          try {
            const parsedEvent = JSON.parse(outputLine);
            if (parsedEvent.type === "text" && parsedEvent.part?.text) {
              onOutput(parsedEvent.part.text);
            }
          } catch {}
        }
      }
    });

    childProcess.stderr?.on("data", (dataChunk: Buffer) => {
      standardError += dataChunk.toString();
    });

    childProcess.on("error", (error: Error) => {
      reject(error);
    });

    childProcess.on("exit", (code: number | null) => {
      if (code === 0) {
        resolve(standardOutput);
      } else {
        reject(
          new Error(
            `opencode run exited with code ${code}. stderr: ${standardError}`,
          ),
        );
      }
    });
  });
};

export const createServer = () => {
  const honoApplication = new Hono();

  honoApplication.use("/*", cors());

  honoApplication.post("/agent", async (context) => {
    const requestBody = await context.req.json<OpencodeAgentContext>();
    const { content, prompt, options } = requestBody;

    const formattedPrompt = `
User Request: ${prompt}

Context:
${content}
`;

    return streamSSE(context, async (stream) => {
      try {
        await stream.writeSSE({
          data: "Starting Opencode...",
          event: "status",
        });

        let previousText = "";
        await executeOpencodePrompt(
          formattedPrompt,
          options,
          (text) => {
            if (text !== previousText) {
              stream
                .writeSSE({
                  data: text.length > 80 ? "..." + text.slice(-80) : text,
                  event: "status",
                })
                .catch(() => {});
              previousText = text;
            }
          },
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
  console.log(`${pc.magenta("⚛")} ${pc.bold("React Grab")} ${pc.gray(VERSION)}`);
  console.log(`- Local:    ${pc.cyan(`http://localhost:${port}`)}`);
};

import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(DEFAULT_PORT).catch(console.error);
}
