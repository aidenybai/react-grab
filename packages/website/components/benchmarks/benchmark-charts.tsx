"use client";
import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  LabelList,
} from "recharts";
import { BenchmarkResult, Metric } from "./types";
import { calculateStats } from "./utils";
import prettyMs from "pretty-ms";
import Image from "next/image";

interface BenchmarkChartsProps {
  results: BenchmarkResult[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    fill: string;
    payload: {
      ControlRaw: number;
      TreatmentRaw: number;
      unit: string;
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-3 shadow-xl">
        <p className="mb-2 text-sm font-medium text-neutral-200">{label}</p>
        {payload.map((entry, index) => {
          const isControl = entry.name === "Control";
          const rawValue = isControl ? data.ControlRaw : data.TreatmentRaw;
          const unit = data.unit;

          let formattedValue: number | string = rawValue;
          if (typeof rawValue === "number") {
            if (unit === "$") formattedValue = `$${rawValue.toFixed(2)}`;
            else if (unit === "ms")
              formattedValue = `${(rawValue / 1000).toFixed(2)}s`;
            else formattedValue = rawValue.toFixed(2);
          }

          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-neutral-400">{entry.name}:</span>
              <span className="font-mono text-neutral-200">
                {formattedValue}
              </span>
              <span className="text-neutral-500 ml-1">
                ({entry.value.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

interface AnimatedBarProps {
  targetSeconds: number;
  maxSeconds: number;
  color: string;
  label: string;
}

const AnimatedBar = ({
  targetSeconds,
  maxSeconds,
  color,
  label,
}: AnimatedBarProps) => {
  const targetWidth = (targetSeconds / maxSeconds) * 100;
  const animationDuration = targetSeconds;

  return (
    <div className="relative h-5 flex-1">
      <div
        className="absolute top-0 left-0 h-full bg-neutral-800 rounded"
        style={{ width: `${targetWidth}%` }}
      />
      <div
        className="absolute top-0 left-0 h-full animate-fill-bar rounded"
        style={{
          backgroundColor: color,
          animationDuration: `${animationDuration}s`,
          ["--target-width" as string]: `${targetWidth}%`,
        }}
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold ml-2 tabular-nums"
        style={{
          left: `${targetWidth}%`,
          color: color === "#525252" ? "#737373" : color,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const BenchmarkChartsTweet = ({ results }: BenchmarkChartsProps) => {
  const controlResults = results.filter((r) => r.type === "control");
  const treatmentResults = results.filter((r) => r.type === "treatment");

  if (controlResults.length === 0 || treatmentResults.length === 0) {
    return null;
  }

  const controlStats = calculateStats(controlResults);
  const treatmentStats = calculateStats(treatmentResults);

  const controlTotalCost = controlResults.reduce(
    (sum, r) => sum + r.costUsd,
    0,
  );
  const treatmentTotalCost = treatmentResults.reduce(
    (sum, r) => sum + r.costUsd,
    0,
  );

  const controlDurationSec = controlStats.avgDuration / 1000;
  const treatmentDurationSec = treatmentStats.avgDuration / 1000;
  const maxSeconds = Math.ceil(controlDurationSec / 5) * 5;
  const gridLines = Array.from({ length: maxSeconds / 5 + 1 }, (_, i) => i * 5);

  const durationChange = Math.abs(
    ((treatmentStats.avgDuration - controlStats.avgDuration) /
      controlStats.avgDuration) *
      100,
  ).toFixed(0);
  const costChange = Math.abs(
    ((treatmentTotalCost - controlTotalCost) / controlTotalCost) * 100,
  ).toFixed(0);

  return (
    <div className="border border-neutral-800 rounded-lg p-6 max-w-xl mx-auto">
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="w-20 shrink-0" />
          <div className="flex-1 relative h-0">
            {gridLines.map((seconds) => (
              <div
                key={seconds}
                className="absolute top-0 border-l border-neutral-800"
                style={{
                  left: `${(seconds / maxSeconds) * 100}%`,
                  height: "calc(100% + 80px)",
                  marginTop: "-4px",
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2 relative">
          <div className="flex items-center gap-3">
            <div className="w-20 text-right text-xs font-medium text-[#ff4fff] shrink-0">
              Claude Code + React Grab
            </div>
            <div className="relative h-5 flex-1">
              <AnimatedBarTreatment
                targetSeconds={treatmentDurationSec}
                maxSeconds={maxSeconds}
                color="#ff4fff"
                durationLabel={`${treatmentDurationSec.toFixed(1)}s`}
                durationChange={durationChange}
                costLabel={`$${treatmentTotalCost.toFixed(2)}`}
                costChange={costChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-20 text-right text-xs font-medium text-neutral-400 shrink-0">
              Claude Code
            </div>
            <AnimatedBar
              targetSeconds={controlDurationSec}
              maxSeconds={maxSeconds}
              color="#525252"
              label={`${controlDurationSec.toFixed(1)}s`}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-20 shrink-0" />
            <LiveCounter
              targetSeconds={controlDurationSec}
              maxSeconds={maxSeconds}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="w-20 shrink-0" />
          <div className="flex-1 relative h-5">
            {gridLines.map((seconds) => (
              <span
                key={seconds}
                className="absolute text-[10px] text-neutral-600 -translate-x-1/2"
                style={{ left: `${(seconds / maxSeconds) * 100}%` }}
              >
                {seconds}s
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-neutral-600 italic">
        Above: avg time for Claude Code to complete 20 UI tasks on a{" "}
        <a
          href="https://ui.shadcn.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-400"
        >
          shadcn/ui
        </a>{" "}
        dashboard.{" "}
        <a
          href="https://github.com/aidenybai/react-grab/tree/main/packages/benchmarks"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-400"
        >
          More info
        </a>
        .
      </p>
    </div>
  );
};

interface AnimatedBarTreatmentProps {
  targetSeconds: number;
  maxSeconds: number;
  color: string;
  durationLabel: string;
  durationChange: string;
  costLabel: string;
  costChange: string;
}

const AnimatedBarTreatment = ({
  targetSeconds,
  maxSeconds,
  color,
  durationLabel,
  durationChange,
  costLabel,
  costChange,
}: AnimatedBarTreatmentProps) => {
  const targetWidth = (targetSeconds / maxSeconds) * 100;
  const animationDuration = targetSeconds;

  return (
    <>
      <div
        className="absolute top-0 left-0 h-full bg-neutral-800 rounded"
        style={{ width: `${targetWidth}%` }}
      />
      <div
        className="absolute top-0 left-0 h-full animate-fill-bar rounded"
        style={{
          backgroundColor: color,
          animationDuration: `${animationDuration}s`,
          ["--target-width" as string]: `${targetWidth}%`,
        }}
      />
      <span
        className="absolute top-1/2 -translate-y-1/2 flex items-center gap-2 ml-2"
        style={{ left: `${targetWidth}%` }}
      >
        <span className="text-xs font-semibold text-[#ff4fff]">
          {durationLabel}
        </span>
        <span className="text-sm font-bold text-emerald-400">
          ↓{durationChange}%
        </span>
        <span className="text-[10px] text-neutral-500">
          ({costLabel} ↓{costChange}%)
        </span>
      </span>
    </>
  );
};

interface LiveCounterProps {
  targetSeconds: number;
  maxSeconds: number;
}

const LiveCounter = ({ targetSeconds, maxSeconds }: LiveCounterProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= targetSeconds) {
        setElapsedSeconds(targetSeconds);
        clearInterval(interval);
      } else {
        setElapsedSeconds(elapsed);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [targetSeconds]);

  const currentWidth = (elapsedSeconds / maxSeconds) * 100;

  return (
    <div className="relative h-5 flex-1">
      <span
        className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-neutral-400"
        style={{ left: `${currentWidth}%` }}
      >
        {elapsedSeconds.toFixed(1)}s
      </span>
    </div>
  );
};

export const BenchmarkCharts = ({ results }: BenchmarkChartsProps) => {
  const controlResults = results.filter((r) => r.type === "control");
  const treatmentResults = results.filter((r) => r.type === "treatment");

  if (controlResults.length === 0 || treatmentResults.length === 0) {
    return null;
  }

  const controlStats = calculateStats(controlResults);
  const treatmentStats = calculateStats(treatmentResults);

  const controlTotalCost = controlResults.reduce(
    (sum, r) => sum + r.costUsd,
    0,
  );
  const treatmentTotalCost = treatmentResults.reduce(
    (sum, r) => sum + r.costUsd,
    0,
  );

  const rawData = [
    {
      name: "Avg Duration",
      Control: controlStats.avgDuration,
      Treatment: treatmentStats.avgDuration,
      better: "lower",
      unit: "ms",
    },
    {
      name: "Total Cost",
      Control: controlTotalCost,
      Treatment: treatmentTotalCost,
      better: "lower",
      unit: "$",
    },
    {
      name: "Avg Tool Calls",
      Control: controlStats.avgToolCalls,
      Treatment: treatmentStats.avgToolCalls,
      better: "lower",
      unit: "",
    },
  ];

  const metrics: Metric[] = [
    {
      name: "Average Duration",
      control: prettyMs(controlStats.avgDuration),
      treatment: prettyMs(treatmentStats.avgDuration),
      isImprovement: treatmentStats.avgDuration <= controlStats.avgDuration,
      change: `${Math.abs(((treatmentStats.avgDuration - controlStats.avgDuration) / controlStats.avgDuration) * 100).toFixed(1)}%`,
    },
    {
      name: "Total Cost",
      control: `$${controlTotalCost.toFixed(2)}`,
      treatment: `$${treatmentTotalCost.toFixed(2)}`,
      isImprovement: treatmentTotalCost <= controlTotalCost,
      change: `${Math.abs(((treatmentTotalCost - controlTotalCost) / controlTotalCost) * 100).toFixed(1)}%`,
    },
    {
      name: "Avg Tool Calls",
      control: controlStats.avgToolCalls.toFixed(1),
      treatment: treatmentStats.avgToolCalls.toFixed(1),
      isImprovement: treatmentStats.avgToolCalls <= controlStats.avgToolCalls,
      change: `${Math.abs(((treatmentStats.avgToolCalls - controlStats.avgToolCalls) / controlStats.avgToolCalls) * 100).toFixed(1)}%`,
    },
  ];

  const chartData = rawData.map((metric) => ({
    name: metric.name,
    Control: 100,
    Treatment: (metric.Treatment / metric.Control) * 100,
    ControlRaw: metric.Control,
    TreatmentRaw: metric.Treatment,
    unit: metric.unit,
    controlDisplay:
      metric.unit === "$"
        ? `$${metric.Control.toFixed(2)}`
        : metric.unit === "ms"
          ? `${(metric.Control / 1000).toFixed(1)}s`
          : metric.Control.toFixed(1),
    treatmentDisplay:
      metric.unit === "$"
        ? `$${metric.Treatment.toFixed(2)}`
        : metric.unit === "ms"
          ? `${(metric.Treatment / 1000).toFixed(1)}s`
          : metric.Treatment.toFixed(1),
  }));

  return (
    <div>
      <div className="space-y-8">
        {/* Chart Section */}
        <div className="h-[320px] w-full">
          <div className="mb-4 text-sm text-neutral-500 text-center">
            Normalized to Control = 100%
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 20 }}
              barGap={12}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#262626"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#a3a3a3", fontSize: 11, fontWeight: 500 }}
              />
              <YAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#737373", fontSize: 10 }}
                unit="%"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                content={({ payload }) => (
                  <div className="flex items-center justify-center gap-4">
                    {payload?.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.value === "React Grab" ? (
                          <div className="flex items-center gap-1.5">
                            <Image
                              src="/logo.svg"
                              alt="React Grab"
                              width={12}
                              height={12}
                              className="w-3 h-3"
                            />
                            <span
                              className="text-xs"
                              style={{ color: "#ff4fff" }}
                            >
                              {entry.value}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs">{entry.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              />
              <Bar
                dataKey="Control"
                name="Control"
                fill="#525252"
                radius={[4, 4, 0, 0]}
                barSize={40}
                animationDuration={1000}
              >
                <LabelList
                  dataKey="controlDisplay"
                  position="top"
                  fill="#a3a3a3"
                  fontSize={14}
                  fontWeight={500}
                />
              </Bar>
              <Bar
                dataKey="Treatment"
                name="React Grab"
                fill="#ff4fff"
                radius={[4, 4, 0, 0]}
                barSize={40}
                animationDuration={1000}
              >
                <LabelList
                  dataKey="treatmentDisplay"
                  position="top"
                  fill="#ff4fff"
                  fontSize={14}
                  fontWeight={500}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto flex justify-center">
          <table className="text-sm border-collapse max-w-2xl w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left py-2 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="text-left py-2 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Control
                </th>
                <th className="text-left py-2 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider bg-[#1f1f1f]/50 rounded-tr-md">
                  <div className="flex items-center gap-1.5">
                    <Image
                      src="/logo.svg"
                      alt="React Grab"
                      width={12}
                      height={12}
                      className="w-3 h-3"
                    />
                    <span style={{ color: "#ff4fff" }}>React Grab</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {metrics.map((metric) => (
                <tr
                  key={metric.name}
                  className="hover:bg-[#1a1a1a] transition-colors group"
                >
                  <td className="py-2 px-4 font-medium text-neutral-300 text-sm group-hover:text-white transition-colors">
                    {metric.name}
                  </td>
                  <td className="py-2 px-4 text-neutral-400 tabular-nums text-sm">
                    {metric.control}
                  </td>
                  <td className="py-2 px-4 text-neutral-300 tabular-nums bg-[#1f1f1f]/50 text-sm group-hover:bg-[#1f1f1f] transition-colors">
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
    </div>
  );
};
