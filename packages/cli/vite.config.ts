import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

// Inline the canonical skill markdown into the bundle. The same file is also
// surfaced at the repo's top-level `skills/react-grab/SKILL.md` (via symlink)
// so it stays GitHub-visible and never drifts from what the CLI installs.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_TEMPLATE_MD = fs.readFileSync(path.join(HERE, "src/utils/skill-template.md"), "utf8");

const sharedDefine = {
  __REACT_GRAB_SKILL_TEMPLATE__: JSON.stringify(SKILL_TEMPLATE_MD),
};

export default defineConfig({
  pack: {
    entry: ["src/cli.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: false,
    platform: "node",
    fixedExtension: false,
    banner: "#!/usr/bin/env node",
    define: {
      "process.env.VERSION": JSON.stringify(process.env.VERSION ?? packageJson.version),
      ...sharedDefine,
    },
    deps: {
      alwaysBundle: [/^zod/],
    },
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 10000,
  },
  define: sharedDefine,
});
