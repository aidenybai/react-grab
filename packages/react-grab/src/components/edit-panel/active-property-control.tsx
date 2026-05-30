import { Match, Switch, type Component } from "solid-js";
import type { EditableProperty } from "../../types.js";
import { ColorPicker } from "./color-picker.js";
import { CycleControl } from "./cycle-control.js";
import { narrowColor, narrowEnum, narrowNumeric, narrowText } from "./narrow-property.js";
import { TextControl } from "./text-control.js";
import { ValueStepper } from "./value-stepper.js";

interface ActivePropertyControlProps {
  property: EditableProperty;
  activeKey: "left" | "right" | null;
  onStep: (direction: 1 | -1) => void;
  onCommit: (value: number | string) => void;
  onEditComplete: () => void;
  onInvalidCommit: () => void;
  onInteract: () => void;
  onInlineEditRegister?: (trigger: (() => void) | null, owner?: () => void) => void;
  showLabel: boolean;
  tailwindLabel?: string | null;
  emphasized?: boolean;
}

export const ActivePropertyControl: Component<ActivePropertyControlProps> = (props) => (
  <Switch>
    <Match when={narrowNumeric(props.property)}>
      {(numeric) => (
        <ValueStepper
          label={props.showLabel ? numeric().label : undefined}
          value={numeric().value}
          min={numeric().min}
          max={numeric().max}
          unit={numeric().unit}
          activeKey={props.activeKey}
          onStep={props.onStep}
          onCommitValue={props.onCommit}
          onEditComplete={props.onEditComplete}
          onInvalidCommit={props.onInvalidCommit}
          onInteract={props.onInteract}
          tailwindLabel={props.tailwindLabel}
          emphasized={props.emphasized}
        />
      )}
    </Match>
    <Match when={narrowColor(props.property)}>
      {(color) => (
        <ColorPicker
          label={props.showLabel ? color().label : undefined}
          value={color().value}
          onCommit={props.onCommit}
          onEditComplete={props.onEditComplete}
          onInvalidCommit={props.onInvalidCommit}
          onRegisterTrigger={props.onInlineEditRegister}
          onInteract={props.onInteract}
          emphasized={props.emphasized}
        />
      )}
    </Match>
    <Match when={narrowText(props.property)}>
      {(textProperty) => (
        <TextControl
          label={props.showLabel ? textProperty().label : undefined}
          value={textProperty().value}
          onCommit={props.onCommit}
          onEditComplete={props.onEditComplete}
          onInvalidCommit={props.onInvalidCommit}
          onRegisterTrigger={props.onInlineEditRegister}
          onInteract={props.onInteract}
          emphasized={props.emphasized}
        />
      )}
    </Match>
    <Match when={narrowEnum(props.property)}>
      {(enumProp) => (
        <CycleControl
          label={props.showLabel ? enumProp().label : undefined}
          value={enumProp().value}
          options={enumProp().options}
          activeKey={props.activeKey}
          onCommit={props.onCommit}
        />
      )}
    </Match>
  </Switch>
);
