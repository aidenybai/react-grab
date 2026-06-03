import { vi, describe, expect, it, beforeEach } from "vite-plus/test";
import {
  detectFramework,
  detectMonorepo,
  detectNextRouterType,
  detectProject,
  detectReactGrab,
  detectReactGrabConfigured,
  detectUnsupportedFramework,
} from "../src/utils/detect.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("package-manager-detector/detect", () => ({
  detect: vi.fn(),
}));

import { existsSync, readFileSync } from "node:fs";
import { detect as detectPackageManagerAgent } from "package-manager-detector/detect";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockDetectPackageManagerAgent = vi.mocked(detectPackageManagerAgent);

// `path.join` emits `\` on Windows, so normalize to `/` to keep the POSIX-style
// path literals in these mocks working cross-platform.
const toPosixPath = (path: unknown): string => `${path}`.replace(/\\/g, "/");

beforeEach(() => {
  vi.clearAllMocks();
  mockDetectPackageManagerAgent.mockResolvedValue(null);
});

const onlyPackageJsonExists = (): void => {
  mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("package.json"));
};

describe("detectFramework", () => {
  it("should detect Next.js", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { next: "14.0.0", react: "18.0.0" } }),
    );

    expect(detectFramework("/test")).toBe("next");
  });

  it("should detect Vite", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(JSON.stringify({ devDependencies: { vite: "5.0.0" } }));

    expect(detectFramework("/test")).toBe("vite");
  });

  it("should detect Webpack", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(JSON.stringify({ devDependencies: { webpack: "5.0.0" } }));

    expect(detectFramework("/test")).toBe("webpack");
  });

  it("should return unknown when no framework detected", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { react: "18.0.0" } }));

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should return unknown when no package.json exists", () => {
    mockExistsSync.mockReturnValue(false);

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should return unknown for malformed package.json", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue("{ invalid json }");

    expect(detectFramework("/test")).toBe("unknown");
  });

  it("should prioritize Next.js over Vite if both are present", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { next: "14.0.0" },
        devDependencies: { vite: "5.0.0" },
      }),
    );

    expect(detectFramework("/test")).toBe("next");
  });

  it("should detect TanStack Start", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { "@tanstack/react-start": "1.100.0", "@tanstack/react-router": "1.100.0" },
        devDependencies: { vite: "6.0.0" },
      }),
    );

    expect(detectFramework("/test")).toBe("tanstack");
  });

  it("should prioritize TanStack Start over Vite if both are present", () => {
    onlyPackageJsonExists();
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        dependencies: { "@tanstack/react-start": "1.100.0" },
        devDependencies: { vite: "6.0.0" },
      }),
    );

    expect(detectFramework("/test")).toBe("tanstack");
  });

  it("should detect Vite from a config file when deps are hoisted to monorepo root", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/test/package.json") return true;
      if (pathString === "/test/vite.config.ts") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { react: "18.0.0" } }));

    expect(detectFramework("/test")).toBe("vite");
  });

  it("should detect Next.js from next.config.mjs without next in deps", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/test/package.json") return true;
      if (pathString === "/test/next.config.mjs") return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { react: "18.0.0" } }));

    expect(detectFramework("/test")).toBe("next");
  });

  it("should return unknown when only the monorepo root has the framework dep", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") return true;
      if (pathString === "/repo/pnpm-workspace.yaml") return true;
      if (pathString === "/repo/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0" } });
      }
      if (pathString === "/repo/package.json") {
        return JSON.stringify({ devDependencies: { vite: "5.0.0" } });
      }
      return "{}";
    });

    expect(detectFramework("/repo/apps/web")).toBe("unknown");
  });
});

describe("detectNextRouterType", () => {
  it("should detect App Router when app/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("/app");
    });

    expect(detectNextRouterType("/test")).toBe("app");
  });

  it("should detect App Router when src/app/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("/src/app");
    });

    expect(detectNextRouterType("/test")).toBe("app");
  });

  it("should detect Pages Router when pages/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("/pages");
    });

    expect(detectNextRouterType("/test")).toBe("pages");
  });

  it("should detect Pages Router when src/pages/ exists", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("/src/pages");
    });

    expect(detectNextRouterType("/test")).toBe("pages");
  });

  it("should prefer App Router if both exist", () => {
    mockExistsSync.mockImplementation((path) => {
      const pathStr = toPosixPath(path);
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
      return toPosixPath(path).endsWith("pnpm-workspace.yaml");
    });

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should detect lerna monorepo", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("lerna.json");
    });

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should detect npm/yarn workspaces", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("package.json");
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ workspaces: ["packages/*"] }));

    expect(detectMonorepo("/test")).toBe(true);
  });

  it("should return false for non-monorepo", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("package.json");
    });
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { react: "18.0.0" } }));

    expect(detectMonorepo("/test")).toBe(false);
  });
});

describe("detectReactGrab", () => {
  it("should detect react-grab in dependencies", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "react-grab": "1.0.0" } }));

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
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { react: "18.0.0" } }));

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

describe("detectReactGrabConfigured", () => {
  it("should return false when react-grab only exists in dependencies", () => {
    mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("package.json"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { "react-grab": "1.0.0" } }));

    expect(detectReactGrabConfigured("/test")).toBe(false);
  });

  it("should detect react-grab setup in a Next.js app layout", () => {
    mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("app/layout.tsx"));
    mockReadFileSync.mockReturnValue(
      '<Script src="//unpkg.com/react-grab/dist/index.global.js" />',
    );

    expect(detectReactGrabConfigured("/test")).toBe(true);
  });

  it("should detect react-grab setup in a JavaScript Next.js app layout", () => {
    mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("app/layout.js"));
    mockReadFileSync.mockReturnValue(
      '<Script src="//unpkg.com/react-grab/dist/index.global.js" />',
    );

    expect(detectReactGrabConfigured("/test")).toBe(true);
  });

  it("should detect react-grab setup in a JavaScript entry import", () => {
    mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("src/main.js"));
    mockReadFileSync.mockReturnValue('if (import.meta.env.DEV) import("react-grab");');

    expect(detectReactGrabConfigured("/test")).toBe(true);
  });

  it("should ignore comments that mention react-grab", () => {
    mockExistsSync.mockImplementation((path) => toPosixPath(path).endsWith("app/layout.tsx"));
    mockReadFileSync.mockReturnValue(`// import("react-grab") later
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}`);

    expect(detectReactGrabConfigured("/test")).toBe(false);
  });
});

describe("detectMonorepo", () => {
  it("should return false for malformed package.json", () => {
    mockExistsSync.mockImplementation((path) => {
      return toPosixPath(path).endsWith("package.json");
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
    mockReadFileSync.mockReturnValue(JSON.stringify({ devDependencies: { astro: "4.0.0" } }));

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
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { gatsby: "5.0.0" } }));

    expect(detectUnsupportedFramework("/test")).toBe("gatsby");
  });

  it("should return null for supported frameworks", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ dependencies: { next: "14.0.0" } }));

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

describe("detectProject", () => {
  it("should distinguish an installed dependency from completed setup", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      return pathString === "/app/package.json";
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ dependencies: { next: "14.0.0", react: "18.0.0", "react-grab": "1.0.0" } }),
    );

    const project = await detectProject("/app");

    expect(project.hasReactGrab).toBe(true);
    expect(project.isReactGrabConfigured).toBe(false);
  });

  it("should mark setup complete when react-grab exists in a framework entry file", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      return pathString === "/app/package.json" || pathString === "/app/src/main.tsx";
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/app/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0", vite: "6.0.0" } });
      }
      return 'if (import.meta.env.DEV) import("react-grab");';
    });

    const project = await detectProject("/app");

    expect(project.hasReactGrab).toBe(true);
    expect(project.isReactGrabConfigured).toBe(true);
  });

  it("should fall back to monorepo root framework when subpackage has hoisted deps", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") return true;
      if (pathString === "/repo/pnpm-workspace.yaml") return true;
      if (pathString === "/repo/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0" } });
      }
      if (pathString === "/repo/package.json") {
        return JSON.stringify({ devDependencies: { vite: "5.0.0" } });
      }
      return "{}";
    });

    const project = await detectProject("/repo/apps/web");

    expect(project.framework).toBe("vite");
    expect(project.isMonorepo).toBe(true);
    expect(project.projectRoot).toBe("/repo/apps/web");
  });

  it("should prefer the subpackage's own framework dep over monorepo root", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") return true;
      if (pathString === "/repo/pnpm-workspace.yaml") return true;
      if (pathString === "/repo/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") {
        return JSON.stringify({ dependencies: { next: "14.0.0", react: "18.0.0" } });
      }
      if (pathString === "/repo/package.json") {
        return JSON.stringify({ devDependencies: { vite: "5.0.0" } });
      }
      return "{}";
    });

    const project = await detectProject("/repo/apps/web");

    expect(project.framework).toBe("next");
  });

  it("should not inherit a parent's framework when the parent is not a monorepo", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/parent/child/package.json") return true;
      if (pathString === "/parent/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/parent/child/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0" } });
      }
      if (pathString === "/parent/package.json") {
        return JSON.stringify({ devDependencies: { vite: "5.0.0" } });
      }
      return "{}";
    });

    const project = await detectProject("/parent/child");

    expect(project.framework).toBe("unknown");
    expect(project.isMonorepo).toBe(false);
  });

  it("should leave framework unknown when neither subpackage nor monorepo root advertise one", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") return true;
      if (pathString === "/repo/pnpm-workspace.yaml") return true;
      if (pathString === "/repo/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0" } });
      }
      if (pathString === "/repo/package.json") {
        return JSON.stringify({ dependencies: { typescript: "5.0.0" } });
      }
      return "{}";
    });

    const project = await detectProject("/repo/apps/web");

    expect(project.framework).toBe("unknown");
    expect(project.isMonorepo).toBe(true);
  });

  it("should resolve framework from local config file before falling back to monorepo root", async () => {
    mockExistsSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") return true;
      if (pathString === "/repo/apps/web/vite.config.ts") return true;
      if (pathString === "/repo/pnpm-workspace.yaml") return true;
      if (pathString === "/repo/package.json") return true;
      return false;
    });
    mockReadFileSync.mockImplementation((path) => {
      const pathString = toPosixPath(path);
      if (pathString === "/repo/apps/web/package.json") {
        return JSON.stringify({ dependencies: { react: "18.0.0" } });
      }
      if (pathString === "/repo/package.json") {
        return JSON.stringify({ devDependencies: { next: "14.0.0" } });
      }
      return "{}";
    });

    const project = await detectProject("/repo/apps/web");

    expect(project.framework).toBe("vite");
  });
});
