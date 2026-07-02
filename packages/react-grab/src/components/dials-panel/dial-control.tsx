import { Match, Show, Switch, type Component } from "solid-js";
import type { DialControl, DialValue } from "../../types.js";
import { clampToRange } from "../../utils/clamp-to-range.js";
import { ColorPicker } from "../edit-panel/color-picker.js";
import { CycleControl } from "../edit-panel/cycle-control.js";
import { ValueStepper } from "../edit-panel/value-stepper.js";
import { ActionControl } from "./action-control.js";
import { TextControl } from "./text-control.js";
import { ToggleControl } from "./toggle-control.js";

interface DialActiveControlProps {
  control: DialControl;
  value: DialValue;
  activeKey: "left" | "right" | null;
  onCommit: (path: string, value: DialValue) => void;
  onTriggerAction: (path: string) => void;
  onInteract: () => void;
}

interface DialValueSummaryProps {
  control: DialControl;
  value: DialValue;
}

interface DialNumberActiveProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  activeKey: "left" | "right" | null;
  onCommit: (value: number) => void;
  onInteract: () => void;
}

const stepDecimals = (step: number): number => {
  if (step >= 1) return 0;
  const fraction = String(step).split(".")[1];
  return fraction ? Math.min(6, fraction.length) : 2;
};

const snapNumber = (value: number, min: number, max: number, step: number): number =>
  Number(clampToRange(value, min, max).toFixed(stepDecimals(step)));

const SUMMARY_VALUE_CLASS = "text-[11px] font-sans text-[var(--rg-text-secondary)] shrink-0";

export const DialNumberActive: Component<DialNumberActiveProps> = (props) => {
  const commit = (rawValue: number) => {
    const snapped = snapNumber(rawValue, props.min, props.max, props.step);
    if (snapped !== props.value) props.onCommit(snapped);
  };
  return (
    <ValueStepper
      label={props.label}
      value={props.value}
      min={props.min}
      max={props.max}
      unit={props.unit}
      activeKey={props.activeKey}
      onStep={(direction) => commit(props.value + direction * props.step)}
      onCommitValue={(nextValue) => commit(nextValue)}
      onInteract={props.onInteract}
    />
  );
};

export const DialNumberSummary: Component<{ value: number; unit: string }> = (props) => (
  <span class="font-sans text-[var(--rg-text-secondary)] tabular-nums shrink-0">
    <span class="text-[11px]">{props.value}</span>
    <Show when={props.unit}>
      <span class="text-[9px] ml-px">{props.unit}</span>
    </Show>
  </span>
);

export const DialActiveControl: Component<DialActiveControlProps> = (props) => (
  <Switch>
    <Match when={props.control.kind === "number" && props.control}>
      {(control) => (
        <DialNumberActive
          label={control().label}
          value={typeof props.value === "number" ? props.value : control().default}
          min={control().min}
          max={control().max}
          step={control().step}
          unit=""
          activeKey={props.activeKey}
          onCommit={(value) => props.onCommit(control().path, value)}
          onInteract={props.onInteract}
        />
      )}
    </Match>
    <Match when={props.control.kind === "color" && props.control}>
      {(control) => (
        <ColorPicker
          label={control().label}
          value={typeof props.value === "string" ? props.value : control().default}
          onCommit={(nextValue) => props.onCommit(control().path, nextValue)}
          onInteract={props.onInteract}
        />
      )}
    </Match>
    <Match when={props.control.kind === "select" && props.control}>
      {(control) => {
        const select = control();
        const currentValue = () => (typeof props.value === "string" ? props.value : select.default);
        const cycle = (direction: 1 | -1) => {
          if (select.options.length === 0) return;
          const currentIndex = select.options.findIndex(
            (option) => option.value === currentValue(),
          );
          const nextIndex =
            (currentIndex + direction + select.options.length) % select.options.length;
          props.onCommit(select.path, select.options[nextIndex].value);
        };
        return (
          <CycleControl
            label={select.label}
            value={currentValue()}
            options={select.options}
            activeKey={props.activeKey}
            onStep={cycle}
          />
        );
      }}
    </Match>
    <Match when={props.control.kind === "toggle" && props.control}>
      {(control) => (
        <ToggleControl
          label={control().label}
          value={typeof props.value === "boolean" ? props.value : control().default}
          onCommit={(nextValue) => {
            props.onCommit(control().path, nextValue);
            props.onInteract();
          }}
        />
      )}
    </Match>
    <Match when={props.control.kind === "text" && props.control}>
      {(control) => (
        <TextControl
          label={control().label}
          value={typeof props.value === "string" ? props.value : control().default}
          placeholder={control().placeholder}
          onCommit={(nextValue) => props.onCommit(control().path, nextValue)}
        />
      )}
    </Match>
    <Match when={props.control.kind === "action" && props.control}>
      {(control) => (
        <ActionControl
          label={control().label}
          onTrigger={() => props.onTriggerAction(control().path)}
        />
      )}
    </Match>
  </Switch>
);

export const DialValueSummary: Component<DialValueSummaryProps> = (props) => (
  <Switch>
    <Match when={props.control.kind === "number" && props.control}>
      {(control) => (
        <DialNumberSummary
          value={typeof props.value === "number" ? props.value : control().default}
          unit=""
        />
      )}
    </Match>
    <Match when={props.control.kind === "color" && props.control}>
      {(control) => (
        <span
          aria-hidden="true"
          class="size-[12px] rounded-[3px] border-[var(--rg-border-button)] [border-width:0.5px] border-solid shrink-0"
          style={{
            "background-color": typeof props.value === "string" ? props.value : control().default,
          }}
        />
      )}
    </Match>
    <Match when={props.control.kind === "select" && props.control}>
      {(control) => {
        const select = control();
        const value = typeof props.value === "string" ? props.value : select.default;
        const label = select.options.find((option) => option.value === value)?.label ?? value;
        return <span class={SUMMARY_VALUE_CLASS}>{label}</span>;
      }}
    </Match>
    <Match when={props.control.kind === "toggle" && props.control}>
      {(control) => (
        <span class={SUMMARY_VALUE_CLASS}>
          {(typeof props.value === "boolean" ? props.value : control().default) ? "On" : "Off"}
        </span>
      )}
    </Match>
    <Match when={props.control.kind === "text" && props.control}>
      {(control) => (
        <span class={`${SUMMARY_VALUE_CLASS} truncate max-w-[140px]`}>
          {typeof props.value === "string" ? props.value : control().default}
        </span>
      )}
    </Match>
  </Switch>
);
