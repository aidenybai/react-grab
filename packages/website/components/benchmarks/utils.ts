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
  const count = results.length;
  if (count === 0) {
    return {
      successRate: 0,
      avgCost: 0,
      avgDuration: 0,
      avgToolCalls: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
    };
  }

  const successCount = results.filter((result) => result.success).length;
  return {
    successRate: parseFloat(((successCount / count) * 100).toFixed(1)),
    avgCost: results.reduce((sum, result) => sum + result.costUsd, 0) / count,
    avgDuration:
      results.reduce((sum, result) => sum + result.durationMs, 0) / count,
    avgToolCalls:
      results.reduce((sum, result) => sum + result.toolCalls, 0) / count,
    avgInputTokens:
      results.reduce((sum, result) => sum + result.inputTokens, 0) / count,
    avgOutputTokens:
      results.reduce((sum, result) => sum + result.outputTokens, 0) / count,
  };
};
