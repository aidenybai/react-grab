import { describe, expect, it } from "vite-plus/test";
import {
  createFiberRevision,
  type FiberRevisionSource,
} from "../src/utils/create-fiber-revision.js";

describe("createFiberRevision", () => {
  it("matches an unchanged fiber revision", () => {
    const fiber: FiberRevisionSource = {
      _debugSource: { fileName: "button.tsx" },
      _debugStack: new Error(),
      actualStartTime: 1,
    };

    expect(createFiberRevision(fiber).matches(fiber)).toBe(true);
  });

  it("invalidates when React refreshes source metadata on a preserved fiber", () => {
    const fiber: FiberRevisionSource = {
      _debugSource: { fileName: "button.tsx" },
      _debugStack: new Error(),
      actualStartTime: 1,
    };
    const revision = createFiberRevision(fiber);

    fiber._debugSource = { fileName: "updated-button.tsx" };

    expect(revision.matches(fiber)).toBe(false);
  });

  it("invalidates when React changes the debug owner on a preserved fiber", () => {
    const fiber: FiberRevisionSource = {
      _debugOwner: { type: "OriginalOwner" },
      actualStartTime: 1,
    };
    const revision = createFiberRevision(fiber);

    fiber._debugOwner = { type: "UpdatedOwner" };

    expect(revision.matches(fiber)).toBe(false);
  });

  it("matches alternate fibers and render times when source metadata is unchanged", () => {
    const debugOwner = { type: "Owner" };
    const debugSource = { fileName: "button.tsx" };
    const debugStack = new Error();
    const alternateFiber: FiberRevisionSource = {
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
      actualStartTime: 2,
    };
    const fiber: FiberRevisionSource = {
      alternate: alternateFiber,
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
      actualStartTime: 1,
    };
    alternateFiber.alternate = fiber;
    const revision = createFiberRevision(fiber);

    expect(revision.matches(alternateFiber)).toBe(true);
  });

  it("matches an alternate created after the revision", () => {
    const debugOwner = { type: "Owner" };
    const debugSource = { fileName: "button.tsx" };
    const debugStack = new Error();
    const fiber: FiberRevisionSource = {
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
    };
    const revision = createFiberRevision(fiber);
    const alternateFiber: FiberRevisionSource = {
      alternate: fiber,
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
    };
    fiber.alternate = alternateFiber;

    expect(revision.matches(alternateFiber)).toBe(true);
  });

  it("invalidates a replacement fiber with unchanged source metadata", () => {
    const debugOwner = { type: "Owner" };
    const debugSource = { fileName: "button.tsx" };
    const debugStack = new Error();
    const fiber: FiberRevisionSource = {
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
    };
    const revision = createFiberRevision(fiber);

    expect(
      revision.matches({
        _debugOwner: debugOwner,
        _debugSource: debugSource,
        _debugStack: debugStack,
      }),
    ).toBe(false);
  });
});
