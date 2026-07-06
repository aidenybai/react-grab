import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";

interface ErrorViewSnapshot {
  role: string | null;
  text: string;
  hasRetry: boolean;
  hasOk: boolean;
}

const readErrorView = async (reactGrab: {
  page: import("@playwright/test").Page;
}): Promise<ErrorViewSnapshot | null> => {
  const handle = await reactGrab.page.waitForFunction(
    (attrName): ErrorViewSnapshot | false => {
      const host = document.querySelector(`[${attrName}]`);
      const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
      const errorElement = root?.querySelector("[data-react-grab-error]");
      if (!errorElement) return false;
      return {
        role: errorElement.getAttribute("role"),
        text: errorElement.textContent?.trim() ?? "",
        hasRetry: Boolean(root?.querySelector("[data-react-grab-retry]")),
        hasOk: Boolean(root?.querySelector("[data-react-grab-error-ok]")),
      };
    },
    ATTRIBUTE_NAME,
    { timeout: 5000 },
  );
  return handle.jsonValue() as Promise<ErrorViewSnapshot>;
};

const clickErrorButton = async (
  reactGrab: { page: import("@playwright/test").Page },
  buttonAttribute: string,
): Promise<void> => {
  await reactGrab.page.evaluate(
    ({ attrName, target }) => {
      const host = document.querySelector(`[${attrName}]`);
      const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
      const button = root?.querySelector<HTMLButtonElement>(`[${target}]`);
      if (!button) throw new Error(`Error button [${target}] not found`);
      button.click();
    },
    { attrName: ATTRIBUTE_NAME, target: buttonAttribute },
  );
};

const isErrorViewGone = (reactGrab: { page: import("@playwright/test").Page }) =>
  reactGrab.page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
    return !root?.querySelector("[data-react-grab-error]");
  }, ATTRIBUTE_NAME);

const forceCopyResult = (
  reactGrab: { page: import("@playwright/test").Page },
  shouldSucceed: boolean,
) =>
  reactGrab.page.evaluate((succeed) => {
    document.execCommand = () => succeed;
  }, shouldSucceed);

test.describe("Copy failure feedback", () => {
  test("renders the error view with the failure message and action buttons", async ({
    reactGrab,
  }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");

    const snapshot = await readErrorView(reactGrab);
    expect(snapshot?.role).toBe("alert");
    expect(snapshot?.text).toContain("Failed to copy");
    expect(snapshot?.hasRetry).toBe(true);
    expect(snapshot?.hasOk).toBe(true);
  });

  test("Retry re-runs the copy and clears the error once it succeeds", async ({ reactGrab }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);

    // The next copy attempt should succeed, so Retry clears the error.
    await forceCopyResult(reactGrab, true);
    await clickErrorButton(reactGrab, "data-react-grab-retry");

    await expect.poll(() => isErrorViewGone(reactGrab), { timeout: 5000 }).toBe(true);
    const instances = await reactGrab.getLabelInstancesInfo();
    expect(instances.some((instance) => instance.status === "error")).toBe(false);
  });

  test("Retry runs the full copy lifecycle so the overlay is not left stuck copying", async ({
    reactGrab,
  }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);

    await forceCopyResult(reactGrab, true);
    await clickErrorButton(reactGrab, "data-react-grab-retry");

    await expect.poll(() => isErrorViewGone(reactGrab), { timeout: 5000 }).toBe(true);
    // A recovered copy must complete like a first-try success: the state
    // machine leaves the copying state instead of stalling in it.
    await expect
      .poll(async () => (await reactGrab.getState()).isCopying, { timeout: 5000 })
      .toBe(false);
  });

  test("keeps the error label visible past the success-label fade window", async ({
    reactGrab,
  }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);

    // A copied label fades after ~1.5s; an actionable error must outlast it.
    await reactGrab.page.waitForTimeout(2000);

    expect(await isErrorViewGone(reactGrab)).toBe(false);
    const instances = await reactGrab.getLabelInstancesInfo();
    expect(instances.some((instance) => instance.status === "error")).toBe(true);
  });

  test("Ok dismisses the error label", async ({ reactGrab }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);

    await clickErrorButton(reactGrab, "data-react-grab-error-ok");

    await expect.poll(() => isErrorViewGone(reactGrab), { timeout: 5000 }).toBe(true);
    const instances = await reactGrab.getLabelInstancesInfo();
    expect(instances.some((instance) => instance.status === "error")).toBe(false);
  });
});
