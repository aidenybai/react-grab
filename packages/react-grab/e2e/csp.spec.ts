import { expect, test } from "./fixtures.js";

const STRICT_STYLE_POLICY = "style-src 'self' 'unsafe-inline'";
const GOOGLE_FONTS_STYLESHEET_HOST = "fonts.googleapis.com";

test("does not load an external font stylesheet under a strict style CSP", async ({
  reactGrab,
}) => {
  const cspViolations: string[] = [];

  reactGrab.page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Content Security Policy") &&
      message.text().includes(GOOGLE_FONTS_STYLESHEET_HOST)
    ) {
      cspViolations.push(message.text());
    }
  });

  await reactGrab.page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "content-security-policy": STRICT_STYLE_POLICY,
      },
    });
  });

  await reactGrab.page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => reactGrab.getOverlayHost().count()).toBe(1);

  const overlayStyles = await reactGrab.getOverlayHost().evaluate((host) => {
    return host.shadowRoot?.querySelector("style")?.textContent ?? "";
  });

  expect(overlayStyles).not.toContain(GOOGLE_FONTS_STYLESHEET_HOST);
  expect(cspViolations).toEqual([]);
});
