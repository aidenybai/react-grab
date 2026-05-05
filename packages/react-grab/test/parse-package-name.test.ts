import { describe, expect, it } from "vite-plus/test";
import { parsePackageName } from "../src/utils/parse-package-name.js";

describe("parsePackageName", () => {
  describe("falsy and unrecognized input", () => {
    it.each([null, undefined, ""])("returns null for %p", (input) => {
      expect(parsePackageName(input)).toBeNull();
    });

    it("returns null for plain user paths with no node_modules segment", () => {
      expect(parsePackageName("/Users/me/proj/src/App.tsx")).toBeNull();
      expect(parsePackageName("./src/components/Button.tsx")).toBeNull();
    });

    it("does not mistake `@` in user paths for a package version", () => {
      expect(parsePackageName("/Users/me@work/proj/src/App.tsx")).toBeNull();
    });

    it("does not match inside a longer identifier like `mynode_modules`", () => {
      expect(parsePackageName("/proj/mynode_modules/foo/index.js")).toBeNull();
    });
  });

  describe("plain node_modules layouts", () => {
    it("extracts a top-level package", () => {
      expect(parsePackageName("/proj/node_modules/lucide-react/dist/index.js")).toBe(
        "lucide-react",
      );
    });

    it("extracts a scoped package", () => {
      expect(parsePackageName("/proj/node_modules/@radix-ui/react-dialog/dist/index.mjs")).toBe(
        "@radix-ui/react-dialog",
      );
    });

    it("returns the package even when no file segment follows", () => {
      expect(parsePackageName("/proj/node_modules/lucide-react")).toBe("lucide-react");
    });

    it("returns null for a malformed scoped path with no name", () => {
      expect(parsePackageName("/proj/node_modules/@radix-ui")).toBeNull();
    });

    it("rejects hoist meta-directories so we don't surface them as packages", () => {
      expect(parsePackageName("/proj/node_modules/.bin/eslint")).toBeNull();
      expect(parsePackageName("/proj/node_modules/.cache/something/foo.js")).toBeNull();
    });
  });

  describe("pnpm layouts", () => {
    it("collapses past the .pnpm hoist layer to the real package", () => {
      expect(
        parsePackageName(
          "/proj/node_modules/.pnpm/lucide-react@1.14.0/node_modules/lucide-react/dist/index.js",
        ),
      ).toBe("lucide-react");
    });

    it("collapses past the .pnpm hoist layer for scoped packages", () => {
      expect(
        parsePackageName(
          "/proj/node_modules/.pnpm/@radix-ui+react-dialog@1.1.15/node_modules/@radix-ui/react-dialog/dist/index.mjs",
        ),
      ).toBe("@radix-ui/react-dialog");
    });

    it("collapses past .pnpm even when the inner package depends on a peer", () => {
      expect(
        parsePackageName(
          "/proj/node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom/index.js",
        ),
      ).toBe("react-dom");
    });
  });

  describe("Yarn PnP layouts", () => {
    it("recovers the package from inside a virtual zip", () => {
      expect(
        parsePackageName(
          "/proj/.yarn/cache/lucide-react-npm-1.14.0-abc.zip/node_modules/lucide-react/dist/index.js",
        ),
      ).toBe("lucide-react");
    });

    it("recovers the package from a scoped virtual zip", () => {
      expect(
        parsePackageName(
          "/proj/.yarn/cache/@radix-ui-react-dialog-npm-1.1.15-abc.zip/node_modules/@radix-ui/react-dialog/dist/index.mjs",
        ),
      ).toBe("@radix-ui/react-dialog");
    });
  });

  describe("Bun layouts", () => {
    it("collapses past the bun cache directory to the real package", () => {
      expect(
        parsePackageName(
          "/Users/me/.bun/install/cache/lucide-react@1.14.0@@@1/node_modules/lucide-react/dist/index.mjs",
        ),
      ).toBe("lucide-react");
    });
  });

  describe("Vite optimized deps", () => {
    it("extracts an unscoped optimized dep", () => {
      expect(
        parsePackageName("http://localhost:5173/node_modules/.vite/deps/lucide-react.js?v=abc"),
      ).toBe("lucide-react");
    });

    it("re-inflates a flattened scoped optimized dep back to @scope/name", () => {
      expect(
        parsePackageName("http://localhost:5173/node_modules/.vite/deps/@radix-ui_react-dialog.js"),
      ).toBe("@radix-ui/react-dialog");
    });

    it("supports the deps_temp directory used during re-optimize", () => {
      expect(
        parsePackageName("http://localhost:5173/node_modules/.vite/deps_temp/lucide-react.js"),
      ).toBe("lucide-react");
    });

    it("supports the hashed deps_temp_<hash> directory used by Vite 5+ on force re-optimize", () => {
      expect(
        parsePackageName(
          "http://localhost:5173/node_modules/.vite/deps_temp_a1b2/@radix-ui_react-dialog.js",
        ),
      ).toBe("@radix-ui/react-dialog");
    });

    it("rejects internal split chunks that have no recoverable package origin", () => {
      expect(
        parsePackageName("http://localhost:5173/node_modules/.vite/deps/chunk-XYZ123.js"),
      ).toBeNull();
    });
  });

  describe("Webpack and Turbopack", () => {
    it("handles webpack:// URLs", () => {
      expect(parsePackageName("webpack:///./node_modules/foo/index.js")).toBe("foo");
    });

    it("handles webpack-internal URLs with bundler layer prefixes", () => {
      expect(
        parsePackageName(
          "webpack-internal:///(app-pages-browser)/./node_modules/lucide-react/dist/esm/icons/square.js",
        ),
      ).toBe("lucide-react");
    });

    it("handles turbopack project-rooted paths", () => {
      expect(
        parsePackageName("turbopack:///[project]/node_modules/lucide-react/dist/index.js"),
      ).toBe("lucide-react");
    });
  });

  describe("Windows paths", () => {
    it("extracts an unscoped package from a backslash-separated path", () => {
      expect(parsePackageName("C:\\proj\\node_modules\\react\\index.js")).toBe("react");
    });

    it("extracts a scoped package from a backslash-separated path", () => {
      expect(
        parsePackageName("C:\\proj\\node_modules\\@radix-ui\\react-dialog\\dist\\index.mjs"),
      ).toBe("@radix-ui/react-dialog");
    });
  });

  describe("defensive parsing", () => {
    it("tolerates duplicated path separators", () => {
      expect(parsePackageName("/proj//node_modules//lucide-react//dist/index.js")).toBe(
        "lucide-react",
      );
    });

    it("matches when node_modules is at the very start of the path", () => {
      expect(parsePackageName("node_modules/lucide-react/dist/index.js")).toBe("lucide-react");
    });
  });

  describe("CDN URLs", () => {
    it("extracts from esm.sh", () => {
      expect(parsePackageName("https://esm.sh/lucide-react@1.14.0/dist/lucide-react.js")).toBe(
        "lucide-react",
      );
    });

    it("extracts a scoped package from esm.sh", () => {
      expect(parsePackageName("https://esm.sh/@radix-ui/react-dialog@1.1.15/dist/index.js")).toBe(
        "@radix-ui/react-dialog",
      );
    });

    it("tolerates the v<n> version-pin prefix on esm.sh", () => {
      expect(parsePackageName("https://esm.sh/v135/lucide-react@1.14.0/dist/lucide-react.js")).toBe(
        "lucide-react",
      );
    });

    it("tolerates the stable/ prefix on esm.sh", () => {
      expect(parsePackageName("https://esm.sh/stable/react@19.0.0/index.js")).toBe("react");
    });

    it("extracts from unpkg.com", () => {
      expect(parsePackageName("https://unpkg.com/lodash@4.17.21/index.js")).toBe("lodash");
    });

    it("extracts from cdn.jsdelivr.net with the /npm/ prefix", () => {
      expect(parsePackageName("https://cdn.jsdelivr.net/npm/lodash@4.17.21/index.js")).toBe(
        "lodash",
      );
    });

    it("extracts a scoped package from cdn.jsdelivr.net", () => {
      expect(parsePackageName("https://cdn.jsdelivr.net/npm/@scope/foo@1.0.0/index.js")).toBe(
        "@scope/foo",
      );
    });

    it("extracts from skypack with the /pin/ prefix", () => {
      expect(
        parsePackageName(
          "https://cdn.skypack.dev/pin/lucide-react@v1.14.0-abcdef/dist/lucide-react.js",
        ),
      ).toBe("lucide-react");
    });

    it("returns null for un-versioned scoped CDN paths because the package boundary is ambiguous", () => {
      expect(parsePackageName("https://esm.sh/@types/foo")).toBeNull();
    });

    it("ignores CDN-shaped URLs from hosts not on the allow-list", () => {
      expect(parsePackageName("https://untrusted-cdn.example.com/foo@1.0.0/index.js")).toBeNull();
    });

    it("returns null when the URL is not parseable", () => {
      expect(parsePackageName("not a url ::: bogus")).toBeNull();
    });
  });
});
