import { spawn } from "node:child_process";
import { cpSync, mkdirSync, rmSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Copies the skill's runtime files into the CLI package so the published CLI can
// install it offline. Only SKILL.md and scripts/ (the built watch.mjs + the
// native readers) ship — not src/, configs, node_modules, or test/.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const skillRoot = path.join(repoRoot, "skills", "react-grab");
const destination = path.join(here, "..", "skills", "react-grab");
const RUNTIME_ENTRIES = ["SKILL.md", "scripts"];

const bundle = () => {
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  for (const entry of RUNTIME_ENTRIES) {
    cpSync(path.join(skillRoot, entry), path.join(destination, entry), { recursive: true });
  }
};

bundle();

if (process.argv.includes("--watch")) {
  watch(path.join(skillRoot, "scripts"), { recursive: true }, () => {
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
