import { splitProps, type Component, type JSX } from "solid-js";
import { cn } from "../../utils/cn.js";

interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "ref"> {
  ref?: (element: HTMLInputElement) => void;
  autoFocusSelect?: boolean;
}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "ref", "autoFocusSelect"]);
  return (
    <input
      data-react-grab-ignore-events
      data-react-grab-input
      type="text"
      autocapitalize="none"
      autocorrect="off"
      autocomplete="off"
      spellcheck={false}
      ref={(element) => {
        if (local.autoFocusSelect) {
          queueMicrotask(() => {
            element.focus();
            element.select();
          });
        }
        local.ref?.(element);
      }}
      class={cn(
        "bg-transparent border-none outline-none text-[var(--rg-text-primary)] p-0 m-0",
        local.class,
      )}
      {...rest}
    />
  );
};
