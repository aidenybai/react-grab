interface Selection {
  borderRadius: string;
  height: number;
  transform: string;
  width: number;
  x: number;
  y: number;
}

const templateCache = new Map<string, HTMLTemplateElement>();

const html = (strings: TemplateStringsArray, ...values: (string | number)[]): HTMLElement => {
  const key = strings.join("");

  let template = templateCache.get(key);
  if (!template) {
    template = document.createElement("template");
    template.innerHTML = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
    templateCache.set(key, template);
  }

  return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
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
const MARQUEE_LERP_FACTOR = 0.9;

const createSelectionElement = ({
  borderRadius,
  height,
  transform,
  width,
  x,
  y,
}: Selection): HTMLDivElement => {
  const overlay = html`
    <div style="
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      width: ${width}px;
      height: ${height}px;
      border-radius: ${borderRadius};
      transform: ${transform};
      pointer-events: auto;
      border: 1px solid rgb(210, 57, 192);
      background-color: rgba(210, 57, 192, 0.2);
      z-index: 2147483646;
      box-sizing: border-box;
      display: none;
    "></div>
  ` as HTMLDivElement;

  return overlay;
};

const updateSelectionElement = (
  element: HTMLElement,
  { borderRadius, height, transform, width, x, y }: Selection,
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
  let hasBeenShown = false;

  return {
    element,
    hide: () => {
      visible = false;
      hasBeenShown = false;
      element.style.display = "none";
    },

    isVisible: () => visible,

    show: () => {
      visible = true;
      element.style.display = "block";
    },

    update: (selection: Selection) => {
      if (!hasBeenShown) {
        element.style.top = `${selection.y}px`;
        element.style.left = `${selection.x}px`;
        element.style.width = `${selection.width}px`;
        element.style.height = `${selection.height}px`;
        element.style.borderRadius = selection.borderRadius;
        element.style.transform = selection.transform;
        hasBeenShown = true;
      } else {
        updateSelectionElement(element, selection);
      }
    },
  };
};

export const createGrabbedOverlay = (
  root: HTMLElement,
  selection: Selection,
) => {
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
  const spinner = html`
    <span style="
      display: inline-block;
      width: 8px;
      height: 8px;
      border: 1.5px solid rgb(210, 57, 192);
      border-top-color: transparent;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    "></span>
  ` as HTMLSpanElement;

  spinner.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    {
      duration: 600,
      easing: "linear",
      iterations: Infinity,
    },
  );

  return spinner;
};

let activeIndicator: HTMLDivElement | null = null;

const createIndicator = (): HTMLDivElement => {
  const indicator = html`
    <div style="
      position: fixed;
      top: calc(8px + env(safe-area-inset-top));
      padding: 2px 6px;
      background-color: #fde7f7;
      color: #b21c8e;
      border: 1px solid #f7c5ec;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      display: flex;
      align-items: center;
      max-width: calc(100vw - (16px + env(safe-area-inset-left) + env(safe-area-inset-right)));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    "></div>
  ` as HTMLDivElement;

  return indicator;
};

export const showLabel = (
  root: HTMLElement,
  selectionLeftPx: number,
  selectionTopPx: number,
  tagName: string,
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
  selectionTopPx?: number,
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
  const container = html`
    <div style="
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s ease-in-out;
    ">
      <div style="
        width: 32px;
        height: 2px;
        background-color: rgba(178, 28, 142, 0.2);
        border-radius: 1px;
        overflow: hidden;
        position: relative;
      ">
        <div data-progress-fill="true" style="
          width: 0%;
          height: 100%;
          background-color: #b21c8e;
          border-radius: 1px;
          transition: width 0.05s linear;
        "></div>
      </div>
    </div>
  ` as HTMLDivElement;

  return container;
};

export const showProgressIndicator = (
  root: HTMLElement,
  progress: number,
  mouseX: number,
  mouseY: number,
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
    Math.min(
      indicatorTop,
      viewportHeight - indicatorRect.height - VIEWPORT_MARGIN,
    ),
  );
  indicatorLeft = Math.max(
    VIEWPORT_MARGIN,
    Math.min(
      indicatorLeft,
      viewportWidth - indicatorRect.width - VIEWPORT_MARGIN,
    ),
  );

  indicator.style.top = `${indicatorTop}px`;
  indicator.style.left = `${indicatorLeft}px`;

  const progressFill = indicator.querySelector(
    "[data-progress-fill]",
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

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarqueeOverlay {
  element: HTMLDivElement;
  hide: () => void;
  isVisible: () => boolean;
  show: () => void;
  update: (rect: MarqueeRect) => void;
}

export const createMarqueeOverlay = (root: HTMLElement): MarqueeOverlay => {
  const fullScreenLayer = document.createElement("div");
  fullScreenLayer.style.position = "fixed";
  fullScreenLayer.style.top = "0";
  fullScreenLayer.style.left = "0";
  fullScreenLayer.style.width = "100vw";
  fullScreenLayer.style.height = "100vh";
  fullScreenLayer.style.zIndex = "2147483647";
  fullScreenLayer.style.pointerEvents = "auto";
  fullScreenLayer.style.cursor = "crosshair";
  fullScreenLayer.style.userSelect = "none";
  fullScreenLayer.style.display = "none";

  const marqueeRect = document.createElement("div");
  marqueeRect.style.position = "fixed";
  marqueeRect.style.border = "1px dashed rgb(210, 57, 192)";
  marqueeRect.style.backgroundColor = "rgba(210, 57, 192, 0.1)";
  marqueeRect.style.pointerEvents = "none";
  marqueeRect.style.boxSizing = "border-box";
  marqueeRect.style.display = "none";
  marqueeRect.style.willChange = "transform, width, height";
  marqueeRect.style.contain = "layout paint size";
  marqueeRect.style.transform = "translate3d(0, 0, 0)";

  fullScreenLayer.appendChild(marqueeRect);
  root.appendChild(fullScreenLayer);

  let visible = false;
  let hasCurrentRect = false;
  let currentX = 0;
  let currentY = 0;
  let currentWidth = 0;
  let currentHeight = 0;

  return {
    element: fullScreenLayer,
    hide: () => {
      visible = false;
      fullScreenLayer.style.display = "none";
      marqueeRect.style.display = "none";
      hasCurrentRect = false;
    },
    isVisible: () => visible,
    show: () => {
      visible = true;
      fullScreenLayer.style.display = "block";
    },
    update: (rect: MarqueeRect) => {
      marqueeRect.style.display = "block";
      if (!hasCurrentRect) {
        currentX = rect.x;
        currentY = rect.y;
        currentWidth = rect.width;
        currentHeight = rect.height;
        marqueeRect.style.width = `${currentWidth}px`;
        marqueeRect.style.height = `${currentHeight}px`;
        marqueeRect.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        hasCurrentRect = true;
        return;
      }

      currentX = lerp(currentX, rect.x, MARQUEE_LERP_FACTOR);
      currentY = lerp(currentY, rect.y, MARQUEE_LERP_FACTOR);
      currentWidth = lerp(currentWidth, rect.width, MARQUEE_LERP_FACTOR);
      currentHeight = lerp(currentHeight, rect.height, MARQUEE_LERP_FACTOR);

      marqueeRect.style.width = `${currentWidth}px`;
      marqueeRect.style.height = `${currentHeight}px`;
      marqueeRect.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    },
  };
};
