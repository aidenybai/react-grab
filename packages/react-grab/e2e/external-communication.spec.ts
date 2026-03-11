import { test, expect } from "@playwright/test";

test.describe("External Communication", () => {
  test("should skip external requests during initialization when disabled", async ({
    page,
  }) => {
    const requestedUrls: string[] = [];

    page.on("request", (request) => {
      const requestUrl = request.url();
      if (
        requestUrl.startsWith("https://www.react-grab.com/api/version") ||
        requestUrl.startsWith("https://fonts.googleapis.com/")
      ) {
        requestedUrls.push(requestUrl);
      }
    });

    await page.addInitScript(() => {
      (
        window as {
          __REACT_GRAB_OPTIONS__?: {
            allowExternalCommunication?: boolean;
          };
        }
      ).__REACT_GRAB_OPTIONS__ = {
        allowExternalCommunication: false,
      };
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
      { timeout: 5000 },
    );
    await page.waitForTimeout(300);

    expect(requestedUrls).toEqual([]);

    const hasFontLink = await page.evaluate(() => {
      return document.getElementById("react-grab-fonts") !== null;
    });

    expect(hasFontLink).toBe(false);
  });

  test("should not open a remote open-file fallback from the selection label when disabled", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (
        window as {
          __REACT_GRAB_OPTIONS__?: {
            allowExternalCommunication?: boolean;
          };
        }
      ).__REACT_GRAB_OPTIONS__ = {
        allowExternalCommunication: false,
      };
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__ !== undefined,
      { timeout: 5000 },
    );

    await page.evaluate(() => {
      (window as { __OPEN_FILE_URLS__?: string[] }).__OPEN_FILE_URLS__ = [];

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (
          requestUrl.includes("/__open-in-editor") ||
          requestUrl.includes("/__nextjs_launch-editor")
        ) {
          return new Response("", { status: 404 });
        }
        return originalFetch(input, init);
      };

      Object.defineProperty(window, "open", {
        configurable: true,
        value: (url?: string | URL) => {
          const openUrls =
            (window as { __OPEN_FILE_URLS__?: string[] }).__OPEN_FILE_URLS__ ??
            [];
          openUrls.push(typeof url === "string" ? url : String(url ?? ""));
          (window as { __OPEN_FILE_URLS__?: string[] }).__OPEN_FILE_URLS__ =
            openUrls;
          return null;
        },
      });
    });

    await page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            activate: () => void;
          };
        }
      ).__REACT_GRAB__;
      api?.activate();
    });
    await page.waitForFunction(
      () =>
        (
          window as {
            __REACT_GRAB__?: {
              isActive: () => boolean;
            };
          }
        ).__REACT_GRAB__?.isActive() === true,
      { timeout: 5000 },
    );

    const firstListItem = page.locator("li").first();
    await firstListItem.hover({ force: true });

    await page.waitForFunction(
      () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => {
                isSelectionBoxVisible: boolean;
                targetElement: unknown;
                selectionFilePath: string | null;
              };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        return Boolean(
          (state?.isSelectionBoxVisible || state?.targetElement) &&
            state?.selectionFilePath,
        );
      },
      { timeout: 5000 },
    );

    const selectionLabelOpenButton = page.locator(
      "[data-react-grab-selection-label] .cursor-pointer",
    );
    await expect(selectionLabelOpenButton).toBeVisible();
    await selectionLabelOpenButton.click({ force: true });
    await page.waitForTimeout(200);

    const openUrls = await page.evaluate(() => {
      return (window as { __OPEN_FILE_URLS__?: string[] }).__OPEN_FILE_URLS__;
    });

    expect(openUrls ?? []).toEqual([]);
  });
});
