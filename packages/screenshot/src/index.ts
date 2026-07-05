import {
  bakeBackdropFilterUnderlays,
  collectBackdropFilterElements,
  computeBackdropUnderlayClip,
} from "./capture/bake-backdrop-filters";
import {
  buildCaptureReuseOptionsKey,
  getReusableCapture,
  markRegionPromotionFailed,
  recordRegionCapture,
  shouldPromoteRegionCapture,
  storeReusableCapture,
} from "./capture/capture-reuse";
import { cloneComposedTree } from "./capture/clone-tree";
import { createStyleSandbox } from "./capture/default-styles";
import {
  applyPerElementStyleDiff,
  applyRootStyleOverrides,
  applyPaintIrrelevantElision,
  applySizeFreezingPolicy,
  canReusePerElementDiffs,
  diffMarkerStyles,
  diffStyles,
} from "./capture/diff-styles";
import { buildFontEmbedCss, collectUsedFontFamilies } from "./capture/embed-fonts";
import { createIframeBridge, requestIframeContentViaBridge } from "./capture/iframe-bridge";
import { inlineExternalResources } from "./capture/inline-resources";
import { inlineSvgUseReferences } from "./capture/inline-svg-defs";
import { applyEscapedBottomMarginTransfers } from "./capture/margin-collapse";
import { computeRootOutputGeometry } from "./capture/output-geometry";
import { createCaptureResult } from "./capture/rasterize";
import { serializeToSvgMarkup } from "./capture/serialize-svg";
import { prefetchExternalResources } from "./capture/prefetch-resources";
import { snapshotComposedTree } from "./capture/snapshot-styles";
import { createStyleRegistry } from "./capture/style-registry";
import {
  BAKED_BACKDROP_CACHE_CAP,
  DEFAULT_BLEED_PX,
  DEFAULT_REGION_CULL_MARGIN_PX,
  DEFAULT_RESOURCE_TIMEOUT_MS,
  DEFAULT_SCALE,
  FIRST_LETTER_STYLE_PROP_PREFIXES,
  MIN_CAPTURE_DIMENSION_PX,
  TRANSPARENT_BACKGROUND_COLOR,
} from "./constants";
import type {
  CaptureOptions,
  CaptureOutputGeometry,
  CaptureRegionOptions,
  CaptureRegionRect,
  CaptureResult,
  ElementReadSnapshot,
  IframeContentSnapshot,
  InternalCaptureContext,
  ResolvedCaptureOptions,
  StyleDeclarationMap,
  StyleRegistry,
  StyleSandbox,
} from "./types";
import { applyBakedBackdropBackground } from "./utils/apply-baked-backdrop-background";
import { collectRegionPrunedElements } from "./utils/collect-region-pruned-elements";
import { computeAutoBleed } from "./utils/compute-auto-bleed";
import { createFifoCache } from "./utils/create-fifo-cache";
import { findDocumentBackgroundColor } from "./utils/find-document-background-color";
import { findInheritedBackgroundColor } from "./utils/find-inherited-background-color";
import { isHtmlElement } from "./utils/is-html-element";
import { isHtmlElementOfTag } from "./utils/is-html-element-of-tag";
import { isReplacedElement } from "./utils/is-replaced-element";
import { isWebKitEngine } from "./utils/is-webkit-engine";
import { lastCaptureTimings } from "./capture/phase-timings";
import { measureImageDataUrl } from "./utils/measure-image-data-url";
import { raceWithAbortSignal } from "./utils/race-with-abort-signal";

const isFirstLetterStyleProp = (propertyName: string): boolean =>
  FIRST_LETTER_STYLE_PROP_PREFIXES.some((propPrefix) => propertyName.startsWith(propPrefix));

const diffFirstLetterStyles = (snapshot: ElementReadSnapshot): StyleDeclarationMap | null => {
  if (!snapshot.firstLetterStyles) return null;
  let diffed: StyleDeclarationMap | null = null;
  for (const propertyName in snapshot.firstLetterStyles) {
    if (!isFirstLetterStyleProp(propertyName)) continue;
    const propertyValue = snapshot.firstLetterStyles[propertyName];
    if (propertyValue === undefined || propertyValue === snapshot.styles[propertyName]) continue;
    diffed ??= {};
    diffed[propertyName] = propertyValue;
  }
  return diffed;
};

const diffPseudoStyles = (
  sandbox: StyleSandbox,
  element: Element,
  pseudoStyles: StyleDeclarationMap | null,
  pseudoSelector: string,
): StyleDeclarationMap | null => {
  if (!pseudoStyles) return null;
  const diffedPseudo = diffStyles({
    styles: pseudoStyles,
    baseline: sandbox.getBaseline(element, pseudoSelector, pseudoStyles),
    parentStyles: null,
    parentEmittedStyles: null,
  });
  applySizeFreezingPolicy(diffedPseudo, pseudoStyles, null, false, null);
  applyPaintIrrelevantElision(diffedPseudo, pseudoStyles);
  diffedPseudo["content"] = pseudoStyles["content"] ?? "none";
  return diffedPseudo;
};

interface CachedPseudoDiffs {
  beforeDiff: StyleDeclarationMap | null;
  afterDiff: StyleDeclarationMap | null;
}

const bakedBackdropPngCache = createFifoCache<string[]>(BAKED_BACKDROP_CACHE_CAP);

const VARIANT_KEY_SEPARATOR = "\x1f";

// Memo-hit style maps delegate to the seed's map through their prototype, so
// only own per-element-lane properties whose value actually shadows the
// seed's can distinguish variants inside a memo class; the key encodes just
// those deviations (indexed so different properties with equal values cannot
// collide). Probing the lane names directly avoids the per-element array
// Object.keys would allocate.
const appendStyleDeviations = (
  variantKey: string,
  styles: StyleDeclarationMap,
  perElementPropertyNames: readonly string[],
): string => {
  const seedStyles: StyleDeclarationMap | null = Object.getPrototypeOf(styles);
  for (let propertyIndex = 0; propertyIndex < perElementPropertyNames.length; propertyIndex++) {
    const propertyName = perElementPropertyNames[propertyIndex];
    if (!Object.hasOwn(styles, propertyName)) continue;
    const ownValue = styles[propertyName];
    if (seedStyles !== null && seedStyles[propertyName] === ownValue) continue;
    variantKey += `${VARIANT_KEY_SEPARATOR}${propertyIndex}:${ownValue ?? ""}`;
  }
  return variantKey;
};

const appendPseudoVariantPart = (
  variantKey: string,
  pseudoStyles: StyleDeclarationMap | null,
  perElementPropertyNames: readonly string[],
): string => {
  if (pseudoStyles === null) return `${variantKey}${VARIANT_KEY_SEPARATOR}\x00`;
  variantKey += `${VARIANT_KEY_SEPARATOR}${pseudoStyles["content"] ?? ""}`;
  return appendStyleDeviations(variantKey, pseudoStyles, perElementPropertyNames);
};

const buildVariantKey = (
  snapshot: ElementReadSnapshot,
  parentDisplay: string | null,
  perElementPropertyNames: readonly string[],
): string => {
  let variantKey = parentDisplay ?? "";
  variantKey = appendStyleDeviations(variantKey, snapshot.styles, perElementPropertyNames);
  variantKey = appendPseudoVariantPart(variantKey, snapshot.beforeStyles, perElementPropertyNames);
  return appendPseudoVariantPart(variantKey, snapshot.afterStyles, perElementPropertyNames);
};

const reusePseudoDiff = (
  cachedDiff: StyleDeclarationMap | null,
  sandbox: StyleSandbox,
  element: Element,
  pseudoStyles: StyleDeclarationMap | null,
  pseudoSelector: string,
  perElementPropertyNames: readonly string[],
): StyleDeclarationMap | null => {
  if (!pseudoStyles) return null;
  if (!cachedDiff || cachedDiff["content"] !== (pseudoStyles["content"] ?? "none")) {
    return diffPseudoStyles(sandbox, element, pseudoStyles, pseudoSelector);
  }
  const diffedPseudo: StyleDeclarationMap = { ...cachedDiff };
  applyPerElementStyleDiff(
    diffedPseudo,
    pseudoStyles,
    sandbox.getBaseline(element, pseudoSelector, pseudoStyles),
    perElementPropertyNames,
  );
  applySizeFreezingPolicy(diffedPseudo, pseudoStyles, null, false, null);
  applyPaintIrrelevantElision(diffedPseudo, pseudoStyles);
  diffedPseudo["content"] = pseudoStyles["content"] ?? "none";
  return diffedPseudo;
};

const buildClassNameMap = (
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  perElementPropertyNames: readonly string[],
  sandbox: StyleSandbox,
  registry: StyleRegistry,
  rootElement: Element,
  outputGeometry: CaptureOutputGeometry,
  suppressedBackdropElements: Set<Element> | null,
  bakedBackdropPngByElement: Map<Element, string>,
  persistedVariantEmittedStyles: Map<number, Map<string, StyleDeclarationMap>> | null,
): Map<Element, string> => {
  const classNameByElement = new Map<Element, string>();
  const emittedStylesByElement = new Map<Element, StyleDeclarationMap>();
  const canReuseDiffs = canReusePerElementDiffs(perElementPropertyNames);
  const cachedDiffByMemoKey = new Map<number, StyleDeclarationMap>();
  // Baselines are keyed by tag/input-type/font-size, all pinned by the memo
  // key, so the per-element key-building and cache lookup inside getBaseline
  // collapses to one number-keyed lookup per memo class.
  const baselineByMemoKey = new Map<number, StyleDeclarationMap>();
  const getElementBaseline = (
    element: Element,
    snapshot: ElementReadSnapshot,
  ): StyleDeclarationMap => {
    if (snapshot.memoKey === -1) return sandbox.getBaseline(element, null, snapshot.styles);
    let baseline = baselineByMemoKey.get(snapshot.memoKey);
    if (baseline === undefined) {
      baseline = sandbox.getBaseline(element, null, snapshot.styles);
      baselineByMemoKey.set(snapshot.memoKey, baseline);
    }
    return baseline;
  };
  const variantKeyByElement = new Map<Element, string>();
  // Variant emitted maps are pure functions of the memoized styles, the
  // variant key, and the tag baselines, so they persist alongside the memo
  // store and let repeat captures skip the diff/freeze pass entirely.
  const emittedStylesByVariant =
    persistedVariantEmittedStyles ?? new Map<number, Map<string, StyleDeclarationMap>>();
  for (const [element, snapshot] of snapshotByElement) {
    const parentSnapshot = snapshot.parentElement
      ? snapshotByElement.get(snapshot.parentElement)
      : undefined;
    // Elements sharing a memo key and identical per-element values (plus the
    // parent display feeding the freeze policy) produce byte-identical emitted
    // maps, so the whole diff/freeze pass runs once per variant and repeats
    // share the object (margin transfers copy-on-write before mutating).
    const canShareEmittedStyles =
      canReuseDiffs &&
      snapshot.memoKey !== -1 &&
      element !== rootElement &&
      !suppressedBackdropElements?.has(element) &&
      !bakedBackdropPngByElement.has(element);
    let variantEmittedStyles: Map<string, StyleDeclarationMap> | undefined;
    if (canShareEmittedStyles) {
      const variantKey = buildVariantKey(
        snapshot,
        parentSnapshot?.styles["display"] ?? null,
        perElementPropertyNames,
      );
      variantKeyByElement.set(element, variantKey);
      variantEmittedStyles = emittedStylesByVariant.get(snapshot.memoKey);
      if (variantEmittedStyles === undefined) {
        variantEmittedStyles = new Map();
        emittedStylesByVariant.set(snapshot.memoKey, variantEmittedStyles);
      } else {
        const sharedEmittedStyles = variantEmittedStyles.get(variantKey);
        if (sharedEmittedStyles !== undefined) {
          emittedStylesByElement.set(element, sharedEmittedStyles);
          continue;
        }
      }
    }
    const cachedDiff =
      canReuseDiffs && snapshot.memoKey !== -1
        ? cachedDiffByMemoKey.get(snapshot.memoKey)
        : undefined;
    let diffedBase: StyleDeclarationMap;
    if (cachedDiff) {
      diffedBase = { ...cachedDiff };
      applyPerElementStyleDiff(
        diffedBase,
        snapshot.styles,
        getElementBaseline(element, snapshot),
        perElementPropertyNames,
      );
    } else {
      diffedBase = diffStyles({
        styles: snapshot.styles,
        baseline: getElementBaseline(element, snapshot),
        parentStyles: parentSnapshot?.styles ?? null,
        parentEmittedStyles: snapshot.parentElement
          ? (emittedStylesByElement.get(snapshot.parentElement) ?? null)
          : null,
      });
      if (canReuseDiffs && snapshot.memoKey !== -1) {
        cachedDiffByMemoKey.set(snapshot.memoKey, { ...diffedBase });
      }
    }
    applySizeFreezingPolicy(
      diffedBase,
      snapshot.styles,
      parentSnapshot?.styles["display"] ?? null,
      isReplacedElement(element),
      element.localName,
    );
    applyPaintIrrelevantElision(diffedBase, snapshot.styles);
    if (isHtmlElementOfTag(element, "iframe")) {
      const displayValue = snapshot.styles["display"] ?? "inline";
      diffedBase["display"] = displayValue === "inline" ? "inline-block" : displayValue;
    }
    // A content-visibility:auto subtree skipped for being far from the live
    // viewport would rasterize empty in the standalone SVG document, so the
    // clone forces its contents to render (contain-intrinsic-size is ignored
    // once visible, and cv:hidden is preserved).
    if (diffedBase["content-visibility"] === "auto") {
      diffedBase["content-visibility"] = "visible";
    }
    if (element === rootElement) {
      applyRootStyleOverrides(diffedBase, outputGeometry);
    }
    if (suppressedBackdropElements?.has(element)) {
      diffedBase["visibility"] = "hidden";
      delete diffedBase["backdrop-filter"];
    }
    const bakedBackdropPngDataUrl = bakedBackdropPngByElement.get(element);
    if (bakedBackdropPngDataUrl) {
      applyBakedBackdropBackground(diffedBase, snapshot.styles, bakedBackdropPngDataUrl);
    }
    emittedStylesByElement.set(element, diffedBase);
    if (variantEmittedStyles) {
      variantEmittedStyles.set(variantKeyByElement.get(element) ?? "", diffedBase);
    }
  }
  const marginTransferredElements = applyEscapedBottomMarginTransfers(
    rootElement,
    snapshotByElement,
    emittedStylesByElement,
  );
  const cachedPseudoDiffsByMemoKey = new Map<number, CachedPseudoDiffs>();
  const variantClassNamesByMemoKey = new Map<number, Map<string, string>>();
  for (const [element, snapshot] of snapshotByElement) {
    const diffedBase = emittedStylesByElement.get(element);
    if (!diffedBase) continue;
    // Baselines are keyed by tag/input-type/pseudo/font-size, and a shared
    // memo key pins all of those (font-size is never in the per-element lane
    // when diff reuse is on), so two memo-identical elements whose per-element
    // values also match are guaranteed to register the exact same rule.
    const canReuseSeedClassName =
      canReuseDiffs &&
      snapshot.memoKey !== -1 &&
      element !== rootElement &&
      snapshot.firstLetterStyles === null &&
      snapshot.markerStyles === null &&
      !marginTransferredElements.has(element) &&
      !suppressedBackdropElements?.has(element) &&
      !bakedBackdropPngByElement.has(element);
    const parentSnapshot = snapshot.parentElement
      ? snapshotByElement.get(snapshot.parentElement)
      : undefined;
    const parentDisplay = parentSnapshot?.styles["display"] ?? null;
    let variantClassNames: Map<string, string> | undefined;
    let variantKey = "";
    if (canReuseSeedClassName) {
      variantKey =
        variantKeyByElement.get(element) ??
        buildVariantKey(snapshot, parentDisplay, perElementPropertyNames);
      variantClassNames = variantClassNamesByMemoKey.get(snapshot.memoKey);
      if (variantClassNames === undefined) {
        variantClassNames = new Map();
        variantClassNamesByMemoKey.set(snapshot.memoKey, variantClassNames);
      } else {
        const variantClassName = variantClassNames.get(variantKey);
        if (variantClassName !== undefined) {
          classNameByElement.set(element, variantClassName);
          continue;
        }
      }
    }
    const cachedPseudoDiffs =
      canReuseDiffs && snapshot.memoKey !== -1
        ? cachedPseudoDiffsByMemoKey.get(snapshot.memoKey)
        : undefined;
    let beforeDiff: StyleDeclarationMap | null;
    let afterDiff: StyleDeclarationMap | null;
    if (cachedPseudoDiffs) {
      beforeDiff = reusePseudoDiff(
        cachedPseudoDiffs.beforeDiff,
        sandbox,
        element,
        snapshot.beforeStyles,
        "::before",
        perElementPropertyNames,
      );
      afterDiff = reusePseudoDiff(
        cachedPseudoDiffs.afterDiff,
        sandbox,
        element,
        snapshot.afterStyles,
        "::after",
        perElementPropertyNames,
      );
    } else {
      beforeDiff = diffPseudoStyles(sandbox, element, snapshot.beforeStyles, "::before");
      afterDiff = diffPseudoStyles(sandbox, element, snapshot.afterStyles, "::after");
      if (canReuseDiffs && snapshot.memoKey !== -1) {
        cachedPseudoDiffsByMemoKey.set(snapshot.memoKey, {
          beforeDiff: beforeDiff ? { ...beforeDiff } : null,
          afterDiff: afterDiff ? { ...afterDiff } : null,
        });
      }
    }
    const className = registry.register(
      diffedBase,
      beforeDiff,
      afterDiff,
      diffFirstLetterStyles(snapshot),
      diffMarkerStyles(snapshot.markerStyles, snapshot.styles),
    );
    classNameByElement.set(element, className);
    if (variantClassNames) variantClassNames.set(variantKey, className);
  }
  return classNameByElement;
};

const activeCaptureDocuments = new Set<Document>();

const resolveCrossOriginIframeContent = async (
  iframe: HTMLIFrameElement,
  options: ResolvedCaptureOptions,
): Promise<IframeContentSnapshot | null> => {
  if (options.resolveIframeContent) {
    try {
      const resolvedDataUrl = await options.resolveIframeContent(iframe);
      if (resolvedDataUrl) {
        const measuredSize = await measureImageDataUrl(resolvedDataUrl);
        if (measuredSize) {
          return {
            pngDataUrl: resolvedDataUrl,
            widthPx: measuredSize.widthPx,
            heightPx: measuredSize.heightPx,
            canvasBackgroundColor: null,
          };
        }
      }
    } catch {
      // A failed hook falls through to the postMessage bridge attempt.
    }
  }
  return requestIframeContentViaBridge(iframe, options.pixelRatio);
};

const captureIframeContents = async (
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  options: ResolvedCaptureOptions,
): Promise<Map<Element, IframeContentSnapshot>> => {
  const iframeContentByElement = new Map<Element, IframeContentSnapshot>();
  const crossOriginIframes: HTMLIFrameElement[] = [];
  for (const element of snapshotByElement.keys()) {
    if (!isHtmlElementOfTag(element, "iframe")) continue;
    const contentDocument = element.contentDocument;
    const contentRoot = contentDocument?.documentElement;
    if (!contentDocument || !contentRoot || !contentDocument.defaultView) {
      crossOriginIframes.push(element);
      continue;
    }
    if (activeCaptureDocuments.has(contentDocument)) continue;
    try {
      const nestedResult = await captureNode(contentRoot, {
        scale: 1,
        pixelRatio: options.pixelRatio,
        embedFonts: options.embedFonts,
        timeoutMs: options.timeoutMs,
        abortSignal: options.abortSignal,
      });
      iframeContentByElement.set(element, {
        pngDataUrl: await nestedResult.toPngDataUrl(),
        widthPx: nestedResult.width,
        heightPx: nestedResult.height,
        canvasBackgroundColor: findDocumentBackgroundColor(contentDocument),
      });
    } catch (nestedCaptureError) {
      if (options.abortSignal?.aborted) throw nestedCaptureError;
      // A failed nested capture falls back to the flat iframe placeholder.
    }
  }
  const crossOriginSnapshots = await Promise.all(
    crossOriginIframes.map((iframe) => resolveCrossOriginIframeContent(iframe, options)),
  );
  for (let iframeIndex = 0; iframeIndex < crossOriginIframes.length; iframeIndex += 1) {
    const contentSnapshot = crossOriginSnapshots[iframeIndex];
    if (contentSnapshot)
      iframeContentByElement.set(crossOriginIframes[iframeIndex], contentSnapshot);
  }
  return iframeContentByElement;
};

const captureNodeInternal = async (
  element: Element,
  resolvedOptions: ResolvedCaptureOptions,
  internalContext: InternalCaptureContext,
): Promise<CaptureResult> => {
  const ownerDocument = element.ownerDocument;
  const defaultView = ownerDocument.defaultView;
  if (!defaultView) throw new Error("captureNode requires an element attached to a window");
  if (!element.isConnected) {
    throw new Error("captureNode requires an element attached to a document");
  }
  resolvedOptions.abortSignal?.throwIfAborted();
  activeCaptureDocuments.add(ownerDocument);
  try {
    if (ownerDocument.fonts.status !== "loaded") {
      await raceWithAbortSignal(ownerDocument.fonts.ready, resolvedOptions.abortSignal);
    }
    const reuseOptionsKey =
      !internalContext.skipBackdropFilterBaking &&
      internalContext.suppressedBackdropElements === null
        ? buildCaptureReuseOptionsKey(resolvedOptions)
        : null;
    if (reuseOptionsKey !== null) {
      const reusableCapture = getReusableCapture(element, reuseOptionsKey);
      if (reusableCapture) {
        resolvedOptions.backgroundColor = reusableCapture.resolvedBackgroundColor;
        return createCaptureResult(
          reusableCapture.svgMarkup,
          reusableCapture.widthPx,
          reusableCapture.heightPx,
          resolvedOptions,
          reusableCapture.clipRect,
        );
      }
    }
    const boundingRect = element.getBoundingClientRect();
    const boundingBoxWidth = Math.ceil(boundingRect.right) - Math.floor(boundingRect.left);
    const boundingBoxHeight = Math.ceil(boundingRect.bottom) - Math.floor(boundingRect.top);
    // getBoundingClientRect returns the post-transform box; descendants are frozen at
    // untransformed layout sizes, so the capture rect must use layout pixels too.
    const layoutWidth = isHtmlElement(element) ? element.offsetWidth : 0;
    const layoutHeight = isHtmlElement(element) ? element.offsetHeight : 0;
    const captureWidth = Math.max(
      MIN_CAPTURE_DIMENSION_PX,
      layoutWidth > 0 ? layoutWidth : boundingBoxWidth,
    );
    const captureHeight = Math.max(
      MIN_CAPTURE_DIMENSION_PX,
      layoutHeight > 0 ? layoutHeight : boundingBoxHeight,
    );
    prefetchExternalResources(element, resolvedOptions.timeoutMs);
    const snapshotStartMs = performance.now();
    const {
      snapshotByElement,
      perElementPropertyNames,
      persistedVariantEmittedStyles,
      inlineCarryTextByElement,
    } =
      internalContext.presnapshottedTree ??
      snapshotComposedTree(
        element,
        defaultView,
        resolvedOptions.filterNode,
        resolvedOptions.prunedElements,
      );
    lastCaptureTimings.snapshotMs = performance.now() - snapshotStartMs;
    const rootSnapshot = snapshotByElement.get(element);
    if (!rootSnapshot) {
      throw new Error("captureNode target was excluded by filterNode or is not capturable");
    }
    const bleedPx =
      resolvedOptions.bleed === "auto"
        ? computeAutoBleed(rootSnapshot.styles)
        : Math.max(0, Math.ceil(resolvedOptions.bleed));
    const outputGeometry = computeRootOutputGeometry({
      rootElement: element,
      rootStyles: rootSnapshot.styles,
      defaultView,
      layoutWidthPx: captureWidth,
      layoutHeightPx: captureHeight,
      bleedPx,
    });
    const clipRect = resolvedOptions.clip
      ? {
          x: resolvedOptions.clip.x + outputGeometry.contentOffsetLeftPx,
          y: resolvedOptions.clip.y + outputGeometry.contentOffsetTopPx,
          width: resolvedOptions.clip.width,
          height: resolvedOptions.clip.height,
        }
      : null;
    if (resolvedOptions.backgroundColor === undefined) {
      const rootBackgroundColor = rootSnapshot.styles["background-color"];
      const isRootBackgroundTransparent =
        !rootBackgroundColor ||
        rootBackgroundColor === TRANSPARENT_BACKGROUND_COLOR ||
        rootBackgroundColor === "transparent";
      // A transformed root exposes the page backdrop in the output AABB corners
      // (and bleed exposes it around the border box), so the inherited
      // background fills them like the on-screen backdrop does.
      if (isRootBackgroundTransparent || outputGeometry.rootLinearTransform || bleedPx > 0) {
        resolvedOptions.backgroundColor = findInheritedBackgroundColor(element) || undefined;
      }
    }
    const iframesStartMs = performance.now();
    const iframeContentByElement = await captureIframeContents(snapshotByElement, resolvedOptions);
    lastCaptureTimings.iframesMs = performance.now() - iframesStartMs;
    resolvedOptions.abortSignal?.throwIfAborted();
    let bakedBackdropPngByElement = new Map<Element, string>();
    const backdropStartMs = performance.now();
    if (!internalContext.skipBackdropFilterBaking) {
      const backdropFilterElements = collectBackdropFilterElements(snapshotByElement, element);
      if (backdropFilterElements.length > 0) {
        const paneRects = backdropFilterElements.map((backdropElement) =>
          backdropElement.getBoundingClientRect(),
        );
        // The clip rect and the bake's pixel reads share the untransformed
        // root box coordinate space, which a transformed root breaks.
        const underlayClip = outputGeometry.rootLinearTransform
          ? undefined
          : computeBackdropUnderlayClip(
              backdropFilterElements,
              paneRects,
              snapshotByElement,
              boundingRect,
            );
        const underlayResult = await captureNodeInternal(
          element,
          { ...resolvedOptions, scale: 1, bleed: 0, clip: underlayClip },
          {
            suppressedBackdropElements: new Set(backdropFilterElements),
            skipBackdropFilterBaking: true,
            presnapshottedTree: {
              snapshotByElement,
              perElementPropertyNames,
              persistedVariantEmittedStyles,
              inlineCarryTextByElement,
            },
          },
        );
        // The underlay markup plus each pane's device rect and filter fully
        // determine the baked pixels, so an unchanged tree reuses the previous
        // bake instead of re-rendering the blur and re-encoding pane PNGs.
        const bakeCacheKey =
          `${resolvedOptions.pixelRatio}|${resolvedOptions.backgroundColor ?? ""}|` +
          `${underlayClip?.x ?? 0},${underlayClip?.y ?? 0}|` +
          backdropFilterElements
            .map(
              (backdropElement, paneIndex) =>
                `${paneRects[paneIndex].x},${paneRects[paneIndex].y},` +
                `${paneRects[paneIndex].width},${paneRects[paneIndex].height},` +
                `${snapshotByElement.get(backdropElement)?.styles["backdrop-filter"] ?? ""}`,
            )
            .join(";") +
          `|${await underlayResult.toSvgDataUrl()}`;
        const cachedPaneList = bakedBackdropPngCache.get(bakeCacheKey);
        if (cachedPaneList && cachedPaneList.length === backdropFilterElements.length) {
          backdropFilterElements.forEach((backdropElement, paneIndex) => {
            const bakedPng = cachedPaneList[paneIndex];
            if (bakedPng) bakedBackdropPngByElement.set(backdropElement, bakedPng);
          });
        } else {
          bakedBackdropPngByElement = bakeBackdropFilterUnderlays({
            underlayCanvas: await underlayResult.toCanvas(),
            ownerDocument,
            rootElement: element,
            backdropFilterElements,
            snapshotByElement,
            pixelRatio: resolvedOptions.pixelRatio,
            backgroundColor: resolvedOptions.backgroundColor,
            underlayOffsetLeftPx: underlayClip?.x ?? 0,
            underlayOffsetTopPx: underlayClip?.y ?? 0,
          });
          bakedBackdropPngCache.set(
            bakeCacheKey,
            backdropFilterElements.map(
              (backdropElement) => bakedBackdropPngByElement.get(backdropElement) ?? "",
            ),
          );
        }
      }
    }
    lastCaptureTimings.backdropMs = performance.now() - backdropStartMs;
    resolvedOptions.abortSignal?.throwIfAborted();
    const sandbox = createStyleSandbox(ownerDocument);
    let svgMarkup: string;
    try {
      const buildStartMs = performance.now();
      const registry = createStyleRegistry();
      const classNameByElement = buildClassNameMap(
        snapshotByElement,
        perElementPropertyNames,
        sandbox,
        registry,
        element,
        outputGeometry,
        internalContext.suppressedBackdropElements,
        bakedBackdropPngByElement,
        persistedVariantEmittedStyles,
      );
      const clone = cloneComposedTree(element, {
        ownerDocument,
        classNameByElement,
        snapshotByElement,
        cloneByElement: new Map(),
        iframeContentByElement,
        prunedElements: resolvedOptions.prunedElements,
        inlineCarryTextByElement,
      });
      if (!clone) throw new Error("captureNode could not clone the target element");
      lastCaptureTimings.buildMs = performance.now() - buildStartMs;
      const inlineStartMs = performance.now();
      // svg <use> inlining appends defs whose resources must be picked up by
      // resource inlining, so those two stay ordered; font embedding only
      // reads document @font-face rules and can overlap both.
      const inlineCloneResources = async (): Promise<void> => {
        await inlineSvgUseReferences({
          clone,
          rules: registry.rules,
          sourceDocument: ownerDocument,
          timeoutMs: resolvedOptions.timeoutMs,
        });
        await inlineExternalResources(clone, registry.rules, resolvedOptions.timeoutMs);
      };
      const [, fontEmbedCss] = await raceWithAbortSignal(
        Promise.all([
          inlineCloneResources(),
          resolvedOptions.embedFonts
            ? buildFontEmbedCss(
                collectUsedFontFamilies(registry.rules),
                ownerDocument,
                resolvedOptions.timeoutMs,
              )
            : Promise.resolve(""),
        ]),
        resolvedOptions.abortSignal,
      );
      lastCaptureTimings.inlineMs = performance.now() - inlineStartMs;
      const serializeStartMs = performance.now();
      // WebKit rasterizes a panned viewBox over foreignObject content
      // incorrectly (it fits the full page into the crop), so there the crop
      // happens at the canvas instead of inside the SVG.
      svgMarkup = serializeToSvgMarkup({
        clone,
        cssText: `${fontEmbedCss}\n${registry.toCssText()}`,
        width: outputGeometry.outputWidthPx,
        height: outputGeometry.outputHeightPx,
        clip: isWebKitEngine() ? null : clipRect,
        ownerDocument,
      });
      lastCaptureTimings.serializeMs = performance.now() - serializeStartMs;
    } finally {
      sandbox.dispose();
    }
    const isCanvasClipped = Boolean(clipRect) && isWebKitEngine();
    const resultWidthPx =
      clipRect && !isCanvasClipped ? clipRect.width : outputGeometry.outputWidthPx;
    const resultHeightPx =
      clipRect && !isCanvasClipped ? clipRect.height : outputGeometry.outputHeightPx;
    const resultClipRect = clipRect && !isCanvasClipped ? null : clipRect;
    if (reuseOptionsKey !== null) {
      storeReusableCapture(element, reuseOptionsKey, snapshotByElement, {
        svgMarkup,
        widthPx: resultWidthPx,
        heightPx: resultHeightPx,
        clipRect: resultClipRect,
        resolvedBackgroundColor: resolvedOptions.backgroundColor,
        contentOffsetLeftPx: outputGeometry.contentOffsetLeftPx,
        contentOffsetTopPx: outputGeometry.contentOffsetTopPx,
      });
    }
    return createCaptureResult(
      svgMarkup,
      resultWidthPx,
      resultHeightPx,
      resolvedOptions,
      resultClipRect,
    );
  } finally {
    activeCaptureDocuments.delete(ownerDocument);
  }
};

export const captureNode = async (
  element: Element,
  options: CaptureOptions = {},
): Promise<CaptureResult> => {
  const defaultView = element.ownerDocument.defaultView;
  if (!defaultView) throw new Error("captureNode requires an element attached to a window");
  const resolvedOptions: ResolvedCaptureOptions = {
    scale: options.scale ?? DEFAULT_SCALE,
    pixelRatio: options.pixelRatio ?? defaultView.devicePixelRatio,
    backgroundColor: options.backgroundColor,
    embedFonts: options.embedFonts ?? true,
    bleed: options.bleed ?? DEFAULT_BLEED_PX,
    clip: options.clip,
    prunedElements: undefined,
    filterNode: options.filterNode,
    resolveIframeContent: options.resolveIframeContent,
    timeoutMs: options.timeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS,
    abortSignal: options.abortSignal,
  };
  return captureNodeInternal(element, resolvedOptions, {
    suppressedBackdropElements: null,
    skipBackdropFilterBaking: false,
  });
};

export const captureRegion = async (
  region: CaptureRegionRect,
  options: CaptureRegionOptions = {},
): Promise<CaptureResult> => {
  const rootElement = options.root ?? document.documentElement;
  const defaultView = rootElement.ownerDocument.defaultView;
  if (!defaultView) throw new Error("captureRegion requires an element attached to a window");
  const rootRect = rootElement.getBoundingClientRect();
  const cullMarginPx = options.cullMarginPx ?? DEFAULT_REGION_CULL_MARGIN_PX;
  const prunedElements =
    cullMarginPx >= 0 ? collectRegionPrunedElements(rootElement, region, cullMarginPx) : undefined;
  const resolvedOptions: ResolvedCaptureOptions = {
    scale: options.scale ?? DEFAULT_SCALE,
    pixelRatio: options.pixelRatio ?? defaultView.devicePixelRatio,
    // A region can extend past the root's box into the page canvas area the
    // body background propagates to, which the capture paints as nothing; the
    // document background fills it like the on-screen canvas does.
    backgroundColor:
      options.backgroundColor ??
      findDocumentBackgroundColor(rootElement.ownerDocument) ??
      undefined,
    embedFonts: options.embedFonts ?? true,
    bleed: 0,
    clip: {
      x: region.x - rootRect.left,
      y: region.y - rootRect.top,
      width: region.width,
      height: region.height,
    },
    prunedElements,
    filterNode: options.filterNode,
    resolveIframeContent: options.resolveIframeContent,
    timeoutMs: options.timeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS,
    abortSignal: options.abortSignal,
  };
  // Repeat region captures over an unchanged document (drag selection) are
  // served by clipping one cached full-page capture at the canvas, instead of
  // re-reading and re-serializing a culled tree per rect.
  const cliplessOptions: ResolvedCaptureOptions = {
    ...resolvedOptions,
    clip: undefined,
    prunedElements: undefined,
  };
  const cliplessKey = buildCaptureReuseOptionsKey(cliplessOptions);
  if (cliplessKey !== null && resolvedOptions.clip) {
    const regionClip = resolvedOptions.clip;
    const buildClippedResultFromReuse = (): CaptureResult | null => {
      const reusableCapture = getReusableCapture(rootElement, cliplessKey);
      if (!reusableCapture || reusableCapture.clipRect !== null) return null;
      return createCaptureResult(
        reusableCapture.svgMarkup,
        reusableCapture.widthPx,
        reusableCapture.heightPx,
        { ...cliplessOptions, backgroundColor: reusableCapture.resolvedBackgroundColor },
        {
          x: regionClip.x + reusableCapture.contentOffsetLeftPx,
          y: regionClip.y + reusableCapture.contentOffsetTopPx,
          width: regionClip.width,
          height: regionClip.height,
        },
      );
    };
    const clippedFromCache = buildClippedResultFromReuse();
    if (clippedFromCache) return clippedFromCache;
    if (shouldPromoteRegionCapture(rootElement)) {
      await captureNodeInternal(rootElement, cliplessOptions, {
        suppressedBackdropElements: null,
        skipBackdropFilterBaking: false,
      });
      const promotedResult = buildClippedResultFromReuse();
      if (promotedResult) return promotedResult;
      markRegionPromotionFailed(rootElement);
    }
  }
  recordRegionCapture(rootElement);
  return captureNodeInternal(rootElement, resolvedOptions, {
    suppressedBackdropElements: null,
    skipBackdropFilterBaking: false,
  });
};

export { lastCaptureTimings } from "./capture/phase-timings";

export const enableIframeBridge = (): (() => void) =>
  createIframeBridge(async (pixelRatio) => {
    const captureResult = await captureNode(document.documentElement, { scale: 1, pixelRatio });
    return {
      pngDataUrl: await captureResult.toPngDataUrl(),
      widthPx: captureResult.width,
      heightPx: captureResult.height,
    };
  });

export type {
  CaptureOptions,
  CaptureRegionOptions,
  CaptureRegionRect,
  CaptureResult,
} from "./types";
