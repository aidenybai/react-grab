import { For, type Component } from "solid-js";

interface CleanProps {
  items: readonly string[];
  onPick: (item: string) => void;
}

export const Clean: Component<CleanProps> = (props) => {
  const handlePick = (item: string) => {
    props.onPick(item);
  };
  return (
    <ul>
      <For each={props.items}>{(item) => <li onClick={() => handlePick(item)}>{item}</li>}</For>
    </ul>
  );
};
