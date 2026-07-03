import {
  SVG_NAMESPACE_URI,
  SVG_URL_REFERENCE_STYLE_PROPS,
  XLINK_NAMESPACE_URI,
} from "../constants";
import type { InlineSvgUseReferencesInput } from "../types";
import { fetchAsText } from "../utils/fetch-as-text";
import { isElementNode } from "../utils/is-element-node";
import { resolveUrl } from "../utils/resolve-url";
import { sanitizeSvgSubtreeForSerialization } from "../utils/sanitize-svg-subtree";

const URL_FRAGMENT_REFERENCE_PATTERN = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/g;

const readUseHref = (useElement: Element): string | null =>
  useElement.getAttribute("href") ?? useElement.getAttributeNS(XLINK_NAMESPACE_URI, "href");

const collectElementIds = (subtreeRoot: Element, presentIds: Set<string>): void => {
  if (subtreeRoot.id) presentIds.add(subtreeRoot.id);
  for (const descendant of subtreeRoot.querySelectorAll("[id]")) presentIds.add(descendant.id);
};

const listSelfAndDescendants = (subtreeRoot: Element, selector: string): Element[] => {
  const matches: Element[] = subtreeRoot.matches(selector) ? [subtreeRoot] : [];
  matches.push(...subtreeRoot.querySelectorAll(selector));
  return matches;
};

interface ExternalUseReference {
  fragmentId: string;
  useElement: Element;
}

interface PendingFragmentId {
  fragmentId: string;
  lookupDocuments: Document[];
}

export const inlineSvgUseReferences = async ({
  clone,
  rules,
  sourceDocument,
  timeoutMs,
}: InlineSvgUseReferencesInput): Promise<void> => {
  const presentIds = new Set<string>();
  collectElementIds(clone, presentIds);

  const queuedIds = new Set<string>();
  const pendingFragmentIds: PendingFragmentId[] = [];
  const externalReferencesByUrl = new Map<string, ExternalUseReference[]>();

  const enqueueFragmentId = (fragmentId: string, lookupDocuments: Document[]): void => {
    if (presentIds.has(fragmentId) || queuedIds.has(fragmentId)) return;
    queuedIds.add(fragmentId);
    pendingFragmentIds.push({ fragmentId, lookupDocuments });
  };

  const scanSubtreeForReferences = (
    subtreeRoot: Element,
    lookupDocuments: Document[],
    allowExternalReferences: boolean,
  ): void => {
    for (const useElement of listSelfAndDescendants(subtreeRoot, "use")) {
      const hrefValue = readUseHref(useElement);
      if (!hrefValue) continue;
      if (hrefValue.startsWith("#")) {
        enqueueFragmentId(hrefValue.slice(1), lookupDocuments);
      } else if (allowExternalReferences && hrefValue.includes("#")) {
        const [externalUrlPart, fragmentId] = hrefValue.split("#");
        if (!fragmentId) continue;
        const externalUrl = resolveUrl(externalUrlPart, sourceDocument.baseURI);
        const references = externalReferencesByUrl.get(externalUrl) ?? [];
        references.push({ fragmentId, useElement });
        externalReferencesByUrl.set(externalUrl, references);
      }
    }
    for (const element of listSelfAndDescendants(subtreeRoot, "*")) {
      for (const attribute of element.attributes) {
        if (!attribute.value.includes("url(")) continue;
        for (const referenceMatch of attribute.value.matchAll(URL_FRAGMENT_REFERENCE_PATTERN)) {
          enqueueFragmentId(referenceMatch[1], lookupDocuments);
        }
      }
    }
  };

  let defsElement: Element | null = null;
  const ensureDefsElement = (): Element => {
    if (defsElement) return defsElement;
    const ownerDocument = clone.ownerDocument;
    const hostSvg = ownerDocument.createElementNS(SVG_NAMESPACE_URI, "svg");
    hostSvg.setAttribute("aria-hidden", "true");
    hostSvg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;");
    defsElement = ownerDocument.createElementNS(SVG_NAMESPACE_URI, "defs");
    hostSvg.appendChild(defsElement);
    clone.appendChild(hostSvg);
    return defsElement;
  };

  const drainPendingFragmentIds = (): void => {
    while (pendingFragmentIds.length > 0) {
      const pending = pendingFragmentIds.pop();
      if (!pending) break;
      if (presentIds.has(pending.fragmentId)) continue;
      let referencedElement: Element | null = null;
      for (const lookupDocument of pending.lookupDocuments) {
        const candidate = lookupDocument.getElementById(pending.fragmentId);
        if (candidate && candidate.namespaceURI === SVG_NAMESPACE_URI) {
          referencedElement = candidate;
          break;
        }
      }
      if (!referencedElement) continue;
      const importedClone = referencedElement.cloneNode(true);
      if (!isElementNode(importedClone)) continue;
      sanitizeSvgSubtreeForSerialization(importedClone);
      ensureDefsElement().appendChild(importedClone);
      collectElementIds(importedClone, presentIds);
      scanSubtreeForReferences(importedClone, pending.lookupDocuments, false);
    }
  };

  scanSubtreeForReferences(clone, [sourceDocument], true);
  for (const rule of rules) {
    const styleMaps = [
      rule.baseStyles,
      rule.beforeStyles,
      rule.afterStyles,
      rule.firstLetterStyles,
    ];
    for (const styleMap of styleMaps) {
      if (!styleMap) continue;
      for (const propertyName of SVG_URL_REFERENCE_STYLE_PROPS) {
        const propertyValue = styleMap[propertyName];
        if (propertyValue === undefined || !propertyValue.includes("url(")) continue;
        for (const referenceMatch of propertyValue.matchAll(URL_FRAGMENT_REFERENCE_PATTERN)) {
          enqueueFragmentId(referenceMatch[1], [sourceDocument]);
        }
      }
    }
  }
  drainPendingFragmentIds();

  for (const [externalUrl, references] of externalReferencesByUrl) {
    const externalSvgText = await fetchAsText(externalUrl, timeoutMs);
    if (externalSvgText === null) continue;
    const externalDocument = new DOMParser().parseFromString(externalSvgText, "image/svg+xml");
    if (externalDocument.querySelector("parsererror")) continue;
    for (const { fragmentId, useElement } of references) {
      enqueueFragmentId(fragmentId, [externalDocument, sourceDocument]);
      useElement.setAttribute("href", `#${fragmentId}`);
      if (useElement.hasAttributeNS(XLINK_NAMESPACE_URI, "href")) {
        useElement.setAttributeNS(XLINK_NAMESPACE_URI, "xlink:href", `#${fragmentId}`);
      }
    }
    drainPendingFragmentIds();
  }
};
