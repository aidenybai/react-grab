import { Match, Switch, type Component } from "solid-js";
import type { EditableProperty } from "../../types.js";
import { ColorPicker } from "./color-picker.js";
import { CycleControl } from "./cycle-control.js";
import { asColor, asEnum, asNumeric } from "./narrow-property.js";
import { ValueStepper } from "./value-stepper.js";

interface ActivePropertyControlProps {
  property: EditableProperty;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
  onCommit: (value: number | string) => void;
  onEditComplete: () => void;
  // Fires when an inline-typed value/hex is rejected — parent plays
  // a shake animation so the user sees feedback for the discarded input.
  onInvalidCommit: () => void;
  onInteract: () => void;
  // Only the property-list call site registers the color picker
  // trigger; compact mode omits because the list's instance stays
  // mounted underneath and is the canonical registrant.
  onColorPickerRegister?: (trigger: (() => void) | null, owner?: () => void) => void;
  // PropertyList omits the inner label because the row carries its
  // own; compact mode shows it because there's no surrounding row.
  showLabel: boolean;
  tailwindLabel?: string | null;
  emphasized?: boolean;
}

export const ActivePropertyControl: Component<ActivePropertyControlProps> = (props) => (
  <Switch>
    <Match when={props.property.kind === "numeric"}>
      <ValueStepper
        label={props.showLabel ? asNumeric(props.property).label : undefined}
        value={asNumeric(props.property).value}
        min={asNumeric(props.property).min}
        max={asNumeric(props.property).max}
        unit={asNumeric(props.property).unit}
        activeKey={props.activeKey}
        onStep={props.onStep}
        onCommitValue={props.onCommit}
        onEditComplete={props.onEditComplete}
        onInvalidCommit={props.onInvalidCommit}
        onInteract={props.onInteract}
        tailwindLabel={props.tailwindLabel}
        emphasized={props.emphasized}
      />
    </Match>
    <Match when={props.property.kind === "color"}>
      <ColorPicker
        label={props.showLabel ? asColor(props.property).label : undefined}
        value={asColor(props.property).value}
        onCommit={props.onCommit}
        onEditComplete={props.onEditComplete}
        onInvalidCommit={props.onInvalidCommit}
        onRegisterTrigger={props.onColorPickerRegister}
        onInteract={props.onInteract}
        emphasized={props.emphasized}
      />
    </Match>
    <Match when={props.property.kind === "enum"}>
      <CycleControl
        label={props.showLabel ? asEnum(props.property).label : undefined}
        value={asEnum(props.property).value}
        options={asEnum(props.property).options}
        activeKey={props.activeKey}
        onCommit={props.onCommit}
      />
    </Match>
  </Switch>
);
