import { describe, expect, it } from "vite-plus/test";
import { classifySourcePath } from "../src/utils/source-frame-policy.js";

describe("classifySourcePath", () => {
  it("classifies application source paths", () => {
    expect(classifySourcePath("src/app/employees/employee-tabs.tsx")).toEqual({
      kind: "app-source",
      packageName: null,
    });
  });

  it("classifies package source paths", () => {
    expect(classifySourcePath("../@rippling/pebble/Tabs/Renderers.js")).toEqual({
      kind: "package-source",
      packageName: "@rippling/pebble",
    });
    expect(classifySourcePath("./@radix-ui/react-tabs/src/tabs.tsx")).toEqual({
      kind: "package-source",
      packageName: "@radix-ui/react-tabs",
    });
    expect(classifySourcePath("/app/node_modules/@radix-ui/react-tabs/dist/index.min.js")).toEqual({
      kind: "package-source",
      packageName: "@radix-ui/react-tabs",
    });
    expect(classifySourcePath("/app/node_modules/react-tabs/dist/index.js")).toEqual({
      kind: "package-source",
      packageName: "react-tabs",
    });
  });

  // The relative prefix is the only signal distinguishing a scoped dependency
  // import from a `@alias/...` path, so a normalized path (leading "./" removed)
  // can no longer be detected as a package. Callers must classify the raw path.
  it("only detects relative scoped packages while the relative prefix survives", () => {
    expect(classifySourcePath("./@radix-ui/react-tabs/src/tabs.tsx").kind).toBe("package-source");
    expect(classifySourcePath("@radix-ui/react-tabs/src/tabs.tsx").kind).not.toBe("package-source");
  });

  it("classifies default ignored app source paths", () => {
    expect(classifySourcePath("components/ui/button.tsx")).toEqual({
      kind: "ignored-app-source",
      packageName: null,
    });
    expect(classifySourcePath("src/components/ui/dialog.tsx")).toEqual({
      kind: "ignored-app-source",
      packageName: null,
    });
  });

  it("does not ignore nearby app source paths", () => {
    expect(classifySourcePath("../@company/app/src/tabs.tsx")).toEqual({
      kind: "app-source",
      packageName: null,
    });
    expect(classifySourcePath("src/components/ui-button.tsx")).toEqual({
      kind: "app-source",
      packageName: null,
    });
  });
});
