import { relative } from "node:path";
import { generateCoverageReport } from "@react-grab/playwright-coverage";
import {
  COVERAGE_OUTPUT_DIR,
  COVERAGE_RAW_DIR,
  isReactGrabSource,
  REPO_ROOT,
} from "./coverage-config.js";

// Playwright globalTeardown: runs once after the whole suite (even on failures),
// so the report reflects whatever tests actually drove a page. Only wired in
// when COVERAGE is set, so a normal run never touches it.
const globalTeardown = async (): Promise<void> => {
  const summary = await generateCoverageReport({
    rawDir: COVERAGE_RAW_DIR,
    outputDir: COVERAGE_OUTPUT_DIR,
    baseDir: REPO_ROOT,
    name: "react-grab coverage",
    sourceFilter: isReactGrabSource,
  });

  if (!summary) {
    console.warn("No V8 coverage captured (Chromium-only; check that tests ran and drove a page).");
    return;
  }

  console.log(
    `\nreact-grab line coverage: ${summary.pctLines.toFixed(2)}% (${summary.coveredLines}/${summary.totalLines} lines across ${summary.fileCount} files)`,
  );
  console.log(
    `Reports written to ${relative(process.cwd(), COVERAGE_OUTPUT_DIR) || COVERAGE_OUTPUT_DIR}`,
  );
};

export default globalTeardown;
