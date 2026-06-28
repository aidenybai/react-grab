import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

// Covers react-grab's freeze dispatcher patching for hooks beyond useState. The
// FreezeHookHarness fixture exposes a useReducer, useTransition,
// useSyncExternalStore, and context-backed counter; each holds its displayed
// value while the page is frozen (prompt mode) and resumes afterwards. This
// drives the freeze-updates.ts pause/resume paths the useState-only
// freeze-updates.spec never reaches, notably context-dependency pause/resume.

const FREEZE_TARGET = "[data-testid='dynamic-element-1']";

// Async React work scheduled by a click needs a beat to (not) commit before we
// read, so the freeze-hold assertion can actually catch a leaked update and the
// post-unfreeze baseline is stable. Mirrors freeze-updates.spec's settle waits.
const FREEZE_SETTLE_MS = 150;

const readCount = async (reactGrab: ReactGrabPageObject, testId: string): Promise<number> => {
  const text = await reactGrab.page.locator(`[data-testid='${testId}']`).textContent();
  if (text === null) throw new Error(`Counter "${testId}" not found`);
  return Number(text.trim());
};

// While react-grab is active its overlay intercepts pointer events, so a real
// click would be swallowed. Dispatch a synthetic DOM click straight to the
// element instead, matching the approach in freeze-updates.spec.
const clickByTestId = async (reactGrab: ReactGrabPageObject, testId: string): Promise<void> => {
  await reactGrab.page.evaluate((id) => {
    const button = document.querySelector<HTMLElement>(`[data-testid='${id}']`);
    button?.click();
  }, testId);
};

// Verifies a hook-driven counter is frozen while the page is frozen, then bumps
// normally once unfrozen. `countTestId` shows the value; `incrementTestId` bumps
// it.
const assertFreezeHoldsThenResumes = async (
  reactGrab: ReactGrabPageObject,
  countTestId: string,
  incrementTestId: string,
): Promise<void> => {
  const before = await readCount(reactGrab, countTestId);

  await reactGrab.enterPromptMode(FREEZE_TARGET);
  await clickByTestId(reactGrab, incrementTestId);
  await clickByTestId(reactGrab, incrementTestId);
  await reactGrab.page.waitForTimeout(FREEZE_SETTLE_MS);

  // Frozen: the displayed value must not move while the page is frozen.
  expect(await readCount(reactGrab, countTestId)).toBe(before);

  await reactGrab.pressEscape();
  await reactGrab.deactivate();
  await reactGrab.page.waitForTimeout(FREEZE_SETTLE_MS);

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

  test("all hook counters stay frozen together during one freeze cycle", async ({ reactGrab }) => {
    const reducerBefore = await readCount(reactGrab, "reducer-count");
    const transitionBefore = await readCount(reactGrab, "transition-count");
    const storeBefore = await readCount(reactGrab, "store-count");
    const contextBefore = await readCount(reactGrab, "context-count");

    await reactGrab.enterPromptMode(FREEZE_TARGET);
    await clickByTestId(reactGrab, "reducer-increment");
    await clickByTestId(reactGrab, "transition-increment");
    await clickByTestId(reactGrab, "store-increment");
    await clickByTestId(reactGrab, "context-increment");
    await reactGrab.page.waitForTimeout(FREEZE_SETTLE_MS);

    expect(await readCount(reactGrab, "reducer-count")).toBe(reducerBefore);
    expect(await readCount(reactGrab, "transition-count")).toBe(transitionBefore);
    expect(await readCount(reactGrab, "store-count")).toBe(storeBefore);
    expect(await readCount(reactGrab, "context-count")).toBe(contextBefore);

    await reactGrab.pressEscape();
    await reactGrab.deactivate();
  });
});
