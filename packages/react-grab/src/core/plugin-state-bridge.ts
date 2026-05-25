import { type Accessor, createEffect, createMemo, on, untrack } from "solid-js";
import { getTagName } from "../utils/get-tag-name.js";
import type {
  ElementLabelVariant,
  OverlayBounds,
  Position,
  PublicGrabbedBox,
  ReactGrabState,
  ToolbarState,
} from "../types.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";
import type { OverlayVisibility } from "./overlay-visibility.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface PluginStateBridgeInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  visibility: OverlayVisibility;
  dragBounds: Accessor<OverlayBounds | undefined>;
  selectionBounds: Accessor<OverlayBounds | undefined>;
  cursorPosition: Accessor<Position>;
  isDraggingBeyondThreshold: Accessor<boolean>;
  currentToolbarState: Accessor<ToolbarState | null>;
}

interface PublicLabelInstance {
  id: string;
  status: ReactGrabState["labelInstances"][number]["status"];
  tagName: string;
  componentName?: string;
  createdAt: number;
}

export interface PluginStateBridge {
  /** Public-shaped grabbed boxes (no `element` field) for ReactGrabState. */
  publicGrabbedBoxes: Accessor<PublicGrabbedBox[]>;
  /** Public-shaped label instances (subset of fields) for ReactGrabState. */
  publicLabelInstances: Accessor<PublicLabelInstance[]>;
}

/**
 * Owns the five plugin-facing effects that translate internal store/phase
 * state into plugin hook invocations:
 *
 *   - onStateChange    (full derived state)
 *   - onPromptModeChange
 *   - onSelectionBox
 *   - onDragBox
 *   - onElementLabel
 *
 * Plus the two `publicXxx` accessors that are also consumed by the
 * `api.getState()` reader. The bridge itself just registers the effects;
 * the returned accessors are used by the public API surface.
 */
export const createPluginStateBridge = (input: PluginStateBridgeInput): PluginStateBridge => {
  const {
    grab,
    pluginRegistry,
    phase,
    elementSelectors,
    visibility,
    dragBounds,
    selectionBounds,
    cursorPosition,
    isDraggingBeyondThreshold,
    currentToolbarState,
  } = input;
  const { store, pointer } = grab;
  const { isActivated, isDragging, isCopying, isPromptMode, didJustCopy } = phase;
  const { targetElement, effectiveElement } = elementSelectors;
  const { selectionVisible, dragVisible, labelVisible, labelVariant } = visibility;

  const publicGrabbedBoxes = createMemo<PublicGrabbedBox[]>(() =>
    store.grabbedBoxes.map((box) => ({
      id: box.id,
      bounds: box.bounds,
      createdAt: box.createdAt,
    })),
  );

  const publicLabelInstances = createMemo<PublicLabelInstance[]>(() =>
    store.labelInstances.map((instance) => ({
      id: instance.id,
      status: instance.status,
      tagName: instance.tagName,
      componentName: instance.componentName,
      createdAt: instance.createdAt,
    })),
  );

  const derivedStateForHook = createMemo<ReactGrabState>(() => {
    const active = isActivated();
    const dragging = isDragging();
    const copying = isCopying();
    const inputMode = isPromptMode();
    const target = targetElement();
    const drag = dragBounds();
    const themeEnabled = pluginRegistry.store.theme.enabled;
    const selectionBoxEnabled = pluginRegistry.store.theme.selectionBox.enabled;
    const dragBoxEnabled = pluginRegistry.store.theme.dragBox.enabled;
    const draggingBeyondThreshold = isDraggingBeyondThreshold();
    const effectiveTarget = effectiveElement();
    const justCopied = didJustCopy();

    const isSelectionBoxVisible = Boolean(
      themeEnabled &&
        selectionBoxEnabled &&
        active &&
        !copying &&
        !justCopied &&
        !dragging &&
        effectiveTarget != null,
    );
    const isDragBoxVisible = Boolean(
      themeEnabled && dragBoxEnabled && active && !copying && draggingBeyondThreshold,
    );

    return {
      isActive: active,
      isDragging: dragging,
      isCopying: copying,
      isPromptMode: inputMode,
      isSelectionBoxVisible,
      isDragBoxVisible,
      targetElement: target,
      dragBounds: drag ? { x: drag.x, y: drag.y, width: drag.width, height: drag.height } : null,
      grabbedBoxes: [...publicGrabbedBoxes()],
      labelInstances: [...publicLabelInstances()],
      selectionFilePath: store.selectionFilePath,
      toolbarState: currentToolbarState(),
    };
  });

  createEffect(
    on(derivedStateForHook, (state) => {
      pluginRegistry.hooks.onStateChange(state);
    }),
  );

  createEffect(
    on(
      () => {
        const inputMode = isPromptMode();
        return {
          inputMode,
          position: inputMode ? pointer() : untrack(pointer),
          target: inputMode ? targetElement() : untrack(targetElement),
        };
      },
      ({ inputMode, position, target }) => {
        pluginRegistry.hooks.onPromptModeChange(inputMode, {
          x: position.x,
          y: position.y,
          targetElement: target,
        });
      },
    ),
  );

  createEffect(
    on(
      () => [selectionVisible(), selectionBounds(), targetElement()] as const,
      ([visible, bounds, element]) => {
        pluginRegistry.hooks.onSelectionBox(Boolean(visible), bounds ?? null, element);
      },
    ),
  );

  createEffect(
    on(
      () => [dragVisible(), dragBounds()] as const,
      ([visible, bounds]) => {
        pluginRegistry.hooks.onDragBox(Boolean(visible), bounds ?? null);
      },
    ),
  );

  const labelHookInputs = (): readonly [
    boolean,
    ElementLabelVariant,
    Position,
    Element | null,
    string | null,
    number | null,
  ] => {
    const visible = labelVisible();
    return [
      visible,
      labelVariant(),
      visible ? cursorPosition() : untrack(cursorPosition),
      visible ? targetElement() : untrack(targetElement),
      store.selectionFilePath,
      store.selectionLineNumber,
    ] as const;
  };

  createEffect(
    on(labelHookInputs, ([visible, variant, position, element, filePath, lineNumber]) => {
      pluginRegistry.hooks.onElementLabel(visible, variant, {
        x: position.x,
        y: position.y,
        content: "",
        element: element ?? undefined,
        tagName: element ? getTagName(element) || undefined : undefined,
        filePath: filePath ?? undefined,
        lineNumber: lineNumber ?? undefined,
      });
    }),
  );

  return {
    publicGrabbedBoxes,
    publicLabelInstances,
  };
};
