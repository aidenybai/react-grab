import { createEffect, createSignal, on } from "solid-js";
import { createMenuHighlight } from "../../utils/create-menu-highlight.js";
import type { MenuItemRegistration, MenuStore } from "./menu-context.js";

interface CreateMenuStoreOptions {
  keyboardNavigation?: boolean;
  clearActiveOnPointerLeave?: boolean;
  highlight?: {
    topCornerRadiusPx?: number;
    bottomCornerRadiusPx?: number;
    cornerShape?: string;
  };
}

export const createMenuStore = (options: CreateMenuStoreOptions = {}): MenuStore => {
  const itemRegistry = new Map<string, MenuItemRegistration>();
  const itemOrder: string[] = [];
  const idPrefix = `react-grab-menu-${Math.random().toString(36).slice(2, 8)}`;
  let idCounter = 0;

  const [activeItemId, setActiveItemId] = createSignal<string | null>(null);

  const highlight = createMenuHighlight(options.highlight ?? {});

  createEffect(
    on(activeItemId, (id) => {
      if (id === null) {
        highlight.clearHighlight();
        return;
      }
      const registration = itemRegistry.get(id);
      if (registration) {
        highlight.updateHighlight(registration.element);
      } else {
        highlight.clearHighlight();
      }
    }),
  );

  const enabledIds = (): string[] => itemOrder.filter((id) => itemRegistry.get(id)?.isEnabled());

  const selectFirst = (): void => {
    const candidates = enabledIds();
    if (candidates.length > 0) setActiveItemId(candidates[0]);
  };

  const selectLast = (): void => {
    const candidates = enabledIds();
    if (candidates.length > 0) setActiveItemId(candidates[candidates.length - 1]);
  };

  const selectNext = (): void => {
    const candidates = enabledIds();
    if (candidates.length === 0) return;
    const currentIndex = candidates.indexOf(activeItemId() ?? "");
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % candidates.length;
    setActiveItemId(candidates[nextIndex]);
  };

  const selectPrevious = (): void => {
    const candidates = enabledIds();
    if (candidates.length === 0) return;
    const currentIndex = candidates.indexOf(activeItemId() ?? "");
    const previousIndex =
      currentIndex === -1
        ? candidates.length - 1
        : (currentIndex - 1 + candidates.length) % candidates.length;
    setActiveItemId(candidates[previousIndex]);
  };

  return {
    keyboardNavigation: options.keyboardNavigation ?? false,
    clearActiveOnPointerLeave: options.clearActiveOnPointerLeave ?? false,
    activeItemId,
    setActiveItem: setActiveItemId,
    createItemId: () => `${idPrefix}-item-${idCounter++}`,
    registerItem: (registration) => {
      itemRegistry.set(registration.id, registration);
      if (!itemOrder.includes(registration.id)) itemOrder.push(registration.id);
    },
    unregisterItem: (id) => {
      itemRegistry.delete(id);
      const orderIndex = itemOrder.indexOf(id);
      if (orderIndex !== -1) itemOrder.splice(orderIndex, 1);
      setActiveItemId((current) => (current === id ? null : current));
    },
    getActiveItem: () => {
      const id = activeItemId();
      return id === null ? undefined : itemRegistry.get(id);
    },
    selectFirst,
    selectLast,
    selectNext,
    selectPrevious,
    setHighlightContainer: highlight.containerRef,
    setHighlightRail: highlight.highlightRef,
  };
};
