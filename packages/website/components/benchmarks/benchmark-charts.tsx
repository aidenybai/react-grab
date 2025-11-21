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
             else if (unit === "ms") formattedValue = `${(rawValue / 1000).toFixed(2)}s`;
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

export const BenchmarkCharts = ({ results }: BenchmarkChartsProps) => {
  const controlResults = results.filter((r) => r.type === "control");
  const treatmentResults = results.filter((r) => r.type === "treatment");

  if (controlResults.length === 0 || treatmentResults.length === 0) {
    return null;
  }

  const controlStats = calculateStats(controlResults);
  const treatmentStats = calculateStats(treatmentResults);

  const rawData = [
    {
      name: "Avg Cost",
      Control: controlStats.avgCost,
      Treatment: treatmentStats.avgCost,
      better: "lower",
      unit: "$",
    },
    {
      name: "Avg Duration",
      Control: controlStats.avgDuration,
      Treatment: treatmentStats.avgDuration,
      better: "lower",
      unit: "ms",
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

  const chartData = rawData.map((metric) => ({
    name: metric.name,
    Control: 100,
    Treatment: (metric.Treatment / metric.Control) * 100,
    ControlRaw: metric.Control,
    TreatmentRaw: metric.Treatment,
    unit: metric.unit,
    controlDisplay: metric.unit === "$" ? `$${metric.Control.toFixed(2)}` :
                    metric.unit === "ms" ? `${(metric.Control / 1000).toFixed(1)}s` :
                    metric.Control.toFixed(1),
    treatmentDisplay: metric.unit === "$" ? `$${metric.Treatment.toFixed(2)}` :
                      metric.unit === "ms" ? `${(metric.Treatment / 1000).toFixed(1)}s` :
                      metric.Treatment.toFixed(1),
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
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
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
                            <span className="text-xs" style={{ color: "#ff4fff" }}>{entry.value}</span>
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
                <th className="text-left py-2 px-3 text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="text-left py-2 px-3 text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                  Control
                </th>
                <th className="text-left py-2 px-3 text-[10px] font-medium text-neutral-500 uppercase tracking-wider bg-[#1f1f1f]/50 rounded-tr-md">
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
                  <td className="py-2 px-3 font-medium text-neutral-300 text-xs group-hover:text-white transition-colors">
                    {metric.name}
                  </td>
                  <td className="py-2 px-3 text-neutral-400 tabular-nums text-xs">
                    {metric.control}
                  </td>
                  <td className="py-2 px-3 text-neutral-300 tabular-nums bg-[#1f1f1f]/50 text-xs group-hover:bg-[#1f1f1f] transition-colors">
                    {metric.treatment}
                    <span
                      className={`ml-2 text-[10px] font-medium ${metric.isImprovement ? "text-green-400" : "text-red-400"}`}
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
