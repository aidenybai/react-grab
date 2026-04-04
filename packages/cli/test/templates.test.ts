import { describe, expect, it } from "vite-plus/test";
import { NEXT_APP_ROUTER_SCRIPT, VITE_IMPORT, WEBPACK_IMPORT } from "../src/utils/templates.js";

describe("Next.js App Router templates", () => {
  it("should generate basic script without agent", () => {
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("react-grab");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("process.env.NODE_ENV");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("development");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("beforeInteractive");
  });
});

describe("Vite templates", () => {
  it("should generate basic import without agent", () => {
    expect(VITE_IMPORT).toContain('import("react-grab")');
    expect(VITE_IMPORT).toContain("import.meta.env.DEV");
  });
});

describe("Webpack templates", () => {
  it("should generate basic import without agent", () => {
    expect(WEBPACK_IMPORT).toContain('import("react-grab")');
    expect(WEBPACK_IMPORT).toContain("process.env.NODE_ENV");
    expect(WEBPACK_IMPORT).toContain("development");
  });
});
