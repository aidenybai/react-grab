import { Expect, configure } from "expect-sdk";
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

const results = await Promise.all([
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "There is a small floating toolbar near the bottom of the page. Click the toggle button on it. The page should enter an overlay mode where elements can be highlighted.",
      "Move the mouse over the heading that says 'React Grab E2E Test Page'. A colored rectangle should appear around the heading and a small label should show near it with the tag name 'h1'.",
      "Press Escape on the keyboard. The colored rectangle should disappear and the toolbar should go back to its inactive state.",
      "Click the toolbar toggle button to activate again, then click it one more time to deactivate. Both transitions should complete without visual glitches.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate the overlay. Move the mouse over the text 'Buy groceries' inside the Todo List section. A highlight rectangle should appear around it.",
      "Click on 'Buy groceries'. A brief 'Copied' notification should appear near the element.",
      "Move the mouse to the green 'Submit' button in the Form Elements section and click it. The overlay should intercept the click (the form should not submit) and show 'Copied' feedback.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Hover over the page heading, then right-click it. A small context menu should appear near the cursor with at least a 'Copy' option.",
      "Click the 'Copy' option in the context menu. The menu should close and a 'Copied' notification should appear.",
      "Right-click on a different element such as the Todo List heading. A new context menu should appear. Press Escape to close it without copying anything.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Find the collapse or chevron button on the floating toolbar. Click it to collapse the toolbar into a smaller shape, then click it again to expand it back.",
      "Click and drag the toolbar from its current position toward the top of the viewport. When released, it should snap to the nearest screen edge.",
      "Right-click the toggle button on the toolbar. A small dropdown menu should appear with action options. Press Escape to close it.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Hover over the Todo List section so a highlight appears on one of the elements.",
      "Press the ArrowDown key twice. The highlight should move down to the next elements in sequence. Then press ArrowUp once and the highlight should move back up.",
      "Press ArrowLeft. The highlight should expand to the parent container. Press ArrowRight and it should go back into a child element.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Click and hold above the 'Buy groceries' item, then drag downward past 'Write code' in the Todo List. A selection rectangle should appear during the drag.",
      "Release the mouse button. Multiple todo items should be selected and the label should indicate a count such as '4 elements'. A 'Copied' notification should appear.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Hover the page heading and right-click it. In the context menu, click 'Edit'. A text input area should appear.",
      "Type 'test comment' into the text area and press Enter. The text area should close.",
      "On the toolbar, find a comments button (it may show a number badge). Click it to open a dropdown. The dropdown should list the comment you just submitted.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Hover over the card labeled 'Outer Card'. A highlight and label should appear. Then move the mouse into the card labeled 'Middle Card' inside it. The label should update to reflect the new element.",
      "Hover over the button labeled 'Nested Button' deep inside the nested cards. The label should display 'button'. Click to copy it. A brief animation should appear around the button and the label should show 'Copied'.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Scroll down the page until the 'Scrollable Content' section is visible. Hover over one of the scrollable items. The highlight should appear correctly positioned even after scrolling.",
      "Scroll further down to the 'Dynamic Elements' section. Hover over one of the dynamic elements and click to copy it. The 'Copied' feedback should appear at the correct position.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Hover around the 'Edge Case Elements' section which contains zero-size and invisible elements. The overlay should not highlight any zero-size or invisible element.",
      "Scroll to the 'Dynamic Elements' section. Click the 'Add Element' button to add a new row. Hover over the new element to confirm it can be highlighted. Then click 'Remove' on one of the elements and verify the overlay does not get stuck on the removed element.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Click the toolbar toggle to activate. Scroll down to the 'Modal Dialog' section and click the 'Open Modal' button. A modal dialog with a dark backdrop should appear. Hover over elements inside the modal and verify that highlights appear on the modal content.",
      "Click on an element inside the modal such as 'Button Inside Modal'. The overlay should copy it instead of closing the modal. The modal should remain open.",
      "Press Escape. The overlay should deactivate but the modal should stay open. Then click the 'Close' button inside the modal to dismiss it normally.",
    ],
  }),
  Expect.test({
    url: "/",
    timeout: 120_000,
    tests: [
      "Look at the 'Animated Elements' section. There should be three shapes with animations: one pulsing, one spinning, and one bouncing.",
      "Click the toolbar toggle to activate the overlay. The three animations should freeze in place. Hover over the frozen shapes and verify that highlights appear on them.",
      "Press Escape to deactivate. The animations should resume moving.",
    ],
  }),
]);

const passed = results.filter((r) => r.status === "passed").length;

for (const result of results) {
  const icon = result.status === "passed" ? "pass" : "FAIL";
  const stepNames = result.steps.map((s) => s.title).join(", ");
  console.log(`${icon}: ${stepNames}`);
  for (const error of result.errors) {
    console.log(`  ${error.title}: ${error.summary}`);
  }
}

console.log(`\n${passed}/${results.length} passed`);
process.exit(passed < results.length ? 1 : 0);
