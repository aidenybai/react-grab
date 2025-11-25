#!/usr/bin/env node

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamText } from "ai";
import { claudeCode } from "ai-sdk-provider-claude-code";
import { cors } from "hono/cors";
import { spawn } from "node:child_process";
import { loadConfig } from "./config.js";
import type { AgentRequest } from "./types.js";

const config = loadConfig();
const port = config.port ?? 6243;

const args = process.argv.slice(2);
if (args.length > 0) {
  const command = args[0];
  const commandArgs = args.slice(1);

  console.log(`Starting React Grab server on port ${port}...`);
  console.log(`Running: ${command} ${commandArgs.join(" ")}`);

  const childProcess = spawn(command, commandArgs, {
    stdio: "inherit",
    shell: true,
  });

  childProcess.on("exit", (code) => {
    console.log(`Child process exited with code ${code}`);
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => {
    childProcess.kill("SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    childProcess.kill("SIGTERM");
    process.exit(0);
  });
}

const app = new Hono();

app.use("*", cors());

app.post("/api/agent", async (c) => {
  const body = (await c.req.json()) as AgentRequest;
  const { prompt } = body;

  if (!prompt) {
    return c.json({ error: "Missing prompt" }, 400);
  }

  const providerConfig = config.provider ?? "claude-code";

  const providerName =
    typeof providerConfig === "string" ? providerConfig : providerConfig[0];
  const providerOptions = Array.isArray(providerConfig)
    ? providerConfig[1]
    : undefined;

  let model;
  if (providerName === "claude-code") {
    const modelName = providerOptions?.model ?? config.model ?? "sonnet";
    model = claudeCode(modelName, {
      cwd: process.cwd(),
      permissionMode: "bypassPermissions",
      pathToClaudeCodeExecutable: "claude",
    });
  } else {
    throw new Error(`Unsupported provider: ${providerName}`);
  }

  const result = streamText({
    model,
    prompt,
  });

  return result.toUIMessageStreamResponse();
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok", cwd: process.cwd() });
});

serve({
  fetch: app.fetch,
  port,
});

console.log(`React Grab server running on http://localhost:${port}`);
