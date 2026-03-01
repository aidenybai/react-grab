import { createSignal, createEffect, on, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { SelectionLabelInstance } from "../types.js";
import { TextMorph } from "./text-morph.js";
import {
  COMMIT_WIDGET_FEEDBACK_DURATION_MS,
  COMMIT_WIDGET_PROMPT_WIDTH_PX,
  Z_INDEX_HOST,
} from "../constants.js";

const UNDO_CLIPBOARD_PROMPT =
  "Undo the latest change you just made. Revert the most recent modification to the file(s) you last edited. Do not ask for confirmation — just undo it.";

const COMMIT_CLIPBOARD_PROMPT =
  "Commit all current changes with a concise, descriptive commit message and push to the current remote branch. If no remote branch exists, create one. Do not ask for confirmation — just commit and push.";

interface CommitWidgetProps {
  labelInstances?: SelectionLabelInstance[];
}

export const CommitWidget: Component<CommitWidgetProps> = (props) => {
  const [undoLabel, setUndoLabel] = createSignal("Undo");
  const [commitLabel, setCommitLabel] = createSignal("Commit");
  const [isPromptOpen, setIsPromptOpen] = createSignal(false);
  const [promptText, setPromptText] = createSignal("");
  const [promptLabel, setPromptLabel] = createSignal("Prompt");

  let promptInputRef: HTMLInputElement | undefined;
  let previousCopiedCount = 0;

  createEffect(
    on(
      () =>
        (props.labelInstances ?? []).filter(
          (instance) => instance.status === "copied",
        ).length,
      (copiedCount) => {
        if (copiedCount > previousCopiedCount) {
          setIsPromptOpen(true);
          requestAnimationFrame(() => promptInputRef?.focus());
        }
        previousCopiedCount = copiedCount;
      },
    ),
  );

  const handleUndo = () => {
    void navigator.clipboard.writeText(UNDO_CLIPBOARD_PROMPT);
    setUndoLabel("Prompt copied");
    setTimeout(() => setUndoLabel("Undo"), COMMIT_WIDGET_FEEDBACK_DURATION_MS);
  };

  const handleCommit = () => {
    void navigator.clipboard.writeText(COMMIT_CLIPBOARD_PROMPT);
    setCommitLabel("Prompt copied");
    setTimeout(
      () => setCommitLabel("Commit"),
      COMMIT_WIDGET_FEEDBACK_DURATION_MS,
    );
  };

  const handlePromptSubmit = () => {
    const trimmedPromptText = promptText().trim();
    if (!trimmedPromptText) return;

    void navigator.clipboard.writeText(trimmedPromptText);
    setPromptLabel("Copied");
    setIsPromptOpen(false);
    setPromptText("");
    setTimeout(
      () => setPromptLabel("Prompt"),
      COMMIT_WIDGET_FEEDBACK_DURATION_MS,
    );
  };

  const handlePromptButtonClick = () => {
    if (isPromptOpen() && promptText().trim()) {
      handlePromptSubmit();
    } else {
      setIsPromptOpen(!isPromptOpen());
      requestAnimationFrame(() => promptInputRef?.focus());
    }
  };

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "z") {
      event.preventDefault();
      handleUndo();
    }
    if (event.ctrlKey && event.key === "c") {
      event.preventDefault();
      handleCommit();
    }
  };

  window.addEventListener("keydown", handleWindowKeyDown);
  onCleanup(() => window.removeEventListener("keydown", handleWindowKeyDown));

  const isCommitLabelActive = () => commitLabel() === "Prompt copied";

  const computedPromptLabel = () => {
    if (promptLabel() !== "Prompt") return promptLabel();
    if (isPromptOpen() && promptText().trim()) return "Copy";
    return "Prompt";
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        "z-index": Z_INDEX_HOST,
        "pointer-events": "auto",
      }}
    >
      <div class="commit-widget-container font-sans">
        <button
          class="commit-widget-button commit-widget-button-ghost"
          onClick={handleUndo}
        >
          <TextMorph>{undoLabel()}</TextMorph>
          <kbd class="commit-widget-kbd">⌃Z</kbd>
        </button>

        <div class="commit-widget-divider" />

        <button
          class={`commit-widget-button ${
            isCommitLabelActive()
              ? "commit-widget-button-active"
              : "commit-widget-button-commit"
          }`}
          onClick={handleCommit}
        >
          <TextMorph>{commitLabel()}</TextMorph>
          <kbd
            class={`commit-widget-kbd ${
              isCommitLabelActive()
                ? "commit-widget-kbd-active"
                : "commit-widget-kbd-commit"
            }`}
          >
            ⌃C
          </kbd>
        </button>

        <div class="commit-widget-divider" />

        <div
          class="commit-widget-prompt-input-wrapper"
          style={{
            width: isPromptOpen()
              ? `${COMMIT_WIDGET_PROMPT_WIDTH_PX}px`
              : "0px",
            opacity: isPromptOpen() ? 1 : 0,
          }}
        >
          <input
            ref={promptInputRef}
            type="text"
            value={promptText()}
            onInput={(event) => setPromptText(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handlePromptSubmit();
              }
              if (event.key === "Escape") {
                setIsPromptOpen(false);
                setPromptText("");
              }
            }}
            placeholder="Type a prompt..."
            class="commit-widget-prompt-input"
          />
        </div>

        <button
          class="commit-widget-button commit-widget-button-ghost"
          onClick={handlePromptButtonClick}
        >
          <TextMorph>{computedPromptLabel()}</TextMorph>
        </button>
      </div>
    </div>
  );
};
