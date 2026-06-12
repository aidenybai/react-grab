import { describe, expect, it } from "vite-plus/test";
import type { StackFrame } from "bippy/source";
import {
  formatStackContext,
  selectResolvedSource,
  type ResolvedSource,
} from "../src/core/context.js";

const fiberSource: ResolvedSource = {
  filePath: "/src/app/page.tsx",
  lineNumber: 1,
  columnNumber: 1,
  componentName: "Page",
  origin: "app",
};

const packageFiberSource: ResolvedSource = {
  filePath: "/app/node_modules/react-tabs/dist/index.js",
  lineNumber: 1,
  columnNumber: 1,
  componentName: "Tabs",
  origin: "package",
};

const appFrame: StackFrame = {
  fileName: "/src/app/widget.tsx",
  functionName: "Widget",
  lineNumber: 5,
  columnNumber: 2,
};

const packageFrame: StackFrame = {
  fileName: "/app/node_modules/react-tabs/dist/index.js",
  functionName: "Tabs",
  lineNumber: 1,
  columnNumber: 1,
};

describe("selectResolvedSource", () => {
  it("prefers the fiber source when it is app-source", () => {
    expect(selectResolvedSource(fiberSource, [appFrame])).toBe(fiberSource);
  });

  it("prefers an app-source frame over a package fiber source", () => {
    expect(selectResolvedSource(packageFiberSource, [appFrame])).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });

  it("prefers a package-source fiber over package frames", () => {
    expect(selectResolvedSource(packageFiberSource, [packageFrame])).toBe(packageFiberSource);
  });

  it("falls back to a package frame as the last resort", () => {
    expect(selectResolvedSource(null, [packageFrame])).toMatchObject({
      filePath: "/app/node_modules/react-tabs/dist/index.js",
      componentName: "Tabs",
    });
  });

  it("returns null when no fiber source or frames resolve", () => {
    expect(selectResolvedSource(null, [])).toBe(null);
  });

  it("picks the first named frame within an origin over an earlier anonymous frame", () => {
    const anonymousFrame: StackFrame = {
      fileName: "/src/app/anonymous.tsx",
      lineNumber: 2,
      columnNumber: 1,
    };

    expect(selectResolvedSource(null, [anonymousFrame, appFrame])).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });
});

describe("formatStackContext", () => {
  it("surfaces design-system wrapper frames with their file path", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/button.tsx", functionName: "Button" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result.text).toContain("in Button");
    expect(result.text).toContain("components/ui/button.tsx");
    expect(result.text).toContain("in Page");
    expect(result.text).toContain("app/page.tsx");
  });

  it("extends the line budget by one per low-signal package line", () => {
    const result = formatStackContext(
      [
        { fileName: "node_modules/react-tabs/dist/index.js", functionName: "Tabs" },
        { fileName: "src/app/widget.tsx", functionName: "Widget" },
        { fileName: "src/app/section.tsx", functionName: "Section" },
        { fileName: "src/app/page.tsx", functionName: "Page" },
        { fileName: "src/app/layout.tsx", functionName: "Layout" },
      ],
      { maxLines: 3 },
    );

    const lines = result.text.split("\n").filter(Boolean);
    expect(lines).toHaveLength(4);
    expect(result.text).toContain("in Tabs (react-tabs)");
    expect(result.text).toContain("app/widget.tsx");
    expect(result.text).toContain("app/section.tsx");
    expect(result.text).toContain("app/page.tsx");
    expect(result.text).not.toContain("app/layout.tsx");
  });

  it("digs past low-signal package frames to surface a deeper app source", () => {
    const result = formatStackContext([
      { fileName: "node_modules/react-tabs/dist/index.js", functionName: "Tabs" },
      { fileName: "node_modules/@radix-ui/react-dialog/dist/index.js", functionName: "Dialog" },
      { fileName: "node_modules/framer-motion/dist/index.js", functionName: "Motion" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result.text).toContain("app/page.tsx");
    expect(result.text).toContain("in Page");
    expect(result.shouldAppendSelectorHint).toBe(false);
  });

  it("does not request a selector hint for a trusted app leading source", () => {
    const result = formatStackContext([], {}, fiberSource);

    expect(result.shouldAppendSelectorHint).toBe(false);
  });
});
