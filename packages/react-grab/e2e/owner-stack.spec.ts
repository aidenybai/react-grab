import { expect, test, type ReactGrabPageObject } from "./fixtures.js";

const copyElementContext = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<string> => {
  const didCopy = await reactGrab.copyElementViaApi(selector);
  expect(didCopy).toBe(true);
  return reactGrab.getClipboardContent();
};

test.describe("React owner stack semantics", () => {
  test("resolves a directly rendered host element to its owner", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='direct-owner-target']");

    expect(context).toContain("DirectOwner");
  });

  test("uses the creator of passed children instead of the structural parent", async ({
    reactGrab,
  }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='passthrough-owner-target']");

    expect(context).toContain("PassthroughOwner");
    expect(context).not.toContain("StructuralWrapper");
  });

  test("uses a wrapper when the wrapper created the selected element", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='wrapper-owned-target']");

    expect(context).toContain("StructuralWrapper");
    expect(context.indexOf("StructuralWrapper")).toBeLessThan(context.indexOf("PassthroughOwner"));
  });

  test("preserves the original owner through cloneElement", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='clone-owner-target']");

    expect(context).toContain("CloneOwner");
    expect(context).not.toContain("CloningWrapper");
  });

  test("records the component rendering a render-prop result as owner", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='render-prop-owner-target']");

    expect(context).toContain("RenderPropWrapper");
  });

  test("keeps the component owner across a DOM portal", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='portal-owner-target']");

    expect(context).toContain("PortalOwner");
  });

  test("keeps memo output tied to its defining source", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='memo-owner-target']");

    expect(context).toContain("owner-stack-cases.tsx");
    expect(context).not.toContain("selector:");
  });

  test("keeps ownership through a fragment boundary", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='fragment-owner-target']");

    expect(context).toContain("FragmentOwner");
  });

  test("keeps ownership through a suspense boundary", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='suspense-owner-target']");

    expect(context).toContain("SuspenseOwner");
  });

  test("ignores a key when the child has no keyed sibling", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='single-key-target']");

    expect(context).not.toContain('key: "only"');
  });

  test("includes a key when the selected child has keyed siblings", async ({ reactGrab }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='list-key-target-second']");

    expect(context).toContain('key: "second"');
  });

  test("does not replace a deeply passed child's owner with repeated wrappers", async ({
    reactGrab,
  }) => {
    const context = await copyElementContext(reactGrab, "[data-testid='nested-button']");

    expect(context).toContain("DeeplyNested");
    expect(context).not.toContain("NestedCard");
  });
});
