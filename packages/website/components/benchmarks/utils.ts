import { BenchmarkResult, ChangeInfo, Stats } from "./types";

const getGradientColor = (changePercent: number): string => {
  const absChange = Math.abs(changePercent);

  if (changePercent < 0) {
    const intensity = Math.min(absChange / 100, 1);
    const opacity = 0.1 + intensity * 0.3;
    return `rgba(100, 200, 150, ${opacity})`;
  } else {
    const intensity = Math.min(absChange / 100, 1);
    const opacity = 0.1 + intensity * 0.3;
    return `rgba(240, 120, 120, ${opacity})`;
  }
};

export const calculateChange = (
  controlVal?: number,
  treatmentVal?: number,
): ChangeInfo => {
  if (controlVal === undefined || treatmentVal === undefined)
    return { change: "", bgColor: "transparent" };

  if (treatmentVal === 0 && controlVal > 0) {
    return {
      change: "↓100%",
      bgColor: getGradientColor(-100),
    };
  }

  if (!controlVal || !treatmentVal)
    return { change: "", bgColor: "transparent" };

  const change = ((treatmentVal - controlVal) / controlVal) * 100;

  if (Math.abs(change) < 0.1) {
    return { change: "", bgColor: "transparent" };
  }

  const isImprovement = change < 0;
  const bgColor = getGradientColor(change);
  return {
    change: `${isImprovement ? "↓" : "↑"}${Math.abs(change).toFixed(0)}%`,
    bgColor,
  };
};

export const calculateStats = (results: BenchmarkResult[]): Stats => {
  const successCount = results.filter((r) => r.success).length;
  return {
    successRate: parseFloat(((successCount / results.length) * 100).toFixed(1)),
    avgCost: results.reduce((sum, r) => sum + r.costUsd, 0) / results.length,
    avgDuration:
      results.reduce((sum, r) => sum + r.durationMs, 0) / results.length,
    avgToolCalls:
      results.reduce((sum, r) => sum + r.toolCalls, 0) / results.length,
    avgInputTokens:
      results.reduce((sum, r) => sum + r.inputTokens, 0) / results.length,
    avgOutputTokens:
      results.reduce((sum, r) => sum + r.outputTokens, 0) / results.length,
  };
};
