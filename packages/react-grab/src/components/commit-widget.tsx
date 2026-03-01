import { createSignal, createEffect, on, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { HistoryItem } from "../types.js";
import { TextMorph } from "./text-morph.js";
import {
  COMMIT_WIDGET_FEEDBACK_DURATION_MS,
  COMMIT_WIDGET_PROMPT_WIDTH_PX,
  Z_INDEX_HOST,
} from "../constants.js";

const parseRgbLuminance = (color: string): number | null => {
  const match = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
  );
  if (!match) return null;
  const red = Number(match[1]) / 255;
  const green = Number(match[2]) / 255;
  const blue = Number(match[3]) / 255;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const isPageBackgroundLight = (): boolean => {
  for (const element of [document.body, document.documentElement]) {
    const backgroundColor = getComputedStyle(element).backgroundColor;
    if (backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)") continue;
    const luminance = parseRgbLuminance(backgroundColor);
    if (luminance !== null) return luminance > 0.5;
  }
  return true;
};

const UNDO_CLIPBOARD_PROMPT =
  "Undo the latest change you just made. Revert the most recent modification to the file(s) you last edited. Do not ask for confirmation — just undo it.";

const DEFAULT_HISTORY_LABEL = "History";

const formatElementLabel = (item: HistoryItem): string => {
  if (item.componentName) return `${item.componentName}.${item.tagName}`;
  return item.tagName;
};

const HIDDEN_MEDIA_TAGS = new Set(["IMG", "SVG", "PICTURE", "VIDEO", "CANVAS"]);

const DIMMED_OPACITY = "0.65";

interface ModifiedElement {
  element: HTMLElement | SVGElement;
  previousColor: string;
  previousTextFillColor: string;
  previousTextShadow: string;
  previousBoxShadow: string;
  previousOpacity: string;
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
    previousOpacity: element.style.opacity,
    previousVisibility: element.style.visibility,
    previousFilter: element.style.filter,
    didHideVisibility: HIDDEN_MEDIA_TAGS.has(element.tagName),
  });
  element.style.color = "transparent";
  element.style.setProperty("-webkit-text-fill-color", "transparent");
  element.style.textShadow = "none";
  element.style.boxShadow = "none";
  element.style.opacity = DIMMED_OPACITY;
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
    previousOpacity,
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
    element.style.opacity = previousOpacity;
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
  const [isLightMode, setIsLightMode] = createSignal(isPageBackgroundLight());

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

  const cleanupDimming = () => {
    restorePageText(activeModifiedElements);
    activeModifiedElements = [];
  };

  const applyDimming = () => {
    const element = props.latestGrabbedElement;
    if (!element) return;

    cleanupDimming();

    activeModifiedElements = hidePageTextExcept(element, getShadowHost());
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
        setIsLightMode(isPageBackgroundLight());
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
      class={isLightMode() ? "commit-widget-light" : ""}
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
