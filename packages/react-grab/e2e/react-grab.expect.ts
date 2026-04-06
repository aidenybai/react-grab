import { Expect, configure } from "expect-sdk";
import type { TestResult } from "expect-sdk";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.EXPECT_BASE_URL ?? "http://localhost:5175";

configure({ baseUrl: BASE_URL });

const ensureDevServer = async () => {
  try {
    await fetch(BASE_URL);
  } catch {
    const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/e2e-app");
    execSync("pnpm dev &", { cwd: appDirectory, stdio: "ignore" });

    for (let elapsed = 0; elapsed < 30_000; elapsed += 500) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        await fetch(BASE_URL);
        return;
      } catch {}
    }
    throw new Error(`Dev server failed to start at ${BASE_URL}`);
  }
};

await ensureDevServer();

const results: TestResult[] = [];

for (const test of [
  "There is a floating toolbar near the bottom of the page. Click the toggle button to activate highlight mode. Hover over the heading 'React Grab E2E Test Page' and verify a colored box appears around it with a label. Press Escape to deactivate. Click the toggle again to reactivate, then once more to deactivate.",
  "Activate via the toolbar toggle. Hover over 'Buy groceries' in the Todo List and verify a highlight appears. Click it and verify 'Copied' feedback shows. Then hover the green Submit button in the Form section, click it, and verify the overlay copies it instead of submitting the form.",
  "Activate via toolbar. Hover the page heading and right-click it. Verify a context menu appears with a Copy option. Click Copy and verify the menu closes with Copied feedback. Right-click a different element, then press Escape to dismiss.",
  "Find the collapse button on the toolbar and click it to collapse, then click again to expand. Drag the toolbar toward the top of the viewport and verify it snaps to the edge. Right-click the toggle button to open a menu, then press Escape to close it.",
  "Activate and hover the Todo List. Press ArrowDown twice to move the highlight to successive elements, then ArrowUp to go back. Press ArrowLeft to select the parent container, then ArrowRight to go into a child.",
  "Activate via toolbar. Click and drag from above 'Buy groceries' down past 'Write code' to create a selection rectangle. Release and verify multiple elements are selected with a count label and Copied feedback.",
  "Activate, hover the heading, right-click, and click Edit. Verify a text input appears. Type 'test comment' and press Enter. Find a comments button on the toolbar and click it to verify the comment appears in a dropdown.",
  "Activate and hover the card labeled 'Outer Card', verify a highlight and label appear. Move into 'Middle Card' and verify the label updates. Hover 'Nested Button' and click to copy it, verify the Copied feedback.",
  "Activate and scroll down to 'Scrollable Content'. Hover a scrollable item and verify the highlight is correctly positioned. Scroll further to 'Dynamic Elements', hover one and click to copy it.",
  "Activate and hover the 'Edge Case Elements' section. Verify zero-size and invisible elements are not highlighted. Go to 'Dynamic Elements', click Add Element, verify the new element is highlightable, then click Remove on one and verify the overlay does not get stuck.",
  "Activate and scroll to 'Modal Dialog'. Click Open Modal. Hover elements inside the modal and verify highlights appear. Click a modal element to copy it (modal should stay open). Press Escape to deactivate (modal stays). Close the modal with its Close button.",
  "Look at the Animated Elements section with three animated shapes. Activate via toolbar and verify the animations freeze. Hover the frozen elements to verify highlights work. Deactivate and verify animations resume.",
]) {
  const run = Expect.test({ url: "/", tests: [test], timeout: 3_600_000 });

  for await (const event of run) {
    if (event.type === "run:started") console.log(`\nrunning: ${event.title}`);
    if (event.type === "step:started") console.log(`  started: ${event.title}`);
    if (event.type === "step:passed")
      console.log(`  pass: ${event.step.title} (${event.step.duration}ms)`);
    if (event.type === "step:failed")
      console.log(`  FAIL: ${event.step.title} - ${event.step.summary}`);
    if (event.type === "screenshot") console.log(`  screenshot: ${event.path}`);
  }

  const result = await run;
  results.push(result);
}

const passed = results.filter((r) => r.status === "passed").length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed < results.length ? 1 : 0);
