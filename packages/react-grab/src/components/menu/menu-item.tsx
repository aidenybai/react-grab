import { onCleanup, onMount, type Component, type JSX } from "solid-js";
import { cn } from "../../utils/cn.js";
import { useMenuStore } from "./menu-context.js";

interface MenuItemProps {
  value: string;
  // Test/debug hook rendered as data-react-grab-menu-item. Defaults to
  // `value`; pass explicitly when the store identity must stay unique but the
  // attribute should read as something else (e.g. a human label).
  dataId?: string;
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
  // The store identity is fixed for the lifetime of the row. Solid props are
  // live getters, so capture `value` once and use the same identity for
  // registration, hover/active checks, and cleanup — otherwise a reactive
  // `value` change would desync them.
  const registeredValue = props.value;
  const role = (): "menuitem" | "menuitemradio" => props.role ?? "menuitem";
  const isEnabled = (): boolean => !props.disabled;
  const isActive = (): boolean => store.activeValue() === registeredValue;

  let buttonElement: HTMLButtonElement | undefined;

  onMount(() => {
    if (!buttonElement) return;
    store.registerItem({
      value: registeredValue,
      domId,
      element: buttonElement,
      isEnabled,
      onSelect: () => props.onSelect?.(),
    });
    onCleanup(() => store.unregisterItem(registeredValue));
  });

  return (
    <button
      ref={buttonElement}
      id={domId}
      data-react-grab-ignore-events
      data-react-grab-menu-item={props.dataId ?? registeredValue}
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
        if (isEnabled() && store.canActivateOnHover()) store.setActiveItem(registeredValue);
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
