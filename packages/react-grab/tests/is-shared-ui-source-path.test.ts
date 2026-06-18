import { describe, expect, it } from "vite-plus/test";
import { isSharedUiSourcePath } from "../src/utils/is-shared-ui-source-path.js";

describe("isSharedUiSourcePath", () => {
  it("matches shadcn-style components/ui paths", () => {
    expect(isSharedUiSourcePath("src/components/ui/sidebar.tsx")).toBe(true);
    expect(isSharedUiSourcePath("/Users/me/app/src/components/ui/button.tsx")).toBe(true);
  });

  it("matches monorepo design-system packages and headless primitives", () => {
    expect(isSharedUiSourcePath("packages/ui/src/card.tsx")).toBe(true);
    expect(isSharedUiSourcePath("src/design-system/tokens.ts")).toBe(true);
    expect(isSharedUiSourcePath("src/primitives/dialog.tsx")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isSharedUiSourcePath("src/components/UI/Sidebar.tsx")).toBe(true);
  });

  it("does not match feature source paths", () => {
    expect(isSharedUiSourcePath("app/(dashboard)/builder/[id]/page.tsx")).toBe(false);
    expect(isSharedUiSourcePath("src/features/builder/builder.tsx")).toBe(false);
    expect(isSharedUiSourcePath("src/components/header.tsx")).toBe(false);
  });

  it("does not match Next's app/ui feature convention", () => {
    expect(isSharedUiSourcePath("app/ui/dashboard/cards.tsx")).toBe(false);
    expect(isSharedUiSourcePath("src/app/(dashboard)/ui/settings.tsx")).toBe(false);
    expect(isSharedUiSourcePath("ui/button.tsx")).toBe(false);
  });

  it("does not match a filename that merely starts with ui", () => {
    expect(isSharedUiSourcePath("src/components/uikit-banner.tsx")).toBe(false);
  });

  it("handles empty input", () => {
    expect(isSharedUiSourcePath(null)).toBe(false);
    expect(isSharedUiSourcePath(undefined)).toBe(false);
    expect(isSharedUiSourcePath("")).toBe(false);
  });
});
