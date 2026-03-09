import { test as base, expect } from "@playwright/test";

function normalizeFilePath(filePath: string | null): string | null {
  if (!filePath) return null;
  const match = filePath.match(/components\/.*|app\/.*/);
  return match ? match[0] : filePath;
}

const BENCH_INIT_TIMEOUT = 15_000;

const test = base.extend<{ page: import("@playwright/test").Page }>({
  page: async ({ page, context }, use) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/", { waitUntil: "load" });
    await page.waitForFunction(
      () => {
        const b = (window as any).__BENCH__;
        return b && typeof b.resolveAll === "function" && b.list().length >= 2;
      },
      { timeout: BENCH_INIT_TIMEOUT },
    );
    await page.waitForTimeout(1000);
    await use(page);
  },
});

test.describe("Bench harness", () => {
  test("__BENCH__ exposes unified API", async ({ page }) => {
    const api = await page.evaluate(() => {
      const b = (window as any).__BENCH__;
      if (!b) return null;
      return {
        resolvers: b.list(),
        hasResolve: typeof b.resolve === "function",
        hasResolveAll: typeof b.resolveAll === "function",
        hasIdentify: typeof b.identify === "function",
        hasRegister: typeof b.register === "function",
        hasUtils: typeof b.utils?.getSourceLocation === "function",
      };
    });

    expect(api).not.toBeNull();
    expect(api!.resolvers).toContain("react-grab");
    expect(api!.resolvers).toContain("agentation");
    expect(api!.hasResolve).toBe(true);
    expect(api!.hasResolveAll).toBe(true);
    expect(api!.hasIdentify).toBe(true);
    expect(api!.hasRegister).toBe(true);
    expect(api!.hasUtils).toBe(true);
  });

  test("custom resolver can be registered", async ({ page }) => {
    const result = await page.evaluate(() => {
      const b = (window as any).__BENCH__;
      b.register({
        name: "test-resolver",
        resolve: () => ({
          filePath: "test.tsx",
          componentName: "Test",
          found: true,
        }),
      });
      const list = b.list();
      b.unregister("test-resolver");
      return { hadIt: list.includes("test-resolver"), afterRemoval: b.list() };
    });

    expect(result.hadIt).toBe(true);
    expect(result.afterRemoval).not.toContain("test-resolver");
  });
});

test.describe("Agentation utilities via __BENCH__.utils", () => {
  test("identifyElement", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-tw-card"]',
      ) as HTMLElement;
      return el ? (window as any).__BENCH__.utils.identifyElement(el) : null;
    });
    expect(result).not.toBeNull();
    expect(result!.name).toBeTruthy();
    console.log(
      `identifyElement: name="${result!.name}" path="${result!.path}"`,
    );
  });

  test("getNearbyText", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-styled-card"]',
      ) as HTMLElement;
      return el ? (window as any).__BENCH__.utils.getNearbyText(el) : null;
    });
    expect(result).toBeTruthy();
    expect(result!.length).toBeGreaterThan(0);
    console.log(`getNearbyText: "${result!.slice(0, 80)}…"`);
  });

  test("getElementPath", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-styled-badge"]',
      ) as HTMLElement;
      return el ? (window as any).__BENCH__.utils.getElementPath(el) : null;
    });
    expect(result).toBeTruthy();
    expect(result).toMatch(/body|div|section|span/i);
    console.log(`getElementPath: "${result}"`);
  });

  test("getElementClasses", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-styled-card"]',
      ) as HTMLElement;
      return el ? (window as any).__BENCH__.utils.getElementClasses(el) : null;
    });
    expect(result).toBeTruthy();
    console.log(`getElementClasses: "${result}"`);
  });
});

test.describe("Source resolution via __BENCH__", () => {
  test("getSourceLocation returns structured result", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-styled-card"]',
      ) as HTMLElement;
      return el ? (window as any).__BENCH__.utils.getSourceLocation(el) : null;
    });
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("found");
    expect(result).toHaveProperty("isReactApp");
    console.log(`getSourceLocation:`, JSON.stringify(result, null, 2));
  });

  test("findNearestComponentSource walks ancestors", async ({ page }) => {
    const result = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="plain-tw-card"]',
      ) as HTMLElement;
      return el
        ? (window as any).__BENCH__.utils.findNearestComponentSource(el)
        : null;
    });
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("found");
    console.log(`findNearestComponentSource:`, JSON.stringify(result, null, 2));
  });
});

test.describe("Head-to-head: all resolvers", () => {
  test.setTimeout(120_000);

  const testCases = [
    {
      testId: "plain-styled-card",
      expected: "components/styled/styled-card.tsx",
    },
    { testId: "plain-tw-card", expected: "components/tailwind/tw-card.tsx" },
    {
      testId: "plain-animated-card",
      expected: "components/motion/animated-card.tsx",
    },
    {
      testId: "plain-inline-card",
      expected: "components/mixed/inline-card.tsx",
    },
    {
      testId: "plain-module-card",
      expected: "components/modules/module-card.tsx",
    },
    {
      testId: "shadcn-profile-card",
      expected: "components/shadcn/shadcn-profile-card.tsx",
    },
    {
      testId: "recursive-tree-leaf",
      expected: "components/recursive/recursive-tree.tsx",
    },
    {
      testId: "hoc-motion-styled-card",
      expected: "components/motion/animated-card.tsx",
    },
    {
      testId: "style-clash-button",
      expected: "components/mixed/style-clash.tsx",
    },
    {
      testId: "gauntlet-button",
      expected: "components/challenge/the-gauntlet.tsx",
    },
    {
      testId: "russian-doll-button",
      expected: "components/challenge/russian-doll.tsx",
    },
    {
      testId: "identity-depth-11",
      expected: "components/challenge/identity-crisis.tsx",
    },
    {
      testId: "shapeshifter",
      expected: "components/challenge/shapeshifter.tsx",
    },
  ];

  test("compare all resolvers across test cases", async ({ page }) => {
    await page.waitForFunction(
      () =>
        (window as any).__REACT_GRAB__ &&
        typeof (window as any).__REACT_GRAB__.getSource === "function",
      { timeout: 15_000 },
    );

    const resolverNames: string[] = await page.evaluate(() =>
      (window as any).__BENCH__.list(),
    );

    const scores: Record<string, { resolved: number; correct: number }> = {};
    for (const name of resolverNames)
      scores[name] = { resolved: 0, correct: 0 };

    console.log(`\n  Resolvers: ${resolverNames.join(", ")}\n`);

    for (const tc of testCases) {
      const results = await page.evaluate(
        async (testId: string) => (window as any).__BENCH__.resolveAll(testId),
        tc.testId,
      );

      const expectedSuffix = tc.expected.split("/").slice(1).join("/");
      const cols: string[] = [];

      for (const name of resolverNames) {
        const r = results[name];
        if (!r) {
          cols.push(`${name}: —`);
          continue;
        }

        const norm = normalizeFilePath(r.filePath);
        const isCorrect = norm?.includes(expectedSuffix) ?? false;

        if (r.found) scores[name].resolved++;
        if (isCorrect) scores[name].correct++;

        const sym = isCorrect ? "✓" : r.found ? "~" : "✗";
        cols.push(`${name}: ${sym} ${(r.ms ?? 0).toFixed(0)}ms`);
      }

      console.log(`  ${tc.testId.padEnd(28)} ${cols.join("  |  ")}`);
    }

    const total = testCases.length;
    console.log();
    for (const name of resolverNames) {
      const s = scores[name];
      console.log(
        `  ${name.padEnd(15)} ${s.resolved}/${total} resolved, ${s.correct}/${total} correct (${((s.correct / total) * 100).toFixed(0)}%)`,
      );
    }
    console.log();

    expect(scores["react-grab"]?.resolved ?? 0).toBeGreaterThan(0);
  });
});
