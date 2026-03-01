import { createSignal, createEffect, on, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { HistoryItem } from "../types.js";
import { TextMorph } from "./text-morph.js";
import {
  COMMIT_WIDGET_FEEDBACK_DURATION_MS,
  COMMIT_WIDGET_PROMPT_WIDTH_PX,
  Z_INDEX_HOST,
} from "../constants.js";

const UNDO_CLIPBOARD_PROMPT =
  "Undo the latest change you just made. Revert the most recent modification to the file(s) you last edited. Do not ask for confirmation — just undo it.";

const DEFAULT_HISTORY_LABEL = "History";

const formatElementLabel = (item: HistoryItem): string => {
  if (item.componentName) return `${item.componentName}.${item.tagName}`;
  return item.tagName;
};

interface CommitWidgetProps {
  copyCount?: number;
  historyItems?: HistoryItem[];
  onActivateForCopy?: () => void;
}

export const CommitWidget: Component<CommitWidgetProps> = (props) => {
  const [historyLabel, setHistoryLabel] = createSignal(DEFAULT_HISTORY_LABEL);
  const [isPromptOpen, setIsPromptOpen] = createSignal(false);
  const [promptText, setPromptText] = createSignal("");
  const [promptLabel, setPromptLabel] = createSignal("Prompt");

  let promptInputRef: HTMLInputElement | undefined;

  createEffect(
    on(
      () => props.copyCount ?? 0,
      () => {
        const latestItem = props.historyItems?.[0];
        if (latestItem) {
          setHistoryLabel(formatElementLabel(latestItem));
        }
        setIsPromptOpen(true);
        requestAnimationFrame(() => promptInputRef?.focus());
      },
      { defer: true },
    ),
  );

  const handleHistoryClick = () => {
    void navigator.clipboard.writeText(UNDO_CLIPBOARD_PROMPT);
    setHistoryLabel("Prompt copied");
    setTimeout(
      () => {
        const latestItem = props.historyItems?.[0];
        setHistoryLabel(
          latestItem ? formatElementLabel(latestItem) : DEFAULT_HISTORY_LABEL,
        );
      },
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
      return;
    }

    if (isPromptOpen()) {
      setIsPromptOpen(false);
      setPromptText("");
      return;
    }

    props.onActivateForCopy?.();
  };

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === "z") {
      event.preventDefault();
      handleHistoryClick();
    }
  };

  window.addEventListener("keydown", handleWindowKeyDown);
  onCleanup(() => window.removeEventListener("keydown", handleWindowKeyDown));

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
          onClick={handleHistoryClick}
        >
          <TextMorph>{historyLabel()}</TextMorph>
          {historyLabel() === DEFAULT_HISTORY_LABEL && (
            <kbd class="commit-widget-kbd">⌃Z</kbd>
          )}
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
