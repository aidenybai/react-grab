import { describe, expect, it } from "vite-plus/test";
import { isGeneratedBundleSourcePath } from "../src/utils/is-generated-bundle-source-path.js";

describe("isGeneratedBundleSourcePath", () => {
  it("detects hashed Vite assets", () => {
    expect(isGeneratedBundleSourcePath("/assets/routes-CYmCBTcT.js")).toBe(true);
    expect(isGeneratedBundleSourcePath("http://localhost:5182/assets/index-AbCd1234.mjs?v=1")).toBe(
      true,
    );
  });

  it("detects framework chunk directories", () => {
    expect(isGeneratedBundleSourcePath("/_next/static/chunks/app/page-8a4c.js")).toBe(true);
    expect(isGeneratedBundleSourcePath("/static/chunks/client.js")).toBe(true);
  });

  it("keeps authored asset directories trusted", () => {
    expect(isGeneratedBundleSourcePath("/project/src/assets/analytics.js")).toBe(false);
    expect(isGeneratedBundleSourcePath("/project/app/assets/icon.mjs")).toBe(false);
    expect(isGeneratedBundleSourcePath("/assets/analytics.js")).toBe(false);
  });
});
