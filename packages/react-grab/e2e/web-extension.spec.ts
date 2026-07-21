import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactGrabAPI, ToolbarState } from "../src/types.js";
import { test, expect } from "./fixtures.js";

interface ExtensionTestWindow extends Window {
  __REACT_GRAB__?: ReactGrabAPI;
  savedToolbarStates?: ToolbarState[];
}

const E2E_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_CONTENT_SCRIPT_URL = `/@fs${path.resolve(
  E2E_DIRECTORY,
  "../../../apps/web-extension/src/content/react-grab.ts",
)}`;

test("extension hydration does not overwrite its valid default with stale page state", async ({
  reactGrab,
}) => {
  await reactGrab.page.evaluate(() => {
    const targetWindow = window as ExtensionTestWindow;
    targetWindow.__REACT_GRAB__?.dispose();
    targetWindow.savedToolbarStates = [];
    localStorage.setItem(
      "react-grab-toolbar-state",
      JSON.stringify({
        edge: "bottom",
        ratio: 0.5,
        collapsed: false,
        enabled: true,
        defaultAction: "edit",
      }),
    );

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data?.type === "__REACT_GRAB_QUERY_STATE__") {
        window.postMessage(
          {
            type: "__REACT_GRAB_STATE_RESPONSE__",
            enabled: true,
            toolbarState: {
              edge: "bottom",
              ratio: 0.5,
              collapsed: false,
              enabled: true,
              defaultAction: "comment",
            },
          },
          "*",
        );
      }
      if (event.data?.type === "__REACT_GRAB_TOOLBAR_STATE_SAVE__") {
        targetWindow.savedToolbarStates?.push(event.data.state);
      }
    });
  });

  await reactGrab.page.addScriptTag({ type: "module", url: EXTENSION_CONTENT_SCRIPT_URL });

  await expect
    .poll(() =>
      reactGrab.page.evaluate(
        () => (window as ExtensionTestWindow).__REACT_GRAB__?.getToolbarState()?.defaultAction,
      ),
    )
    .toBe("comment");

  const savedDefaultActions = await reactGrab.page.evaluate(() =>
    (window as ExtensionTestWindow).savedToolbarStates?.map((state) => state.defaultAction),
  );
  expect(savedDefaultActions).not.toContain("copy");
});
