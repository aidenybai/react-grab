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
}

export interface TestResult {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
}

interface TestOptions {
  prompt: string;
  expectedFile: string;
  cwd: string;
}

const gradeResult = async (
  expectedFile: string,
  modelOutput: string,
): Promise<boolean> => {
  const graderResult = await generateText({
    model: anthropic("claude-haiku-4-5"),
    maxOutputTokens: 1,
    prompt: `Did the model find the file ${expectedFile} in the output?

IMPORTANT: ONLY RESPOND WITH "1" (for yes) or "0" (for no), NOTHING ELSE.

Output:

${modelOutput}`,
  });

  return graderResult.text.trim() === "1";
};

export const runClaudeCodeTest = async (
  options: TestOptions,
): Promise<TestResult> => {
  const stream = streamText({
    model: claudeCode("sonnet", {
      cwd: options.cwd,
    }),
    prompt: options.prompt,
  });

  const [modelOutput, providerMetadata, usage, toolCalls] = await Promise.all([
    stream.text,
    stream.providerMetadata,
    stream.usage,
    stream.toolCalls,
  ]);

  if (!providerMetadata) {
    throw new Error("Provider metadata not found");
  }

  const typedMetadata = providerMetadata as unknown as ProviderMetadata;
  const { inputTokens, outputTokens } = usage as Usage;
  const { costUsd, durationMs } = typedMetadata["claude-code"];

  const success = await gradeResult(options.expectedFile, modelOutput);

  return {
    inputTokens,
    outputTokens,
    costUsd,
    durationMs,
    toolCalls: toolCalls.length,
    success,
  };
};
