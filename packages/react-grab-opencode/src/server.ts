import net from "node:net";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { serve } from "@hono/node-server";
import type { AgentContext } from "react-grab/core";
import { DEFAULT_PORT } from "./constants.js";

// Ensure npm's global bin directory is FIRST in PATH for opencode to be found
const npmGlobalDir = join(homedir(), "AppData", "Roaming", "npm");
if (!process.env.PATH?.startsWith(npmGlobalDir)) {
    process.env.PATH = `${npmGlobalDir};${process.env.PATH}`;
}

export interface OpencodeAgentOptions {
    model?: string;
    agent?: string;
    directory?: string;
}

type OpencodeAgentContext = AgentContext<OpencodeAgentOptions>;

// Run opencode with prompt via stdin, attaching to external server
const runOpencodePrompt = async (
    prompt: string,
    options?: OpencodeAgentOptions,
    onOutput?: (text: string) => void
): Promise<string> => {
    // Sanitize prompt: escape HTML tags for safety
    const sanitizedPrompt = prompt
        .replace(/<(\w+)>/g, "[$1]")  // Convert <tag> to [tag]
        .replace(/<\/(\w+)>/g, "[/$1]")  // Convert </tag> to [/tag]
        .replace(/</g, "(")  // Any remaining < becomes (
        .replace(/>/g, ")");  // Any remaining > becomes )

    console.log("[Opencode] Running with prompt:", sanitizedPrompt.substring(0, 100) + "...");

    return new Promise((resolve, reject) => {
        // Build args array with --attach to connect to external server
        const args = ["run", "--format", "json", "--attach", "http://127.0.0.1:4096"];

        // Use custom 'react-grab' agent if not specified
        args.push("--agent", options?.agent || "react-grab");

        if (options?.model) {
            args.push("--model", options.model);
        }

        console.log("[Opencode] Options received:", JSON.stringify(options));
        console.log("[Opencode] Args v2:", args.join(" "), "(prompt via stdin)");

        // Set permission to auto-allow external directory access (avoids interactive prompts)
        const env = {
            ...process.env,
            OPENCODE_PERMISSION: JSON.stringify({
                external_directory: "allow",
                edit: "allow",
            }),
        };

        const proc = spawn("opencode", args, {
            env,
            cwd: options?.directory ?? process.cwd(),
            windowsHide: true,
            shell: true,
            stdio: ["pipe", "pipe", "pipe"],
        });

        // Send prompt via stdin - this avoids ALL shell escaping issues
        if (proc.stdin) {
            proc.stdin.write(sanitizedPrompt);
            proc.stdin.end();
        }

        let stdout = "";
        let stderr = "";

        proc.stdout?.on("data", (chunk: Buffer) => {
            const text = chunk.toString();
            stdout += text;

            // Parse and log events in detail
            const lines = text.split("\n").filter(Boolean);
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    // Log detailed info for tool_use events
                    if (event.type === "tool_use" && event.part) {
                        console.log("[Opencode tool_use]", JSON.stringify({
                            tool: event.part.tool,
                            title: event.part.state?.title,
                            input: event.part.state?.input,
                        }, null, 2));
                    } else {
                        console.log("[Opencode event]", event.type, event.part?.type || "");
                    }

                    if (onOutput && event.type === "text" && event.part?.text) {
                        onOutput(event.part.text);
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        });

        proc.stderr?.on("data", (chunk: Buffer) => {
            const text = chunk.toString();
            stderr += text;
            console.log("[Opencode stderr]", text.trim());
        });

        proc.on("error", (error: Error) => {
            reject(error);
        });

        proc.on("exit", (code: number | null) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`opencode run exited with code ${code}. stderr: ${stderr}`));
            }
        });
    });
};

export const createServer = () => {
    const app = new Hono();

    app.use("/*", cors());

    app.post("/agent", async (context) => {
        const body = await context.req.json<OpencodeAgentContext>();
        const { content, prompt, options } = body;

        const fullPrompt = `
User Request: ${prompt}

Context:
${content}
`;

        console.log("[Opencode] Received request:", { prompt, contentLength: content?.length });
        console.log("[Opencode] Full content:", content);

        return streamSSE(context, async (stream) => {
            try {
                await stream.writeSSE({ data: "Starting Opencode...", event: "status" });

                let lastText = "";
                const result = await runOpencodePrompt(fullPrompt, options, (text) => {
                    if (text !== lastText) {
                        stream.writeSSE({
                            data: text.length > 80 ? "..." + text.slice(-80) : text,
                            event: "status"
                        }).catch(() => { });
                        lastText = text;
                    }
                });

                console.log("[Opencode] Completed. Result length:", result.length);
                await stream.writeSSE({ data: "Completed successfully", event: "status" });
                await stream.writeSSE({ data: "", event: "done" });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("[Opencode] Error:", errorMessage);
                await stream.writeSSE({
                    data: `Error: ${errorMessage}`,
                    event: "error",
                });
                await stream.writeSSE({ data: "", event: "done" });
            }
        });
    });

    app.get("/health", (context) => {
        return context.json({ status: "ok", provider: "opencode" });
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
    console.log(`[React Grab] Opencode server started on port ${port}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
    startServer(DEFAULT_PORT).catch(console.error);
}
