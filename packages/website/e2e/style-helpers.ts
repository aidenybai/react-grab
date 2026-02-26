import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export const getStyleProperty = async (
  locator: Locator,
  propertyName: string,
): Promise<string> =>
  locator.evaluate(
    (element, requestedPropertyName) =>
      getComputedStyle(element).getPropertyValue(requestedPropertyName),
    propertyName,
  );

export const expectVisibleFocusRing = async (locator: Locator) => {
  await locator.focus();
  const boxShadow = await getStyleProperty(locator, "box-shadow");
  expect(boxShadow).not.toBe("none");
};
