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

const HIDDEN_MEDIA_TAGS = new Set(["IMG", "SVG", "PICTURE", "VIDEO", "CANVAS"]);

interface ModifiedElement {
  element: HTMLElement | SVGElement;
  previousColor: string;
  previousTextFillColor: string;
  previousTextShadow: string;
  previousBoxShadow: string;
  previousVisibility: string;
  previousFilter: string;
  didHideVisibility: boolean;
}

const isStylableElement = (
  element: Element,
): element is HTMLElement | SVGElement =>
  element instanceof HTMLElement || element instanceof SVGElement;

const hideTextInSubtree = (
  element: HTMLElement | SVGElement,
  modifiedElements: ModifiedElement[],
) => {
  modifiedElements.push({
    element,
    previousColor: element.style.color,
    previousTextFillColor: element.style.getPropertyValue(
      "-webkit-text-fill-color",
    ),
    previousTextShadow: element.style.textShadow,
    previousBoxShadow: element.style.boxShadow,
    previousVisibility: element.style.visibility,
    previousFilter: element.style.filter,
    didHideVisibility: HIDDEN_MEDIA_TAGS.has(element.tagName),
  });
  element.style.color = "transparent";
  element.style.setProperty("-webkit-text-fill-color", "transparent");
  element.style.textShadow = "none";
  element.style.boxShadow = "none";
  element.style.filter = "grayscale(1)";
  if (HIDDEN_MEDIA_TAGS.has(element.tagName)) {
    element.style.visibility = "hidden";
  }

  for (const child of Array.from(element.children)) {
    if (isStylableElement(child)) {
      hideTextInSubtree(child, modifiedElements);
    }
  }
};

const hidePageTextExcept = (
  targetElement: Element,
  shadowHost: Element | null,
): ModifiedElement[] => {
  const modifiedElements: ModifiedElement[] = [];
  let current: Element | null = targetElement;

  while (current && current !== document.body && current !== document.documentElement) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;

    for (const sibling of Array.from(parent.children)) {
      if (sibling === current || sibling === shadowHost) continue;
      if (isStylableElement(sibling)) {
        hideTextInSubtree(sibling, modifiedElements);
      }
    }

    current = parent;
  }

  return modifiedElements;
};

const restorePageText = (modifiedElements: ModifiedElement[]) => {
  for (const {
    element,
    previousColor,
    previousTextFillColor,
    previousTextShadow,
    previousBoxShadow,
    previousVisibility,
    previousFilter,
    didHideVisibility,
  } of modifiedElements) {
    element.style.color = previousColor;
    if (previousTextFillColor) {
      element.style.setProperty(
        "-webkit-text-fill-color",
        previousTextFillColor,
      );
    } else {
      element.style.removeProperty("-webkit-text-fill-color");
    }
    element.style.textShadow = previousTextShadow;
    element.style.boxShadow = previousBoxShadow;
    element.style.filter = previousFilter;
    if (didHideVisibility) {
      element.style.visibility = previousVisibility;
    }
  }
};

interface CommitWidgetProps {
  copyCount?: number;
  historyItems?: HistoryItem[];
  onActivateForCopy?: () => void;
  latestGrabbedElement?: Element;
  onPromptOpenChange?: (isOpen: boolean) => void;
}

export const CommitWidget: Component<CommitWidgetProps> = (props) => {
  const [historyLabel, setHistoryLabel] = createSignal(DEFAULT_HISTORY_LABEL);
  const [isPromptOpen, setIsPromptOpen] = createSignal(false);
  const [promptText, setPromptText] = createSignal("");
  const [promptLabel, setPromptLabel] = createSignal("Prompt");

  let promptInputRef: HTMLInputElement | undefined;
  let widgetRef: HTMLDivElement | undefined;

  createEffect(
    on(
      () => isPromptOpen(),
      (isOpen) => props.onPromptOpenChange?.(isOpen),
    ),
  );

  const getShadowHost = (): Element | null => {
    if (!widgetRef) return null;
    const root = widgetRef.getRootNode();
    if (root instanceof ShadowRoot) return root.host;
    return null;
  };

  let activeModifiedElements: ModifiedElement[] = [];
  let activeOverlay: HTMLDivElement | null = null;
  let activeScrollHandler: (() => void) | null = null;

  const cleanupDimming = () => {
    restorePageText(activeModifiedElements);
    activeModifiedElements = [];
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }
    if (activeScrollHandler) {
      window.removeEventListener("scroll", activeScrollHandler, true);
      window.removeEventListener("resize", activeScrollHandler);
      activeScrollHandler = null;
    }
  };

  const applyDimming = () => {
    const element = props.latestGrabbedElement;
    if (!element) return;

    cleanupDimming();

    activeModifiedElements = hidePageTextExcept(element, getShadowHost());

    activeOverlay = document.createElement("div");
    activeOverlay.style.cssText =
      "position:fixed;box-shadow:0 0 0 9999px rgba(0,0,0,0.08);z-index:2147483644;pointer-events:none";
    document.body.appendChild(activeOverlay);

    const overlay = activeOverlay;
    activeScrollHandler = () => {
      const rect = element.getBoundingClientRect();
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    };

    activeScrollHandler();
    window.addEventListener("scroll", activeScrollHandler, true);
    window.addEventListener("resize", activeScrollHandler);
  };

  createEffect(
    on(
      () => isPromptOpen(),
      (isOpen) => {
        if (isOpen) {
          applyDimming();
        } else {
          cleanupDimming();
        }
      },
    ),
  );

  onCleanup(cleanupDimming);

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

  const handlePromptSubmit = () => {
    const trimmedPromptText = promptText().trim();
    if (!trimmedPromptText) return;

    void navigator.clipboard.writeText(trimmedPromptText);
    setPromptLabel("Copied");
    setPromptText("");
    setTimeout(() => {
      setPromptLabel("Prompt");
      setIsPromptOpen(false);
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

  window.addEventListener("keydown", handleWindowKeyDown);
  onCleanup(() => {
    window.removeEventListener("keydown", handleWindowKeyDown);
  });

  const computedPromptLabel = () => {
    if (promptLabel() !== "Prompt") return promptLabel();
    if (isPromptOpen() && promptText().trim()) return "Copy";
    return "Prompt";
  };

  return (
    <div
      ref={widgetRef}
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        "z-index": Z_INDEX_HOST,
        "pointer-events": "auto",
      }}
    >
      <div
        class="commit-widget-container font-sans"
        style={{
          transform: isPromptOpen() ? "scale(1.2)" : "scale(1)",
        }}
      >
        <div class="commit-widget-button commit-widget-button-disabled">
          <TextMorph>{historyLabel()}</TextMorph>
          {historyLabel() === DEFAULT_HISTORY_LABEL && (
            <kbd class="commit-widget-kbd">⌃Z</kbd>
          )}
        </div>

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
