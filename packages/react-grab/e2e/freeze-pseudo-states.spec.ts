import { expect, test } from "./fixtures.js";

test("preserves unrelated inline style writes made while frozen", async ({ reactGrab }) => {
  const targetElement = reactGrab.page.locator("li").first();
  await targetElement.evaluate((element) => {
    element.style.setProperty("background-color", "rgb(1, 2, 3)", "important");
  });
  await targetElement.hover();
  await reactGrab.activate();

  await targetElement.evaluate((element) => {
    element.style.setProperty("background-color", "rgb(4, 5, 6)");
    element.style.setProperty("--page-owned-state", "updated");
    element.style.setProperty("margin-top", "7px");
  });
  await reactGrab.deactivate();

  await expect
    .poll(() =>
      targetElement.evaluate((element) => ({
        backgroundColor: element.style.getPropertyValue("background-color"),
        backgroundColorPriority: element.style.getPropertyPriority("background-color"),
        pageOwnedState: element.style.getPropertyValue("--page-owned-state"),
        marginTop: element.style.getPropertyValue("margin-top"),
      })),
    )
    .toEqual({
      backgroundColor: "rgb(1, 2, 3)",
      backgroundColorPriority: "important",
      pageOwnedState: "updated",
      marginTop: "7px",
    });
});
