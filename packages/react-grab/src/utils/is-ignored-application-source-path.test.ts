import { describe, expect, it } from "vite-plus/test";
import { isIgnoredApplicationSourcePath } from "./is-ignored-application-source-path.js";

describe("isIgnoredApplicationSourcePath", () => {
  it("ignores shadcn components/ui source paths", () => {
    expect(isIgnoredApplicationSourcePath("components/ui/button.tsx")).toBe(true);
    expect(isIgnoredApplicationSourcePath("src/components/ui/dialog.tsx")).toBe(true);
    expect(isIgnoredApplicationSourcePath("../components/ui/tabs.tsx")).toBe(true);
    expect(isIgnoredApplicationSourcePath("/workspace/app/components/ui/card.tsx")).toBe(true);
  });

  it("does not ignore nearby application source paths", () => {
    expect(isIgnoredApplicationSourcePath("components/nav/button.tsx")).toBe(false);
    expect(isIgnoredApplicationSourcePath("src/components/ui-button.tsx")).toBe(false);
    expect(isIgnoredApplicationSourcePath("src/design-system/ui/button.tsx")).toBe(false);
    expect(isIgnoredApplicationSourcePath(null)).toBe(false);
  });
});
