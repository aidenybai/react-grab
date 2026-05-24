import { createSignal, Show, type Component } from "solid-js";
import { normalizeHex } from "../../utils/normalize-hex.js";
import { stripHexAlpha } from "../../utils/strip-hex-alpha.js";

interface ColorPickerProps {
  label?: string;
  value: string;
  onCommit: (value: string) => void;
  // Called after the inline hex editor commits / cancels so the panel can
  // return focus to the search input (mirrors ValueStepper.onEditComplete).
  onEditComplete?: () => void;
  emphasized?: boolean;
}

const LABEL_CLASS = "text-[13px] leading-4 font-medium";
const HEX_CLASS = "text-[12px] leading-4 font-medium tabular-nums uppercase";

export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const isEditing = () => draftText() !== null;
  let nativePickerRef: HTMLInputElement | undefined;

  const commitHex = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    const normalized = normalizeHex(text.trim());
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
            const next = event.currentTarget.value;
            if (next && next.toLowerCase() !== props.value.toLowerCase()) {
              props.onCommit(next);
            }
          }}
        />
      </div>
    </div>
  );
};
