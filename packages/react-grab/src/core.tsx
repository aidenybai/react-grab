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
      const logoSvg = `<svg width="294" height="294" viewBox="0 0 294 294" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_0_3)"><mask id="mask0_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="294" height="294"><path d="M294 0H0V294H294V0Z" fill="white"/></mask><g mask="url(#mask0_0_3)"><path d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z" fill="white"/><path d="M144.598 47.4924C169.712 27.3959 194.547 20.0265 212.131 30.1797C227.847 39.2555 234.88 60.3243 231.926 89.516C231.677 92.0069 231.327 94.5423 230.941 97.1058L228.526 110.14L228.496 110.127C228.487 110.165 228.478 110.203 228.469 110.24L216.255 105.741L216.249 105.723C207.916 103.125 199.42 101.075 190.82 99.5888L190.696 99.5588L173.525 97.2648L173.511 97.263C173.492 97.236 173.468 97.2176 173.447 97.1905C163.863 96.2064 154.234 95.7166 144.598 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8622 138.391 86.939 147.193C90.8622 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245L115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.506 229.974L144.61 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.473 238.38L154.512 238.412L143.847 247.482L143.827 247.497C126.56 261.13 109.472 268.745 94.8018 268.745C88.5915 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3162 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3362 185.327 9.52298 167.51 9.52298 147.193C9.52298 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3162 60.3243 61.3496 39.2555 77.0657 30.1797C94.6493 20.0265 119.486 27.3959 144.598 47.4924ZM70.6422 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5175 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8515 207.742 83.0977 205.066 70.6422 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1786 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.931 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.7589 110.203C59.234 110.839 57.7378 111.475 56.2699 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9103 147.193C67.822 135.23 63.7566 122.855 60.7589 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.8539 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.629 47.6015 67.6975 64.5954 70.0424 87.9446L70.0415 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8262 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.772 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.291 38.512C183.321 38.512 169.34 44.4991 154.443 56.0153C163.929 64.9374 172.634 74.6557 180.462 85.064C193.374 86.6345 206.129 89.3102 218.584 93.0624C218.813 91.4325 219.003 89.8118 219.166 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.551 64.3097C138.103 70.2614 132.055 76.6306 126.443 83.3765C132.389 82.995 138.427 82.8046 144.551 82.8046C150.727 82.8046 156.779 83.0143 162.707 83.3765C157.079 76.6293 151.015 70.2596 144.551 64.3097Z" fill="#FF40E0"/></g><mask id="mask1_0_3" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="102" y="84" width="161" height="162"><path d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z" fill="white"/></mask><g mask="url(#mask1_0_3)"><path d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z" fill="#FF40E0" stroke="#FF40E0" stroke-width="0.817337" stroke-linecap="round" stroke-linejoin="round"/></g></g><defs><clipPath id="clip0_0_3"><rect width="294" height="294" fill="white"/></clipPath></defs></svg>`;
      const logoDataUri = `data:image/svg+xml;base64,${btoa(logoSvg)}`;
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

  if (options.log !== false) {
    logIntro();
  }

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
    const [nativeSelectionBounds, setNativeSelectionBounds] = createSignal<OverlayBounds | undefined>(undefined);

    let holdTimerId: number | null = null;
    const agentAbortControllers = new Map<string, AbortController>();

    const isAgentProcessing = createMemo(() => agentSessions().size > 0);

    const tryResumeAgentSessions = () => {
      const storage = options.agent?.storage;
      const existingSessions = loadSessions(storage);

      if (options.log) {
        console.log("[React Grab] Checking for sessions to resume:", { sessionsCount: existingSessions.size, storage });
      }

      const streamingSessions = Array.from(existingSessions.values()).filter((session) => session.isStreaming);
      if (streamingSessions.length === 0) {
        if (options.log) console.log("[React Grab] No sessions to resume");
        return;
      }
      if (!options.agent?.provider?.supportsResume || !options.agent.provider.resume) {
        if (options.log) console.log("[React Grab] Provider doesn't support resume");
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
      if (!element)
        return (
          <span class="font-mono tabular-nums align-middle">{"1 element"}</span>
        );

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
            <span class="tabular-nums text-[10px] ml-1 align-middle">
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
        <span class="font-mono tabular-nums align-middle">{"1 element"}</span>
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
      setNativeSelectionBounds(undefined);

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
      setNativeSelectionBounds(undefined);

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

        if (!isTargetKeyCombination(event, options)) return;

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
          setNativeSelectionBounds(undefined);
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
            setNativeSelectionBounds(createElementBounds(element));
            setHasNativeSelection(true);
          } else {
            setNativeSelectionElements([]);
            setNativeSelectionTagName(undefined);
            setNativeSelectionComponentName(undefined);
            setNativeSelectionBounds(undefined);
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
