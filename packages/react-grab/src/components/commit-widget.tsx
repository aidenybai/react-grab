import { createSignal, createEffect, on, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import type { HistoryItem } from "../types.js";
import { TextMorph } from "./text-morph.js";
import { createMenuHighlight } from "../utils/create-menu-highlight.js";
import {
  COMMIT_WIDGET_FEEDBACK_DURATION_MS,
  COMMIT_WIDGET_PROMPT_WIDTH_PX,
  Z_INDEX_HOST,
} from "../constants.js";

const UNDO_CLIPBOARD_PROMPT =
  "Undo the latest change you just made. Revert the most recent modification to the file(s) you last edited. Do not ask for confirmation — just undo it.";

const DEFAULT_HISTORY_LABEL = "History";
const SPOTLIGHT_PADDING_PX = 6;
const SPOTLIGHT_BORDER_RADIUS_PX = 10;

const formatElementLabel = (item: HistoryItem): string => {
  if (item.componentName) return `${item.componentName}.${item.tagName}`;
  return item.tagName;
};

interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CommitWidgetProps {
  copyCount?: number;
  historyItems?: HistoryItem[];
  onActivateForCopy?: () => void;
  onCopyHtml?: () => void;
  onCopyStyles?: () => void;
  latestGrabbedElement?: Element;
}

export const CommitWidget: Component<CommitWidgetProps> = (props) => {
  const [historyLabel, setHistoryLabel] = createSignal(DEFAULT_HISTORY_LABEL);
  const [isPromptOpen, setIsPromptOpen] = createSignal(false);
  const [promptText, setPromptText] = createSignal("");
  const [promptLabel, setPromptLabel] = createSignal("Prompt");
  const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
  const [spotlightBounds, setSpotlightBounds] =
    createSignal<SpotlightBounds | null>(null);

  const {
    containerRef: dropdownContainerRef,
    highlightRef: dropdownHighlightRef,
    updateHighlight: updateDropdownHighlight,
    clearHighlight: clearDropdownHighlight,
  } = createMenuHighlight();

  let promptInputRef: HTMLInputElement | undefined;

  const hasSelectedElement = () =>
    historyLabel() !== DEFAULT_HISTORY_LABEL &&
    historyLabel() !== "Prompt copied";

  const computeSpotlightBounds = (): SpotlightBounds | null => {
    const element = props.latestGrabbedElement;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top - SPOTLIGHT_PADDING_PX,
      left: rect.left - SPOTLIGHT_PADDING_PX,
      width: rect.width + SPOTLIGHT_PADDING_PX * 2,
      height: rect.height + SPOTLIGHT_PADDING_PX * 2,
    };
  };

  createEffect(() => {
    if (!isPromptOpen() || !props.latestGrabbedElement) {
      setSpotlightBounds(null);
      return;
    }

    setSpotlightBounds(computeSpotlightBounds());

    const handleScrollOrResize = () =>
      setSpotlightBounds(computeSpotlightBounds());

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    onCleanup(() => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    });
  });

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
    if (!hasSelectedElement()) return;
    setIsDropdownOpen(!isDropdownOpen());
  };

  const handleDropdownAction = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

  const handlePromptSubmit = () => {
    const trimmedPromptText = promptText().trim();
    if (!trimmedPromptText) return;

    void navigator.clipboard.writeText(trimmedPromptText);
    setPromptLabel("Copied");
    setIsPromptOpen(false);
    setPromptText("");
    setTimeout(() => {
      setPromptLabel("Prompt");
    }, COMMIT_WIDGET_FEEDBACK_DURATION_MS);
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
      void navigator.clipboard.writeText(UNDO_CLIPBOARD_PROMPT);
      setHistoryLabel("Prompt copied");
      setTimeout(() => {
        const latestItem = props.historyItems?.[0];
        setHistoryLabel(
          latestItem ? formatElementLabel(latestItem) : DEFAULT_HISTORY_LABEL,
        );
      }, COMMIT_WIDGET_FEEDBACK_DURATION_MS);
    }
  };

  const handleWindowPointerDown = (event: MouseEvent) => {
    if (!isDropdownOpen()) return;
    const isInsideWidget = event.composedPath().some(
      (node) =>
        node instanceof HTMLElement &&
        (node.hasAttribute("data-commit-dropdown") ||
          node.hasAttribute("data-commit-history-button")),
    );
    if (isInsideWidget) return;
    setIsDropdownOpen(false);
  };

  window.addEventListener("keydown", handleWindowKeyDown);
  window.addEventListener("pointerdown", handleWindowPointerDown, true);
  onCleanup(() => {
    window.removeEventListener("keydown", handleWindowKeyDown);
    window.removeEventListener("pointerdown", handleWindowPointerDown, true);
  });

  const computedPromptLabel = () => {
    if (promptLabel() !== "Prompt") return promptLabel();
    if (isPromptOpen() && promptText().trim()) return "Copy";
    return "Prompt";
  };

  return (
    <>
      <Show when={spotlightBounds()}>
        {(bounds) => (
          <div
            class="commit-widget-spotlight"
            style={{
              top: `${bounds().top}px`,
              left: `${bounds().left}px`,
              width: `${bounds().width}px`,
              height: `${bounds().height}px`,
              "border-radius": `${SPOTLIGHT_BORDER_RADIUS_PX}px`,
            }}
          />
        )}
      </Show>

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
        <Show when={isDropdownOpen()}>
          <div
            data-commit-dropdown
            class="commit-widget-dropdown font-sans"
          >
            <div
              ref={dropdownContainerRef}
              class="commit-widget-dropdown-list"
            >
              <div
                ref={dropdownHighlightRef}
                class="commit-widget-dropdown-highlight"
              />
              <button
                class="commit-widget-dropdown-item"
                onPointerEnter={(event) =>
                  updateDropdownHighlight(event.currentTarget)
                }
                onPointerLeave={clearDropdownHighlight}
                onClick={() =>
                  handleDropdownAction(() => props.onCopyHtml?.())
                }
              >
                Copy HTML
              </button>
              <button
                class="commit-widget-dropdown-item"
                onPointerEnter={(event) =>
                  updateDropdownHighlight(event.currentTarget)
                }
                onPointerLeave={clearDropdownHighlight}
                onClick={() =>
                  handleDropdownAction(() => props.onCopyStyles?.())
                }
              >
                Copy styles
              </button>
            </div>
          </div>
        </Show>

        <div class="commit-widget-container font-sans">
          <button
            data-commit-history-button
            class={`commit-widget-button ${
              hasSelectedElement()
                ? "commit-widget-button-ghost"
                : "commit-widget-button-disabled"
            }`}
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
    </>
  );
};
