import { test, expect } from "./fixtures.js";

test.describe("Copy URL Inclusion", () => {
  test("should include page URL in copied clipboard content", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='main-title']");
    await reactGrab.waitForSelectionBox();
    await reactGrab.clickElement("[data-testid='main-title']");

    const pageUrl = reactGrab.page.url();
    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain(`URL: ${pageUrl}`);
  });

  test("should place URL after element snippet content", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='main-title']");
    await reactGrab.waitForSelectionBox();
    await reactGrab.clickElement("[data-testid='main-title']");

    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain("React Grab");

    const content = await reactGrab.getClipboardContent();
    const urlIndex = content.indexOf("URL:");
    const snippetIndex = content.indexOf("React Grab");
    expect(urlIndex).toBeGreaterThan(snippetIndex);
  });

  test("should include URL in clipboard metadata but not in metadata content", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] h1");
    await reactGrab.waitForSelectionBox();

    const copyPayloadPromise = reactGrab.captureNextClipboardWrites();
    await reactGrab.clickElement("[data-testid='todo-list'] h1");
    const copyPayload = await copyPayloadPromise;
    const metadataText = copyPayload["application/x-react-grab"];
    if (!metadataText) {
      throw new Error("Missing React Grab clipboard metadata");
    }

    const pageUrl = reactGrab.page.url();
    const metadata = JSON.parse(metadataText);
    expect(metadata.url).toBe(pageUrl);
    expect(metadata.content).toContain("Todo List");
    expect(metadata.content).not.toContain("URL:");
  });

  test("should include URL when copying with comment", async ({
    reactGrab,
  }) => {
    await reactGrab.registerCommentAction();
    await reactGrab.enterPromptMode("li:first-child");
    await reactGrab.typeInInput("Fix this item");
    await reactGrab.submitInput();

    const pageUrl = reactGrab.page.url();
    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain("Fix this item");

    const content = await reactGrab.getClipboardContent();
    expect(content).toContain(`URL: ${pageUrl}`);

    // Comment should come before snippet, URL should come last
    const commentIndex = content.indexOf("Fix this item");
    const urlIndex = content.indexOf("URL:");
    expect(commentIndex).toBeLessThan(urlIndex);
  });

  test("should include URL when copying multiple elements via drag", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");

    const pageUrl = reactGrab.page.url();
    await expect
      .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
      .toContain(`URL: ${pageUrl}`);
  });
});
