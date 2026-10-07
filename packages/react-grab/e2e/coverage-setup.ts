import { cleanRawCoverage } from "@react-grab/playwright-coverage";
import { COVERAGE_RAW_DIR } from "./coverage-config.js";

// Playwright globalSetup (only wired under COVERAGE): clear stale per-test V8
// dumps once before the suite so the merged report reflects just this run.
const globalSetup = async (): Promise<void> => {
  cleanRawCoverage(COVERAGE_RAW_DIR);
};

export default globalSetup;
