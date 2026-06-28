import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

// Covers the freeze dispatcher patching for hooks beyond useState. The harness
// in the Vite fixture (FreezeHookHarness) bumps each value through a handler
// that bypasses useState, so a frozen page must HOLD the displayed value while
// frozen and resume normal updates once unfrozen. This drives the
// freeze-updates.ts pause/resume paths the useState-only freeze-updates.spec
// never reaches: useReducer / useTransition / useSyncExternalStore hook-queue
// pausing and (notably) context-dependency pause/resume.

const FREEZE_TARGET = "[data-testid='dynamic-element-1']";

const readCount = async (reactGrab: ReactGrabPageObject, testId: string): Promise<number> => {
  const text = await reactGrab.page.locator(`[data-testid='${testId}']`).textContent();
  return Number(text?.trim());
};

const clickByTestId = async (reactGrab: ReactGrabPageObject, testId: string): Promise<void> => {
  await reactGrab.page.evaluate((id) => {
    const button = document.querySelector(`[data-testid='${id}']`) as HTMLButtonElement | null;
    button?.click();
  }, testId);
};

// Verifies a hook-driven counter is frozen while the page is frozen, then bumps
// normally once unfrozen. `countTestId` shows the value; `incrementTestId` bumps
// it via a handler that does not go through useState.
const assertFreezeHoldsThenResumes = async (
  reactGrab: ReactGrabPageObject,
  countTestId: string,
  incrementTestId: string,
): Promise<void> => {
  const before = await readCount(reactGrab, countTestId);

  await reactGrab.enterPromptMode(FREEZE_TARGET);
  await clickByTestId(reactGrab, incrementTestId);
  await clickByTestId(reactGrab, incrementTestId);

  // Frozen: the displayed value must not move while the page is frozen.
  expect(await readCount(reactGrab, countTestId)).toBe(before);

  await reactGrab.pressEscape();
  await reactGrab.deactivate();

  // Unfrozen: a fresh bump increments from whatever value settled after
  // unfreeze, proving the hook queue was restored cleanly.
  const afterUnfreeze = await readCount(reactGrab, countTestId);
  await clickByTestId(reactGrab, incrementTestId);
  await expect.poll(() => readCount(reactGrab, countTestId)).toBe(afterUnfreeze + 1);
};

test.describe("Freeze Hook Buffering", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await reactGrab.registerCommentAction();
  });

  test("useReducer counter freezes then resumes", async ({ reactGrab }) => {
    await assertFreezeHoldsThenResumes(reactGrab, "reducer-count", "reducer-increment");
  });

  test("useTransition counter freezes then resumes", async ({ reactGrab }) => {
    await assertFreezeHoldsThenResumes(reactGrab, "transition-count", "transition-increment");
  });

  test("useSyncExternalStore counter freezes then resumes", async ({ reactGrab }) => {
    await assertFreezeHoldsThenResumes(reactGrab, "store-count", "store-increment");
  });

  test("context-consumer value freezes then resumes", async ({ reactGrab }) => {
    await assertFreezeHoldsThenResumes(reactGrab, "context-count", "context-increment");
  });

  test("all hook counters stay frozen together during a freeze cycle", async ({ reactGrab }) => {
    const reducerBefore = await readCount(reactGrab, "reducer-count");
    const transitionBefore = await readCount(reactGrab, "transition-count");
    const storeBefore = await readCount(reactGrab, "store-count");
    const contextBefore = await readCount(reactGrab, "context-count");

    await reactGrab.enterPromptMode(FREEZE_TARGET);
    await clickByTestId(reactGrab, "reducer-increment");
    await clickByTestId(reactGrab, "transition-increment");
    await clickByTestId(reactGrab, "store-increment");
    await clickByTestId(reactGrab, "context-increment");

    expect(await readCount(reactGrab, "reducer-count")).toBe(reducerBefore);
    expect(await readCount(reactGrab, "transition-count")).toBe(transitionBefore);
    expect(await readCount(reactGrab, "store-count")).toBe(storeBefore);
    expect(await readCount(reactGrab, "context-count")).toBe(contextBefore);

    await reactGrab.pressEscape();
    await reactGrab.deactivate();

    // After unfreeze every counter accepts a fresh update again.
    const reducerAfter = await readCount(reactGrab, "reducer-count");
    await clickByTestId(reactGrab, "reducer-increment");
    await expect.poll(() => readCount(reactGrab, "reducer-count")).toBe(reducerAfter + 1);
  });
});
