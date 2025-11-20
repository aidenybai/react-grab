import { generateText, streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { claudeCode } from "ai-sdk-provider-claude-code";

interface ProviderMetadata {
  "claude-code": {
    sessionId: string;
    costUsd: number;
    durationMs: number;
    rawUsage: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      output_tokens: number;
      server_tool_use: Record<string, unknown>;
      service_tier: string;
      cache_creation: Record<string, unknown>;
    };
  };
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ClaudeCodeTestResult {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
}

interface Options {
  prompt: string;
  expectedFile: string;
  cwd: string;
}

export const runClaudeCodeTest = async (
  options: Options,
): Promise<ClaudeCodeTestResult> => {
  return new Promise(async (resolve, reject) => {
    const result = streamText({
      model: claudeCode("sonnet", {
        cwd: options.cwd,
      }),
      prompt: options.prompt,
      onChunk: async (chunk) => {},
      onFinish: async (args) => {
        if (!args.providerMetadata) {
          reject(new Error("Provider metadata not found"));
        }
        const providerMetadata =
          args.providerMetadata as unknown as ProviderMetadata;
        if (!args.usage) {
          reject(new Error("Usage not found"));
        }

        const { inputTokens, outputTokens } = args.usage as Usage;
        const { costUsd, durationMs } = providerMetadata["claude-code"];

        const graderResult = await generateText({
          model: anthropic("claude-haiku-4-5"),
          maxOutputTokens: 1,
          prompt: `Did the model find the file ${options.expectedFile} in the output?

IMPORTANT: ONLY RESPOND WITH "1" (for yes) or "0" (for no), NOTHING ELSE.

Output:

${args.text}`,
        });

        console.log(args.text);

        const usageResult: ClaudeCodeTestResult = {
          inputTokens,
          outputTokens,
          costUsd: costUsd,
          durationMs: durationMs,
          toolCalls: args.toolCalls.length,
          success:
            graderResult.text.includes("1") || !graderResult.text.includes("0"),
        };

        resolve(usageResult);
      },
    });
    // need to wait for the result to be resolved
    await result.text;
  });
};
