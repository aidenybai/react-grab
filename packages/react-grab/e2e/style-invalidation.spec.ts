// Regression guard for whole-document style invalidation during hover.
//
// The pointer-events freeze has to flip between "page frozen" and "hit-testable"
// on every element detection. Doing that by adding/removing a stylesheet (or
// toggling `HTMLStyleElement.disabled`) changes the document's active sheet set,
// which makes Blink re-collect matching rules for EVERY element: profiled at
// ~20-35ms per flip on an 8k-element page, twice per hover interruption, which
// is enough to drop 2-3 frames every time the pointer pauses and moves again.
//
// Counting restyled elements rather than milliseconds keeps this deterministic
// across machines: a scoped flip touches the root and inherits down, so no
// single recalc should approach the size of the document.
import { expect, goToHeavyView, test } from "./perf-fixtures.js";
import { idleFrame } from "./perf-recorder.js";

interface StyleRecalcSample {
  elementCount: number;
  durationMs: number;
}

const FULL_DOCUMENT_RESTYLE_RATIO = 0.5;

// Playwright types every trace event field as a string, but UpdateLayoutTree
// carries the restyled element count as a number under `args`.
const readRestyledElementCount = (traceEvent: { args?: unknown }): number => {
  if (typeof traceEvent.args !== "object" || traceEvent.args === null) return 0;
  const elementCount = Reflect.get(traceEvent.args, "elementCount");
  return typeof elementCount === "number" ? elementCount : 0;
};

test.describe("style invalidation", () => {
  test("hovering and scrolling never restyles the whole document", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "all");
    const documentElementCount = await page.evaluate(() => document.querySelectorAll("*").length);
    expect(documentElementCount).toBeGreaterThan(1000);

    const client = await page.context().newCDPSession(page);
    const recalcSamples: StyleRecalcSample[] = [];
    client.on("Tracing.dataCollected", ({ value }) => {
      for (const traceEvent of value) {
        if (traceEvent.name !== "UpdateLayoutTree") continue;
        recalcSamples.push({
          elementCount: readRestyledElementCount(traceEvent),
          durationMs: (Number(traceEvent.dur) || 0) / 1000,
        });
      }
    });

    await reactGrab.activate();
    await page.mouse.move(600, 400, { steps: 2 });
    await idleFrame(page, 2);

    await client.send("Tracing.start", {
      transferMode: "ReportEvents",
      traceConfig: { includedCategories: ["devtools.timeline"] },
    });

    // Bursts with pauses between them: the pause lets the debounced freeze
    // resume land, so the next burst has to flip back to hit-test mode. A
    // continuous sweep would coalesce the flips and hide the regression.
    for (let burstIndex = 0; burstIndex < 6; burstIndex++) {
      for (let stepIndex = 0; stepIndex < 8; stepIndex++) {
        await page.mouse.move(
          500 + ((stepIndex * 37) % 400),
          250 + ((burstIndex * 61 + stepIndex * 23) % 400),
          { steps: 1 },
        );
        await page.mouse.wheel(0, 100);
      }
      await page.waitForTimeout(220);
    }
    await idleFrame(page, 2);

    const tracingComplete = new Promise<void>((resolve) => {
      client.once("Tracing.tracingComplete", () => resolve());
    });
    await client.send("Tracing.end");
    await tracingComplete;
    await reactGrab.deactivate();

    expect(recalcSamples.length).toBeGreaterThan(0);
    const fullDocumentRestyles = recalcSamples.filter(
      (sample) => sample.elementCount > documentElementCount * FULL_DOCUMENT_RESTYLE_RATIO,
    );
    expect(
      fullDocumentRestyles,
      `${fullDocumentRestyles.length} recalc(s) restyled over ${Math.round(
        documentElementCount * FULL_DOCUMENT_RESTYLE_RATIO,
      )} of ${documentElementCount} elements: ${fullDocumentRestyles
        .map((sample) => `${sample.elementCount} elements/${sample.durationMs.toFixed(1)}ms`)
        .join(", ")}`,
    ).toHaveLength(0);
  });
});
