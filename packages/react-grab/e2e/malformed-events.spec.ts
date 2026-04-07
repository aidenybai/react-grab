import { test, expect } from "./fixtures.js";

const collectPageErrors = (page: import("@playwright/test").Page): Error[] => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
};

const dispatchMalformedEvent = async (
  page: import("@playwright/test").Page,
  eventType: string,
  constructorName: string,
  eventInit: Record<string, unknown>,
  propertyOverrides: Record<string, unknown>,
) => {
  await page.evaluate(
    ({ eventType, constructorName, eventInit, propertyOverrides }) => {
      const EventClass = {
        KeyboardEvent,
        PointerEvent,
        MouseEvent,
      }[constructorName];
      if (!EventClass) throw new Error(`Unknown event constructor: ${constructorName}`);
      const event = new EventClass(eventType, {
        bubbles: true,
        cancelable: true,
        ...eventInit,
      });
      for (const [propertyName, value] of Object.entries(propertyOverrides)) {
        Object.defineProperty(event, propertyName, { value });
      }
      window.dispatchEvent(event);
    },
    { eventType, constructorName, eventInit, propertyOverrides },
  );
};

test.describe("Malformed Events", () => {
  test.describe("Keyboard: undefined code", () => {
    test("should not crash on keydown with undefined code", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on keydown with undefined code and modifier keys", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", metaKey: true },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true, shiftKey: true },
        { code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on keyup with undefined code", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keyup",
        "KeyboardEvent",
        { key: "c" },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keyup",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash when typing in input with undefined code events", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.page.click("[data-testid='test-input']");
      await reactGrab.page.keyboard.type("hello", { delay: 10 });

      for (const keyValue of ["c", "a", "e", "Enter"]) {
        await dispatchMalformedEvent(
          reactGrab.page,
          "keydown",
          "KeyboardEvent",
          { key: keyValue },
          { code: undefined },
        );
      }
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Keyboard: null and empty code", () => {
    test("should not crash on keydown with null code", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: null },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: null },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on keydown with empty string code", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: "" },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: "" },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Keyboard: undefined key", () => {
    test("should not crash on keydown with undefined key and code", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        {},
        { key: undefined, code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { ctrlKey: true },
        { key: undefined, code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Keyboard: while activated", () => {
    test("should not crash on malformed events while overlay is active", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", metaKey: true },
        { code: null },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keyup",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should not crash on malformed events during element hover", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "Escape" },
        { code: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Pointer: malformed properties", () => {
    test("should not crash on pointermove with undefined clientX/clientY", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "pointermove",
        "PointerEvent",
        { isPrimary: true },
        { clientX: undefined, clientY: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on pointermove with undefined pointerType", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "pointermove",
        "PointerEvent",
        { isPrimary: true, clientX: 100, clientY: 100 },
        { pointerType: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on pointerdown with undefined properties", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "pointerdown",
        "PointerEvent",
        { isPrimary: true, button: 0 },
        { clientX: undefined, clientY: undefined, pointerType: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on pointerup with undefined properties", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await dispatchMalformedEvent(
        reactGrab.page,
        "pointerup",
        "PointerEvent",
        { isPrimary: true, button: 0 },
        { clientX: undefined, clientY: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should not crash on contextmenu with undefined clientX/clientY", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.activate();

      await dispatchMalformedEvent(
        reactGrab.page,
        "contextmenu",
        "MouseEvent",
        {},
        { clientX: undefined, clientY: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Pointer: while activated", () => {
    test("should not crash on malformed pointer events while overlay is active", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.activate();

      await dispatchMalformedEvent(
        reactGrab.page,
        "pointermove",
        "PointerEvent",
        { isPrimary: true },
        { clientX: undefined, clientY: undefined, pointerType: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "pointerdown",
        "PointerEvent",
        { isPrimary: true, button: 0 },
        { clientX: undefined, clientY: undefined, pointerId: undefined },
      );
      await dispatchMalformedEvent(
        reactGrab.page,
        "pointerup",
        "PointerEvent",
        { isPrimary: true, button: 0 },
        { clientX: undefined, clientY: undefined },
      );
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe("Rapid malformed events", () => {
    test("should handle burst of malformed keydown events", async ({ reactGrab }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.page.evaluate(() => {
        for (let index = 0; index < 20; index++) {
          const event = new KeyboardEvent("keydown", {
            key: "c",
            bubbles: true,
            cancelable: true,
            ctrlKey: index % 2 === 0,
          });
          Object.defineProperty(event, "code", { value: undefined });
          window.dispatchEvent(event);
        }
      });

      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });

    test("should handle interleaved normal and malformed events without corrupting state", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.page.click("[data-testid='test-input']");
      await reactGrab.page.keyboard.type("abc", { delay: 10 });

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c" },
        { code: undefined },
      );

      await reactGrab.page.keyboard.type("def", { delay: 10 });

      await dispatchMalformedEvent(
        reactGrab.page,
        "keydown",
        "KeyboardEvent",
        { key: "c", ctrlKey: true },
        { code: null },
      );

      await reactGrab.page.keyboard.type("ghi", { delay: 10 });
      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);

      const inputValue = await reactGrab.page.inputValue("[data-testid='test-input']");
      expect(inputValue).toBe("abcdefghi");
    });

    test("should handle burst of mixed malformed keyboard and pointer events", async ({
      reactGrab,
    }) => {
      const errors = collectPageErrors(reactGrab.page);

      await reactGrab.page.evaluate(() => {
        for (let index = 0; index < 10; index++) {
          const keyEvent = new KeyboardEvent("keydown", {
            key: "c",
            bubbles: true,
            cancelable: true,
          });
          Object.defineProperty(keyEvent, "code", { value: undefined });
          window.dispatchEvent(keyEvent);

          const pointerEvent = new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            isPrimary: true,
          });
          Object.defineProperty(pointerEvent, "clientX", { value: undefined });
          Object.defineProperty(pointerEvent, "clientY", { value: undefined });
          Object.defineProperty(pointerEvent, "pointerType", { value: undefined });
          window.dispatchEvent(pointerEvent);
        }
      });

      await reactGrab.page.waitForTimeout(50);

      expect(errors).toHaveLength(0);
    });
  });
});
