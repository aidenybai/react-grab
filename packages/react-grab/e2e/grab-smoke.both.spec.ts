import { test, expect } from "./fixtures.js";

// A `.both.spec.ts` runs under both the chromium (Vite) and chromium-next
// projects, so this smoke proves react-grab activates and copies on either
// framework. Both fixture apps expose the same [data-testid="grab-smoke-target"].

const SMOKE_TARGET = '[data-testid="grab-smoke-target"]';

test("grabs the shared smoke target on this framework", async ({ reactGrab }) => {
  const didCopy = await reactGrab.copyElementViaApi(SMOKE_TARGET);
  expect(didCopy).toBe(true);

  // Let the OS clipboard settle before reading it back, matching the existing
  // copyElement specs (reading too eagerly races the synchronous copy event).
  await reactGrab.page.waitForTimeout(500);
  const clipboard = await reactGrab.getClipboardContent();
  expect(clipboard).toContain("Smoke target");
});
