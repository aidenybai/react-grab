import { REACT_GRAB_PINK } from "@/lib/constants";
import { BENCHMARK_ROWS, TOTAL_CASES, type BenchmarkRow } from "./data";

const GRID = "grid grid-cols-[minmax(140px,1.2fr)_56px_minmax(120px,1.7fr)_52px_52px] gap-x-3";
const COLS = `${GRID} items-center`;

const TICKS = ["0", "10", "20", "30", "40", "50"];

/** Time bar spans 0–50s; the last tick sits at the right edge. Lower is better. */
const AXIS_MAX = 50;
const colPct = (value: number) => `${Math.min(100, (value / AXIS_MAX) * 100)}%`;

const hatchImage = (color: string) =>
  `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 5px)`;

const oneDecimal = (value: number) => value.toFixed(1);

/**
 * Avg-time bar: a box from 0 → mean time, a diagonal hatch over the
 * lower-confidence portion (0 → ciLo), and a CI whisker straddling the mean.
 * Shorter is faster. Geometry ported from the ReactBench leaderboard.
 */
const TimeBar = ({ row, color }: { row: BenchmarkRow; color: string }) => {
  const tint = `color-mix(in srgb, ${color} 45%, transparent)`;
  return (
    <div className="relative h-3.5 w-full">
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: colPct(row.speed),
          backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
          border: `1px solid ${color}`,
        }}
      />
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: colPct(row.speedCiLo),
          backgroundImage: hatchImage(`color-mix(in srgb, ${color} 30%, transparent)`),
        }}
      />
      <div
        className="absolute top-1/2 h-px -translate-y-1/2"
        style={{
          left: colPct(row.speedCiLo),
          width: colPct(row.speedCiHi - row.speedCiLo),
          backgroundColor: tint,
        }}
      />
      <div
        className="absolute inset-y-0 w-px"
        style={{ left: colPct(row.speedCiLo), backgroundColor: tint }}
      />
      <div
        className="absolute inset-y-0 w-px"
        style={{ left: colPct(row.speedCiHi), backgroundColor: tint }}
      />
    </div>
  );
};

const Row = ({ row }: { row: BenchmarkRow }) => {
  const textColor = row.highlight ? REACT_GRAB_PINK : "var(--color-title)";
  const barColor = row.highlight ? REACT_GRAB_PINK : "var(--color-meta)";
  return (
    <div
      className={`${COLS} group/row h-11.5 border-b border-hairline`}
      style={{ color: textColor }}
    >
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 hover:underline"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.icon} alt="" className="size-4 shrink-0 rounded-full" />
        <span className="truncate font-mono text-[13px] uppercase tracking-widest">
          {row.resolver}
        </span>
      </a>
      <span className="text-right text-[13px] tabular-nums">{oneDecimal(row.speed)}s</span>
      <TimeBar row={row} color={barColor} />
      <span className="text-right text-[13px] tabular-nums">{row.accuracy}%</span>
      <span className="text-right text-[13px] tabular-nums">{row.correct}</span>
    </div>
  );
};

/**
 * React Grab Bench leaderboard. The bar is average resolution time (lower is
 * better); accuracy and cases-solved are secondary columns. Sorted fastest
 * first, React Grab highlighted in brand pink.
 */
export const BenchmarkLeaderboard = () => {
  return (
    <div className="flex flex-col">
      <div
        role="region"
        aria-label="Benchmark results"
        tabIndex={0}
        className="scrollbar-none -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0"
      >
        <div className="flex min-w-[480px] flex-col font-mono">
          <div className={`${COLS} h-11 border-b border-hairline`}>
            <span className="font-sans text-body text-prose">Resolver</span>
            <span className="text-right font-sans text-body text-prose">Time</span>
            <span />
            <span className="text-right font-sans text-body text-prose">Acc.</span>
            <span className="text-right font-sans text-body text-prose">Solved</span>
          </div>

          <div className="flex flex-col">
            {BENCHMARK_ROWS.map((row) => (
              <Row key={row.resolver} row={row} />
            ))}
          </div>

          <div className={`${COLS} pt-1.5`}>
            <span />
            <span />
            <div className="relative h-6 text-[13px] text-prose">
              {TICKS.map((tick, index) => (
                <span
                  key={tick}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${index * 20}%` }}
                >
                  {tick}
                </span>
              ))}
            </div>
            <span />
            <span />
          </div>
        </div>
      </div>

      <p className="pt-1 font-sans text-[11px] text-prose">
        Average resolution time in seconds (lower is better); {TOTAL_CASES} cases per resolver.
      </p>
    </div>
  );
};
