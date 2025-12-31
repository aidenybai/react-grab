import { grab, setGrab, config, addGrabbedBox, removeGrabbedBox } from "./state.js";
import { beforeCopyHandler, errorHandler, copySuccessHandler, afterCopyHandler } from "./extend.js";
import { getElementAtPosition } from "../utils/get-element-at-position.js";
import { generateSnippet } from "../utils/generate-snippet.js";
import { copyContent } from "../utils/copy-content.js";
import { createElementBounds } from "../utils/create-element-bounds.js";
import { SUCCESS_LABEL_DURATION_MS } from "../constants.js";

let holdTimeoutId: ReturnType<typeof setTimeout> | null = null;

const startHold = () => {
  const state = grab();
  if (state.state !== "idle") return;

  setGrab({ state: "holding", startedAt: Date.now() });

  holdTimeoutId = setTimeout(() => {
    const currentState = grab();
    if (currentState.state === "holding") {
      activate();
    }
  }, config().holdThreshold);
};

const cancelHold = () => {
  if (holdTimeoutId) {
    clearTimeout(holdTimeoutId);
    holdTimeoutId = null;
  }

  const state = grab();
  if (state.state === "holding") {
    setGrab({ state: "idle" });
  }
};

const activate = (pointer?: { x: number; y: number }) => {
  if (holdTimeoutId) {
    clearTimeout(holdTimeoutId);
    holdTimeoutId = null;
  }

  const state = grab();
  if (state.state === "active" || state.state === "copying") return;

  const pos = pointer ?? { x: 0, y: 0 };
  const hoveredEl = getElementAtPosition(pos.x, pos.y);

  setGrab({
    state: "active",
    pointer: pos,
    hoveredEl,
    lockedEl: null,
  });
};

const deactivate = () => {
  if (holdTimeoutId) {
    clearTimeout(holdTimeoutId);
    holdTimeoutId = null;
  }
  setGrab({ state: "idle" });
};

const updatePointer = (x: number, y: number) => {
  const state = grab();
  if (state.state !== "active") return;
  if (state.lockedEl) return;

  const hoveredEl = getElementAtPosition(x, y);
  setGrab({
    ...state,
    pointer: { x, y },
    hoveredEl,
  });
};

const lock = (element: Element) => {
  const state = grab();
  if (state.state !== "active") return;

  setGrab({
    ...state,
    lockedEl: element,
    hoveredEl: element,
  });
};

const unlock = () => {
  const state = grab();
  if (state.state !== "active") return;
  if (!state.lockedEl) return;

  const hoveredEl = getElementAtPosition(state.pointer.x, state.pointer.y);
  setGrab({
    ...state,
    lockedEl: null,
    hoveredEl,
  });
};

const toggleLock = () => {
  const state = grab();
  if (state.state !== "active") return;

  if (state.lockedEl) {
    unlock();
  } else if (state.hoveredEl) {
    lock(state.hoveredEl);
  }
};

const setHoveredElement = (element: Element | null) => {
  const state = grab();
  if (state.state !== "active") return;

  setGrab({
    ...state,
    hoveredEl: element,
    lockedEl: element,
  });
};

const copy = async (elements?: Element[]): Promise<boolean> => {
  const state = grab();

  let targetElements: Element[];

  if (elements && elements.length > 0) {
    targetElements = elements;
  } else if (state.state === "active") {
    const target = state.lockedEl ?? state.hoveredEl;
    if (!target) return false;
    targetElements = [target];
  } else {
    return false;
  }

  if (beforeCopyHandler) {
    try {
      const shouldSkip = await beforeCopyHandler(targetElements);
      if (shouldSkip) {
        return true;
      }
    } catch (error) {
      errorHandler?.(error instanceof Error ? error : new Error(String(error)), targetElements);
      return false;
    }
  }

  try {
    const currentConfig = config();
    let content: string;

    if (currentConfig.getContent) {
      content = await currentConfig.getContent(targetElements);
    } else {
      const snippets = await generateSnippet(targetElements, {
        maxLines: currentConfig.maxContextLines,
      });
      content = snippets.join("\n\n");
    }

    const didCopySucceed = copyContent(content);

    if (didCopySucceed) {
      for (const element of targetElements) {
        const bounds = createElementBounds(element);
        const boxId = `grabbed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        addGrabbedBox({
          id: boxId,
          bounds,
          createdAt: Date.now(),
          element,
        });

        setTimeout(() => {
          removeGrabbedBox(boxId);
        }, SUCCESS_LABEL_DURATION_MS);
      }

      copySuccessHandler?.(targetElements, content);

      setGrab({
        state: "copying",
        elements: targetElements,
        startedAt: Date.now(),
      });

      setTimeout(() => {
        setGrab({ state: "idle" });
      }, currentConfig.copyFeedbackDelay);

      afterCopyHandler?.(targetElements, true);
      return true;
    }

    afterCopyHandler?.(targetElements, false);
    return false;
  } catch (error) {
    errorHandler?.(error instanceof Error ? error : new Error(String(error)), targetElements);
    return false;
  }
};

export {
  startHold,
  cancelHold,
  activate,
  deactivate,
  updatePointer,
  lock,
  unlock,
  toggleLock,
  setHoveredElement,
  copy,
};
