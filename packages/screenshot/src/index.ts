import {
  bakeBackdropFilterUnderlays,
  collectBackdropFilterElements,
} from "./capture/bake-backdrop-filters";
import { cloneComposedTree } from "./capture/clone-tree";
import { createStyleSandbox } from "./capture/default-styles";
import {
  applyPerElementStyleDiff,
  applyRootStyleOverrides,
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
import { snapshotComposedTree } from "./capture/snapshot-styles";
import { createStyleRegistry } from "./capture/style-registry";
import {
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
  diffedPseudo["content"] = pseudoStyles["content"] ?? "none";
  return diffedPseudo;
};

interface CachedPseudoDiffs {
  beforeDiff: StyleDeclarationMap | null;
  afterDiff: StyleDeclarationMap | null;
}

const VARIANT_KEY_SEPARATOR = "\x1f";

const appendPseudoVariantPart = (
  variantKey: string,
  pseudoStyles: StyleDeclarationMap | null,
  perElementPropertyNames: readonly string[],
): string => {
  if (pseudoStyles === null) return `${variantKey}${VARIANT_KEY_SEPARATOR}\x00`;
  variantKey += `${VARIANT_KEY_SEPARATOR}${pseudoStyles["content"] ?? ""}`;
  for (const propertyName of perElementPropertyNames) {
    variantKey += `${VARIANT_KEY_SEPARATOR}${pseudoStyles[propertyName] ?? ""}`;
  }
  return variantKey;
};

const buildVariantKey = (
  snapshot: ElementReadSnapshot,
  parentDisplay: string | null,
  perElementPropertyNames: readonly string[],
): string => {
  let variantKey = parentDisplay ?? "";
  for (const propertyName of perElementPropertyNames) {
    variantKey += `${VARIANT_KEY_SEPARATOR}${snapshot.styles[propertyName] ?? ""}`;
  }
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
): Map<Element, string> => {
  const classNameByElement = new Map<Element, string>();
  const emittedStylesByElement = new Map<Element, StyleDeclarationMap>();
  const canReuseDiffs = canReusePerElementDiffs(perElementPropertyNames);
  const cachedDiffByMemoKey = new Map<number, StyleDeclarationMap>();
  const variantKeyByElement = new Map<Element, string>();
  const emittedStylesByVariant = new Map<number, Map<string, StyleDeclarationMap>>();
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
        sandbox.getBaseline(element, null, snapshot.styles),
        perElementPropertyNames,
      );
    } else {
      diffedBase = diffStyles({
        styles: snapshot.styles,
        baseline: sandbox.getBaseline(element, null, snapshot.styles),
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
    const snapshotStartMs = performance.now();
    const { snapshotByElement, perElementPropertyNames } = snapshotComposedTree(
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
        const underlayResult = await captureNodeInternal(
          element,
          { ...resolvedOptions, scale: 1, bleed: 0, clip: undefined },
          {
            suppressedBackdropElements: new Set(backdropFilterElements),
            skipBackdropFilterBaking: true,
          },
        );
        bakedBackdropPngByElement = bakeBackdropFilterUnderlays({
          underlayCanvas: await underlayResult.toCanvas(),
          ownerDocument,
          rootElement: element,
          backdropFilterElements,
          snapshotByElement,
          pixelRatio: resolvedOptions.pixelRatio,
          backgroundColor: resolvedOptions.backgroundColor,
        });
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
      );
      const clone = cloneComposedTree(element, {
        ownerDocument,
        classNameByElement,
        snapshotByElement,
        cloneByElement: new Map(),
        iframeContentByElement,
        prunedElements: resolvedOptions.prunedElements,
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
    if (clipRect && !isWebKitEngine()) {
      return createCaptureResult(svgMarkup, clipRect.width, clipRect.height, resolvedOptions);
    }
    return createCaptureResult(
      svgMarkup,
      outputGeometry.outputWidthPx,
      outputGeometry.outputHeightPx,
      resolvedOptions,
      clipRect,
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
