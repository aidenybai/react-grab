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

const focusErrorButton = async (
  reactGrab: { page: import("@playwright/test").Page },
  buttonAttribute: string,
): Promise<void> => {
  await reactGrab.page.evaluate(
    ({ attrName, target }) => {
      const host = document.querySelector(`[${attrName}]`);
      const root = host?.shadowRoot?.querySelector(`[${attrName}]`);
      const button = root?.querySelector<HTMLButtonElement>(`[${target}]`);
      if (!button) throw new Error(`Error button [${target}] not found`);
      button.focus();
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

  test("deactivation cancels a pending retry without restoring its error label", async ({
    reactGrab,
  }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);

    await reactGrab.page.evaluate(() => {
      const testWindow = window as {
        __REACT_GRAB__?: {
          registerPlugin: (plugin: {
            name: string;
            options: { getContent: () => Promise<string> };
          }) => void;
        };
        __TEST_RETRY_CONTENT_REQUESTED__?: boolean;
        __TEST_RETRY_COPY_COMMAND_COUNT__?: number;
        __TEST_RESOLVE_RETRY_CONTENT__?: (content: string) => void;
      };
      const api = testWindow.__REACT_GRAB__;
      if (!api) throw new Error("React Grab API unavailable");

      let resolveContent = (_content: string): void => {};
      const content = new Promise<string>((resolve) => {
        resolveContent = resolve;
      });
      api.registerPlugin({
        name: "pending-retry-test",
        options: {
          getContent: () => {
            testWindow.__TEST_RETRY_CONTENT_REQUESTED__ = true;
            return content;
          },
        },
      });
      testWindow.__TEST_RESOLVE_RETRY_CONTENT__ = resolveContent;
      testWindow.__TEST_RETRY_COPY_COMMAND_COUNT__ = 0;
      document.execCommand = () => {
        testWindow.__TEST_RETRY_COPY_COMMAND_COUNT__ =
          (testWindow.__TEST_RETRY_COPY_COMMAND_COUNT__ ?? 0) + 1;
        return true;
      };
    });

    await clickErrorButton(reactGrab, "data-react-grab-retry");
    await expect
      .poll(() =>
        reactGrab.page.evaluate(
          () =>
            (window as { __TEST_RETRY_CONTENT_REQUESTED__?: boolean })
              .__TEST_RETRY_CONTENT_REQUESTED__,
        ),
      )
      .toBe(true);

    await reactGrab.deactivate();
    await expect.poll(() => reactGrab.getLabelInstancesInfo()).toEqual([]);
    await reactGrab.page.evaluate(async () => {
      (
        window as {
          __TEST_RESOLVE_RETRY_CONTENT__?: (content: string) => void;
        }
      ).__TEST_RESOLVE_RETRY_CONTENT__?.("late retry content");
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(await reactGrab.getLabelInstancesInfo()).toEqual([]);
    expect(
      await reactGrab.page.evaluate(
        () =>
          (window as { __TEST_RETRY_COPY_COMMAND_COUNT__?: number })
            .__TEST_RETRY_COPY_COMMAND_COUNT__,
      ),
    ).toBe(0);
  });

  test("a failed copy that keeps the overlay open leaves the copying state", async ({
    reactGrab,
  }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    // Modifier-click keeps the overlay active after the copy, which is the
    // path that used to strand the state machine in "copying" on failure.
    await reactGrab.page
      .locator("li")
      .first()
      .click({ force: true, modifiers: ["ControlOrMeta"] });
    await readErrorView(reactGrab);

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

  test("Enter on the focused Ok button acknowledges instead of retrying", async ({ reactGrab }) => {
    await forceCopyResult(reactGrab, false);

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");
    await readErrorView(reactGrab);
    await focusErrorButton(reactGrab, "data-react-grab-error-ok");
    await expect.poll(() => isErrorViewGone(reactGrab)).toBe(false);

    await reactGrab.page.keyboard.press("Enter");

    await expect.poll(() => isErrorViewGone(reactGrab), { timeout: 5000 }).toBe(true);
  });
});
