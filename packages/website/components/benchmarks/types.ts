export interface BenchmarkResult {
  testName: string;
  type: "treatment" | "control";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
}

export interface TestCase {
  name: string;
  prompt: string;
}

export interface GroupedResult {
  treatment?: BenchmarkResult;
  control?: BenchmarkResult;
}

export interface Metric {
  name: string;
  control: string;
  treatment: string;
  isImprovement: boolean;
  change: string;
}

export interface ChangeInfo {
  change: string;
  bgColor: string;
}

export interface Stats {
  successRate: number;
  avgCost: number;
  avgDuration: number;
  avgToolCalls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}
