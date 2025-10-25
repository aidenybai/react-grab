import { libStore } from "./index.js";

interface Selection {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

const VIEWPORT_MARGIN_PX = 8;
const LABEL_OFFSET_PX = 6;
export const INDICATOR_CLAMP_PADDING_PX = 4;
export const INDICATOR_SUCCESS_VISIBLE_MS = 1500;
export const INDICATOR_FADE_MS = 200;
export const INDICATOR_TOTAL_HIDE_DELAY_MS =
  INDICATOR_SUCCESS_VISIBLE_MS + INDICATOR_FADE_MS;

const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

const SELECTION_LERP_FACTOR = 0.95;

const createSelectionElement = ({
  borderRadius,
  height,
  transform,
  width,
  x,
  y,
}: Selection): HTMLDivElement => {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = `${y}px`;
  overlay.style.left = `${x}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
  overlay.style.borderRadius = borderRadius;
  overlay.style.transform = transform;
  overlay.style.pointerEvents = "none";
  overlay.style.border = "1px solid rgb(210, 57, 192)";
  overlay.style.backgroundColor = "rgba(210, 57, 192, 0.2)";
  overlay.style.zIndex = "2147483646";
  overlay.style.boxSizing = "border-box";
  overlay.style.display = "none";

  return overlay;
};

const updateSelectionElement = (
  element: HTMLElement,
  { borderRadius, height, transform, width, x, y }: Selection
) => {
  const currentTop = parseFloat(element.style.top) || 0;
  const currentLeft = parseFloat(element.style.left) || 0;
  const currentWidth = parseFloat(element.style.width) || 0;
  const currentHeight = parseFloat(element.style.height) || 0;

  const topValue = `${lerp(currentTop, y, SELECTION_LERP_FACTOR)}px`;
  const leftValue = `${lerp(currentLeft, x, SELECTION_LERP_FACTOR)}px`;
  const widthValue = `${lerp(currentWidth, width, SELECTION_LERP_FACTOR)}px`;
  const heightValue = `${lerp(currentHeight, height, SELECTION_LERP_FACTOR)}px`;

  if (element.style.top !== topValue) {
    element.style.top = topValue;
  }
  if (element.style.left !== leftValue) {
    element.style.left = leftValue;
  }
  if (element.style.width !== widthValue) {
    element.style.width = widthValue;
  }
  if (element.style.height !== heightValue) {
    element.style.height = heightValue;
  }
  if (element.style.borderRadius !== borderRadius) {
    element.style.borderRadius = borderRadius;
  }
  if (element.style.transform !== transform) {
    element.style.transform = transform;
  }
};

export const createSelectionOverlay = (root: HTMLElement) => {
  const element = createSelectionElement({
    borderRadius: "0px",
    height: 0,
    transform: "none",
    width: 0,
    x: -1000,
    y: -1000,
  });
  root.appendChild(element);

  let visible = false;

  element.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    const { overlayMode } = libStore.getState();
    if (overlayMode === 'visible') {
      libStore.setState((state) => ({
        ...state,
        overlayMode: "copying",
      }));
    }
  }, true);

  return {
    element,
    hide: () => {
      visible = false;
      element.style.display = "none";
    },

    isVisible: () => visible,

    show: () => {
      visible = true;
      element.style.display = "block";
    },

    update: (selection: Selection) => {
      updateSelectionElement(element, selection);
    },
  };
};

export const createGrabbedOverlay = (root: HTMLElement, selection: Selection) => {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.top = `${selection.y}px`;
  element.style.left = `${selection.x}px`;
  element.style.width = `${selection.width}px`;
  element.style.height = `${selection.height}px`;
  element.style.borderRadius = selection.borderRadius;
  element.style.transform = selection.transform;
  element.style.pointerEvents = "none";
  element.style.border = "1px solid rgb(210, 57, 192)";
  element.style.backgroundColor = "rgba(210, 57, 192, 0.2)";
  element.style.zIndex = "2147483646";
  element.style.boxSizing = "border-box";
  element.style.transition = "opacity 0.3s ease-out";
  element.style.opacity = "1";

  root.appendChild(element);

  requestAnimationFrame(() => {
    element.style.opacity = "0";
  });

  setTimeout(() => {
    element.remove();
  }, 300);
};

const createSpinner = (): HTMLSpanElement => {
  const spinner = document.createElement("span");
  spinner.style.display = "inline-block";
  spinner.style.width = "8px";
  spinner.style.height = "8px";
  spinner.style.border = "1.5px solid rgb(210, 57, 192)";
  spinner.style.borderTopColor = "transparent";
  spinner.style.borderRadius = "50%";
  spinner.style.marginRight = "4px";
  spinner.style.verticalAlign = "middle";

  spinner.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    {
      duration: 600,
      easing: "linear",
      iterations: Infinity,
    }
  );

  return spinner;
};

let activeIndicator: HTMLDivElement | null = null;

const createIndicator = (): HTMLDivElement => {
  const indicator = document.createElement("div");
  indicator.style.position = "fixed";
  indicator.style.top = "calc(8px + env(safe-area-inset-top))";
  indicator.style.padding = "2px 6px";
  indicator.style.backgroundColor = "#fde7f7";
  indicator.style.color = "#b21c8e";
  indicator.style.border = "1px solid #f7c5ec";
  indicator.style.borderRadius = "4px";
  indicator.style.fontSize = "11px";
  indicator.style.fontWeight = "500";
  indicator.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  indicator.style.zIndex = "2147483647";
  indicator.style.pointerEvents = "none";
  indicator.style.opacity = "0";
  indicator.style.transition = "opacity 0.2s ease-in-out";
  indicator.style.display = "flex";
  indicator.style.alignItems = "center";
  indicator.style.maxWidth =
    "calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)))";
  indicator.style.overflow = "hidden";
  indicator.style.textOverflow = "ellipsis";
  indicator.style.whiteSpace = "nowrap";

  return indicator;
};

export const showLabel = (
  root: HTMLElement,
  selectionLeftPx: number,
  selectionTopPx: number,
  tagName: string
) => {
  let indicator = activeIndicator;
  let isNewIndicator = false;

  if (!indicator) {
    indicator = createIndicator();
    root.appendChild(indicator);
    activeIndicator = indicator;
    isNewIndicator = true;
    isProcessing = false;
  }

  if (!isProcessing) {
    const labelText = indicator.querySelector("span");
    if (labelText) {
      const tagNameMonospace = document.createElement("span");
      tagNameMonospace.textContent = tagName ? `<${tagName}>` : "<element>";
      tagNameMonospace.style.fontFamily =
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      tagNameMonospace.style.fontVariantNumeric = "tabular-nums";
      labelText.replaceChildren(tagNameMonospace);
    } else {
      const newLabelText = document.createElement("span");
      const tagNameMonospace = document.createElement("span");
      tagNameMonospace.textContent = tagName ? `<${tagName}>` : "<element>";
      tagNameMonospace.style.fontFamily =
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
      tagNameMonospace.style.fontVariantNumeric = "tabular-nums";
      newLabelText.appendChild(tagNameMonospace);
      indicator.appendChild(newLabelText);
    }
  }

  const indicatorRect = indicator.getBoundingClientRect();
  const viewportWidthPx = window.innerWidth;
  const viewportHeightPx = window.innerHeight;

  let indicatorLeftPx = Math.round(selectionLeftPx);
  let indicatorTopPx =
    Math.round(selectionTopPx) - indicatorRect.height - LABEL_OFFSET_PX;

  const CLAMPED_PADDING = INDICATOR_CLAMP_PADDING_PX;
  const minLeft = VIEWPORT_MARGIN_PX;
  const minTop = VIEWPORT_MARGIN_PX;
  const maxLeft = viewportWidthPx - indicatorRect.width - VIEWPORT_MARGIN_PX;
  const maxTop = viewportHeightPx - indicatorRect.height - VIEWPORT_MARGIN_PX;

  const willClampLeft = indicatorLeftPx < minLeft;
  const willClampTop = indicatorTopPx < minTop;
  const isClamped = willClampLeft || willClampTop;

  indicatorLeftPx = Math.max(minLeft, Math.min(indicatorLeftPx, maxLeft));
  indicatorTopPx = Math.max(minTop, Math.min(indicatorTopPx, maxTop));

  if (isClamped) {
    indicatorLeftPx += CLAMPED_PADDING;
    indicatorTopPx += CLAMPED_PADDING;
  }

  indicator.style.left = `${indicatorLeftPx}px`;
  indicator.style.top = `${indicatorTopPx}px`;
  indicator.style.right = "auto";

  if (isNewIndicator) {
    requestAnimationFrame(() => {
      indicator.style.opacity = "1";
    });
  } else if (indicator.style.opacity !== "1") {
    indicator.style.opacity = "1";
  }
};

let isProcessing = false;
const activeGrabbedIndicators: Set<HTMLDivElement> = new Set();

export const updateLabelToProcessing = (
  root: HTMLElement,
  selectionLeftPx?: number,
  selectionTopPx?: number
) => {
  const indicator = createIndicator();
  indicator.style.zIndex = "2147483648";
  root.appendChild(indicator);
  activeGrabbedIndicators.add(indicator);

  const positionIndicator = () => {
    if (selectionLeftPx === undefined || selectionTopPx === undefined) return;

    const indicatorRect = indicator.getBoundingClientRect();
    const viewportWidthPx = window.innerWidth;
    const viewportHeightPx = window.innerHeight;

    let indicatorLeftPx = Math.round(selectionLeftPx);
    let indicatorTopPx =
      Math.round(selectionTopPx) - indicatorRect.height - LABEL_OFFSET_PX;

    const CLAMPED_PADDING = INDICATOR_CLAMP_PADDING_PX;
    const minLeft = VIEWPORT_MARGIN_PX;
    const minTop = VIEWPORT_MARGIN_PX;
    const maxLeft = viewportWidthPx - indicatorRect.width - VIEWPORT_MARGIN_PX;
    const maxTop = viewportHeightPx - indicatorRect.height - VIEWPORT_MARGIN_PX;

    const willClampLeft = indicatorLeftPx < minLeft;
    const willClampTop = indicatorTopPx < minTop;
    const isClamped = willClampLeft || willClampTop;

    indicatorLeftPx = Math.max(minLeft, Math.min(indicatorLeftPx, maxLeft));
    indicatorTopPx = Math.max(minTop, Math.min(indicatorTopPx, maxTop));

    if (isClamped) {
      indicatorLeftPx += CLAMPED_PADDING;
      indicatorTopPx += CLAMPED_PADDING;
    }

    indicator.style.left = `${indicatorLeftPx}px`;
    indicator.style.top = `${indicatorTopPx}px`;
    indicator.style.right = "auto";
  };

  const loadingSpinner = createSpinner();
  const labelText = document.createElement("span");
  labelText.textContent = "Grabbing…";

  indicator.appendChild(loadingSpinner);
  indicator.appendChild(labelText);

  positionIndicator();

  requestAnimationFrame(() => {
    indicator.style.opacity = "1";
  });

  return (tagName?: string) => {
    indicator.textContent = "";

    const checkmarkIcon = document.createElement("span");
    checkmarkIcon.textContent = "✓";
    checkmarkIcon.style.display = "inline-block";
    checkmarkIcon.style.marginRight = "4px";
    checkmarkIcon.style.fontWeight = "600";

    const newLabelText = document.createElement("span");
    const tagNameMonospace = document.createElement("span");
    tagNameMonospace.textContent = tagName ? `<${tagName}>` : "<element>";
    tagNameMonospace.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    tagNameMonospace.style.fontVariantNumeric = "tabular-nums";
    newLabelText.appendChild(document.createTextNode("Grabbed "));
    newLabelText.appendChild(tagNameMonospace);

    indicator.appendChild(checkmarkIcon);
    indicator.appendChild(newLabelText);

    requestAnimationFrame(() => {
      positionIndicator();
    });

    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        indicator.remove();
        activeGrabbedIndicators.delete(indicator);
      }, INDICATOR_FADE_MS);
    }, INDICATOR_SUCCESS_VISIBLE_MS);
  };
};

export const hideLabel = () => {
  if (activeIndicator) {
    activeIndicator.remove();
    activeIndicator = null;
  }
  isProcessing = false;
};

export const cleanupGrabbedIndicators = () => {
  for (const indicator of activeGrabbedIndicators) {
    indicator.remove();
  }
  activeGrabbedIndicators.clear();
};

let activeProgressIndicator: HTMLDivElement | null = null;

const createProgressIndicatorElement = (): HTMLDivElement => {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.zIndex = "2147483647";
  container.style.pointerEvents = "none";
  container.style.opacity = "0";
  container.style.transition = "opacity 0.1s ease-in-out";

  const progressBarContainer = document.createElement("div");
  progressBarContainer.style.width = "32px";
  progressBarContainer.style.height = "2px";
  progressBarContainer.style.backgroundColor = "rgba(178, 28, 142, 0.2)";
  progressBarContainer.style.borderRadius = "1px";
  progressBarContainer.style.overflow = "hidden";
  progressBarContainer.style.position = "relative";

  const progressBarFill = document.createElement("div");
  progressBarFill.style.width = "0%";
  progressBarFill.style.height = "100%";
  progressBarFill.style.backgroundColor = "#b21c8e";
  progressBarFill.style.borderRadius = "1px";
  progressBarFill.style.transition = "width 0.05s linear";
  progressBarFill.setAttribute("data-progress-fill", "true");

  progressBarContainer.appendChild(progressBarFill);
  container.appendChild(progressBarContainer);

  return container;
};

export const showProgressIndicator = (
  root: HTMLElement,
  progress: number,
  mouseX: number,
  mouseY: number
) => {
  if (!activeProgressIndicator) {
    activeProgressIndicator = createProgressIndicatorElement();
    root.appendChild(activeProgressIndicator);
    requestAnimationFrame(() => {
      if (activeProgressIndicator) {
        activeProgressIndicator.style.opacity = "1";
      }
    });
  }

  const indicator = activeProgressIndicator;
  const indicatorRect = indicator.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const CURSOR_OFFSET = 14;
  const VIEWPORT_MARGIN = 8;

  let indicatorLeft = mouseX - indicatorRect.width / 2;

  let indicatorTop = mouseY + CURSOR_OFFSET;

  if (indicatorTop + indicatorRect.height + VIEWPORT_MARGIN > viewportHeight) {
    indicatorTop = mouseY - indicatorRect.height - CURSOR_OFFSET;
  }

  indicatorTop = Math.max(
    VIEWPORT_MARGIN,
    Math.min(indicatorTop, viewportHeight - indicatorRect.height - VIEWPORT_MARGIN)
  );
  indicatorLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(indicatorLeft, viewportWidth - indicatorRect.width - VIEWPORT_MARGIN)
  );

  indicator.style.top = `${indicatorTop}px`;
  indicator.style.left = `${indicatorLeft}px`;

  const progressFill = indicator.querySelector(
    "[data-progress-fill]"
  ) as HTMLDivElement;
  if (progressFill) {
    const percentage = Math.min(100, Math.max(0, progress * 100));
    progressFill.style.width = `${percentage}%`;
  }
};

export const hideProgressIndicator = () => {
  if (activeProgressIndicator) {
    activeProgressIndicator.style.opacity = "0";
    setTimeout(() => {
      if (activeProgressIndicator) {
        activeProgressIndicator.remove();
        activeProgressIndicator = null;
      }
    }, 100);
  }
};
