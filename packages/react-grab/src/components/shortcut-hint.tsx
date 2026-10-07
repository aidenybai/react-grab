import { Show, type Component } from "solid-js";
import { isMac } from "../utils/is-mac.js";
import { IconCommand } from "./icons/icon-command.jsx";
import { IconReturn } from "./icons/icon-return.jsx";

interface ShortcutHintProps {
  shortcut: string;
  modifier?: boolean;
  class?: string;
}

export const ShortcutHint: Component<ShortcutHintProps> = (props) => {
  const isEnter = () => props.shortcut === "Enter";
  const requiresModifier = () => props.modifier !== false;
  const isMacPlatform = isMac();

  return (
    <span
      class={props.class}
      style={{ display: "inline-flex", "align-items": "center", gap: "2px" }}
    >
      <Show when={isEnter()}>
        <IconReturn size={8} />
      </Show>
      <Show when={!isEnter()}>
        <Show when={requiresModifier()} fallback={<span textContent={props.shortcut} />}>
          <Show when={isMacPlatform} fallback={<span textContent={`Ctrl+${props.shortcut}`} />}>
            <IconCommand size={9} />
            <span textContent={props.shortcut} />
          </Show>
        </Show>
      </Show>
    </span>
  );
};
