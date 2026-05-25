import { type Accessor, createMemo } from "solid-js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
import type { ElementLabelVariant, OverlayBounds } from "../types.js";
import type { createGrabStore } from "./store.js";
import type { createPluginRegistry } from "./plugin-registry.js";
import type { GrabElementSelectors, GrabPhaseSelectors } from "./selectors.js";

type GrabStoreHandle = ReturnType<typeof createGrabStore>;
type PluginRegistry = ReturnType<typeof createPluginRegistry>;

interface OverlayVisibilityInput {
  grab: GrabStoreHandle;
  phase: GrabPhaseSelectors;
  elementSelectors: GrabElementSelectors;
  pluginRegistry: PluginRegistry;
  isToolbarSelectHovered: Accessor<boolean>;
  isDraggingBeyondThreshold: Accessor<boolean>;
  hasDragPreviewBounds: Accessor<boolean>;
}

export interface OverlayVisibility {
  isThemeEnabled: Accessor<boolean | undefined>;
  isSelectionBoxThemeEnabled: Accessor<boolean | undefined>;
  isElementLabelThemeEnabled: Accessor<boolean | undefined>;
  isDragBoxThemeEnabled: Accessor<boolean | undefined>;
  /** True when the selection box should be hidden despite the renderer being active (just-copied flash, toolbar-hover). */
  isSelectionSuppressed: Accessor<boolean>;
  /** Whether the selection bounds rectangle should be drawn this frame. */
  selectionVisible: Accessor<boolean>;
  selectionTagName: Accessor<string | undefined>;
  /** Whether the floating selection label should be drawn this frame. */
  selectionLabelVisible: Accessor<boolean>;
  /** Whether the drag-selection rectangle should be drawn this frame. */
  dragVisible: Accessor<boolean | undefined>;
  /** Variant style for the element label (hover vs processing during copy). */
  labelVariant: Accessor<ElementLabelVariant>;
  /** Whether the legacy hover label should be drawn this frame. */
  labelVisible: Accessor<boolean>;
  contextMenuBounds: Accessor<OverlayBounds | null>;
  contextMenuPosition: Accessor<{ x: number; y: number } | null>;
  contextMenuTagName: Accessor<string | undefined>;
}

/**
 * The cluster of "should we draw X right now?" memos for the overlay. Each
 * gating decision combines the user-controllable theme switches with the
 * runtime phase, drag-threshold, and toolbar-hover signals.
 *
 * Kept together because the gating logic for selection box / selection
 * label / drag box / element label is intentionally redundant — the
 * different overlays sometimes share suppressors and sometimes don't, and
 * the redundancies make the differences explicit.
 */
export const createOverlayVisibility = (input: OverlayVisibilityInput): OverlayVisibility => {
  const { grab, phase, elementSelectors, pluginRegistry } = input;
  const { store, viewportVersion } = grab;
  const {
    isPromptMode,
    isCopying,
    isFrozenPhase,
    isDragging,
    didJustCopy,
  } = phase;
  const { isSelectionElementVisible, selectionElement, effectiveElement, isRendererActive } =
    elementSelectors;
  const { isToolbarSelectHovered, isDraggingBeyondThreshold, hasDragPreviewBounds } = input;

  const isThemeEnabled = createMemo(() => pluginRegistry.store.theme.enabled);
  const isSelectionBoxThemeEnabled = createMemo(
    () => pluginRegistry.store.theme.selectionBox.enabled,
  );
  const isElementLabelThemeEnabled = createMemo(
    () => pluginRegistry.store.theme.elementLabel.enabled,
  );
  const isDragBoxThemeEnabled = createMemo(() => pluginRegistry.store.theme.dragBox.enabled);
  const isSelectionSuppressed = createMemo(
    () => didJustCopy() || (isToolbarSelectHovered() && !isFrozenPhase()),
  );

  const selectionVisible = createMemo(() => {
    if (!isThemeEnabled()) return false;
    if (!isSelectionBoxThemeEnabled()) return false;
    if (isSelectionSuppressed()) return false;
    if (hasDragPreviewBounds()) return true;
    return isSelectionElementVisible();
  });

  const selectionTagName = createMemo(() => {
    const element = selectionElement();
    if (!element) return undefined;
    return getTagName(element) || undefined;
  });

  const selectionLabelVisible = createMemo(() => {
    if (store.contextMenuPosition !== null) return false;
    if (!isElementLabelThemeEnabled()) return false;
    if (isSelectionSuppressed()) return false;
    return isSelectionElementVisible();
  });

  const dragVisible = createMemo(
    () =>
      isThemeEnabled() &&
      isDragBoxThemeEnabled() &&
      isRendererActive() &&
      isDraggingBeyondThreshold(),
  );

  const labelVariant = createMemo<ElementLabelVariant>(() =>
    isCopying() ? "processing" : "hover",
  );

  const labelVisible = createMemo(() => {
    if (!isThemeEnabled()) return false;
    const themeEnabled = isElementLabelThemeEnabled();
    const inPromptMode = isPromptMode();
    const copying = isCopying();
    const rendererActive = isRendererActive();
    const dragging = isDragging();
    const hasElement = Boolean(effectiveElement());
    const toolbarSelectHovered = isToolbarSelectHovered();
    const frozen = isFrozenPhase();

    if (!themeEnabled) return false;
    if (inPromptMode) return false;
    if (toolbarSelectHovered && !frozen) return false;
    if (copying) return true;
    return rendererActive && !dragging && hasElement;
  });

  const contextMenuBounds = createMemo((): OverlayBounds | null => {
    void viewportVersion();
    const element = store.contextMenuElement;
    if (!element) return null;
    return createElementBounds(element);
  });

  const contextMenuPosition = createMemo(() => {
    void viewportVersion();
    return store.contextMenuPosition;
  });

  const contextMenuTagName = createMemo(() => {
    const element = store.contextMenuElement;
    if (!element) return undefined;
    const frozenCount = store.frozenElements.length;
    if (frozenCount > 1) {
      return `${frozenCount} elements`;
    }
    return getTagName(element) || undefined;
  });

  return {
    isThemeEnabled,
    isSelectionBoxThemeEnabled,
    isElementLabelThemeEnabled,
    isDragBoxThemeEnabled,
    isSelectionSuppressed,
    selectionVisible,
    selectionTagName,
    selectionLabelVisible,
    dragVisible,
    labelVariant,
    labelVisible,
    contextMenuBounds,
    contextMenuPosition,
    contextMenuTagName,
  };
};
