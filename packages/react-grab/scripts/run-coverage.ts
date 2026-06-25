import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanRawCoverage, generateCoverageReport } from "@react-grab/playwright-coverage";
import {
  COVERAGE_OUTPUT_DIR,
  COVERAGE_RAW_DIR,
  isReactGrabSource,
  REPO_ROOT,
} from "../e2e/coverage-config.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolve(SCRIPT_DIR, "..");

// Extra args (specs, --project, --grep, ...) are forwarded to `playwright test`.
const extraArgs = process.argv.slice(2);

const run = async (): Promise<void> => {
  cleanRawCoverage(COVERAGE_RAW_DIR);

  // COVERAGE=1 both activates the per-test coverage fixture and switches the
  // Playwright webServer to a sourcemapped, unminified `build:coverage`.
  const result = spawnSync("pnpm", ["exec", "playwright", "test", ...extraArgs], {
    cwd: PACKAGE_DIR,
    stdio: "inherit",
    env: { ...process.env, COVERAGE: "1" },
  });

  if (result.status !== 0) {
    console.warn(
      `\nPlaywright exited with code ${result.status ?? "null"}; reporting coverage from tests that did run.`,
    );
  }

  const summary = await generateCoverageReport({
    rawDir: COVERAGE_RAW_DIR,
    outputDir: COVERAGE_OUTPUT_DIR,
    baseDir: REPO_ROOT,
    name: "react-grab coverage",
    sourceFilter: isReactGrabSource,
  });
  if (!summary) {
    console.warn("No V8 coverage captured (Chromium-only; check that tests ran and drove a page).");
    process.exit(result.status ?? 0);
  }

  const pct = summary.pctLines.toFixed(2);
  console.log(
    `\nreact-grab line coverage: ${pct}% (${summary.coveredLines}/${summary.totalLines} lines across ${summary.fileCount} files)`,
  );
  console.log(`Reports written to ${relative(process.cwd(), COVERAGE_OUTPUT_DIR) || COVERAGE_OUTPUT_DIR}`);

  process.exit(result.status ?? 0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
