import { createSignal, createMemo, createEffect, on, batch } from "solid-js";
import type {
  InternalPlugin,
  AgentSession,
  AgentOptions,
  CommentItem,
  DropdownAnchor,
  OverlayBounds,
  Position,
} from "../../types.js";
import { createAgentManager } from "../agent/manager.js";
import {
  loadComments,
  addCommentItem,
  removeCommentItem,
  clearComments,
  isClearConfirmed,
  confirmClear,
} from "../../utils/comment-storage.js";
import { copyContent } from "../../utils/copy-content.js";
import { joinSnippets } from "../../utils/join-snippets.js";
import { createElementBounds } from "../../utils/create-element-bounds.js";
import { createElementSelector } from "../../utils/create-element-selector.js";
import { isElementConnected } from "../../utils/is-element-connected.js";
import { getElementBoundsCenter } from "../../utils/get-element-bounds-center.js";
import { getBoundsCenter } from "../../utils/get-bounds-center.js";
import { generateId } from "../../utils/generate-id.js";
import { logRecoverableError } from "../../utils/log-recoverable-error.js";
import { nativeRequestAnimationFrame } from "../../utils/native-raf.js";
import {
  DROPDOWN_HOVER_OPEN_DELAY_MS,
  PLUGIN_PRIORITY_PROMPT,
} from "../../constants.js";

export const promptPlugin: InternalPlugin = {
  name: "prompt",
  priority: PLUGIN_PRIORITY_PROMPT,
  setup: (ctx) => {
    const { store, actions, registry, shared, derived } = ctx;
    const { isActivated, isPromptMode, targetElement } = derived;

    const isCommentMode = createMemo(
      () => store.pendingCommentMode || isPromptMode(),
    );
    const isPendingDismiss = createMemo(
      () =>
        store.current.state === "active" &&
        Boolean(store.current.isPromptMode) &&
        Boolean(store.current.isPendingDismiss),
    );

    // selectionLabelShakeCount signal
    const [selectionLabelShakeCount, setSelectionLabelShakeCount] =
      createSignal(0);

    const [commentItems, setCommentItems] =
      createSignal<CommentItem[]>(loadComments());
    const [commentsDropdownPosition, setCommentsDropdownPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [clearPromptPosition, setClearPromptPosition] =
      createSignal<DropdownAnchor | null>(null);
    const [clockFlashTrigger, setClockFlashTrigger] = createSignal(0);
    const [isCommentsHoverOpen, setIsCommentsHoverOpen] = createSignal(false);
    let commentsHoverPreviews: { boxId: string; labelId: string | null }[] = [];
    const commentElementMap = new Map<string, Element[]>();

    const getMappedCommentElements = (commentItemId: string): Element[] =>
      commentElementMap.get(commentItemId) ?? [];

    const reacquireCommentElements = (commentItem: CommentItem): Element[] => {
      const selectors = commentItem.elementSelectors ?? [];
      if (selectors.length === 0) return [];

      const reacquiredElements: Element[] = [];
      for (const selector of selectors) {
        if (!selector) continue;
        try {
          const reacquiredElement = document.querySelector(selector);
          if (isElementConnected(reacquiredElement)) {
            reacquiredElements.push(reacquiredElement);
          }
          // HACK: querySelector can throw on invalid selectors stored from previous sessions
        } catch (error) {
          logRecoverableError("Invalid stored selector", error);
        }
      }
      return reacquiredElements;
    };

    const getConnectedCommentElements = (
      commentItem: CommentItem,
    ): Element[] => {
      const mappedElements = getMappedCommentElements(commentItem.id);
      const connectedMappedElements = mappedElements.filter((mappedElement) =>
        isElementConnected(mappedElement),
      );
      const areAllMappedElementsConnected =
        mappedElements.length > 0 &&
        connectedMappedElements.length === mappedElements.length;

      if (areAllMappedElementsConnected) {
        return connectedMappedElements;
      }

      const reacquiredElements = reacquireCommentElements(commentItem);
      if (reacquiredElements.length > 0) {
        commentElementMap.set(commentItem.id, reacquiredElements);
        return reacquiredElements;
      }

      return connectedMappedElements;
    };

    const getFirstConnectedCommentElement = (
      commentItem: CommentItem,
    ): Element | undefined => getConnectedCommentElements(commentItem)[0];

    const commentsDisconnectedItemIds = createMemo(
      () => {
        // HACK: subscribe to dropdown position so connectivity refreshes when dropdown opens
        void commentsDropdownPosition();
        const disconnectedIds = new Set<string>();
        for (const item of commentItems()) {
          if (getConnectedCommentElements(item).length === 0) {
            disconnectedIds.add(item.id);
          }
        }
        return disconnectedIds;
      },
      undefined,
      {
        equals: (prev, next) => {
          if (prev.size !== next.size) return false;
          for (const id of next) {
            if (!prev.has(id)) return false;
          }
          return true;
        },
      },
    );

    const setCopyStartPosition = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setCopyStart({ x: positionX, y: positionY }, element);
      return createElementBounds(element);
    };

    const preparePromptMode = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      setCopyStartPosition(element, positionX, positionY);
      actions.clearInputText();
    };

    const activatePromptMode = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        actions.enterPromptMode(
          { x: store.pointer.x, y: store.pointer.y },
          element,
        );
      }
    };

    const enterCommentModeForElement = (
      element: Element,
      positionX: number,
      positionY: number,
    ) => {
      actions.setPendingCommentMode(false);
      actions.clearInputText();
      actions.enterPromptMode({ x: positionX, y: positionY }, element);
    };

    const handleCopySuccessWithComments = (
      copiedElements: Element[],
      extraPrompt: string | undefined,
    ) => {
      if (!extraPrompt) return;

      const hasCopiedElements = copiedElements.length > 0;

      if (hasCopiedElements) {
        const currentItems = commentItems();
        for (const [
          existingItemId,
          mappedElements,
        ] of commentElementMap.entries()) {
          const isSameSelection =
            mappedElements.length === copiedElements.length &&
            mappedElements.every(
              (mappedElement, index) => mappedElement === copiedElements[index],
            );
          if (!isSameSelection) continue;
          const existingItem = currentItems.find(
            (item) => item.id === existingItemId,
          );
          if (!existingItem) continue;

          if (existingItem.commentText === extraPrompt) {
            removeCommentItem(existingItemId);
            commentElementMap.delete(existingItemId);
            break;
          }
        }
      }

      const elementSelectors = copiedElements.map((copiedElement, index) =>
        createElementSelector(copiedElement, index === 0),
      );

      const firstElement = copiedElements[0];
      const tagName = firstElement
        ? (firstElement.tagName?.toLowerCase() ?? "div")
        : "div";

      const updatedCommentItems = addCommentItem({
        content: "",
        elementName: "element",
        tagName,
        componentName: undefined,
        elementsCount: copiedElements.length,
        previewBounds: copiedElements.map((copiedElement) =>
          createElementBounds(copiedElement),
        ),
        elementSelectors,
        commentText: extraPrompt,
        timestamp: Date.now(),
      });
      setCommentItems(updatedCommentItems);
      setClockFlashTrigger((previous) => previous + 1);
      const newestCommentItem = updatedCommentItems[0];
      if (newestCommentItem && hasCopiedElements) {
        commentElementMap.set(newestCommentItem.id, [...copiedElements]);
      }

      const currentItemIds = new Set(
        updatedCommentItems.map((item) => item.id),
      );
      for (const mapItemId of commentElementMap.keys()) {
        if (!currentItemIds.has(mapItemId)) {
          commentElementMap.delete(mapItemId);
        }
      }
    };

    const getAgentFromActions = () => {
      for (const action of registry.store.actions) {
        if (action.agent?.provider) {
          return action.agent;
        }
      }
      return undefined;
    };

    const restoreInputFromSession = (
      session: AgentSession,
      elements: Element[],
      agent?: AgentOptions,
    ) => {
      const element = elements[0];
      if (isElementConnected(element)) {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        actions.setPointer({ x: session.position.x, y: centerY });
        actions.setFrozenElements(elements);
        actions.setInputText(session.context.prompt);
        actions.setWasActivatedByToggle(true);

        if (agent) {
          actions.setSelectedAgent(agent);
        }

        if (!isActivated()) {
          shared.activateRenderer?.();
        }
      }
    };

    const wrapAgentWithCallbacks = (agent: AgentOptions): AgentOptions => {
      return {
        ...agent,
        onAbort: (session: AgentSession, elements: Element[]) => {
          agent.onAbort?.(session, elements);
          restoreInputFromSession(session, elements, agent);
        },
        onUndo: (session: AgentSession, elements: Element[]) => {
          agent.onUndo?.(session, elements);
          restoreInputFromSession(session, elements, agent);
        },
      };
    };

    const getAgentOptionsWithCallbacks = () => {
      const agent = getAgentFromActions();
      if (!agent) return undefined;
      return wrapAgentWithCallbacks(agent);
    };

    const agentManager = createAgentManager(getAgentOptionsWithCallbacks(), {
      transformAgentContext: registry.hooks.transformAgentContext,
    });

    const handleInputSubmit = () => {
      actions.clearLastCopied();
      const frozenElements = [...store.frozenElements];
      const element = store.frozenElement || targetElement();
      const prompt = isPromptMode() ? store.inputText.trim() : "";

      if (!element) {
        shared.deactivateRenderer?.();
        return;
      }

      const elements = frozenElements.length > 0 ? frozenElements : [element];

      const currentSelectionBounds = elements.map((selectedElement) =>
        createElementBounds(selectedElement),
      );
      const firstBounds = currentSelectionBounds[0];
      const { x: currentX, y: currentY } = getBoundsCenter(firstBounds);
      const labelPositionX = currentX + store.copyOffsetFromCenterX;

      if ((store.selectedAgent || store.hasAgentProvider) && prompt) {
        const currentReplySessionId = store.replySessionId;
        const selectedAgent = store.selectedAgent;

        shared.deactivateRenderer?.();

        actions.clearReplySessionId();
        actions.setSelectedAgent(null);

        void agentManager.session.start({
          elements,
          prompt,
          position: { x: labelPositionX, y: currentY },
          selectionBounds: currentSelectionBounds,
          sessionId: currentReplySessionId ?? undefined,
          agent: selectedAgent
            ? wrapAgentWithCallbacks(selectedAgent)
            : undefined,
        });

        return;
      }

      actions.setPointer({ x: currentX, y: currentY });
      actions.exitPromptMode();
      actions.clearInputText();
      actions.clearReplySessionId();

      shared.performCopyWithLabel?.({
        element,
        cursorX: labelPositionX,
        selectedElements: elements,
        extraPrompt: prompt || undefined,
        shouldDeactivateAfter: true,
      });
    };

    const handleInputCancel = () => {
      actions.clearLastCopied();
      if (!isPromptMode()) return;

      if (isPendingDismiss()) {
        actions.clearInputText();
        actions.clearReplySessionId();
        shared.deactivateRenderer?.();
        return;
      }

      actions.setPendingDismiss(true);
      setSelectionLabelShakeCount((count) => count + 1);
    };

    const handleConfirmDismiss = () => {
      actions.clearInputText();
      actions.clearReplySessionId();
      shared.deactivateRenderer?.();
    };

    const handleCancelDismiss = () => {
      actions.setPendingDismiss(false);
    };

    const handleAgentAbort = (sessionId: string, confirmed: boolean) => {
      actions.setPendingAbortSessionId(null);
      if (confirmed) {
        agentManager.session.abort(sessionId);
      }
    };

    const handleToggleExpand = () => {
      const element = store.frozenElement || targetElement();
      if (element) {
        preparePromptMode(element, store.pointer.x, store.pointer.y);
      }
      activatePromptMode();
    };

    const handleFollowUpSubmit = (sessionId: string, prompt: string) => {
      const session = agentManager.sessions().get(sessionId);
      const elements = agentManager.session.getElements(sessionId);
      const sessionBounds = session?.selectionBounds ?? [];
      const firstBounds = sessionBounds[0];
      if (session && elements.length > 0 && firstBounds) {
        const positionX = session.position.x;
        const followUpSessionId = session.context.sessionId ?? sessionId;

        agentManager.session.dismiss(sessionId);

        void agentManager.session.start({
          elements,
          prompt,
          position: {
            x: positionX,
            y: firstBounds.y + firstBounds.height / 2,
          },
          selectionBounds: sessionBounds,
          sessionId: followUpSessionId,
        });
      }
    };

    const handleAcknowledgeError = (sessionId: string) => {
      const prompt = agentManager.session.acknowledgeError(sessionId);
      if (prompt) {
        actions.setInputText(prompt);
      }
    };

    const handleComment = () => {
      const isAlreadyInCommentMode = isActivated() && isCommentMode();
      if (isAlreadyInCommentMode) {
        shared.deactivateRenderer?.();
        return;
      }

      actions.setPendingCommentMode(true);
      if (!isActivated()) {
        shared.toggleActivate?.();
      }
    };

    const handleUndoRedoKeys = (event: KeyboardEvent): boolean => {
      const isUndoOrRedo =
        event.code === "KeyZ" && (event.metaKey || event.ctrlKey);

      if (!isUndoOrRedo) return false;

      const hasActiveConfirmation = Array.from(
        agentManager.sessions().values(),
      ).some((session) => !session.isStreaming && !session.error);

      if (hasActiveConfirmation) return false;

      const isRedo = event.shiftKey;

      if (isRedo && agentManager.canRedo()) {
        event.preventDefault();
        event.stopPropagation();
        agentManager.history.redo();
        return true;
      } else if (!isRedo && agentManager.canUndo()) {
        event.preventDefault();
        event.stopPropagation();
        agentManager.history.undo();
        return true;
      }

      return false;
    };

    createEffect(
      on(
        () => store.viewportVersion,
        () => agentManager._internal.updateBoundsOnViewportChange(),
      ),
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
          registry.hooks.onPromptModeChange(inputMode, {
            x,
            y,
            targetElement: target,
          });
        },
      ),
    );

    const clearCommentsHoverPreviews = () => {
      for (const { boxId, labelId } of commentsHoverPreviews) {
        actions.removeGrabbedBox(boxId);
        if (labelId) {
          actions.removeLabelInstance(labelId);
        }
      }
      commentsHoverPreviews = [];
    };

    const addCommentItemPreview = (
      item: CommentItem,
      previewBounds: OverlayBounds[],
      previewElements: Element[],
      idPrefix: string,
    ) => {
      if (previewBounds.length === 0) return;

      for (const [index, bounds] of previewBounds.entries()) {
        const previewElement = previewElements[index];
        const boxId = `${idPrefix}-${item.id}-${index}`;
        // HACK: createdAt=0 is falsy, which skips the auto-fade logic in the overlay canvas animation loop
        actions.addGrabbedBox({
          id: boxId,
          bounds,
          createdAt: 0,
          element: previewElement,
        });

        let labelId: string | null = null;
        if (index === 0) {
          labelId = `${idPrefix}-label-${item.id}`;
          actions.addLabelInstance({
            id: labelId,
            bounds,
            tagName: item.tagName,
            componentName: item.componentName,
            elementsCount: item.elementsCount,
            status: "idle",
            isPromptMode: Boolean(item.commentText),
            inputValue: item.commentText ?? undefined,
            createdAt: 0,
            element: previewElement,
            mouseX: bounds.x + bounds.width / 2,
          });
        }

        commentsHoverPreviews.push({ boxId, labelId });
      }
    };

    const showCommentItemPreview = (
      item: CommentItem,
      idPrefix: string,
    ): void => {
      const connectedElements = getConnectedCommentElements(item);
      const previewBounds = connectedElements.map((element) =>
        createElementBounds(element),
      );
      addCommentItemPreview(item, previewBounds, connectedElements, idPrefix);
    };

    let commentsHoverOpenTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let commentsHoverCloseTimeoutId: ReturnType<typeof setTimeout> | null =
      null;

    const cancelCommentsHoverOpenTimeout = () => {
      if (commentsHoverOpenTimeoutId !== null) {
        clearTimeout(commentsHoverOpenTimeoutId);
        commentsHoverOpenTimeoutId = null;
      }
    };

    const cancelCommentsHoverCloseTimeout = () => {
      if (commentsHoverCloseTimeoutId !== null) {
        clearTimeout(commentsHoverCloseTimeoutId);
        commentsHoverCloseTimeoutId = null;
      }
    };

    const scheduleCommentsHoverClose = () => {
      commentsHoverCloseTimeoutId = setTimeout(() => {
        commentsHoverCloseTimeoutId = null;
        dismissCommentsDropdown();
      }, DROPDOWN_HOVER_OPEN_DELAY_MS);
    };

    const openCommentsDropdown = () => {
      actions.hideContextMenu();
      shared.dismissToolbarPopups?.();
      dismissClearPrompt();
      setCommentItems(loadComments());
      shared.openTrackedDropdown?.(setCommentsDropdownPosition);
    };

    const dismissCommentsDropdown = () => {
      cancelCommentsHoverOpenTimeout();
      cancelCommentsHoverCloseTimeout();
      shared.stopTrackingDropdownPosition?.();
      clearCommentsHoverPreviews();
      setCommentsDropdownPosition(null);
      setIsCommentsHoverOpen(false);
    };

    const showClearPrompt = () => {
      dismissCommentsDropdown();
      shared.dismissToolbarPopups?.();
      shared.openTrackedDropdown?.(setClearPromptPosition);
    };

    const dismissClearPrompt = () => {
      shared.stopTrackingDropdownPosition?.();
      setClearPromptPosition(null);
    };

    const handleToggleComments = () => {
      cancelCommentsHoverOpenTimeout();
      cancelCommentsHoverCloseTimeout();
      const isCurrentlyOpen = commentsDropdownPosition() !== null;
      if (isCurrentlyOpen) {
        if (isCommentsHoverOpen()) {
          clearCommentsHoverPreviews();
          setIsCommentsHoverOpen(false);
        } else {
          dismissCommentsDropdown();
        }
      } else {
        clearCommentsHoverPreviews();
        openCommentsDropdown();
      }
    };

    const copyCommentItemContent = (item: CommentItem) => {
      copyContent(item.content, {
        tagName: item.tagName,
        componentName: item.componentName ?? item.elementName,
        commentText: item.commentText,
      });
      const element = getFirstConnectedCommentElement(item);
      if (!element) return;

      shared.clearAllLabels?.();

      // HACK: defer to next frame so idle preview label clears visually before "copied" appears
      nativeRequestAnimationFrame(() => {
        if (!isElementConnected(element)) return;
        const bounds = createElementBounds(element);
        const labelId = shared.createLabelInstance?.(
          element,
          item.tagName,
          item.componentName,
          bounds.x + bounds.width / 2,
        );
        if (labelId) {
          shared.updateLabelAfterCopy?.(labelId, true);
        }
      });
    };

    const handleCommentItemSelect = (item: CommentItem) => {
      clearCommentsHoverPreviews();
      if (isPromptMode()) {
        actions.exitPromptMode();
        actions.clearInputText();
      }
      const element = getFirstConnectedCommentElement(item);

      if (item.commentText && element) {
        const { center } = getElementBoundsCenter(element);
        actions.enterPromptMode(center, element);
        actions.setInputText(item.commentText);
      } else {
        copyCommentItemContent(item);
      }
    };

    const handleCommentsCopyAll = () => {
      clearCommentsHoverPreviews();
      const currentCommentItems = commentItems();
      if (currentCommentItems.length === 0) return;

      const combinedContent = joinSnippets(
        currentCommentItems.map((commentItem) => commentItem.content),
      );

      const firstItem = currentCommentItems[0];
      copyContent(combinedContent, {
        componentName: firstItem.componentName ?? firstItem.tagName,
        entries: currentCommentItems.map((commentItem) => ({
          tagName: commentItem.tagName,
          componentName: commentItem.componentName ?? commentItem.elementName,
          content: commentItem.content,
          commentText: commentItem.commentText,
        })),
      });

      if (isClearConfirmed()) {
        handleCommentsClear();
      } else {
        showClearPrompt();
      }

      shared.clearAllLabels?.();

      // HACK: defer to next frame so idle preview labels clear visually before "copied" appears
      nativeRequestAnimationFrame(() => {
        batch(() => {
          for (const commentItem of currentCommentItems) {
            const connectedElements = getConnectedCommentElements(commentItem);
            for (const element of connectedElements) {
              const bounds = createElementBounds(element);
              const labelId = generateId("label");

              actions.addLabelInstance({
                id: labelId,
                bounds,
                tagName: commentItem.tagName,
                componentName: commentItem.componentName,
                status: "copied",
                createdAt: Date.now(),
                element,
                mouseX: bounds.x + bounds.width / 2,
              });
              // Schedule fade via shared (labels will auto-fade via copy-pipeline)
              shared.updateLabelAfterCopy?.(labelId, true);
            }
          }
        });
      });
    };

    const handleCommentItemHover = (commentItemId: string | null) => {
      clearCommentsHoverPreviews();
      if (!commentItemId) return;

      const item = commentItems().find(
        (innerItem) => innerItem.id === commentItemId,
      );
      if (!item) return;
      showCommentItemPreview(item, "comment-hover");
    };

    const handleCommentsButtonHover = (isHovered: boolean) => {
      cancelCommentsHoverOpenTimeout();
      clearCommentsHoverPreviews();
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
        if (
          commentsDropdownPosition() === null &&
          clearPromptPosition() === null
        ) {
          showAllCommentItemPreviews();
          commentsHoverOpenTimeoutId = setTimeout(() => {
            commentsHoverOpenTimeoutId = null;
            setIsCommentsHoverOpen(true);
            openCommentsDropdown();
          }, DROPDOWN_HOVER_OPEN_DELAY_MS);
        }
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const handleCommentsDropdownHover = (isHovered: boolean) => {
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const handleCommentsCopyAllHover = (isHovered: boolean) => {
      clearCommentsHoverPreviews();
      if (isHovered) {
        cancelCommentsHoverCloseTimeout();
        showAllCommentItemPreviews();
      } else if (isCommentsHoverOpen()) {
        scheduleCommentsHoverClose();
      }
    };

    const showAllCommentItemPreviews = () => {
      for (const item of commentItems()) {
        showCommentItemPreview(item, "comment-all-hover");
      }
    };

    const handleCommentsClear = () => {
      commentElementMap.clear();
      const updatedCommentItems = clearComments();
      setCommentItems(updatedCommentItems);
      dismissCommentsDropdown();
    };

    ctx.onKeyDown(handleUndoRedoKeys);

    shared.preparePromptMode = (position: Position, element: Element) => {
      preparePromptMode(element, position.x, position.y);
    };
    shared.activatePromptMode = activatePromptMode;
    shared.handleComment = handleComment;
    shared.enterCommentModeForElement = (element: Element) => {
      const { center } = getElementBoundsCenter(element);
      enterCommentModeForElement(element, center.x, center.y);
    };
    shared.handleInputSubmit = () => void handleInputSubmit();
    shared.handleInputCancel = handleInputCancel;
    shared.handleCopySuccessWithComments = handleCopySuccessWithComments;
    shared.setCopyStartPosition = (position: Position, element: Element) => {
      setCopyStartPosition(element, position.x, position.y);
    };
    shared.getAgentSessionCount = () => agentManager.sessions().size;
    shared.syncAgentFromRegistry = () => {
      const agentOpts = getAgentOptionsWithCallbacks();
      if (agentOpts) {
        agentManager._internal.setOptions(agentOpts);
      }
      const hasProvider = Boolean(agentOpts?.provider);
      actions.setHasAgentProvider(hasProvider);
      if (hasProvider && agentOpts?.provider) {
        const capturedProvider = agentOpts.provider;
        actions.setAgentCapabilities({
          supportsUndo: Boolean(capturedProvider.undo),
          supportsFollowUp: Boolean(capturedProvider.supportsFollowUp),
          dismissButtonText: capturedProvider.dismissButtonText,
          isAgentConnected: false,
        });
        if (capturedProvider.checkConnection) {
          capturedProvider
            .checkConnection()
            .then((isConnected) => {
              const currentAgentOpts = getAgentOptionsWithCallbacks();
              if (currentAgentOpts?.provider !== capturedProvider) return;
              actions.setAgentCapabilities({
                supportsUndo: Boolean(capturedProvider.undo),
                supportsFollowUp: Boolean(capturedProvider.supportsFollowUp),
                dismissButtonText: capturedProvider.dismissButtonText,
                isAgentConnected: isConnected,
              });
            })
            .catch((error) => {
              logRecoverableError("Agent connection check failed", error);
            });
        }
        agentManager.session.tryResume();
      } else {
        actions.setAgentCapabilities({
          supportsUndo: false,
          supportsFollowUp: false,
          dismissButtonText: undefined,
          isAgentConnected: false,
        });
      }
    };

    // Chain into dismissAllPopups so our popups are also dismissed
    const previousDismissAllPopups = shared.dismissAllPopups;
    shared.dismissAllPopups = () => {
      previousDismissAllPopups?.();
      dismissCommentsDropdown();
      dismissClearPrompt();
    };

    ctx.provide("inputValue", () => store.inputText);
    ctx.provide("isPromptMode", () => isPromptMode());
    ctx.provide("replyToPrompt", () => {
      const replySessionId = store.replySessionId;
      if (!replySessionId) return undefined;
      const session = agentManager.sessions().get(replySessionId);
      return session?.context?.prompt;
    });
    ctx.provide("hasAgent", () => store.hasAgentProvider);
    ctx.provide("agentSessions", () => agentManager.sessions());
    ctx.provide("supportsUndo", () => store.supportsUndo);
    ctx.provide("supportsFollowUp", () => store.supportsFollowUp);
    ctx.provide("dismissButtonText", () => store.dismissButtonText);
    ctx.provide("onDismissSession", () => agentManager.session.dismiss);
    ctx.provide("onUndoSession", () => agentManager.session.undo);
    ctx.provide("onFollowUpSubmitSession", () => handleFollowUpSubmit);
    ctx.provide("onAcknowledgeSessionError", () => handleAcknowledgeError);
    ctx.provide("onRetrySession", () => agentManager.session.retry);
    ctx.provide(
      "onRequestAbortSession",
      () => (sessionId: string) => actions.setPendingAbortSessionId(sessionId),
    );
    ctx.provide("onAbortSession", () => handleAgentAbort);
    ctx.provide("pendingAbortSessionId", () => store.pendingAbortSessionId);
    ctx.provide("onInputChange", () => actions.setInputText);
    ctx.provide("onInputSubmit", () => () => void handleInputSubmit());
    ctx.provide("onToggleExpand", () => handleToggleExpand);
    ctx.provide("isPendingDismiss", () => isPendingDismiss());
    ctx.provide("selectionLabelShakeCount", () => selectionLabelShakeCount());
    ctx.provide("onConfirmDismiss", () => handleConfirmDismiss);
    ctx.provide("onCancelDismiss", () => handleCancelDismiss);
    ctx.provide("commentItems", () => commentItems());
    ctx.provide("commentsDisconnectedItemIds", () =>
      commentsDisconnectedItemIds(),
    );
    ctx.provide("commentItemCount", () => commentItems().length);
    ctx.provide("clockFlashTrigger", () => clockFlashTrigger());
    ctx.provide("commentsDropdownPosition", () => commentsDropdownPosition());
    ctx.provide(
      "isCommentsPinned",
      () => commentsDropdownPosition() !== null && !isCommentsHoverOpen(),
    );
    ctx.provide("onToggleComments", () => handleToggleComments);
    ctx.provide("onCopyAll", () => handleCommentsCopyAll);
    ctx.provide("onCopyAllHover", () => handleCommentsCopyAllHover);
    ctx.provide("onCommentsButtonHover", () => handleCommentsButtonHover);
    ctx.provide("onCommentItemSelect", () => handleCommentItemSelect);
    ctx.provide("onCommentItemHover", () => handleCommentItemHover);
    ctx.provide("onCommentsCopyAll", () => handleCommentsCopyAll);
    ctx.provide("onCommentsCopyAllHover", () => handleCommentsCopyAllHover);
    ctx.provide("onCommentsClear", () => handleCommentsClear);
    ctx.provide("onCommentsDismiss", () => dismissCommentsDropdown);
    ctx.provide("onCommentsDropdownHover", () => handleCommentsDropdownHover);
    ctx.provide("clearPromptPosition", () => clearPromptPosition());
    ctx.provide("onClearCommentsConfirm", () => () => {
      confirmClear();
      dismissClearPrompt();
      handleCommentsClear();
    });
    ctx.provide("onClearCommentsCancel", () => dismissClearPrompt);

    return () => {
      cancelCommentsHoverOpenTimeout();
      cancelCommentsHoverCloseTimeout();
      clearCommentsHoverPreviews();
      commentElementMap.clear();
    };
  },
};
