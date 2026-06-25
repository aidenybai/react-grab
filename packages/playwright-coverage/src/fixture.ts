import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

export interface V8CoverageEntry {
  url: string;
  source?: string;
  scriptId?: string;
  functions?: unknown[];
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
 * Per-test V8 capture primitive: start JS coverage, run the test body (`use`),
 * then write the dump to `rawDir`. Compose it into an auto fixture and gate the
 * import on your coverage flag so non-coverage runs never load this module.
 * `page.coverage` only exists on Chromium, so capture self-guards and is
 * entirely best-effort — it must never fail a real test.
 */
export const captureCoverage = async (
  page: Page,
  rawDir: string,
  use: () => Promise<void>,
): Promise<void> => {
  let started = false;
  if (page.coverage) {
    try {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      started = true;
    } catch {
      started = false;
    }
  }

  try {
    await use();
  } finally {
    // finally so a failing test still flushes the coverage it did exercise.
    if (started) {
      try {
        writeRawCoverage(rawDir, await page.coverage.stopJSCoverage());
      } catch {
        // ignore: coverage is best-effort
      }
    }
  }
};
