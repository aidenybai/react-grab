import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlaywrightTestArgs, TestFixture } from "@playwright/test";

export interface V8CoverageEntry {
  url: string;
  source?: string;
  scriptId?: string;
  functions?: unknown[];
}

export interface CoverageFixtureOptions {
  /** Directory where per-test raw V8 dumps are written. */
  rawDir: string;
  /** Defaults to `Boolean(process.env.COVERAGE)`. */
  enabled?: boolean;
}

export const cleanRawCoverage = (rawDir: string): void => {
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });
};

export const writeRawCoverage = (rawDir: string, entries: V8CoverageEntry[]): void => {
  if (!Array.isArray(entries) || entries.length === 0) return;
  try {
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(rawDir, `${randomUUID()}.json`), JSON.stringify(entries));
  } catch {
    // Best-effort: coverage must never fail a real test.
  }
};

/**
 * Build an auto Playwright fixture that captures native V8 JS coverage for every
 * test into `rawDir`. Spread the returned tuple into `test.extend`. `page.coverage`
 * only exists on Chromium, so capture is guarded and entirely best-effort.
 */
export const createCoverageFixture = (
  options: CoverageFixtureOptions,
): [TestFixture<void, PlaywrightTestArgs>, { auto: true }] => {
  const enabled = options.enabled ?? Boolean(process.env.COVERAGE);
  return [
    async ({ page }, use) => {
      let started = false;
      if (enabled && page.coverage) {
        try {
          await page.coverage.startJSCoverage({ resetOnNavigation: false });
          started = true;
        } catch {
          started = false;
        }
      }

      await use();

      if (started) {
        try {
          writeRawCoverage(options.rawDir, await page.coverage.stopJSCoverage());
        } catch {
          // ignore: coverage is best-effort
        }
      }
    },
    { auto: true },
  ];
};
