import { describe, expect, it } from "vite-plus/test";
import { isUsefulComponentName } from "../src/utils/is-useful-component-name.js";

describe("isUsefulComponentName", () => {
  it.each(["<anonymous>", "Anonymous", "<unknown>", "Unknown"])(
    "filters the placeholder component name %s",
    (componentName) => {
      expect(isUsefulComponentName(componentName)).toBe(false);
    },
  );

  it("filters generated context providers with a duplicated Provider suffix", () => {
    expect(isUsefulComponentName("TooltipProviderProvider")).toBe(false);
  });

  it.each(["ThemeContext.Consumer", "Theme.Context", "ThemeContext.Provider"])(
    "filters the React context wrapper %s",
    (componentName) => {
      expect(isUsefulComponentName(componentName)).toBe(false);
    },
  );

  it.each([
    "Slot",
    "SlotClone",
    "CollectionSlot.Slot",
    "CollectionSlot.SlotClone",
    "TooltipContent.Slottable",
  ])("filters the slot wrapper %s", (componentName) => {
    expect(isUsefulComponentName(componentName)).toBe(false);
  });

  it.each(["TooltipProvider", "SlotMachine", "AnonymousForm"])(
    "keeps the authored component name %s",
    (componentName) => {
      expect(isUsefulComponentName(componentName)).toBe(true);
    },
  );

  it.each(["ErrorBoundary", "Head", "LinkComponent", "LoadingBoundary", "Router"])(
    "keeps the authored component name %s outside Next.js",
    (componentName) => {
      expect(isUsefulComponentName(componentName)).toBe(true);
    },
  );

  it.each(["ErrorBoundary", "Head", "LinkComponent", "LoadingBoundary", "Router"])(
    "filters the Next.js internal component name %s in a Next.js project",
    (componentName) => {
      expect(isUsefulComponentName(componentName, true)).toBe(false);
    },
  );
});
