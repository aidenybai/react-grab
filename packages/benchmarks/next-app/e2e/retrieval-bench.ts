#!/usr/bin/env npx tsx

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { TEST_MANIFEST, type TestEntry } from "../test-manifest";

const CWD = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DISALLOWED = "Edit,Write,NotebookEdit,Bash";
const TIMEOUT_MS = 120_000;

const SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    filePath: {
      type: "string",
      description: "Relative path e.g. components/styled/styled-card.tsx",
    },
    componentName: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reasoning: { type: "string" },
  },
  required: ["filePath", "componentName", "confidence"],
});

interface Result {
  id: number;
  testId: string;
  difficulty: string;
  expected: string;
  actual: string | null;
  correct: boolean;
  wallMs: number;
  confidence: string | null;
  error?: string;
}

function prompt(entry: TestEntry): string {
  return [
    `Find the source file for this React component in the Next.js app.`,
    `Description: ${entry.description}`,
    `DOM data-testid="${entry.testId}"`,
    `Return the relative file path (e.g. "components/foo/bar.tsx") and the component name. Read-only — do not edit.`,
  ].join("\n");
}

function run(text: string, model?: string): { out: string; ms: number } {
  const flags = [
    `-p`,
    `--output-format json`,
    `--no-session-persistence`,
    `--disallowed-tools "${DISALLOWED}"`,
    `--json-schema '${SCHEMA}'`,
    `--max-budget-usd 0.50`,
    model ? `--model ${model}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const start = performance.now();
  const out = execSync(`claude ${flags} -- ${JSON.stringify(text)}`, {
    cwd: CWD,
    encoding: "utf-8",
    timeout: TIMEOUT_MS,
    env: { ...process.env, FORCE_COLOR: "0", CLAUDECODE: "" },
  });
  return { out, ms: performance.now() - start };
}

function parse(raw: string) {
  try {
    const outer = JSON.parse(raw);

    if (
      outer.structured_output &&
      typeof outer.structured_output === "object"
    ) {
      return {
        filePath: (outer.structured_output.filePath as string) ?? null,
        confidence: (outer.structured_output.confidence as string) ?? null,
      };
    }

    const obj =
      typeof outer.result === "string"
        ? JSON.parse(outer.result.match(/\{[\s\S]*\}/)?.[0] ?? "{}")
        : typeof outer.result === "object"
          ? outer.result
          : outer;
    return {
      filePath: (obj.filePath as string) ?? null,
      confidence: (obj.confidence as string) ?? null,
    };
  } catch {
    return { filePath: null, confidence: null };
  }
}

function normalize(p: string) {
  return p
    .replace(/^\.\//, "")
    .replace(/^app\//, "")
    .replace(/^src\//, "");
}

function generateChart(results: Result[]): string {
  const W = 900,
    H = 520,
    PAD = { t: 60, r: 30, b: 80, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const tiers = ["easy", "medium", "hard", "nightmare"] as const;
  const colors: Record<string, string> = {
    easy: "#22c55e",
    medium: "#eab308",
    hard: "#f97316",
    nightmare: "#ef4444",
  };

  const sorted = [...results].sort((a, b) => a.wallMs - b.wallMs);
  const maxMs = Math.max(...results.map((r) => r.wallMs), 1000);
  const ceil = Math.ceil(maxMs / 5000) * 5000;

  const x = (i: number) => PAD.l + (i / (sorted.length - 1 || 1)) * plotW;
  const y = (ms: number) => PAD.t + plotH - (ms / ceil) * plotH;

  const gridLines = Array.from({ length: 6 }, (_, i) => {
    const ms = (i * ceil) / 5;
    return `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(ms)}" y2="${y(ms)}" stroke="#333" stroke-dasharray="4"/>
            <text x="${PAD.l - 8}" y="${y(ms) + 4}" text-anchor="end" fill="#888" font-size="11">${(ms / 1000).toFixed(0)}s</text>`;
  }).join("\n");

  const dots = sorted
    .map((r, i) => {
      const fill = r.correct ? colors[r.difficulty] : "#666";
      const stroke = r.correct ? "none" : "#ef4444";
      const sw = r.correct ? 0 : 2;
      return `<circle cx="${x(i)}" cy="${y(r.wallMs)}" r="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}">
              <title>[${r.id}] ${r.testId} — ${(r.wallMs / 1000).toFixed(1)}s ${r.correct ? "✓" : "✗"}</title>
            </circle>`;
    })
    .join("\n");

  const legend = tiers
    .map((t, i) => {
      const lx = PAD.l + i * 130;
      const count = results.filter((r) => r.difficulty === t);
      const correct = count.filter((r) => r.correct).length;
      return `<rect x="${lx}" y="${H - 30}" width="12" height="12" rx="2" fill="${colors[t]}"/>
            <text x="${lx + 18}" y="${H - 20}" fill="#ccc" font-size="12">${t} ${correct}/${count.length}</text>`;
    })
    .join("\n");

  const total = results.length;
  const totalCorrect = results.filter((r) => r.correct).length;
  const avgS = (
    results.reduce((s, r) => s + r.wallMs, 0) /
    total /
    1000
  ).toFixed(1);

  const tableY = H + 20;
  const rowH = 22;
  const tierStats = tiers.map((t) => {
    const tier = results.filter((r) => r.difficulty === t);
    const correct = tier.filter((r) => r.correct).length;
    const avg = tier.length
      ? (tier.reduce((s, r) => s + r.wallMs, 0) / tier.length / 1000).toFixed(1)
      : "-";
    const min = tier.length
      ? (Math.min(...tier.map((r) => r.wallMs)) / 1000).toFixed(1)
      : "-";
    const max = tier.length
      ? (Math.max(...tier.map((r) => r.wallMs)) / 1000).toFixed(1)
      : "-";
    return { tier: t, n: tier.length, correct, avg, min, max };
  });

  const headers = ["Tier", "Cases", "Correct", "Accuracy", "Avg", "Min", "Max"];
  const colX = [30, 130, 200, 280, 380, 460, 540];

  const tableHeader = headers
    .map(
      (h, i) =>
        `<text x="${colX[i]}" y="${tableY + 16}" fill="#aaa" font-size="12" font-weight="bold">${h}</text>`,
    )
    .join("\n");

  const tableRows = tierStats
    .map((s, i) => {
      const ry = tableY + 28 + i * rowH;
      const pct = s.n ? `${((s.correct / s.n) * 100).toFixed(0)}%` : "-";
      const vals = [
        s.tier.toUpperCase(),
        s.n,
        s.correct,
        pct,
        `${s.avg}s`,
        `${s.min}s`,
        `${s.max}s`,
      ];
      const bg =
        i % 2 === 0
          ? `<rect x="20" y="${ry - 14}" width="600" height="${rowH}" fill="#1a1a1a" rx="2"/>`
          : "";
      const cells = vals
        .map(
          (v, j) =>
            `<text x="${colX[j]}" y="${ry}" fill="#ccc" font-size="12">${v}</text>`,
        )
        .join("\n");
      return `${bg}\n${cells}`;
    })
    .join("\n");

  const totalRow = (() => {
    const ry = tableY + 28 + tierStats.length * rowH + 4;
    const pct = `${((totalCorrect / total) * 100).toFixed(0)}%`;
    const vals = ["TOTAL", total, totalCorrect, pct, `${avgS}s`, "", ""];
    return (
      `<line x1="20" x2="620" y1="${ry - 18}" y2="${ry - 18}" stroke="#555"/>` +
      vals
        .map(
          (v, j) =>
            `<text x="${colX[j]}" y="${ry}" fill="#fff" font-size="12" font-weight="bold">${v}</text>`,
        )
        .join("\n")
    );
  })();

  const totalH = H + 60 + (tierStats.length + 2) * rowH;

  return `<svg xmlns="http:
  <rect width="${W}" height="${totalH}" fill="#111" rx="8"/>
  <text x="${W / 2}" y="32" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">Claude Code Retrieval Benchmark</text>
  <text x="${W / 2}" y="50" text-anchor="middle" fill="#888" font-size="12">${totalCorrect}/${total} correct (${((totalCorrect / total) * 100).toFixed(0)}%) — avg ${avgS}s/query</text>
  ${gridLines}
  <line x1="${PAD.l}" x2="${PAD.l}" y1="${PAD.t}" y2="${PAD.t + plotH}" stroke="#555"/>
  <line x1="${PAD.l}" x2="${W - PAD.r}" y1="${PAD.t + plotH}" y2="${PAD.t + plotH}" stroke="#555"/>
  ${dots}
  ${legend}
  ${tableHeader}
  ${tableRows}
  ${totalRow}
</svg>`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let difficulty: string | null = null;
  let ids: number[] | null = null;
  let model: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--difficulty") difficulty = args[++i];
    else if (args[i] === "--ids") ids = args[++i].split(",").map(Number);
    else if (args[i] === "--model") model = args[++i];
  }

  let entries = [...TEST_MANIFEST];
  if (difficulty) entries = entries.filter((e) => e.difficulty === difficulty);
  if (ids) entries = entries.filter((e) => ids!.includes(e.id));
  return { entries, model };
}

const { entries, model } = parseArgs();

console.log(`\n  Claude Code Retrieval Benchmark`);
console.log(`  ${entries.length} cases${model ? `, model: ${model}` : ""}\n`);

const results: Result[] = [];

for (const entry of entries) {
  const tag = `[${String(entry.id).padStart(2)}] ${entry.testId}`;
  process.stdout.write(`  ${tag.padEnd(35)} `);

  try {
    const { out, ms } = run(prompt(entry), model);
    const { filePath, confidence } = parse(out);
    const correct = filePath
      ? normalize(filePath) === normalize(entry.filePath)
      : false;

    results.push({
      id: entry.id,
      testId: entry.testId,
      difficulty: entry.difficulty,
      expected: entry.filePath,
      actual: filePath,
      correct,
      wallMs: Math.round(ms),
      confidence,
    });

    const sym = correct ? "✓" : filePath ? "✗" : "⊘";
    console.log(
      `${sym} ${(ms / 1000).toFixed(1).padStart(5)}s  ${(filePath ?? "—").padEnd(45)} expected: ${entry.filePath}`,
    );
  } catch (e: any) {
    results.push({
      id: entry.id,
      testId: entry.testId,
      difficulty: entry.difficulty,
      expected: entry.filePath,
      actual: null,
      correct: false,
      wallMs: 0,
      confidence: null,
      error: e.message?.slice(0, 100),
    });
    console.log(`ERR ${e.message?.slice(0, 80)}`);
  }
}

const total = results.length;
const correct = results.filter((r) => r.correct).length;
const avgS = (results.reduce((s, r) => s + r.wallMs, 0) / total / 1000).toFixed(
  1,
);

console.log(`\n  ${"━".repeat(80)}`);
console.log(
  `  ${correct}/${total} correct (${((correct / total) * 100).toFixed(0)}%) — avg ${avgS}s/query\n`,
);

const jsonPath = `${CWD}/e2e/retrieval-results.json`;
const svgPath = `${CWD}/e2e/retrieval-results.svg`;

writeFileSync(jsonPath, JSON.stringify(results, null, 2));
writeFileSync(svgPath, generateChart(results));

console.log(`  ${jsonPath}`);
console.log(`  ${svgPath}\n`);

process.exit(correct === total ? 0 : 1);
