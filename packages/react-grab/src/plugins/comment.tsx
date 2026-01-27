// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import { createSignal, createEffect, Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";
import type { Plugin, ContextMenuAction, ToolbarAction } from "../types.js";
import { getElementContext } from "../core/context.js";
import { Arrow } from "../components/selection-label/arrow.js";
import { BottomSection } from "../components/selection-label/bottom-section.js";
import { IconSubmit } from "../components/icons/icon-submit.js";
import { IconComment } from "../components/icons/icon-comment.js";
import { cn } from "../utils/cn.js";
import { ARROW_HEIGHT_PX, LABEL_GAP_PX } from "../constants.js";
import { copyContent } from "../utils/copy-content.js";

const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="text-black/70"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

interface ElementComment {
  id: string;
  elementSelector: string;
  elementContext: string;
  text: string;
  createdAt: number;
  position: { x: number; y: number };
}

interface CommentStore {
  comments: ElementComment[];
  commentElements: Map<string, Element>;
  isInputVisible: boolean;
  inputElement: Element | null;
  inputPosition: { x: number; y: number } | null;
}

const STORAGE_KEY = "react-grab-comments";

const loadComments = (): ElementComment[] => {
  try {
    const serializedComments = sessionStorage.getItem(STORAGE_KEY);
    if (!serializedComments) return [];
    const comments = JSON.parse(serializedComments) as ElementComment[];
    return Array.isArray(comments) ? comments : [];
  } catch {
    return [];
  }
};

const saveComments = (comments: ElementComment[]): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {
    // Silently fail
  }
};

const generateUniqueSelector = (element: Element): string => {
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = element.className
    ? `.${String(element.className).split(" ").filter(Boolean).join(".")}`
    : "";
  return `${tagName}${id}${classes}`;
};

const generateCommentsMarkdown = (comments: ElementComment[]): string => {
  if (comments.length === 0) return "";

  const sections = comments.map((comment, index) => {
    const lines: string[] = [];
    lines.push(`## Comment ${index + 1}`);
    lines.push("");
    lines.push(`**Element:**`);
    lines.push("```");
    lines.push(comment.elementContext);
    lines.push("```");
    lines.push("");
    lines.push(`**Comment:** ${comment.text}`);
    return lines.join("\n");
  });

  return sections.join("\n\n---\n\n");
};

const PLUGIN_ROOT_ID = "react-grab-comment-plugin";

const createCommentPluginRoot = (): HTMLDivElement => {
  const existingRoot = document.querySelector(`#${PLUGIN_ROOT_ID}`);
  if (existingRoot instanceof HTMLDivElement && existingRoot.shadowRoot) {
    const inner = existingRoot.shadowRoot.querySelector(`[data-comment-root]`);
    if (inner instanceof HTMLDivElement) return inner;
  }

  const host = document.createElement("div");
  host.id = PLUGIN_ROOT_ID;
  host.style.zIndex = "2147483646";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.pointerEvents = "none";

  const shadowRoot = host.attachShadow({ mode: "open" });

  if (cssText) {
    const styleElement = document.createElement("style");
    styleElement.textContent = String(cssText);
    shadowRoot.appendChild(styleElement);
  }

  const root = document.createElement("div");
  root.setAttribute("data-comment-root", "true");
  shadowRoot.appendChild(root);

  document.body.appendChild(host);

  return root;
};

interface CommentInputProps {
  position: { x: number; y: number };
  element: Element;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

const CommentInput = (props: CommentInputProps) => {
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  const [measuredHeight, setMeasuredHeight] = createSignal(0);
  const [inputValue, setInputValue] = createSignal("");

  const measureContainer = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      setMeasuredWidth(rect.width);
      setMeasuredHeight(rect.height);
    }
  };

  createEffect(() => {
    requestAnimationFrame(measureContainer);
  });

  const computedPosition = () => {
    const elementRect = props.element.getBoundingClientRect();
    const labelWidth = measuredWidth();
    const labelHeight = measuredHeight();

    if (labelWidth === 0 || labelHeight === 0) {
      return {
        left: -9999,
        top: -9999,
        arrowLeft: 0,
        arrowPosition: "bottom" as const,
      };
    }

    const cursorX = props.position.x;
    const positionLeft = cursorX - labelWidth / 2;
    const arrowLeft = labelWidth / 2;

    const positionBelow = elementRect.bottom + ARROW_HEIGHT_PX + LABEL_GAP_PX;
    const positionAbove =
      elementRect.top - labelHeight - ARROW_HEIGHT_PX - LABEL_GAP_PX;
    const wouldOverflowBottom =
      positionBelow + labelHeight > window.innerHeight;
    const hasSpaceAbove = positionAbove >= 0;

    const shouldFlipAbove = wouldOverflowBottom && hasSpaceAbove;
    const positionTop = shouldFlipAbove ? positionAbove : positionBelow;
    const arrowPosition: "top" | "bottom" = shouldFlipAbove ? "top" : "bottom";

    return { left: positionLeft, top: positionTop, arrowLeft, arrowPosition };
  };

  const handleSubmit = () => {
    const text = inputValue().trim();
    if (text) {
      props.onSubmit(text);
      setInputValue("");
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
    }
  };

  createEffect(() => {
    if (inputRef) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  return (
    <div
      ref={containerRef}
      data-react-grab-ignore-events
      class="fixed font-sans text-[13px] antialiased filter-[drop-shadow(0px_0px_4px_#51515180)] select-none"
      style={{
        top: `${computedPosition().top}px`,
        left: `${computedPosition().left}px`,
        "z-index": "2147483647",
        "pointer-events": "auto",
      }}
      onPointerDown={(e) => e.stopImmediatePropagation()}
      onMouseDown={(e) => e.stopImmediatePropagation()}
      onClick={(e) => e.stopImmediatePropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      }}
    >
      <Arrow
        position={computedPosition().arrowPosition}
        leftPercent={0}
        leftOffsetPx={computedPosition().arrowLeft}
      />
      <div class="[font-synthesis:none] contain-layout flex flex-col justify-center items-start gap-1 rounded-sm bg-white antialiased w-fit h-fit max-w-[280px]">
        <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
          <span class="text-[13px] leading-4 font-sans font-medium text-black">
            Add Comment
          </span>
        </div>
        <BottomSection>
          <div class="shrink-0 flex justify-between items-end w-full min-h-4">
            <textarea
              ref={inputRef}
              data-react-grab-ignore-events
              class="text-black text-[13px] leading-4 font-medium bg-transparent border-none outline-none resize-none flex-1 p-0 m-0 wrap-break-word overflow-y-auto"
              style={{
                "field-sizing": "content",
                "min-height": "16px",
                "max-height": "95px",
                "scrollbar-width": "none",
              }}
              placeholder="type comment"
              value={inputValue()}
              onInput={(e) => setInputValue(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              class={cn(
                "contain-layout shrink-0 size-fit cursor-pointer interactive-scale ml-1",
                !inputValue().trim() && "opacity-35",
              )}
              onClick={handleSubmit}
            >
              <IconSubmit size={16} class="text-black" />
            </button>
          </div>
        </BottomSection>
      </div>
    </div>
  );
};

interface CommentMarkerProps {
  comment: ElementComment;
  onDelete: (id: string) => void;
}

const CommentMarker = (props: CommentMarkerProps) => {
  const [isExpanded, setIsExpanded] = createSignal(false);

  return (
    <div
      data-react-grab-ignore-events
      class="fixed font-sans text-[13px] antialiased select-none"
      style={{
        left: `${props.comment.position.x - 8}px`,
        top: `${props.comment.position.y - 8}px`,
        "z-index": "2147483646",
        "pointer-events": "auto",
      }}
      onPointerDown={(e) => e.stopImmediatePropagation()}
      onMouseDown={(e) => e.stopImmediatePropagation()}
      onClick={(e) => e.stopImmediatePropagation()}
    >
      <button
        class="w-5 h-5 flex items-center justify-center rounded-full bg-amber-400 text-white cursor-pointer border-none shadow-md hover:scale-110 transition-transform"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((v) => !v);
        }}
      >
        <IconComment size={12} />
      </button>
      <Show when={isExpanded()}>
        <div class="absolute top-6 left-0 [font-synthesis:none] contain-layout flex flex-col justify-center items-start gap-1 rounded-sm bg-white antialiased w-fit h-fit min-w-[100px] max-w-[250px] filter-[drop-shadow(0px_0px_4px_#51515180)]">
          <div class="contain-layout shrink-0 flex items-center gap-1 pt-1 w-fit h-fit pl-1.5 pr-1">
            <span class="text-[13px] leading-4 font-sans font-medium text-black whitespace-pre-wrap wrap-break-word">
              {props.comment.text}
            </span>
          </div>
          <BottomSection>
            <div class="flex flex-col w-[calc(100%+16px)] -mx-2 -my-[5px]">
              <button
                class="contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer transition-colors hover:bg-black/5 text-left border-none bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDelete(props.comment.id);
                }}
              >
                <span class="text-[13px] leading-4 font-sans font-medium text-red-600">
                  Delete
                </span>
              </button>
            </div>
          </BottomSection>
        </div>
      </Show>
    </div>
  );
};

interface CommentPluginUIProps {
  store: CommentStore;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const CommentPluginUI = (props: CommentPluginUIProps) => {
  return (
    <>
      <Show
        when={
          props.store.isInputVisible &&
          props.store.inputElement &&
          props.store.inputPosition
        }
      >
        <CommentInput
          position={props.store.inputPosition!}
          element={props.store.inputElement!}
          onSubmit={props.onSubmit}
          onCancel={props.onCancel}
        />
      </Show>
      <For each={props.store.comments}>
        {(comment) => (
          <CommentMarker comment={comment} onDelete={props.onDelete} />
        )}
      </For>
    </>
  );
};

export interface CommentPluginOptions {
  toolbarButton?: boolean;
}

export const createCommentPlugin = (
  options: CommentPluginOptions = {},
): Plugin => {
  const { toolbarButton = true } = options;

  let disposeUI: (() => void) | null = null;
  let lastContextElement: Element | null = null;
  let lastContextPosition: { x: number; y: number } | null = null;

  const [store, setStore] = createStore<CommentStore>({
    comments: loadComments(),
    commentElements: new Map(),
    isInputVisible: false,
    inputElement: null,
    inputPosition: null,
  });

  const showInput = (element: Element, position: { x: number; y: number }) => {
    setStore("isInputVisible", true);
    setStore("inputElement", element);
    setStore("inputPosition", position);
  };

  const hideInput = () => {
    setStore("isInputVisible", false);
    setStore("inputElement", null);
    setStore("inputPosition", null);
  };

  const addComment = async (text: string) => {
    const element = store.inputElement;
    const position = store.inputPosition;
    if (!element || !position) return;

    const elementContext = await getElementContext(element);
    const selector = generateUniqueSelector(element);
    const elementRect = element.getBoundingClientRect();

    const comment: ElementComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      elementSelector: selector,
      elementContext,
      text,
      createdAt: Date.now(),
      position: { x: elementRect.left, y: elementRect.top },
    };

    const newComments = [...store.comments, comment];
    saveComments(newComments);
    setStore("comments", newComments);

    const newElements = new Map(store.commentElements);
    newElements.set(comment.id, element);
    setStore("commentElements", newElements);

    hideInput();
  };

  const deleteComment = (commentId: string) => {
    const newComments = store.comments.filter((c) => c.id !== commentId);
    saveComments(newComments);
    setStore("comments", newComments);

    const newElements = new Map(store.commentElements);
    newElements.delete(commentId);
    setStore("commentElements", newElements);
  };

  const updatePositions = () => {
    const currentComments = store.comments;
    if (currentComments.length === 0) return;

    const updatedComments: ElementComment[] = [];
    let didChange = false;

    for (const comment of currentComments) {
      const element = store.commentElements.get(comment.id);
      if (element && document.body.contains(element)) {
        const rect = element.getBoundingClientRect();
        const newPosition = { x: rect.left, y: rect.top };
        if (
          newPosition.x !== comment.position.x ||
          newPosition.y !== comment.position.y
        ) {
          updatedComments.push({ ...comment, position: newPosition });
          didChange = true;
        } else {
          updatedComments.push(comment);
        }
      } else {
        updatedComments.push(comment);
      }
    }

    if (didChange) {
      setStore("comments", updatedComments);
    }
  };

  const copyAllComments = () => {
    const markdown = generateCommentsMarkdown(store.comments);
    if (markdown) {
      copyContent(markdown);
    }
  };

  const commentAction: ContextMenuAction = {
    id: "comment",
    label: "Comment",
    shortcut: "M",
    onAction: () => {
      if (lastContextElement && lastContextPosition) {
        showInput(lastContextElement, lastContextPosition);
      }
    },
  };

  const toolbarActions: ToolbarAction[] = [];

  if (toolbarButton) {
    toolbarActions.push({
      id: "copy-comments",
      icon: CopyIcon,
      tooltip: () =>
        `Copy ${store.comments.length} comment${store.comments.length === 1 ? "" : "s"}`,
      badge: () => (store.comments.length > 0 ? store.comments.length : null),
      enabled: () => store.comments.length > 0,
      onClick: copyAllComments,
    });
  }

  return {
    name: "comment",
    actions: [commentAction],
    toolbarActions,
    hooks: {
      onContextMenu: (element, position) => {
        lastContextElement = element;
        lastContextPosition = position;
      },
      onActivate: () => {
        updatePositions();
      },
      onDeactivate: () => {
        hideInput();
      },
    },
    setup: () => {
      const root = createCommentPluginRoot();

      disposeUI = render(
        () => (
          <CommentPluginUI
            store={store}
            onSubmit={(text) => void addComment(text)}
            onCancel={hideInput}
            onDelete={deleteComment}
          />
        ),
        root,
      );

      const handleScroll = () => updatePositions();
      const handleResize = () => updatePositions();

      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", handleResize, { passive: true });

      const intervalId = setInterval(updatePositions, 1000);

      return {
        cleanup: () => {
          disposeUI?.();
          window.removeEventListener("scroll", handleScroll, { capture: true });
          window.removeEventListener("resize", handleResize);
          clearInterval(intervalId);

          const host = document.getElementById(PLUGIN_ROOT_ID);
          if (host) {
            host.remove();
          }
        },
      };
    },
  };
};
