export const lineClampTree = (el: Element | null | undefined): (() => void) => {
  if (!el) return () => {};
  const undos: Array<() => void> = [];
  const walk = (node: Element): void => {
    const undo = lineClamp(node);
    if (undo) undos.push(undo);
    for (const child of node.children || []) walk(child);
  };
  walk(el);
  return () => undos.forEach((u) => u());
};

const lineClamp = (el: Element | null | undefined): (() => void) => {
  if (!el) return () => {};

  const lines = getClamp(el);
  if (lines <= 0) return () => {};

  if (!isPlainTextContainer(el)) return () => {};

  const cs = getComputedStyle(el);
  const targetH = Math.round(usedLineHeightPx(cs) * lines + vpad(cs));

  const original = el.textContent ?? "";
  const prevText = original;

  if (el.scrollHeight <= targetH + 0.5) {
    return () => {};
  }

  let lo = 0,
    hi = original.length,
    best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    el.textContent = original.slice(0, mid) + "…";
    if (el.scrollHeight <= targetH + 0.5) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  el.textContent = (best >= 0 ? original.slice(0, best) : "") + "…";

  return () => {
    el.textContent = prevText;
  };
};

const getClamp = (el: Element): number => {
  const cs = getComputedStyle(el);
  let v = cs.getPropertyValue("-webkit-line-clamp") || cs.getPropertyValue("line-clamp");
  v = (v || "").trim();
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const usedLineHeightPx = (cs: CSSStyleDeclaration): number => {
  const lh = (cs.lineHeight || "").trim();
  const fs = parseFloat(cs.fontSize) || 16;
  if (!lh || lh === "normal") return Math.round(fs * 1.2);
  if (lh.endsWith("px")) return parseFloat(lh);
  if (/^\d+(\.\d+)?$/.test(lh)) return Math.round(parseFloat(lh) * fs);
  if (lh.endsWith("%")) return Math.round((parseFloat(lh) / 100) * fs);
  return Math.round(fs * 1.2);
};

const vpad = (cs: CSSStyleDeclaration): number => {
  return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
};

const isPlainTextContainer = (el: Element): boolean => {
  if (el.childElementCount > 0) return false;
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE);
};
