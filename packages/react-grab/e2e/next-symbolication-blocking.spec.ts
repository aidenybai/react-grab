import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";

// These run only under the chromium-next project (Next dev server on :5176).
// They exercise react-grab's Next server-frame symbolication path, which the
// Vite fixture cannot reach, and the behavior under a blocked/saturated network
// that the source-fetch queue and its timeout backstop guard against.

const SERVER_ELEMENT = '[data-testid="server-card-body"]';
const SYMBOLICATION_ENDPOINT = "**/__nextjs_original-stack-frames";
// Comfortably above react-grab's symbolication abort (5s) and source-fetch
// timeout (8s), but well under the 60s test timeout. A grab that respects either
// bound resolves inside this window; the old hang would blow the test timeout.
const GRAB_COMPLETION_BUDGET_MS = 20_000;

// Resolves the element's degraded-or-full trace, racing the grab against the
// budget so a hang fails loudly instead of stalling to the 60s test timeout.
const formatWithinBudget = (page: Page, selector: string) =>
  Promise.race([
    page
      .evaluate((sel) => {
        const format = (
          window as unknown as {
            formatElementInfo: (element: Element) => Promise<string>;
          }
        ).formatElementInfo;
        return format(document.querySelector(sel) as Element);
      }, selector)
      .then((trace) => ({ completed: true as const, trace })),
    new Promise<{ completed: false }>((resolve) =>
      setTimeout(() => resolve({ completed: false }), GRAB_COMPLETION_BUDGET_MS),
    ),
  ]);

test.describe("Next server-frame symbolication", () => {
  test("resolves the full symbolicated server source when the network is healthy", async ({
    reactGrab,
  }) => {
    const didCopy = await reactGrab.copyElementViaApi(SERVER_ELEMENT);
    expect(didCopy).toBe(true);

    await reactGrab.page.waitForTimeout(500);
    const clipboard = await reactGrab.getClipboardContent();
    // The symbolication POST maps the server frame back to its real source.
    expect(clipboard).toContain("server-card.tsx");
    expect(clipboard).toContain("ServerCard");
  });

  test("completes with a degraded trace when the symbolication endpoint is stalled", async ({
    reactGrab,
  }) => {
    // Hold the symbolication request open indefinitely. react-grab's abort and
    // the source-fetch timeout behind it must end the wait so the grab resolves
    // with a degraded trace instead of hanging on "Grabbing…".
    await reactGrab.page.route(SYMBOLICATION_ENDPOINT, () => {});

    const result = await formatWithinBudget(reactGrab.page, SERVER_ELEMENT);

    expect(result.completed).toBe(true);
    // The element preview and selector resolve without the network, so the trace
    // is degraded but never empty.
    expect(result.completed && result.trace.trim().length).toBeGreaterThan(0);
  });

  test("completes with a degraded trace when the connection pool is saturated", async ({
    reactGrab,
  }) => {
    // ?saturate fires never-resolving /api/slow requests that occupy the
    // per-origin connection pool, the real condition the queue exists for: every
    // react-grab source fetch then queues behind the app's own requests.
    await reactGrab.page.goto("/?saturate=12", { waitUntil: "domcontentloaded" });
    await reactGrab.page.waitForFunction(
      () => {
        const win = window as unknown as {
          formatElementInfo?: unknown;
          __REACT_GRAB__?: unknown;
        };
        return typeof win.formatElementInfo === "function" && win.__REACT_GRAB__ !== undefined;
      },
      undefined,
      { timeout: 10_000 },
    );

    const result = await formatWithinBudget(reactGrab.page, SERVER_ELEMENT);

    expect(result.completed).toBe(true);
    expect(result.completed && result.trace.trim().length).toBeGreaterThan(0);
  });

  test("resolves full source on a later grab after a stalled symbolication grab", async ({
    reactGrab,
  }) => {
    // A transient symbolication failure must not permanently degrade resolution.
    // Grab once while the endpoint is stalled (completes degraded, no hang)...
    await reactGrab.page.route(SYMBOLICATION_ENDPOINT, () => {});
    const stalled = await formatWithinBudget(reactGrab.page, SERVER_ELEMENT);
    expect(stalled.completed).toBe(true);

    // ...then, once it recovers, a later grab of a different element resolves
    // the real source again (no poisoned cache from the failure).
    await reactGrab.page.unroute(SYMBOLICATION_ENDPOINT);
    const recovered = await formatWithinBudget(reactGrab.page, '[data-testid="server-card-title"]');
    expect(recovered.completed).toBe(true);
    expect(recovered.completed && recovered.trace).toContain("server-card.tsx");
  });
});
