import { describe, expect, it } from "vitest";
import {
  NEXT_APP_ROUTER_SCRIPT,
  NEXT_APP_ROUTER_SCRIPT_WITH_AGENT,
  VITE_IMPORT,
  VITE_IMPORT_WITH_AGENT,
  WEBPACK_IMPORT,
  WEBPACK_IMPORT_WITH_AGENT,
} from "../src/utils/templates.js";

describe("Next.js App Router templates", () => {
  it("should generate basic script without agent", () => {
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("react-grab");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("process.env.NODE_ENV");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("development");
    expect(NEXT_APP_ROUTER_SCRIPT).toContain("beforeInteractive");
  });

  it("should return basic script for any agent (providers deprecated)", () => {
    const script = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT("mcp");

    expect(script).toContain("react-grab");
    expect(script).not.toContain("@react-grab/");
  });

  it("should return basic script when agent is none", () => {
    const script = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT("none");

    expect(script).toContain("react-grab");
    expect(script).not.toContain("@react-grab/");
  });
});

describe("Vite templates", () => {
  it("should generate basic import without agent", () => {
    expect(VITE_IMPORT).toContain('import("react-grab")');
    expect(VITE_IMPORT).toContain("import.meta.env.DEV");
  });

  it("should return basic import for any agent (providers deprecated)", () => {
    const importBlock = VITE_IMPORT_WITH_AGENT("mcp");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).not.toContain("@react-grab/");
  });

  it("should return basic import when agent is none", () => {
    const importBlock = VITE_IMPORT_WITH_AGENT("none");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).not.toContain("@react-grab/");
  });
});

describe("Webpack templates", () => {
  it("should generate basic import without agent", () => {
    expect(WEBPACK_IMPORT).toContain('import("react-grab")');
    expect(WEBPACK_IMPORT).toContain("process.env.NODE_ENV");
    expect(WEBPACK_IMPORT).toContain("development");
  });

  it("should return basic import for any agent (providers deprecated)", () => {
    const importBlock = WEBPACK_IMPORT_WITH_AGENT("mcp");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).not.toContain("@react-grab/");
  });

  it("should return basic import when agent is none", () => {
    const importBlock = WEBPACK_IMPORT_WITH_AGENT("none");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).not.toContain("@react-grab/");
  });
});
