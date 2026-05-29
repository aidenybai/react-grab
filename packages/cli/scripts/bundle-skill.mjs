import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Copies skills/react-grab into the CLI package so the published CLI can install
// it offline (the test/ directory is dev-only and excluded).
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const source = path.join(repoRoot, "skills", "react-grab");
const destination = path.join(here, "..", "skills", "react-grab");

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, {
  recursive: true,
  filter: (entry) => !entry.split(path.sep).includes("test"),
});
