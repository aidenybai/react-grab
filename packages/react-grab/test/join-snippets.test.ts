import { describe, expect, it } from "vite-plus/test";
import {
  joinSnippetEntries,
  joinSnippets,
  type JoinSnippetEntry,
} from "../src/utils/join-snippets.js";
import type { ElementContextParts } from "../src/core/context.js";

const buildEntry = (
  htmlPreview: string,
  stackLines: string[],
  options: { snippetKey?: string; snippetBlock?: string; snippet?: string } = {},
): JoinSnippetEntry => {
  const sourceSnippet =
    options.snippetKey && options.snippetBlock
      ? {
          filePath: options.snippetKey.split(":")[0],
          block: options.snippetBlock,
          key: options.snippetKey,
          snippet: {
            startLine: 1,
            endLine: 5,
            highlightLine: 3,
            lines: ["a", "b", "c", "d", "e"],
            isApproximate: false,
          },
        }
      : null;
  const parts: ElementContextParts = { htmlPreview, sourceSnippet, stackLines };
  const defaultSnippet =
    stackLines.length > 0 ? `${htmlPreview}\n  ${stackLines.join("\n  ")}` : htmlPreview;
  return { snippet: options.snippet ?? defaultSnippet, parts };
};

describe("joinSnippets (legacy)", () => {
  it("returns the only snippet for a single entry", () => {
    expect(joinSnippets(["just-one"])).toBe("just-one");
  });

  it("returns empty string for no entries", () => {
    expect(joinSnippets([])).toBe("");
  });

  it("numbers entries when there are multiple", () => {
    expect(joinSnippets(["a", "b"])).toBe("[1]\na\n\n[2]\nb");
  });
});

describe("joinSnippetEntries", () => {
  it("returns the snippet for a single entry", () => {
    const entry = buildEntry("<a />", ["in Foo (at app.tsx:1)"]);
    expect(joinSnippetEntries([entry], { allowCollapse: true })).toBe(entry.snippet);
  });

  it("falls back to legacy numbering when stacks share no suffix", () => {
    const entryA = buildEntry("<a />", ["in Foo (at app/foo.tsx:1)"]);
    const entryB = buildEntry("<b />", ["in Bar (at app/bar.tsx:1)"]);
    const joined = joinSnippetEntries([entryA, entryB], { allowCollapse: true });
    expect(joined).toBe(`[1]\n${entryA.snippet}\n\n[2]\n${entryB.snippet}`);
  });

  it("falls back to legacy numbering when allowCollapse is false", () => {
    const sharedStack = ["in TodoList (at app/todo-list.tsx:18)"];
    const entryA = buildEntry("<li>1</li>", sharedStack);
    const entryB = buildEntry("<li>2</li>", sharedStack, {
      snippet: "modified by plugin",
    });
    const joined = joinSnippetEntries([entryA, entryB], { allowCollapse: false });
    expect(joined).toContain("[1]");
    expect(joined).toContain("modified by plugin");
  });

  it("collapses a fully shared stack into a single tail", () => {
    const sharedStack = ["in TodoList (at app/todo-list.tsx:18)", "in App (at app/page.tsx:5)"];
    const joined = joinSnippetEntries(
      [
        buildEntry("<li>buy milk</li>", sharedStack),
        buildEntry("<li>walk dog</li>", sharedStack),
        buildEntry("<li>code review</li>", sharedStack),
      ],
      { allowCollapse: true },
    );

    expect(joined).toContain("[1] <li>buy milk</li>");
    expect(joined).toContain("[2] <li>walk dog</li>");
    expect(joined).toContain("[3] <li>code review</li>");

    const tailMatches = joined.match(/in TodoList \(at app\/todo-list\.tsx:18\)/g) ?? [];
    expect(tailMatches.length).toBe(1);
    const appMatches = joined.match(/in App/g) ?? [];
    expect(appMatches.length).toBe(1);
  });

  it("emits diverging stack prefixes per entry above the shared tail", () => {
    const tail = ["in App (at app/page.tsx:5)"];
    const joined = joinSnippetEntries(
      [
        buildEntry("<a />", ["in HeaderLink (at app/header.tsx:8)", ...tail]),
        buildEntry("<button />", ["in FooterButton (at app/footer.tsx:12)", ...tail]),
      ],
      { allowCollapse: true },
    );

    expect(joined).toContain("in HeaderLink");
    expect(joined).toContain("in FooterButton");
    const appMatches = joined.match(/in App \(at app\/page\.tsx:5\)/g) ?? [];
    expect(appMatches.length).toBe(1);
  });

  it("emits a single shared source snippet block when all entries match", () => {
    const sharedStack = ["in TodoList (at app/todo-list.tsx:18)"];
    const sharedKey = "app/todo-list.tsx:18";
    const sharedBlock = "// app/todo-list.tsx:18\n  18| <TodoItem />";
    const joined = joinSnippetEntries(
      [
        buildEntry("<li>1</li>", sharedStack, {
          snippetKey: sharedKey,
          snippetBlock: sharedBlock,
        }),
        buildEntry("<li>2</li>", sharedStack, {
          snippetKey: sharedKey,
          snippetBlock: sharedBlock,
        }),
      ],
      { allowCollapse: true },
    );
    const matches = joined.match(/<TodoItem \/>/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("omits the source snippet from collapsed output when entries disagree on the source", () => {
    const sharedStack = ["in App (at app/page.tsx:5)"];
    const joined = joinSnippetEntries(
      [
        buildEntry("<a />", sharedStack, {
          snippetKey: "app/foo.tsx:10",
          snippetBlock: "// FOO BLOCK",
        }),
        buildEntry("<b />", sharedStack, {
          snippetKey: "app/bar.tsx:20",
          snippetBlock: "// BAR BLOCK",
        }),
      ],
      { allowCollapse: true },
    );
    expect(joined).not.toContain("FOO BLOCK");
    expect(joined).not.toContain("BAR BLOCK");
  });
});
