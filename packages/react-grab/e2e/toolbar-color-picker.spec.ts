import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

const PICKED_COLOR_HEX = "#1a2b3c";
const COLOR_PICKER_BUTTON_SELECTOR = '[data-react-grab-toolbar-action="color-picker"]';

const waitForToolbar = async (reactGrab: ReactGrabPageObject) => {
  await expect.poll(() => reactGrab.isToolbarVisible(), { timeout: 2000 }).toBe(true);
};

const stubEyeDropper = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.page.addInitScript((hex) => {
    class FakeEyeDropper {
      open() {
        return Promise.resolve({ sRGBHex: hex });
      }
    }
    (window as unknown as { EyeDropper: typeof FakeEyeDropper }).EyeDropper = FakeEyeDropper;
  }, PICKED_COLOR_HEX);
  await reactGrab.page.reload({ waitUntil: "domcontentloaded" });
  await reactGrab.page.waitForFunction(
    () => (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
    undefined,
    { timeout: 5000 },
  );
  await waitForToolbar(reactGrab);
};

const clickColorPicker = async (reactGrab: ReactGrabPageObject) => {
  await reactGrab.page.locator(COLOR_PICKER_BUTTON_SELECTOR).first().click();
};

test.describe("Toolbar color picker", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await stubEyeDropper(reactGrab);
  });

  test("renders the color picker button when the EyeDropper API is supported", async ({
    reactGrab,
  }) => {
    expect(await reactGrab.getToolbarActionPressed("color-picker")).toBe(false);
  });

  test("copies the picked color to the clipboard", async ({ reactGrab }) => {
    const clipboardWritesPromise = reactGrab.captureNextClipboardWrites();
    await clickColorPicker(reactGrab);
    const clipboardWrites = await clipboardWritesPromise;

    expect(clipboardWrites["text/plain"]).toBe(PICKED_COLOR_HEX.toUpperCase());
  });

  test("does not enter selection mode when picking a color", async ({ reactGrab }) => {
    await clickColorPicker(reactGrab);

    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });
});
