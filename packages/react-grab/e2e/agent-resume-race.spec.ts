import { test, expect } from "./fixtures.js";

const OLD_STREAM_ABORT_DELAY_MS = 150;
const RESUME_STATUS_INTERVAL_MS = 40;
const RACE_SETTLE_WAIT_MS = 500;

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

    await reactGrab.enterPromptMode("li:first-child");
    await reactGrab.typeInInput("Trigger resume race");
    await reactGrab.submitInput();
    await reactGrab.waitForAgentSession(4000);

    await reactGrab.page.evaluate(() => {
      const currentWindow = window as ResumeRaceAgentInstallerWindow;
      currentWindow.__INSTALL_RESUME_RACE_AGENT__?.();
    });

    await reactGrab.page.waitForTimeout(RACE_SETTLE_WAIT_MS);

    await expect
      .poll(() => reactGrab.isAgentSessionVisible(), {
        timeout: 4000,
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
              attributeName: "data-react-grab",
              discardYesSelector: "[data-react-grab-discard-yes]",
            },
          ),
        { timeout: 2000 },
      )
      .toBe(true);

    await reactGrab.confirmAgentAbort();

    await expect
      .poll(() => reactGrab.isAgentSessionVisible(), {
        timeout: 5000,
      })
      .toBe(false);
  });
});
