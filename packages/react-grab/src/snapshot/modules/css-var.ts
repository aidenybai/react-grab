const KEY_PROPS: string[] = ["fill", "stroke", "color", "background-color", "stop-color"];

const SVG_TEMPLATE_TAGS = new Set<string>([
  "symbol",
  "defs",
  "pattern",
  "mask",
  "clipPath",
  "marker",
  "linearGradient",
  "radialGradient",
  "filter",
]);

export const isInSvgTemplate = (el: Element): boolean => {
  let current: Node | null = el;
  while (current && current.nodeType === 1) {
    const element = current as Element;
    if (
      element.namespaceURI === "http://www.w3.org/2000/svg" &&
      SVG_TEMPLATE_TAGS.has(element.localName)
    ) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
};

const __BASELINE_CACHE = new Map<string, Record<string, string>>();

const getBaselineComputed = (tagName: string, ns: string): Record<string, string> => {
  const key = ns + "::" + tagName.toLowerCase();
  const entry = __BASELINE_CACHE.get(key);
  if (entry) return entry;

  const doc = document;
  const el =
    ns === "http://www.w3.org/2000/svg"
      ? doc.createElementNS(ns, tagName)
      : doc.createElement(tagName);

  const holder = doc.createElement("div");
  holder.style.cssText =
    "position:absolute;left:-99999px;top:-99999px;contain:strict;display:block;";
  holder.appendChild(el);
  doc.documentElement.appendChild(holder);

  const cs = getComputedStyle(el);
  const base: Record<string, string> = {};
  for (const p of KEY_PROPS) {
    base[p] = cs.getPropertyValue(p) || "";
  }

  holder.remove();
  __BASELINE_CACHE.set(key, base);
  return base;
};

export const resolveCSSVars = (sourceEl: Element, cloneEl: Element): void => {
  if (!(sourceEl instanceof Element) || !(cloneEl instanceof Element)) return;

  if (isInSvgTemplate(sourceEl)) return;

  const styleAttr = sourceEl.getAttribute?.("style");
  let hasVar = Boolean(styleAttr && styleAttr.includes("var("));

  if (!hasVar && sourceEl.attributes?.length) {
    const attrs = sourceEl.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (a && typeof a.value === "string" && a.value.includes("var(")) {
        hasVar = true;
        break;
      }
    }
  }

  let cs: CSSStyleDeclaration | null = null;
  if (hasVar) {
    try {
      cs = getComputedStyle(sourceEl);
    } catch {}
  }

  if (hasVar) {
    const author = (sourceEl as HTMLElement).style;
    if (author && author.length) {
      const visitedProps = new Set<string>();
      for (let i = 0; i < author.length; i++) {
        const prop = author[i];
        if (visitedProps.has(prop)) continue;
        visitedProps.add(prop);
        const val = author.getPropertyValue(prop);
        if (!val || !val.includes("var(")) continue;
        const resolved = cs && cs.getPropertyValue(prop);
        if (resolved) {
          try {
            (cloneEl as HTMLElement).style.setProperty(
              prop,
              resolved.trim(),
              author.getPropertyPriority(prop),
            );
          } catch {}
        }
      }
    }
  }

  if (hasVar && sourceEl.attributes?.length) {
    const attrs = sourceEl.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a || typeof a.value !== "string" || !a.value.includes("var(")) continue;
      const propName = a.name;
      const resolved = cs && cs.getPropertyValue(propName);
      if (resolved) {
        try {
          (cloneEl as HTMLElement).style.setProperty(propName, resolved.trim());
        } catch {}
      }
    }
  }

  if (!hasVar) {
    if (!cs) {
      try {
        cs = getComputedStyle(sourceEl);
      } catch {
        cs = null;
      }
    }
    if (!cs) return;

    const ns = sourceEl.namespaceURI || "html";
    const base = getBaselineComputed(sourceEl.tagName, ns);

    for (const prop of KEY_PROPS) {
      const v = cs.getPropertyValue(prop) || "";
      const b = base[prop] || "";
      if (v && v !== b) {
        try {
          (cloneEl as HTMLElement).style.setProperty(prop, v.trim());
        } catch {}
      }
    }
  }
};
