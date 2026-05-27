import { execFileSync, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIXTURES_ROOT = join(PACKAGE_ROOT, "__fixtures__");
const PLUGIN_DIST = join(PACKAGE_ROOT, "dist", "index.js");
const requireFromHere = createRequire(import.meta.url);
const OXLINT_BIN = join(dirname(requireFromHere.resolve("oxlint/package.json")), "bin", "oxlint");

interface OxlintRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const runOxlintAgainst = (fixtureFileName: string, oxlintConfig: object): OxlintRunResult => {
  const sandboxRoot = mkdtempSync(join(tmpdir(), "oxlint-plugin-solid-test-"));
  try {
    const configPath = join(sandboxRoot, ".oxlintrc.json");
    writeFileSync(configPath, JSON.stringify(oxlintConfig, null, 2));
    const fixturePath = join(FIXTURES_ROOT, fixtureFileName);
    try {
      const stdout = execFileSync(OXLINT_BIN, ["-c", configPath, fixturePath], {
        encoding: "utf8",
        stdio: "pipe",
      });
      return { stdout, stderr: "", exitCode: 0 };
    } catch (error) {
      const failed = error as NodeJS.ErrnoException & {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        status?: number;
      };
      return {
        stdout: failed.stdout?.toString() ?? "",
        stderr: failed.stderr?.toString() ?? "",
        exitCode: failed.status ?? 1,
      };
    }
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true });
  }
};

const baseConfigWithSolidRule = (rule: string, options?: unknown): object => ({
  plugins: ["typescript"],
  jsPlugins: [{ name: "solid", specifier: PLUGIN_DIST }],
  rules: {
    [rule]: options === undefined ? "error" : ["error", options],
  },
});

beforeAll(() => {
  execSync("pnpm build", { cwd: PACKAGE_ROOT, stdio: "ignore" });
});

afterAll(() => {});

describe("@react-grab/oxlint-plugin-solid integration", () => {
  it("plugin loads and exposes the recommended ruleset", async () => {
    const plugin = (await import(PLUGIN_DIST)).default;
    expect(plugin.meta?.name).toBe("oxlint-plugin-solidjs");
    expect(Object.keys(plugin.rules ?? {}).sort()).toMatchInlineSnapshot(`
      [
        "components-return-once",
        "event-handlers",
        "imports",
        "jsx-no-duplicate-props",
        "jsx-no-script-url",
        "jsx-no-undef",
        "jsx-uses-vars",
        "no-array-handlers",
        "no-destructure",
        "no-innerhtml",
        "no-proxy-apis",
        "no-react-deps",
        "no-react-specific-props",
        "no-unknown-namespaces",
        "prefer-classlist",
        "prefer-for",
        "prefer-show",
        "reactivity",
        "self-closing-comp",
        "style-prop",
      ]
    `);
    expect(plugin.configs?.recommended).toBeDefined();
  });

  it("solid/reactivity flags native event handlers wired through props", () => {
    const result = runOxlintAgainst(
      "reactivity-native-handler-prop.tsx",
      baseConfigWithSolidRule("solid/reactivity"),
    );
    const combinedOutput = result.stdout + result.stderr;
    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("solid(reactivity)");
    expect(combinedOutput).toContain("props.onClick");
  });

  it("solid/no-destructure flags destructured component props", () => {
    const result = runOxlintAgainst(
      "no-destructure-props.tsx",
      baseConfigWithSolidRule("solid/no-destructure"),
    );
    const combinedOutput = result.stdout + result.stderr;
    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("solid(no-destructure)");
  });

  it("solid/prefer-for flags .map() inside JSX", () => {
    const result = runOxlintAgainst(
      "prefer-for-map.tsx",
      baseConfigWithSolidRule("solid/prefer-for"),
    );
    const combinedOutput = result.stdout + result.stderr;
    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("solid(prefer-for)");
  });

  it("solid/no-react-specific-props flags className on DOM elements", () => {
    const result = runOxlintAgainst(
      "no-react-specific-props.tsx",
      baseConfigWithSolidRule("solid/no-react-specific-props"),
    );
    const combinedOutput = result.stdout + result.stderr;
    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("solid(no-react-specific-props)");
  });

  it("solid/no-innerhtml flags innerHTML on JSX", () => {
    const result = runOxlintAgainst(
      "no-innerhtml.tsx",
      baseConfigWithSolidRule("solid/no-innerhtml"),
    );
    const combinedOutput = result.stdout + result.stderr;
    expect(result.exitCode).toBe(1);
    expect(combinedOutput).toContain("solid(no-innerhtml)");
  });

  it("clean fixture using <For>, stable handlers, and solid-js types produces no diagnostics", () => {
    const recommendedRules: Record<string, "error" | "warn" | "off"> = {
      "solid/reactivity": "error",
      "solid/no-destructure": "error",
      "solid/prefer-for": "error",
      "solid/no-react-specific-props": "error",
      "solid/no-innerhtml": "error",
      "solid/jsx-no-duplicate-props": "error",
      "solid/components-return-once": "error",
    };
    const result = runOxlintAgainst("clean.tsx", {
      plugins: ["typescript"],
      jsPlugins: [{ name: "solid", specifier: PLUGIN_DIST }],
      rules: recommendedRules,
    });
    const combinedOutput = result.stdout + result.stderr;
    expect(combinedOutput).toContain("Found 0 warnings and 0 errors");
    expect(result.exitCode).toBe(0);
  });
});
