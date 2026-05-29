import { spawn } from "node:child_process";
import { cpSync, rmSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Copies skills/react-grab into the CLI package so the published CLI can install
// it offline (the test/ directory is dev-only and excluded).
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const source = path.join(repoRoot, "skills", "react-grab");
const destination = path.join(here, "..", "skills", "react-grab");

const bundle = () => {
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, {
    recursive: true,
    filter: (entry) => !entry.split(path.sep).includes("test"),
  });
};

bundle();

if (process.argv.includes("--watch")) {
  watch(source, { recursive: true }, () => {
    try {
      bundle();
    } catch (error) {
      console.error("bundle-skill: re-bundle failed", error);
    }
  });
  // Run the package bundler from here (cross-platform) so a single command both
  // re-bundles the skill on change and watches the CLI source.
  const packer = spawn("vp", ["pack", "--watch"], { stdio: "inherit", shell: true });
  packer.on("exit", (code) => process.exit(code ?? 0));
}
