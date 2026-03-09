import { test as base, expect, type Page } from "@playwright/test";
import { exec } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { TEST_MANIFEST, type TestEntry } from "../test-manifest";

const INCLUDE_CLI = Boolean(process.env.BENCH_CLAUDE);
const CLI_MODEL = process.env.BENCH_MODEL ?? "claude-sonnet-4-6";
const CLI_TIMEOUT_MS = 180_000;
const CWD = join(__dirname, "..");
const CHECKPOINT_PATH = join(__dirname, "..", "e2e", "bench-checkpoint.json");
const BENCH_RESUME = Boolean(process.env.BENCH_RESUME);

interface ElementContext {
  componentName: string | null;
  elementPath: string | null;
  classes: string | null;
  nearbyText: string | null;
  sourceLoc: {
    fileName: string | null;
    componentName: string | null;
    found: boolean;
  } | null;
  reactGrab: {
    filePath: string | null;
    componentName: string | null;
    displayName: string | null;
    stackContext: string | null;
  } | null;
  reactGrabClipboard: string | null;
  agentationClipboard: string | null;
}

interface CliResolver {
  name: string;
  buildPrompt: (entry: TestEntry, ctx: ElementContext) => string;
}

const USER_PROMPT = (entry: TestEntry): string =>
  `I need to find the source file for a React component in this Next.js app. ${entry.description}. Where is it defined?`;

const CLI_RESOLVERS: CliResolver[] = [
  {
    name: "baseline",
    buildPrompt: (entry) => `${entry.lazyDescription}`,
  },
  {
    name: "claude-code",
    buildPrompt: (entry) => USER_PROMPT(entry),
  },
  {
    name: "agentation+claude",
    buildPrompt: (entry, ctx) => {
      if (!ctx.agentationClipboard) return USER_PROMPT(entry);
      return `${USER_PROMPT(entry)}\n\n${ctx.agentationClipboard}`;
    },
  },
  {
    name: "react-grab+claude",
    buildPrompt: (entry, ctx) => {
      if (!ctx.reactGrabClipboard) return USER_PROMPT(entry);
      return `${USER_PROMPT(entry)}\n\n${ctx.reactGrabClipboard}`;
    },
  },
];

const SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    filePath: {
      type: "string",
      description: "Relative path e.g. components/styled/styled-card.tsx",
    },
    componentName: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["filePath", "componentName", "confidence"],
});

const CLI_FLAGS = [
  `-p`,
  `--output-format json`,
  `--no-session-persistence`,
  `--disallowed-tools "Edit,Write,NotebookEdit,Bash"`,
  `--json-schema '${SCHEMA}'`,
  `--max-budget-usd 0.50`,
  CLI_MODEL ? `--model ${CLI_MODEL}` : "",
]
  .filter(Boolean)
  .join(" ");

const MAX_RETRIES = 1;

const runCliOnce = (
  prompt: string,
): Promise<{
  filePath: string | null;
  componentName: string | null;
  ms: number;
}> =>
  new Promise((resolve) => {
    const start = performance.now();
    const child = exec(
      `claude ${CLI_FLAGS} -- ${JSON.stringify(prompt)}`,
      {
        cwd: CWD,
        encoding: "utf-8",
        timeout: CLI_TIMEOUT_MS,
        env: { ...process.env, FORCE_COLOR: "0", CLAUDECODE: "" },
      },
      (error, stdout) => {
        const elapsedMs = performance.now() - start;
        if (error || !stdout) {
          resolve({ filePath: null, componentName: null, ms: elapsedMs });
          return;
        }
        try {
          const structured = JSON.parse(stdout).structured_output ?? {};
          resolve({
            filePath: structured.filePath ?? null,
            componentName: structured.componentName ?? null,
            ms: elapsedMs,
          });
        } catch {
          resolve({ filePath: null, componentName: null, ms: elapsedMs });
        }
      },
    );
    // HACK: exec() leaves stdin open, causing `claude -p` to hang waiting for EOF
    child.stdin?.end();
  });

const runCli = async (
  prompt: string,
): Promise<{
  filePath: string | null;
  componentName: string | null;
  ms: number;
}> => {
  const result = await runCliOnce(prompt);
  if (result.filePath) return result;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    const retryPrompt = `${prompt}\n\nIMPORTANT: You didn't find the file yet. Keep searching — read more files, try different directory patterns. The file definitely exists in this codebase.`;
    const retryResult = await runCliOnce(retryPrompt);
    if (retryResult.filePath) {
      return { ...retryResult, ms: result.ms + retryResult.ms };
    }
  }
  return result;
};

const pool = async <T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < tasks.length) {
      const taskIndex = nextIndex++;
      results[taskIndex] = await tasks[taskIndex]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()),
  );
  return results;
};

const CLI_CONCURRENCY = parseInt(process.env.BENCH_CONCURRENCY ?? "10", 10);

const collectElementContext = async (
  page: Page,
  testId: string,
): Promise<ElementContext> => {
  return page.evaluate(async (tid: string) => {
    const el = document.querySelector(
      `[data-testid="${tid}"]`,
    ) as HTMLElement | null;
    const empty: ElementContext = {
      componentName: null,
      elementPath: null,
      classes: null,
      nearbyText: null,
      sourceLoc: null,
      reactGrab: null,
      reactGrabClipboard: null,
      agentationClipboard: null,
    };
    if (!el) return empty;
    const b = (window as any).__BENCH__;
    if (!b?.utils) return empty;
    const id = b.utils.identifyElement(el);
    const loc = b.utils.getSourceLocation(el);

    let reactGrab: ElementContext["reactGrab"] = null;
    let reactGrabClipboard: string | null = null;
    const rg = (window as any).__REACT_GRAB__;
    if (rg) {
      const src = await rg.getSource(el);
      const displayName = rg.getDisplayName(el);
      const stackContext = await rg.getStackContext(el);
      reactGrab = {
        filePath: src?.filePath ?? null,
        componentName: src?.componentName ?? null,
        displayName: displayName ?? null,
        stackContext: stackContext ?? null,
      };
      const genSnippet = (window as any).__REACT_GRAB_GENERATE_SNIPPET__;
      if (genSnippet) {
        const snippets: string[] = await genSnippet([el]);
        const snippet = snippets[0] ?? "";
        if (snippet) {
          const name = displayName ?? el.localName;
          reactGrabClipboard = `@<${name}>\n\n${snippet}\n`;
        }
      }
    }

    const elementPath = b.utils.getElementPath(el) ?? null;
    const classes = b.utils.getElementClasses(el) ?? null;
    const nearbyText = b.utils.getNearbyText(el) ?? null;
    const componentName = id?.name ?? null;
    const sourceFile = loc?.source?.fileName ?? null;
    const reactComponents = componentName ?? null;
    const rect = el.getBoundingClientRect();

    const agentationLines: string[] = [];
    agentationLines.push(`### 1. ${el.localName}`);
    if (elementPath) agentationLines.push(`**Location:** ${elementPath}`);
    if (sourceFile) agentationLines.push(`**Source:** ${sourceFile}`);
    if (reactComponents) agentationLines.push(`**React:** ${reactComponents}`);
    if (classes) agentationLines.push(`**Classes:** ${classes}`);
    agentationLines.push(
      `**Position:** ${Math.round(rect.x)}px, ${Math.round(rect.y)}px (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
    );
    const selectedText = el.innerText?.trim().slice(0, 100) ?? "";
    if (selectedText)
      agentationLines.push(`**Selected text:** "${selectedText}"`);
    const agentationClipboard = agentationLines.join("\n");

    return {
      componentName,
      elementPath,
      classes,
      nearbyText,
      sourceLoc: loc
        ? {
            fileName: loc.source?.fileName ?? null,
            componentName: loc.source?.componentName ?? null,
            found: loc.found,
          }
        : null,
      reactGrab,
      reactGrabClipboard,
      agentationClipboard,
    };
  }, testId);
};

const EMPTY_ELEMENT_CONTEXT: ElementContext = {
  componentName: null,
  elementPath: null,
  classes: null,
  nearbyText: null,
  sourceLoc: null,
  reactGrab: null,
  reactGrabClipboard: null,
  agentationClipboard: null,
};

const test = base.extend<{ page: Page }>({
  page: async ({ page, context }, use) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/", { waitUntil: "load" });
    await page.waitForFunction(
      () => {
        const b = (window as any).__BENCH__;
        return b && typeof b.resolveAll === "function" && b.list().length >= 2;
      },
      { timeout: 15_000 },
    );
    await page.waitForTimeout(1000);
    await use(page);
  },
});

const NEEDS_INTERACTION: Record<string, (page: Page) => Promise<void>> = {
  "radix-dropdown-item": async (page) => {
    await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="radix-dropdown-trigger"]',
      ) as HTMLElement;
      if (!t) return;
      t.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      t.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(500);
  },
  "radix-accordion-content": async (page) => {
    await page.evaluate(() =>
      (
        document.querySelector(
          '[data-testid="radix-accordion-trigger"]',
        ) as HTMLElement
      )?.click(),
    );
    await page.waitForTimeout(500);
  },
  "radix-popover-content": async (page) => {
    await page.evaluate(() => {
      const t = document.querySelector(
        '[data-testid="radix-popover-trigger"]',
      ) as HTMLElement;
      if (!t) return;
      t.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
      t.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(500);
  },
  "portal-motion-modal": async (page) => {
    await page.evaluate(() => {
      for (const btn of document.querySelectorAll("button")) {
        if (btn.textContent?.trim() === "Open Motion Modal") {
          btn.click();
          break;
        }
      }
    });
    await page.waitForTimeout(800);
  },
  "button-in-dialog-in-motion": async (page) => {
    await page.evaluate(() =>
      (
        document.querySelector(
          '[data-testid="nested-dialog-trigger"]',
        ) as HTMLElement
      )?.click(),
    );
    await page.waitForTimeout(500);
  },
  "recursive-menu-deepest": async (page) => {
    for (let i = 0; i < 10; i++) {
      const clicked = await page.evaluate(() => {
        let any = false;
        document
          .querySelector('[data-testid="recursive-menu"]')
          ?.querySelectorAll("button")
          .forEach((b) => {
            if (b.textContent?.includes("▶")) {
              b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
              any = true;
            }
          });
        return any;
      });
      if (!clicked) break;
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(300);
  },
  "shadcn-skeleton": async (page) => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (window as any).__BENCH__?.resolveAll, {
      timeout: 10_000,
    });
  },
};

const normalizeFilePath = (filePath: string): string =>
  filePath.match(/components\/.*|app\/.*/)?.[0] ?? filePath;

const isCorrectFile = (actual: string | null, expected: string): boolean => {
  if (!actual) return false;
  const suffix = expected.split("/").slice(1).join("/");
  return normalizeFilePath(actual).includes(suffix);
};

const formatTime = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms.toFixed(0)}ms`;

interface BrowserCollected {
  entry: TestEntry;
  browserResults: Record<
    string,
    {
      filePath: string | null;
      componentName: string | null;
      found: boolean;
      ms: number;
    }
  >;
  elementCtx: ElementContext;
  error?: string;
}

interface CliTask {
  entryIndex: number;
  resolverName: string;
  prompt: string;
}

interface ResolverResult {
  filePath: string | null;
  componentName: string | null;
  found: boolean;
  ms: number;
  correct: boolean;
}

interface EntryResult {
  id: number;
  testId: string;
  difficulty: string;
  expected: string;
  resolvers: Record<string, ResolverResult>;
  error?: string;
}

interface Checkpoint {
  browserCollected: BrowserCollected[];
  cliCompleted: Record<
    string,
    { filePath: string | null; componentName: string | null; ms: number }
  >;
}

const saveCheckpoint = (checkpoint: Checkpoint): void => {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint));
};

const loadCheckpoint = (): Checkpoint | null => {
  if (!BENCH_RESUME || !existsSync(CHECKPOINT_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf-8"));
  } catch {
    return null;
  }
};

const TIERS = ["easy", "medium", "hard", "nightmare"] as const;
const TIER_COLORS: Record<string, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#f97316",
  nightmare: "#ef4444",
};
const RESOLVER_COLORS = [
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#f87171",
  "#38bdf8",
];

const computeStats = (results: EntryResult[], resolverNames: string[]) =>
  resolverNames.map((name, resolverIndex) => {
    const color = RESOLVER_COLORS[resolverIndex % RESOLVER_COLORS.length];
    const allResults = results
      .map((entry) => entry.resolvers[name])
      .filter(Boolean);
    const correctResults = allResults.filter(
      (resolverResult) => resolverResult.correct,
    );
    const tierBreakdown = TIERS.map((tier) => {
      const tierEntries = results.filter((entry) => entry.difficulty === tier);
      const tierResults = tierEntries
        .map((entry) => entry.resolvers[name])
        .filter(Boolean);
      const tierCorrect = tierResults.filter(
        (resolverResult) => resolverResult.correct,
      );
      return {
        tier,
        count: tierEntries.length,
        resolved: tierResults.filter((resolverResult) => resolverResult.found)
          .length,
        correct: tierCorrect.length,
        avgMs: tierCorrect.length
          ? tierCorrect.reduce(
              (sum, resolverResult) => sum + resolverResult.ms,
              0,
            ) / tierCorrect.length
          : null,
      };
    });
    return {
      name,
      color,
      resolved: allResults.filter((resolverResult) => resolverResult.found)
        .length,
      correct: correctResults.length,
      total: results.length,
      avgMs: correctResults.length
        ? correctResults.reduce(
            (sum, resolverResult) => sum + resolverResult.ms,
            0,
          ) / correctResults.length
        : null,
      tierBreakdown,
    };
  });

const FONT = `font-family="'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"`;

const generateSummaryChart = (
  results: EntryResult[],
  resolverNames: string[],
): string => {
  const stats = computeStats(results, resolverNames)
    .slice()
    .sort((a, b) => b.correct / b.total - a.correct / a.total);

  const W = 720,
    PAD = 32;
  const BAR_H = 36,
    BAR_GAP = 12,
    BAR_X = 200,
    BAR_MAX_W = W - BAR_X - PAD - 60;
  const SECTION_GAP = 36;

  // --- Header ---
  const headerH = 70;

  // --- Horizontal bars section ---
  const barsStartY = headerH;
  const barsH = stats.length * (BAR_H + BAR_GAP) - BAR_GAP;
  const maxPct = Math.max(...stats.map((s) => s.correct / s.total), 0.01);

  const bars = stats
    .map((stat, i) => {
      const y = barsStartY + i * (BAR_H + BAR_GAP);
      const pct = stat.correct / stat.total;
      const barW = (pct / maxPct) * BAR_MAX_W;
      const pctStr = `${(pct * 100).toFixed(0)}%`;
      const avgStr = stat.avgMs !== null ? formatTime(stat.avgMs) : "";
      const detailStr = `${stat.correct}/${stat.total}${avgStr ? ` · ${avgStr}` : ""}`;

      return `<text x="${BAR_X - 12}" y="${y + BAR_H / 2 + 5}" text-anchor="end" fill="${stat.color}" font-size="13" font-weight="600" ${FONT}>${stat.name}</text>
    <rect x="${BAR_X}" y="${y}" width="${barW}" height="${BAR_H}" fill="${stat.color}" rx="6" opacity="0.2"/>
    <rect x="${BAR_X}" y="${y}" width="${barW}" height="${BAR_H}" fill="url(#bar-${i})" rx="6"/>
    <text x="${BAR_X + barW + 8}" y="${y + BAR_H / 2 + 5}" fill="#fff" font-size="15" font-weight="700" ${FONT}>${pctStr}</text>
    <text x="${BAR_X + 10}" y="${y + BAR_H / 2 + 4}" fill="rgba(255,255,255,0.85)" font-size="11" ${FONT}>${detailStr}</text>`;
    })
    .join("\n");

  const gradients = stats
    .map(
      (stat, i) =>
        `<linearGradient id="bar-${i}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${stat.color}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${stat.color}" stop-opacity="0.5"/>
    </linearGradient>`,
    )
    .join("\n");

  // --- Tier breakdown heatmap ---
  const heatStartY = barsStartY + barsH + SECTION_GAP;
  const CELL_W = 100,
    CELL_H = 32,
    CELL_GAP = 4;
  const LABEL_W = 200;
  const heatHeaderH = 28;

  const tierHeaders = TIERS.map((tier, ti) => {
    const x = LABEL_W + ti * (CELL_W + CELL_GAP);
    const count = results.filter((e) => e.difficulty === tier).length;
    return `<text x="${x + CELL_W / 2}" y="${heatStartY + 16}" text-anchor="middle" fill="${TIER_COLORS[tier]}" font-size="11" font-weight="600" ${FONT}>${tier.toUpperCase()} (${count})</text>`;
  }).join("\n");

  const heatRows = stats
    .map((stat, si) => {
      const y = heatStartY + heatHeaderH + si * (CELL_H + CELL_GAP);
      const label = `<text x="${LABEL_W - 12}" y="${y + CELL_H / 2 + 4}" text-anchor="end" fill="${stat.color}" font-size="12" font-weight="500" ${FONT}>${stat.name}</text>`;
      const cells = stat.tierBreakdown
        .map((bd, ti) => {
          const x = LABEL_W + ti * (CELL_W + CELL_GAP);
          const pct = bd.count ? bd.correct / bd.count : 0;
          const pctStr = bd.count ? `${(pct * 100).toFixed(0)}%` : "\u2014";
          const detail = bd.count ? `${bd.correct}/${bd.count}` : "";
          const opacity = 0.15 + pct * 0.65;
          const textColor = pct >= 0.9 ? "#fff" : pct >= 0.7 ? "#ddd" : "#aaa";
          return `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${stat.color}" opacity="${opacity.toFixed(2)}" rx="6"/>
        <text x="${x + CELL_W / 2}" y="${y + CELL_H / 2 + 1}" text-anchor="middle" fill="${textColor}" font-size="13" font-weight="700" ${FONT}>${pctStr}</text>
        <text x="${x + CELL_W / 2}" y="${y + CELL_H / 2 + 13}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="9" ${FONT}>${detail}</text>`;
        })
        .join("\n");
      return `${label}\n${cells}`;
    })
    .join("\n");

  const heatH = heatHeaderH + stats.length * (CELL_H + CELL_GAP);

  // --- Footer ---
  const totalH = heatStartY + heatH + 32;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}">
  <defs>${gradients}</defs>
  <rect width="${W}" height="${totalH}" fill="#0d1117" rx="12"/>
  <text x="${PAD}" y="32" fill="#fff" font-size="18" font-weight="700" ${FONT}>Source Resolution Benchmark</text>
  <text x="${PAD}" y="52" fill="#8b949e" font-size="12" ${FONT}>${results.length} test cases \u00b7 ${TIERS.length} difficulty tiers \u00b7 ${resolverNames.length} resolvers</text>
  <line x1="${PAD}" x2="${W - PAD}" y1="64" y2="64" stroke="#21262d"/>
  ${bars}
  <line x1="${PAD}" x2="${W - PAD}" y1="${heatStartY - 12}" y2="${heatStartY - 12}" stroke="#21262d"/>
  ${tierHeaders}
  ${heatRows}
</svg>`;
};

const generateDetailChart = (
  results: EntryResult[],
  resolverNames: string[],
): string => {
  const W = 900,
    PAD = 32;
  const ROW_H = 22,
    ENTRY_GAP = 8;
  const HEADER_H = 60;
  const resolverColorMap: Record<string, string> = {};
  const sortedStats = computeStats(results, resolverNames)
    .slice()
    .sort((a, b) => b.correct / b.total - a.correct / a.total);
  sortedStats.forEach((s) => {
    resolverColorMap[s.name] = s.color;
  });

  let y = HEADER_H;
  let currentTier = "";

  const entries = results
    .map((entry) => {
      const parts: string[] = [];

      // Tier separator
      if (entry.difficulty !== currentTier) {
        currentTier = entry.difficulty;
        const tierCount = results.filter(
          (e) => e.difficulty === currentTier,
        ).length;
        if (y > HEADER_H) y += 12;
        parts.push(
          `<line x1="${PAD}" x2="${W - PAD}" y1="${y}" y2="${y}" stroke="#21262d"/>`,
        );
        y += 20;
        parts.push(
          `<text x="${PAD}" y="${y}" fill="${TIER_COLORS[currentTier]}" font-size="12" font-weight="700" ${FONT}>${currentTier.toUpperCase()} (${tierCount} cases)</text>`,
        );
        y += 12;
      }

      // Entry header
      const entryY = y;
      const allCorrect = resolverNames.every(
        (n) => entry.resolvers[n]?.correct,
      );
      const allWrong = resolverNames.every((n) => !entry.resolvers[n]?.correct);
      const headerColor = allCorrect
        ? "#3fb950"
        : allWrong
          ? "#f85149"
          : "#c9d1d9";
      parts.push(
        `<circle cx="${PAD + 5}" cy="${y + 6}" r="4" fill="${TIER_COLORS[entry.difficulty]}"/>`,
      );
      parts.push(
        `<text x="${PAD + 16}" y="${y + 10}" fill="${headerColor}" font-size="11" font-weight="600" ${FONT}>#${entry.id} ${entry.testId}</text>`,
      );
      parts.push(
        `<text x="${W - PAD}" y="${y + 10}" text-anchor="end" fill="#484f58" font-size="10" ${FONT}>${entry.expected}</text>`,
      );
      y += ROW_H;

      // Resolver results
      for (const name of resolverNames) {
        const res = entry.resolvers[name];
        const color = resolverColorMap[name] || "#8b949e";
        if (!res?.found && !res?.filePath) {
          parts.push(
            `<text x="${PAD + 24}" y="${y + 10}" fill="#484f58" font-size="10" ${FONT}>\u2717 ${name}</text>`,
          );
          parts.push(
            `<text x="320" y="${y + 10}" fill="#484f58" font-size="10" ${FONT}>(no result)</text>`,
          );
        } else {
          const icon = res.correct ? "\u2713" : "\u2717";
          const iconColor = res.correct ? "#3fb950" : "#f85149";
          const pathColor = res.correct ? "#8b949e" : "#484f58";
          const normalizedPath = res.filePath
            ? normalizeFilePath(res.filePath)
            : "(null)";
          const timeStr = formatTime(res.ms);
          parts.push(
            `<text x="${PAD + 24}" y="${y + 10}" fill="${iconColor}" font-size="10" font-weight="600" ${FONT}>${icon}</text>`,
          );
          parts.push(
            `<text x="${PAD + 38}" y="${y + 10}" fill="${color}" font-size="10" font-weight="500" ${FONT}>${name}</text>`,
          );
          parts.push(
            `<text x="240" y="${y + 10}" fill="${pathColor}" font-size="10" ${FONT}>${normalizedPath}</text>`,
          );
          if (!res.correct && res.found) {
            parts.push(
              `<text x="580" y="${y + 10}" fill="#f85149" font-size="9" font-weight="600" ${FONT}>WRONG</text>`,
            );
          }
          parts.push(
            `<text x="${W - PAD}" y="${y + 10}" text-anchor="end" fill="#484f58" font-size="9" ${FONT}>${timeStr}</text>`,
          );
        }
        y += ROW_H - 4;
      }
      y += ENTRY_GAP;

      // Subtle background for alternating entries
      const entryH = y - entryY - ENTRY_GAP;
      const bgIdx = results.indexOf(entry);
      const bg =
        bgIdx % 2 === 0
          ? `<rect x="0" y="${entryY - 4}" width="${W}" height="${entryH + 4}" fill="#161b22" rx="0"/>`
          : "";

      return bg + parts.join("\n");
    })
    .join("\n");

  const totalH = y + PAD;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" fill="#0d1117" rx="12"/>
  <text x="${PAD}" y="28" fill="#fff" font-size="16" font-weight="700" ${FONT}>Per-Case Results</text>
  <text x="${PAD}" y="46" fill="#8b949e" font-size="11" ${FONT}>${results.length} cases \u00b7 ${resolverNames.length} resolvers \u00b7 \u2713 correct \u2717 wrong</text>
  ${entries}
</svg>`;
};

test.describe("Unified benchmark \u2014 all resolvers", () => {
  test.setTimeout(INCLUDE_CLI ? 3_600_000 : 300_000);

  test("compare all resolvers across full manifest", async ({ page }) => {
    await page.waitForFunction(
      () => (window as any).__REACT_GRAB__?.getSource,
      { timeout: 15_000 },
    );

    const browserResolvers: string[] = await page.evaluate(() =>
      (window as any).__BENCH__.list(),
    );
    const cliResolverNames = INCLUDE_CLI
      ? CLI_RESOLVERS.map((resolver) => resolver.name)
      : [];
    const allResolvers = [...browserResolvers, ...cliResolverNames];

    console.log(
      `\n  Resolvers: ${allResolvers.join(", ")}${CLI_MODEL ? ` (model: ${CLI_MODEL})` : ""}`,
    );
    console.log(`  Entries:   ${TEST_MANIFEST.length}\n`);

    const checkpoint = loadCheckpoint();
    let collected: BrowserCollected[];
    const cliCompleted: Record<
      string,
      { filePath: string | null; componentName: string | null; ms: number }
    > = checkpoint?.cliCompleted ?? {};

    if (checkpoint?.browserCollected?.length === TEST_MANIFEST.length) {
      collected = checkpoint.browserCollected;
      console.log(
        `  Resumed browser phase from checkpoint (${collected.length} entries)`,
      );
    } else {
      collected = [];
      for (const entry of TEST_MANIFEST) {
        try {
          if (NEEDS_INTERACTION[entry.testId])
            await NEEDS_INTERACTION[entry.testId](page);

          const visible = await page
            .locator(`[data-testid="${entry.testId}"]`)
            .first()
            .isVisible()
            .catch(() => false);
          if (!visible) {
            collected.push({
              entry,
              browserResults: {},
              elementCtx: EMPTY_ELEMENT_CONTEXT,
              error: "not visible",
            });
            continue;
          }

          const browserResults = (await page.evaluate(
            async (tid: string) => (window as any).__BENCH__.resolveAll(tid),
            entry.testId,
          )) as Record<
            string,
            {
              filePath: string | null;
              componentName: string | null;
              found: boolean;
              ms: number;
            }
          >;

          const elementCtx = INCLUDE_CLI
            ? await collectElementContext(page, entry.testId)
            : EMPTY_ELEMENT_CONTEXT;

          collected.push({ entry, browserResults, elementCtx });
        } catch (e) {
          collected.push({
            entry,
            browserResults: {},
            elementCtx: EMPTY_ELEMENT_CONTEXT,
            error: String(e),
          });
        }
      }
      saveCheckpoint({ browserCollected: collected, cliCompleted });
      console.log(
        `  Browser phase done (${collected.length} entries collected)`,
      );
    }

    const cliTasks: CliTask[] = [];
    if (INCLUDE_CLI) {
      for (
        let collectedIndex = 0;
        collectedIndex < collected.length;
        collectedIndex++
      ) {
        const { entry, elementCtx, error } = collected[collectedIndex];
        if (error) continue;
        for (const cliResolver of CLI_RESOLVERS) {
          const taskKey = `${entry.id}:${cliResolver.name}`;
          if (cliCompleted[taskKey]) continue;
          cliTasks.push({
            entryIndex: collectedIndex,
            resolverName: cliResolver.name,
            prompt: cliResolver.buildPrompt(entry, elementCtx),
          });
        }
      }

      const skippedCount = Object.keys(cliCompleted).length;
      if (skippedCount > 0)
        console.log(`  Resumed ${skippedCount} CLI tasks from checkpoint`);
      console.log(
        `  Running ${cliTasks.length} CLI tasks (concurrency: ${CLI_CONCURRENCY})...\n`,
      );

      const cliResults = await pool(
        cliTasks.map(
          (task) => () =>
            runCli(task.prompt).then((result) => {
              const taskKey = `${collected[task.entryIndex].entry.id}:${task.resolverName}`;
              cliCompleted[taskKey] = result;
              saveCheckpoint({ browserCollected: collected, cliCompleted });
              return result;
            }),
        ),
        CLI_CONCURRENCY,
      );

      for (let taskIndex = 0; taskIndex < cliTasks.length; taskIndex++) {
        const task = cliTasks[taskIndex];
        const cliResult = cliResults[taskIndex];
        if (!collected[task.entryIndex].browserResults[task.resolverName]) {
          collected[task.entryIndex].browserResults[task.resolverName] = {
            filePath: cliResult.filePath,
            componentName: cliResult.componentName,
            found: Boolean(cliResult.filePath),
            ms: cliResult.ms,
          };
        }
      }

      for (const [taskKey, result] of Object.entries(cliCompleted)) {
        const [idStr, resolverName] = taskKey.split(":");
        const collectedIndex = collected.findIndex(
          (c) => c.entry.id === parseInt(idStr, 10),
        );
        if (
          collectedIndex >= 0 &&
          !collected[collectedIndex].browserResults[resolverName]
        ) {
          collected[collectedIndex].browserResults[resolverName] = {
            filePath: result.filePath,
            componentName: result.componentName,
            found: Boolean(result.filePath),
            ms: result.ms,
          };
        }
      }
    }

    const results: EntryResult[] = [];

    for (const { entry, browserResults, elementCtx, error } of collected) {
      const resolvers: Record<string, ResolverResult> = {};
      const columns: string[] = [];

      if (error) {
        for (const resolverName of allResolvers)
          resolvers[resolverName] = {
            filePath: null,
            componentName: null,
            found: false,
            ms: 0,
            correct: false,
          };
        results.push({
          id: entry.id,
          testId: entry.testId,
          difficulty: entry.difficulty,
          expected: entry.filePath,
          resolvers,
          error,
        });
        continue;
      }

      for (const name of allResolvers) {
        const resolverResult = browserResults[name];
        if (!resolverResult) {
          resolvers[name] = {
            filePath: null,
            componentName: null,
            found: false,
            ms: 0,
            correct: false,
          };
          columns.push(`${name}: \u2014`);
          continue;
        }
        const isCorrect = isCorrectFile(
          resolverResult.filePath,
          entry.filePath,
        );
        resolvers[name] = { ...resolverResult, correct: isCorrect };
        const symbol = isCorrect
          ? "\u2713"
          : resolverResult.found
            ? "~"
            : "\u2717";
        columns.push(`${name}: ${symbol} ${formatTime(resolverResult.ms)}`);
      }

      results.push({
        id: entry.id,
        testId: entry.testId,
        difficulty: entry.difficulty,
        expected: entry.filePath,
        resolvers,
      });

      console.log(
        `  [${String(entry.id).padStart(2)}] ${entry.testId.padEnd(28)} ${columns.join("  |  ")}`,
      );
      console.log(`        expected: ${entry.filePath}`);
      for (const name of allResolvers) {
        const resolverResult = resolvers[name];
        if (resolverResult?.filePath) {
          console.log(
            `        ${name.padEnd(22)} ${normalizeFilePath(resolverResult.filePath)}${resolverResult.correct ? "" : " \u2190 WRONG"}`,
          );
        } else {
          console.log(`        ${name.padEnd(22)} (no result)`);
        }
      }
    }

    console.log(`\n  ${"━".repeat(80)}`);
    for (const name of allResolvers) {
      const correctEntries = results.filter(
        (entry) => entry.resolvers[name]?.correct,
      );
      const avgTiming =
        correctEntries.length > 0
          ? formatTime(
              correctEntries.reduce(
                (sum, entry) => sum + entry.resolvers[name].ms,
                0,
              ) / correctEntries.length,
            )
          : "\u2014";
      console.log(
        `  ${name.padEnd(22)} ${correctEntries.length}/${results.length} correct (${((correctEntries.length / results.length) * 100).toFixed(0)}%) \u2014 avg ${avgTiming}`,
      );
    }
    console.log();

    const outputDir = join(__dirname, "..");
    const paths = {
      json: join(outputDir, "e2e/bench-results.json"),
      svg: join(outputDir, "e2e/bench-results.svg"),
      detail: join(outputDir, "e2e/bench-detail.svg"),
    };
    writeFileSync(
      paths.json,
      JSON.stringify({ resolverNames: allResolvers, results }, null, 2),
    );
    const cliOnlyResolvers = allResolvers.filter(
      (name) => !["react-grab", "agentation", "baseline"].includes(name),
    );
    const chartResolvers =
      cliOnlyResolvers.length > 0 ? cliOnlyResolvers : allResolvers;
    writeFileSync(paths.svg, generateSummaryChart(results, chartResolvers));
    writeFileSync(paths.detail, generateDetailChart(results, chartResolvers));
    for (const filePath of Object.values(paths)) console.log(`  ${filePath}`);

    // Generate website data.json for the benchmarks page
    const TIER_LABELS: Record<string, string> = {
      easy: "plain components",
      medium: "HOCs, portals, compound",
      hard: "nested HOCs + Radix + Motion",
      nightmare: "recursive trees, triple portals, factories",
    };
    const websiteResolvers = chartResolvers.map((name) => ({
      key: name,
      label:
        name === "claude-code"
          ? "Claude Code (no tool)"
          : name === "react-grab+claude"
            ? "React Grab + Claude Code"
            : name === "agentation+claude"
              ? "Agentation + Claude Code"
              : name,
    }));
    const websiteScenarios = [
      { label: "overall", tier: null, cases: results.length },
      ...TIERS.map((tier) => ({
        label: TIER_LABELS[tier] ?? tier,
        tier,
        cases: results.filter((e) => e.difficulty === tier).length,
      })),
    ]
      .filter((s) => s.tier === null || s.cases > 0)
      .map((s) => {
        const entries =
          s.tier === null
            ? results
            : results.filter((e) => e.difficulty === s.tier);
        const scenarioResults: Record<
          string,
          { speed: number; accuracy: number; correct: number }
        > = {};
        for (const name of chartResolvers) {
          const all = entries.map((e) => e.resolvers[name]).filter(Boolean);
          const correct = all.filter((r) => r.correct);
          const avgMs = correct.length
            ? correct.reduce((sum, r) => sum + r.ms, 0) / correct.length
            : all.length
              ? all.reduce((sum, r) => sum + r.ms, 0) / all.length
              : 0;
          scenarioResults[name] = {
            speed: Math.round(avgMs / 100) / 10,
            accuracy: entries.length
              ? Math.round((correct.length / entries.length) * 100)
              : 0,
            correct: correct.length,
          };
        }
        return { label: s.label, cases: s.cases, results: scenarioResults };
      });
    const websiteTestCases = results.map((entry) => {
      const perResolver: Record<string, { speed: number; correct: boolean }> =
        {};
      for (const name of chartResolvers) {
        const r = entry.resolvers[name];
        perResolver[name] = {
          speed: r ? Math.round(r.ms / 100) / 10 : 0,
          correct: r?.correct ?? false,
        };
      }
      return {
        id: entry.id,
        testId: entry.testId,
        difficulty: entry.difficulty,
        results: perResolver,
      };
    });
    const websiteData = {
      lastBenchmarked: new Date().toISOString().split("T")[0],
      control: "claude-code",
      resolvers: websiteResolvers,
      scenarios: websiteScenarios,
      testCases: websiteTestCases,
    };
    const websiteDataPath = join(
      __dirname,
      "..",
      "..",
      "..",
      "website",
      "app",
      "benchmarks",
      "data.json",
    );
    writeFileSync(websiteDataPath, JSON.stringify(websiteData, null, 2));
    console.log(`  ${websiteDataPath}`);
    console.log();

    expect(
      Math.max(
        ...allResolvers.map(
          (name) =>
            results.filter((entry) => entry.resolvers[name]?.correct).length,
        ),
      ),
    ).toBeGreaterThan(0);
  });
});
