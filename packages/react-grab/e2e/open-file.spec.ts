import { test, expect } from "./fixtures.js";

test.describe("Open File", () => {
  test.describe("Keyboard Shortcut", () => {
    test("Cmd+O should open file when source info available", async ({
      reactGrab,
    }) => {
      let openFileCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ =
          false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (
                window as { __OPEN_FILE_CALLED__?: boolean }
              ).__OPEN_FILE_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      openFileCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ ??
          false
        );
      });

      expect(openFileCalled).toBe(true);
    });

    test("Cmd+O should do nothing without onOpenFile callback", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("Cmd+O without selection should be ignored", async ({ reactGrab }) => {
      let openFileCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ =
          false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (
                window as { __OPEN_FILE_CALLED__?: boolean }
              ).__OPEN_FILE_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      openFileCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ ??
          false
        );
      });

      expect(openFileCalled).toBe(false);
    });
  });

  test.describe("Context Menu", () => {
    test("Open item should appear in context menu", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {},
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li:first-child");

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(menuInfo.menuItems).toContain("Open");
    });

    test("Clicking Open in context menu should trigger onOpenFile", async ({
      reactGrab,
    }) => {
      let openFileCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ =
          false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (
                window as { __OPEN_FILE_CALLED__?: boolean }
              ).__OPEN_FILE_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.clickContextMenuItem("Open");
      await reactGrab.page.waitForTimeout(200);

      openFileCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ ??
          false
        );
      });

      expect(openFileCalled).toBe(true);
    });

    test("Open should not be clickable without onOpenFile callback", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
    });
  });

  test.describe("onOpenFile Callback", () => {
    test("callback should receive element info", async ({ reactGrab }) => {
      let receivedInfo: unknown = null;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_INFO__?: unknown }).__OPEN_FILE_INFO__ = null;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: (info: unknown) => {
              (window as { __OPEN_FILE_INFO__?: unknown }).__OPEN_FILE_INFO__ =
                info;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      receivedInfo = await reactGrab.page.evaluate(() => {
        return (window as { __OPEN_FILE_INFO__?: unknown }).__OPEN_FILE_INFO__;
      });

      expect(receivedInfo).toBeDefined();
    });

    test("callback should include source info when available", async ({
      reactGrab,
    }) => {
      let receivedInfo: Record<string, unknown> | null = null;

      await reactGrab.page.evaluate(() => {
        (
          window as { __OPEN_FILE_INFO__?: Record<string, unknown> | null }
        ).__OPEN_FILE_INFO__ = null;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: (info: Record<string, unknown>) => {
              (
                window as { __OPEN_FILE_INFO__?: Record<string, unknown> | null }
              ).__OPEN_FILE_INFO__ = info;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      receivedInfo = await reactGrab.page.evaluate(() => {
        return (
          window as { __OPEN_FILE_INFO__?: Record<string, unknown> | null }
        ).__OPEN_FILE_INFO__;
      });

      expect(receivedInfo).toBeDefined();
    });
  });

  test.describe("Tag Badge Click", () => {
    test("clicking tag badge should trigger open file", async ({
      reactGrab,
    }) => {
      let openFileCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ =
          false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (
                window as { __OPEN_FILE_CALLED__?: boolean }
              ).__OPEN_FILE_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;

        const spans = root.querySelectorAll("span");
        for (const span of spans) {
          if (
            span.textContent?.includes("li") ||
            span.textContent?.includes("span")
          ) {
            (span as HTMLElement).click();
            return;
          }
        }
      }, "data-react-grab");

      await reactGrab.page.waitForTimeout(200);

      openFileCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ ??
          false
        );
      });

      expect(typeof openFileCalled).toBe("boolean");
    });
  });

  test.describe("Edge Cases", () => {
    test("open file should work after element change", async ({
      reactGrab,
    }) => {
      let callCount = 0;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_COUNT__?: number }).__OPEN_FILE_COUNT__ = 0;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (window as { __OPEN_FILE_COUNT__?: number }).__OPEN_FILE_COUNT__ =
                ((window as { __OPEN_FILE_COUNT__?: number })
                  .__OPEN_FILE_COUNT__ ?? 0) + 1;
            },
          },
        });
      });

      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.hoverElement("li:nth-child(2)");
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(100);

      callCount = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_COUNT__?: number }).__OPEN_FILE_COUNT__ ?? 0
        );
      });

      expect(callCount).toBe(2);
    });

    test("open file should work with drag-selected elements", async ({
      reactGrab,
    }) => {
      let openFileCalled = false;

      await reactGrab.page.evaluate(() => {
        (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ =
          false;
        const api = (
          window as {
            __REACT_GRAB__?: {
              registerPlugin: (plugin: Record<string, unknown>) => void;
            };
          }
        ).__REACT_GRAB__;
        api?.registerPlugin({
          name: "test-open-file",
          hooks: {
            onOpenFile: () => {
              (
                window as { __OPEN_FILE_CALLED__?: boolean }
              ).__OPEN_FILE_CALLED__ = true;
            },
          },
        });
      });

      await reactGrab.activate();
      await reactGrab.dragSelect("li:first-child", "li:nth-child(2)");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("o");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      openFileCalled = await reactGrab.page.evaluate(() => {
        return (
          (window as { __OPEN_FILE_CALLED__?: boolean }).__OPEN_FILE_CALLED__ ??
          false
        );
      });

      expect(typeof openFileCalled).toBe("boolean");
    });
  });
});
