import { describe, expect, it } from "vite-plus/test";
import type { StackFrame } from "bippy/source";
import {
  formatStackContext,
  selectResolvedSource,
  type FramesBySourceKind,
} from "../src/core/context.js";

const emptyFramesByKind = (): FramesBySourceKind => ({
  "app-source": [],
  "ignored-app-source": [],
  "package-source": [],
});

const fiberSource = {
  filePath: "/src/app/page.tsx",
  lineNumber: 1,
  columnNumber: 1,
  componentName: "Page",
  sourceFileName: "/src/app/page.tsx",
};

const appFrame: StackFrame = {
  fileName: "/src/app/widget.tsx",
  functionName: "Widget",
  lineNumber: 5,
  columnNumber: 2,
};

const ignoredFrame: StackFrame = {
  fileName: "/src/components/ui/button.tsx",
  functionName: "Button",
  lineNumber: 9,
  columnNumber: 4,
};

const packageFrame: StackFrame = {
  fileName: "/app/node_modules/react-tabs/dist/index.js",
  functionName: "Tabs",
  lineNumber: 1,
  columnNumber: 1,
};

describe("selectResolvedSource", () => {
  it("prefers the fiber source when it is app-source", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["app-source"].push(appFrame);

    expect(selectResolvedSource(fiberSource, "app-source", framesByKind)).toBe(fiberSource);
  });

  it("prefers an app-source frame over a non-app fiber source", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["app-source"].push(appFrame);

    expect(selectResolvedSource(fiberSource, "ignored-app-source", framesByKind)).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });

  it("prefers an ignored-app-source fiber over ignored or package frames", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["ignored-app-source"].push(ignoredFrame);
    framesByKind["package-source"].push(packageFrame);

    expect(selectResolvedSource(fiberSource, "ignored-app-source", framesByKind)).toBe(fiberSource);
  });

  it("falls back to an ignored-app-source frame over a package frame", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["ignored-app-source"].push(ignoredFrame);
    framesByKind["package-source"].push(packageFrame);

    expect(selectResolvedSource(null, "unknown", framesByKind)).toMatchObject({
      filePath: "/src/components/ui/button.tsx",
      componentName: "Button",
    });
  });

  it("prefers a package-source fiber over package frames", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["package-source"].push(packageFrame);

    expect(selectResolvedSource(fiberSource, "package-source", framesByKind)).toBe(fiberSource);
  });

  it("falls back to a package frame as the last resort", () => {
    const framesByKind = emptyFramesByKind();
    framesByKind["package-source"].push(packageFrame);

    expect(selectResolvedSource(null, "unknown", framesByKind)).toMatchObject({
      filePath: "/app/node_modules/react-tabs/dist/index.js",
      componentName: "Tabs",
    });
  });

  it("returns null when no fiber source or frames resolve", () => {
    expect(selectResolvedSource(null, "unknown", emptyFramesByKind())).toBe(null);
  });

  it("picks the first named frame within a kind over an earlier anonymous frame", () => {
    const anonymousFrame: StackFrame = {
      fileName: "/src/app/anonymous.tsx",
      lineNumber: 2,
      columnNumber: 1,
    };
    const framesByKind = emptyFramesByKind();
    framesByKind["app-source"].push(anonymousFrame, appFrame);

    expect(selectResolvedSource(null, "unknown", framesByKind)).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });
});

describe("formatStackContext", () => {
  it("keeps UI-component frames by name while still surfacing the app frame", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/button.tsx", functionName: "Button" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result).toContain("in Button");
    expect(result).not.toContain("button.tsx");
    expect(result).toContain("in Page");
    expect(result).toContain("app/page.tsx");
  });

  it("omits anonymous UI-component frames that carry no name", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/button.tsx" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result).not.toContain("button.tsx");
    expect(result).toContain("in Page");
  });
});
