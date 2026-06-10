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
  kind: "app-source",
};

const ignoredFiberSource: ResolvedSource = {
  filePath: "/src/components/ui/button.tsx",
  lineNumber: 1,
  columnNumber: 1,
  componentName: "Button",
  kind: "ignored-app-source",
};

const packageFiberSource: ResolvedSource = {
  filePath: "/app/node_modules/react-tabs/dist/index.js",
  lineNumber: 1,
  columnNumber: 1,
  componentName: "Tabs",
  kind: "package-source",
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
    expect(selectResolvedSource(fiberSource, [appFrame])).toBe(fiberSource);
  });

  it("prefers an app-source frame over a non-app fiber source", () => {
    expect(selectResolvedSource(ignoredFiberSource, [appFrame])).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });

  it("prefers an ignored-app-source fiber over ignored or package frames", () => {
    expect(selectResolvedSource(ignoredFiberSource, [ignoredFrame, packageFrame])).toBe(
      ignoredFiberSource,
    );
  });

  it("falls back to an ignored-app-source frame over a package frame", () => {
    expect(selectResolvedSource(null, [ignoredFrame, packageFrame])).toMatchObject({
      filePath: "/src/components/ui/button.tsx",
      componentName: "Button",
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

  it("picks the first named frame within a kind over an earlier anonymous frame", () => {
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
  it("keeps UI-component frames by name while still surfacing the app frame", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/button.tsx", functionName: "Button" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result.text).toContain("in Button");
    expect(result.text).not.toContain("button.tsx");
    expect(result.text).toContain("in Page");
    expect(result.text).toContain("app/page.tsx");
  });

  it("omits anonymous UI-component frames that carry no name", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/button.tsx" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    expect(result.text).not.toContain("button.tsx");
    expect(result.text).toContain("in Page");
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

  it("requests a selector hint for an ignored components/ui leading source", () => {
    const result = formatStackContext([], {}, ignoredFiberSource);

    expect(result.shouldAppendSelectorHint).toBe(true);
  });
});
