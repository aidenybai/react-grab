import { cloneComposedTree } from "./capture/clone-tree";
import { createStyleSandbox } from "./capture/default-styles";
import {
  applyRootStyleOverrides,
  applySizeFreezingPolicy,
  diffMarkerStyles,
  diffStyles,
} from "./capture/diff-styles";
import { buildFontEmbedCss, collectUsedFontFamilies } from "./capture/embed-fonts";
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
  DEFAULT_RESOURCE_TIMEOUT_MS,
  DEFAULT_SCALE,
  FIRST_LETTER_STYLE_PROP_PREFIXES,
  MIN_CAPTURE_DIMENSION_PX,
  TRANSPARENT_BACKGROUND_COLOR,
} from "./constants";
import type {
  CaptureOptions,
  CaptureOutputGeometry,
  CaptureResult,
  ElementReadSnapshot,
  IframeContentSnapshot,
  ResolvedCaptureOptions,
  StyleDeclarationMap,
  StyleRegistry,
  StyleSandbox,
} from "./types";
import { computeAutoBleed } from "./utils/compute-auto-bleed";
import { findInheritedBackgroundColor } from "./utils/find-inherited-background-color";
import { isHtmlElement } from "./utils/is-html-element";
import { isHtmlElementOfTag } from "./utils/is-html-element-of-tag";
import { isReplacedElement } from "./utils/is-replaced-element";
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

const buildClassNameMap = (
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  sandbox: StyleSandbox,
  registry: StyleRegistry,
  rootElement: Element,
  outputGeometry: CaptureOutputGeometry,
): Map<Element, string> => {
  const classNameByElement = new Map<Element, string>();
  const emittedStylesByElement = new Map<Element, StyleDeclarationMap>();
  for (const [element, snapshot] of snapshotByElement) {
    const parentSnapshot = snapshot.parentElement
      ? snapshotByElement.get(snapshot.parentElement)
      : undefined;
    const diffedBase = diffStyles({
      styles: snapshot.styles,
      baseline: sandbox.getBaseline(element, null, snapshot.styles["font-size"]),
      parentStyles: parentSnapshot?.styles ?? null,
      parentEmittedStyles: snapshot.parentElement
        ? (emittedStylesByElement.get(snapshot.parentElement) ?? null)
        : null,
    });
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
    emittedStylesByElement.set(element, diffedBase);
  }
  applyEscapedBottomMarginTransfers(rootElement, snapshotByElement, emittedStylesByElement);
  for (const [element, snapshot] of snapshotByElement) {
    const diffedBase = emittedStylesByElement.get(element);
    if (!diffedBase) continue;
    const diffPseudoStyles = (
      pseudoStyles: StyleDeclarationMap | null,
      pseudoSelector: string,
    ): StyleDeclarationMap | null => {
      if (!pseudoStyles) return null;
      const diffedPseudo = diffStyles({
        styles: pseudoStyles,
        baseline: sandbox.getBaseline(element, pseudoSelector, pseudoStyles["font-size"]),
        parentStyles: null,
        parentEmittedStyles: null,
      });
      applySizeFreezingPolicy(diffedPseudo, pseudoStyles, null, false, null);
      diffedPseudo["content"] = pseudoStyles["content"] ?? "none";
      return diffedPseudo;
    };
    classNameByElement.set(
      element,
      registry.register(
        diffedBase,
        diffPseudoStyles(snapshot.beforeStyles, "::before"),
        diffPseudoStyles(snapshot.afterStyles, "::after"),
        diffFirstLetterStyles(snapshot),
        diffMarkerStyles(snapshot.markerStyles, snapshot.styles),
      ),
    );
  }
  return classNameByElement;
};

const activeCaptureDocuments = new Set<Document>();

const captureSameOriginIframeContents = async (
  snapshotByElement: Map<Element, ElementReadSnapshot>,
  options: ResolvedCaptureOptions,
): Promise<Map<Element, IframeContentSnapshot>> => {
  const iframeContentByElement = new Map<Element, IframeContentSnapshot>();
  for (const element of snapshotByElement.keys()) {
    if (!isHtmlElementOfTag(element, "iframe")) continue;
    const contentDocument = element.contentDocument;
    const contentRoot = contentDocument?.documentElement;
    const contentView = contentDocument?.defaultView;
    if (!contentDocument || !contentRoot || !contentView) continue;
    if (activeCaptureDocuments.has(contentDocument)) continue;
    try {
      const nestedResult = await captureNode(contentRoot, {
        scale: 1,
        pixelRatio: options.pixelRatio,
        embedFonts: options.embedFonts,
        timeoutMs: options.timeoutMs,
        abortSignal: options.abortSignal,
      });
      const rootBackground = contentView.getComputedStyle(contentRoot).backgroundColor;
      const bodyBackground = contentDocument.body
        ? contentView.getComputedStyle(contentDocument.body).backgroundColor
        : "";
      const canvasBackgroundColor =
        [rootBackground, bodyBackground].find(
          (backgroundColor) => backgroundColor && backgroundColor !== TRANSPARENT_BACKGROUND_COLOR,
        ) ?? null;
      iframeContentByElement.set(element, {
        pngDataUrl: await nestedResult.toPngDataUrl(),
        widthPx: nestedResult.width,
        heightPx: nestedResult.height,
        canvasBackgroundColor,
      });
    } catch {
      // A failed nested capture falls back to the flat iframe placeholder.
    }
  }
  return iframeContentByElement;
};

export const captureNode = async (
  element: Element,
  options: CaptureOptions = {},
): Promise<CaptureResult> => {
  const ownerDocument = element.ownerDocument;
  const defaultView = ownerDocument.defaultView;
  if (!defaultView) throw new Error("captureNode requires an element attached to a window");
  if (!element.isConnected) {
    throw new Error("captureNode requires an element attached to a document");
  }
  const resolvedOptions: ResolvedCaptureOptions = {
    scale: options.scale ?? DEFAULT_SCALE,
    pixelRatio: options.pixelRatio ?? defaultView.devicePixelRatio,
    backgroundColor: options.backgroundColor,
    embedFonts: options.embedFonts ?? true,
    bleed: options.bleed ?? DEFAULT_BLEED_PX,
    filterNode: options.filterNode,
    timeoutMs: options.timeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS,
    abortSignal: options.abortSignal,
  };
  resolvedOptions.abortSignal?.throwIfAborted();
  activeCaptureDocuments.add(ownerDocument);
  try {
    await raceWithAbortSignal(ownerDocument.fonts.ready, resolvedOptions.abortSignal);
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
    const snapshotByElement = snapshotComposedTree(
      element,
      defaultView,
      resolvedOptions.filterNode,
    );
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
    const iframeContentByElement = await captureSameOriginIframeContents(
      snapshotByElement,
      resolvedOptions,
    );
    resolvedOptions.abortSignal?.throwIfAborted();
    const sandbox = createStyleSandbox(ownerDocument);
    let svgMarkup: string;
    try {
      const registry = createStyleRegistry();
      const classNameByElement = buildClassNameMap(
        snapshotByElement,
        sandbox,
        registry,
        element,
        outputGeometry,
      );
      const clone = cloneComposedTree(element, {
        ownerDocument,
        classNameByElement,
        snapshotByElement,
        cloneByElement: new Map(),
        iframeContentByElement,
      });
      if (!clone) throw new Error("captureNode could not clone the target element");
      await raceWithAbortSignal(
        inlineSvgUseReferences({
          clone,
          rules: registry.rules,
          sourceDocument: ownerDocument,
          timeoutMs: resolvedOptions.timeoutMs,
        }),
        resolvedOptions.abortSignal,
      );
      await raceWithAbortSignal(
        inlineExternalResources(clone, registry.rules, resolvedOptions.timeoutMs),
        resolvedOptions.abortSignal,
      );
      const fontEmbedCss = resolvedOptions.embedFonts
        ? await raceWithAbortSignal(
            buildFontEmbedCss(
              collectUsedFontFamilies(registry.rules),
              ownerDocument,
              resolvedOptions.timeoutMs,
            ),
            resolvedOptions.abortSignal,
          )
        : "";
      svgMarkup = serializeToSvgMarkup({
        clone,
        cssText: `${fontEmbedCss}\n${registry.toCssText()}`,
        width: outputGeometry.outputWidthPx,
        height: outputGeometry.outputHeightPx,
        ownerDocument,
      });
    } finally {
      sandbox.dispose();
    }
    return createCaptureResult(
      svgMarkup,
      outputGeometry.outputWidthPx,
      outputGeometry.outputHeightPx,
      resolvedOptions,
    );
  } finally {
    activeCaptureDocuments.delete(ownerDocument);
  }
};

export type { CaptureOptions, CaptureResult } from "./types";
