import { describe, expect, it, vi } from "vite-plus/test";
import type { ContextMenuActionContext } from "../src/types.js";
import { executeContextMenuAction } from "../src/utils/execute-context-menu-action.js";

const createContext = (): ContextMenuActionContext => ({
  element: Object.create(null),
  elements: [],
  hooks: {
    transformHtmlContent: async (html) => html,
    onOpenFile: () => false,
    transformOpenFileUrl: (url) => url,
  },
  performWithFeedback: async () => {},
  hideContextMenu: () => {},
  cleanup: () => {},
});

describe("executeContextMenuAction", () => {
  it("contains enabled predicate failures and skips the action", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onAction = vi.fn();

    const didExecute = executeContextMenuAction(
      {
        id: "throwing-enabled",
        label: "Throwing Enabled",
        enabled: () => {
          throw new Error("enabled failed");
        },
        onAction,
      },
      createContext(),
    );

    expect(didExecute).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
