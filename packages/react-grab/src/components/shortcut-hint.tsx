import { Show, type Component } from "solid-js";
import { isMac } from "../utils/is-mac.js";
import { IconCommand } from "./icons/icon-command.jsx";
import { IconReturn } from "./icons/icon-return.jsx";

interface ShortcutHintProps {
  shortcut: string;
  class?: string;
}

export const ShortcutHint: Component<ShortcutHintProps> = (props) => {
  const isEnter = () => props.shortcut === "Enter";
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
        <Show when={isMacPlatform} fallback={<span>Ctrl+{props.shortcut}</span>}>
          <IconCommand size={9} />
          <span>{props.shortcut}</span>
        </Show>
      </Show>
    </span>
  );
};
