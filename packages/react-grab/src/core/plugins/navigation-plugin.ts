import {
  createSignal,
  createMemo,
  createEffect,
  on,
  onCleanup,
} from "solid-js";
import { resolveSource } from "element-source";
import type { InternalPlugin, ArrowNavigationState } from "../../types.js";
import {
  ARROW_KEYS,
  COMPONENT_NAME_DEBOUNCE_MS,
  PLUGIN_PRIORITY_NAVIGATION,
} from "../../constants.js";
import { createArrowNavigator } from "../arrow-navigation.js";
import {
  getNearestComponentName,
  getComponentDisplayName,
} from "../context.js";
import { isValidGrabbableElement } from "../../utils/is-valid-grabbable-element.js";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import { getElementBoundsCenter } from "../../utils/get-element-bounds-center.js";
import { getVisibleBoundsCenter } from "../../utils/get-visible-bounds-center.js";
import {
  getElementAtPosition,
  getElementsAtPoint,
} from "../../utils/get-element-at-position.js";
import { getAncestorElements } from "../../utils/get-ancestor-elements.js";
import { getTagName } from "../../utils/get-tag-name.js";

export const navigationPlugin: InternalPlugin = {
  name: "navigation",
  priority: PLUGIN_PRIORITY_NAVIGATION,
  setup: (ctx) => {
    const { store, actions, derived } = ctx;
    const {
      isActivated,
      isFrozenPhase,
      isDragging,
      isRendererActive,
      isPromptMode,
      targetElement,
      effectiveElement,
      selectionElement,
    } = derived;

    const isSelectionElementVisible = (): boolean => {
      const element = selectionElement();
      if (!element) return false;
      if (store.isTouchMode && isDragging()) {
        return isRendererActive();
      }
      return isRendererActive() && !isDragging();
    };

    let componentNameDebounceTimerId: number | null = null;
    let componentNameRequestVersion = 0;
    let selectionSourceRequestVersion = 0;

    const [
      debouncedElementForComponentName,
      setDebouncedElementForComponentName,
    ] = createSignal<Element | null>(null);
    const [resolvedComponentName, setResolvedComponentName] = createSignal<
      string | undefined
    >(undefined);

    const [arrowNavigationElements, setArrowNavigationElements] = createSignal<
      Element[]
    >([]);
    const [arrowNavigationActiveIndex, setArrowNavigationActiveIndex] =
      createSignal(0);

    const arrowNavigator = createArrowNavigator(
      isValidGrabbableElement,
      createElementBounds,
    );

    const [isInspectMode, setIsInspectMode] = createSignal(false);
    const [inspectActiveIndex, setInspectActiveIndex] = createSignal(-1);

    createEffect(
      on(effectiveElement, (element) => {
        if (componentNameDebounceTimerId !== null) {
          clearTimeout(componentNameDebounceTimerId);
          componentNameDebounceTimerId = null;
        }

        if (!element) {
          setDebouncedElementForComponentName(null);
          return;
        }

        componentNameDebounceTimerId = window.setTimeout(() => {
          componentNameDebounceTimerId = null;
          setDebouncedElementForComponentName(element);
        }, COMPONENT_NAME_DEBOUNCE_MS);
      }),
    );

    onCleanup(() => {
      if (componentNameDebounceTimerId !== null) {
        clearTimeout(componentNameDebounceTimerId);
        componentNameDebounceTimerId = null;
      }
    });

    createEffect(
      on(
        () => debouncedElementForComponentName(),
        (element) => {
          const currentVersion = ++componentNameRequestVersion;

          if (!element) {
            setResolvedComponentName(undefined);
            return;
          }

          getNearestComponentName(element)
            .then((name) => {
              if (componentNameRequestVersion !== currentVersion) return;
              setResolvedComponentName(name ?? undefined);
            })
            .catch(() => {
              if (componentNameRequestVersion !== currentVersion) return;
              setResolvedComponentName(undefined);
            });
        },
      ),
    );

    createEffect(
      on(
        () => targetElement(),
        (element) => {
          const currentVersion = ++selectionSourceRequestVersion;

          const clearSource = () => {
            if (selectionSourceRequestVersion === currentVersion) {
              actions.setSelectionSource(null, null);
            }
          };

          if (!element) {
            clearSource();
            return;
          }

          resolveSource(element)
            .then((source) => {
              if (selectionSourceRequestVersion !== currentVersion) return;
              if (!source) {
                clearSource();
                return;
              }
              actions.setSelectionSource(source.filePath, source.lineNumber);
            })
            .catch(() => {
              if (selectionSourceRequestVersion === currentVersion) {
                actions.setSelectionSource(null, null);
              }
            });
        },
      ),
    );

    const selectionTagName = createMemo(() => {
      const element = selectionElement();
      if (!element) return undefined;
      return getTagName(element) || undefined;
    });

    const isElementLabelThemeEnabled = createMemo(
      () => ctx.registry.store.theme.elementLabel.enabled,
    );

    const selectionLabelVisible = createMemo(() => {
      if (store.contextMenuPosition !== null) return false;
      if (!isElementLabelThemeEnabled()) return false;
      return isSelectionElementVisible();
    });

    const inspectBounds = createMemo(() => {
      if (!isInspectMode()) return [];

      const element = effectiveElement();
      if (!element) return [];

      void store.viewportVersion;

      return [...getAncestorElements(element), element].map((ancestor) =>
        createElementBounds(ancestor),
      );
    });

    const arrowNavigationItems = createMemo(() =>
      arrowNavigationElements().map((element) => ({
        tagName: getTagName(element) || "element",
        componentName: getComponentDisplayName(element) ?? undefined,
      })),
    );

    const arrowNavigationState = createMemo<ArrowNavigationState>(() => ({
      items: arrowNavigationItems(),
      activeIndex: arrowNavigationActiveIndex(),
      isVisible: arrowNavigationElements().length > 0,
    }));

    const inspectAncestorElements = createMemo((): Element[] => {
      if (!isInspectMode()) return [];
      const element = effectiveElement();
      if (!element) return [];
      return [...getAncestorElements(element).reverse(), element];
    });

    const inspectNavigationItems = createMemo(() =>
      inspectAncestorElements().map((element) => ({
        tagName: getTagName(element) || "element",
        componentName: getComponentDisplayName(element) ?? undefined,
      })),
    );

    createEffect(
      on(inspectAncestorElements, (elements) => {
        setInspectActiveIndex(elements.length - 1);
      }),
    );

    const inspectNavigationState = createMemo<ArrowNavigationState>(() => {
      const elements = inspectAncestorElements();
      return {
        items: inspectNavigationItems(),
        activeIndex: inspectActiveIndex(),
        isVisible: isInspectMode() && elements.length > 0,
      };
    });

    const clearArrowNavigation = () => {
      setArrowNavigationElements([]);
      setArrowNavigationActiveIndex(0);
      arrowNavigator.clearHistory();
    };

    const selectAndFocusElement = (element: Element) => {
      actions.setFrozenElement(element);
      actions.freeze();

      const { center } = getElementBoundsCenter(element);
      actions.setPointer(center);

      if (store.contextMenuPosition !== null) {
        actions.showContextMenu(center, element);
      }
    };

    const openArrowNavigationMenu = (anchorElement: Element) => {
      const bounds = createElementBounds(anchorElement);
      const probePoint = getVisibleBoundsCenter(bounds);
      const elementsAtPoint = getElementsAtPoint(probePoint.x, probePoint.y)
        .filter(isValidGrabbableElement)
        .reverse();

      setArrowNavigationElements(elementsAtPoint);
      setArrowNavigationActiveIndex(
        Math.max(0, elementsAtPoint.indexOf(anchorElement)),
      );
    };

    const handleArrowNavigationSelect = (index: number) => {
      const selectedElement = arrowNavigationElements()[index];
      if (!selectedElement) return;

      setArrowNavigationActiveIndex(index);
      arrowNavigator.clearHistory();
      selectAndFocusElement(selectedElement);
    };

    const handleArrowNavigation = (event: KeyboardEvent): boolean => {
      if (!isActivated() || isPromptMode()) return false;
      if (!ARROW_KEYS.has(event.key)) return false;

      let currentElement = effectiveElement();
      const isInitialSelection = !currentElement;

      if (!currentElement) {
        currentElement = getElementAtPosition(
          window.innerWidth / 2,
          window.innerHeight / 2,
        );
      }

      if (!currentElement) return false;

      const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";

      if (!isVertical) {
        clearArrowNavigation();
        const nextElement = arrowNavigator.findNext(event.key, currentElement);
        if (!nextElement && !isInitialSelection) return false;
        event.preventDefault();
        event.stopPropagation();
        selectAndFocusElement(nextElement ?? currentElement);
        return true;
      }

      if (arrowNavigationElements().length === 0) {
        openArrowNavigationMenu(currentElement);
      }

      const nextElement = arrowNavigator.findNext(event.key, currentElement);
      const elementToSelect = nextElement ?? currentElement;

      event.preventDefault();
      event.stopPropagation();
      selectAndFocusElement(elementToSelect);

      const newIndex = arrowNavigationElements().indexOf(elementToSelect);
      if (newIndex !== -1) {
        setArrowNavigationActiveIndex(newIndex);
      } else {
        openArrowNavigationMenu(elementToSelect);
      }

      return true;
    };

    const handleInspectSelect = (index: number) => {
      setInspectActiveIndex(index);
    };

    ctx.shared.clearArrowNavigation = clearArrowNavigation;

    ctx.provide("selectionArrowNavigationState", () => arrowNavigationState());
    ctx.provide("onArrowNavigationSelect", () => handleArrowNavigationSelect);
    ctx.provide("inspectNavigationState", () => inspectNavigationState());
    ctx.provide("onInspectSelect", () => handleInspectSelect);
    ctx.provide(
      "inspectVisible",
      () => isInspectMode() && inspectBounds().length > 0,
    );
    ctx.provide("inspectBounds", () => inspectBounds());
    ctx.provide("selectionLabelVisible", () => selectionLabelVisible());
    ctx.provide("selectionTagName", () => selectionTagName());
    ctx.provide("selectionComponentName", () => resolvedComponentName());
    ctx.provide(
      "selectionFilePath",
      () => store.selectionFilePath ?? undefined,
    );
    ctx.provide(
      "selectionLineNumber",
      () => store.selectionLineNumber ?? undefined,
    );

    ctx.onKeyDown((event) => {
      if (event.key === "Shift" && !event.repeat && isActivated()) {
        setIsInspectMode(true);
        if (isFrozenPhase()) {
          actions.unfreeze();
          clearArrowNavigation();
        }
        return true;
      }

      if (ARROW_KEYS.has(event.key)) {
        return handleArrowNavigation(event);
      }

      return false;
    });

    ctx.onKeyUp((event) => {
      if (event.key === "Shift") {
        setIsInspectMode(false);
        return true;
      }
      return false;
    });

    return () => {
      if (componentNameDebounceTimerId !== null) {
        clearTimeout(componentNameDebounceTimerId);
        componentNameDebounceTimerId = null;
      }

      ctx.shared.clearArrowNavigation = undefined;
    };
  },
};
