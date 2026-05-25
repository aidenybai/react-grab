import { createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { parseAnyColor } from "../../utils/parse-any-color.js";

// Native <input type="color"> only accepts `#rrggbb` (no alpha, no
// shorthand). Strip the alpha byte if present so the picker opens at
// the right colour without rejecting the value.
const stripHexAlpha = (hex: string): string => (hex.length === 9 ? hex.slice(0, 7) : hex);

interface ColorPickerProps {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  // Called after the inline hex editor commits / cancels so the panel can
  // return focus to the search input (mirrors ValueStepper.onEditComplete).
  onEditComplete?: () => void;
  // Lets the parent imperatively open the native color picker (used by
  // the panel's Enter key handler on color rows). Called with the
  // trigger function on mount and `null` on unmount.
  onRegisterTrigger?: (trigger: (() => void) | null) => void;
  // Signals "user is engaging with this control" so the panel can keep
  // the page-level selection overlay hidden AND lock hover-driven
  // active-row swaps in the property list. Fires on swatch open and
  // on every native picker change.
  onInteract?: () => void;
  emphasized?: boolean;
}

const LABEL_CLASS = "text-[13px] leading-4 font-medium";
const HEX_CLASS = "text-[12px] leading-4 font-medium tabular-nums uppercase";

export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const isEditing = () => draftText() !== null;
  let nativePickerRef: HTMLInputElement | undefined;

  onMount(() => {
    props.onRegisterTrigger?.(() => nativePickerRef?.click());
    onCleanup(() => props.onRegisterTrigger?.(null));
  });

  const commitHex = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    // parseAnyColor accepts hex w/ or w/o `#`, 3/4/6/8 digits,
    // rgb/rgba, hsl/hsla, and CSS named colours — anything the browser
    // parses through the canvas fillStyle setter.
    const normalized = parseAnyColor(text);
    if (normalized && normalized.toLowerCase() !== props.value.toLowerCase()) {
      props.onCommit(normalized);
    }
    props.onEditComplete?.();
  };

  const cancelHex = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleHexKeyDown = (event: KeyboardEvent) => {
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
      <Show when={props.label} keyed>
        {(text) => (
          <span class={`${LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}>
            {text}
          </span>
        )}
      </Show>
      <div class="flex items-center gap-1 ml-auto shrink-0">
        <Show
          when={isEditing()}
          fallback={
            <span
              class={`${HEX_CLASS} text-[var(--rg-text-primary)] cursor-text`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDraftText(props.value.replace(/^#/, "").toUpperCase());
              }}
            >
              {props.value.toUpperCase()}
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
            aria-label="Edit color hex"
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
        {/* Swatch — clicking opens the native color picker. The native
            <input type="color"> is rendered hidden underneath so the
            browser still owns the picker UI. */}
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
            // Native <input type="color"> only emits `#rrggbb` — when
            // the current value carries alpha (#rrggbbaa), splice the
            // original alpha byte onto the picker's RGB result so we
            // don't silently drop transparency.
            const pickedRgb = event.currentTarget.value;
            const originalAlpha = props.value.length === 9 ? props.value.slice(7) : "";
            const next = pickedRgb + originalAlpha;
            props.onInteract?.();
            if (next && next.toLowerCase() !== props.value.toLowerCase()) {
              props.onCommit(next);
            }
          }}
        />
      </div>
    </div>
  );
};
