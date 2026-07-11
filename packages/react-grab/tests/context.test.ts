import { describe, expect, it } from "vite-plus/test";
import type { StackFrame } from "bippy/source";
import {
  formatStackContext,
  selectResolvedSource,
  type ResolvedSource,
} from "../src/core/context.js";
import { MAX_TRACE_CONTEXT_LINES } from "../src/constants.js";

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

  it("prefers a feature owner frame over a shared-UI fiber source", () => {
    const sharedUiFiberSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/src/components/ui/tooltip.tsx",
      componentName: "TooltipProvider",
    };

    expect(selectResolvedSource(sharedUiFiberSource, [appFrame])).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });

  it("prefers editable source over a generated client bundle", () => {
    const generatedBundleFiberSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/assets/routes-CYmCBTcT.js",
      componentName: "Rc",
    };

    expect(selectResolvedSource(generatedBundleFiberSource, [appFrame])).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
  });

  it("keeps a generated bundle source when no editable source survives", () => {
    const generatedBundleFiberSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/assets/routes-CYmCBTcT.js",
      componentName: "Rc",
    };

    expect(selectResolvedSource(generatedBundleFiberSource, [packageFrame])).toBe(
      generatedBundleFiberSource,
    );
  });

  it("prefers an editable shared-UI owner over a generated bundle", () => {
    const generatedBundleFiberSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/assets/routes-CYmCBTcT.js",
      componentName: "Rc",
    };
    const sharedUiFrame: StackFrame = {
      fileName: "/src/components/ui/button.tsx",
      functionName: "Button",
    };

    expect(selectResolvedSource(generatedBundleFiberSource, [sharedUiFrame])).toMatchObject({
      filePath: "/src/components/ui/button.tsx",
      componentName: "Button",
    });
  });

  it("keeps a shared-UI fiber source when no feature owner frame exists", () => {
    const sharedUiFiberSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/src/components/ui/tooltip.tsx",
      componentName: "TooltipProvider",
    };

    expect(selectResolvedSource(sharedUiFiberSource, [packageFrame])).toBe(sharedUiFiberSource);
  });

  it("skips shared-UI owner frames when a deeper feature owner is available", () => {
    expect(
      selectResolvedSource(null, [
        {
          fileName: "/src/components/ui/tooltip.tsx",
          functionName: "TooltipProvider",
        },
        appFrame,
      ]),
    ).toMatchObject({
      filePath: "/src/app/widget.tsx",
      componentName: "Widget",
    });
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

  it("does not let shared-UI wrapper frames spend the compact line budget", () => {
    const result = formatStackContext(
      [
        { fileName: "src/components/ui/sidebar.tsx", functionName: "Sidebar" },
        { fileName: "src/components/ui/sidebar.tsx", functionName: "SidebarContent" },
        { fileName: "src/components/ui/button.tsx", functionName: "Button" },
        { fileName: "src/app/dashboard/page.tsx", functionName: "DashboardPage" },
        { fileName: "src/app/layout.tsx", functionName: "RootLayout" },
      ],
      { maxLines: 3 },
    );

    expect(result.text).toContain("components/ui/sidebar.tsx");
    expect(result.text).toContain("components/ui/button.tsx");
    expect(result.text).toContain("app/dashboard/page.tsx");
    expect(result.text).toContain("app/layout.tsx");
    expect(result.shouldAppendSelectorHint).toBe(false);
  });

  it("surfaces deeper feature source past a wrapper chain without a selector hint", () => {
    const result = formatStackContext(
      [
        { fileName: "src/components/ui/dialog.tsx", functionName: "Dialog" },
        { fileName: "src/components/ui/dialog.tsx", functionName: "DialogContent" },
        { fileName: "src/components/ui/scroll-area.tsx", functionName: "ScrollArea" },
        { fileName: "src/features/builder/builder.tsx", functionName: "Builder" },
      ],
      { maxLines: 1 },
    );

    expect(result.text).toContain("features/builder/builder.tsx");
    expect(result.shouldAppendSelectorHint).toBe(false);
  });

  it("requests a selector hint when only shared-UI owner frames survive", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/tooltip.tsx", functionName: "TooltipProvider" },
    ]);

    expect(result.text).toContain("components/ui/tooltip.tsx");
    expect(result.hasBudgetedStackFrame).toBe(false);
    expect(result.shouldAppendSelectorHint).toBe(true);
  });

  it("requests a selector hint for package and shared-UI production frames", () => {
    const result = formatStackContext([
      { fileName: "node_modules/next/dist/client/index.js", functionName: "c" },
      {
        fileName: "node_modules/@radix-ui/react-context/dist/index.js",
        functionName: "Context",
      },
      { fileName: "src/components/ui/tooltip.tsx", functionName: "TooltipProvider" },
      { fileName: "node_modules/next-themes/dist/index.js", functionName: "n" },
    ]);

    expect(result.text).toContain("components/ui/tooltip.tsx");
    expect(result.shouldAppendSelectorHint).toBe(true);
  });

  it("does not trust a shared-UI leading source without a feature owner", () => {
    const sharedUiLeadingSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/src/components/ui/tooltip.tsx",
      componentName: "TooltipProvider",
    };
    const result = formatStackContext([packageFrame], {}, sharedUiLeadingSource);

    expect(result.shouldAppendSelectorHint).toBe(true);
  });

  it("does not trust a generated client bundle without editable source", () => {
    const result = formatStackContext([
      {
        fileName: "http://localhost:5179/assets/routes-CYmCBTcT.js",
        functionName: "Rc",
      },
      {
        fileName: "http://localhost:5179/assets/routes-CYmCBTcT.js",
        functionName: "Uc",
      },
    ]);

    expect(result.text).toContain("assets/routes-CYmCBTcT.js");
    expect(result.hasBudgetedStackFrame).toBe(false);
    expect(result.shouldAppendSelectorHint).toBe(true);
  });

  it("does not trust a generated bundle leading source", () => {
    const generatedBundleSource: ResolvedSource = {
      ...fiberSource,
      filePath: "/_next/static/chunks/app/page-8a4c.js",
      componentName: "c",
    };
    const result = formatStackContext([], {}, generatedBundleSource);

    expect(result.shouldAppendSelectorHint).toBe(true);
  });

  it("trusts a minified feature frame when its app source path survives", () => {
    const result = formatStackContext([
      { fileName: "src/features/github-link.tsx", functionName: "c" },
    ]);

    expect(result.text).toContain("features/github-link.tsx");
    expect(result.shouldAppendSelectorHint).toBe(false);
  });

  it("preserves React owner order instead of reordering by component name", () => {
    const result = formatStackContext([
      { fileName: "src/features/card.tsx", functionName: "CardOwner" },
      { fileName: "src/app/page.tsx", functionName: "PageOwner" },
    ]);

    expect(result.text.indexOf("CardOwner")).toBeLessThan(result.text.indexOf("PageOwner"));
  });

  it("honors a raised maxLines to surface more feature source", () => {
    const stack: StackFrame[] = [
      { fileName: "src/app/a.tsx", functionName: "A" },
      { fileName: "src/app/b.tsx", functionName: "B" },
      { fileName: "src/app/c.tsx", functionName: "C" },
      { fileName: "src/app/d.tsx", functionName: "D" },
      { fileName: "src/app/e.tsx", functionName: "E" },
    ];

    const compact = formatStackContext(stack, { maxLines: 3 });
    expect(compact.text.split("\n").filter(Boolean)).toHaveLength(3);

    const detailed = formatStackContext(stack, { maxLines: 5 });
    expect(detailed.text.split("\n").filter(Boolean)).toHaveLength(5);
    expect(detailed.text).toContain("app/e.tsx");
  });

  it("collapses consecutive duplicate trace lines", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/sidebar.tsx", functionName: "SidebarMenu" },
      { fileName: "src/components/ui/sidebar.tsx", functionName: "SidebarMenu" },
      { fileName: "src/components/ui/sidebar.tsx", functionName: "SidebarMenu" },
      { fileName: "src/app/page.tsx", functionName: "Page" },
    ]);

    const sidebarLineCount = result.text
      .split("\n")
      .filter((line) => line.includes("SidebarMenu")).length;
    expect(sidebarLineCount).toBe(1);
    expect(result.text).toContain("app/page.tsx");
  });

  it("keeps non-consecutive repeats of the same line", () => {
    const result = formatStackContext([
      { fileName: "src/components/ui/card.tsx", functionName: "Card" },
      { fileName: "src/app/section.tsx", functionName: "Section" },
      { fileName: "src/components/ui/card.tsx", functionName: "Card" },
    ]);

    const cardLineCount = result.text.split("\n").filter((line) => line.includes("in Card")).length;
    expect(cardLineCount).toBe(2);
  });

  it("keeps the hard cap when maxLines is non-finite", () => {
    const stack: StackFrame[] = Array.from({ length: 40 }, (_unused, index) => ({
      fileName: `src/app/feature-${index}.tsx`,
      functionName: `Feature${index}`,
    }));

    for (const invalidMaxLines of [Number.NaN, Number.POSITIVE_INFINITY, -5]) {
      const result = formatStackContext(stack, { maxLines: invalidMaxLines });
      const lines = result.text.split("\n").filter(Boolean);
      expect(lines.length).toBeLessThanOrEqual(MAX_TRACE_CONTEXT_LINES);
    }
  });

  it("falls back to the default budget when maxLines is NaN", () => {
    const stack: StackFrame[] = [
      { fileName: "src/app/a.tsx", functionName: "A" },
      { fileName: "src/app/b.tsx", functionName: "B" },
      { fileName: "src/app/c.tsx", functionName: "C" },
      { fileName: "src/app/d.tsx", functionName: "D" },
    ];

    const result = formatStackContext(stack, { maxLines: Number.NaN });
    expect(result.text.split("\n").filter(Boolean)).toHaveLength(3);
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

  it("reports when no high-signal stack frame was rendered", () => {
    const libraryOnly = formatStackContext([packageFrame], {}, fiberSource);
    expect(libraryOnly.hasBudgetedStackFrame).toBe(false);

    const withAppFrame = formatStackContext([appFrame], {}, fiberSource);
    expect(withAppFrame.hasBudgetedStackFrame).toBe(true);
  });

  it("collects rendered component names for downstream deduplication", () => {
    const result = formatStackContext([packageFrame, appFrame], {}, fiberSource);

    expect(result.renderedComponentNames.has("Page")).toBe(true);
    expect(result.renderedComponentNames.has("Tabs")).toBe(true);
    expect(result.renderedComponentNames.has("Widget")).toBe(true);
  });
});
