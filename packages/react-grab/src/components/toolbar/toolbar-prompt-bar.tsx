import { createSignal, mergeProps, onMount, Show, type Component } from "solid-js";
import { IME_COMPOSING_KEY_CODE, TEXTAREA_MAX_HEIGHT_PX } from "../../constants.js";
import { autoResizeTextarea } from "../../utils/auto-resize-textarea.js";
import { resizeTextareaAnimated } from "../../utils/resize-textarea-animated.js";
import { IconSelect } from "../icons/icon-select.jsx";
import { IconSubmit } from "../icons/icon-submit.jsx";
import { IconCheck } from "../icons/icon-check.jsx";

interface ToolbarPromptBarProps {
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onSelectClick?: () => void;
  isCopied?: boolean;
  autoFocus?: boolean;
}

export const ToolbarPromptBar: Component<ToolbarPromptBarProps> = (rawProps) => {
  const props = mergeProps({ value: "", placeholder: "Add context" }, rawProps);
  let inputRef: HTMLTextAreaElement | undefined;
  const [isEntered, setIsEntered] = createSignal(false);

  onMount(() => {
    requestAnimationFrame(() => setIsEntered(true));
  });

  const canSubmit = () => props.value.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;
    event.stopImmediatePropagation();
    if (event.code === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit()) props.onSubmit();
    } else if (event.code === "Escape") {
      event.preventDefault();
      props.onCancel?.();
    }
  };

  const handleInput = (event: InputEvent) => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLTextAreaElement)) return;
    resizeTextareaAnimated(target, TEXTAREA_MAX_HEIGHT_PX);
    props.onValueChange(target.value);
  };

  return (
    <div
      data-react-grab-ignore-events
      data-react-grab-toolbar-prompt
      class="flex items-end justify-center rounded-[16px] [corner-shape:superellipse(1.25)] antialiased font-sans text-[13px] select-none [font-synthesis:none] bg-[var(--rg-panel-bg)] [box-shadow:var(--rg-shadow)] py-1.5 px-2 gap-1.5 origin-bottom transition-[opacity,transform] duration-180 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        opacity: isEntered() ? 1 : 0,
        transform: isEntered() ? "scale(1)" : "scale(0.92)",
      }}
    >
      <button
        data-react-grab-ignore-events
        type="button"
        aria-label="Stop selecting element"
        class="group contain-layout shrink-0 flex items-center justify-center cursor-pointer interactive-scale a11y-hitbox"
        on:click={(event) => {
          event.stopImmediatePropagation();
          props.onSelectClick?.();
        }}
      >
        <IconSelect
          size={14}
          class="text-[var(--rg-text-primary)] group-hover:text-[var(--rg-text-secondary)]"
        />
      </button>

      <textarea
        ref={(element) => {
          inputRef = element;
          if (props.autoFocus !== false) {
            queueMicrotask(() => {
              element.focus({ preventScroll: true });
              autoResizeTextarea(element, TEXTAREA_MAX_HEIGHT_PX);
            });
          }
        }}
        data-react-grab-ignore-events
        data-react-grab-input
        autocapitalize="none"
        autocorrect="off"
        autocomplete="off"
        spellcheck={false}
        rows={1}
        value={props.value}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        on:pointerdown={(event) => {
          event.stopImmediatePropagation();
          inputRef?.focus({ preventScroll: true });
        }}
        aria-label="Add context for selected element"
        aria-keyshortcuts="Enter Escape"
        placeholder={props.placeholder}
        class="w-[200px] min-w-0 resize-none overflow-y-auto bg-transparent border-none outline-none p-0 m-0 text-[var(--rg-text-primary)] text-[13px] leading-4 font-medium wrap-break-word placeholder:text-[var(--rg-text-secondary)]"
        style={{
          "min-height": "16px",
          "max-height": `${TEXTAREA_MAX_HEIGHT_PX}px`,
          "scrollbar-width": "none",
          transition: "height 180ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />

      <button
        data-react-grab-ignore-events
        data-react-grab-submit
        type="button"
        aria-label="Copy as prompt"
        aria-keyshortcuts="Enter"
        class="contain-layout shrink-0 flex items-center justify-center size-4 rounded-full bg-[var(--rg-submit-bg)] cursor-pointer ml-1 interactive-scale a11y-hitbox transition-opacity"
        classList={{ "opacity-40 cursor-not-allowed": !canSubmit() && !props.isCopied }}
        on:click={(event) => {
          event.stopImmediatePropagation();
          if (canSubmit()) props.onSubmit();
        }}
      >
        <Show
          when={props.isCopied}
          fallback={<IconSubmit size={10} aria-hidden="true" class="text-[var(--rg-submit-fg)]" />}
        >
          <IconCheck size={10} aria-hidden="true" class="text-[var(--rg-submit-fg)]" />
        </Show>
      </button>
    </div>
  );
};
