import { test, expect } from "./fixtures";
import { TEST_MANIFEST, TestEntry } from "../test-manifest";

const NEEDS_INTERACTION: Record<
  string,
  (page: import("@playwright/test").Page) => Promise<void>
> = {
  "radix-dropdown-item": async (page) => {
    await page.evaluate(() => {
      const trigger = document.querySelector(
        '[data-testid="radix-dropdown-trigger"]',
      ) as HTMLElement;
      if (trigger) {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
        trigger.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      }
    });
    await page.waitForTimeout(500);
  },
  "radix-accordion-content": async (page) => {
    await page.evaluate(() => {
      const trigger = document.querySelector(
        '[data-testid="radix-accordion-trigger"]',
      ) as HTMLElement;
      trigger?.click();
    });
    await page.waitForTimeout(500);
  },
  "radix-popover-content": async (page) => {
    await page.evaluate(() => {
      const trigger = document.querySelector(
        '[data-testid="radix-popover-trigger"]',
      ) as HTMLElement;
      if (trigger) {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
          }),
        );
        trigger.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      }
    });
    await page.waitForTimeout(500);
  },
  "portal-motion-modal": async (page) => {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.textContent?.trim() === "Open Motion Modal") {
          btn.click();
          break;
        }
      }
    });
    await page.waitForTimeout(800);
  },
  "button-in-dialog-in-motion": async (page) => {
    await page.evaluate(() => {
      const trigger = document.querySelector(
        '[data-testid="nested-dialog-trigger"]',
      ) as HTMLElement;
      trigger?.click();
    });
    await page.waitForTimeout(500);
  },
  "recursive-menu-deepest": async (page) => {
    for (let round = 0; round < 10; round++) {
      const expanded = await page.evaluate(() => {
        const container = document.querySelector(
          '[data-testid="recursive-menu"]',
        );
        if (!container) return false;
        const collapsed = container.querySelectorAll("button");
        let clicked = false;
        collapsed.forEach((btn) => {
          if (btn.textContent?.includes("▶")) {
            btn.dispatchEvent(
              new MouseEvent("click", { bubbles: true, cancelable: true }),
            );
            clicked = true;
          }
        });
        return clicked;
      });
      if (!expanded) break;
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(300);
  },
  "shadcn-skeleton": async (page) => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const api = (window as any).__REACT_GRAB__;
        return api && typeof api.copyElement === "function";
      },
      { timeout: 10_000 },
    );
  },
};

function normalizeFilePath(filePath: string): string {
  const match = filePath.match(/components\/.*|app\/.*/);
  return match ? match[0] : filePath;
}

const byDifficulty = (difficulty: TestEntry["difficulty"]) =>
  TEST_MANIFEST.filter((entry) => entry.difficulty === difficulty);

test.describe("Easy — baseline components", () => {
  for (const entry of byDifficulty("easy")) {
    test(`[${entry.id}] ${entry.testId}: ${entry.description}`, async ({
      grab,
    }) => {
      if (NEEDS_INTERACTION[entry.testId]) {
        await NEEDS_INTERACTION[entry.testId](grab.page);
      }

      const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
      await expect(el).toBeVisible({ timeout: 10_000 });

      const result = await grab.grabByTestId(entry.testId);

      expect(result.clipboard).toBeTruthy();
      expect(result.clipboard.length).toBeGreaterThan(0);

      expect(result.source).not.toBeNull();
      if (result.source) {
        expect(result.source.filePath).toMatch(/\.tsx$/);
      }

      expect(result.displayName).toBeTruthy();
    });
  }
});

test.describe("Medium — HOCs, portals, compound components", () => {
  for (const entry of byDifficulty("medium")) {
    test(`[${entry.id}] ${entry.testId}: ${entry.description}`, async ({
      grab,
    }) => {
      if (NEEDS_INTERACTION[entry.testId]) {
        await NEEDS_INTERACTION[entry.testId](grab.page);
      }

      const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
      await expect(el).toBeVisible({ timeout: 10_000 });

      const result = await grab.grabByTestId(entry.testId);

      expect(result.clipboard).toBeTruthy();
      expect(result.clipboard.length).toBeGreaterThan(0);

      if (result.source) {
        expect(result.source.filePath).toMatch(/\.tsx$/);
      }

      if (result.displayName) {
        expect(result.displayName.length).toBeGreaterThan(0);
      }
    });
  }
});

test.describe("Hard — recursive, mixed styling, deep nesting", () => {
  for (const entry of byDifficulty("hard")) {
    test(`[${entry.id}] ${entry.testId}: ${entry.description}`, async ({
      grab,
    }) => {
      if (NEEDS_INTERACTION[entry.testId]) {
        await NEEDS_INTERACTION[entry.testId](grab.page);
      }

      const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
      await expect(el).toBeVisible({ timeout: 10_000 });

      const result = await grab.grabByTestId(entry.testId);

      expect(result.clipboard).toBeTruthy();
      expect(result.clipboard.length).toBeGreaterThan(0);

      expect(result.source).not.toBeNull();
      if (result.source) {
        expect(result.source.filePath).toMatch(/\.tsx$/);
      }

      expect(result.displayName).toBeTruthy();
    });
  }
});

test.describe("Nightmare — extreme nesting, portals, dynamic trees", () => {
  for (const entry of byDifficulty("nightmare")) {
    test(`[${entry.id}] ${entry.testId}: ${entry.description}`, async ({
      grab,
    }) => {
      if (NEEDS_INTERACTION[entry.testId]) {
        await NEEDS_INTERACTION[entry.testId](grab.page);
      }

      const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
      await expect(el).toBeVisible({ timeout: 15_000 });

      const result = await grab.grabByTestId(entry.testId);

      expect(result.clipboard).toBeTruthy();
      expect(result.clipboard.length).toBeGreaterThan(0);

      if (result.source) {
        expect(result.source.filePath).toBeTruthy();
        expect(result.source.filePath).toMatch(/\.tsx$/);
      }

      if (result.displayName) {
        expect(result.displayName.length).toBeGreaterThan(0);
      }
    });
  }
});

test.describe("Clipboard format validation", () => {
  const sampleEntries = [TEST_MANIFEST[0], TEST_MANIFEST[6], TEST_MANIFEST[12]];

  for (const entry of sampleEntries) {
    test(`[${entry.id}] clipboard format for ${entry.testId}`, async ({
      grab,
    }) => {
      const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
      await expect(el).toBeVisible({ timeout: 10_000 });

      const result = await grab.grabByTestId(entry.testId);

      expect(result.clipboard).toMatch(/^@/);
      expect(result.clipboard).toContain("\n");
      expect(result.clipboard).toMatch(/<\w+/);
    });
  }
});

test.describe("UI-driven grab (hover + click)", () => {
  const uiTestEntries = [TEST_MANIFEST[0], TEST_MANIFEST[6], TEST_MANIFEST[10]];

  for (const entry of uiTestEntries) {
    test(`[${entry.id}] hover+click grab for ${entry.testId}`, async ({
      grab,
    }) => {
      const result = await grab.hoverAndGrab(entry.testId);

      if (result.clipboard) {
        expect(result.clipboard.length).toBeGreaterThan(0);
      }

      if (result.source) {
        expect(result.source.filePath).toMatch(/\.tsx$/);
      }
    });
  }
});

test.describe("Scoring summary", () => {
  test.setTimeout(300_000);

  test("run all entries and report score", async ({ grab }) => {
    interface EntryResult {
      id: number;
      testId: string;
      difficulty: string;
      expected: string;
      actualSource: string | null;
      actualName: string | null;
      sourceResolved: boolean;
      correctFile: boolean;
      hasDisplayName: boolean;
      hasClipboard: boolean;
      agentationSource: string | null;
      error?: string;
    }

    const results: EntryResult[] = [];

    for (const entry of TEST_MANIFEST) {
      try {
        if (NEEDS_INTERACTION[entry.testId]) {
          await NEEDS_INTERACTION[entry.testId](grab.page);
        }

        const el = grab.page.locator(`[data-testid="${entry.testId}"]`).first();
        const isVisible = await el.isVisible().catch(() => false);

        if (!isVisible) {
          results.push({
            id: entry.id,
            testId: entry.testId,
            difficulty: entry.difficulty,
            expected: entry.filePath,
            actualSource: null,
            actualName: null,
            sourceResolved: false,
            correctFile: false,
            hasDisplayName: false,
            hasClipboard: false,
            agentationSource: null,
            error: "element not visible",
          });
          continue;
        }

        const result = await grab.grabByTestId(entry.testId);

        const agentationSource = await grab.page.evaluate((tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el) return null;
          try {
            const bench = (window as any).__BENCH__;
            if (!bench) return null;
            const loc = bench.utils.getSourceLocation(el as HTMLElement);
            return loc?.found ? (loc.source?.fileName ?? null) : null;
          } catch {
            return null;
          }
        }, entry.testId);

        const sourceResolved = result.source !== null;
        const actualPath = sourceResolved
          ? normalizeFilePath(result.source!.filePath)
          : null;
        const correctFile = actualPath
          ? actualPath.includes(entry.filePath.split("/").slice(1).join("/"))
          : false;
        const hasDisplayName =
          result.displayName !== null && result.displayName.length > 0;
        const hasClipboard =
          result.clipboard !== null && result.clipboard.length > 0;

        results.push({
          id: entry.id,
          testId: entry.testId,
          difficulty: entry.difficulty,
          expected: entry.filePath,
          actualSource: actualPath,
          actualName: result.displayName,
          sourceResolved,
          correctFile,
          hasDisplayName,
          hasClipboard,
          agentationSource,
        });
      } catch (e) {
        results.push({
          id: entry.id,
          testId: entry.testId,
          difficulty: entry.difficulty,
          expected: entry.filePath,
          actualSource: null,
          actualName: null,
          sourceResolved: false,
          correctFile: false,
          hasDisplayName: false,
          hasClipboard: false,
          agentationSource: null,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const difficulties = ["easy", "medium", "hard", "nightmare"] as const;
    console.log("\n========== REACT-GRAB BENCHMARK RESULTS ==========\n");

    let totalResolved = 0;
    let totalCorrect = 0;
    let totalEntries = 0;

    for (const diff of difficulties) {
      const tier = results.filter((r) => r.difficulty === diff);
      const resolved = tier.filter((r) => r.sourceResolved).length;
      const correct = tier.filter((r) => r.correctFile).length;
      const withName = tier.filter((r) => r.hasDisplayName).length;
      const withClip = tier.filter((r) => r.hasClipboard).length;

      console.log(`${diff.toUpperCase()} (${tier.length} cases):`);
      console.log(`  Source resolved: ${resolved}/${tier.length}`);
      console.log(`  Correct file:   ${correct}/${tier.length}`);
      console.log(`  Display name:   ${withName}/${tier.length}`);
      console.log(`  Clipboard:      ${withClip}/${tier.length}`);

      for (const r of tier) {
        const status = r.correctFile ? "✓" : r.sourceResolved ? "~" : "✗";
        const line = `    ${status} [${r.id}] ${r.testId}`;
        if (r.error) {
          console.log(`${line}: ERROR ${r.error}`);
        } else if (!r.sourceResolved) {
          console.log(`${line}: no source (expected ${r.expected})`);
        } else if (!r.correctFile) {
          console.log(
            `${line}: WRONG FILE\n        expected: ${r.expected}\n        actual:   ${r.actualSource}`,
          );
        } else {
          console.log(`${line}: ${r.actualName ?? "?"} → ${r.actualSource}`);
        }
      }
      console.log();

      totalResolved += resolved;
      totalCorrect += correct;
      totalEntries += tier.length;
    }

    console.log(`TOTAL: ${totalResolved}/${totalEntries} sources resolved`);
    console.log(`TOTAL: ${totalCorrect}/${totalEntries} correct file paths`);
    console.log(
      `ACCURACY: ${((totalCorrect / totalEntries) * 100).toFixed(1)}%`,
    );
    console.log("\n===================================================\n");

    expect(true).toBe(true);
  });
});
