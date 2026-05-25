import { type Component } from "solid-js";
import type { EnumEditableOption } from "../../types.js";
import { pickNextOption } from "../../utils/pick-next-option.js";
import { StepArrow } from "./step-arrow.js";

interface CycleControlProps {
  label?: string;
  value: string;
  options: ReadonlyArray<EnumEditableOption>;
  activeKey: "left" | "right" | null;
  onCommit: (value: string) => void;
}

const LABEL_CLASS = "text-[13px] leading-4 font-medium";

// Click-to-cycle pill: shows the current value as a single chip; each
// click advances to the next option (wrapping at the end). Two-option
// properties behave like a boolean toggle; longer lists step through
// in declared order. Right-click steps backwards so multi-option cycles
// don't require clicking through the whole ring.
export const CycleControl: Component<CycleControlProps> = (props) => {
  const currentLabel = () => {
    const match = props.options.find((option) => option.value === props.value);
    return match?.label ?? props.value;
  };

  const advance = (direction: 1 | -1) => {
    const next = pickNextOption(props.options, props.value, direction);
    if (next) props.onCommit(next.value);
  };

  return (
    <div class="flex items-center gap-2 w-full px-2 h-[20px]">
      {props.label ? (
        <span class={`${LABEL_CLASS} text-[var(--rg-text-primary)] truncate min-w-0`}>
          {props.label}
        </span>
      ) : null}
      {/* Cycle pad: chunky left/right arrows flanking the current value
          (mirrors the numeric slider's stepper layout). Click an arrow
          to step in that direction; click the value text itself to
          advance (cycles forward); right-click the value to step back.
          Keyboard ←/→ on the panel mirrors the arrows. */}
      <div class="ml-auto shrink-0 flex items-center gap-1">
        <StepArrow
          direction="left"
          active={props.activeKey === "left"}
          onPointerDown={() => advance(-1)}
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
            advance(1);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            advance(-1);
          }}
        >
          {currentLabel()}
        </span>
        <StepArrow
          direction="right"
          active={props.activeKey === "right"}
          onPointerDown={() => advance(1)}
        />
      </div>
    </div>
  );
};
