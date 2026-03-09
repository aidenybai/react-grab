"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Collapsible } from "@/components/ui/collapsible";
import { DataTableCard } from "@/components/ui/data-table-card";
import benchData from "./data.json";

const TABS = ["speed", "accuracy"] as const;

const COLORS: Record<string, string> = {
  "react-grab+claude": "#ff4fff",
  "agentation+claude": "#4a90d9",
  "claude-code": "#e87b35",
};

const chartConfig = Object.fromEntries(
  benchData.resolvers.map((resolver) => [
    resolver.key,
    { label: resolver.label, color: COLORS[resolver.key] ?? "#888" },
  ]),
) as ChartConfig;

const resolverKeys = benchData.resolvers.map((resolver) => resolver.key);
const controlKey = (benchData as { control?: string }).control;

const getChangeInfo = (
  controlVal: number,
  treatmentVal: number,
  lowerIsBetter: boolean,
): { change: string; bgColor: string } => {
  if (!controlVal || !treatmentVal)
    return { change: "", bgColor: "transparent" };
  const pct = ((treatmentVal - controlVal) / controlVal) * 100;
  if (Math.abs(pct) < 0.5) return { change: "", bgColor: "transparent" };
  const isGood = lowerIsBetter ? pct < 0 : pct > 0;
  const abs = Math.abs(pct);
  const intensity = Math.min(abs / 100, 1);
  const opacity = 0.1 + intensity * 0.3;
  return {
    change: `${isGood ? "\u2193" : "\u2191"}${Math.round(abs)}%`,
    bgColor: isGood
      ? `rgba(100, 200, 150, ${opacity})`
      : `rgba(240, 120, 120, ${opacity})`,
  };
};

const speedChartData = benchData.scenarios.map((scenario) => ({
  label: scenario.label,
  ...Object.fromEntries(
    resolverKeys.map((key) => [key, scenario.results[key as keyof typeof scenario.results].speed]),
  ),
}));

const accuracyChartData = benchData.scenarios.map((scenario) => ({
  label: scenario.label,
  ...Object.fromEntries(
    resolverKeys.map((key) => [
      key,
      scenario.results[key as keyof typeof scenario.results].accuracy,
    ]),
  ),
}));

const ResultsSection = () => {
  const [tab, setTab] = useQueryState(
    "metric",
    parseAsStringLiteral(TABS).withDefault("speed"),
  );
  const isSpeed = tab === "speed";
  const panelId = `panel-${tab}`;

  return (
    <>
      <div
        role="tablist"
        aria-label="Metric"
        className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit"
      >
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            role="tab"
            aria-selected={tab === tabKey}
            aria-controls={panelId}
            onClick={() => setTab(tabKey)}
            className={`min-h-8 px-3.5 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              tab === tabKey
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabKey === "speed" ? "Speed" : "Accuracy"}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-label={isSpeed ? "Speed" : "Accuracy"}
      >
        <p className="text-sm text-muted-foreground italic mb-3">
          {isSpeed
            ? "Resolution time in seconds (lower is better)"
            : "Correct resolutions in % (higher is better)"}
        </p>

        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full mb-8">
          <BarChart
            data={isSpeed ? speedChartData : accuracyChartData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 24, left: 0 }}
            barCategoryGap="18%"
            barGap={1}
            role="img"
            aria-label={
              isSpeed
                ? "Bar chart of average resolution speed by test category"
                : "Bar chart of resolution accuracy by test category"
            }
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={160}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <XAxis
              type="number"
              domain={isSpeed ? [0, 30] : [0, 100]}
              ticks={
                isSpeed
                  ? [0, 5, 10, 15, 20, 25, 30]
                  : [0, 25, 50, 75, 100]
              }
              tickFormatter={(v) => (isSpeed ? `${v}s` : `${v}%`)}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.15 }}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {resolverKeys.map((resolverKey) => (
              <Bar
                key={resolverKey}
                dataKey={resolverKey}
                fill={COLORS[resolverKey] ?? "#888"}
                radius={[0, 3, 3, 0]}
              >
                <LabelList
                  dataKey={resolverKey}
                  position="right"
                  formatter={(value: number) => (isSpeed ? `${value}s` : `${value}%`)}
                  style={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>

        {/* Per-test-case table */}
        {benchData.testCases && (
          <DataTableCard
            title="All Test Cases"
            description={
              isSpeed
                ? "Resolution time per test case. Each treatment column shows % change vs. control (lower is better)."
                : "Whether each resolver found the correct source file. Green = improvement over control."
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="text-left py-2 px-3 text-xs font-medium text-muted-foreground"
                  >
                    Test Case
                  </th>
                  {resolverKeys.map((resolverKey) => {
                    const resolver = benchData.resolvers.find((innerResolver) => innerResolver.key === resolverKey);
                    return (
                      <th
                        key={resolverKey}
                        scope="col"
                        className="text-right py-2 px-3 text-xs font-medium text-muted-foreground"
                      >
                        {resolver?.label ?? resolverKey}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchData.testCases.map((testCase) => {
                  const controlResult = controlKey
                    ? testCase.results[controlKey as keyof typeof testCase.results]
                    : null;
                  return (
                    <tr
                      key={testCase.id}
                      className="hover:bg-popover transition-colors"
                    >
                      <td
                        className="py-2 px-3 text-foreground font-medium max-w-[200px] truncate cursor-help"
                        title={testCase.difficulty}
                      >
                        {testCase.testId}
                      </td>
                      {resolverKeys.map((resolverKey) => {
                        const result = testCase.results[resolverKey as keyof typeof testCase.results];
                        const isControl = resolverKey === controlKey;

                        if (isSpeed) {
                          const info = !isControl && controlResult
                            ? getChangeInfo(controlResult.speed, result.speed, true)
                            : { change: "", bgColor: "transparent" };
                          return (
                            <td
                              key={resolverKey}
                              className="py-2 px-3 text-right tabular-nums text-xs"
                              style={{
                                color: isControl
                                  ? "var(--muted-foreground)"
                                  : "var(--foreground)",
                                backgroundColor: info.bgColor,
                              }}
                            >
                              {result.speed ? `${result.speed}s` : "\u2014"}
                              {info.change && (
                                <span className="ml-1.5 text-[10px] opacity-70">
                                  {info.change}
                                </span>
                              )}
                            </td>
                          );
                        }

                        const controlCorrect = controlResult?.correct ?? false;
                        const didImproveOverControl = !isControl && result.correct && !controlCorrect;
                        const didRegressFromControl = !isControl && !result.correct && controlCorrect;
                        const bgColor = didImproveOverControl
                          ? "rgba(100, 200, 150, 0.2)"
                          : didRegressFromControl
                            ? "rgba(240, 120, 120, 0.2)"
                            : "transparent";
                        return (
                          <td
                            key={resolverKey}
                            className="py-2 px-3 text-right tabular-nums text-xs"
                            style={{
                              color: result.correct
                                ? "var(--foreground)"
                                : "var(--muted-foreground)",
                              backgroundColor: bgColor,
                            }}
                          >
                            {result.correct ? "\u2713" : "\u2717"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableCard>
        )}
      </div>
    </>
  );
};

const BenchmarksPage = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col pt-4 text-base sm:pt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 underline underline-offset-4"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 className="text-foreground text-xl font-medium mb-1">
          Benchmark of Element Inspector Tools
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Last benchmarked at: <em>{benchData.lastBenchmarked}</em>.
        </p>

        <div className="space-y-3 text-sm text-foreground/80 mb-6">
          <p>
            This benchmark compares treatment tools (React Grab, Agentation)
            against a control (Claude Code with no tool) at locating the source
            file of a React component, given only a description of what the user
            sees on screen.
          </p>
          <p>Each scenario groups test cases by the structural complexity
            of the React tree the resolver must navigate:</p>
          <ul className="space-y-3 list-disc pl-5">
            <li><Collapsible
              defaultExpanded={false}
              header={
                <span className="text-foreground/80">
                  <span className="font-semibold">plain components</span>
                  {": "}12 components with a single owner and no indirection.
                </span>
              }
            >
              <ul className="list-disc pl-7 mt-1.5 mb-2 space-y-1 text-foreground/70">
                <li>styled-components (card, button, badge)</li>
                <li>Tailwind utility classes (card, button, badge)</li>
                <li>CSS Modules with scoped class names</li>
                <li>inline React styles (zero class names)</li>
                <li>shadcn/ui composite (Card + Avatar + Badge)</li>
                <li>one Radix Tabs trigger, one Motion animated card</li>
                <li>a div rendered inside 6 context providers</li>
              </ul>
            </Collapsible></li>
            <li><Collapsible
              defaultExpanded={false}
              header={
                <span className="text-foreground/80">
                  <span className="font-semibold">HOCs, portals, compound</span>
                  {": "}18 components where the DOM parent no longer maps directly
                  to the React owner.
                </span>
              }
            >
              <ul className="list-disc pl-7 mt-1.5 mb-2 space-y-1 text-foreground/70">
                <li>memo / forwardRef wrappers and HOCs (tracking, tooltip)</li>
                <li>Radix portals (Dialog, Dropdown, Popover, Accordion)</li>
                <li>10+ nested Fragment layers (zero DOM wrappers)</li>
                <li>Suspense boundaries with lazy-loaded children</li>
                <li>AnimatePresence list items and stagger grids</li>
                <li>compound table structures and shadcn/ui form inputs</li>
                <li>Tailwind dashboard stats, CSS Module table badges</li>
              </ul>
            </Collapsible></li>
            <li><Collapsible
              defaultExpanded={false}
              header={
                <span className="text-foreground/80">
                  <span className="font-semibold">nested HOCs + Radix + Motion</span>
                  {": "}14 components combining multiple abstraction layers in a
                  single tree.
                </span>
              }
            >
              <ul className="list-disc pl-7 mt-1.5 mb-2 space-y-1 text-foreground/70">
                <li>depth-8 binary tree with 256 identical styled leaves</li>
                <li>10-level recursive menu</li>
                <li>fractal subdividing grid</li>
                <li>HOC-wrapped Motion cards inside styled layouts</li>
                <li>portal modals with Motion enter/exit animations</li>
                <li>dynamic renderers with computed component selection</li>
                <li>conditional trees branching on prop hash</li>
                <li>Motion layoutId tab indicators</li>
                <li>elements styled by 2-4 systems simultaneously (styled-components + Tailwind + CSS Modules + inline)</li>
              </ul>
            </Collapsible></li>
            <li><Collapsible
              defaultExpanded={false}
              header={
                <span className="text-foreground/80">
                  <span className="font-semibold">recursive trees, triple portals, factories</span>
                  {": "}24 adversarial cases.
                </span>
              }
            >
              <ul className="list-disc pl-7 mt-1.5 mb-2 space-y-1 text-foreground/70">
                <li>25-layer Fiber trees (providers, HOCs, styled, Motion, fragments, Suspense, Radix portal)</li>
                <li>15+ nested HOC wrappers around a single button</li>
                <li>triple-nested portals (Dialog, Popover, createPortal)</li>
                <li>AnimatePresence, Motion, styled-components, and Radix Accordion in one tree</li>
                <li>same component rendered at 6 different depths with identical DOM output</li>
                <li>components that change tree shape on a timer</li>
                <li>factory-generated widgets via createWidget()</li>
                <li>components defined inside hook files or utility modules</li>
                <li>barrel re-exports through 3 index files</li>
                <li>directory nesting 5 levels deep</li>
                <li>auto-generated component registries with slug-based lookup</li>
              </ul>
            </Collapsible></li>
          </ul>
          <p>
            All runs use{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/70">
              claude-sonnet-4-6
            </code>{" "}
            with identical system prompts. Each resolver receives the same text
            description of the target element.{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/benchmarks"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Source code and reproduction steps
            </a>
            .{" "}
            <a
              href="https://github.com/aidenybai/react-grab/fork"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Submit your own benchmark
            </a>
            .
          </p>
        </div>

        <Suspense>
          <ResultsSection />
        </Suspense>

        <div className="pb-12" />
      </div>
    </div>
  );
};

BenchmarksPage.displayName = "BenchmarksPage";

export default BenchmarksPage;
