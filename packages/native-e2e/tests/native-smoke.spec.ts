import { by, device, element, expect } from "detox";

describe("Expo native harness", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("renders the fixture app", async () => {
    await expect(element(by.id("native-harness-title"))).toHaveText("React Grab Native Harness");
    await expect(element(by.id("counter-value"))).toHaveText("0");
  });

  it("handles native interaction", async () => {
    await element(by.id("increment-counter")).tap();
    await element(by.id("increment-counter")).tap();
    await expect(element(by.id("counter-value"))).toHaveText("2");
  });
});
