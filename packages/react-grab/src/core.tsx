// @ts-expect-error - CSS imported as text via tsup loader
import cssText from "../dist/styles.css";
import {
  createSignal,
  createMemo,
  createRoot,
  onCleanup,
  createEffect,
  on,
} from "solid-js";
import { render } from "solid-js/web";
import { isKeyboardEventTriggeredByInput } from "./utils/is-keyboard-event-triggered-by-input.js";
import { isSelectionInsideEditableElement } from "./utils/is-selection-inside-editable-element.js";
import { mountRoot } from "./utils/mount-root.js";
import { ReactGrabRenderer } from "./components/renderer.js";
import {
  getStack,
  formatStack,
  getHTMLPreview,
  getFileName,
} from "./instrumentation.js";
import { isInstrumentationActive } from "bippy";
import { isSourceFile, normalizeFileName } from "bippy/source";
import { copyContent } from "./utils/copy-content.js";
import { getElementAtPosition } from "./utils/get-element-at-position.js";
import { isValidGrabbableElement } from "./utils/is-valid-grabbable-element.js";
import {
  getElementsInDrag,
  getElementsInDragLoose,
} from "./utils/get-elements-in-drag.js";
import { createElementBounds } from "./utils/create-element-bounds.js";
import { stripTranslateFromTransform } from "./utils/strip-translate-from-transform.js";
import {
  SUCCESS_LABEL_DURATION_MS,
  PROGRESS_INDICATOR_DELAY_MS,
  OFFSCREEN_POSITION,
  DRAG_THRESHOLD_PX,
  Z_INDEX_LABEL,
  AUTO_SCROLL_EDGE_THRESHOLD_PX,
  AUTO_SCROLL_SPEED_PX,
  LOGO_SVG,
  MODIFIER_KEYS,
  BLUR_DEACTIVATION_THRESHOLD_MS,
} from "./constants.js";
import { isCLikeKey } from "./utils/is-c-like-key.js";
import { keyMatchesCode, isTargetKeyCombination } from "./utils/hotkey.js";
import { isEventFromOverlay } from "./utils/is-event-from-overlay.js";
import { buildOpenFileUrl } from "./utils/build-open-file-url.js";
import type {
  Options,
  OverlayBounds,
  GrabbedBox,
  ReactGrabAPI,
  ReactGrabState,
  DeepPartial,
  Theme,
  SuccessLabelType,
  AgentSession,
} from "./types.js";
import { getNearestComponentName } from "./instrumentation.js";
import { mergeTheme, deepMergeTheme } from "./theme.js";
import { generateSnippet } from "./utils/generate-snippet.js";
import {
  createSession,
  saveSessionById,
  loadSessions,
  clearSessions,
  clearSessionById,
  updateSession,
} from "./utils/agent-session.js";

let hasInited = false;

const getScriptOptions = (): Partial<Options> | null => {
  if (typeof window === "undefined") return null;
  try {
    const dataOptions = document.currentScript?.getAttribute("data-options");
    if (!dataOptions) return null;
    return JSON.parse(dataOptions) as Partial<Options>;
  } catch {
    return null;
  }
};

export const init = (rawOptions?: Options): ReactGrabAPI => {
  const scriptOptions = getScriptOptions();

  const options = {
    enabled: true,
    keyHoldDuration: 200,
    allowActivationInsideInput: true,
    ...scriptOptions,
    ...rawOptions,
  };

  const initialTheme = mergeTheme(options.theme);

  if (options.enabled === false || hasInited) {
    return {
      activate: () => {},
      deactivate: () => {},
      toggle: () => {},
      isActive: () => false,
      dispose: () => {},
      copyElement: () => Promise.resolve(false),
      getState: () => ({
        isActive: false,
        isDragging: false,
        isCopying: false,
        isInputMode: false,
        targetElement: null,
        dragBounds: null,
      }),
      updateTheme: () => {},
      getTheme: () => initialTheme,
    };
  }
  hasInited = true;

  const logIntro = () => {
    try {
      const version = process.env.VERSION;
      const logoDataUri = `data:image/svg+xml;base64,${btoa(LOGO_SVG)}`;
      console.log(
        `%cReact Grab${version ? ` v${version}` : ""}%c\nhttps://react-grab.com`,
        `background: #330039; color: #ffffff; border: 1px solid #d75fcb; padding: 4px 4px 4px 24px; border-radius: 4px; background-image: url("${logoDataUri}"); background-size: 16px 16px; background-repeat: no-repeat; background-position: 4px center; display: inline-block; margin-bottom: 4px;`,
        "",
      );
      if (navigator.onLine && version) {
        fetch(`https://www.react-grab.com/api/version?t=${Date.now()}`, {
          referrerPolicy: "origin",
          keepalive: true,
          priority: "low",
          cache: "no-store",
        })
          .then((res) => res.text())
          .then((latestVersion) => {
            if (latestVersion && latestVersion !== version) {
              console.warn(
                `[React Grab] v${version} is outdated (latest: v${latestVersion})`,
              );
            }
          })
          .catch(() => null);
      }
    } catch {}
  };

  logIntro();

  return createRoot((dispose) => {
    const [theme, setTheme] = createSignal(initialTheme);
    const [isHoldingKeys, setIsHoldingKeys] = createSignal(false);
    const [mouseX, setMouseX] = createSignal(OFFSCREEN_POSITION);
    const [mouseY, setMouseY] = createSignal(OFFSCREEN_POSITION);
    const [isDragging, setIsDragging] = createSignal(false);
    const [dragStartX, setDragStartX] = createSignal(OFFSCREEN_POSITION);
    const [dragStartY, setDragStartY] = createSignal(OFFSCREEN_POSITION);
    const [isCopying, setIsCopying] = createSignal(false);
    const [lastGrabbedElement, setLastGrabbedElement] =
      createSignal<Element | null>(null);
    const [progressStartTime, setProgressStartTime] = createSignal<
      number | null
    >(null);
    const [progress, setProgress] = createSignal(0);
    const [grabbedBoxes, setGrabbedBoxes] = createSignal<GrabbedBox[]>([]);
    const [successLabels, setSuccessLabels] = createSignal<
      Array<{ id: string; text: string }>
    >([]);
    const [isActivated, setIsActivated] = createSignal(false);
    const [isToggleMode, setIsToggleMode] = createSignal(false);
    const [showProgressIndicator, setShowProgressIndicator] =
      createSignal(false);
    const [didJustDrag, setDidJustDrag] = createSignal(false);
    const [copyStartX, setCopyStartX] = createSignal(OFFSCREEN_POSITION);
    const [copyStartY, setCopyStartY] = createSignal(OFFSCREEN_POSITION);
    const [viewportVersion, setViewportVersion] = createSignal(0);
    const [isInputMode, setIsInputMode] = createSignal(false);
    const [inputText, setInputText] = createSignal("");
    const [isTouchMode, setIsTouchMode] = createSignal(false);
    const [selectionFilePath, setSelectionFilePath] = createSignal<string | undefined>(undefined);
    const [selectionLineNumber, setSelectionLineNumber] = createSignal<number | undefined>(undefined);
    const [isToggleFrozen, setIsToggleFrozen] = createSignal(false);
    const [isInputExpanded, setIsInputExpanded] = createSignal(false);
    const [hasCompletedFirstGrab, setHasCompletedFirstGrab] = createSignal(
      typeof localStorage !== "undefined" &&
        localStorage.getItem("react-grab:dismiss-hint") === "true",
    );
    const [agentSessions, setAgentSessions] = createSignal<Map<string, AgentSession>>(new Map());
    const [inputOverlayMode, setInputOverlayMode] = createSignal<"input" | "output">("input");

    const [nativeSelectionCursorX, setNativeSelectionCursorX] = createSignal(OFFSCREEN_POSITION);
    const [nativeSelectionCursorY, setNativeSelectionCursorY] = createSignal(OFFSCREEN_POSITION);
    const [hasNativeSelection, setHasNativeSelection] = createSignal(false);
    const [nativeSelectionElements, setNativeSelectionElements] = createSignal<Element[]>([]);
    const [nativeSelectionTagName, setNativeSelectionTagName] = createSignal<string | undefined>(undefined);
    const [nativeSelectionComponentName, setNativeSelectionComponentName] = createSignal<string | undefined>(undefined);
    const nativeSelectionBounds = createMemo((): OverlayBounds | undefined => {
      viewportVersion();
      const elements = nativeSelectionElements();
      if (elements.length === 0 || !elements[0]) return undefined;
      return createElementBounds(elements[0]);
    });

    let holdTimerId: number | null = null;
    let activationTimestamp: number | null = null;
    const agentAbortControllers = new Map<string, AbortController>();
    const agentSessionElements = new Map<string, Element>();

    const isAgentProcessing = createMemo(() => agentSessions().size > 0);

    const tryResumeAgentSessions = () => {
      const storage = options.agent?.storage;
      const existingSessions = loadSessions(storage);

      const streamingSessions = Array.from(existingSessions.values()).filter((session) => session.isStreaming);
      if (streamingSessions.length === 0) {
        return;
      }
      if (!options.agent?.provider?.supportsResume || !options.agent.provider.resume) {
        clearSessions(storage);
        return;
      }

      setAgentSessions(new Map(existingSessions));
      activateRenderer();

      for (const existingSession of streamingSessions) {
        const sessionWithResumeStatus = {
          ...existingSession,
          lastStatus: existingSession.lastStatus || "Resuming...",
          position: existingSession.position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        };
        setAgentSessions((prev) => new Map(prev).set(existingSession.id, sessionWithResumeStatus));
        options.agent?.onResume?.(sessionWithResumeStatus);

        const abortController = new AbortController();
        agentAbortControllers.set(existingSession.id, abortController);

        void (async () => {
          try {
            for await (const status of options.agent!.provider!.resume!(existingSession.id, abortController.signal)) {
              const currentSessions = agentSessions();
              const currentSession = currentSessions.get(existingSession.id);
              if (!currentSession) break;

              const updatedSession = updateSession(currentSession, { lastStatus: status }, storage);
              setAgentSessions((prev) => new Map(prev).set(existingSession.id, updatedSession));
              options.agent?.onStatus?.(status, updatedSession);
            }

            const finalSessions = agentSessions();
            const finalSession = finalSessions.get(existingSession.id);
            if (finalSession) {
              const completedSession = updateSession(finalSession, { isStreaming: false }, storage);
              setAgentSessions((prev) => new Map(prev).set(existingSession.id, completedSession));
              options.agent?.onComplete?.(completedSession);
            }
          } catch (error) {
            const currentSessions = agentSessions();
            const currentSession = currentSessions.get(existingSession.id);
            if (currentSession && error instanceof Error && error.name !== "AbortError") {
              const errorSession = updateSession(currentSession, { isStreaming: false }, storage);
              setAgentSessions((prev) => new Map(prev).set(existingSession.id, errorSession));
              options.agent?.onError?.(error, errorSession);
            }
          } finally {
            agentAbortControllers.delete(existingSession.id);
            agentSessionElements.delete(existingSession.id);
            clearSessionById(existingSession.id, storage);
            setAgentSessions((prev) => {
              const next = new Map(prev);
              next.delete(existingSession.id);
              return next;
            });
          }
        })();
      }
    };
    let progressAnimationId: number | null = null;
    let progressDelayTimerId: number | null = null;
    let keydownSpamTimerId: number | null = null;
    let autoScrollAnimationId: number | null = null;
    let previouslyFocusedElement: Element | null = null;

    const isRendererActive = createMemo(() => isActivated() && !isCopying());

    const hasValidMousePosition = createMemo(
      () => mouseX() > OFFSCREEN_POSITION && mouseY() > OFFSCREEN_POSITION,
    );

    const getAutoScrollDirection = (clientX: number, clientY: number) => {
      return {
        top: clientY < AUTO_SCROLL_EDGE_THRESHOLD_PX,
        bottom: clientY > window.innerHeight - AUTO_SCROLL_EDGE_THRESHOLD_PX,
        left: clientX < AUTO_SCROLL_EDGE_THRESHOLD_PX,
        right: clientX > window.innerWidth - AUTO_SCROLL_EDGE_THRESHOLD_PX,
      };
    };

    const showTemporaryGrabbedBox = (
      bounds: OverlayBounds,
      element: Element,
    ) => {
      const boxId = `grabbed-${Date.now()}-${Math.random()}`;
      const createdAt = Date.now();
      const newBox: GrabbedBox = { id: boxId, bounds, createdAt, element };
      const currentBoxes: GrabbedBox[] = grabbedBoxes();
      setGrabbedBoxes([...currentBoxes, newBox]);

      options.onGrabbedBox?.(bounds, element);

      if (!hasCompletedFirstGrab()) {
        setHasCompletedFirstGrab(true);
        try {
          localStorage.setItem("react-grab:dismiss-hint", "true");
        } catch {}
      }

      setTimeout(() => {
        setGrabbedBoxes((previousBoxes) =>
          previousBoxes.filter((box) => box.id !== boxId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const showTemporarySuccessLabel = (text: string, type: SuccessLabelType) => {
      const labelId = `success-${Date.now()}-${Math.random()}`;
      setSuccessLabels((previousLabels) => [
        ...previousLabels,
        { id: labelId, text },
      ]);

      options.onSuccessLabel?.(text, type, { x: mouseX(), y: mouseY() });

      setTimeout(() => {
        setSuccessLabels((previousLabels) =>
          previousLabels.filter((label) => label.id !== labelId),
        );
      }, SUCCESS_LABEL_DURATION_MS);
    };

    const wrapInSelectedElementTags = (context: string) =>
      `<selected_element>\n${context}\n</selected_element>`;

    const extractElementTagName = (element: Element) =>
      (element.tagName || "").toLowerCase();

    const extractElementTagNameForSuccess = (element: Element) => {
      const tagName = extractElementTagName(element);
      return tagName ? `<${tagName}>` : "1 element";
    };

    const notifyElementsSelected = (elements: Element[]) => {
      const elementsPayload = elements.map((element) => ({
        tagName: extractElementTagName(element),
      }));

      window.dispatchEvent(
        new CustomEvent("react-grab:element-selected", {
          detail: {
            elements: elementsPayload,
          },
        }),
      );
    };

    const executeCopyOperation = async (
      positionX: number,
      positionY: number,
      operation: () => Promise<void>,
    ) => {
      setCopyStartX(positionX);
      setCopyStartY(positionY);
      setIsCopying(true);
      startProgressAnimation();
      await operation().finally(() => {
        setIsCopying(false);
        stopProgressAnimation();

        if (isToggleMode()) {
          deactivateRenderer();
        }
      });
    };

    const hasInnerText = (
      element: Element,
    ): element is Element & { innerText: string } => "innerText" in element;

    const extractElementTextContent = (element: Element): string => {
      if (hasInnerText(element)) {
        return element.innerText;
      }

      return element.textContent ?? "";
    };

    const createCombinedTextContent = (elements: Element[]): string =>
      elements
        .map((element) => extractElementTextContent(element).trim())
        .filter((textContent) => textContent.length > 0)
        .join("\n\n");

    const tryCopyWithFallback = async (
      elements: Element[],
      extraPrompt?: string,
    ): Promise<boolean> => {
      let didCopy = false;
      let copiedContent = "";
      const isReactProject = isInstrumentationActive();

      await options.onBeforeCopy?.(elements);

      if (options.copyFileOnly && isReactProject) {
        try {
          const firstElement = elements[0];
          if (firstElement) {
            const stack = await getStack(firstElement);
            const fileName = getFileName(stack);
            if (fileName) {
              copiedContent = `@${fileName}`;
              didCopy = await copyContent(copiedContent);
              if (didCopy) {
                options.onCopySuccess?.(elements, copiedContent);
              }
            }
          }
        } catch (error) {
          options.onCopyError?.(error as Error);
        }

        options.onAfterCopy?.(elements, didCopy);

        return didCopy;
      }

      try {
        const elementSnippetResults = await Promise.allSettled(
          elements.map(async (element) => {
            const htmlPreview = getHTMLPreview(element);

            if (!isReactProject) {
              return `## HTML Frame:\n${htmlPreview}`;
            }

            const stack = await getStack(element);
            const formattedStack = formatStack(stack);

            if (formattedStack) {
              return `## HTML Frame:\n${htmlPreview}\n\n## Code Location:\n${formattedStack}`;
            }

            return `## HTML Frame:\n${htmlPreview}`;
          }),
        );

        const elementSnippets = elementSnippetResults
          .map((result) => (result.status === "fulfilled" ? result.value : ""))
          .filter((snippet) => snippet.trim());

        if (elementSnippets.length > 0) {
          const wrappedSnippets = elementSnippets
            .map((snippet) => wrapInSelectedElementTags(snippet))
            .join("\n\n");

          const plainTextContent = extraPrompt
            ? `${extraPrompt}\n\n${wrappedSnippets}`
            : wrappedSnippets;

          copiedContent = plainTextContent;
          didCopy = await copyContent(plainTextContent);
        }

        if (!didCopy) {
          const plainTextContentOnly = createCombinedTextContent(elements);
          if (plainTextContentOnly.length > 0) {
            const contentWithPrompt = extraPrompt
              ? `${extraPrompt}\n\n${plainTextContentOnly}`
              : plainTextContentOnly;

            copiedContent = contentWithPrompt;
            didCopy = await copyContent(contentWithPrompt);
          }
        }

        if (didCopy) {
          options.onCopySuccess?.(elements, copiedContent);
        }
      } catch (error) {
        options.onCopyError?.(error as Error);

        const plainTextContentOnly = createCombinedTextContent(elements);
        if (plainTextContentOnly.length > 0) {
          const contentWithPrompt = extraPrompt
            ? `${extraPrompt}\n\n${plainTextContentOnly}`
            : plainTextContentOnly;

          copiedContent = contentWithPrompt;
          didCopy = await copyContent(contentWithPrompt);
        }
      }

      options.onAfterCopy?.(elements, didCopy);

      return didCopy;
    };

    const copySingleElementToClipboard = async (
      targetElement: Element,
      extraPrompt?: string,
    ) => {
      const successLabelType: SuccessLabelType = extraPrompt ? "input-submit" : "copy";

      options.onElementSelect?.(targetElement);

      if (theme().grabbedBoxes.enabled) {
        showTemporaryGrabbedBox(
          createElementBounds(targetElement),
          targetElement,
        );
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const didCopy = await tryCopyWithFallback([targetElement], extraPrompt);

      if (didCopy && theme().successLabels.enabled) {
        showTemporarySuccessLabel(
          extractElementTagNameForSuccess(targetElement),
          successLabelType,
        );
      }

      notifyElementsSelected([targetElement]);
    };

    const copyMultipleElementsToClipboard = async (
      targetElements: Element[],
    ) => {
      if (targetElements.length === 0) return;

      for (const element of targetElements) {
        options.onElementSelect?.(element);
      }

      if (theme().grabbedBoxes.enabled) {
        for (const element of targetElements) {
          showTemporaryGrabbedBox(createElementBounds(element), element);
        }
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const didCopy = await tryCopyWithFallback(targetElements);

      if (didCopy && theme().successLabels.enabled) {
        showTemporarySuccessLabel(`${targetElements.length} elements`, "copy");
      }

      notifyElementsSelected(targetElements);
    };

    const targetElement = createMemo(() => {
      if (!isRendererActive() || isDragging()) return null;
      return getElementAtPosition(mouseX(), mouseY());
    });

    const selectionBounds = createMemo((): OverlayBounds | undefined => {
      viewportVersion();
      const element = targetElement();
      if (!element) return undefined;

      const elementBounds = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);

      return {
        borderRadius: computedStyle.borderRadius || "0px",
        height: elementBounds.height,
        transform: stripTranslateFromTransform(element),
        width: elementBounds.width,
        x: elementBounds.left,
        y: elementBounds.top,
      };
    });

    const calculateDragDistance = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      return {
        x: Math.abs(endPageX - dragStartX()),
        y: Math.abs(endPageY - dragStartY()),
      };
    };

    const isDraggingBeyondThreshold = createMemo(() => {
      if (!isDragging()) return false;

      const dragDistance = calculateDragDistance(mouseX(), mouseY());

      return (
        dragDistance.x > DRAG_THRESHOLD_PX || dragDistance.y > DRAG_THRESHOLD_PX
      );
    });

    const calculateDragRectangle = (endX: number, endY: number) => {
      const endPageX = endX + window.scrollX;
      const endPageY = endY + window.scrollY;

      const dragPageX = Math.min(dragStartX(), endPageX);
      const dragPageY = Math.min(dragStartY(), endPageY);
      const dragWidth = Math.abs(endPageX - dragStartX());
      const dragHeight = Math.abs(endPageY - dragStartY());

      return {
        x: dragPageX - window.scrollX,
        y: dragPageY - window.scrollY,
        width: dragWidth,
        height: dragHeight,
      };
    };

    const dragBounds = createMemo((): OverlayBounds | undefined => {
      if (!isDraggingBeyondThreshold()) return undefined;

      const drag = calculateDragRectangle(mouseX(), mouseY());

      return {
        borderRadius: "0px",
        height: drag.height,
        transform: "none",
        width: drag.width,
        x: drag.x,
        y: drag.y,
      };
    });

    const labelContent = createMemo(() => {
      const element = targetElement();
      const copying = isCopying();

      if (!element) {
        return (
          <span class="tabular-nums align-middle">
            {copying ? "Please wait…" : "1 element"}
          </span>
        );
      }

      const tagName = extractElementTagName(element);
      const componentName = getNearestComponentName(element);

      if (tagName && componentName) {
        return (
          <>
            <span class="font-mono tabular-nums align-middle">
              {"<"}
              {tagName}
              {">"}
            </span>
            <span class="tabular-nums ml-1 align-middle">
              {" in "}
              {componentName}
            </span>
          </>
        );
      }

      if (tagName) {
        return (
          <span class="font-mono tabular-nums align-middle">
            {"<"}
            {tagName}
            {">"}
          </span>
        );
      }

      return (
        <span class="tabular-nums align-middle">
          {copying ? "Please wait…" : "1 element"}
        </span>
      );
    });

    const labelPosition = createMemo(() => {
      return isCopying()
        ? { x: copyStartX(), y: copyStartY() }
        : { x: mouseX(), y: mouseY() };
    });

    const progressPosition = createMemo(() =>
      isCopying()
        ? { x: copyStartX(), y: copyStartY() }
        : { x: mouseX(), y: mouseY() },
    );

    createEffect(
      on(
        () => [targetElement(), lastGrabbedElement()] as const,
        ([currentElement, lastElement]) => {
          if (lastElement && currentElement && lastElement !== currentElement) {
            setLastGrabbedElement(null);
          }
          if (currentElement) {
            options.onElementHover?.(currentElement);
          }
        },
      ),
    );

    createEffect(
      on(
        () => targetElement(),
        (element) => {
          const clearSource = () => {
            setSelectionFilePath(undefined);
            setSelectionLineNumber(undefined);
          };

          if (!element) {
            clearSource();
            return;
          }

          getStack(element)
            .then((stack) => {
              for (const frame of stack) {
                if (frame.source && isSourceFile(frame.source.fileName)) {
                  setSelectionFilePath(normalizeFileName(frame.source.fileName));
                  setSelectionLineNumber(frame.source.lineNumber);
                  return;
                }
              }
              clearSource();
            })
            .catch(clearSource);
        },
      ),
    );

    createEffect(
      on(
        () => viewportVersion(),
        () => {
          const currentBoxes = grabbedBoxes();
          if (currentBoxes.length === 0) return;

          const updatedBoxes = currentBoxes.map((box) => ({
            ...box,
            bounds: createElementBounds(box.element),
          }));

          setGrabbedBoxes(updatedBoxes);
        },
      ),
    );

    createEffect(
      on(
        () => viewportVersion(),
        () => {
          const sessions = agentSessions();
          if (sessions.size === 0) return;

          const updatedSessions = new Map(sessions);
          let didUpdate = false;

          for (const [sessionId, session] of sessions) {
            const element = agentSessionElements.get(sessionId);
            if (element && document.contains(element)) {
              const newBounds = createElementBounds(element);
              if (newBounds) {
                updatedSessions.set(sessionId, { ...session, selectionBounds: newBounds });
                didUpdate = true;
              }
            }
          }

          if (didUpdate) {
            setAgentSessions(updatedSessions);
          }
        },
      ),
    );

    createEffect(
      on(
        () =>
          [
            isActivated(),
            isDragging(),
            isCopying(),
            isInputMode(),
            targetElement(),
            dragBounds(),
          ] as const,
        ([active, dragging, copying, inputMode, target, drag]) => {
          options.onStateChange?.({
            isActive: active,
            isDragging: dragging,
            isCopying: copying,
            isInputMode: inputMode,
            targetElement: target,
            dragBounds: drag
              ? {
                  x: drag.x,
                  y: drag.y,
                  width: drag.width,
                  height: drag.height,
                }
              : null,
          });
        },
      ),
    );

    createEffect(
      on(
        () => [isInputMode(), mouseX(), mouseY(), targetElement()] as const,
        ([inputMode, x, y, target]) => {
          options.onInputModeChange?.(inputMode, { x, y, targetElement: target });
        },
      ),
    );

    createEffect(
      on(
        () => [selectionVisible(), selectionBounds(), targetElement()] as const,
        ([visible, bounds, element]) => {
          options.onSelectionBox?.(Boolean(visible), bounds ?? null, element);
        },
      ),
    );

    createEffect(
      on(
        () => [dragVisible(), dragBounds()] as const,
        ([visible, bounds]) => {
          options.onDragBox?.(Boolean(visible), bounds ?? null);
        },
      ),
    );

    createEffect(
      on(
        () => [crosshairVisible(), mouseX(), mouseY()] as const,
        ([visible, x, y]) => {
          options.onCrosshair?.(Boolean(visible), { x, y });
        },
      ),
    );

    createEffect(
      on(
        () =>
          [labelVisible(), labelVariant(), labelContent(), labelPosition()] as const,
        ([visible, variant, content, position]) => {
          const contentString =
            typeof content === "string" ? content : "";
          options.onElementLabel?.(Boolean(visible), variant, {
            x: position.x,
            y: position.y,
            content: contentString,
          });
        },
      ),
    );

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
        () =>
          [isActivated(), isCopying(), isDragging(), isInputMode(), targetElement()] as const,
        ([activated, copying, dragging, inputMode, target]) => {
          if (copying) {
            setCursorOverride("progress");
          } else if (inputMode) {
            setCursorOverride(null);
          } else if (activated && dragging) {
            setCursorOverride("crosshair");
          } else if (activated && target) {
            setCursorOverride("copy");
          } else if (activated) {
            setCursorOverride("crosshair");
          } else {
            setCursorOverride(null);
          }
        },
      ),
    );

    const startProgressAnimation = (duration?: number) => {
      const startTime = Date.now();
      const animationDuration = duration ?? options.keyHoldDuration;
      setProgressStartTime(startTime);
      setShowProgressIndicator(false);

      progressDelayTimerId = window.setTimeout(() => {
        setShowProgressIndicator(true);
        progressDelayTimerId = null;
      }, PROGRESS_INDICATOR_DELAY_MS);

      const animateProgress = () => {
        const currentStartTime = progressStartTime();
        if (currentStartTime === null) return;

        const elapsedTime = Date.now() - currentStartTime;
        const normalizedTime = elapsedTime / animationDuration;
        const easedProgress = 1 - Math.exp(-normalizedTime);
        const maxProgressBeforeCompletion = 0.95;

        const currentProgress = isCopying()
          ? Math.min(easedProgress, maxProgressBeforeCompletion)
          : 1;

        setProgress(currentProgress);

        if (currentProgress < 1) {
          progressAnimationId = requestAnimationFrame(animateProgress);
        }
      };

      animateProgress();
    };

    const stopProgressAnimation = () => {
      if (progressAnimationId !== null) {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
      }
      if (progressDelayTimerId !== null) {
        window.clearTimeout(progressDelayTimerId);
        progressDelayTimerId = null;
      }
      setProgressStartTime(null);
      setProgress(1);
      setShowProgressIndicator(false);
    };

    const startAutoScroll = () => {
      const scroll = () => {
        if (!isDragging()) {
          stopAutoScroll();
          return;
        }

        const direction = getAutoScrollDirection(mouseX(), mouseY());

        if (direction.top) window.scrollBy(0, -AUTO_SCROLL_SPEED_PX);
        if (direction.bottom) window.scrollBy(0, AUTO_SCROLL_SPEED_PX);
        if (direction.left) window.scrollBy(-AUTO_SCROLL_SPEED_PX, 0);
        if (direction.right) window.scrollBy(AUTO_SCROLL_SPEED_PX, 0);

        if (
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right
        ) {
          autoScrollAnimationId = requestAnimationFrame(scroll);
        } else {
          autoScrollAnimationId = null;
        }
      };

      scroll();
    };

    const stopAutoScroll = () => {
      if (autoScrollAnimationId !== null) {
        cancelAnimationFrame(autoScrollAnimationId);
        autoScrollAnimationId = null;
      }
    };

    const activateRenderer = () => {
      stopProgressAnimation();
      previouslyFocusedElement = document.activeElement;
      activationTimestamp = Date.now();
      setIsActivated(true);
      options.onActivate?.();
    };

    const deactivateRenderer = () => {
      setIsToggleMode(false);
      setIsHoldingKeys(false);
      setIsActivated(false);
      setIsInputMode(false);
      setInputText("");
      setIsToggleFrozen(false);
      setIsInputExpanded(false);
      setInputOverlayMode("input");
      if (isDragging()) {
        setIsDragging(false);
        document.body.style.userSelect = "";
      }
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      stopAutoScroll();
      stopProgressAnimation();
      activationTimestamp = null;
      if (
        previouslyFocusedElement instanceof HTMLElement &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }
      previouslyFocusedElement = null;
      options.onDeactivate?.();
    };

    const handleInputChange = (value: string) => {
      setInputText(value);
    };

    const handleInputSubmit = async () => {
      if (!isInputMode()) return;

      const element = targetElement();
      const prompt = inputText().trim();
      const bounds = selectionBounds();

      const currentX = bounds ? bounds.x + bounds.width / 2 : mouseX();
      const currentY = bounds ? bounds.y + bounds.height / 2 : mouseY();

      setMouseX(currentX);
      setMouseY(currentY);

      if (options.agent?.provider && element) {
        const positionX = mouseX();
        const positionY = mouseY();

        setInputText("");
        setIsInputMode(false);

        const elements = [element];
        const content = await generateSnippet(elements);
        const context = { content, prompt };
        const storage = options.agent.storage;

        const session = createSession(context, { x: positionX, y: positionY }, bounds ?? undefined);
        session.lastStatus = "Please wait…";
        agentSessionElements.set(session.id, element);
        setAgentSessions((prev) => new Map(prev).set(session.id, session));
        saveSessionById(session, storage);
        options.agent.onStart?.(session);

        const abortController = new AbortController();
        agentAbortControllers.set(session.id, abortController);

        deactivateRenderer();

        void (async () => {
          try {
            for await (const status of options.agent!.provider!.send(context, abortController.signal)) {
              const currentSessions = agentSessions();
              const currentSession = currentSessions.get(session.id);
              if (!currentSession) break;

              const updatedSession = updateSession(currentSession, { lastStatus: status }, storage);
              setAgentSessions((prev) => new Map(prev).set(session.id, updatedSession));
              options.agent?.onStatus?.(status, updatedSession);
            }

            const finalSessions = agentSessions();
            const finalSession = finalSessions.get(session.id);
            if (finalSession) {
              const completedSession = updateSession(finalSession, { isStreaming: false }, storage);
              setAgentSessions((prev) => new Map(prev).set(session.id, completedSession));
              options.agent?.onComplete?.(completedSession);
            }
          } catch (error) {
            const currentSessions = agentSessions();
            const currentSession = currentSessions.get(session.id);
            if (currentSession && error instanceof Error && error.name !== "AbortError") {
              const errorSession = updateSession(currentSession, { isStreaming: false }, storage);
              setAgentSessions((prev) => new Map(prev).set(session.id, errorSession));
              options.agent?.onError?.(error, errorSession);
            }
          } finally {
            agentAbortControllers.delete(session.id);
            agentSessionElements.delete(session.id);
            clearSessionById(session.id, storage);
            setAgentSessions((prev) => {
              const next = new Map(prev);
              next.delete(session.id);
              return next;
            });
          }
        })();

        return;
      }

      setIsInputMode(false);
      setInputText("");

      if (element) {
        void executeCopyOperation(currentX, currentY, () =>
          copySingleElementToClipboard(element, prompt || undefined),
        ).then(() => {
          deactivateRenderer();
        });
      } else {
        deactivateRenderer();
      }
    };

    const handleInputCancel = () => {
      if (!isInputMode()) return;

      deactivateRenderer();
    };

    const handleToggleExpand = () => {
      setIsToggleMode(true);
      setIsToggleFrozen(true);
      setIsInputExpanded(true);
      setIsInputMode(true);
    };

    const handleCopyClick = () => {
      const element = targetElement();
      const currentX = mouseX();
      const currentY = mouseY();

      if (element) {
        void executeCopyOperation(currentX, currentY, () =>
          copySingleElementToClipboard(element),
        ).then(() => {
          deactivateRenderer();
        });
      } else {
        deactivateRenderer();
      }
    };

    const handleNativeSelectionCopy = async () => {
      const elements = nativeSelectionElements();
      if (elements.length === 0) return;

      const currentX = nativeSelectionCursorX();
      const currentY = nativeSelectionCursorY();

      setHasNativeSelection(false);
      setNativeSelectionCursorX(OFFSCREEN_POSITION);
      setNativeSelectionCursorY(OFFSCREEN_POSITION);
      setNativeSelectionElements([]);
      setNativeSelectionTagName(undefined);
      setNativeSelectionComponentName(undefined);

      window.getSelection()?.removeAllRanges();

      if (elements.length === 1) {
        await executeCopyOperation(currentX, currentY, () =>
          copySingleElementToClipboard(elements[0]),
        );
      } else {
        await executeCopyOperation(currentX, currentY, () =>
          copyMultipleElementsToClipboard(elements),
        );
      }
    };

    const handleNativeSelectionEnter = () => {
      const elements = nativeSelectionElements();
      if (elements.length === 0) return;

      const bounds = nativeSelectionBounds();
      const currentX = bounds ? bounds.x + bounds.width / 2 : nativeSelectionCursorX();
      const currentY = bounds ? bounds.y + bounds.height / 2 : nativeSelectionCursorY();

      setHasNativeSelection(false);
      setNativeSelectionCursorX(OFFSCREEN_POSITION);
      setNativeSelectionCursorY(OFFSCREEN_POSITION);
      setNativeSelectionElements([]);
      setNativeSelectionTagName(undefined);
      setNativeSelectionComponentName(undefined);

      window.getSelection()?.removeAllRanges();

      setMouseX(currentX);
      setMouseY(currentY);
      setIsToggleMode(true);
      setIsToggleFrozen(true);
      setIsInputExpanded(true);
      activateRenderer();
      setIsInputMode(true);
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (isInputMode() || isToggleFrozen()) return;

      setMouseX(clientX);
      setMouseY(clientY);

      if (isDragging()) {
        const direction = getAutoScrollDirection(clientX, clientY);
        const isNearEdge =
          direction.top ||
          direction.bottom ||
          direction.left ||
          direction.right;

        if (isNearEdge && autoScrollAnimationId === null) {
          startAutoScroll();
        } else if (!isNearEdge && autoScrollAnimationId !== null) {
          stopAutoScroll();
        }
      }
    };

    const handlePointerDown = (clientX: number, clientY: number) => {
      if (!isRendererActive() || isCopying()) return false;

      setIsDragging(true);
      const startX = clientX + window.scrollX;
      const startY = clientY + window.scrollY;
      setDragStartX(startX);
      setDragStartY(startY);
      document.body.style.userSelect = "none";

      options.onDragStart?.(startX, startY);

      return true;
    };

    const handlePointerUp = (clientX: number, clientY: number) => {
      if (!isDragging()) return;

      const dragDistance = calculateDragDistance(clientX, clientY);

      const wasDragGesture =
        dragDistance.x > DRAG_THRESHOLD_PX ||
        dragDistance.y > DRAG_THRESHOLD_PX;

      setIsDragging(false);
      stopAutoScroll();
      document.body.style.userSelect = "";

      if (wasDragGesture) {
        setDidJustDrag(true);
        const dragRect = calculateDragRectangle(clientX, clientY);

        const elements = getElementsInDrag(dragRect, isValidGrabbableElement);

        if (elements.length > 0) {
          options.onDragEnd?.(elements, dragRect);
          void executeCopyOperation(clientX, clientY, () =>
            copyMultipleElementsToClipboard(elements),
          );
        } else {
          const fallbackElements = getElementsInDragLoose(
            dragRect,
            isValidGrabbableElement,
          );

          if (fallbackElements.length > 0) {
            options.onDragEnd?.(fallbackElements, dragRect);
            void executeCopyOperation(clientX, clientY, () =>
              copyMultipleElementsToClipboard(fallbackElements),
            );
          }
        }
      } else {
        const element = getElementAtPosition(clientX, clientY);
        if (!element) return;

        setLastGrabbedElement(element);
        void executeCopyOperation(clientX, clientY, () =>
          copySingleElementToClipboard(element),
        );
      }
    };

    const abortController = new AbortController();
    const eventListenerSignal = abortController.signal;

    window.addEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          if (isAgentProcessing()) {
            agentAbortControllers.forEach((controller) => controller.abort());
            agentAbortControllers.clear();
            setAgentSessions(new Map());
            clearSessions(options.agent?.storage);
            return;
          }

          if (isHoldingKeys()) {
            if (isInputMode()) {
              return;
            }
            deactivateRenderer();
            return;
          }
        }

        if (event.key === "Enter" && isHoldingKeys() && !isInputMode()) {
          event.preventDefault();
          event.stopPropagation();
          setIsToggleMode(true);
          setIsToggleFrozen(true);
          setIsInputExpanded(true);

          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }

          if (!isActivated()) {
            if (holdTimerId) window.clearTimeout(holdTimerId);
            activateRenderer();
          }

          setIsInputMode(true);
          return;
        }

        if (event.key.toLowerCase() === "o" && !isInputMode()) {
          if (isActivated() && (event.metaKey || event.ctrlKey)) {
            const filePath = selectionFilePath();
            const lineNumber = selectionLineNumber();
            if (filePath) {
              event.preventDefault();
              event.stopPropagation();

              if (options.onOpenFile) {
                options.onOpenFile(filePath, lineNumber);
              } else {
                const url = buildOpenFileUrl(filePath, lineNumber);
                window.open(url, "_blank");
              }
            }
            return;
          }
        }

        if (
          !options.allowActivationInsideInput &&
          isKeyboardEventTriggeredByInput(event)
        ) {
          return;
        }

        if (!isTargetKeyCombination(event, options)) {
          // NOTE: deactivate when a non-activation key (e.g. V) is pressed while modifier is held,
          // so mod+C then mod+V doesn't keep the crosshair visible
          if (isActivated() && !isToggleMode() && (event.metaKey || event.ctrlKey)) {
            if (!MODIFIER_KEYS.includes(event.key)) {
              deactivateRenderer();
            }
          }
          return;
        }

        if (isActivated() || isHoldingKeys()) {
          event.preventDefault();
        }

        if (isActivated()) {
          if (isToggleMode()) return;
          if (event.repeat) return;

          if (keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
          }
          keydownSpamTimerId = window.setTimeout(() => {
            deactivateRenderer();
          }, 200);
          return;
        }

        if (isHoldingKeys() && event.repeat) return;

        if (holdTimerId !== null) {
          window.clearTimeout(holdTimerId);
        }

        if (!isHoldingKeys()) {
          setIsHoldingKeys(true);
        }

        holdTimerId = window.setTimeout(() => {
          activateRenderer();
        }, options.keyHoldDuration);
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "keyup",
      (event: KeyboardEvent) => {
        if (!isHoldingKeys() && !isActivated()) return;
        if (isInputMode()) return;

        const hasCustomShortcut = Boolean(options.activationShortcut || options.activationKey);

        const getRequiredModifiers = () => {
          if (options.activationKey) {
            const { metaKey, ctrlKey, shiftKey, altKey } = options.activationKey;
            return { metaKey: !!metaKey, ctrlKey: !!ctrlKey, shiftKey: !!shiftKey, altKey: !!altKey };
          }
          return { metaKey: true, ctrlKey: true, shiftKey: false, altKey: false };
        };

        const requiredModifiers = getRequiredModifiers();
        const isReleasingModifier = requiredModifiers.metaKey || requiredModifiers.ctrlKey
          ? !event.metaKey && !event.ctrlKey
          : (requiredModifiers.shiftKey && !event.shiftKey) ||
            (requiredModifiers.altKey && !event.altKey);

        const isReleasingActivationKey = options.activationShortcut
          ? !options.activationShortcut(event)
          : options.activationKey
            ? options.activationKey.key
              ? event.key.toLowerCase() === options.activationKey.key.toLowerCase() ||
                keyMatchesCode(options.activationKey.key, event.code)
              : false
            : isCLikeKey(event.key, event.code);

        if (isActivated()) {
          if (isReleasingModifier) {
            if (isToggleMode()) return;
            deactivateRenderer();
          } else if (!hasCustomShortcut && isReleasingActivationKey && keydownSpamTimerId !== null) {
            window.clearTimeout(keydownSpamTimerId);
            keydownSpamTimerId = null;
          }
          return;
        }

        if (isReleasingActivationKey || isReleasingModifier) {
          if (isToggleMode()) return;
          deactivateRenderer();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        setIsTouchMode(false);
        if (isEventFromOverlay(event, "data-react-grab-toolbar")) return;
        handlePointerMove(event.clientX, event.clientY);
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "mousedown",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-toolbar")) return;

        if (isInputMode()) {
          if (!isEventFromOverlay(event, "data-react-grab-input")) {
            handleInputCancel();
          }
          return;
        }

        const didHandle = handlePointerDown(event.clientX, event.clientY);
        if (didHandle) {
          event.preventDefault();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "pointerdown",
      (event: PointerEvent) => {
        if (!isRendererActive() || isCopying() || isInputMode()) return;
        if (isEventFromOverlay(event, "data-react-grab-toolbar")) return;
        event.stopPropagation();
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "mouseup",
      (event: MouseEvent) => {
        handlePointerUp(event.clientX, event.clientY);
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        setIsTouchMode(true);
        handlePointerMove(event.touches[0].clientX, event.touches[0].clientY);
      },
      { signal: eventListenerSignal, passive: true },
    );

    window.addEventListener(
      "touchstart",
      (event: TouchEvent) => {
        if (event.touches.length === 0) return;
        setIsTouchMode(true);

        if (isEventFromOverlay(event, "data-react-grab-toolbar")) return;

        if (isInputMode()) {
          if (!isEventFromOverlay(event, "data-react-grab-input")) {
            handleInputCancel();
          }
          return;
        }

        const didHandle = handlePointerDown(
          event.touches[0].clientX,
          event.touches[0].clientY,
        );
        if (didHandle) {
          event.preventDefault();
        }
      },
      { signal: eventListenerSignal, passive: false },
    );

    window.addEventListener(
      "touchend",
      (event: TouchEvent) => {
        if (event.changedTouches.length === 0) return;
        handlePointerUp(
          event.changedTouches[0].clientX,
          event.changedTouches[0].clientY,
        );
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "click",
      (event: MouseEvent) => {
        if (isEventFromOverlay(event, "data-react-grab-toolbar")) return;

        if (isRendererActive() || isCopying() || didJustDrag()) {
          event.preventDefault();
          event.stopPropagation();

          const hadDrag = didJustDrag();
          if (hadDrag) {
            setDidJustDrag(false);
          }

          if (isToggleMode() && !isCopying()) {
            if (!isHoldingKeys()) {
              deactivateRenderer();
            } else {
              setIsToggleMode(false);
            }
          }
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          setGrabbedBoxes([]);
          if (
            isActivated() &&
            activationTimestamp !== null &&
            Date.now() - activationTimestamp > BLUR_DEACTIVATION_THRESHOLD_MS
          ) {
            deactivateRenderer();
          }
        }
      },
      { signal: eventListenerSignal },
    );

    window.addEventListener(
      "scroll",
      () => {
        setViewportVersion((version) => version + 1);
      },
      { signal: eventListenerSignal, capture: true },
    );

    window.addEventListener(
      "resize",
      () => {
        setViewportVersion((version) => version + 1);
      },
      { signal: eventListenerSignal },
    );

    document.addEventListener(
      "copy",
      (event: ClipboardEvent) => {
        if (isRendererActive() || isCopying()) {
          event.preventDefault();
        }
      },
      { signal: eventListenerSignal, capture: true },
    );

    let selectionDebounceTimerId: number | null = null;

    document.addEventListener(
      "selectionchange",
      () => {
        if (isRendererActive()) return;

        if (selectionDebounceTimerId !== null) {
          window.clearTimeout(selectionDebounceTimerId);
        }

        setHasNativeSelection(false);

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          setNativeSelectionCursorX(OFFSCREEN_POSITION);
          setNativeSelectionCursorY(OFFSCREEN_POSITION);
          setNativeSelectionElements([]);
          setNativeSelectionTagName(undefined);
          setNativeSelectionComponentName(undefined);
          return;
        }

        selectionDebounceTimerId = window.setTimeout(() => {
          selectionDebounceTimerId = null;

          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed || currentSelection.rangeCount === 0) {
            return;
          }

          const range = currentSelection.getRangeAt(0);
          const rangeRect = range.getBoundingClientRect();

          if (rangeRect.width === 0 && rangeRect.height === 0) {
            return;
          }

          const isBackward = (() => {
            if (!currentSelection.anchorNode || !currentSelection.focusNode) return false;
            const position = currentSelection.anchorNode.compareDocumentPosition(currentSelection.focusNode);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return false;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return true;
            return currentSelection.anchorOffset > currentSelection.focusOffset;
          })();

          const clientRects = range.getClientRects();
          if (clientRects.length === 0) {
            return;
          }

          const cursorRect = isBackward ? clientRects[0] : clientRects[clientRects.length - 1];
          const cursorX = isBackward ? cursorRect.left : cursorRect.right;
          const cursorY = cursorRect.top + cursorRect.height / 2;

          if (isSelectionInsideEditableElement(cursorX, cursorY)) {
            setNativeSelectionCursorX(OFFSCREEN_POSITION);
            setNativeSelectionCursorY(OFFSCREEN_POSITION);
            setNativeSelectionElements([]);
            setNativeSelectionTagName(undefined);
            setNativeSelectionComponentName(undefined);
            return;
          }

          setNativeSelectionCursorX(cursorX);
          setNativeSelectionCursorY(cursorY);

          const container = range.commonAncestorContainer;
          const element = container.nodeType === Node.ELEMENT_NODE
            ? (container as Element)
            : container.parentElement;

          if (element && isValidGrabbableElement(element)) {
            setNativeSelectionElements([element]);
            setNativeSelectionTagName(extractElementTagName(element) || undefined);
            setNativeSelectionComponentName(getNearestComponentName(element) || undefined);
            setHasNativeSelection(true);
          } else {
            setNativeSelectionElements([]);
            setNativeSelectionTagName(undefined);
            setNativeSelectionComponentName(undefined);
          }
        }, 150);
      },
      { signal: eventListenerSignal },
    );

    onCleanup(() => {
      abortController.abort();
      if (holdTimerId) window.clearTimeout(holdTimerId);
      if (keydownSpamTimerId) window.clearTimeout(keydownSpamTimerId);
      stopAutoScroll();
      stopProgressAnimation();
      document.body.style.userSelect = "";
      setCursorOverride(null);
    });

    const rendererRoot = mountRoot(cssText as string);

    const selectionVisible = createMemo(
      () =>
        theme().selectionBox.enabled &&
        isRendererActive() &&
        !isDragging() &&
        Boolean(targetElement()),
    );

    const dragVisible = createMemo(
      () =>
        theme().dragBox.enabled &&
        isRendererActive() &&
        isDraggingBeyondThreshold(),
    );

    const labelVariant = createMemo(() =>
      isCopying() ? "processing" : "hover",
    );

    const labelVisible = createMemo(() => {
      if (!theme().elementLabel.enabled) return false;
      if (isInputMode()) return false;
      if (isAgentProcessing()) return false;
      if (isCopying()) return true;
      if (successLabels().length > 0) return false;

      return isRendererActive() && !isDragging() && Boolean(targetElement());
    });

    const progressVisible = createMemo(
      () => isCopying() && showProgressIndicator() && hasValidMousePosition(),
    );

    const crosshairVisible = createMemo(
      () =>
        theme().crosshair.enabled &&
        isRendererActive() &&
        !isDragging() &&
        !isTouchMode() &&
        !isToggleFrozen(),
    );

    const inputVisible = createMemo(
      () => theme().inputOverlay.enabled && isInputMode(),
    );

    const shouldShowGrabbedBoxes = createMemo(
      () => theme().grabbedBoxes.enabled,
    );
    const shouldShowSuccessLabels = createMemo(
      () => theme().successLabels.enabled,
    );

    createEffect(
      on(theme, (currentTheme) => {
        if (currentTheme.hue !== 0) {
          rendererRoot.style.filter = `hue-rotate(${currentTheme.hue}deg)`;
        } else {
          rendererRoot.style.filter = "";
        }
      }),
    );

    if (theme().enabled) {
      render(
        () => (
          <ReactGrabRenderer
            selectionVisible={selectionVisible()}
            selectionBounds={selectionBounds()}
            selectionFilePath={selectionFilePath()}
            selectionLineNumber={selectionLineNumber()}
            dragVisible={dragVisible()}
            dragBounds={dragBounds()}
            grabbedBoxes={shouldShowGrabbedBoxes() ? grabbedBoxes() : []}
            successLabels={shouldShowSuccessLabels() ? successLabels() : []}
            labelVariant={labelVariant()}
            labelContent={labelContent()}
            labelX={labelPosition().x}
            labelY={labelPosition().y}
            labelVisible={labelVisible()}
            labelZIndex={Z_INDEX_LABEL}
            labelShowHint={!hasCompletedFirstGrab()}
            progressVisible={progressVisible()}
            progress={progress()}
            mouseX={progressPosition().x}
            mouseY={progressPosition().y}
            crosshairVisible={crosshairVisible()}
            inputVisible={inputVisible()}
            inputX={mouseX()}
            inputY={mouseY()}
            inputValue={inputText()}
            isInputExpanded={isInputExpanded()}
            inputMode={inputOverlayMode()}
            inputStatusText=""
            agentSessions={agentSessions()}
            onInputChange={handleInputChange}
            onInputSubmit={() => void handleInputSubmit()}
            onInputCancel={handleInputCancel}
            onToggleExpand={handleToggleExpand}
            onCopyClick={handleCopyClick}
            nativeSelectionCursorVisible={hasNativeSelection()}
            nativeSelectionCursorX={nativeSelectionCursorX()}
            nativeSelectionCursorY={nativeSelectionCursorY()}
            nativeSelectionTagName={nativeSelectionTagName()}
            nativeSelectionComponentName={nativeSelectionComponentName()}
            nativeSelectionBounds={nativeSelectionBounds()}
            onNativeSelectionCopy={() => void handleNativeSelectionCopy()}
            onNativeSelectionEnter={handleNativeSelectionEnter}
            theme={theme()}
          />
        ),
        rendererRoot,
      );
    }

    if (options.agent?.provider) {
      void tryResumeAgentSessions();
    }

    const copyElementAPI = async (
      elements: Element | Element[],
    ): Promise<boolean> => {
      const elementsArray = Array.isArray(elements) ? elements : [elements];
      if (elementsArray.length === 0) return false;

      await options.onBeforeCopy?.(elementsArray);

      const didCopy = await tryCopyWithFallback(elementsArray);

      options.onAfterCopy?.(elementsArray, didCopy);

      return didCopy;
    };

    const getStateAPI = (): ReactGrabState => ({
      isActive: isActivated(),
      isDragging: isDragging(),
      isCopying: isCopying(),
      isInputMode: isInputMode(),
      targetElement: targetElement(),
      dragBounds: dragBounds()
        ? {
            x: dragBounds()!.x,
            y: dragBounds()!.y,
            width: dragBounds()!.width,
            height: dragBounds()!.height,
          }
        : null,
    });

    return {
      activate: () => {
        if (!isActivated()) {
          setIsToggleMode(true);
          activateRenderer();
        }
      },
      deactivate: () => {
        if (isActivated()) {
          deactivateRenderer();
        }
      },
      toggle: () => {
        if (isActivated()) {
          deactivateRenderer();
        } else {
          setIsToggleMode(true);
          activateRenderer();
        }
      },
      isActive: () => isActivated(),
      dispose: () => {
        hasInited = false;
        dispose();
      },
      copyElement: copyElementAPI,
      getState: getStateAPI,
      updateTheme: (partialTheme: DeepPartial<Theme>) => {
        const currentTheme = theme();
        const mergedTheme = deepMergeTheme(currentTheme, partialTheme);
        setTheme(mergedTheme);
      },
      getTheme: () => theme(),
    };
  });
};

export {
  getStack,
  formatStack,
  getHTMLPreview,
  getNearestComponentName,
  getFileName,
} from "./instrumentation.js";
export { isInstrumentationActive } from "bippy";
export { DEFAULT_THEME } from "./theme.js";

export type {
  Options,
  OverlayBounds,
  ReactGrabRendererProps,
  ReactGrabAPI,
  AgentContext,
  AgentSession,
  AgentProvider,
} from "./types.js";

export { generateSnippet } from "./utils/generate-snippet.js";
