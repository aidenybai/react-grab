import { sendToTab } from "../utils/messaging";

export default defineBackground(() => {
  console.log("React Grab: Background script loaded", {
    id: browser.runtime.id,
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command === "toggle-grab") {
      console.log("React Grab: Keyboard shortcut pressed", command);
      const activeTab = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab[0]?.id) {
        await sendToTab(activeTab[0].id, "toggle-grab", {});
      }
    }
  });
});
