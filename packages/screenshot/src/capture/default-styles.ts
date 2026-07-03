import {
  BASELINE_CACHE_CAP,
  SANDBOX_OFFSCREEN_LEFT_PX,
  SANDBOX_SIZE_PX,
  SVG_NAMESPACE_URI,
} from "../constants";
import type { StyleDeclarationMap, StyleSandbox } from "../types";
import { createFifoCache } from "../utils/create-fifo-cache";
import { isHtmlElementOfTag } from "../utils/is-html-element-of-tag";
import { snapshotComputedStyle } from "../utils/snapshot-computed-style";

const baselineCache = createFifoCache<StyleDeclarationMap>(BASELINE_CACHE_CAP);

const buildBaselineCacheKey = (
  element: Element,
  pseudoSelector: string | null,
  fontSize: string | undefined,
): string => {
  const namespacePrefix = element.namespaceURI === SVG_NAMESPACE_URI ? "svg|" : "";
  const inputTypeSuffix = isHtmlElementOfTag(element, "input") ? `|${element.type}` : "";
  return `${namespacePrefix}${element.localName}${inputTypeSuffix}|${pseudoSelector ?? ""}|${fontSize ?? ""}`;
};

export const createStyleSandbox = (sourceDocument: Document): StyleSandbox => {
  let sandboxIframe: HTMLIFrameElement | null = null;

  const ensureSandboxDocument = (): Document | null => {
    if (!sandboxIframe) {
      const iframe = sourceDocument.createElement("iframe");
      // Firefox computes garbage styles inside display:none iframes (Mozilla bug 548397),
      // so the sandbox is hidden off-screen instead.
      iframe.setAttribute(
        "style",
        `position:absolute;left:${SANDBOX_OFFSCREEN_LEFT_PX}px;top:0;visibility:hidden;` +
          `width:${SANDBOX_SIZE_PX}px;height:${SANDBOX_SIZE_PX}px;border:0;`,
      );
      iframe.setAttribute("aria-hidden", "true");
      (sourceDocument.body ?? sourceDocument.documentElement).appendChild(iframe);
      sandboxIframe = iframe;
    }
    return sandboxIframe.contentDocument;
  };

  const getBaseline = (
    element: Element,
    pseudoSelector: string | null,
    fontSize: string | undefined,
  ): StyleDeclarationMap => {
    const cacheKey = buildBaselineCacheKey(element, pseudoSelector, fontSize);
    const cachedBaseline = baselineCache.get(cacheKey);
    if (cachedBaseline) return cachedBaseline;
    const sandboxDocument = ensureSandboxDocument();
    const sandboxBody = sandboxDocument?.body;
    const sandboxView = sandboxDocument?.defaultView;
    if (!sandboxDocument || !sandboxBody || !sandboxView) return {};
    let probeElement: Element;
    let mountedElement: Element;
    if (element.namespaceURI === SVG_NAMESPACE_URI) {
      const svgContainer = sandboxDocument.createElementNS(SVG_NAMESPACE_URI, "svg");
      probeElement = sandboxDocument.createElementNS(SVG_NAMESPACE_URI, element.localName);
      svgContainer.appendChild(probeElement);
      mountedElement = svgContainer;
    } else {
      probeElement = sandboxDocument.createElement(element.localName);
      if (isHtmlElementOfTag(element, "input")) probeElement.setAttribute("type", element.type);
      probeElement.textContent = " ";
      mountedElement = probeElement;
    }
    if (fontSize) probeElement.setAttribute("style", `font-size:${fontSize};`);
    sandboxBody.appendChild(mountedElement);
    const baseline = snapshotComputedStyle(
      sandboxView.getComputedStyle(probeElement, pseudoSelector ?? undefined),
    );
    mountedElement.remove();
    baselineCache.set(cacheKey, baseline);
    return baseline;
  };

  const dispose = (): void => {
    sandboxIframe?.remove();
    sandboxIframe = null;
  };

  return { getBaseline, dispose };
};
