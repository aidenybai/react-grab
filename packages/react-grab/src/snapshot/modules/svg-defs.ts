export const inlineExternalDefsAndSymbols = (
  element: Element | null | undefined,
  lookupRoot?: Document | ParentNode,
): void => {
  if (!element || !(element instanceof Element)) return;

  const doc = element.ownerDocument || document;
  const searchRoot = lookupRoot || doc;

  const svgRoots: SVGSVGElement[] =
    element instanceof SVGSVGElement ? [element] : Array.from(element.querySelectorAll("svg"));

  if (svgRoots.length === 0) return;

  const URL_ID_RE = /url\(\s*#([^)]+)\)/g;
  const URL_ATTRS = [
    "fill",
    "stroke",
    "filter",
    "clip-path",
    "mask",
    "marker",
    "marker-start",
    "marker-mid",
    "marker-end",
  ];

  const cssEscape = (s: string): string =>
    window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  const XLINK_NS = "http://www.w3.org/1999/xlink";

  const getHrefAttr = (el: Element | null | undefined): string | null => {
    if (!el || !el.getAttribute) return null;

    const href =
      el.getAttribute("href") ||
      el.getAttribute("xlink:href") ||
      (typeof el.getAttributeNS === "function" ? el.getAttributeNS(XLINK_NS, "href") : null);

    if (href) return href;

    const attrs = el.attributes;
    if (!attrs) return null;
    for (let i = 0; i < attrs.length; i++) {
      const a = attrs[i];
      if (!a || !a.name) continue;
      if (a.name === "href") return a.value;
      const idx = a.name.indexOf(":");
      if (idx !== -1 && a.name.slice(idx + 1) === "href") {
        return a.value;
      }
    }
    return null;
  };

  const globalExistingIds = new Set(Array.from(element.querySelectorAll("[id]")).map((n) => n.id));

  const neededIds = new Set<string>();

  let sawAnyReference = false;

  const addUrlIdsFromValue = (
    val: string | null | undefined,
    queueForResolve: Set<string> | null = null,
  ): void => {
    if (!val) return;
    URL_ID_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = URL_ID_RE.exec(val))) {
      sawAnyReference = true;
      const id = (m[1] || "").trim();
      if (!id) continue;

      if (!globalExistingIds.has(id)) {
        neededIds.add(id);
        if (queueForResolve && !queueForResolve.has(id)) {
          queueForResolve.add(id);
        }
      }
    }
  };

  const collectReferencesInSvg = (rootSvg: SVGSVGElement): void => {
    const uses = rootSvg.querySelectorAll("use");
    for (const u of uses) {
      const href = getHrefAttr(u);
      if (!href || !href.startsWith("#")) continue;
      sawAnyReference = true;
      const id = href.slice(1).trim();
      if (id && !globalExistingIds.has(id)) neededIds.add(id);
    }

    const query =
      '*[style*="url("],' +
      '*[fill^="url("], *[stroke^="url("],*[filter^="url("],' +
      '*[clip-path^="url("],*[mask^="url("],*[marker^="url("],' +
      '*[marker-start^="url("],*[marker-mid^="url("],*[marker-end^="url("]';

    const candidates = rootSvg.querySelectorAll(query);
    for (const el of candidates) {
      addUrlIdsFromValue(el.getAttribute("style") || "");
      for (const a of URL_ATTRS) addUrlIdsFromValue(el.getAttribute(a));
    }
  };

  for (const svg of svgRoots) collectReferencesInSvg(svg);

  if (!sawAnyReference) return;

  let defsHost: Element | null = element.querySelector("svg.inline-defs-container");
  if (!defsHost) {
    defsHost = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    defsHost.classList.add("inline-defs-container");
    defsHost.setAttribute("aria-hidden", "true");
    defsHost.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    element.insertBefore(defsHost, element.firstChild || null);
  }
  let localDefs: Element | null = defsHost.querySelector("defs") || null;

  const findGlobalById = (id: string): Element | null => {
    if (!id) return null;
    if (globalExistingIds.has(id)) return null;
    const esc = cssEscape(id);

    const tryFind = (sel: string): Element | null => {
      const el = searchRoot.querySelector(sel);
      return el && !element.contains(el) ? el : null;
    };

    return tryFind(`svg defs > *#${esc}`) || tryFind(`svg > symbol#${esc}`) || tryFind(`*#${esc}`);
  };

  if (!neededIds.size) return;

  const queued = new Set(neededIds);
  const inlined = new Set<string>();

  while (queued.size) {
    const id = queued.values().next().value!;
    queued.delete(id);

    if (!id || globalExistingIds.has(id) || inlined.has(id)) continue;

    const source = findGlobalById(id);
    if (!source) {
      inlined.add(id);
      continue;
    }

    if (!localDefs) {
      localDefs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
      defsHost.appendChild(localDefs);
    }

    const clone = source.cloneNode(true) as Element;
    if (!clone.id) clone.setAttribute("id", id);
    localDefs.appendChild(clone);
    inlined.add(id);
    globalExistingIds.add(id);

    const walk = [clone, ...clone.querySelectorAll("*")];
    for (const node of walk) {
      const href = getHrefAttr(node);
      if (href && href.startsWith("#")) {
        const ref = href.slice(1).trim();
        if (ref && !globalExistingIds.has(ref) && !inlined.has(ref)) {
          queued.add(ref);
        }
      }

      const style = node.getAttribute?.("style") || "";
      if (style) addUrlIdsFromValue(style, queued);

      for (const a of URL_ATTRS) {
        const v = node.getAttribute?.(a);
        if (v) addUrlIdsFromValue(v, queued);
      }
    }
  }
};
