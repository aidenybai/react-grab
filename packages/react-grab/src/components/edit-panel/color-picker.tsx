import { createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { IME_COMPOSING_KEY_CODE } from "../../constants.js";
import { formatColorLabel } from "../../utils/format-color-label.js";
import { parseAnyColor } from "../../utils/parse-any-color.js";
import { EDIT_LABEL_CLASS } from "./constants.js";

// Native <input type="color"> only accepts `#rrggbb` (no alpha, no
// shorthand). Strip the alpha byte if present so the picker opens at
// the right colour without rejecting the value.
const stripHexAlpha = (hex: string): string => (hex.length === 9 ? hex.slice(0, 7) : hex);

interface ColorPickerProps {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  onEditComplete?: () => void;
  onInvalidCommit?: () => void;
  onRegisterTrigger?: (trigger: (() => void) | null, owner?: () => void) => void;
  onInteract?: () => void;
  emphasized?: boolean;
}

const HEX_CLASS = "text-[12px] leading-4 font-medium tabular-nums uppercase";

export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const isEditing = () => draftText() !== null;
  const displayValue = () => formatColorLabel(props.value);
  let nativePickerRef: HTMLInputElement | undefined;

  // isMounted gates the native picker's `onInput` against firing
  // after dismiss: the OS color dialog can outlive `<input>` detach
  // (Firefox/Safari), and a delayed `onInput` would otherwise commit
  // an untracked inline style on the original element with no
  // preview baseline to revert from.
  let isMounted = true;
  onCleanup(() => {
    isMounted = false;
  });

  onMount(() => {
    const openPicker = () => nativePickerRef?.click();
    props.onRegisterTrigger?.(openPicker);
    onCleanup(() => props.onRegisterTrigger?.(null, openPicker));
  });

  const commitHex = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    const normalizedHexColor = parseAnyColor(text);
    if (!normalizedHexColor) {
      props.onInvalidCommit?.();
    } else if (normalizedHexColor.toLowerCase() !== props.value.toLowerCase()) {
      props.onCommit(normalizedHexColor);
    }
    props.onEditComplete?.();
  };

  const cancelHex = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleHexKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE) return;
    event.stopImmediatePropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitHex();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelHex();
    }
  };

  const handleSwatchClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    props.onInteract?.();
    nativePickerRef?.click();
  };

  return (
    <div class="flex items-center gap-2 w-full px-2 h-[20px]">
      <Show when={props.label}>
        {(text) => (
          <span class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}>
            {text()}
          </span>
        )}
      </Show>
      <div class="flex items-center gap-1 ml-auto shrink-0">
        <Show
          when={isEditing()}
          fallback={
            <span
              class={`${HEX_CLASS} text-[var(--rg-text-primary)] cursor-text`}
              data-react-grab-value={displayValue()}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDraftText(displayValue());
              }}
            >
              {displayValue()}
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
            aria-label="Style color hex"
            autocapitalize="none"
            autocorrect="off"
            autocomplete="off"
            spellcheck={false}
            class={`${HEX_CLASS} bg-transparent border-none outline-none text-[var(--rg-text-primary)] p-0 m-0 text-right`}
            style={{
              "field-sizing": "content",
              "min-width": "32px",
              "max-width": props.emphasized ? "100px" : "72px",
            }}
            value={draftText() ?? ""}
            onInput={(event) => setDraftText(event.currentTarget.value)}
            onKeyDown={handleHexKeyDown}
            onBlur={commitHex}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        </Show>
        <button
          type="button"
          data-react-grab-ignore-events
          aria-label="Pick color"
          class="size-[16px] rounded-[4px] border-[var(--rg-border-button)] [border-width:0.5px] border-solid p-0 m-0 cursor-pointer shrink-0"
          style={{ "background-color": props.value }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleSwatchClick}
        />
        <input
          ref={nativePickerRef}
          data-react-grab-ignore-events
          type="color"
          aria-hidden="true"
          tabindex={-1}
          class="absolute opacity-0 pointer-events-none size-0"
          value={stripHexAlpha(props.value)}
          onInput={(event) => {
            if (!isMounted) return;
            // Native picker emits `#rrggbb`; keep partial alpha, but a fully
            // transparent start (`00`) means "no color" so pick opaque.
            const pickedRgb = event.currentTarget.value;
            const originalAlpha = props.value.length === 9 ? props.value.slice(7) : "";
            const preservedAlpha = originalAlpha.toLowerCase() === "00" ? "" : originalAlpha;
            const nextColorValue = pickedRgb + preservedAlpha;
            props.onInteract?.();
            if (nextColorValue && nextColorValue.toLowerCase() !== props.value.toLowerCase()) {
              props.onCommit(nextColorValue);
            }
          }}
        />
      </div>
    </div>
  );
};
