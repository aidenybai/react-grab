import { describe, expect, it } from "vitest";
import {
  NEXT_APP_ROUTER_SCRIPT,
  NEXT_APP_ROUTER_SCRIPT_WITH_AGENT,
  VITE_SCRIPT,
  VITE_SCRIPT_WITH_AGENT,
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

  it("should generate script with agent", () => {
    const script = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT("cursor");

    expect(script).toContain("react-grab");
    expect(script).toContain("@react-grab/cursor");
    expect(script).toContain("lazyOnload");
  });

  it("should return basic script when agent is none", () => {
    const script = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT("none");

    expect(script).toContain("react-grab");
    expect(script).not.toContain("@react-grab/");
  });

  it("should include all agent types correctly", () => {
    const agents = ["claude-code", "cursor", "opencode", "codex"] as const;

    for (const agent of agents) {
      const script = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT(agent);
      expect(script).toContain(`@react-grab/${agent}`);
    }
  });
});

describe("Vite templates", () => {
  it("should generate basic script without agent", () => {
    expect(VITE_SCRIPT).toContain('import("react-grab")');
    expect(VITE_SCRIPT).toContain("import.meta.env.DEV");
  });

  it("should generate script with agent", () => {
    const script = VITE_SCRIPT_WITH_AGENT("opencode");

    expect(script).toContain("react-grab");
    expect(script).toContain("@react-grab/opencode");
  });

  it("should generate script with codex agent", () => {
    const script = VITE_SCRIPT_WITH_AGENT("codex");

    expect(script).toContain("react-grab");
    expect(script).toContain("@react-grab/codex");
  });

  it("should return basic script when agent is none", () => {
    const script = VITE_SCRIPT_WITH_AGENT("none");

    expect(script).toContain("react-grab");
    expect(script).not.toContain("@react-grab/");
  });
});

describe("Webpack templates", () => {
  it("should generate basic import without agent", () => {
    expect(WEBPACK_IMPORT).toContain('import("react-grab")');
    expect(WEBPACK_IMPORT).toContain("process.env.NODE_ENV");
    expect(WEBPACK_IMPORT).toContain("development");
  });

  it("should generate import with agent", () => {
    const importBlock = WEBPACK_IMPORT_WITH_AGENT("claude-code");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).toContain("@react-grab/claude-code");
  });

  it("should return basic import when agent is none", () => {
    const importBlock = WEBPACK_IMPORT_WITH_AGENT("none");

    expect(importBlock).toContain("react-grab");
    expect(importBlock).not.toContain("@react-grab/");
  });
});
