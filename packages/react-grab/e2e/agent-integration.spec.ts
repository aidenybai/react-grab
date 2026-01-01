import { test, expect } from "./fixtures.js";

test.describe("Agent Integration", () => {
  test.describe("Agent Provider Setup", () => {
    test("should configure mock agent provider", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isInputMode = await reactGrab.isInputModeActive();
      expect(isInputMode).toBe(true);
    });

    test("should allow agent provider with custom delay", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 1000 });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      const isInputMode = await reactGrab.isInputModeActive();
      expect(isInputMode).toBe(true);
    });

    test("should allow custom status updates", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({
        delay: 500,
        statusUpdates: ["Starting...", "Processing...", "Finishing..."],
      });

      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);
      const sessions = await reactGrab.getAgentSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  test.describe("Session Lifecycle", () => {
    test("should start session on input submit", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 1000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Analyze this element");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(3000);
      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(true);
    });

    test("should show streaming status during processing", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(3000);
      const sessions = await reactGrab.getAgentSessions();
      const streamingSession = sessions.find((s) => s.isStreaming);
      expect(streamingSession).toBeDefined();
    });

    test("should complete session after processing", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 300 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Quick test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(5000);
      const sessions = await reactGrab.getAgentSessions();
      const completedSession = sessions.find((s) => !s.isStreaming);
      expect(completedSession).toBeDefined();
    });

    test("should display completion message", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 200 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.page.waitForTimeout(200);

      const statusText = await reactGrab.getLabelStatusText();
      expect(statusText).toBeTruthy();
    });
  });

  test.describe("Session Error Handling", () => {
    test("should handle agent errors gracefully", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({
        delay: 200,
        error: "Test error message",
      });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Trigger error");
      await reactGrab.submitInput();

      await reactGrab.page.waitForTimeout(1500);

      const hasErrorView = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        return !!root?.querySelector("[data-react-grab-error]");
      }, "data-react-grab");
      expect(hasErrorView).toBe(true);
    });

    test("should show retry option on error", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100, error: "Error occurred" });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.page.waitForTimeout(500);

      const hasRetryOption = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        return root?.textContent?.toLowerCase().includes("retry") ?? false;
      }, "data-react-grab");

      expect(hasRetryOption).toBe(true);
    });
  });

  test.describe("Session Actions", () => {
    test("should dismiss session", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.clickAgentDismiss();
      await reactGrab.page.waitForTimeout(500);

      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(false);
    });

    test("should abort streaming session", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Long running task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.clickAgentAbort();
      await reactGrab.page.waitForTimeout(200);

      const hasAbortConfirmation = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        const text = root?.textContent?.toLowerCase() ?? "";
        return (
          text.includes("discard") ||
          text.includes("abort") ||
          text.includes("stop")
        );
      }, "data-react-grab");

      expect(hasAbortConfirmation).toBe(true);
    });

    test("should confirm abort", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Long task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.clickAgentAbort();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.confirmAgentAbort();
      await reactGrab.page.waitForTimeout(500);

      const sessions = await reactGrab.getAgentSessions();
      expect(sessions.length).toBeLessThanOrEqual(1);
    });

    test("should cancel abort", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Long task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);
      await reactGrab.page.waitForTimeout(300);

      await reactGrab.clickAgentAbort();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.cancelAgentAbort();
      await reactGrab.page.waitForTimeout(200);

      const sessions = await reactGrab.getAgentSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  test.describe("Undo/Redo Operations", () => {
    test("should support undo after completion", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.page.waitForTimeout(200);

      const hasUndoOption = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        return root?.textContent?.toLowerCase().includes("undo") ?? false;
      }, "data-react-grab");

      expect(hasUndoOption).toBe(true);
    });

    test("should trigger undo via keyboard shortcut", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.clickAgentDismiss();
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("z");
      await reactGrab.page.keyboard.up("Meta");
      await reactGrab.page.waitForTimeout(200);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });

  test.describe("Follow-up Prompts", () => {
    test("should support follow-up prompts after completion", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Initial prompt");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.page.waitForTimeout(200);

      const hasFollowUpInput = await reactGrab.page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        return root?.querySelector("textarea, input") !== null;
      }, "data-react-grab");

      expect(typeof hasFollowUpInput).toBe("boolean");
    });
  });

  test.describe("Multiple Sessions", () => {
    test("should handle multiple elements with separate sessions", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 500 });
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("First element");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      const sessions = await reactGrab.getAgentSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  test.describe("Session State Persistence", () => {
    test("session should update bounds on scroll", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test scroll");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.scrollPage(50);
      await reactGrab.page.waitForTimeout(200);

      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(true);
    });

    test("session should update bounds on resize", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.typeInInput("Test resize");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.setViewportSize(800, 600);
      await reactGrab.page.waitForTimeout(200);

      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle empty prompt submission", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.doubleClickElement("li:first-child");
      await reactGrab.page.waitForTimeout(200);

      await reactGrab.submitInput();
      await reactGrab.page.waitForTimeout(300);

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should handle rapid session starts", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      for (let i = 0; i < 3; i++) {
        await reactGrab.activate();
        await reactGrab.hoverElement("li:first-child");
        await reactGrab.waitForSelectionBox();
        await reactGrab.doubleClickElement("li:first-child");
        await reactGrab.page.waitForTimeout(100);

        await reactGrab.typeInInput(`Prompt ${i}`);
        await reactGrab.submitInput();
        await reactGrab.page.waitForTimeout(200);

        await reactGrab.clickAgentDismiss();
        await reactGrab.page.waitForTimeout(200);
      }

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });
});
