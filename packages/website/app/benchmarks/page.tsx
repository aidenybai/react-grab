"use client";

import { useEffect, useState } from "react";
import prettyMs from "pretty-ms";

interface BenchmarkResult {
  testName: string;
  type: "control" | "treatment";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  toolCalls: number;
  success: boolean;
}

interface TestCase {
  name: string;
  prompt: string;
}

interface GroupedResult {
  control?: BenchmarkResult;
  treatment?: BenchmarkResult;
}

interface ChangeInfo {
  change: string;
  bgColor: string;
}

interface Metric {
  name: string;
  control: string;
  treatment: string;
  isImprovement: boolean;
  change: string;
}

interface Stats {
  successRate: number;
  avgCost: number;
  avgDuration: number;
  avgToolCalls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

const BenchmarksPage = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [testCaseMap, setTestCaseMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const [resultsData, testCasesData] = await Promise.all([
          fetch("/results.json").then((r) => r.json()),
          fetch("/test-cases.json").then((r) => r.json()),
        ]);

        const testCaseMapping: Record<string, string> = {};
        testCasesData.forEach((testCase: TestCase) => {
          testCaseMapping[testCase.name] = testCase.prompt;
        });

        setTestCaseMap(testCaseMapping);
        setResults(resultsData);
        setLoading(false);
      } catch (error) {
        console.error("Error loading results:", error);
        setError("Error loading results. Please check console.");
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const calculateChange = (
    controlVal?: number,
    treatmentVal?: number
  ): ChangeInfo => {
    if (!controlVal || !treatmentVal)
      return { change: "", bgColor: "bg-neutral-900" };
    const change = ((treatmentVal - controlVal) / controlVal) * 100;
    const isImprovement = change < 0;
    const color = isImprovement ? "text-green-400" : "text-red-400";
    const bgColor = isImprovement ? "bg-green-950" : "bg-red-950";
    return {
      change: `${isImprovement ? "↓" : "↑"}${Math.abs(change).toFixed(0)}%`,
      bgColor,
    };
  };

  const calculateStats = (results: BenchmarkResult[]): Stats => {
    const successCount = results.filter((r) => r.success).length;
    return {
      successRate: parseFloat(
        ((successCount / results.length) * 100).toFixed(1)
      ),
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

  const groupedByTest = results.reduce<Record<string, GroupedResult>>(
    (acc, result) => {
      if (!acc[result.testName]) {
        acc[result.testName] = {};
      }
      acc[result.testName][result.type] = result;
      return acc;
    },
    {}
  );

  const totalTests = results.length;
  const successCount = results.filter((r) => r.success).length;
  const successRate = ((successCount / totalTests) * 100).toFixed(1);
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  const controlResults = results.filter((r) => r.type === "control");
  const treatmentResults = results.filter((r) => r.type === "treatment");

  let metrics: Metric[] = [];
  if (controlResults.length > 0 && treatmentResults.length > 0) {
    const controlStats = calculateStats(controlResults);
    const treatmentStats = calculateStats(treatmentResults);

    metrics = [
      {
        name: "Success Rate",
        control: `${controlStats.successRate}%`,
        treatment: `${treatmentStats.successRate}%`,
        isImprovement: treatmentStats.successRate >= controlStats.successRate,
        change: `${Math.abs(treatmentStats.successRate - controlStats.successRate).toFixed(1)}%`,
      },
      {
        name: "Avg Cost",
        control: `$${controlStats.avgCost.toFixed(2)}`,
        treatment: `$${treatmentStats.avgCost.toFixed(2)}`,
        isImprovement: treatmentStats.avgCost <= controlStats.avgCost,
        change: `${Math.abs(((treatmentStats.avgCost - controlStats.avgCost) / controlStats.avgCost) * 100).toFixed(1)}%`,
      },
      {
        name: "Avg Duration",
        control: prettyMs(controlStats.avgDuration),
        treatment: prettyMs(treatmentStats.avgDuration),
        isImprovement: treatmentStats.avgDuration <= controlStats.avgDuration,
        change: `${Math.abs(((treatmentStats.avgDuration - controlStats.avgDuration) / controlStats.avgDuration) * 100).toFixed(1)}%`,
      },
      {
        name: "Avg Tool Calls",
        control: controlStats.avgToolCalls.toFixed(1),
        treatment: treatmentStats.avgToolCalls.toFixed(1),
        isImprovement: treatmentStats.avgToolCalls <= controlStats.avgToolCalls,
        change: `${Math.abs(((treatmentStats.avgToolCalls - controlStats.avgToolCalls) / controlStats.avgToolCalls) * 100).toFixed(1)}%`,
      },
    ];
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="text-center py-8 text-neutral-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="text-center py-8 text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-2">
        <img src="/logo.svg" alt="React Grab" className="w-8 h-8" />
        <h1 className="text-2xl font-medium text-white">
          React Grab Benchmark
        </h1>
      </div>

      <div className="mb-6 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-200 mb-2">
          Methodology
        </h2>
        <div className="text-sm text-neutral-400 leading-relaxed space-y-3">
          <p>
            We benchmarked React Grab against a standard environment to measure
            its impact on AI coding agents. The tests run on the{" "}
            <a
              href="https://github.com/shadcn-ui/ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              shadcn/ui dashboard example
            </a>
            —a complex Next.js application with auth, charts, and data tables—to
            ensure realistic scenarios.
          </p>
          <p>Our testing protocol:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Setup:</strong> Both Control and Treatment groups use the
              same codebase, prompts, and AI model (Claude).
            </li>
            <li>
              <strong>Variables:</strong> The only difference is the presence of
              React Grab&apos;s semantic labeling system in the Treatment group.
            </li>
            <li>
              <strong>Measurement:</strong> We record pass/fail rates, token
              consumption, API costs, and execution time for every run.
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
            Total Tests
          </h3>
          <p className="text-2xl font-semibold text-white">{totalTests}</p>
        </div>
        <div>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
            Success Rate
          </h3>
          <p className="text-2xl font-semibold text-white">{successRate}%</p>
        </div>
        <div>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
            Total Cost
          </h3>
          <p className="text-2xl font-semibold text-white">
            ${totalCost.toFixed(2)}
          </p>
        </div>
        <div>
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">
            Total Duration
          </h3>
          <p className="text-2xl font-semibold text-white">
            {prettyMs(totalDuration)}
          </p>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-medium mb-4 text-white">
            Control vs Treatment
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-2 px-3 text-xs font-medium text-neutral-300">
                    Metric
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-neutral-300">
                    Control
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-neutral-300 bg-neutral-800">
                    Treatment
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr
                    key={metric.name}
                    className="border-b border-neutral-800 hover:bg-neutral-900"
                  >
                    <td className="py-2 px-3 font-medium text-neutral-200">
                      {metric.name}
                    </td>
                    <td className="py-2 px-3 text-neutral-300 tabular-nums">
                      {metric.control}
                    </td>
                    <td className="py-2 px-3 text-neutral-300 tabular-nums bg-neutral-800">
                      {metric.treatment}
                      <span
                        className={`ml-2 text-xs font-medium ${metric.isImprovement ? "text-green-400" : "text-red-400"}`}
                      >
                        {metric.isImprovement ? "↓" : "↑"} {metric.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th
                rowSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Test Name
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Success
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Input Tokens
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Output Tokens
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Cost
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Duration
              </th>
              <th
                colSpan={2}
                className="text-left py-2 px-3 text-xs font-medium text-neutral-300"
              >
                Tool Calls
              </th>
            </tr>
            <tr className="border-b border-neutral-800 bg-neutral-900">
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400">
                Control
              </th>
              <th className="text-left py-1.5 px-3 text-xs font-normal text-neutral-400 bg-neutral-800">
                Treatment
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByTest).map(([testName, results]) => {
              const control = results.control || ({} as BenchmarkResult);
              const treatment = results.treatment || ({} as BenchmarkResult);

              const inputChange = calculateChange(
                control.inputTokens,
                treatment.inputTokens
              );
              const outputChange = calculateChange(
                control.outputTokens,
                treatment.outputTokens
              );
              const costChange = calculateChange(
                control.costUsd,
                treatment.costUsd
              );
              const durationChange = calculateChange(
                control.durationMs,
                treatment.durationMs
              );
              const toolCallsChange = calculateChange(
                control.toolCalls,
                treatment.toolCalls
              );

              const prompt = testCaseMap[testName] || "";

              return (
                <tr
                  key={testName}
                  className="border-b border-neutral-800 hover:bg-neutral-900"
                >
                  <td
                    className="py-2 px-3 font-medium text-neutral-200 cursor-help"
                    title={prompt}
                  >
                    {testName}
                  </td>
                  <td
                    className={`py-2 px-3 ${control.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {control.success !== undefined
                      ? control.success
                        ? "✓"
                        : "✗"
                      : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 bg-neutral-800 ${treatment.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {treatment.success !== undefined
                      ? treatment.success
                        ? "✓"
                        : "✗"
                      : "-"}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums">
                    {control.inputTokens
                      ? control.inputTokens.toLocaleString()
                      : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 text-neutral-300 tabular-nums ${inputChange.bgColor}`}
                  >
                    {treatment.inputTokens
                      ? treatment.inputTokens.toLocaleString()
                      : "-"}
                    {inputChange.change && (
                      <span className="ml-1 text-xs">{inputChange.change}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums">
                    {control.outputTokens
                      ? control.outputTokens.toLocaleString()
                      : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 text-neutral-300 tabular-nums ${outputChange.bgColor}`}
                  >
                    {treatment.outputTokens
                      ? treatment.outputTokens.toLocaleString()
                      : "-"}
                    {outputChange.change && (
                      <span className="ml-1 text-xs">
                        {outputChange.change}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums">
                    {control.costUsd !== undefined
                      ? "$" + control.costUsd.toFixed(2)
                      : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 text-neutral-300 tabular-nums ${costChange.bgColor}`}
                  >
                    {treatment.costUsd !== undefined
                      ? "$" + treatment.costUsd.toFixed(2)
                      : "-"}
                    {costChange.change && (
                      <span className="ml-1 text-xs">{costChange.change}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums">
                    {control.durationMs ? prettyMs(control.durationMs) : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 text-neutral-300 tabular-nums ${durationChange.bgColor}`}
                  >
                    {treatment.durationMs
                      ? prettyMs(treatment.durationMs)
                      : "-"}
                    {durationChange.change && (
                      <span className="ml-1 text-xs">
                        {durationChange.change}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums">
                    {control.toolCalls !== undefined ? control.toolCalls : "-"}
                  </td>
                  <td
                    className={`py-2 px-3 text-neutral-300 tabular-nums ${toolCallsChange.bgColor}`}
                  >
                    {treatment.toolCalls !== undefined
                      ? treatment.toolCalls
                      : "-"}
                    {toolCallsChange.change && (
                      <span className="ml-1 text-xs">
                        {toolCallsChange.change}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

BenchmarksPage.displayName = "BenchmarksPage";

export default BenchmarksPage;
