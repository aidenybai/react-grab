// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../../dist/styles.css";
import { createMemo, createRoot, onCleanup, createEffect, on } from "solid-js";
import { render } from "solid-js/web";
import { createGrabStore } from "./store.js";
import { createNoopApi } from "./noop-api.js";
import { createEventListenerManager } from "./events.js";
import { createPluginRegistry } from "./plugin-registry.js";
import {
  getStackContext,
  getComponentDisplayName,
  checkIsNextProject,
} from "./context.js";
import { resolveSource } from "element-source";
import { DEFAULT_THEME } from "./theme.js";
import { logIntro } from "./log-intro.js";
import { getScriptOptions } from "../utils/get-script-options.js";
import { mountRoot } from "../utils/mount-root.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { invalidateInteractionCaches } from "../utils/invalidate-interaction-caches.js";
import { isElementConnected } from "../utils/is-element-connected.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { isRootElement } from "../utils/is-root-element.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getElementBoundsCenter } from "../utils/get-element-bounds-center.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
} from "../utils/create-bounds-from-drag-rect.js";
import { combineBounds } from "../utils/combine-bounds.js";
import {
  nativeCancelAnimationFrame,
  nativeRequestAnimationFrame,
} from "../utils/native-raf.js";
import { loadToolbarState } from "../components/toolbar/state.js";
import {
  DEFAULT_KEY_HOLD_DURATION_MS,
  DEFAULT_MAX_CONTEXT_LINES,
  BOUNDS_RECALC_INTERVAL_MS,
  NEXTJS_REVALIDATION_DELAY_MS,
  ZOOM_DETECTION_THRESHOLD,
} from "../constants.js";
import type {
  Options,
  OverlayBounds,
  ReactGrabAPI,
  ReactGrabState,
  SettableOptions,
  SourceInfo,
  Plugin,
  ToolbarState,
  SharedPluginApi,
  InternalPlugin,
  PluginContext,
} from "../types.js";

import { toolbarPlugin } from "./plugins/toolbar-plugin.js";
import { copyPipelinePlugin } from "./plugins/copy-pipeline.js";
import { menusPlugin } from "./plugins/menus-plugin.js";
import { navigationPlugin } from "./plugins/navigation-plugin.js";
import { pointerPlugin } from "./plugins/pointer-plugin.js";
import { promptPlugin } from "./plugins/prompt-plugin.js";
import { keyboardPlugin } from "./plugins/keyboard-plugin.js";

import { copyPlugin } from "./plugins/copy.js";
import { commentPlugin } from "./plugins/comment.js";
import { openPlugin } from "./plugins/open.js";
import { copyHtmlPlugin } from "./plugins/copy-html.js";
import { copyStylesPlugin } from "./plugins/copy-styles.js";

const builtInPlugins = [
  copyPlugin,
  commentPlugin,
  copyHtmlPlugin,
  copyStylesPlugin,
  openPlugin,
];

const internalPlugins: InternalPlugin[] = [
  navigationPlugin, // 20
  pointerPlugin, // 30
  copyPipelinePlugin, // 40
  menusPlugin, // 50
  promptPlugin, // 60
  toolbarPlugin, // 80
  keyboardPlugin, // 90
];

let hasInited = false;

export const init = (rawOptions?: Options): ReactGrabAPI => {
  if (typeof window === "undefined") {
    return createNoopApi();
  }

  const scriptOptions = getScriptOptions();
  const initialOptions: Options = {
    enabled: true,
    activationMode: "toggle",
    keyHoldDuration: DEFAULT_KEY_HOLD_DURATION_MS,
    allowActivationInsideInput: true,
    maxContextLines: DEFAULT_MAX_CONTEXT_LINES,
    ...scriptOptions,
    ...rawOptions,
  };

  if (initialOptions.enabled === false || hasInited) {
    return createNoopApi();
  }
  hasInited = true;
  logIntro();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- need to omit enabled from settableOptions
  const { enabled: _enabled, ...settableOptions } = initialOptions;

  return createRoot((dispose) => {
    let disposed = false;
    let disposeRenderer: (() => void) | undefined;

    const pluginRegistry = createPluginRegistry(settableOptions);
    const eventListenerManager = createEventListenerManager();

    const getAgentFromActions = () => {
      for (const action of pluginRegistry.store.actions) {
        if (action.agent?.provider) return action.agent;
      }
      return undefined;
    };

    const { store, actions } = createGrabStore({
      theme: DEFAULT_THEME,
      hasAgentProvider: Boolean(getAgentFromActions()?.provider),
      keyHoldDuration:
        pluginRegistry.store.options.keyHoldDuration ??
        DEFAULT_KEY_HOLD_DURATION_MS,
    });

    const shared: SharedPluginApi = {};

    const isHoldingKeys = createMemo(() => store.current.state === "holding");
    const isActivated = createMemo(() => store.current.state === "active");
    const isFrozenPhase = createMemo(
      () =>
        store.current.state === "active" && store.current.phase === "frozen",
    );
    const isDragging = createMemo(
      () =>
        store.current.state === "active" && store.current.phase === "dragging",
    );
    const didJustCopy = createMemo(() => store.current.state === "justCopied");
    const isCopying = createMemo(() => store.current.state === "copying");
    const isPromptMode = createMemo(
      () =>
        store.current.state === "active" && Boolean(store.current.isPromptMode),
    );
    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const targetElement = createMemo(() => {
      void store.viewportVersion;
      if (!isRendererActive() || isDragging()) return null;
      const element = store.detectedElement;
      if (!isElementConnected(element)) return null;
      return element;
    });

    const effectiveElement = createMemo(
      () => store.frozenElement || (isFrozenPhase() ? null : targetElement()),
    );

    const selectionElement = createMemo((): Element | undefined => {
      if (store.isTouchMode && isDragging()) {
        const detected = store.detectedElement;
        if (!detected || isRootElement(detected)) return undefined;
        return detected;
      }
      const element = effectiveElement();
      if (!element || isRootElement(element)) return undefined;
      return element;
    });

    const frozenElementsBounds = createMemo((): OverlayBounds[] => {
      void store.viewportVersion;
      const frozenElements = store.frozenElements;
      if (frozenElements.length === 0) return [];
      const dragRect = store.frozenDragRect;
      if (dragRect && frozenElements.length > 1) {
        return [createBoundsFromDragRect(dragRect)];
      }
      return frozenElements
        .filter((element): element is Element => element !== null)
        .map((element) => createElementBounds(element));
    });

    const isSelectionElementVisible = (): boolean => {
      const element = selectionElement();
      if (!element) return false;
      if (store.isTouchMode && isDragging()) return isRendererActive();
      return isRendererActive() && !isDragging();
    };

    const derived = {
      isHoldingKeys,
      isActivated,
      isCopying,
      didJustCopy,
      isPromptMode,
      isDragging,
      isFrozenPhase,
      isRendererActive,
      targetElement,
      effectiveElement,
      selectionElement,
      frozenElementsBounds,
    };

    const isSelectionSuppressed = createMemo(
      () =>
        didJustCopy() ||
        ((shared.isToolbarSelectHovered?.() ?? false) && !isFrozenPhase()),
    );

    const selectionVisible = createMemo(() => {
      if (!pluginRegistry.store.theme.enabled) return false;
      if (!pluginRegistry.store.theme.selectionBox.enabled) return false;
      if (isSelectionSuppressed()) return false;
      if (shared.hasDragPreviewBounds?.() ?? false) return true;
      return isSelectionElementVisible();
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      void store.viewportVersion;
      const frozenElements = store.frozenElements;
      if (frozenElements.length > 0) {
        const frozenBounds = frozenElementsBounds();
        if (frozenElements.length === 1) {
          return frozenBounds[0];
        }
        const dragRect = store.frozenDragRect;
        if (dragRect) {
          return frozenBounds[0] ?? createBoundsFromDragRect(dragRect);
        }
        return createFlatOverlayBounds(combineBounds(frozenBounds));
      }
      const element = selectionElement();
      if (!element) return undefined;
      return createElementBounds(element);
    });

    const cursorPosition = createMemo(() => {
      if (isCopying() || isPromptMode()) {
        void store.viewportVersion;
        const element = store.frozenElement || targetElement();
        if (element) {
          const { center } = getElementBoundsCenter(element);
          return {
            x: center.x + store.copyOffsetFromCenterX,
            y: store.copyStart.y,
          };
        }
        return { x: store.copyStart.x, y: store.copyStart.y };
      }
      return { x: store.pointer.x, y: store.pointer.y };
    });

    const api: ReactGrabAPI = {
      activate: () => {
        actions.setPendingCommentMode(false);
        if (!isActivated() && (shared.isEnabled?.() ?? true)) {
          shared.toggleActivate?.();
        }
      },
      deactivate: () => {
        if (isActivated() || isCopying()) {
          shared.deactivateRenderer?.();
        }
      },
      toggle: () => {
        if (isActivated()) {
          shared.deactivateRenderer?.();
        } else if (shared.isEnabled?.() ?? true) {
          shared.toggleActivate?.();
        }
      },
      comment: () => shared.handleComment?.(),
      isActive: () => isActivated(),
      isEnabled: () => shared.isEnabled?.() ?? true,
      setEnabled: (enabled: boolean) => {
        shared.setEnabled?.(enabled);
      },
      getToolbarState: () => loadToolbarState(),
      setToolbarState: (state: Partial<ToolbarState>) => {
        shared.updateToolbarState?.(state);
      },
      onToolbarStateChange: (callback: (state: ToolbarState) => void) =>
        shared.subscribeToToolbarStateChanges?.(callback) ?? (() => {}),
      dispose: () => {
        disposed = true;
        hasInited = false;
        disposeRenderer?.();
        shared.dismissAllPopups?.();
        eventListenerManager.abort();
        dispose();
      },
      copyElement: async (elements: Element | Element[]): Promise<boolean> => {
        const normalizedElements = Array.isArray(elements)
          ? elements
          : [elements];
        if (normalizedElements.length === 0) return false;
        return (await shared.copyWithFallback?.(normalizedElements)) ?? false;
      },
      getSource: async (element: Element): Promise<SourceInfo | null> => {
        const source = await resolveSource(element);
        if (!source) return null;
        return {
          filePath: source.filePath,
          lineNumber: source.lineNumber,
          componentName: source.componentName,
        };
      },
      getStackContext,
      getState: (): ReactGrabState => ({
        isActive: isActivated(),
        isDragging: isDragging(),
        isCopying: isCopying(),
        isPromptMode: isPromptMode(),
        isSelectionBoxVisible: Boolean(selectionVisible()),
        isDragBoxVisible: Boolean(
          isDragging() &&
          pluginRegistry.store.theme.enabled &&
          pluginRegistry.store.theme.dragBox.enabled,
        ),
        targetElement: targetElement(),
        dragBounds: null,
        grabbedBoxes: store.grabbedBoxes.map((box) => ({
          id: box.id,
          bounds: box.bounds,
          createdAt: box.createdAt,
        })),
        labelInstances: store.labelInstances.map((instance) => ({
          id: instance.id,
          status: instance.status,
          tagName: instance.tagName,
          componentName: instance.componentName,
          createdAt: instance.createdAt,
        })),
        selectionFilePath: store.selectionFilePath,
        toolbarState: shared.getCurrentToolbarState?.() ?? loadToolbarState(),
      }),
      setOptions: (options: SettableOptions) =>
        pluginRegistry.setOptions(options),
      registerPlugin: (plugin: Plugin) => {
        pluginRegistry.register(plugin, api);
        shared.syncAgentFromRegistry?.();
      },
      unregisterPlugin: (name: string) => {
        const activeEntryId =
          pluginRegistry.getRendererContributions().activeToolbarEntryId;
        if (activeEntryId) {
          const pluginEntryIds = pluginRegistry.getPluginToolbarEntryIds(name);
          if (pluginEntryIds.includes(activeEntryId as string)) {
            shared.closeToolbarEntry?.();
          }
        }
        pluginRegistry.unregister(name);
        shared.syncAgentFromRegistry?.();
      },
      getPlugins: () => pluginRegistry.getPluginNames(),
      getDisplayName: getComponentDisplayName,
      toggleToolbarEntry: (entryId: string) =>
        shared.toggleToolbarEntry?.(entryId),
      closeToolbarEntry: () => shared.closeToolbarEntry?.(),
    };

    const createPluginContext = (plugin: InternalPlugin): PluginContext => {
      const priority = plugin.priority ?? 50;
      return {
        store,
        actions,
        derived,
        registry: {
          store: pluginRegistry.store,
          hooks: pluginRegistry.hooks,
          updateToolbarEntry: pluginRegistry.updateToolbarEntry,
          setOptions: pluginRegistry.setOptions,
        },
        api,
        events: eventListenerManager,
        shared,
        onKeyDown: (handler) =>
          pluginRegistry.addInterceptor(
            "keydown",
            priority,
            handler as (event: never) => boolean,
          ),
        onKeyUp: (handler) =>
          pluginRegistry.addInterceptor(
            "keyup",
            priority,
            handler as (event: never) => boolean,
          ),
        onPointerDown: (handler) =>
          pluginRegistry.addInterceptor(
            "pointerdown",
            priority,
            handler as (event: never) => boolean,
          ),
        onPointerMove: (handler) =>
          pluginRegistry.addInterceptor(
            "pointermove",
            priority,
            handler as (event: never) => boolean,
          ),
        onPointerUp: (handler) =>
          pluginRegistry.addInterceptor(
            "pointerup",
            priority,
            handler as (event: never) => boolean,
          ),
        onContextMenu: (handler) =>
          pluginRegistry.addInterceptor(
            "contextmenu",
            priority,
            handler as (event: never) => boolean,
          ),
        provide: (key, accessor) =>
          pluginRegistry.provideRendererProp(key, accessor as () => unknown),
      };
    };

    const internalCleanups: Array<() => void> = [];
    for (const plugin of internalPlugins) {
      const ctx = createPluginContext(plugin);
      const cleanup = plugin.setup(ctx);
      if (cleanup) internalCleanups.push(cleanup);
    }

    pluginRegistry.provideRendererProp("selectionVisible", () =>
      selectionVisible(),
    );
    pluginRegistry.provideRendererProp("selectionBounds", () =>
      selectionBounds(),
    );
    pluginRegistry.provideRendererProp(
      "selectionElementsCount",
      () => store.frozenElements.length,
    );
    pluginRegistry.provideRendererProp("mouseX", () =>
      store.frozenElements.length > 1 ? undefined : cursorPosition().x,
    );
    pluginRegistry.provideRendererProp("selectionLabelStatus", () => "idle");

    createEffect(() => {
      const element = store.detectedElement;
      if (!element) return;
      const intervalId = setInterval(() => {
        if (!isElementConnected(element)) actions.setDetectedElement(null);
      }, BOUNDS_RECALC_INTERVAL_MS);
      onCleanup(() => clearInterval(intervalId));
    });

    const redetectElementUnderPointer = () => {
      if (store.isTouchMode && !isHoldingKeys() && !isActivated()) return;
      const enabled = shared.isEnabled?.() ?? true;
      if (
        enabled &&
        !isPromptMode() &&
        !isFrozenPhase() &&
        !isDragging() &&
        store.contextMenuPosition === null &&
        store.frozenElements.length === 0
      ) {
        const candidate = getElementAtPosition(
          store.pointer.x,
          store.pointer.y,
        );
        actions.setDetectedElement(candidate);
      }
    };

    const handleViewportChange = () => {
      invalidateInteractionCaches();
      redetectElementUnderPointer();
      actions.incrementViewportVersion();
      actions.updateContextMenuPosition();
    };

    eventListenerManager.addWindowListener("scroll", handleViewportChange, {
      capture: true,
    });

    let previousViewportWidth = window.innerWidth;
    let previousViewportHeight = window.innerHeight;

    eventListenerManager.addWindowListener("resize", () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      if (previousViewportWidth > 0 && previousViewportHeight > 0) {
        const scaleX = currentWidth / previousViewportWidth;
        const scaleY = currentHeight / previousViewportHeight;
        const isUniformScale =
          Math.abs(scaleX - scaleY) < ZOOM_DETECTION_THRESHOLD;
        const hasScaleChanged = Math.abs(scaleX - 1) > ZOOM_DETECTION_THRESHOLD;

        if (isUniformScale && hasScaleChanged) {
          actions.setPointer({
            x: store.pointer.x * scaleX,
            y: store.pointer.y * scaleY,
          });
        }
      }

      previousViewportWidth = currentWidth;
      previousViewportHeight = currentHeight;
      handleViewportChange();
    });

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      const { signal } = eventListenerManager;
      visualViewport.addEventListener("resize", handleViewportChange, {
        signal,
      });
      visualViewport.addEventListener("scroll", handleViewportChange, {
        signal,
      });
    }

    let boundsRecalcIntervalId: number | null = null;
    let viewportChangeFrameId: number | null = null;

    const scheduleBoundsSync = () => {
      if (viewportChangeFrameId !== null) return;
      viewportChangeFrameId = nativeRequestAnimationFrame(() => {
        viewportChangeFrameId = null;
        actions.incrementViewportVersion();
      });
    };

    createEffect(() => {
      const shouldRunInterval =
        pluginRegistry.store.theme.enabled &&
        (isActivated() ||
          isCopying() ||
          store.labelInstances.length > 0 ||
          store.grabbedBoxes.length > 0 ||
          (shared.getAgentSessionCount?.() ?? 0) > 0);

      if (shouldRunInterval) {
        if (boundsRecalcIntervalId !== null) return;
        boundsRecalcIntervalId = window.setInterval(
          () => scheduleBoundsSync(),
          BOUNDS_RECALC_INTERVAL_MS,
        );
        return;
      }

      if (boundsRecalcIntervalId !== null) {
        window.clearInterval(boundsRecalcIntervalId);
        boundsRecalcIntervalId = null;
      }
      if (viewportChangeFrameId !== null) {
        nativeCancelAnimationFrame(viewportChangeFrameId);
        viewportChangeFrameId = null;
      }
    });

    onCleanup(() => {
      if (boundsRecalcIntervalId !== null)
        window.clearInterval(boundsRecalcIntervalId);
      if (viewportChangeFrameId !== null)
        nativeCancelAnimationFrame(viewportChangeFrameId);
    });

    eventListenerManager.addDocumentListener(
      "copy",
      (event: ClipboardEvent) => {
        if (
          isPromptMode() ||
          isEventFromOverlay(event, "data-react-grab-ignore-events")
        )
          return;
        if (isRendererActive() || isCopying()) event.preventDefault();
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "keydown",
      (event: KeyboardEvent) => {
        pluginRegistry.dispatchInterceptor("keydown", event);
      },
      { capture: true },
    );
    eventListenerManager.addWindowListener(
      "keyup",
      (event: KeyboardEvent) => {
        pluginRegistry.dispatchInterceptor("keyup", event);
      },
      { capture: true },
    );
    eventListenerManager.addWindowListener(
      "pointermove",
      (event: PointerEvent) => {
        pluginRegistry.dispatchInterceptor("pointermove", event);
      },
      { capture: true },
    );
    eventListenerManager.addWindowListener(
      "pointerdown",
      (event: PointerEvent) => {
        pluginRegistry.dispatchInterceptor("pointerdown", event);
      },
      { capture: true },
    );
    eventListenerManager.addWindowListener(
      "pointerup",
      (event: PointerEvent) => {
        pluginRegistry.dispatchInterceptor("pointerup", event);
      },
      { capture: true },
    );

    eventListenerManager.addWindowListener(
      "focusin",
      (event: FocusEvent) => {
        if (isEventFromOverlay(event, "data-react-grab")) {
          event.stopPropagation();
        }
      },
      { capture: true },
    );

    const publicGrabbedBoxes = createMemo(() =>
      store.grabbedBoxes.map((box) => ({
        id: box.id,
        bounds: box.bounds,
        createdAt: box.createdAt,
      })),
    );
    const publicLabelInstances = createMemo(() =>
      store.labelInstances.map((i) => ({
        id: i.id,
        status: i.status,
        tagName: i.tagName,
        componentName: i.componentName,
        createdAt: i.createdAt,
      })),
    );

    const derivedStateForHook = createMemo(
      (): ReactGrabState => ({
        isActive: isActivated(),
        isDragging: isDragging(),
        isCopying: isCopying(),
        isPromptMode: isPromptMode(),
        isSelectionBoxVisible: Boolean(selectionVisible()),
        isDragBoxVisible: Boolean(
          isDragging() &&
          pluginRegistry.store.theme.enabled &&
          pluginRegistry.store.theme.dragBox.enabled,
        ),
        targetElement: targetElement(),
        dragBounds: null,
        grabbedBoxes: [...publicGrabbedBoxes()],
        labelInstances: [...publicLabelInstances()],
        selectionFilePath: store.selectionFilePath,
        toolbarState: shared.getCurrentToolbarState?.() ?? null,
      }),
    );

    createEffect(
      on(derivedStateForHook, (state) => {
        pluginRegistry.hooks.onStateChange(state);
      }),
    );

    createEffect(
      on(
        () =>
          [
            isPromptMode(),
            store.pointer.x,
            store.pointer.y,
            targetElement(),
          ] as const,
        ([inputMode, x, y, target]) => {
          pluginRegistry.hooks.onPromptModeChange(inputMode, {
            x,
            y,
            targetElement: target,
          });
        },
      ),
    );

    createEffect(
      on(
        () => [targetElement(), store.lastGrabbedElement] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            actions.setLastGrabbed(null);
          }
          if (currentElement) {
            pluginRegistry.hooks.onElementHover(currentElement);
          }
        },
      ),
    );

    createEffect(
      on(
        () => [selectionVisible(), selectionBounds(), targetElement()] as const,
        ([visible, bounds, element]) => {
          pluginRegistry.hooks.onSelectionBox(
            Boolean(visible),
            bounds ?? null,
            element,
          );
        },
      ),
    );

    createEffect(
      on(
        () => {
          const contributions = pluginRegistry.getRendererContributions();
          return [contributions.dragVisible, contributions.dragBounds] as const;
        },
        ([visible, bounds]) => {
          pluginRegistry.hooks.onDragBox(
            Boolean(visible),
            (bounds as OverlayBounds) ?? null,
          );
        },
      ),
    );

    onCleanup(() => {
      eventListenerManager.abort();
      for (const cleanup of internalCleanups) cleanup();
    });

    const resolvedCssText = typeof cssText === "string" ? cssText : "";
    const rendererRoot = mountRoot(resolvedCssText);

    createEffect(() => {
      const hue = pluginRegistry.store.theme.hue;
      rendererRoot.style.filter = hue !== 0 ? `hue-rotate(${hue}deg)` : "";
    });

    if (pluginRegistry.store.theme.enabled) {
      void import("../components/renderer.js")
        .then(({ ReactGrabRenderer }) => {
          if (disposed) return;
          disposeRenderer = render(() => {
            return (
              <ReactGrabRenderer
                {...pluginRegistry.getRendererContributions()}
              />
            );
          }, rendererRoot);
        })
        .catch((error) => {
          console.warn("[react-grab] Failed to load renderer:", error);
        });
    }

    for (const plugin of builtInPlugins) {
      pluginRegistry.register(plugin, api);
    }

    shared.syncAgentFromRegistry?.();

    // HACK: Force revalidation of Next.js project detection
    setTimeout(() => checkIsNextProject(true), NEXTJS_REVALIDATION_DELAY_MS);

    return api;
  });
};

export { getStack, getElementContext as formatElementInfo } from "./context.js";
export { isInstrumentationActive } from "bippy";
export { DEFAULT_THEME } from "./theme.js";

export type {
  Options,
  OverlayBounds,
  ReactGrabRendererProps,
  ReactGrabAPI,
  SourceInfo,
  AgentContext,
  AgentSession,
  AgentSessionStorage,
  AgentProvider,
  AgentCompleteResult,
  AgentOptions,
  SettableOptions,
  ContextMenuAction,
  ActionContext,
  Plugin,
  PluginConfig,
  PluginHooks,
  ToolbarEntry,
  ToolbarEntryHandle,
} from "../types.js";

export { generateSnippet } from "../utils/generate-snippet.js";
export { copyContent } from "../utils/copy-content.js";
