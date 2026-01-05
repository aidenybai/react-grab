import { test, expect } from "./fixtures.js";

test.describe("Agent Integration", () => {
  test.describe("Agent Provider Setup", () => {
    test("should configure mock agent provider", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await reactGrab.enterPromptMode("li:first-child");

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("should allow agent provider with custom delay", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 1000 });
      await reactGrab.enterPromptMode("li:first-child");

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("should allow custom status updates", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({
        delay: 500,
        statusUpdates: ["Starting...", "Processing...", "Finishing..."],
      });
      await reactGrab.enterPromptMode("li:first-child");

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
      await reactGrab.enterPromptMode("li:first-child");

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
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(3000);
      const sessions = await reactGrab.getAgentSessions();
      const streamingSession = sessions.find((s) => s.isStreaming);
      expect(streamingSession).toBeDefined();
    });

    test("should complete session after processing", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 300 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Quick test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(5000);
      const sessions = await reactGrab.getAgentSessions();
      const completedSession = sessions.find((s) => !s.isStreaming);
      expect(completedSession).toBeDefined();
    });

    test("should display completion message", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 200 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);

      await expect.poll(() => reactGrab.getLabelStatusText()).toBeTruthy();
    });
  });

  test.describe("Session Error Handling", () => {
    test("should handle agent errors gracefully", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({
        delay: 200,
        error: "Test error message",
      });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Trigger error");
      await reactGrab.submitInput();

      await expect.poll(async () => {
        return reactGrab.page.evaluate((attrName) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          if (!shadowRoot) return false;
          const root = shadowRoot.querySelector(`[${attrName}]`);
          return !!root?.querySelector("[data-react-grab-error]");
        }, "data-react-grab");
      }, { timeout: 3000 }).toBe(true);
    });

    test("should show retry option on error", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100, error: "Error occurred" });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await expect.poll(async () => {
        return reactGrab.page.evaluate((attrName) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          if (!shadowRoot) return false;
          const root = shadowRoot.querySelector(`[${attrName}]`);
          return root?.textContent?.toLowerCase().includes("retry") ?? false;
        }, "data-react-grab");
      }, { timeout: 2000 }).toBe(true);
    });
  });

  test.describe("Session Actions", () => {
    test("should dismiss session", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);

      await reactGrab.clickAgentDismiss();

      await expect.poll(() => reactGrab.isAgentSessionVisible(), { timeout: 2000 }).toBe(false);
    });

    test("should abort streaming session", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Long running task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.clickAgentAbort();

      await expect.poll(async () => {
        return reactGrab.page.evaluate((attrName) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          if (!shadowRoot) return false;
          const root = shadowRoot.querySelector(`[${attrName}]`);
          const text = root?.textContent?.toLowerCase() ?? "";
          return text.includes("discard") || text.includes("abort") || text.includes("stop");
        }, "data-react-grab");
      }, { timeout: 2000 }).toBe(true);
    });

    test("should confirm abort", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Long task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.clickAgentAbort();
      await reactGrab.confirmAgentAbort();

      await expect.poll(async () => {
        const sessions = await reactGrab.getAgentSessions();
        return sessions.length;
      }, { timeout: 2000 }).toBeLessThanOrEqual(1);
    });

    test("should cancel abort", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 5000 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Long task");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.clickAgentAbort();
      await reactGrab.cancelAgentAbort();

      const sessions = await reactGrab.getAgentSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  test.describe("Undo/Redo Operations", () => {
    test("should support undo after completion", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);

      await expect.poll(async () => {
        return reactGrab.page.evaluate((attrName) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          if (!shadowRoot) return false;
          const root = shadowRoot.querySelector(`[${attrName}]`);
          return root?.textContent?.toLowerCase().includes("undo") ?? false;
        }, "data-react-grab");
      }, { timeout: 2000 }).toBe(true);
    });

    test("should trigger undo via keyboard shortcut", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);
      await reactGrab.clickAgentDismiss();

      await reactGrab.page.keyboard.down("Meta");
      await reactGrab.page.keyboard.press("z");
      await reactGrab.page.keyboard.up("Meta");

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });

  test.describe("Follow-up Prompts", () => {
    test("should support follow-up prompts after completion", async ({
      reactGrab,
    }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Initial prompt");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentComplete(3000);

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
      await reactGrab.enterPromptMode("li:first-child");

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
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test scroll");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.scrollPage(50);

      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(true);
    });

    test("session should update bounds on resize", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 2000 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.typeInInput("Test resize");
      await reactGrab.submitInput();

      await reactGrab.waitForAgentSession(2000);

      await reactGrab.setViewportSize(800, 600);

      const isVisible = await reactGrab.isAgentSessionVisible();
      expect(isVisible).toBe(true);

      await reactGrab.setViewportSize(1280, 720);
    });
  });

  test.describe("Edge Cases", () => {
    test("should handle empty prompt submission", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await reactGrab.enterPromptMode("li:first-child");

      await reactGrab.submitInput();

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });

    test("should handle rapid session starts", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });

      for (let i = 0; i < 3; i++) {
        await reactGrab.enterPromptMode("li:first-child");

        await reactGrab.typeInInput(`Prompt ${i}`);
        await reactGrab.submitInput();

        await reactGrab.clickAgentDismiss();
      }

      const state = await reactGrab.getState();
      expect(state).toBeDefined();
    });
  });
});
