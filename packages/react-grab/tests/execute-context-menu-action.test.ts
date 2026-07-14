import { describe, expect, it, vi } from "vite-plus/test";
import { ContextMenuActionEnabledError, ContextMenuActionError } from "../src/errors.js";
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
    const enabledError = new Error("enabled failed");

    const didExecute = executeContextMenuAction(
      {
        id: "throwing-enabled",
        label: "Throwing Enabled",
        enabled: () => {
          throw enabledError;
        },
        onAction,
      },
      createContext(),
    );

    expect(didExecute).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith("[react-grab]", expect.any(ContextMenuActionEnabledError));
    expect(warning.mock.calls[0]?.[1]).toMatchObject({
      actionId: "throwing-enabled",
      cause: enabledError,
    });
    warning.mockRestore();
  });

  it("contains synchronous action failures after accepting the action", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const actionError = new Error("action failed");

    const didExecute = executeContextMenuAction(
      {
        id: "throwing-action",
        label: "Throwing Action",
        onAction: () => {
          throw actionError;
        },
      },
      createContext(),
    );

    expect(didExecute).toBe(true);
    expect(warning).toHaveBeenCalledWith("[react-grab]", expect.any(ContextMenuActionError));
    expect(warning.mock.calls[0]?.[1]).toMatchObject({
      actionId: "throwing-action",
      cause: actionError,
    });
    warning.mockRestore();
  });

  it("contains asynchronous action failures", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const didExecute = executeContextMenuAction(
      {
        id: "rejecting-action",
        label: "Rejecting Action",
        onAction: () => Promise.reject(new Error("action failed")),
      },
      createContext(),
    );
    await Promise.resolve();

    expect(didExecute).toBe(true);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
