import { describe, expect, it } from "vite-plus/test";
import { classifySourcePath } from "./source-frame-policy.js";

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

  it("classifies configured ignored source paths", () => {
    expect(
      classifySourcePath("src/design-system/button.tsx", {
        ignorePaths: ["design-system", /\/packages\/ui\//],
      }),
    ).toEqual({
      kind: "ignored-app-source",
      packageName: null,
    });
    expect(
      classifySourcePath("/workspace/packages/ui/src/button.tsx", {
        ignorePaths: ["design-system", /\/packages\/ui\//],
      }),
    ).toEqual({
      kind: "ignored-app-source",
      packageName: null,
    });
  });

  it("does not ignore nearby app source paths", () => {
    expect(classifySourcePath("src/components/ui-button.tsx")).toEqual({
      kind: "app-source",
      packageName: null,
    });
    expect(classifySourcePath("src/design-system-ui/button.tsx", { ignorePaths: ["ui"] })).toEqual({
      kind: "app-source",
      packageName: null,
    });
  });
});
