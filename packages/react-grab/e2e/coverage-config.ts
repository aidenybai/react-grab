import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolve(E2E_DIR, "..");

export const REPO_ROOT = resolve(PACKAGE_DIR, "../..");
export const COVERAGE_OUTPUT_DIR = resolve(PACKAGE_DIR, "coverage");
// Per-test raw V8 dumps land here; each Playwright worker is its own process,
// so we write one file per test and merge them in the report step. Kept OUTSIDE
// COVERAGE_OUTPUT_DIR so monocart's report `clean` doesn't wipe it mid-run.
export const COVERAGE_RAW_DIR = resolve(PACKAGE_DIR, ".coverage-v8");

export const isReactGrabSource = (sourcePath: string): boolean => {
  const normalized = sourcePath.split("\\").join("/");
  if (normalized.includes("/node_modules/")) return false;
  return normalized.includes("react-grab/src/") || normalized.includes("packages/react-grab/src/");
};
