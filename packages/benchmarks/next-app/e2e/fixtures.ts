import { test as base, expect, Page } from "@playwright/test";

const REACT_GRAB_INIT_TIMEOUT = 15_000;

interface SourceInfo {
  filePath: string;
  lineNumber: number | null;
  componentName: string | null;
}

interface GrabResult {
  clipboard: string;
  source: SourceInfo | null;
  displayName: string | null;
}

export interface GrabFixture {
  page: Page;
  waitForReactGrab: () => Promise<void>;
  grabByTestId: (testId: string) => Promise<GrabResult>;
  getSourceByTestId: (testId: string) => Promise<SourceInfo | null>;
  getClipboard: () => Promise<string>;
  activate: () => Promise<void>;
  hoverAndGrab: (testId: string) => Promise<GrabResult>;
}

async function waitForReactGrab(page: Page) {
  await page.waitForFunction(
    () => {
      const api = (window as any).__REACT_GRAB__;
      return api && typeof api.copyElement === "function";
    },
    { timeout: REACT_GRAB_INIT_TIMEOUT },
  );
  await page.waitForTimeout(1000);
}

export const test = base.extend<{ grab: GrabFixture }>({
  grab: async ({ page, context }, use) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/", { waitUntil: "load" });
    await waitForReactGrab(page);

    const fixture: GrabFixture = {
      page,

      waitForReactGrab: () => waitForReactGrab(page),

      grabByTestId: async (testId: string) => {
        const copySuccess = await page.evaluate(async (tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el)
            throw new Error(`Element with data-testid="${tid}" not found`);
          const api = (window as any).__REACT_GRAB__;
          if (!api) throw new Error("react-grab not initialized");
          return api.copyElement(el);
        }, testId);

        if (!copySuccess) {
          throw new Error(`copyElement failed for data-testid="${testId}"`);
        }

        await page.waitForTimeout(200);

        const clipboard = await page.evaluate(() =>
          navigator.clipboard.readText(),
        );

        let source: SourceInfo | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          source = await page.evaluate(async (tid) => {
            const el = document.querySelector(`[data-testid="${tid}"]`);
            if (!el) return null;
            const api = (window as any).__REACT_GRAB__;
            if (!api) return null;
            return api.getSource(el);
          }, testId);
          if (source) break;
          await page.waitForTimeout(500);
        }

        const displayName = await page.evaluate((tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el) return null;
          const api = (window as any).__REACT_GRAB__;
          if (!api) return null;
          return api.getDisplayName(el);
        }, testId);

        return { clipboard, source, displayName };
      },

      getSourceByTestId: async (testId: string) => {
        return page.evaluate(async (tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el) return null;
          const api = (window as any).__REACT_GRAB__;
          if (!api) return null;
          return api.getSource(el);
        }, testId);
      },

      getClipboard: () => page.evaluate(() => navigator.clipboard.readText()),

      activate: async () => {
        await page.evaluate(() => {
          const api = (window as any).__REACT_GRAB__;
          api?.activate();
        });
        await page.waitForFunction(
          () => (window as any).__REACT_GRAB__?.isActive() === true,
          { timeout: 5000 },
        );
      },

      hoverAndGrab: async (testId: string) => {
        await fixture.activate();

        const el = page.locator(`[data-testid="${testId}"]`).first();
        await el.hover({ force: true });
        await page.waitForTimeout(500);

        await el.click({ force: true });
        await page.waitForTimeout(1000);

        const clipboard = await page.evaluate(() =>
          navigator.clipboard.readText(),
        );

        const source = await page.evaluate(async (tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el) return null;
          return (window as any).__REACT_GRAB__?.getSource(el) ?? null;
        }, testId);

        const displayName = await page.evaluate((tid) => {
          const el = document.querySelector(`[data-testid="${tid}"]`);
          if (!el) return null;
          return (window as any).__REACT_GRAB__?.getDisplayName(el) ?? null;
        }, testId);

        await page.evaluate(() => (window as any).__REACT_GRAB__?.deactivate());

        return { clipboard, source, displayName };
      },
    };

    await use(fixture);
  },
});

export { expect };
