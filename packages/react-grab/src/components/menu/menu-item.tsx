import { onCleanup, onMount, type Component, type JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { useMenuStore } from "./menu-context.js";

interface MenuItemProps {
  value: string;
  role?: "menuitem" | "menuitemradio";
  disabled?: boolean;
  checked?: boolean;
  class?: string;
  onSelect?: () => void;
  children: JSX.Element;
}

export const MenuItem: Component<MenuItemProps> = (props) => {
  const store = useMenuStore();
  const domId = store.createItemId();
  // Captured at mount so registration/cleanup stay keyed on a stable value
  // even if the component instance is reused for a different row.
  const itemValue = props.value;
  const role = (): "menuitem" | "menuitemradio" => props.role ?? "menuitem";
  const isEnabled = (): boolean => !props.disabled;
  const isActive = (): boolean => store.activeValue() === props.value;

  let buttonElement: HTMLButtonElement | undefined;

  onMount(() => {
    if (!buttonElement) return;
    store.registerItem({
      value: itemValue,
      domId,
      element: buttonElement,
      isEnabled,
      onSelect: () => props.onSelect?.(),
    });
    onCleanup(() => store.unregisterItem(itemValue));
  });

  return (
    <button
      ref={buttonElement}
      id={domId}
      data-react-grab-ignore-events
      data-react-grab-menu-item={props.value}
      type="button"
      role={role()}
      aria-checked={role() === "menuitemradio" ? Boolean(props.checked) : undefined}
      aria-disabled={Boolean(props.disabled)}
      tabindex={store.keyboardNavigation ? (isActive() ? 0 : -1) : undefined}
      disabled={props.disabled}
      class={cn(
        "relative z-1 contain-layout flex items-center justify-between w-full px-2 py-1 cursor-pointer text-left border-none bg-transparent disabled:opacity-40 disabled:cursor-default",
        props.class,
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={() => {
        if (isEnabled() && store.canActivateOnHover()) store.setActiveItem(props.value);
      }}
      onPointerLeave={() => {
        if (store.clearActiveOnPointerLeave) store.setActiveItem(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (!isEnabled()) return;
        props.onSelect?.();
      }}
    >
      {props.children}
    </button>
  );
};
