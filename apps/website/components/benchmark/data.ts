/**
 * React Grab Bench results (source of truth: the aggregated "overall" scenario
 * from benchmark.react-grab.com, last benchmarked 2026-03-15). Each resolver is
 * Claude Code plus one browser-side source-retrieval tool, run over 331 test
 * cases. `accuracy` is the share of cases solved (%); `speed` is the average
 * resolution time in seconds (wrong answers penalized at 2min, lower is better).
 * CI fields are the reported 95% confidence intervals. The Instruckt resolver is
 * intentionally omitted. Rows are pre-sorted by avg time asc (fastest first).
 */

export interface BenchmarkRow {
  resolver: string;
  /** Project/repo link for the resolver's tool. */
  href: string;
  /** GitHub owner avatar used as the tool's icon. */
  icon: string;
  accuracy: number;
  accuracyCiLo: number;
  accuracyCiHi: number;
  speed: number;
  speedCiLo: number;
  speedCiHi: number;
  correct: number;
  /** Highlight the React Grab row in the brand accent. */
  highlight?: boolean;
}

export const TOTAL_CASES = 331;
export const LAST_BENCHMARKED = "2026-03-15";

export const BENCHMARK_ROWS: BenchmarkRow[] = [
  {
    resolver: "React Grab",
    href: "https://github.com/aidenybai/react-grab",
    icon: "https://github.com/aidenybai.png?size=64",
    accuracy: 96,
    accuracyCiLo: 93,
    accuracyCiHi: 97.5,
    speed: 20.7,
    speedCiLo: 17.4,
    speedCiHi: 24,
    correct: 317,
    highlight: true,
  },
  {
    resolver: "Cursor Browser",
    href: "https://cursor.com/docs/agent/browser",
    icon: "https://github.com/anysphere.png?size=64",
    accuracy: 95,
    accuracyCiLo: 91.9,
    accuracyCiHi: 96.8,
    speed: 30.7,
    speedCiLo: 27,
    speedCiHi: 34.5,
    correct: 314,
  },
  {
    resolver: "Agentation",
    href: "https://github.com/benjitaylor/agentation",
    icon: "https://github.com/benjitaylor.png?size=64",
    accuracy: 96,
    accuracyCiLo: 93.8,
    accuracyCiHi: 97.9,
    speed: 31.5,
    speedCiLo: 27.8,
    speedCiHi: 35.2,
    correct: 319,
  },
  {
    resolver: "LocatorJS",
    href: "https://github.com/infi-pc/locatorjs",
    icon: "https://github.com/infi-pc.png?size=64",
    accuracy: 86,
    accuracyCiLo: 82,
    accuracyCiHi: 89.4,
    speed: 41.8,
    speedCiLo: 37.2,
    speedCiHi: 46.4,
    correct: 285,
  },
  {
    resolver: "Click to Component",
    href: "https://github.com/ericclemmons/click-to-component",
    icon: "https://github.com/ericclemmons.png?size=64",
    accuracy: 86,
    accuracyCiLo: 82,
    accuracyCiHi: 89.4,
    speed: 42.8,
    speedCiLo: 38,
    speedCiHi: 47.6,
    correct: 285,
  },
  {
    resolver: "Claude Code (no tool)",
    href: "https://github.com/anthropics/claude-code",
    icon: "https://github.com/anthropics.png?size=64",
    accuracy: 86,
    accuracyCiLo: 82,
    accuracyCiHi: 89.4,
    speed: 45.1,
    speedCiLo: 40.2,
    speedCiHi: 50.1,
    correct: 285,
  },
];
