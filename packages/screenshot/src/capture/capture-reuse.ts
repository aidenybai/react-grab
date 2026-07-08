import type { CaptureRegionRect, ElementReadSnapshot, ResolvedCaptureOptions } from "../types";
import { isCssStyleRule } from "../utils/is-css-style-rule";
import { visitDocumentCssRules } from "../utils/visit-document-css-rules";
import { getDocumentEpoch } from "./document-change-tracker";

interface ReusableCaptureArgs {
  svgMarkup: string;
  widthPx: number;
  heightPx: number;
  clipRect: CaptureRegionRect | null;
  resolvedBackgroundColor: string | undefined;
  contentOffsetLeftPx: number;
  contentOffsetTopPx: number;
}

interface CaptureReuseEntry extends ReusableCaptureArgs {
  optionsKey: string;
  documentEpoch: number;
  cssRuleCount: number;
  activeElement: Element | null;
  windowScrollX: number;
  windowScrollY: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  devicePixelRatio: number;
  scrollElements: Element[];
  scrollLefts: number[];
  scrollTops: number[];
  formElements: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
  formValues: string[];
  formCheckedStates: boolean[];
}

const reuseEntryByRoot = new WeakMap<Element, CaptureReuseEntry>();

interface RegionCaptureHistory {
  epoch: number;
  captureCount: number;
  unpromotableEpoch: number;
}

const regionHistoryByRoot = new WeakMap<Element, RegionCaptureHistory>();

export const shouldPromoteRegionCapture = (rootElement: Element): boolean => {
  const history = regionHistoryByRoot.get(rootElement);
  if (!history) return false;
  const epoch = getDocumentEpoch(rootElement.ownerDocument);
  return (
    history.epoch === epoch && history.captureCount >= 1 && history.unpromotableEpoch !== epoch
  );
};

export const recordRegionCapture = (rootElement: Element): void => {
  const epoch = getDocumentEpoch(rootElement.ownerDocument);
  const history = regionHistoryByRoot.get(rootElement);
  if (history && history.epoch === epoch) {
    history.captureCount++;
    return;
  }
  regionHistoryByRoot.set(rootElement, {
    epoch,
    captureCount: 1,
    unpromotableEpoch: history?.unpromotableEpoch ?? -1,
  });
};

export const markRegionPromotionFailed = (rootElement: Element): void => {
  const epoch = getDocumentEpoch(rootElement.ownerDocument);
  const history = regionHistoryByRoot.get(rootElement);
  if (history) {
    history.unpromotableEpoch = epoch;
    return;
  }
  regionHistoryByRoot.set(rootElement, { epoch, captureCount: 0, unpromotableEpoch: epoch });
};

// Elements whose rendered pixels can change without any DOM mutation or event
// the epoch tracker sees (painting surfaces, embedded documents, SMIL).
const REUSE_DISQUALIFYING_ELEMENTS_SELECTOR =
  "canvas,video,iframe,object,embed,animate,animateTransform,animateMotion,set";

// Interaction pseudo-classes match and unmatch with pointer/focus movement,
// which produces no mutation record.
const INTERACTION_PSEUDO_PATTERN = /:(?:hover|active|focus|target)/;

export const buildCaptureReuseOptionsKey = (options: ResolvedCaptureOptions): string | null => {
  if (options.filterNode || options.resolveIframeContent || options.prunedElements) return null;
  const clip = options.clip;
  return (
    `${options.scale}|${options.pixelRatio}|${options.backgroundColor ?? ""}|` +
    `${options.embedFonts}|${options.bleed}|${options.timeoutMs}|` +
    (clip ? `${clip.x},${clip.y},${clip.width},${clip.height}` : "")
  );
};

export const countAccessibleCssRules = (sourceDocument: Document): number => {
  let ruleCount = 0;
  visitDocumentCssRules(
    sourceDocument,
    () => {
      ruleCount++;
      return false;
    },
    () => false,
  );
  return ruleCount;
};

const hasInteractionPseudoRules = (sourceDocument: Document): boolean => {
  let hasInteractionRule = false;
  visitDocumentCssRules(
    sourceDocument,
    (rule) => {
      if (isCssStyleRule(rule) && INTERACTION_PSEUDO_PATTERN.test(rule.selectorText)) {
        hasInteractionRule = true;
        return true;
      }
      return false;
    },
    () => {
      hasInteractionRule = true;
      return true;
    },
  );
  return hasInteractionRule;
};

const hasRunningAnimations = (sourceDocument: Document): boolean =>
  typeof sourceDocument.getAnimations !== "function" || sourceDocument.getAnimations().length > 0;

const isFormElement = (
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  element.localName === "input" ||
  element.localName === "textarea" ||
  element.localName === "select";

export const storeReusableCapture = (
  rootElement: Element,
  optionsKey: string,
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  args: ReusableCaptureArgs,
): void => {
  const ownerDocument = rootElement.ownerDocument;
  const defaultView = ownerDocument.defaultView;
  if (!defaultView) return;
  if (ownerDocument.fonts.status !== "loaded") return;
  if (hasRunningAnimations(ownerDocument)) return;
  if (rootElement.querySelector(REUSE_DISQUALIFYING_ELEMENTS_SELECTOR)) return;
  if (hasInteractionPseudoRules(ownerDocument)) return;
  const scrollElements: Element[] = [];
  const scrollLefts: number[] = [];
  const scrollTops: number[] = [];
  const formElements: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] = [];
  const formValues: string[] = [];
  const formCheckedStates: boolean[] = [];
  for (const [element, snapshot] of snapshotByElement) {
    if (element.shadowRoot) return;
    scrollElements.push(element);
    scrollLefts.push(snapshot.scrollLeft);
    scrollTops.push(snapshot.scrollTop);
    if (isFormElement(element)) {
      formElements.push(element);
      formValues.push(element.value);
      formCheckedStates.push(
        element instanceof HTMLInputElement ? element.checked || element.indeterminate : false,
      );
    }
  }
  reuseEntryByRoot.set(rootElement, {
    ...args,
    optionsKey,
    documentEpoch: getDocumentEpoch(ownerDocument),
    cssRuleCount: countAccessibleCssRules(ownerDocument),
    activeElement: ownerDocument.activeElement,
    windowScrollX: defaultView.scrollX,
    windowScrollY: defaultView.scrollY,
    viewportWidthPx: defaultView.innerWidth,
    viewportHeightPx: defaultView.innerHeight,
    devicePixelRatio: defaultView.devicePixelRatio,
    scrollElements,
    scrollLefts,
    scrollTops,
    formElements,
    formValues,
    formCheckedStates,
  });
};

export const getReusableCapture = (
  rootElement: Element,
  optionsKey: string,
): ReusableCaptureArgs | null => {
  const entry = reuseEntryByRoot.get(rootElement);
  if (!entry || entry.optionsKey !== optionsKey) return null;
  const ownerDocument = rootElement.ownerDocument;
  const defaultView = ownerDocument.defaultView;
  if (!defaultView) return null;
  if (
    getDocumentEpoch(ownerDocument) !== entry.documentEpoch ||
    ownerDocument.activeElement !== entry.activeElement ||
    ownerDocument.fonts.status !== "loaded" ||
    defaultView.scrollX !== entry.windowScrollX ||
    defaultView.scrollY !== entry.windowScrollY ||
    defaultView.innerWidth !== entry.viewportWidthPx ||
    defaultView.innerHeight !== entry.viewportHeightPx ||
    defaultView.devicePixelRatio !== entry.devicePixelRatio ||
    hasRunningAnimations(ownerDocument) ||
    countAccessibleCssRules(ownerDocument) !== entry.cssRuleCount
  ) {
    return null;
  }
  const { scrollElements, scrollLefts, scrollTops } = entry;
  for (let elementIndex = 0; elementIndex < scrollElements.length; elementIndex++) {
    const scrollElement = scrollElements[elementIndex];
    if (
      scrollElement.scrollLeft !== scrollLefts[elementIndex] ||
      scrollElement.scrollTop !== scrollTops[elementIndex]
    ) {
      return null;
    }
  }
  const { formElements, formValues, formCheckedStates } = entry;
  for (let formIndex = 0; formIndex < formElements.length; formIndex++) {
    const formElement = formElements[formIndex];
    const checkedState =
      formElement instanceof HTMLInputElement
        ? formElement.checked || formElement.indeterminate
        : false;
    if (
      formElement.value !== formValues[formIndex] ||
      checkedState !== formCheckedStates[formIndex]
    ) {
      return null;
    }
  }
  return entry;
};
