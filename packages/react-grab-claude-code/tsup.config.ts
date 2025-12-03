/**
 * CLAUDE CODE SDK BUNDLING & PATCHING
 *
 * This config bundles the Claude Code SDK (ai-sdk-provider-claude-code) as noExternal
 * and applies runtime patches to fix path resolution issues.
 *
 * WHY WE NEED PATCHES:
 *
 * When the Claude Code SDK (@anthropic-ai/claude-agent-sdk) is bundled with tsup,
 * it has path resolution issues because:
 *
 * 1. The SDK tries to locate its CLI executable relative to __filename/__dirname
 * 2. After bundling, __filename points to our dist/index.cjs instead of the SDK's location
 * 3. It looks for dist/cli.js which doesn't exist
 * 4. It also does fs.existsSync() checks that fail for PATH-based commands like "claude"
 *
 * WHAT THE PATCHES DO:
 *
 * Patch 1: Default to system "claude" command
 * - Original: Tries to resolve cli.js relative to bundle location
 * - Patched: Defaults to "claude" (system PATH command)
 *
 * Patch 2: Skip fs.existsSync() for PATH commands
 * - Original: Checks if file exists at "claude" path (fails)
 * - Patched: Detects command names (no / or \) vs file paths, skips check for commands
 * - Allows Node's spawn() to find "claude" via system PATH
 *
 * This lets us bundle the SDK while still using the globally installed claude CLI.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "tsup";

const applyClaudePatches = async (outputFile: string) => {
  if (!fs.existsSync(outputFile)) {
    console.error("Output file not found:", outputFile);
    return;
  }

  let content = fs.readFileSync(outputFile, "utf8");
  let patchCount = 0;

  // PATCH 1: Replace broken __dirname-based path resolution with system "claude" default
  const patched1 = content.replace(
    /let pathToClaudeCodeExecutable = rest\.pathToClaudeCodeExecutable;\s*if \(!pathToClaudeCodeExecutable\) \{[\s\S]*?pathToClaudeCodeExecutable = [^;]+;[\s\S]*?\}/,
    `let pathToClaudeCodeExecutable = rest.pathToClaudeCodeExecutable || "claude";`,
  );

  if (content !== patched1) {
    content = patched1;
    patchCount++;
  }

  // PATCH 2: Skip fs.existsSync() check for PATH-based commands (no path separators)
  const patched2 = content.replace(
    /if \(!fs2\.existsSync\(pathToClaudeCodeExecutable\)\) \{[\s\S]*?throw new ReferenceError\(errorMessage\);[\s\S]*?\}/,
    `const isPathCommand = !pathToClaudeCodeExecutable.includes('/') && !pathToClaudeCodeExecutable.includes('\\\\');
      if (!isPathCommand && !fs2.existsSync(pathToClaudeCodeExecutable)) {
        const errorMessage = isNativeBinary(pathToClaudeCodeExecutable) ? \`Claude Code native binary not found at \${pathToClaudeCodeExecutable}. Please ensure Claude Code is installed via native installer or specify a valid path with options.pathToClaudeCodeExecutable.\` : \`Claude Code executable not found at \${pathToClaudeCodeExecutable}. Is options.pathToClaudeCodeExecutable set?\`;
        throw new ReferenceError(errorMessage);
      }`,
  );

  if (content !== patched2) {
    content = patched2;
    patchCount++;
  }

  if (patchCount === 0) {
    console.warn(
      "⚠ Claude Code patches not applied - bundle may have changed",
    );
  } else {
    await fsp.writeFile(outputFile, content);
    console.log(
      `✓ Applied ${patchCount} Claude Code patches for PATH command support`,
    );
  }
};

export default defineConfig([
  {
    entry: {
      server: "./src/server.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    noExternal: [/.*/],
    onSuccess: async () => {
      await applyClaudePatches(path.join(__dirname, "dist", "server.cjs"));
      await applyClaudePatches(path.join(__dirname, "dist", "server.js"));
    },
  },
  {
    entry: {
      client: "./src/client.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: false,
    target: "esnext",
    platform: "browser",
    treeshake: true,
  },
]);
