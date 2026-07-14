import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { FreezeError } from "../src/errors.js";
import { freeze, isFreezeActive, unfreeze } from "../src/primitives.js";
import { freezeAnimations } from "../src/utils/freeze-animations.js";
import {
  freezeGlobalInteractions,
  unfreezeGlobalInteractions,
} from "../src/utils/freeze-global-interactions.js";
import { freezeUpdatesOrThrow } from "../src/utils/freeze-updates.js";

vi.mock("../src/utils/freeze-animations.js", () => ({
  freezeAnimations: vi.fn(),
}));

vi.mock("../src/utils/freeze-global-interactions.js", () => ({
  freezeGlobalInteractions: vi.fn(),
  unfreezeGlobalInteractions: vi.fn(),
}));

vi.mock("../src/utils/freeze-updates.js", () => ({
  freezeUpdatesOrThrow: vi.fn(),
}));

const createElement = (): Element => Object.create(null);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(freezeUpdatesOrThrow).mockReturnValue(() => {});
  vi.mocked(freezeAnimations).mockReturnValue(() => {});
});

afterEach(() => {
  unfreeze();
  vi.restoreAllMocks();
});

describe("freeze", () => {
  it("commits after setup and cleans up in reverse order", () => {
    const calls: string[] = [];
    vi.mocked(freezeUpdatesOrThrow).mockImplementation(() => {
      calls.push("freeze updates");
      return () => calls.push("unfreeze updates");
    });
    vi.mocked(freezeGlobalInteractions).mockImplementation(() => {
      calls.push("freeze interactions");
    });
    vi.mocked(unfreezeGlobalInteractions).mockImplementation(() => {
      calls.push("unfreeze interactions");
    });
    vi.mocked(freezeAnimations).mockImplementation((elements) => {
      calls.push(elements.length === 0 ? "unfreeze animations" : "freeze animations");
      return () => {};
    });

    freeze([createElement()]);
    expect(isFreezeActive()).toBe(true);
    unfreeze();

    expect(calls).toEqual([
      "freeze updates",
      "freeze interactions",
      "freeze animations",
      "unfreeze animations",
      "unfreeze interactions",
      "unfreeze updates",
    ]);
    expect(isFreezeActive()).toBe(false);
  });

  it("rolls back acquired layers when setup fails", () => {
    const calls: string[] = [];
    vi.mocked(freezeUpdatesOrThrow).mockReturnValue(() => calls.push("unfreeze updates"));
    vi.mocked(freezeGlobalInteractions).mockImplementation(() => {
      throw new Error("interactions failed");
    });
    vi.mocked(unfreezeGlobalInteractions).mockImplementation(() => {
      calls.push("unfreeze interactions");
    });

    expect(() => freeze([createElement()])).toThrow(FreezeError);

    expect(calls).toEqual(["unfreeze interactions", "unfreeze updates"]);
    expect(isFreezeActive()).toBe(false);
  });

  it("keeps an active freeze as one idempotent session", () => {
    const element = createElement();

    freeze([element]);
    freeze([element]);

    expect(freezeUpdatesOrThrow).toHaveBeenCalledOnce();
    expect(freezeGlobalInteractions).toHaveBeenCalledOnce();
    expect(freezeAnimations).toHaveBeenCalledOnce();
    expect(isFreezeActive()).toBe(true);
  });

  it("honors unfreeze requested during setup", () => {
    const calls: string[] = [];
    vi.mocked(freezeUpdatesOrThrow).mockReturnValue(() => calls.push("unfreeze updates"));
    vi.mocked(unfreezeGlobalInteractions).mockImplementation(() => {
      calls.push("unfreeze interactions");
    });
    vi.mocked(freezeAnimations).mockImplementation((elements) => {
      if (elements.length > 0) {
        unfreeze();
        return () => {};
      }
      calls.push("unfreeze animations");
      return () => {};
    });

    freeze([createElement()]);

    expect(calls).toEqual(["unfreeze animations", "unfreeze interactions", "unfreeze updates"]);
    expect(isFreezeActive()).toBe(false);
  });

  it("does not reenter a cleanup", () => {
    let animationCleanupAttempts = 0;
    vi.mocked(freezeAnimations).mockImplementation((elements) => {
      if (elements.length > 0) return () => {};
      animationCleanupAttempts += 1;
      unfreeze();
      return () => {};
    });

    freeze([createElement()]);
    unfreeze();

    expect(animationCleanupAttempts).toBe(1);
    expect(isFreezeActive()).toBe(false);
  });

  it("attempts every cleanup and retries failures", () => {
    const calls: string[] = [];
    let animationCleanupAttempts = 0;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(freezeUpdatesOrThrow).mockReturnValue(() => calls.push("unfreeze updates"));
    vi.mocked(unfreezeGlobalInteractions).mockImplementation(() => {
      calls.push("unfreeze interactions");
    });
    vi.mocked(freezeAnimations).mockImplementation((elements) => {
      if (elements.length > 0) return () => {};
      calls.push("unfreeze animations");
      animationCleanupAttempts += 1;
      if (animationCleanupAttempts === 1) throw new Error("animation cleanup failed");
      return () => {};
    });

    freeze([createElement()]);
    unfreeze();

    expect(calls).toEqual(["unfreeze animations", "unfreeze interactions", "unfreeze updates"]);
    expect(warning).toHaveBeenCalledOnce();
    expect(isFreezeActive()).toBe(true);

    unfreeze();

    expect(calls).toEqual([
      "unfreeze animations",
      "unfreeze interactions",
      "unfreeze updates",
      "unfreeze animations",
    ]);
    expect(isFreezeActive()).toBe(false);
  });
});
