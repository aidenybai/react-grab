import { CopyFailedError } from "../errors.js";
import { createBoundsFromDragRect } from "../utils/create-bounds-from-drag-rect.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { getTagName } from "../utils/get-tag-name.js";
import { logRecoverableError } from "../utils/log-recoverable-error.js";
import { waitUntilNextFrame } from "../utils/native-raf.js";
import { normalizeErrorMessage } from "../utils/normalize-error.js";
import { notifyElementsSelected } from "../utils/notify-elements-selected.js";
import { runCopyFlow } from "./copy.js";
import { getComponentDisplayName, getNearestComponentName } from "./context.js";
import type { CopyFeedbackCooldown } from "./copy-feedback-cooldown.js";
import type { GrabStoreHandle } from "./store.js";
import type { PluginRegistry } from "./plugin-registry.js";
import type { LabelInstanceManager, PerElementLabelEntry } from "./label-instance-manager.js";
interface CopyWithLabelOptions {
  element: Element;
  cursorX: number;
  selectedElements?: Element[];
  extraPrompt?: string;
  shouldDeactivateAfter?: boolean;
  onComplete?: () => void;
  dragRect?: {
    pageX: number;
    pageY: number;
    width: number;
    height: number;
  };
}

export type { CopyWithLabelOptions };


interface PerElementCopyOptions {
  elements: Element[];
  labelEntries: PerElementLabelEntry[];
  shouldDeactivateAfter?: boolean;
  onComplete?: () => void;
}

export interface CopyOrchestrator {
  /** Single-label copy: builds one label over the selection, then runs the copy. */
  performCopyWithLabel: (options: CopyWithLabelOptions) => void;
  /** Per-element-label copy: builds one label per element, then runs the copy. */
  performCopyWithPerElementLabels: (options: PerElementCopyOptions) => void;
  /** Bypass label creation + onElementSelect intercept; used by the public `copyElement` API. */
  copyResolvedElements: (elements: Element[]) => Promise<boolean>;
}

interface CopyOrchestratorInput {
  grab: GrabStoreHandle;
  pluginRegistry: PluginRegistry;
  labelManager: LabelInstanceManager;
  copyFeedbackCooldown: CopyFeedbackCooldown;
  /** Called when the copy completes and the caller signalled shouldDeactivateAfter. */
  deactivateRenderer: () => void;
}

export const createCopyOrchestrator = (input: CopyOrchestratorInput): CopyOrchestrator => {
  const { grab, pluginRegistry, labelManager, copyFeedbackCooldown, deactivateRenderer } = input;
  const { store, actions, current } = grab;
  const {
    createLabelInstance,
    createPerElementLabelInstances,
    updateLabelAfterCopy,
    showTemporaryGrabbedBox,
  } = labelManager;

  const executeCopyOperation = async (
    clipboardOperation: () => Promise<void>,
    labelInstanceIds: string[] | null,
    copiedElement?: Element,
    shouldDeactivateAfter?: boolean,
  ) => {
    copyFeedbackCooldown.clear();
    if (current().state !== "copying") {
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

    if (labelInstanceIds) {
      for (const labelInstanceId of labelInstanceIds) {
        updateLabelAfterCopy(labelInstanceId, didSucceed, errorMessage);
      }
    }

    if (current().state !== "copying") return;

    if (didSucceed) {
      actions.completeCopy(copiedElement);
    }

    if (shouldDeactivateAfter) {
      deactivateRenderer();
    } else if (didSucceed) {
      actions.activate();
      copyFeedbackCooldown.start();
    } else {
      actions.unfreeze();
    }
  };

  const copyResolvedElements = (
    elements: Element[],
    extraPrompt?: string,
    resolvedComponentName?: string,
  ) => {
    const firstElement = elements[0];
    const componentName =
      resolvedComponentName ?? (firstElement ? getComponentDisplayName(firstElement) : null);
    const tagName = firstElement ? getTagName(firstElement) : null;
    const elementName = componentName ?? tagName ?? undefined;

    return runCopyFlow(
      {
        getContent: pluginRegistry.store.options.getContent,
        componentName: elementName,
      },
      {
        onBeforeCopy: pluginRegistry.hooks.onBeforeCopy,
        transformCopyContent: pluginRegistry.hooks.transformCopyContent,
        onAfterCopy: pluginRegistry.hooks.onAfterCopy,
        onCopySuccess: pluginRegistry.hooks.onCopySuccess,
        onCopyError: pluginRegistry.hooks.onCopyError,
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
      const { wasIntercepted, pendingResult } = pluginRegistry.hooks.onElementSelect(element);
      if (!wasIntercepted) {
        unhandledElements.push(element);
      }
      if (pendingResult) {
        pendingResults.push(pendingResult);
      }
      if (pluginRegistry.store.theme.grabbedBoxes.enabled) {
        showTemporaryGrabbedBox(createElementBounds(element), element);
      }
    }
    await waitUntilNextFrame();
    if (unhandledElements.length > 0) {
      await copyResolvedElements(unhandledElements, extraPrompt, resolvedComponentName);
    } else if (pendingResults.length > 0) {
      const results = await Promise.all(pendingResults);
      if (!results.every(Boolean)) {
        throw new CopyFailedError();
      }
    }
    void notifyElementsSelected(targetElements);
  };

  const runCopyJob = (job: {
    primaryElement: Element;
    elements: Element[];
    labelInstanceIds: readonly string[];
    extraPrompt?: string;
    shouldDeactivateAfter?: boolean;
    onComplete?: () => void;
  }) => {
    void getNearestComponentName(job.primaryElement)
      .then(async (componentName) => {
        await executeCopyOperation(
          () => copyElementsToClipboard(job.elements, job.extraPrompt, componentName ?? undefined),
          job.labelInstanceIds.length > 0 ? [...job.labelInstanceIds] : null,
          job.primaryElement,
          job.shouldDeactivateAfter,
        );
        job.onComplete?.();
      })
      .catch((error) => {
        logRecoverableError("Copy operation failed", error);
        const normalizedMessage = normalizeErrorMessage(error, "Action failed");
        for (const labelInstanceId of job.labelInstanceIds) {
          updateLabelAfterCopy(labelInstanceId, false, normalizedMessage);
        }
        if (current().state === "copying") {
          actions.unfreeze();
        }
      });
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
        : createElementBounds(element);

    const labelCursorX = isMultiSelect ? selectionBounds.x + selectionBounds.width / 2 : cursorX;

    const tagName = getTagName(element);
    copyFeedbackCooldown.clear();
    actions.startCopy();

    const labelInstanceId = tagName
      ? createLabelInstance(selectionBounds, tagName, undefined, "copying", {
          element,
          mouseX: labelCursorX,
          elements: selectedElements,
        })
      : null;

    runCopyJob({
      primaryElement: element,
      elements: allTargetElements,
      labelInstanceIds: labelInstanceId ? [labelInstanceId] : [],
      extraPrompt,
      shouldDeactivateAfter,
      onComplete,
    });
  };

  const performCopyWithPerElementLabels = (options: PerElementCopyOptions) => {
    const { elements, labelEntries, shouldDeactivateAfter, onComplete } = options;
    const primaryElement = elements[0];

    copyFeedbackCooldown.clear();
    actions.startCopy();

    const labelInstanceIds = createPerElementLabelInstances(labelEntries, "copying");

    runCopyJob({
      primaryElement,
      elements,
      labelInstanceIds,
      shouldDeactivateAfter,
      onComplete,
    });
  };

  return {
    performCopyWithLabel,
    performCopyWithPerElementLabels,
    copyResolvedElements,
  };
};
