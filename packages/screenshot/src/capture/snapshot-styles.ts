import {
  FULL_SNAPSHOT_TAGS,
  SKIPPED_CLONE_TAGS,
  SVG_NAMESPACE_URI,
  SVG_TEMPLATE_CONTAINER_TAGS,
  UNRECURSED_CLONE_TAGS,
} from "../constants";
import type { ElementReadSnapshot, MemoizedElementStyles, StyleDeclarationMap } from "../types";
import { buildStyleMemoDescriptor } from "../utils/build-style-memo-descriptor";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { isHtmlElement } from "../utils/is-html-element";
import { isZeroScaleOverlay } from "../utils/is-zero-scale-overlay";
import { snapshotComputedStyle } from "../utils/snapshot-computed-style";
import {
  preflightPseudoRules,
  snapshotFirstLetterStyles,
  snapshotMarkerStyles,
  snapshotMemoizedPseudoStyles,
  snapshotPseudoStyles,
  snapshotTrustedMemoizedPseudoStyles,
} from "./pseudo-elements";
import { createRelevantStylePropRegistry } from "./relevant-style-props";

const isSvgTemplateContainer = (element: Element): boolean =>
  element.namespaceURI === SVG_NAMESPACE_URI && SVG_TEMPLATE_CONTAINER_TAGS.has(element.localName);

const NO_MEMO_KEY = -1;

export const snapshotComposedTree = (
  rootElement: Element,
  defaultView: Window & typeof globalThis,
  filterNode: ((element: Element) => boolean) | undefined,
): Map<Element, ElementReadSnapshot> => {
  const snapshotByElement = new Map<Element, ElementReadSnapshot>();
  const pseudoPreflight = preflightPseudoRules(rootElement.ownerDocument);
  let relevantProps = createRelevantStylePropRegistry(rootElement.ownerDocument);
  const perElementPropertyNames = relevantProps?.perElementPropertyNames ?? [];
  const perElementProps: ReadonlySet<string> = new Set(perElementPropertyNames);
  const activeElement = rootElement.ownerDocument.activeElement;
  const memoKeyByAncestry = new Map<string, number>();
  const memoizedStylesByKey = new Map<number, MemoizedElementStyles>();

  const visit = (
    element: Element,
    parentElement: Element | null,
    isInShadowTree: boolean,
    parentMemoKey: number,
  ): void => {
    if (SKIPPED_CLONE_TAGS.has(element.localName)) return;
    if (isSvgTemplateContainer(element)) return;
    if (filterNode && !filterNode(element)) return;
    if (relevantProps && element.shadowRoot) {
      if (!relevantProps.addShadowRootStyleProps(element.shadowRoot)) relevantProps = null;
    }
    const isMemoizableHtmlElement =
      isHtmlElement(element) && !isInShadowTree && !FULL_SNAPSHOT_TAGS.has(element.localName);
    if (relevantProps && isHtmlElement(element) && element.style.length > 0) {
      relevantProps.addInlineStyleProps(element.style);
    }
    const relevantPropertyNames =
      relevantProps &&
      element.namespaceURI !== SVG_NAMESPACE_URI &&
      !FULL_SNAPSHOT_TAGS.has(element.localName)
        ? relevantProps.propertyNames
        : null;
    let memoKey = NO_MEMO_KEY;
    if (
      relevantPropertyNames &&
      relevantProps?.isStyleMemoSafe() &&
      isMemoizableHtmlElement &&
      parentMemoKey !== NO_MEMO_KEY &&
      element !== activeElement
    ) {
      const ancestryKey = `${parentMemoKey}>${buildStyleMemoDescriptor(element, perElementProps)}`;
      const internedKey = memoKeyByAncestry.get(ancestryKey);
      if (internedKey === undefined) {
        memoKey = memoKeyByAncestry.size;
        memoKeyByAncestry.set(ancestryKey, memoKey);
      } else {
        memoKey = internedKey;
      }
    }
    const memoized = memoKey !== NO_MEMO_KEY ? memoizedStylesByKey.get(memoKey) : undefined;
    const computedStyle = defaultView.getComputedStyle(element);
    let styles: StyleDeclarationMap;
    if (memoized) {
      styles = { ...memoized.styles };
      for (const propertyName of perElementPropertyNames) {
        const propertyValue = computedStyle.getPropertyValue(propertyName);
        if (propertyValue !== "") styles[propertyName] = propertyValue;
        else delete styles[propertyName];
      }
    } else {
      if (parentElement !== null && computedStyle.getPropertyValue("display") === "none") return;
      styles = snapshotComputedStyle(computedStyle, relevantPropertyNames);
    }
    const canNeverPaint = styles["display"] === "none" || isZeroScaleOverlay(styles);
    if (canNeverPaint && parentElement !== null) return;
    const capturePseudos = pseudoPreflight.definesBeforeAfter || isInShadowTree;
    const captureMarker =
      (pseudoPreflight.definesMarker || isInShadowTree) &&
      (styles["display"] ?? "").includes("list-item");
    let beforeStyles: StyleDeclarationMap | null = null;
    let afterStyles: StyleDeclarationMap | null = null;
    if (capturePseudos) {
      if (memoized && relevantProps?.isPseudoContentMemoSafe()) {
        beforeStyles = snapshotTrustedMemoizedPseudoStyles(
          element,
          "::before",
          defaultView,
          perElementPropertyNames,
          memoized.beforeStyles,
        );
        afterStyles = snapshotTrustedMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          perElementPropertyNames,
          memoized.afterStyles,
        );
      } else if (memoized) {
        beforeStyles = snapshotMemoizedPseudoStyles(
          element,
          "::before",
          defaultView,
          relevantPropertyNames,
          perElementPropertyNames,
          memoized.beforeStyles,
        );
        afterStyles = snapshotMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          relevantPropertyNames,
          perElementPropertyNames,
          memoized.afterStyles,
        );
      } else {
        beforeStyles = snapshotPseudoStyles(
          element,
          "::before",
          defaultView,
          relevantPropertyNames,
        );
        afterStyles = snapshotPseudoStyles(element, "::after", defaultView, relevantPropertyNames);
      }
    }
    if (memoKey !== NO_MEMO_KEY && !memoized) {
      memoizedStylesByKey.set(memoKey, { styles, beforeStyles, afterStyles });
    }
    snapshotByElement.set(element, {
      styles,
      beforeStyles,
      afterStyles,
      firstLetterStyles: pseudoPreflight.definesFirstLetter
        ? snapshotFirstLetterStyles(element, defaultView)
        : null,
      markerStyles: captureMarker ? snapshotMarkerStyles(element, defaultView) : null,
      parentElement,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
    });
    if (UNRECURSED_CLONE_TAGS.has(element.localName)) return;
    const childIsInShadowTree = isInShadowTree || Boolean(element.shadowRoot);
    for (const childNode of getComposedChildNodes(element)) {
      if (isElementNode(childNode)) visit(childNode, element, childIsInShadowTree, memoKey);
    }
  };

  visit(rootElement, null, false, 0);
  return snapshotByElement;
};
