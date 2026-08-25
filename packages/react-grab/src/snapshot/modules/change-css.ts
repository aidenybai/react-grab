export const freezeSticky = (
  originalRoot: HTMLElement | null | undefined,
  cloneRoot: HTMLElement | null | undefined,
): void => {
  if (!originalRoot || !cloneRoot) return;

  const scrollTop = originalRoot.scrollTop || 0;
  if (!scrollTop) return;

  if (getComputedStyle(cloneRoot).position === "static") {
    cloneRoot.style.position = "relative";
  }

  const rootRect = originalRoot.getBoundingClientRect();
  const viewportH = originalRoot.clientHeight;
  const PH_ATTR = "data-snap-ph";

  const walker = document.createTreeWalker(originalRoot, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    const cs = getComputedStyle(el);

    const pos = cs.position;
    if (pos !== "sticky" && pos !== "-webkit-sticky") continue;

    const topInit = _toPx(cs.top);
    const bottomInit = _toPx(cs.bottom);
    if (topInit == null && bottomInit == null) continue;

    const path = _pathOf(el, originalRoot);
    const cloneEl = _findByPathIgnoringPlaceholders(cloneRoot, path, PH_ATTR);
    if (!cloneEl) continue;

    const elRect = el.getBoundingClientRect();
    const widthPx = elRect.width;
    const heightPx = elRect.height;
    const leftPx = elRect.left - rootRect.left;
    if (!(widthPx > 0 && heightPx > 0)) continue;
    if (!Number.isFinite(leftPx)) continue;

    const topAbsPx =
      topInit != null
        ? topInit + scrollTop
        : scrollTop + (viewportH - heightPx - (bottomInit as number));
    if (!Number.isFinite(topAbsPx)) continue;

    const zParsed = Number.parseInt(cs.zIndex, 10);
    const hasZ = Number.isFinite(zParsed);
    const overlayZ = hasZ ? Math.max(zParsed, 1) + 1 : 2;
    const placeholderZ = hasZ ? zParsed - 1 : 0;

    const ph = cloneEl.cloneNode(false) as HTMLElement;
    ph.setAttribute(PH_ATTR, "1");
    ph.style.position = "sticky";
    ph.style.left = `${leftPx}px`;
    ph.style.top = `${topAbsPx}px`;
    ph.style.width = `${widthPx}px`;
    ph.style.height = `${heightPx}px`;
    ph.style.visibility = "hidden";
    ph.style.zIndex = String(placeholderZ);
    ph.style.overflow = "hidden";
    ph.style.background = "transparent";
    ph.style.boxShadow = "none";
    ph.style.filter = "none";

    cloneEl.parentElement?.insertBefore(ph, cloneEl);

    cloneEl.style.position = "absolute";
    cloneEl.style.left = `${leftPx}px`;
    cloneEl.style.top = `${topAbsPx}px`;
    cloneEl.style.bottom = "auto";
    cloneEl.style.zIndex = String(overlayZ);
    cloneEl.style.pointerEvents = "none";
  }
};

const _toPx = (v: string | null | undefined): number | null => {
  if (!v || v === "auto") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const _pathOf = (el: Element, root: Element): number[] => {
  const path: number[] = [];
  for (let cur: Element | null = el; cur && cur !== root; ) {
    const p: HTMLElement | null = cur.parentElement;
    if (!p) break;
    path.push(Array.from(p.children).indexOf(cur));
    cur = p;
  }
  return path.reverse();
};

const _findByPathIgnoringPlaceholders = (
  root: HTMLElement,
  path: number[],
  phAttr: string,
): HTMLElement | null => {
  let cur: Element = root;
  for (let i = 0; i < path.length; i++) {
    const kids = _childrenWithoutPlaceholders(cur, phAttr);
    cur = kids[path[i]];
    if (!cur) return null;
  }
  return cur instanceof HTMLElement ? cur : null;
};

const _childrenWithoutPlaceholders = (el: Element, phAttr: string): Element[] => {
  const out: Element[] = [];
  const ch = el.children;
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (!c.hasAttribute(phAttr)) out.push(c);
  }
  return out;
};
