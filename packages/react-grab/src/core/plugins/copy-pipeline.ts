import { createMemo, createEffect, on, onCleanup } from "solid-js";
import type {
  InternalPlugin,
  SelectionLabelInstance,
  OverlayBounds,
  GrabbedBox,
  CopyWithLabelOptions,
  PerformWithFeedbackOptions,
  Position,
} from "../../types.js";
import { tryCopyWithFallback } from "../copy.js";
import {
  getNearestComponentName,
  getComponentDisplayName,
} from "../context.js";
import { resolveSource } from "element-source";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import { generateId } from "../../utils/generate-id.js";
import { normalizeErrorMessage } from "../../utils/normalize-error.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import { isEventFromOverlay } from "../../utils/is-event-from-overlay.js";
import { isElementConnected } from "../../utils/is-element-connected.js";
import { getTagName } from "../../utils/get-tag-name.js";
import { getElementBoundsCenter } from "../../utils/get-element-bounds-center.js";
import { waitUntilNextFrame } from "../../utils/native-raf.js";
import { combineBounds } from "../../utils/combine-bounds.js";
import {
  createBoundsFromDragRect,
  createFlatOverlayBounds,
  createPageRectFromBounds,
} from "../../utils/create-bounds-from-drag-rect.js";
import {
  FEEDBACK_DURATION_MS,
  FADE_COMPLETE_BUFFER_MS,
  PREVIEW_TEXT_MAX_LENGTH,
} from "../../constants.js";

export const copyPipelinePlugin: InternalPlugin = {
  name: "copy-pipeline",
  priority: 40,
  setup: (ctx) => {
    const { store, actions, registry, events, derived } = ctx;
    const {
      isActivated,
      isCopying,
      isPromptMode,
      isRendererActive,
      frozenElementsBounds,
    } = derived;

    let isCopyFeedbackCooldownActive = false;
    let copyFeedbackCooldownTimerId: number | null = null;

    const startCopyFeedbackCooldown = () => {
      isCopyFeedbackCooldownActive = true;
      if (copyFeedbackCooldownTimerId !== null) {
        window.clearTimeout(copyFeedbackCooldownTimerId);
      }
      copyFeedbackCooldownTimerId = window.setTimeout(() => {
        isCopyFeedbackCooldownActive = false;
        copyFeedbackCooldownTimerId = null;
      }, FEEDBACK_DURATION_MS);
    };

    const clearCopyFeedbackCooldown = () => {
      if (copyFeedbackCooldownTimerId !== null) {
        window.clearTimeout(copyFeedbackCooldownTimerId);
        copyFeedbackCooldownTimerId = null;
      }
      isCopyFeedbackCooldownActive = false;
    };

    createEffect(() => {
      if (store.current.state !== "justCopied") return;
      const timerId = setTimeout(() => {
        actions.finishJustCopied();
      }, FEEDBACK_DURATION_MS);
      onCleanup(() => clearTimeout(timerId));
    });

    let cursorStyleElement: HTMLStyleElement | null = null;

    const setCursorOverride = (cursor: string | null) => {
      if (cursor) {
        if (!cursorStyleElement) {
          cursorStyleElement = document.createElement("style");
          cursorStyleElement.setAttribute("data-react-grab-cursor", "");
          document.head.appendChild(cursorStyleElement);
        }
        cursorStyleElement.textContent = `* { cursor: ${cursor} !important; }`;
      } else if (cursorStyleElement) {
        cursorStyleElement.remove();
        cursorStyleElement = null;
      }
    };

    createEffect(
      on(
        () => [isActivated(), isCopying(), isPromptMode()] as const,
        ([activated, copying, promptMode]) => {
          if (copying) {
            setCursorOverride("progress");
          } else if (activated && !promptMode) {
            setCursorOverride("crosshair");
          } else {
            setCursorOverride(null);
          }
        },
      ),
    );

    const grabbedBoxTimeouts = new Map<string, number>();

    const showTemporaryGrabbedBox = (
      bounds: OverlayBounds,
      element: Element,
    ) => {
      const boxId = generateId("grabbed");
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };

      actions.addGrabbedBox(newBox);
      registry.hooks.onGrabbedBox(bounds, element);

      const timeoutId = window.setTimeout(() => {
        grabbedBoxTimeouts.delete(boxId);
        actions.removeGrabbedBox(boxId);
      }, FEEDBACK_DURATION_MS);
      grabbedBoxTimeouts.set(boxId, timeoutId);
    };

    const labelFadeTimeouts = new Map<string, number>();

    const cancelLabelFade = (instanceId: string) => {
      const existingTimeout = labelFadeTimeouts.get(instanceId);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
        labelFadeTimeouts.delete(instanceId);
      }
    };

    const cancelAllLabelFades = () => {
      for (const timeoutId of labelFadeTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      labelFadeTimeouts.clear();
    };

    const scheduleLabelFade = (instanceId: string) => {
      cancelLabelFade(instanceId);

      const timeoutId = window.setTimeout(() => {
        labelFadeTimeouts.delete(instanceId);
        actions.updateLabelInstance(instanceId, "fading");
        setTimeout(() => {
          labelFadeTimeouts.delete(instanceId);
          actions.removeLabelInstance(instanceId);
        }, FADE_COMPLETE_BUFFER_MS);
      }, FEEDBACK_DURATION_MS);

      labelFadeTimeouts.set(instanceId, timeoutId);
    };

    const handleLabelInstanceHoverChange = (
      instanceId: string,
      isHovered: boolean,
    ) => {
      if (isHovered) {
        cancelLabelFade(instanceId);
      } else {
        const instance = store.labelInstances.find(
          (labelInstance) => labelInstance.id === instanceId,
        );
        if (instance && instance.status === "copied") {
          scheduleLabelFade(instanceId);
        }
      }
    };

    const createLabelInstance = (
      bounds: OverlayBounds,
      tagName: string,
      componentName: string | undefined,
      status: SelectionLabelInstance["status"],
      options?: {
        element?: Element;
        mouseX?: number;
        elements?: Element[];
        boundsMultiple?: OverlayBounds[];
        hideArrow?: boolean;
      },
    ): string => {
      actions.clearLabelInstances();
      cancelAllLabelFades();
      const instanceId = generateId("label");
      const boundsCenterX = bounds.x + bounds.width / 2;
      const boundsHalfWidth = bounds.width / 2;
      const mouseX = options?.mouseX;
      const mouseXOffset =
        mouseX !== undefined ? mouseX - boundsCenterX : undefined;

      const instance: SelectionLabelInstance = {
        id: instanceId,
        bounds,
        boundsMultiple: options?.boundsMultiple,
        tagName,
        componentName,
        status,
        createdAt: Date.now(),
        element: options?.element,
        elements: options?.elements,
        mouseX,
        mouseXOffsetFromCenter: mouseXOffset,
        mouseXOffsetRatio:
          mouseXOffset !== undefined && boundsHalfWidth > 0
            ? mouseXOffset / boundsHalfWidth
            : undefined,
        hideArrow: options?.hideArrow,
      };
      actions.addLabelInstance(instance);
      return instanceId;
    };

    const clearAllLabels = () => {
      cancelAllLabelFades();
      actions.clearLabelInstances();
    };

    const updateLabelAfterCopy = (
      labelInstanceId: string,
      didSucceed: boolean,
      errorMessage?: string,
    ) => {
      if (didSucceed) {
        actions.updateLabelInstance(labelInstanceId, "copied");
      } else {
        actions.updateLabelInstance(
          labelInstanceId,
          "error",
          errorMessage || "Unknown error",
        );
      }
      scheduleLabelFade(labelInstanceId);
    };

    const notifyElementsSelected = async (
      elements: Element[],
    ): Promise<void> => {
      const elementsPayload = await Promise.all(
        elements.map(async (element) => {
          const source = await resolveSource(element);
          let componentName = source?.componentName ?? null;
          const filePath = source?.filePath;
          const lineNumber = source?.lineNumber ?? undefined;
          const columnNumber = source?.columnNumber ?? undefined;

          if (!componentName) {
            componentName = getComponentDisplayName(element);
          }

          const textContent =
            element instanceof HTMLElement
              ? element.innerText?.slice(0, PREVIEW_TEXT_MAX_LENGTH)
              : undefined;

          return {
            tagName: getTagName(element),
            id: element.id || undefined,
            className: element.getAttribute("class") || undefined,
            textContent,
            componentName: componentName ?? undefined,
            filePath,
            lineNumber,
            columnNumber,
          };
        }),
      );

      window.dispatchEvent(
        new CustomEvent("react-grab:element-selected", {
          detail: {
            elements: elementsPayload,
          },
        }),
      );
    };

    const executeCopyOperation = async (
      clipboardOperation: () => Promise<void>,
      labelInstanceId: string | null,
      copiedElement?: Element,
      shouldDeactivateAfter?: boolean,
    ) => {
      clearCopyFeedbackCooldown();
      if (store.current.state !== "copying") {
        actions.startCopy();
      }

      let didSucceed = false;
      let errorMessage: string | undefined;

      try {
        await clipboardOperation();
        didSucceed = true;
      } catch (error) {
        errorMessage = normalizeErrorMessage(error, "Action failed");
      }

      if (labelInstanceId) {
        updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
      }

      if (store.current.state !== "copying") return;

      if (didSucceed) {
        actions.completeCopy(copiedElement);
      }

      if (shouldDeactivateAfter) {
        ctx.shared.deactivateRenderer?.();
      } else if (didSucceed) {
        actions.activate();
        startCopyFeedbackCooldown();
      } else {
        actions.unfreeze();
      }
    };

    const copyWithFallback = (
      elements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ) => {
      const firstElement = elements[0];
      const componentName =
        resolvedComponentName ??
        (firstElement ? getComponentDisplayName(firstElement) : null);
      const tagName = firstElement ? getTagName(firstElement) : null;
      const elementName = componentName ?? tagName ?? undefined;

      return tryCopyWithFallback(
        {
          maxContextLines: registry.store.options.maxContextLines,
          getContent: registry.store.options.getContent,
          componentName: elementName,
        },
        {
          onBeforeCopy: registry.hooks.onBeforeCopy,
          transformSnippet: registry.hooks.transformSnippet,
          transformCopyContent: registry.hooks.transformCopyContent,
          onAfterCopy: registry.hooks.onAfterCopy,
          onCopySuccess: (copiedElements: Element[], content: string) => {
            registry.hooks.onCopySuccess(copiedElements, content);
            ctx.shared.handleCopySuccessWithComments?.(
              copiedElements,
              extraPrompt,
            );
          },
          onCopyError: registry.hooks.onCopyError,
        },
        elements,
        extraPrompt,
      );
    };

    const copyElementsToClipboard = async (
      targetElements: Element[],
      extraPrompt?: string,
      resolvedComponentName?: string,
    ): Promise<void> => {
      if (targetElements.length === 0) return;

      const unhandledElements: Element[] = [];
      const pendingResults: Promise<boolean>[] = [];
      for (const element of targetElements) {
        const { wasIntercepted, pendingResult } =
          registry.hooks.onElementSelect(element);
        if (!wasIntercepted) {
          unhandledElements.push(element);
        }
        if (pendingResult) {
          pendingResults.push(pendingResult);
        }
        if (registry.store.theme.grabbedBoxes.enabled) {
          showTemporaryGrabbedBox(createElementBounds(element), element);
        }
      }
      await waitUntilNextFrame();
      if (unhandledElements.length > 0) {
        await copyWithFallback(
          unhandledElements,
          extraPrompt,
          resolvedComponentName,
        );
      } else if (pendingResults.length > 0) {
        const results = await Promise.all(pendingResults);
        if (!results.every(Boolean)) {
          throw new Error("Failed to copy");
        }
      }
      void notifyElementsSelected(targetElements);
    };

    const performCopyWithLabel = (options: CopyWithLabelOptions) => {
      const {
        element,
        cursorX,
        selectedElements,
        extraPrompt,
        shouldDeactivateAfter,
        onComplete,
        dragRect: passedDragRect,
      } = options;

      const allTargetElements = selectedElements ?? [element];
      const dragRect = passedDragRect ?? store.frozenDragRect;
      const isMultiSelect = allTargetElements.length > 1;

      const selectionBounds =
        dragRect && isMultiSelect
          ? createBoundsFromDragRect(dragRect)
          : createFlatOverlayBounds(createElementBounds(element));

      const labelCursorX = isMultiSelect
        ? selectionBounds.x + selectionBounds.width / 2
        : cursorX;

      const tagName = getTagName(element);
      clearCopyFeedbackCooldown();
      actions.startCopy();

      const labelInstanceId = tagName
        ? createLabelInstance(selectionBounds, tagName, undefined, "copying", {
            element,
            mouseX: labelCursorX,
            elements: selectedElements,
          })
        : null;

      void getNearestComponentName(element)
        .then(async (componentName) => {
          await executeCopyOperation(
            () =>
              copyElementsToClipboard(
                allTargetElements,
                extraPrompt,
                componentName ?? undefined,
              ),
            labelInstanceId,
            element,
            shouldDeactivateAfter,
          );
          onComplete?.();
        })
        .catch((error) => {
          logRecoverableError("Copy operation failed", error);
          if (labelInstanceId) {
            updateLabelAfterCopy(
              labelInstanceId,
              false,
              normalizeErrorMessage(error, "Action failed"),
            );
          }
          if (store.current.state === "copying") {
            actions.unfreeze();
          }
        });
    };

    const labelInstanceCache = new Map<string, SelectionLabelInstance>();

    const recomputeLabelInstance = (
      instance: SelectionLabelInstance,
    ): SelectionLabelInstance => {
      const hasMultipleElements =
        instance.elements && instance.elements.length > 1;
      const instanceElement = instance.element;
      const canRecalculateBounds =
        !hasMultipleElements &&
        instanceElement &&
        document.body.contains(instanceElement);
      const newBounds = canRecalculateBounds
        ? createElementBounds(instanceElement)
        : instance.bounds;

      const previousInstance = labelInstanceCache.get(instance.id);
      const boundsUnchanged =
        previousInstance &&
        previousInstance.bounds.x === newBounds.x &&
        previousInstance.bounds.y === newBounds.y &&
        previousInstance.bounds.width === newBounds.width &&
        previousInstance.bounds.height === newBounds.height;
      if (
        previousInstance &&
        previousInstance.status === instance.status &&
        previousInstance.errorMessage === instance.errorMessage &&
        boundsUnchanged
      ) {
        return previousInstance;
      }
      const newBoundsCenterX = newBounds.x + newBounds.width / 2;
      const newBoundsHalfWidth = newBounds.width / 2;
      let newMouseX: number;
      if (instance.mouseXOffsetRatio !== undefined && newBoundsHalfWidth > 0) {
        newMouseX =
          newBoundsCenterX + instance.mouseXOffsetRatio * newBoundsHalfWidth;
      } else if (instance.mouseXOffsetFromCenter !== undefined) {
        newMouseX = newBoundsCenterX + instance.mouseXOffsetFromCenter;
      } else {
        newMouseX = instance.mouseX ?? newBoundsCenterX;
      }
      const newCached = { ...instance, bounds: newBounds, mouseX: newMouseX };
      labelInstanceCache.set(instance.id, newCached);
      return newCached;
    };

    const computedLabelInstances = createMemo(() => {
      if (!registry.store.theme.enabled) return [];
      if (!registry.store.theme.grabbedBoxes.enabled) return [];
      void store.viewportVersion;
      const currentIds = new Set(
        store.labelInstances.map((instance) => instance.id),
      );
      for (const cachedId of labelInstanceCache.keys()) {
        if (!currentIds.has(cachedId)) {
          labelInstanceCache.delete(cachedId);
        }
      }
      return store.labelInstances.map(recomputeLabelInstance);
    });

    const computedGrabbedBoxes = createMemo(() => {
      if (!registry.store.theme.enabled) return [];
      if (!registry.store.theme.grabbedBoxes.enabled) return [];
      void store.viewportVersion;
      return store.grabbedBoxes.map((box) => {
        if (!box.element || !document.body.contains(box.element)) {
          return box;
        }
        return {
          ...box,
          bounds: createElementBounds(box.element),
        };
      });
    });

    const contextMenuBounds = createMemo((): OverlayBounds | null => {
      void store.viewportVersion;
      const element = store.contextMenuElement;
      if (!element) return null;
      return createElementBounds(element);
    });

    const createPerformWithFeedback = (
      element: Element,
      elements: Element[],
      tagName: string | undefined,
      componentName: string | undefined,
      options?: PerformWithFeedbackOptions,
    ) => {
      return async (action: () => Promise<boolean>): Promise<void> => {
        const fallbackBounds = options?.fallbackBounds ?? null;
        const fallbackSelectionBounds = options?.fallbackSelectionBounds ?? [];
        const position =
          options?.position ?? store.contextMenuPosition ?? store.pointer;
        const frozenBounds = frozenElementsBounds();
        const singleElementBounds = contextMenuBounds() ?? fallbackBounds;
        const hasMultipleElements = elements.length > 1;

        const labelBounds = hasMultipleElements
          ? createFlatOverlayBounds(combineBounds(frozenBounds))
          : singleElementBounds;

        const shouldDeactivateAfter = store.wasActivatedByToggle;
        let selectionBoundsForLabel: OverlayBounds[];
        if (hasMultipleElements) {
          selectionBoundsForLabel = frozenBounds;
        } else if (singleElementBounds) {
          selectionBoundsForLabel = [singleElementBounds];
        } else {
          selectionBoundsForLabel = fallbackSelectionBounds;
        }

        actions.hideContextMenu();

        if (labelBounds) {
          const labelCursorX = hasMultipleElements
            ? labelBounds.x + labelBounds.width / 2
            : position.x;

          const labelInstanceId = createLabelInstance(
            labelBounds,
            tagName || "element",
            componentName,
            "copying",
            {
              element,
              mouseX: labelCursorX,
              elements: hasMultipleElements ? elements : undefined,
              boundsMultiple: selectionBoundsForLabel,
            },
          );

          let didSucceed = false;
          let errorMessage: string | undefined;

          try {
            didSucceed = await action();
            if (!didSucceed) {
              errorMessage = "Failed to copy";
            }
          } catch (error) {
            errorMessage = normalizeErrorMessage(error, "Action failed");
          }

          updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
        } else {
          // HACK: Fire-and-forget when no label bounds to display feedback on
          try {
            await action();
          } catch (error) {
            logRecoverableError("Action failed without feedback bounds", error);
          }
        }

        if (shouldDeactivateAfter) {
          ctx.shared.deactivateRenderer?.();
        } else {
          actions.unfreeze();
        }
      };
    };

    const handleShowContextMenuInstance = (instanceId: string) => {
      const instance = store.labelInstances.find(
        (labelInstance) => labelInstance.id === instanceId,
      );
      if (!instance?.element) return;
      if (!isElementConnected(instance.element)) return;

      const contextMenuElement = instance.element;
      const { center } = getElementBoundsCenter(contextMenuElement);
      const position = {
        x: instance.mouseX ?? center.x,
        y: center.y,
      };

      const elementsToFreeze =
        instance.elements && instance.elements.length > 0
          ? instance.elements.filter((element) => isElementConnected(element))
          : [contextMenuElement];

      // HACK: Defer context menu display to avoid event interference
      setTimeout(() => {
        if (!isActivated()) {
          actions.setWasActivatedByToggle(true);
          ctx.shared.activateRenderer?.();
        }
        actions.setPointer(position);
        actions.setFrozenElements(elementsToFreeze);
        const hasMultipleElements = elementsToFreeze.length > 1;
        if (hasMultipleElements && instance.bounds) {
          actions.setFrozenDragRect(createPageRectFromBounds(instance.bounds));
        }
        actions.freeze();
        actions.showContextMenu(position, contextMenuElement);
      }, 0);
    };

    events.addDocumentListener(
      "copy",
      (event: ClipboardEvent) => {
        if (
          isPromptMode() ||
          isEventFromOverlay(event, "data-react-grab-ignore-events")
        ) {
          return;
        }
        if (isRendererActive() || isCopying()) {
          event.preventDefault();
        }
      },
      { capture: true },
    );

    ctx.shared.performCopyWithLabel = performCopyWithLabel;
    ctx.shared.createLabelInstance = (
      element: Element,
      tagName: string,
      componentName: string | undefined,
      cursorX: number,
      options?: {
        elements?: Element[];
        boundsMultiple?: OverlayBounds[];
        extraPrompt?: string;
        hideArrow?: boolean;
      },
    ) => {
      const bounds = createElementBounds(element);
      return createLabelInstance(bounds, tagName, componentName, "copying", {
        element,
        mouseX: cursorX,
        elements: options?.elements,
        boundsMultiple: options?.boundsMultiple,
        hideArrow: options?.hideArrow,
      });
    };
    ctx.shared.updateLabelAfterCopy = updateLabelAfterCopy;
    ctx.shared.clearAllLabels = clearAllLabels;
    ctx.shared.showTemporaryGrabbedBox = (element: Element) => {
      showTemporaryGrabbedBox(createElementBounds(element), element);
    };
    ctx.shared.createPerformWithFeedback = (
      options?: PerformWithFeedbackOptions,
    ) => {
      const element = store.frozenElement ?? store.detectedElement;
      if (!element) {
        return async () => {};
      }
      const elements =
        store.frozenElements.length > 0 ? store.frozenElements : [element];
      const tagName = getTagName(element) || undefined;
      const componentName = getComponentDisplayName(element) ?? undefined;
      return createPerformWithFeedback(
        element,
        elements,
        tagName,
        componentName,
        options,
      );
    };
    ctx.shared.isCopyFeedbackCooldownActive = () =>
      isCopyFeedbackCooldownActive;
    ctx.shared.clearCopyFeedbackCooldown = clearCopyFeedbackCooldown;
    ctx.shared.isRendererActive = () => isRendererActive();
    ctx.shared.copyWithFallback = (elements: Element[], extraPrompt?: string) =>
      copyWithFallback(elements, extraPrompt);
    ctx.shared.setCopyStartPosition = (
      position: Position,
      element: Element,
    ) => {
      actions.setCopyStart(position, element);
    };

    ctx.provide("grabbedBoxes", () => computedGrabbedBoxes());
    ctx.provide("labelInstances", () => computedLabelInstances());
    ctx.provide(
      "onShowContextMenuInstance",
      () => handleShowContextMenuInstance,
    );
    ctx.provide(
      "onLabelInstanceHoverChange",
      () => handleLabelInstanceHoverChange,
    );

    return () => {
      clearCopyFeedbackCooldown();

      for (const timeoutId of grabbedBoxTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      grabbedBoxTimeouts.clear();

      cancelAllLabelFades();

      if (cursorStyleElement) {
        cursorStyleElement.remove();
        cursorStyleElement = null;
      }

      labelInstanceCache.clear();
    };
  },
};
