import { describe, expect, it } from "vite-plus/test";
import { classifySourcePath } from "../src/utils/classify-source-path.js";

describe("classifySourcePath", () => {
  it("classifies application source paths", () => {
    expect(classifySourcePath("src/app/employees/employee-tabs.tsx")).toEqual({
      source: "app",
      packageName: null,
    });
  });

  it("classifies package source paths", () => {
    expect(classifySourcePath("../@rippling/pebble/Tabs/Renderers.js")).toEqual({
      source: "package",
      packageName: "@rippling/pebble",
    });
    expect(classifySourcePath("./@radix-ui/react-tabs/src/tabs.tsx")).toEqual({
      source: "package",
      packageName: "@radix-ui/react-tabs",
    });
    expect(classifySourcePath("/app/node_modules/@radix-ui/react-tabs/dist/index.min.js")).toEqual({
      source: "package",
      packageName: "@radix-ui/react-tabs",
    });
    expect(classifySourcePath("/app/node_modules/react-tabs/dist/index.js")).toEqual({
      source: "package",
      packageName: "react-tabs",
    });
  });

  it("detects scoped packages with or without a relative prefix", () => {
    expect(classifySourcePath("./@radix-ui/react-tabs/src/tabs.tsx").source).toBe("package");
    expect(classifySourcePath("@radix-ui/react-tabs/src/tabs.tsx").source).toBe("package");
  });

  it("does not treat bundler alias paths as packages", () => {
    expect(classifySourcePath("@app/components/tabs.tsx").source).toBe("app");
    expect(classifySourcePath("@components/forms/input.tsx").source).toBe("app");
    expect(classifySourcePath("@scope/tabs.tsx").source).toBe("app");
    expect(classifySourcePath("/@fs/Users/dev/project/src/tabs.tsx").source).toBe("app");
  });

  it("classifies design-system wrapper paths as app source", () => {
    expect(classifySourcePath("components/ui/button.tsx")).toEqual({
      source: "app",
      packageName: null,
    });
    expect(classifySourcePath("src/components/ui/dialog.tsx")).toEqual({
      source: "app",
      packageName: null,
    });
  });

  it("classifies monorepo workspace paths as app source", () => {
    expect(classifySourcePath("../@company/app/src/tabs.tsx")).toEqual({
      source: "app",
      packageName: null,
    });
    expect(classifySourcePath("src/components/ui-button.tsx")).toEqual({
      source: "app",
      packageName: null,
    });
  });
});
