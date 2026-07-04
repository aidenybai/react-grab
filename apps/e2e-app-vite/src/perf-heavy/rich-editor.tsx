import { useEffect, useMemo, useRef, useState } from "react";
import { EDITOR_PARAGRAPH_COUNT } from "./constants";
import { createSeededRandom } from "./synthetic-data";

const SENTENCE_FRAGMENTS = [
  "The virtualizer recycles rows as the viewport moves",
  "Selection bounds must chase live geometry",
  "Pointer capture retargets subsequent events",
  "The freeze path walks every running animation",
  "Backdrop filters force expensive repaints",
  "Long tasks block the next paint",
];

const buildParagraphText = (random: () => number): string =>
  Array.from(
    { length: 3 + Math.floor(random() * 3) },
    () => SENTENCE_FRAGMENTS[Math.floor(random() * SENTENCE_FRAGMENTS.length)],
  ).join(". ") + ".";

// A rich-text-editor-shaped interference fixture:
//
// - contenteditable with many block nodes and per-input reprocessing (word/
//   char counts walk the whole document on every keystroke).
// - a document-level CAPTURE listener layer that serializes an ancestor-path
//   string for every pointerdown/click (the analytics-SDK pattern) — heavy
//   synchronous work on the exact events react-grab races on.
// - a capture-phase pointermove listener that calls stopPropagation():
//   react-grab listens on window (which fires first), so detection must
//   survive an app swallowing pointermove below it.
// - a selectionchange listener reading getSelection() (editor toolbars do
//   this), which fires during grab clicks and drags too.
export const RichEditorSection = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [documentStats, setDocumentStats] = useState({ words: 0, characters: 0 });
  const [selectionPreview, setSelectionPreview] = useState("");

  const paragraphs = useMemo(() => {
    const random = createSeededRandom(0xed17);
    return Array.from({ length: EDITOR_PARAGRAPH_COUNT }, () => buildParagraphText(random));
  }, []);

  const recomputeStats = () => {
    const editorElement = editorRef.current;
    if (!editorElement) return;
    const fullText = editorElement.innerText;
    setDocumentStats({
      words: fullText.split(/\s+/).filter(Boolean).length,
      characters: fullText.length,
    });
  };

  useEffect(recomputeStats, []);

  useEffect(() => {
    const serializeEventPath = (event: Event): void => {
      const pathSegments: string[] = [];
      let cursorElement = event.target instanceof Element ? event.target : null;
      while (cursorElement) {
        pathSegments.push(
          `${cursorElement.tagName.toLowerCase()}${cursorElement.id ? `#${cursorElement.id}` : ""}.${
            cursorElement.className && typeof cursorElement.className === "string"
              ? cursorElement.className.split(" ").slice(0, 3).join(".")
              : ""
          }`,
        );
        cursorElement = cursorElement.parentElement;
      }
      (window as { __ANALYTICS_PATHS__?: string[] }).__ANALYTICS_PATHS__ = pathSegments;
    };
    const swallowPointerMove = (event: Event): void => {
      event.stopPropagation();
    };
    const handleSelectionChange = (): void => {
      setSelectionPreview(document.getSelection()?.toString().slice(0, 60) ?? "");
    };
    document.addEventListener("pointerdown", serializeEventPath, { capture: true });
    document.addEventListener("click", serializeEventPath, { capture: true });
    document.addEventListener("pointermove", swallowPointerMove, { capture: true });
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("pointerdown", serializeEventPath, { capture: true });
      document.removeEventListener("click", serializeEventPath, { capture: true });
      document.removeEventListener("pointermove", swallowPointerMove, { capture: true });
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  return (
    <section data-testid="heavy-editor-section" className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">
        Rich Editor ({EDITOR_PARAGRAPH_COUNT} blocks + capture-layer interference)
      </h2>
      <div className="flex gap-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
        <span data-testid="editor-word-count">{documentStats.words} words</span>
        <span data-testid="editor-char-count">{documentStats.characters} chars</span>
        <span data-testid="editor-selection-preview" className="normal-case">
          sel: {selectionPreview || "—"}
        </span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-testid="rich-editor"
        onInput={recomputeStats}
        className="max-h-96 overflow-auto rounded border bg-white p-4 text-sm leading-6 outline-none"
      >
        {paragraphs.map((paragraphText, paragraphIndex) => (
          <p key={paragraphIndex} data-editor-paragraph={paragraphIndex}>
            {paragraphText}
          </p>
        ))}
      </div>
    </section>
  );
};
