const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const URL_ID_PATTERN = /url\(\s*#([^)]+)\)/g;
const URL_REFERENCE_ATTRIBUTES = [
  "fill", "stroke", "filter", "clip-path", "mask",
  "marker", "marker-start", "marker-mid", "marker-end",
];

const getHrefAttribute = (element: Element): string | null =>
  element.getAttribute("href") ||
  element.getAttribute("xlink:href") ||
  (typeof element.getAttributeNS === "function"
    ? element.getAttributeNS(XLINK_NAMESPACE, "href")
    : null);

const extractUrlIds = (value: string): string[] => {
  const identifiers: string[] = [];
  URL_ID_PATTERN.lastIndex = 0;
  let match;
  while ((match = URL_ID_PATTERN.exec(value))) {
    const identifier = match[1].trim();
    if (identifier) identifiers.push(identifier);
  }
  return identifiers;
};

export const inlineExternalSvgDefs = (rootElement: Element): void => {
  const document = rootElement.ownerDocument;

  const svgRoots =
    rootElement instanceof SVGSVGElement
      ? [rootElement]
      : Array.from(rootElement.querySelectorAll("svg"));

  if (svgRoots.length === 0) return;

  const existingIds = new Set(
    Array.from(rootElement.querySelectorAll("[id]")).map((node) => node.id),
  );

  const neededIds = new Set<string>();
  let hasAnyReference = false;

  const collectReferences = (svgRoot: Element) => {
    for (const useElement of Array.from(svgRoot.querySelectorAll("use"))) {
      const href = getHrefAttribute(useElement);
      if (!href?.startsWith("#")) continue;
      hasAnyReference = true;
      const identifier = href.slice(1).trim();
      if (identifier && !existingIds.has(identifier)) neededIds.add(identifier);
    }

    const candidateSelector = [
      '*[style*="url("]',
      ...URL_REFERENCE_ATTRIBUTES.map((attribute) => `*[${attribute}^="url("]`),
    ].join(",");

    for (const candidateElement of Array.from(svgRoot.querySelectorAll(candidateSelector))) {
      const styleValue = candidateElement.getAttribute("style") || "";
      for (const identifier of extractUrlIds(styleValue)) {
        hasAnyReference = true;
        if (!existingIds.has(identifier)) neededIds.add(identifier);
      }

      for (const attributeName of URL_REFERENCE_ATTRIBUTES) {
        const attributeValue = candidateElement.getAttribute(attributeName);
        if (!attributeValue) continue;
        for (const identifier of extractUrlIds(attributeValue)) {
          hasAnyReference = true;
          if (!existingIds.has(identifier)) neededIds.add(identifier);
        }
      }
    }
  };

  for (const svgRoot of svgRoots) collectReferences(svgRoot);

  if (!hasAnyReference || neededIds.size === 0) return;

  let defsHost = rootElement.querySelector("svg.inline-defs-container") as SVGSVGElement | null;
  if (!defsHost) {
    defsHost = document.createElementNS(SVG_NAMESPACE, "svg") as SVGSVGElement;
    defsHost.classList.add("inline-defs-container");
    defsHost.setAttribute("aria-hidden", "true");
    defsHost.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    rootElement.insertBefore(defsHost, rootElement.firstChild);
  }

  let defsElement = defsHost.querySelector("defs");
  const inlinedIds = new Set<string>();
  const pendingIds = new Set(neededIds);

  while (pendingIds.size > 0) {
    const identifier = pendingIds.values().next().value as string;
    pendingIds.delete(identifier);

    if (existingIds.has(identifier) || inlinedIds.has(identifier)) continue;

    const escapedId = typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(identifier)
      : identifier.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    const sourceElement =
      document.querySelector(`svg defs > *#${escapedId}`) ||
      document.querySelector(`svg > symbol#${escapedId}`) ||
      document.getElementById(identifier);

    if (!sourceElement || rootElement.contains(sourceElement)) {
      inlinedIds.add(identifier);
      continue;
    }

    if (!defsElement) {
      defsElement = document.createElementNS(SVG_NAMESPACE, "defs");
      defsHost.appendChild(defsElement);
    }

    const clonedDef = sourceElement.cloneNode(true) as Element;
    if (!clonedDef.id) clonedDef.setAttribute("id", identifier);
    defsElement.appendChild(clonedDef);
    inlinedIds.add(identifier);
    existingIds.add(identifier);

    const descendantElements = [clonedDef, ...Array.from(clonedDef.querySelectorAll("*"))];
    for (const descendant of descendantElements) {
      const href = getHrefAttribute(descendant);
      if (href?.startsWith("#")) {
        const referencedId = href.slice(1).trim();
        if (referencedId && !existingIds.has(referencedId) && !inlinedIds.has(referencedId)) {
          pendingIds.add(referencedId);
        }
      }

      const styleValue = descendant.getAttribute?.("style") || "";
      for (const referencedId of extractUrlIds(styleValue)) {
        if (!existingIds.has(referencedId) && !inlinedIds.has(referencedId)) {
          pendingIds.add(referencedId);
        }
      }

      for (const attributeName of URL_REFERENCE_ATTRIBUTES) {
        const attributeValue = descendant.getAttribute?.(attributeName);
        if (!attributeValue) continue;
        for (const referencedId of extractUrlIds(attributeValue)) {
          if (!existingIds.has(referencedId) && !inlinedIds.has(referencedId)) {
            pendingIds.add(referencedId);
          }
        }
      }
    }
  }
};
