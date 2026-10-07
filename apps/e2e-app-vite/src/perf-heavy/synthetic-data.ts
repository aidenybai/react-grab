export interface TrialRow {
  id: string;
  task: string;
  suite: string;
  model: string;
  effort: string;
  outcome: "pass" | "fail" | "error";
  score: number;
  cost: number;
  outTokens: number;
  steps: number;
  durationMin: number;
}

export interface ChartPoint {
  x: number;
  [seriesKey: string]: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  z: number;
}

export interface HeatmapCell {
  rowIndex: number;
  columnIndex: number;
  value: number;
}

// Deterministic mulberry32 PRNG so every run measures the identical DOM.
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const SUITES = ["frontend", "backend", "algorithms", "infra", "data"];
const MODELS = ["atlas-4", "borealis-2", "cascade-9", "drift-1", "ember-3", "flux-7"];
const EFFORTS = ["low", "medium", "high"];
const OUTCOMES: Array<TrialRow["outcome"]> = ["pass", "fail", "error"];
const TASK_VERBS = ["Fix", "Refactor", "Implement", "Optimize", "Debug", "Migrate"];
const TASK_NOUNS = [
  "auth flow",
  "table virtualization",
  "chart tooltip",
  "cache layer",
  "search index",
  "payment webhook",
  "drag selection",
  "sync engine",
];

export const generateTrialRows = (rowCount: number): TrialRow[] => {
  const random = createSeededRandom(0xbeef);
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const verb = TASK_VERBS[Math.floor(random() * TASK_VERBS.length)];
    const noun = TASK_NOUNS[Math.floor(random() * TASK_NOUNS.length)];
    return {
      id: `trial-${rowIndex}`,
      task: `${verb} ${noun} #${rowIndex}`,
      suite: SUITES[Math.floor(random() * SUITES.length)],
      model: MODELS[Math.floor(random() * MODELS.length)],
      effort: EFFORTS[Math.floor(random() * EFFORTS.length)],
      outcome: OUTCOMES[Math.floor(random() * OUTCOMES.length)],
      score: Number(random().toFixed(2)),
      cost: Number((random() * 12).toFixed(2)),
      outTokens: Math.floor(random() * 90_000),
      steps: Math.floor(random() * 120),
      durationMin: Number((random() * 45).toFixed(1)),
    };
  });
};

export const generateLineSeries = (pointCount: number, seriesCount: number): ChartPoint[] => {
  const random = createSeededRandom(0xcafe);
  return Array.from({ length: pointCount }, (_, pointIndex) => {
    const point: ChartPoint = { x: pointIndex };
    for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex++) {
      point[`series${seriesIndex}`] = Number(
        (Math.sin(pointIndex / (8 + seriesIndex * 3)) * 40 + 50 + random() * 12).toFixed(2),
      );
    }
    return point;
  });
};

export const generateScatterPoints = (pointCount: number): ScatterPoint[] => {
  const random = createSeededRandom(0xf00d);
  return Array.from({ length: pointCount }, () => ({
    x: Number((random() * 100).toFixed(2)),
    y: Number((random() * 100).toFixed(2)),
    z: Math.floor(random() * 400) + 40,
  }));
};

export const generateHeatmapCells = (rowCount: number, columnCount: number): HeatmapCell[] => {
  const random = createSeededRandom(0xabcd);
  const cells: HeatmapCell[] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      cells.push({ rowIndex, columnIndex, value: Number(random().toFixed(2)) });
    }
  }
  return cells;
};
