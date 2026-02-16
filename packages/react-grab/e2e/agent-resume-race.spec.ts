import { test, expect } from "./fixtures.js";

const OLD_STREAM_ABORT_DELAY_MS = 150;
const RESUME_STATUS_INTERVAL_MS = 40;
const RACE_SETTLE_WAIT_MS = 500;
const SESSION_VISIBLE_TIMEOUT_MS = 4000;
const ABORT_CONFIRM_VISIBLE_TIMEOUT_MS = 2000;
const SESSION_HIDDEN_TIMEOUT_MS = 5000;
const REACT_GRAB_ATTRIBUTE_NAME = "data-react-grab";
const EDIT_TARGET_SELECTOR = "li:first-child";
const PROMPT_TEXT = "Trigger resume race";
const DISCARD_YES_SELECTOR = "[data-react-grab-discard-yes]";

interface ResumeRaceAgentActionContext {
  enterPromptMode?: (agent?: Record<string, unknown>) => void;
}

interface ResumeRaceAgentInstallerWindow extends Window {
  __INSTALL_RESUME_RACE_AGENT__?: () => void;
}

test.describe("Agent Resume Race", () => {
  test("keeps resumed session visible when old cleanup finishes", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(
      ({ oldStreamAbortDelayMs, resumeStatusIntervalMs }) => {
        const currentWindow = window as ResumeRaceAgentInstallerWindow;

        const installResumeRaceAgent = (): void => {
          const createAbortError = (): Error => {
            const abortError = new Error("Aborted");
            abortError.name = "AbortError";
            return abortError;
          };

          const waitForAbortWithDelay = (
            signal: AbortSignal,
            delayMs: number,
          ): Promise<never> =>
            new Promise<never>((_, reject) => {
              const rejectWithAbortError = () => {
                setTimeout(() => {
                  reject(createAbortError());
                }, delayMs);
              };

              if (signal.aborted) {
                rejectWithAbortError();
                return;
              }

              signal.addEventListener("abort", rejectWithAbortError, {
                once: true,
              });
            });

          const createAgent = () => ({
            provider: {
              supportsResume: true,
              supportsFollowUp: true,
              async *send(_context: unknown, signal: AbortSignal) {
                yield "Processing...";
                await waitForAbortWithDelay(signal, oldStreamAbortDelayMs);
              },
              async *resume(_sessionId: string, signal: AbortSignal) {
                while (!signal.aborted) {
                  yield "Processing...";
                  await new Promise((resolve) => {
                    setTimeout(resolve, resumeStatusIntervalMs);
                  });
                }
                throw createAbortError();
              },
            },
            storage: window.localStorage,
          });

          const api = currentWindow.__REACT_GRAB__;
          api?.unregisterPlugin("resume-race-agent");
          api?.registerPlugin({
            name: "resume-race-agent",
            actions: [
              {
                id: "edit-with-resume-race-agent",
                label: "Edit",
                shortcut: "Enter",
                onAction: (context: ResumeRaceAgentActionContext) => {
                  context.enterPromptMode?.(createAgent());
                },
                agent: createAgent(),
              },
            ],
          });
        };

        currentWindow.__INSTALL_RESUME_RACE_AGENT__ = installResumeRaceAgent;
        installResumeRaceAgent();
      },
      {
        oldStreamAbortDelayMs: OLD_STREAM_ABORT_DELAY_MS,
        resumeStatusIntervalMs: RESUME_STATUS_INTERVAL_MS,
      },
    );

    await reactGrab.enterPromptMode(EDIT_TARGET_SELECTOR);
    await reactGrab.typeInInput(PROMPT_TEXT);
    await reactGrab.submitInput();
    await reactGrab.waitForAgentSession(SESSION_VISIBLE_TIMEOUT_MS);

    await reactGrab.page.evaluate(() => {
      const currentWindow = window as ResumeRaceAgentInstallerWindow;
      currentWindow.__INSTALL_RESUME_RACE_AGENT__?.();
    });

    await reactGrab.page.waitForTimeout(RACE_SETTLE_WAIT_MS);

    await expect
      .poll(() => reactGrab.isAgentSessionVisible(), {
        timeout: SESSION_VISIBLE_TIMEOUT_MS,
      })
      .toBe(true);

    await reactGrab.clickAgentAbort();

    await expect
      .poll(
        () =>
          reactGrab.page.evaluate(
            ({ attributeName, discardYesSelector }) => {
              const host = document.querySelector(`[${attributeName}]`);
              const shadowRoot = host?.shadowRoot;
              if (!shadowRoot) return false;
              const root = shadowRoot.querySelector(`[${attributeName}]`);
              if (!root) return false;
              return root.querySelector(discardYesSelector) !== null;
            },
            {
              attributeName: REACT_GRAB_ATTRIBUTE_NAME,
              discardYesSelector: DISCARD_YES_SELECTOR,
            },
          ),
        { timeout: ABORT_CONFIRM_VISIBLE_TIMEOUT_MS },
      )
      .toBe(true);

    await reactGrab.confirmAgentAbort();

    await expect
      .poll(() => reactGrab.isAgentSessionVisible(), {
        timeout: SESSION_HIDDEN_TIMEOUT_MS,
      })
      .toBe(false);
  });
});
