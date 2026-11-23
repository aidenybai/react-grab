import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { runCopyFlow } from "../src/core/copy.js";
import { resolveElementReferenceContext } from "../src/core/context.js";
import { copyContent } from "../src/utils/copy-content.js";

vi.mock("../src/core/context.js", () => ({
  resolveElementReferenceContext: vi.fn(),
}));

vi.mock("../src/utils/copy-content.js", () => ({
  copyContent: vi.fn(),
}));

const createHooks = () => ({
  onBeforeCopy: vi.fn(async () => {}),
  transformCopyContent: vi.fn(async (content: string) => content),
  onAfterCopy: vi.fn(),
  onCopySuccess: vi.fn(),
  onCopyError: vi.fn(),
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("copy payload", () => {
  it("uses one reference context resolution and keeps its independent component label", async () => {
    const element = Object.create(null);
    element.tagName = "BUTTON";
    vi.mocked(resolveElementReferenceContext).mockResolvedValue({
      componentName: "LinkComponent",
      fiber: null,
      referenceContext: '<button data-testid="docs-link">Docs</button>',
      source: {
        columnNumber: 1,
        componentName: null,
        filePath: "/src/components/docs-link.tsx",
        lineNumber: 2,
        origin: "app",
      },
      stack: [],
      stackContext: "\n  in DocsLink",
    });
    vi.mocked(copyContent).mockReturnValue(true);

    const result = await runCopyFlow({}, createHooks(), [element]);

    expect(result).toEqual({ status: "succeeded" });
    expect(resolveElementReferenceContext).toHaveBeenCalledOnce();
    expect(copyContent).toHaveBeenCalledWith(
      '[<button data-testid="docs-link">Docs</button>]',
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            componentName: "LinkComponent",
          }),
        ],
      }),
    );
  });

  describe("deliverComment", () => {
    const mockDocsLinkContext = () => {
      vi.mocked(resolveElementReferenceContext).mockResolvedValue({
        componentName: "DocsLink",
        fiber: null,
        referenceContext: "<a>Docs</a>",
        source: {
          columnNumber: 1,
          componentName: null,
          filePath: "/src/components/docs-link.tsx",
          lineNumber: 2,
          origin: "app",
        },
        stack: [],
        stackContext: "\n  in DocsLink",
      });
    };

    it("sends a commented grab to the agent instead of the clipboard", async () => {
      mockDocsLinkContext();
      const deliverComment = vi.fn(async () => {});

      const result = await runCopyFlow(
        { deliverComment },
        createHooks(),
        [Object.create(null)],
        "make it blue",
      );

      expect(result).toEqual({ status: "succeeded", statusText: "Sent to agent" });
      expect(copyContent).not.toHaveBeenCalled();
      expect(deliverComment).toHaveBeenCalledWith({
        comment: "make it blue",
        content: "make it blue\n[<a>Docs</a>]",
        entries: [
          expect.objectContaining({
            componentName: "DocsLink",
            commentText: "make it blue",
            source: expect.objectContaining({ filePath: "/src/components/docs-link.tsx" }),
          }),
        ],
      });
    });

    it("still copies plain grabs to the clipboard", async () => {
      mockDocsLinkContext();
      vi.mocked(copyContent).mockReturnValue(true);
      const deliverComment = vi.fn(async () => {});

      const result = await runCopyFlow({ deliverComment }, createHooks(), [Object.create(null)]);

      expect(result).toEqual({ status: "succeeded", statusText: undefined });
      expect(deliverComment).not.toHaveBeenCalled();
      expect(copyContent).toHaveBeenCalledOnce();
    });

    it("fails with the delivery error when the agent log is unreachable", async () => {
      mockDocsLinkContext();
      const deliverComment = vi.fn(async () => {
        throw new Error("Agent log unreachable");
      });

      const result = await runCopyFlow(
        { deliverComment },
        createHooks(),
        [Object.create(null)],
        "make it blue",
      );

      expect(result).toEqual({ status: "failed", errorMessage: "Agent log unreachable" });
      expect(copyContent).not.toHaveBeenCalled();
    });
  });
});
