import { createSignal, Show, type Component } from "solid-js";
import { formatDisplayValue } from "../../utils/format-css-value.js";
import { StepArrow } from "./step-arrow.js";

interface ValueStepperProps {
  value: number;
  unit: string;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
  // When provided, the value text becomes click-to-edit. Called with the
  // parsed numeric value on commit (Enter or blur). Parent is responsible
  // for clamping/rounding before writing through.
  onCommitValue?: (value: number) => void;
  // Fires after the inline editor closes (commit OR cancel) so the
  // parent can return focus to the search input.
  onEditComplete?: () => void;
  // `emphasized` boosts the value text from 12px (list row) to 13px
  // (compact panel mode) so the active value reads as the primary focus
  // when the rest of the panel is hidden.
  emphasized?: boolean;
}

export const ValueStepper: Component<ValueStepperProps> = (props) => {
  const [draftText, setDraftText] = createSignal<string | null>(null);
  const isEditing = () => draftText() !== null;

  const valueClass = () =>
    props.emphasized ? "text-[13px] leading-4 font-medium" : "text-[12px] leading-4 font-medium";

  const startEditing = (event: MouseEvent) => {
    if (!props.onCommitValue) return;
    event.preventDefault();
    event.stopPropagation();
    setDraftText(formatDisplayValue(props.value));
  };

  const commit = () => {
    const text = draftText();
    if (text === null) return;
    setDraftText(null);
    const parsed = Number.parseFloat(text);
    if (Number.isFinite(parsed)) props.onCommitValue?.(parsed);
    props.onEditComplete?.();
  };

  const cancel = () => {
    if (!isEditing()) return;
    setDraftText(null);
    props.onEditComplete?.();
  };

  const handleEditKeyDown = (event: KeyboardEvent) => {
    // The panel's window-level keydown handler skips when an HTMLInputElement
    // owns focus, so Enter/Esc don't double-fire and accidentally submit or
    // dismiss the whole panel.
    event.stopImmediatePropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <div class="flex items-center gap-1 shrink-0 leading-none">
      <StepArrow
        direction="left"
        active={props.activeKey === "left"}
        onPointerDown={() => props.onStep(-1)}
      />
      <span class="inline-flex items-baseline text-[var(--rg-text-primary)] tabular-nums min-w-[36px] justify-center">
        <Show
          when={isEditing()}
          fallback={
            <span
              class={valueClass()}
              style={{
                "font-variant-numeric": "tabular-nums",
                cursor: props.onCommitValue ? "text" : "default",
              }}
              onClick={startEditing}
            >
              {formatDisplayValue(props.value)}
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
            inputmode="decimal"
            aria-label="Edit value"
            class={`${valueClass()} bg-transparent border-none outline-none text-[var(--rg-text-primary)] p-0 m-0 text-center`}
            style={{
              "field-sizing": "content",
              "min-width": "12px",
              "font-variant-numeric": "tabular-nums",
            }}
            value={draftText() ?? ""}
            onInput={(event) => setDraftText(event.currentTarget.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commit}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        </Show>
        <span class="text-[10px] leading-4 font-medium text-[var(--rg-text-secondary)] ml-px">
          {props.unit}
        </span>
      </span>
      <StepArrow
        direction="right"
        active={props.activeKey === "right"}
        onPointerDown={() => props.onStep(1)}
      />
    </div>
  );
};
