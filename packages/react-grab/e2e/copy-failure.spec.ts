import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";

interface ErrorViewSnapshot {
  role: string | null;
  text: string;
  hasRetry: boolean;
  hasOk: boolean;
}

test.describe("Copy failure feedback", () => {
  test("renders the error view with the failure message when the synchronous copy fails", async ({
    reactGrab,
  }) => {
    // copyContent() reports success/failure straight from execCommand("copy");
    // forcing it to return false drives the grab into its error feedback path.
    await reactGrab.page.evaluate(() => {
      document.execCommand = () => false;
    });

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");

    // Snapshot the error view the moment it mounts — the label auto-fades after
    // ~1.5s, so capture state inside waitForFunction rather than in a later read.
    const snapshotHandle = await reactGrab.page.waitForFunction(
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
    const snapshot = (await snapshotHandle.jsonValue()) as ErrorViewSnapshot;

    expect(snapshot.role).toBe("alert");
    expect(snapshot.text).toContain("Failed to copy");
    // The orchestrator never wires onRetry/onAcknowledgeError, so the action
    // buttons stay hidden and only the message renders.
    expect(snapshot.hasRetry).toBe(false);
    expect(snapshot.hasOk).toBe(false);
  });

  test("marks a label instance as errored when the copy fails", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => {
      document.execCommand = () => false;
    });

    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("li");
    await reactGrab.clickElement("li");

    await expect
      .poll(
        async () => {
          const instances = await reactGrab.getLabelInstancesInfo();
          return instances.some((instance) => instance.status === "error");
        },
        { timeout: 5000 },
      )
      .toBe(true);
  });
});
