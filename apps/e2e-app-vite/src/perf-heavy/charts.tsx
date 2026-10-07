import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  BAR_CHART_BAR_COUNT,
  CHART_HEIGHT_PX,
  LINE_CHART_POINT_COUNT,
  LINE_CHART_SERIES_COUNT,
  SCATTER_CHART_POINT_COUNT,
} from "./constants";
import { generateLineSeries, generateScatterPoints, generateTrialRows } from "./synthetic-data";

const SERIES_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea"];

export const ChartsSection = () => {
  const linePoints = useMemo(
    () => generateLineSeries(LINE_CHART_POINT_COUNT, LINE_CHART_SERIES_COUNT),
    [],
  );
  const barRows = useMemo(() => generateTrialRows(BAR_CHART_BAR_COUNT), []);
  const scatterPoints = useMemo(() => generateScatterPoints(SCATTER_CHART_POINT_COUNT), []);

  return (
    <section data-testid="heavy-charts-section" className="flex flex-col gap-6 p-4">
      <h2 className="text-lg font-bold">Charts (recharts)</h2>

      <div data-testid="chart-line" style={{ height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linePoints}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.from({ length: LINE_CHART_SERIES_COUNT }, (_, seriesIndex) => (
              <Line
                key={seriesIndex}
                type="monotone"
                dataKey={`series${seriesIndex}`}
                stroke={SERIES_COLORS[seriesIndex]}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div data-testid="chart-bar" style={{ height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barRows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="id" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cost" fill="#2563eb" />
            <Bar dataKey="durationMin" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div data-testid="chart-area" style={{ height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={linePoints}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="series0"
              stroke="#9333ea"
              fill="#9333ea"
              fillOpacity={0.2}
            />
            <Area
              type="monotone"
              dataKey="series1"
              stroke="#dc2626"
              fill="#dc2626"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div data-testid="chart-scatter" style={{ height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" />
            <YAxis dataKey="y" type="number" />
            <ZAxis dataKey="z" range={[20, 200]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatterPoints} fill="#2563eb" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
