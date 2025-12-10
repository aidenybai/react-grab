import { vi, describe, expect, it, beforeEach } from "vitest";
import {
  detectFramework,
  detectMonorepo,
  detectNextRouterType,
  detectReactGrab,
  detectInstalledAgents,
  detectUnsupportedFramework,
  detectAvailableAgentCLIs,
} from "../src/utils/detect.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("detectFramework", () => {
  it("should detect Next.js", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { next: "14.0.0", react: "18.0.0" } }),
    );

    expect(detectFramework("/test")).toBe("next");
  });

  it("should detect Vite", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { vite: "5.0.0" } }),
    );

    expect(detectFramework("/test")).toBe("vite");
  });

  it("should detect Webpack", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { webpack: "5.0.0" } }),
    );

    expect(detectFramework("/test")).toBe("webpack");
  });

  it("should return unknown when no framework detected", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { react: "18.0.0" } }),
    );

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should return unknown when no package.json exists", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should return unknown for malformed package.json", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{ invalid json }");

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should prioritize Next.js over Vite if both are present", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { next: "14.0.0" },
        devDependencies: { vite: "5.0.0" },
      }),
    );

    expect(detectFramework("/test")).toBe("next");
  });
});

describe("detectNextRouterType", () => {
  it("should detect App Router when app/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("/app");
    });

    expect(detectNextRouterType("/test")).toBe("app");
  });

  it("should detect App Router when src/app/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("/src/app");
    });

    expect(detectNextRouterType("/test")).toBe("app");
  });

  it("should detect Pages Router when pages/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("/pages");
    });

    expect(detectNextRouterType("/test")).toBe("pages");
  });

  it("should detect Pages Router when src/pages/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("/src/pages");
    });

    expect(detectNextRouterType("/test")).toBe("pages");
  });

  it("should prefer App Router if both exist", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = String(path);
      return pathStr.endsWith("/app") || pathStr.endsWith("/pages");
    });

    expect(detectNextRouterType("/test")).toBe("app");
  });

  it("should return unknown when no router directories exist", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectNextRouterType("/test")).toBe("unknown");
  });
});

describe("detectMonorepo", () => {
  it("should detect pnpm monorepo", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("pnpm-workspace.yaml");
    });

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should detect lerna monorepo", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("lerna.json");
    });

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should detect npm/yarn workspaces", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("package.json");
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ workspaces: ["packages/*"] }),
    );

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should return false for non-monorepo", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("package.json");
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { react: "18.0.0" } }),
    );

    expect(detectMonorepo("/test")).toBe(false);
  });
});

describe("detectReactGrab", () => {
  it("should detect react-grab in dependencies", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { "react-grab": "1.0.0" } }),
    );

    expect(detectReactGrab("/test")).toBe(true);
  });

  it("should detect react-grab in devDependencies", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { "react-grab": "1.0.0" } }),
    );

    expect(detectReactGrab("/test")).toBe(true);
  });

  it("should return false when react-grab is not installed", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { react: "18.0.0" } }),
    );

    expect(detectReactGrab("/test")).toBe(false);
  });

  it("should return false when no package.json exists", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectReactGrab("/test")).toBe(false);
  });

  it("should return false for malformed package.json", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not valid json");

    expect(detectReactGrab("/test")).toBe(false);
  });
});

describe("detectInstalledAgents", () => {
  it("should detect installed agents", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        devDependencies: {
          "@react-grab/cursor": "1.0.0",
          "@react-grab/claude-code": "1.0.0",
        },
      }),
    );

    const agents = detectInstalledAgents("/test");
    expect(agents).toContain("cursor");
    expect(agents).toContain("claude-code");
    expect(agents).not.toContain("opencode");
  });

  it("should return empty array when no agents installed", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { "react-grab": "1.0.0" } }),
    );

    expect(detectInstalledAgents("/test")).toEqual([]);
  });

  it("should return empty array when no package.json exists", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectInstalledAgents("/test")).toEqual([]);
  });

  it("should return empty array for malformed package.json", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{ broken }");

    expect(detectInstalledAgents("/test")).toEqual([]);
  });
});

describe("detectMonorepo", () => {
  it("should return false for malformed package.json", () => {
    mockExistsSync.mockImplementation((path) => {
      return String(path).endsWith("package.json");
    });
    mockReadFileSync.mockReturnValue("invalid");

    expect(detectMonorepo("/test")).toBe(false);
  });
});

describe("detectUnsupportedFramework", () => {
  it("should detect Remix", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { "@remix-run/react": "2.0.0" } }),
    );

    expect(detectUnsupportedFramework("/test")).toBe("remix");
  });

  it("should detect Astro", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { astro: "4.0.0" } }),
    );

    expect(detectUnsupportedFramework("/test")).toBe("astro");
  });

  it("should detect SvelteKit", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { "@sveltejs/kit": "2.0.0" } }),
    );

    expect(detectUnsupportedFramework("/test")).toBe("sveltekit");
  });

  it("should detect Gatsby", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { gatsby: "5.0.0" } }),
    );

    expect(detectUnsupportedFramework("/test")).toBe("gatsby");
  });

  it("should return null for supported frameworks", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { next: "14.0.0" } }),
    );

    expect(detectUnsupportedFramework("/test")).toBe(null);
  });

  it("should return null when no package.json exists", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectUnsupportedFramework("/test")).toBe(null);
  });

  it("should return null for malformed package.json", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("invalid json");

    expect(detectUnsupportedFramework("/test")).toBe(null);
  });
});

describe("detectAvailableAgentCLIs", () => {
  it("should return all available CLIs", () => {
    mockExecSync.mockImplementation(() => Buffer.from(""));

    const available = detectAvailableAgentCLIs();
    expect(available).toContain("claude");
    expect(available).toContain("cursor-agent");
    expect(available).toContain("opencode");
  });

  it("should return only available CLIs", () => {
    mockExecSync.mockImplementation((command) => {
      const commandString = String(command);
      if (commandString.includes("claude")) {
        return Buffer.from("/usr/local/bin/claude");
      }
      if (commandString.includes("opencode")) {
        return Buffer.from("/usr/local/bin/opencode");
      }
      throw new Error("Command not found");
    });

    const available = detectAvailableAgentCLIs();
    expect(available).toContain("claude");
    expect(available).toContain("opencode");
    expect(available).not.toContain("cursor-agent");
  });

  it("should return empty array when no CLIs are available", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Command not found");
    });

    expect(detectAvailableAgentCLIs()).toEqual([]);
  });
});
