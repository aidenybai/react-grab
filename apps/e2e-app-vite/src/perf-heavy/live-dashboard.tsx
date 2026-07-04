import { memo, useEffect, useMemo, useState } from "react";
import {
  DASHBOARD_FEED_ROW_COUNT,
  DASHBOARD_SPARKLINE_POINT_COUNT,
  DASHBOARD_STAT_CARD_COUNT,
  DASHBOARD_TICK_INTERVAL_MS,
} from "./constants";
import { createSeededRandom, generateTrialRows, type TrialRow } from "./synthetic-data";

interface StatCardData {
  label: string;
  value: number;
  deltaPercent: number;
  sparkline: number[];
}

const STAT_LABELS = [
  "req/s",
  "p50 ms",
  "p95 ms",
  "errors",
  "cpu %",
  "mem MB",
  "conns",
  "queue",
  "cache hit",
  "gc ms",
  "io kb/s",
  "threads",
];

const advanceStats = (previousStats: StatCardData[], random: () => number): StatCardData[] =>
  previousStats.map((stat) => {
    const nextValue = Math.max(0, stat.value + (random() - 0.5) * stat.value * 0.1);
    return {
      label: stat.label,
      value: nextValue,
      deltaPercent: stat.value === 0 ? 0 : ((nextValue - stat.value) / stat.value) * 100,
      sparkline: [...stat.sparkline.slice(1), nextValue],
    };
  });

const buildInitialStats = (): StatCardData[] => {
  const random = createSeededRandom(0x5eed);
  return STAT_LABELS.slice(0, DASHBOARD_STAT_CARD_COUNT).map((label) => {
    const baseValue = random() * 900 + 100;
    return {
      label,
      value: baseValue,
      deltaPercent: 0,
      sparkline: Array.from(
        { length: DASHBOARD_SPARKLINE_POINT_COUNT },
        () => baseValue * (0.8 + random() * 0.4),
      ),
    };
  });
};

const Sparkline = ({ points }: { points: number[] }) => {
  const maxPoint = Math.max(...points);
  const minPoint = Math.min(...points);
  const range = maxPoint - minPoint || 1;
  const path = points
    .map((point, pointIndex) => {
      const x = (pointIndex / (points.length - 1)) * 80;
      const y = 24 - ((point - minPoint) / range) * 24;
      return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="80" height="24" className="text-blue-500">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};

const StatCard = ({ stat }: { stat: StatCardData }) => (
  <div
    data-testid={`stat-card-${stat.label.replace(/[^a-z0-9]/gi, "-")}`}
    data-heavy-stat-card
    className="flex flex-col gap-1 rounded border p-3"
  >
    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
      {stat.label}
    </span>
    <span className="font-mono text-lg tabular-nums">{stat.value.toFixed(1)}</span>
    <span
      className={`font-mono text-[10px] tabular-nums ${stat.deltaPercent >= 0 ? "text-green-600" : "text-red-600"}`}
    >
      {stat.deltaPercent >= 0 ? "▲" : "▼"} {Math.abs(stat.deltaPercent).toFixed(2)}%
    </span>
    <Sparkline points={stat.sparkline} />
  </div>
);

const FeedRow = memo(({ row, highlightedId }: { row: TrialRow; highlightedId: string | null }) => (
  <li
    data-heavy-feed-row
    className={`flex items-center gap-3 border-b px-2 py-1.5 text-xs ${
      highlightedId === row.id ? "bg-yellow-50" : ""
    }`}
  >
    <span className="font-mono text-[10px] text-gray-400">{row.id}</span>
    <span className="max-w-64 truncate">{row.task}</span>
    <span className="ml-auto font-mono text-[10px] uppercase text-gray-500">{row.model}</span>
    <span className="font-mono text-[11px] tabular-nums">${row.cost.toFixed(2)}</span>
  </li>
));

export const LiveDashboardSection = () => {
  const feedRows = useMemo(() => generateTrialRows(DASHBOARD_FEED_ROW_COUNT), []);
  const [stats, setStats] = useState(buildInitialStats);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const random = createSeededRandom(0x7135);
    const intervalHandle = setInterval(() => {
      setStats((previousStats) => advanceStats(previousStats, random));
      setHighlightedId(`trial-${Math.floor(random() * DASHBOARD_FEED_ROW_COUNT)}`);
    }, DASHBOARD_TICK_INTERVAL_MS);
    return () => clearInterval(intervalHandle);
  }, []);

  return (
    <section data-testid="heavy-dashboard-section" className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">
        Live Dashboard (re-renders every {DASHBOARD_TICK_INTERVAL_MS}ms)
      </h2>
      <div className="grid grid-cols-4 gap-3" data-testid="dashboard-stat-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
      <ul className="rounded border" data-testid="dashboard-feed">
        {feedRows.map((row) => (
          <FeedRow key={row.id} row={row} highlightedId={highlightedId} />
        ))}
      </ul>
    </section>
  );
};
