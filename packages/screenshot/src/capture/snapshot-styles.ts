import {
  FULL_SNAPSHOT_TAGS,
  PERSISTED_MEMO_STORE_ENTRY_CAP,
  SKIPPED_CLONE_TAGS,
  SVG_NAMESPACE_URI,
  SVG_TEMPLATE_CONTAINER_TAGS,
  UNRECURSED_CLONE_TAGS,
} from "../constants";
import type {
  ComposedTreeSnapshot,
  ElementReadSnapshot,
  InlineStyleScan,
  MemoizedElementStyles,
  StyleDeclarationMap,
} from "../types";
import { countAccessibleCssRules } from "./capture-reuse";
import {
  getDocumentAttributeGeneration,
  getDocumentStyleEpoch,
  getAttributeGenerationByElement,
} from "./document-change-tracker";
import { buildInlineStyleScan } from "../utils/build-inline-style-scan";
import { buildParsedInlineStyleScan } from "../utils/build-parsed-inline-style-scan";
import { parseInlineStyleDeclarations } from "../utils/parse-inline-style-declarations";
import { buildStyleMemoDescriptor } from "../utils/build-style-memo-descriptor";
import { collectInlineStyleFeed } from "../utils/collect-inline-style-feed";
import { getComposedChildNodes } from "../utils/get-composed-child-nodes";
import { isElementNode } from "../utils/is-element-node";
import { isHtmlElement } from "../utils/is-html-element";
import { isReplacedElement } from "../utils/is-replaced-element";
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

interface PersistedElementMemoKey {
  memoKey: number;
  parentMemoKey: number;
}

interface PersistentMemoStore {
  signature: string;
  memoKeysByParentKey: Map<number, Map<string, number>>;
  memoizedStylesByKey: Map<number, MemoizedElementStyles>;
  variantEmittedStyles: Map<number, Map<string, StyleDeclarationMap>>;
  memoKeyByElement: WeakMap<Element, PersistedElementMemoKey>;
  attributeGeneration: number;
  nextMemoKey: number;
}

interface PersistentInlineScanStore {
  sheetSignature: string;
  laneSignature: string;
  scanByText: Map<string, InlineStyleScan>;
  dedupedFeed: readonly (readonly [string, string])[];
  feedScanCount: number;
}

const persistentMemoStoreByDocument = new WeakMap<Document, PersistentMemoStore>();
const persistentInlineScanStoreByDocument = new WeakMap<Document, PersistentInlineScanStore>();

const hasRunningAnimations = (sourceDocument: Document): boolean =>
  typeof sourceDocument.getAnimations !== "function" || sourceDocument.getAnimations().length > 0;

export const snapshotComposedTree = (
  rootElement: Element,
  defaultView: Window & typeof globalThis,
  filterNode: ((element: Element) => boolean) | undefined,
  prunedElements: ReadonlySet<Element> | undefined,
): ComposedTreeSnapshot => {
  const snapshotByElement = new Map<Element, ElementReadSnapshot>();
  const inlineCarryTextByElement = new Map<Element, string>();
  const pseudoPreflight = preflightPseudoRules(rootElement.ownerDocument);
  // Parsed inline scans are pure functions of the style text under fixed
  // stylesheets and a fixed per-element lane, so they persist across captures.
  // Their registry feeds (or on first capture, a pre-scan of every style
  // attribute under the root) replay inside registry creation — before the
  // lane and the relevant-prop count are derived — so inline declarations
  // never surface as memo-disabling mid-walk additions.
  const sheetSignature =
    `${countAccessibleCssRules(rootElement.ownerDocument)}|` +
    `${getDocumentStyleEpoch(rootElement.ownerDocument)}`;
  const persistedScanStore = persistentInlineScanStoreByDocument.get(rootElement.ownerDocument);
  const isScanStoreSheetValid =
    persistedScanStore !== undefined && persistedScanStore.sheetSignature === sheetSignature;
  const inlineFeed = isScanStoreSheetValid
    ? persistedScanStore.dedupedFeed
    : collectInlineStyleFeed(rootElement);
  let relevantProps = createRelevantStylePropRegistry(rootElement.ownerDocument, inlineFeed);
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
  const laneSignature = perElementPropertyNames.join(",");
  const inlineStyleScanByText =
    isScanStoreSheetValid && persistedScanStore.laneSignature === laneSignature
      ? persistedScanStore.scanByText
      : new Map<string, InlineStyleScan>();
  const captureLocalScanByText = new Map<string, InlineStyleScan>();
  const perElementLaneActions = buildPerElementLaneActions(perElementPropertyNames);
  // A lane property whose instability comes only from memo-safe, pseudo-free
  // selectors varies only inside the classes matching them; the seed's match
  // result (pinned by the memo descriptor chain) decides whether hits in its
  // class can skip the per-element read.
  const laneUnstableSelectors = perElementPropertyNames.map((lanePropertyName) => {
    const unstableSelectorList = relevantProps?.getUnstableSelectorList(lanePropertyName) ?? null;
    return unstableSelectorList !== null && unstableSelectorList.length > 0
      ? unstableSelectorList.join(",")
      : null;
  });
  const hasConditionalLaneProps = laneUnstableSelectors.some(
    (unstableSelector) => unstableSelector !== null,
  );
  const buildLaneSkipMask = (seedElement: Element): readonly boolean[] | null => {
    if (!hasConditionalLaneProps) return null;
    let skipMask: boolean[] | null = null;
    for (let laneIndex = 0; laneIndex < laneUnstableSelectors.length; laneIndex++) {
      const unstableSelector = laneUnstableSelectors[laneIndex];
      if (unstableSelector === null) continue;
      let doesSeedMatch = true;
      try {
        doesSeedMatch = seedElement.matches(unstableSelector);
      } catch {
        doesSeedMatch = true;
      }
      if (!doesSeedMatch) {
        skipMask ??= new Array<boolean>(laneUnstableSelectors.length).fill(false);
        skipMask[laneIndex] = true;
      }
    }
    return skipMask;
  };
  const activeElement = rootElement.ownerDocument.activeElement;
  // Memo-safe selectors plus the descriptor chain fully determine every
  // non-lane computed value, so with unchanged stylesheets and no running
  // animations or transitions the memo cache stays valid across captures of
  // the same document; unique-descriptor elements then pay only lane reads
  // instead of a full snapshot on every repeat capture.
  const initialRelevantPropCount = relevantProps?.propertyNames.length ?? 0;
  const memoStoreSignature =
    relevantProps !== null &&
    relevantProps.isStyleMemoSafe() &&
    !hasRunningAnimations(rootElement.ownerDocument)
      ? `${countAccessibleCssRules(rootElement.ownerDocument)}|` +
        `${getDocumentStyleEpoch(rootElement.ownerDocument)}|` +
        `${defaultView.innerWidth}x${defaultView.innerHeight}x${defaultView.devicePixelRatio}|` +
        `${initialRelevantPropCount}|${perElementPropertyNames.join(",")}`
      : null;
  const persistedStore =
    memoStoreSignature !== null
      ? persistentMemoStoreByDocument.get(rootElement.ownerDocument)
      : undefined;
  const isStoreAdopted =
    persistedStore !== undefined && persistedStore.signature === memoStoreSignature;
  // Interning nests parent-key -> descriptor instead of hashing one long
  // concatenated ancestry string per element.
  const memoKeysByParentKey = isStoreAdopted
    ? persistedStore.memoKeysByParentKey
    : new Map<number, Map<string, number>>();
  const memoizedStylesByKey = isStoreAdopted
    ? persistedStore.memoizedStylesByKey
    : new Map<number, MemoizedElementStyles>();
  const variantEmittedStyles = isStoreAdopted
    ? persistedStore.variantEmittedStyles
    : new Map<number, Map<string, StyleDeclarationMap>>();
  const memoKeyByElement = isStoreAdopted
    ? persistedStore.memoKeyByElement
    : new WeakMap<Element, PersistedElementMemoKey>();
  // The memo descriptor is a pure function of an element's own attributes and
  // inline style, so an element with no attribute mutations since the store
  // was persisted resolves to the same descriptor; its interned memo key can
  // be reused directly (parent key equality pins the ancestry) without
  // rebuilding the descriptor string.
  const adoptedAttributeGeneration = isStoreAdopted ? persistedStore.attributeGeneration : -1;
  const attributeGenerationByElement = isStoreAdopted
    ? getAttributeGenerationByElement(rootElement.ownerDocument)
    : null;
  const currentAttributeGeneration =
    memoStoreSignature !== null ? getDocumentAttributeGeneration(rootElement.ownerDocument) : -1;
  let nextMemoKey = isStoreAdopted ? persistedStore.nextMemoKey : 0;

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
    // Identical style-attribute texts parse to identical declaration lists,
    // so registry ingestion and the descriptor/carry scan both key off the
    // raw text and run once per unique text.
    let inlineStyleScan: InlineStyleScan | null = null;
    const inlineStyleText = element.getAttribute("style");
    if (inlineStyleText !== null && isHtmlElement(element)) {
      inlineStyleScan =
        inlineStyleScanByText.get(inlineStyleText) ??
        captureLocalScanByText.get(inlineStyleText) ??
        null;
      if (inlineStyleScan === null) {
        const parsedDeclarations = parseInlineStyleDeclarations(inlineStyleText);
        if (parsedDeclarations !== null) {
          inlineStyleScan = buildParsedInlineStyleScan(parsedDeclarations, perElementProps);
          if (relevantProps && inlineStyleScan.registryFeed !== null) {
            for (const [longhandName, declaredValue] of inlineStyleScan.registryFeed) {
              relevantProps.addParsedInlineDeclaration(longhandName, declaredValue);
            }
          }
          inlineStyleScanByText.set(inlineStyleText, inlineStyleScan);
        } else {
          if (relevantProps) relevantProps.addInlineStyleProps(element.style);
          inlineStyleScan = buildInlineStyleScan(element.style, perElementProps);
          captureLocalScanByText.set(inlineStyleText, inlineStyleScan);
        }
      }
    }
    const relevantPropertyNames =
      relevantProps &&
      element.namespaceURI !== SVG_NAMESPACE_URI &&
      !FULL_SNAPSHOT_TAGS.has(element.localName)
        ? relevantProps.propertyNames
        : null;
    let memoKey = NO_MEMO_KEY;
    let inlineCarryText = "";
    if (
      relevantPropertyNames &&
      relevantProps?.isStyleMemoSafe() &&
      isMemoizableHtmlElement &&
      parentMemoKey !== NO_MEMO_KEY
    ) {
      if (inlineStyleScan !== null && relevantProps.isInlineCarrySafe()) {
        inlineCarryText = inlineStyleScan.carryText;
        if (inlineCarryText !== "") inlineCarryTextByElement.set(element, inlineCarryText);
      }
      const persistedElementKey =
        attributeGenerationByElement !== null &&
        (attributeGenerationByElement.get(element) ?? 0) <= adoptedAttributeGeneration
          ? memoKeyByElement.get(element)
          : undefined;
      if (
        persistedElementKey !== undefined &&
        persistedElementKey.parentMemoKey === parentMemoKey
      ) {
        memoKey = persistedElementKey.memoKey;
      } else {
        const descriptor = buildStyleMemoDescriptor(
          element,
          relevantProps?.styleRelevantAttributeNames ?? null,
          inlineStyleScan === null
            ? ""
            : inlineCarryText !== ""
              ? inlineStyleScan.descriptorWithCarry
              : inlineStyleScan.descriptorPlain,
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
        memoKeyByElement.set(element, { memoKey, parentMemoKey });
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
        memoized.laneSkipMask,
        !isReplacedElement(element),
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
          memoized.laneSkipMask,
        );
        afterStyles = snapshotTrustedMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          perElementPropertyNames,
          perElementLaneActions,
          memoized.afterStyles,
          memoized.laneSkipMask,
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
          memoized.laneSkipMask,
        );
        afterStyles = snapshotMemoizedPseudoStyles(
          element,
          "::after",
          defaultView,
          relevantPropertyNames,
          perElementPropertyNames,
          perElementLaneActions,
          memoized.afterStyles,
          memoized.laneSkipMask,
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
      memoizedStylesByKey.set(memoKey, {
        styles,
        beforeStyles,
        afterStyles,
        laneSkipMask: buildLaneSkipMask(element),
      });
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
    if (!childIsInShadowTree) {
      for (
        let childElement = element.firstElementChild;
        childElement !== null;
        childElement = childElement.nextElementSibling
      ) {
        visit(childElement, element, false, memoKey);
      }
      return;
    }
    for (const childNode of getComposedChildNodes(element, childIsInShadowTree)) {
      if (isElementNode(childNode)) visit(childNode, element, childIsInShadowTree, memoKey);
    }
  };

  visit(rootElement, null, false, 0);
  const isStorePersistable =
    memoStoreSignature !== null &&
    relevantProps !== null &&
    relevantProps.isStyleMemoSafe() &&
    relevantProps.propertyNames.length === initialRelevantPropCount &&
    memoizedStylesByKey.size <= PERSISTED_MEMO_STORE_ENTRY_CAP;
  if (isStorePersistable) {
    persistentMemoStoreByDocument.set(rootElement.ownerDocument, {
      signature: memoStoreSignature,
      memoKeysByParentKey,
      memoizedStylesByKey,
      variantEmittedStyles,
      memoKeyByElement,
      attributeGeneration: currentAttributeGeneration,
      nextMemoKey,
    });
  } else {
    persistentMemoStoreByDocument.delete(rootElement.ownerDocument);
  }
  if (relevantProps !== null && inlineStyleScanByText.size <= PERSISTED_MEMO_STORE_ENTRY_CAP) {
    const isFeedCurrent =
      isScanStoreSheetValid &&
      persistedScanStore.scanByText === inlineStyleScanByText &&
      persistedScanStore.feedScanCount === inlineStyleScanByText.size;
    let dedupedFeed = isFeedCurrent ? persistedScanStore.dedupedFeed : null;
    if (dedupedFeed === null) {
      const seenFeedKeys = new Set<string>();
      const rebuiltFeed: (readonly [string, string])[] = [];
      for (const persistedScan of inlineStyleScanByText.values()) {
        if (persistedScan.registryFeed === null) continue;
        for (const feedEntry of persistedScan.registryFeed) {
          const feedKey = `${feedEntry[0]}|${feedEntry[1]}`;
          if (seenFeedKeys.has(feedKey)) continue;
          seenFeedKeys.add(feedKey);
          rebuiltFeed.push(feedEntry);
        }
      }
      dedupedFeed = rebuiltFeed;
    }
    persistentInlineScanStoreByDocument.set(rootElement.ownerDocument, {
      sheetSignature,
      laneSignature,
      scanByText: inlineStyleScanByText,
      dedupedFeed,
      feedScanCount: inlineStyleScanByText.size,
    });
  } else {
    persistentInlineScanStoreByDocument.delete(rootElement.ownerDocument);
  }
  return {
    snapshotByElement,
    perElementPropertyNames,
    persistedVariantEmittedStyles: isStorePersistable ? variantEmittedStyles : null,
    inlineCarryTextByElement,
  };
};
