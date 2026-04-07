import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIRECTORY = path.resolve(DIRECTORY, "..");

const runInNode = (code: string): string =>
  execSync(`node -e "${code}"`, {
    cwd: PACKAGE_DIRECTORY,
    encoding: "utf-8",
  }).trim();

test.describe("SSR Compatibility", () => {
  test.describe("CJS imports", () => {
    test("importing react-grab should not throw", () => {
      expect(runInNode("require('./dist/index.cjs'); console.log('OK')")).toBe("OK");
    });

    test("importing react-grab/core should not throw", () => {
      expect(runInNode("require('./dist/core/index.cjs'); console.log('OK')")).toBe("OK");
    });

    test("importing react-grab/primitives should not throw", () => {
      expect(runInNode("require('./dist/primitives.cjs'); console.log('OK')")).toBe("OK");
    });
  });

  test.describe("ESM imports", () => {
    test("importing react-grab should not throw", () => {
      const entryUrl = pathToFileURL(path.resolve(PACKAGE_DIRECTORY, "dist/index.js")).href;
      expect(
        runInNode(
          `import('${entryUrl}').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })`,
        ),
      ).toBe("OK");
    });

    test("importing react-grab/core should not throw", () => {
      const entryUrl = pathToFileURL(path.resolve(PACKAGE_DIRECTORY, "dist/core/index.js")).href;
      expect(
        runInNode(
          `import('${entryUrl}').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })`,
        ),
      ).toBe("OK");
    });

    test("importing react-grab/primitives should not throw", () => {
      const entryUrl = pathToFileURL(path.resolve(PACKAGE_DIRECTORY, "dist/primitives.js")).href;
      expect(
        runInNode(
          `import('${entryUrl}').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })`,
        ),
      ).toBe("OK");
    });
  });

  test.describe("Global API in Node.js", () => {
    test("getGlobalApi() should return null", () => {
      expect(
        runInNode(
          "const m = require('./dist/index.cjs'); console.log(m.getGlobalApi() === null ? 'NULL' : 'NOT_NULL')",
        ),
      ).toBe("NULL");
    });

    test("setGlobalApi() and getGlobalApi() should round-trip", () => {
      const code = [
        "const m = require('./dist/index.cjs');",
        "const { init } = require('./dist/core/index.cjs');",
        "const api = init();",
        "m.setGlobalApi(api);",
        "const retrieved = m.getGlobalApi();",
        "console.log(retrieved === api ? 'MATCH' : 'MISMATCH');",
      ].join(" ");
      expect(runInNode(code)).toBe("MATCH");
    });

    test("registerPlugin() should not throw in Node.js", () => {
      const code = [
        "const m = require('./dist/index.cjs');",
        "m.registerPlugin({ name: 'test-plugin', setup: () => ({}) });",
        "console.log('OK');",
      ].join(" ");
      expect(runInNode(code)).toBe("OK");
    });

    test("unregisterPlugin() should not throw in Node.js", () => {
      const code = [
        "const m = require('./dist/index.cjs');",
        "m.unregisterPlugin('nonexistent');",
        "console.log('OK');",
      ].join(" ");
      expect(runInNode(code)).toBe("OK");
    });
  });

  test.describe("Noop API", () => {
    test("init() should return noop API in Node.js", () => {
      const code = [
        "const { init } = require('./dist/core/index.cjs');",
        "const api = init();",
        "console.log(typeof api.activate === 'function' ? 'NOOP_API' : 'UNEXPECTED');",
      ].join(" ");
      expect(runInNode(code)).toBe("NOOP_API");
    });

    test("all noop API methods should be callable without crashing", () => {
      const code = [
        "const { init } = require('./dist/core/index.cjs');",
        "const api = init();",
        "api.activate();",
        "api.deactivate();",
        "api.toggle();",
        "api.comment();",
        "api.isActive();",
        "api.isEnabled();",
        "api.setEnabled();",
        "api.getToolbarState();",
        "api.setToolbarState();",
        "api.onToolbarStateChange();",
        "api.dispose();",
        "api.setOptions();",
        "api.registerPlugin();",
        "api.unregisterPlugin();",
        "api.getPlugins();",
        "api.getDisplayName();",
        "api.getState();",
        "console.log('ALL_OK');",
      ].join(" ");
      expect(runInNode(code)).toBe("ALL_OK");
    });

    test("noop API async methods should resolve without crashing", () => {
      const code = [
        "const { init } = require('./dist/core/index.cjs');",
        "const api = init();",
        "Promise.all([",
        "  api.copyElement(),",
        "  api.getSource(),",
        "  api.getStackContext(),",
        "]).then(() => console.log('ALL_RESOLVED'))",
        ".catch(e => { console.error(e); process.exit(1); });",
      ].join(" ");
      expect(runInNode(code)).toBe("ALL_RESOLVED");
    });

    test("noop API getState() should return correct structure", () => {
      const code = [
        "const { init } = require('./dist/core/index.cjs');",
        "const api = init();",
        "const state = api.getState();",
        "const checks = [",
        "  state.isActive === false,",
        "  state.isDragging === false,",
        "  state.isCopying === false,",
        "  state.isPromptMode === false,",
        "  state.targetElement === null,",
        "  state.dragBounds === null,",
        "  Array.isArray(state.grabbedBoxes),",
        "  Array.isArray(state.labelInstances),",
        "].every(Boolean);",
        "console.log(checks ? 'VALID' : 'INVALID');",
      ].join(" ");
      expect(runInNode(code)).toBe("VALID");
    });

    test("calling init() multiple times should not crash", () => {
      const code = [
        "const { init } = require('./dist/core/index.cjs');",
        "const api1 = init();",
        "const api2 = init();",
        "const api3 = init();",
        "console.log([api1, api2, api3].every(a => typeof a.activate === 'function') ? 'OK' : 'FAIL');",
      ].join(" ");
      expect(runInNode(code)).toBe("OK");
    });
  });
});
