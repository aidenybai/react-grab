import {
  FULL_SNAPSHOT_TAGS,
  SKIPPED_CLONE_TAGS,
  SVG_NAMESPACE_URI,
  SVG_TEMPLATE_CONTAINER_TAGS,
  UNRECURSED_CLONE_TAGS,
} from "../constants";
import type {
  ComposedTreeSnapshot,
  ElementReadSnapshot,
  MemoizedElementStyles,
  StyleDeclarationMap,
} from "../types";
import { buildStyleMemoDescriptor } from "../utils/build-style-memo-descriptor";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { isHtmlElement } from "../utils/is-html-element";
import { isZeroScaleOverlay } from "../utils/is-zero-scale-overlay";
import { applyPerElementLaneReads, buildPerElementLaneActions } from "../utils/per-element-lane";
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
  prunedElements: ReadonlySet<Element> | undefined,
): ComposedTreeSnapshot => {
  const snapshotByElement = new Map<Element, ElementReadSnapshot>();
  const pseudoPreflight = preflightPseudoRules(rootElement.ownerDocument);
  let relevantProps = createRelevantStylePropRegistry(rootElement.ownerDocument);
  if (relevantProps) {
    // Inline styles on ancestors outside the capture root can cascade
    // inherited properties into it; their property names must join the
    // relevant set before any snapshot is taken.
    for (
      let ancestorElement = rootElement.parentElement;
      ancestorElement !== null;
      ancestorElement = ancestorElement.parentElement
    ) {
      if (isHtmlElement(ancestorElement) && ancestorElement.style.length > 0) {
        relevantProps.addInlineStyleProps(ancestorElement.style);
      }
    }
  }
  const perElementPropertyNames = relevantProps?.perElementPropertyNames ?? [];
  const perElementProps: ReadonlySet<string> = new Set(perElementPropertyNames);
  const perElementLaneActions = buildPerElementLaneActions(perElementPropertyNames);
  const activeElement = rootElement.ownerDocument.activeElement;
  // Interning nests parent-key -> descriptor instead of hashing one long
  // concatenated ancestry string per element.
  const memoKeysByParentKey = new Map<number, Map<string, number>>();
  const memoizedStylesByKey = new Map<number, MemoizedElementStyles>();
  let nextMemoKey = 0;

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
      parentMemoKey !== NO_MEMO_KEY
    ) {
      const descriptor = buildStyleMemoDescriptor(
        element,
        perElementProps,
        relevantProps?.styleRelevantAttributeNames ?? null,
      );
      let descriptorKeys = memoKeysByParentKey.get(parentMemoKey);
      if (descriptorKeys === undefined) {
        descriptorKeys = new Map();
        memoKeysByParentKey.set(parentMemoKey, descriptorKeys);
      }
      const internedKey = descriptorKeys.get(descriptor);
      if (internedKey === undefined) {
        memoKey = nextMemoKey++;
        descriptorKeys.set(descriptor, memoKey);
      } else {
        memoKey = internedKey;
      }
    }
    // The active element can carry UA focus styling (e.g. :focus-visible
    // outline) that peers with an identical descriptor lack, so it neither
    // reads nor seeds the memo cache; its descendants still memoize because
    // author :focus rules already force the memo off entirely.
    const isMemoExcluded = element === activeElement;
    const memoized =
      memoKey !== NO_MEMO_KEY && !isMemoExcluded ? memoizedStylesByKey.get(memoKey) : undefined;
    const computedStyle = defaultView.getComputedStyle(element);
    let styles: StyleDeclarationMap;
    if (memoized) {
      // Prototype delegation instead of spreading ~340 shared properties per
      // memo hit; absent per-element values shadow the base with undefined,
      // which every consumer already treats as "not present".
      styles = Object.create(memoized.styles);
      applyPerElementLaneReads(
        styles,
        computedStyle,
        perElementPropertyNames,
        perElementLaneActions,
      );
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
          perElementLaneActions,
          memoized.beforeStyles,
        );
        afterStyles = snapshotTrustedMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          perElementPropertyNames,
          perElementLaneActions,
          memoized.afterStyles,
        );
      } else if (memoized) {
        beforeStyles = snapshotMemoizedPseudoStyles(
          element,
          "::before",
          defaultView,
          relevantPropertyNames,
          perElementPropertyNames,
          perElementLaneActions,
          memoized.beforeStyles,
        );
        afterStyles = snapshotMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          relevantPropertyNames,
          perElementPropertyNames,
          perElementLaneActions,
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
    if (memoKey !== NO_MEMO_KEY && !memoized && !isMemoExcluded) {
      memoizedStylesByKey.set(memoKey, { styles, beforeStyles, afterStyles });
    }
    const overflowX = styles["overflow-x"];
    const overflowY = styles["overflow-y"];
    const canHoldScrollOffset =
      element.localName === "html" ||
      element.localName === "body" ||
      (overflowX !== undefined && overflowX !== "visible") ||
      (overflowY !== undefined && overflowY !== "visible");
    snapshotByElement.set(element, {
      styles,
      beforeStyles,
      afterStyles,
      firstLetterStyles: pseudoPreflight.definesFirstLetter
        ? snapshotFirstLetterStyles(element, defaultView)
        : null,
      markerStyles: captureMarker ? snapshotMarkerStyles(element, defaultView) : null,
      parentElement,
      // Viewport scroll lives on html/body regardless of their computed
      // overflow, so only non-root elements skip the (layout-flushing)
      // scroll reads when overflow keeps them unscrollable.
      scrollLeft: canHoldScrollOffset ? element.scrollLeft : 0,
      scrollTop: canHoldScrollOffset ? element.scrollTop : 0,
      memoKey: isMemoExcluded ? NO_MEMO_KEY : memoKey,
    });
    if (UNRECURSED_CLONE_TAGS.has(element.localName)) return;
    if (prunedElements?.has(element)) return;
    const childIsInShadowTree = isInShadowTree || Boolean(element.shadowRoot);
    for (const childNode of getComposedChildNodes(element, childIsInShadowTree)) {
      if (isElementNode(childNode)) visit(childNode, element, childIsInShadowTree, memoKey);
    }
  };

  visit(rootElement, null, false, 0);
  return { snapshotByElement, perElementPropertyNames };
};
