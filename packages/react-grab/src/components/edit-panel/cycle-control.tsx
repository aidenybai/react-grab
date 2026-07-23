import { Show, type Component } from "solid-js";
import type { EnumEditableOption } from "../../types.js";
import { EDIT_LABEL_CLASS } from "./constants.js";
import { StepArrow } from "./step-arrow.js";

interface CycleControlProps {
  label?: string;
  value: string;
  options: ReadonlyArray<EnumEditableOption>;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
}

export const CycleControl: Component<CycleControlProps> = (props) => {
  const currentLabel = () => {
    const match = props.options.find((option) => option.value === props.value);
    return match?.label ?? props.value;
  };

  return (
    <div class="flex items-center gap-2 w-full px-2 h-[20px]">
      <Show when={props.label}>
        <span
          class={`${EDIT_LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}
          textContent={props.label}
        />
      </Show>
      <div class="ml-auto shrink-0 flex items-center gap-1">
        <StepArrow
          direction="left"
          active={props.activeKey === "left"}
          onPointerDown={() => props.onStep(-1)}
        />
        <span
          data-react-grab-ignore-events
          role="button"
          tabindex={-1}
          aria-label={`Cycle ${props.label ?? "value"}`}
          title={`Click to cycle (${props.options.length} options)`}
          class="text-[12px] leading-4 font-medium tabular-nums text-[var(--rg-text-primary)] cursor-pointer select-none min-w-[36px] text-center"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.onStep(1);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.onStep(-1);
          }}
          textContent={currentLabel()}
        />
        <StepArrow
          direction="right"
          active={props.activeKey === "right"}
          onPointerDown={() => props.onStep(1)}
        />
      </div>
    </div>
  );
};
