import { createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { IME_COMPOSING_KEY_CODE } from "../../constants.js";

interface TextControlProps {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  onEditComplete?: () => void;
  onInvalidCommit?: () => void;
  onRegisterTrigger?: (trigger: (() => void) | null, owner?: () => void) => void;
  onInteract?: () => void;
  emphasized?: boolean;
}

const LABEL_CLASS = "text-[13px] leading-4 font-medium";
const VALUE_CLASS = "text-[12px] leading-4 font-medium";

export const TextControl: Component<TextControlProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const isEditing = () => draftText() !== null;

  const startEditing = () => {
    props.onInteract?.();
    setDraftText(props.value);
  };

  onMount(() => {
    props.onRegisterTrigger?.(startEditing);
    onCleanup(() => props.onRegisterTrigger?.(null, startEditing));
  });

  const commitText = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    if (text.trim().length === 0) {
      props.onInvalidCommit?.();
    } else if (text !== props.value) {
      props.onCommit(text);
    }
    props.onEditComplete?.();
  };

  const cancelText = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;
    event.stopImmediatePropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitText();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelText();
    }
  };

  return (
    <div class="flex items-center gap-2 w-full px-2 h-[20px]">
      <Show when={props.label}>
        {(text) => (
          <span class={`${LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0 shrink-0`}>
            {text()}
          </span>
        )}
      </Show>
      <Show
        when={isEditing()}
        fallback={
          <span
            class={`${VALUE_CLASS} text-[var(--rg-text-primary)] cursor-text ml-auto truncate min-w-0 text-right`}
            data-react-grab-value={props.value}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              startEditing();
            }}
          >
            {props.value}
          </span>
        }
      >
        <input
          ref={(element) => {
            queueMicrotask(() => {
              element.focus();
              element.select();
            });
          }}
          data-react-grab-ignore-events
          data-react-grab-input
          type="text"
          inputmode="text"
          aria-label="Text content"
          autocapitalize="off"
          autocorrect="off"
          autocomplete="off"
          spellcheck={false}
          class={`${VALUE_CLASS} bg-transparent border-none outline-none text-[var(--rg-text-primary)] p-0 m-0 text-right ml-auto min-w-0`}
          style={{
            "field-sizing": "content",
            "min-width": "32px",
            "max-width": props.emphasized ? "200px" : "140px",
          }}
          value={draftText() ?? ""}
          onInput={(event) => setDraftText(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitText}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        />
      </Show>
    </div>
  );
};
