import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { query } from "@anthropic-ai/claude-agent-sdk";

interface AgentContext {
  content: string;
  prompt: string;
}

const app = new Hono();

app.use("/*", cors());

app.post("/agent", async (context) => {
  const body = await context.req.json<AgentContext>();
  const { content, prompt } = body;

  const fullPrompt = `${prompt}\n\n${content}`;

  return streamSSE(context, async (stream) => {
    try {
      await stream.writeSSE({ data: "Please wait...", event: "status" });

      const queryResult = query({
        prompt: fullPrompt,
        options: {
          systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append: `You are helping a user make changes to a React component based on a selected element.
The user has selected an element from their UI and wants you to help modify it.
Provide clear, concise status updates as you work.`,
          },
          maxTurns: 10,
        },
      });

      for await (const message of queryResult) {
        if (message.type === "assistant") {
          const textContent = message.message.content
            .filter(
              (block: {
                type: string;
              }): block is { type: "text"; text: string } =>
                block.type === "text",
            )
            .map((block: { text: any }) => block.text)
            .join("");

          if (textContent) {
            const statusUpdate =
              textContent.length > 100
                ? `${textContent.slice(0, 100)}...`
                : textContent;
            await stream.writeSSE({ data: statusUpdate, event: "status" });
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
          await stream.writeSSE({ data: "", event: "done" });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({ data: `Error: ${errorMessage}`, event: "error" });
    }
  });
});

app.get("/health", (context) => {
  return context.json({ status: "ok" });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

console.log(`🚀 Claude Code SDK Playground server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
