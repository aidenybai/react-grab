import { by, device, element, expect } from "detox";
import { CENTER_DIVISOR } from "./constants";

describe("native app contract", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it("renders the fixture app", async () => {
    await expect(element(by.id("native-harness-title"))).toHaveText("React Grab Native Harness");
    await expect(element(by.id("native-runtime"))).toHaveText(
      process.env.NATIVE_RUNTIME ?? "unknown",
    );
    await expect(element(by.id("counter-value"))).toHaveText("0");
  });

  it("handles native interaction", async () => {
    await element(by.id("increment-counter")).tap();
    await element(by.id("increment-counter")).tap();
    await expect(element(by.id("counter-value"))).toHaveText("2");
  });

  it("selects a registered host target without React metadata", async () => {
    const targetAttributes = await element(by.id("counter-fixture-target")).getAttributes();
    if (!("frame" in targetAttributes)) throw new Error("Target frame is unavailable");

    await element(by.id("react-grab-native-toggle")).tap();
    const selectionLayer = element(by.id("react-grab-native-selection-layer"));
    const selectionLayerAttributes = await selectionLayer.getAttributes();
    if (!("frame" in selectionLayerAttributes))
      throw new Error("Selection layer frame is unavailable");

    await selectionLayer.tap({
      x:
        targetAttributes.frame.x -
        selectionLayerAttributes.frame.x +
        targetAttributes.frame.width / CENTER_DIVISOR,
      y:
        targetAttributes.frame.y -
        selectionLayerAttributes.frame.y +
        targetAttributes.frame.height / CENTER_DIVISOR,
    });

    await expect(element(by.id("react-grab-native-highlight"))).toExist();
    await expect(element(by.id("react-grab-native-selection"))).toHaveText(
      "counter-fixture-target",
    );
    await element(by.id("react-grab-native-close")).tap();
  });
});
