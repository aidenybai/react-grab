import { spawnSync } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const STUB_PATH = path.resolve(__dirname, "..", "dist", "cli.cjs");

describe("@react-grab/mcp deprecation stub", () => {
  it("exits with code 1 and prints a migration message to stderr", () => {
    if (!existsSync(STUB_PATH)) {
      // The stub is built by `vp pack`. CI runs `pnpm build` before `pnpm test`
      // (per turbo.json `test: { dependsOn: ["build"] }`), so this should be
      // populated. Skip cleanly if a developer ran tests without building.
      return;
    }

    const result = spawnSync(process.execPath, [STUB_PATH], {
      encoding: "utf8",
      timeout: 5000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("@react-grab/mcp is deprecated");
    expect(result.stderr).toContain("install-skill");
  });
});
