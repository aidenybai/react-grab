import { describe, expect, it } from "vite-plus/test";
import { parsePackageName } from "./parse-package-name.js";

describe("parsePackageName", () => {
  it("reads packages from node_modules paths", () => {
    expect(parsePackageName("/app/node_modules/react-tabs/dist/index.js")).toBe("react-tabs");
    expect(parsePackageName("/app/node_modules/@radix-ui/react-tabs/dist/index.js")).toBe(
      "@radix-ui/react-tabs",
    );
  });

  it("reads packages from Vite optimized dependency paths", () => {
    expect(parsePackageName("/app/node_modules/.vite/deps/@radix-ui_react-tabs.js")).toBe(
      "@radix-ui/react-tabs",
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
