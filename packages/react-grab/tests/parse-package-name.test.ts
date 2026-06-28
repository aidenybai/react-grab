import { describe, expect, it } from "vite-plus/test";
import { parsePackageName, resolvePackageName } from "../src/utils/parse-package-name.js";

describe("parsePackageName", () => {
  it("returns null for empty input", () => {
    expect(parsePackageName(null)).toBe(null);
    expect(parsePackageName(undefined)).toBe(null);
    expect(parsePackageName("")).toBe(null);
  });

  it("reads packages from node_modules paths", () => {
    expect(parsePackageName("/app/node_modules/react-tabs/dist/index.js")).toBe("react-tabs");
    expect(parsePackageName("/app/node_modules/@radix-ui/react-tabs/dist/index.js")).toBe(
      "@radix-ui/react-tabs",
    );
  });

  it("skips dotfile dependency folders like .pnpm and .bin", () => {
    expect(parsePackageName("/app/node_modules/.pnpm/react@18/node_modules/.bin/x.js")).toBe(null);
  });

  it("reads packages from Vite optimized dependency paths", () => {
    expect(parsePackageName("/app/node_modules/.vite/deps/@radix-ui_react-tabs.js")).toBe(
      "@radix-ui/react-tabs",
    );
    expect(parsePackageName("/app/node_modules/.vite/deps/react-dom.js")).toBe("react-dom");
  });

  it("ignores Vite internal chunk files", () => {
    expect(parsePackageName("/app/node_modules/.vite/deps/chunk-ABC123XY.js")).toBe(null);
  });

  it("reads versioned packages from CDN URLs", () => {
    expect(parsePackageName("https://esm.sh/react-tabs@1.2.3/dist/index.js")).toBe("react-tabs");
    expect(parsePackageName("https://esm.sh/@radix-ui/react-dialog@1.0.0/dist/index.js")).toBe(
      "@radix-ui/react-dialog",
    );
  });

  it("does not treat app paths or aliases as packages", () => {
    expect(parsePackageName("../components/tabs.tsx")).toBe(null);
    expect(parsePackageName("/workspace/app/src/components/tabs.tsx")).toBe(null);
    expect(parsePackageName("@/components/tabs.tsx")).toBe(null);
    expect(parsePackageName("@app/components/tabs.tsx")).toBe(null);
    expect(parsePackageName("@company/app/src/tabs.tsx")).toBe(null);
    expect(parsePackageName("../@company/app/src/tabs.tsx")).toBe(null);
    expect(parsePackageName("../@rippling/pebble/Tabs/Renderers.js")).toBe(null);
    expect(parsePackageName("./@company/web/src/tabs.tsx")).toBe(null);
    expect(parsePackageName("/@company/app/src/tabs.tsx")).toBe(null);
  });
});

describe("resolvePackageName", () => {
  it("returns null for empty input", () => {
    expect(resolvePackageName(null)).toBe(null);
    expect(resolvePackageName(undefined)).toBe(null);
  });

  it("falls back to scoped source paths that carry no node_modules marker", () => {
    expect(resolvePackageName("@radix-ui/react-tabs/src/tabs.tsx")).toBe("@radix-ui/react-tabs");
    expect(resolvePackageName("../@acme/ui/components/button.tsx")).toBe("@acme/ui");
  });

  it("still prefers the marker-based result when one exists", () => {
    expect(resolvePackageName("/app/node_modules/react-tabs/dist/index.js")).toBe("react-tabs");
  });

  it("rejects alias scopes, app packages, and absolute scoped paths", () => {
    expect(resolvePackageName("@components/forms/input.tsx")).toBe(null);
    expect(resolvePackageName("@acme/app/src/index.ts")).toBe(null);
    expect(resolvePackageName("/@fs/@radix-ui/react-tabs/src/tabs.tsx")).toBe(null);
    expect(resolvePackageName("@radix-ui/react-tabs")).toBe(null);
  });
});
