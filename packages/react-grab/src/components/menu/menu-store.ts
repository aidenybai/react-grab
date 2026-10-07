import { createEffect, createMemo, createSignal, on, type Accessor } from "solid-js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import type { MenuItemRegistration, MenuStore } from "./menu-context.js";

interface CreateMenuStoreOptions {
  keyboardNavigation?: boolean;
  clearActiveOnPointerLeave?: boolean;
  // When set, hover only activates a row after the pointer has actually
  // moved over the menu. Guards against a stationary cursor firing a
  // phantom pointerenter (and yanking the active row) when the list mounts
  // or repositions under it.
  requirePointerMove?: boolean;
  // Controlled mode (cmdk-style): when `value` is provided the active row is
  // owned by the parent and every activation is reported through
  // `onValueChange` instead of mutating internal state.
  value?: Accessor<string | null>;
  onValueChange?: (value: string | null) => void;
  highlight?: {
    topCornerRadiusPx?: number;
    bottomCornerRadiusPx?: number;
    cornerShape?: string;
  };
}

export const createMenuStore = (options: CreateMenuStoreOptions = {}): MenuStore => {
  const itemsByValue = new Map<string, MenuItemRegistration>();
  const orderedValues: string[] = [];
  const idPrefix = `react-grab-menu-${Math.random().toString(36).slice(2, 8)}`;
  let idCounter = 0;
  let didPointerMove = false;

  const isControlled = options.value !== undefined;
  const [internalActiveValue, setInternalActiveValue] = createSignal<string | null>(null);
  const [registryVersion, bumpRegistryVersion] = createSignal(0);

  const activeValue = createMemo<string | null>(() =>
    isControlled ? (options.value?.() ?? null) : internalActiveValue(),
  );

  const setActiveItem = (value: string | null): void => {
    if (isControlled) {
      options.onValueChange?.(value);
      return;
    }
    setInternalActiveValue(value);
  };

  const highlight = createMenuHighlight(options.highlight ?? {});

  createEffect(
    on([activeValue, registryVersion], ([value]) => {
      if (value === null) {
        highlight.clearHighlight();
        return;
      }
      const registration = itemsByValue.get(value);
      if (registration) {
        highlight.updateHighlight(registration.element);
      } else {
        highlight.clearHighlight();
      }
    }),
  );

  const enabledValues = (): string[] =>
    orderedValues.filter((value) => itemsByValue.get(value)?.isEnabled());

  const selectFirst = (): void => {
    const candidates = enabledValues();
    if (candidates.length > 0) setActiveItem(candidates[0]);
  };

  const selectLast = (): void => {
    const candidates = enabledValues();
    if (candidates.length > 0) setActiveItem(candidates[candidates.length - 1]);
  };

  const selectNext = (): void => {
    const candidates = enabledValues();
    if (candidates.length === 0) return;
    const currentIndex = candidates.indexOf(activeValue() ?? "");
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % candidates.length;
    setActiveItem(candidates[nextIndex]);
  };

  const selectPrevious = (): void => {
    const candidates = enabledValues();
    if (candidates.length === 0) return;
    const currentIndex = candidates.indexOf(activeValue() ?? "");
    const previousIndex =
      currentIndex === -1
        ? candidates.length - 1
        : (currentIndex - 1 + candidates.length) % candidates.length;
    setActiveItem(candidates[previousIndex]);
  };

  const activeDescendantId = createMemo<string | undefined>(() => {
    registryVersion();
    const value = activeValue();
    if (value === null) return undefined;
    return itemsByValue.get(value)?.domId;
  });

  return {
    keyboardNavigation: options.keyboardNavigation ?? false,
    clearActiveOnPointerLeave: options.clearActiveOnPointerLeave ?? false,
    activeValue,
    activeDescendantId,
    setActiveItem,
    createItemId: () => `${idPrefix}-item-${idCounter++}`,
    canActivateOnHover: () => !(options.requirePointerMove ?? false) || didPointerMove,
    notePointerMove: () => {
      didPointerMove = true;
    },
    resetPointerMove: () => {
      didPointerMove = false;
    },
    registerItem: (registration) => {
      itemsByValue.set(registration.value, registration);
      if (!orderedValues.includes(registration.value)) orderedValues.push(registration.value);
      bumpRegistryVersion((version) => version + 1);
    },
    unregisterItem: (value) => {
      itemsByValue.delete(value);
      const orderIndex = orderedValues.indexOf(value);
      if (orderIndex !== -1) orderedValues.splice(orderIndex, 1);
      if (!isControlled) {
        setInternalActiveValue((current) => (current === value ? null : current));
      }
      bumpRegistryVersion((version) => version + 1);
    },
    getActiveItem: () => {
      const value = activeValue();
      return value === null ? undefined : itemsByValue.get(value);
    },
    selectFirst,
    selectLast,
    selectNext,
    selectPrevious,
    setHighlightContainer: highlight.containerRef,
    setHighlightRail: highlight.highlightRef,
  };
};
