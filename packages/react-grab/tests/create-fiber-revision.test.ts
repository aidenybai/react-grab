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

    expect(createFiberRevision(fiber, 1).matches(fiber, 1)).toBe(true);
  });

  it("invalidates when React refreshes source metadata on a preserved fiber", () => {
    const fiber: FiberRevisionSource = {
      _debugSource: { fileName: "button.tsx" },
      _debugStack: new Error(),
      actualStartTime: 1,
    };
    const revision = createFiberRevision(fiber, 1);

    fiber._debugSource = { fileName: "updated-button.tsx" };

    expect(revision.matches(fiber, 1)).toBe(false);
  });

  it("invalidates when React changes the debug owner on a preserved fiber", () => {
    const fiber: FiberRevisionSource = {
      _debugOwner: { type: "OriginalOwner" },
      actualStartTime: 1,
    };
    const revision = createFiberRevision(fiber, 1);

    fiber._debugOwner = { type: "UpdatedOwner" };

    expect(revision.matches(fiber, 1)).toBe(false);
  });

  it("matches alternate fibers and render times when source metadata is unchanged", () => {
    const debugOwner = { type: "Owner" };
    const debugSource = { fileName: "button.tsx" };
    const debugStack = new Error();
    const fiber: FiberRevisionSource = {
      _debugOwner: debugOwner,
      _debugSource: debugSource,
      _debugStack: debugStack,
      actualStartTime: 1,
    };
    const revision = createFiberRevision(fiber, 1);

    expect(
      revision.matches(
        {
          _debugOwner: debugOwner,
          _debugSource: debugSource,
          _debugStack: debugStack,
          actualStartTime: 2,
        },
        1,
      ),
    ).toBe(true);
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
    const revision = createFiberRevision(fiber, 1);

    expect(revision.matches(fiber, 2)).toBe(false);
  });
});
