import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIRECTORY = path.resolve(DIRECTORY, "..");

test.describe("SSR Compatibility", () => {
  test("importing react-grab in Node.js should not throw", () => {
    const result = execSync(`node -e "require('./dist/index.cjs'); console.log('OK')"`, {
      cwd: PACKAGE_DIRECTORY,
      encoding: "utf-8",
    });
    expect(result.trim()).toBe("OK");
  });

  test("importing react-grab/core in Node.js should not throw", () => {
    const result = execSync(`node -e "require('./dist/core/index.cjs'); console.log('OK')"`, {
      cwd: PACKAGE_DIRECTORY,
      encoding: "utf-8",
    });
    expect(result.trim()).toBe("OK");
  });

  test("init() should return a noop API in Node.js", () => {
    const result = execSync(
      `node -e "const m = require('./dist/index.cjs'); const api = m.getGlobalApi(); console.log(api === null ? 'NULL' : 'NOT_NULL')"`,
      { cwd: PACKAGE_DIRECTORY, encoding: "utf-8" },
    );
    expect(result.trim()).toBe("NULL");
  });

  test("init() called explicitly in Node.js should return noop API without crashing", () => {
    const result = execSync(
      `node -e "const { init } = require('./dist/core/index.cjs'); const api = init(); console.log(typeof api.activate === 'function' ? 'NOOP_API' : 'UNEXPECTED')"`,
      { cwd: PACKAGE_DIRECTORY, encoding: "utf-8" },
    );
    expect(result.trim()).toBe("NOOP_API");
  });

  test("ESM import of react-grab in Node.js should not throw", () => {
    const esmEntryUrl = pathToFileURL(path.resolve(PACKAGE_DIRECTORY, "dist/index.js")).href;
    const result = execSync(
      `node -e "import('${esmEntryUrl}').then(() => console.log('OK')).catch(e => { console.error(e); process.exit(1); })"`,
      { cwd: PACKAGE_DIRECTORY, encoding: "utf-8" },
    );
    expect(result.trim()).toBe("OK");
  });
});
