import { z } from "zod";

const claudeCodeConfigSchema = z.object({
  model: z.string().optional(),
});

export const configSchema = z.object({
  port: z.number().optional(),
  model: z.string().optional(),
  provider: z
    .union([
      z.literal("claude-code"),
      z.tuple([z.literal("claude-code"), claudeCodeConfigSchema]),
    ])
    .optional(),
});

export type Config = z.infer<typeof configSchema>;

export interface AgentRequest {
  prompt: string;
}
