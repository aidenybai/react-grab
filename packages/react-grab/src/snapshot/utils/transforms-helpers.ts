import { limitDecimals } from "./capture-helpers.js";
import { getStyle } from "./css.js";

interface BleedBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface IndividualTransforms {
  rotate: string;
  scale: string | null;
  translate: string | null;
}

interface TransformInput {
  baseTransform?: string;
  rotate?: string | null;
  scale?: string | null;
  translate?: string | null;
}

interface CSSNumericLike {
  value?: number;
  unit?: string;
}

interface CSSTypedValue {
  angle?: CSSNumericLike;
  unit?: string;
  value?: number;
  x?: CSSNumericLike;
  y?: CSSNumericLike;
}

export const parseBoxShadow = (cs: CSSStyleDeclaration): BleedBox => {
  const v = cs.boxShadow || "";
  if (!v || v === "none") return { top: 0, right: 0, bottom: 0, left: 0 };
  const parts: string[] = [];
  let buf = "",
    depth = 0;
  for (let i = 0; i < v.length; i++) {
    const ch = v[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  let t = 0,
    r = 0,
    b2 = 0,
    l = 0;
  for (const part of parts) {
    if (/\binset\b/i.test(part)) continue;
    const nums = part.match(/-?\d+(\.\d+)?px/g)?.map((n) => parseFloat(n)) || [];
    if (nums.length < 2) continue;
    const [ox2, oy2, blur = 0, spread = 0] = nums;
    const extX = Math.abs(ox2) + blur + spread;
    const extY = Math.abs(oy2) + blur + spread;
    r = Math.max(r, extX + Math.max(ox2, 0));
    l = Math.max(l, extX + Math.max(-ox2, 0));
    b2 = Math.max(b2, extY + Math.max(oy2, 0));
    t = Math.max(t, extY + Math.max(-oy2, 0));
  }
  return { top: Math.ceil(t), right: Math.ceil(r), bottom: Math.ceil(b2), left: Math.ceil(l) };
};

export const parseFilterBlur = (cs: CSSStyleDeclaration): BleedBox => {
  const raw = cs.filter && cs.filter !== "none" ? cs.filter : cs.webkitFilter || "";
  const re = /blur\(\s*([0-9.]+)px\s*\)/gi;
  let total = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(raw))) total += parseFloat(m[1]) || 0;
  const b2 = Math.ceil(total);
  return { top: b2, right: b2, bottom: b2, left: b2 };
};

export const parseOutline = (cs: CSSStyleDeclaration): BleedBox => {
  if ((cs.outlineStyle || "none") === "none") return { top: 0, right: 0, bottom: 0, left: 0 };
  const w = Math.ceil(parseFloat(cs.outlineWidth || "0") || 0);
  const offset = parseFloat(cs.outlineOffset || "0") || 0;
  const total = w + Math.max(0, Math.ceil(offset));
  return { top: total, right: total, bottom: total, left: total };
};

export const parseFilterDropShadows = (
  cs: CSSStyleDeclaration,
): { bleed: BleedBox; has: boolean } => {
  const raw = `${cs.filter || ""} ${cs.webkitFilter || ""}`.trim();
  if (!raw || raw === "none") {
    return { bleed: { top: 0, right: 0, bottom: 0, left: 0 }, has: false };
  }
  const tokens = raw.match(/drop-shadow\((?:[^()]|\([^()]*\))*\)/gi) || [];
  let t = 0,
    r = 0,
    b = 0,
    l = 0;
  let found = false;
  for (const tok of tokens) {
    found = true;
    const nums = tok.match(/-?\d+(?:\.\d+)?px/gi)?.map((v) => parseFloat(v)) || [];
    const [ox = 0, oy = 0, blur = 0] = nums;
    const extX = Math.abs(ox) + blur;
    const extY = Math.abs(oy) + blur;
    r = Math.max(r, extX + Math.max(ox, 0));
    l = Math.max(l, extX + Math.max(-ox, 0));
    b = Math.max(b, extY + Math.max(oy, 0));
    t = Math.max(t, extY + Math.max(-oy, 0));
  }
  return {
    bleed: {
      top: limitDecimals(t),
      right: limitDecimals(r),
      bottom: limitDecimals(b),
      left: limitDecimals(l),
    },
    has: found,
  };
};

export const normalizeRootTransforms = (
  originalEl: Element,
  cloneRoot: HTMLElement,
): Matrix2D | null => {
  if (!originalEl || !cloneRoot || !cloneRoot.style) return null;
  const cs = getComputedStyle(originalEl);

  try {
    cloneRoot.style.transformOrigin = "0 0";
  } catch {}

  try {
    if ("translate" in cloneRoot.style) cloneRoot.style.translate = "none";
    if ("rotate" in cloneRoot.style) cloneRoot.style.rotate = "none";
  } catch {}

  const decomposeScaleShear = (a: number, b: number, c: number, d: number): Matrix2D => {
    const scaleX = Math.sqrt(a * a + b * b) || 0;
    let shear = 0,
      scaleY = 0;
    if (scaleX > 0) {
      const a1 = a / scaleX;
      const b1 = b / scaleX;
      shear = a1 * c + b1 * d;
      const c2 = c - a1 * shear;
      const d2 = d - b1 * shear;
      scaleY = Math.sqrt(c2 * c2 + d2 * d2) || 0;
      if (scaleY > 0) shear = shear / scaleY;
      else shear = 0;
    }
    return {
      a: scaleX,
      b: 0,
      c: shear * scaleY,
      d: scaleY,
    };
  };

  const tr = cs.transform || "none";
  if (!tr || tr === "none") {
    let scaleStr: string | null = null;
    try {
      scaleStr = readIndividualTransforms(originalEl).scale;
    } catch {}
    try {
      cloneRoot.style.transform = "none";
    } catch {}
    if (!scaleStr) return { a: 1, b: 0, c: 0, d: 1 };
    const sv = scaleStr.trim().split(/\s+/).map(parseFloat);
    const sx = Number.isFinite(sv[0]) ? sv[0] : 1;
    const sy = Number.isFinite(sv[1]) ? sv[1] : sx;
    return { a: sx, b: 0, c: 0, d: sy };
  }

  const m2d = tr.match(/^matrix\(\s*([^)]+)\)$/i);
  if (m2d) {
    const nums = m2d[1].split(",").map((v) => parseFloat(v.trim()));
    if (nums.length === 6 && nums.every(Number.isFinite)) {
      const [a, b, c, d] = nums;
      const dec = decomposeScaleShear(a, b, c, d);
      try {
        cloneRoot.style.transform = `matrix(${dec.a}, ${dec.b}, ${dec.c}, ${dec.d}, 0, 0)`;
      } catch {}
      return dec;
    }
  }

  const m3d = tr.match(/^matrix3d\(\s*([^)]+)\)$/i);
  if (m3d) {
    const nums = m3d[1].split(",").map((v) => parseFloat(v.trim()));
    if (nums.length === 16 && nums.every(Number.isFinite)) {
      const a = nums[0],
        b = nums[1],
        c = nums[4],
        d = nums[5];
      const dec = decomposeScaleShear(a, b, c, d);
      try {
        cloneRoot.style.transform = `matrix(${dec.a}, ${dec.b}, ${dec.c}, ${dec.d}, 0, 0)`;
      } catch {}
      return dec;
    }
  }

  try {
    const M = new DOMMatrix(tr);
    const dec = decomposeScaleShear(M.a, M.b, M.c, M.d);
    try {
      cloneRoot.style.transform = `matrix(${dec.a}, ${dec.b}, ${dec.c}, ${dec.d}, 0, 0)`;
    } catch {}
    return dec;
  } catch {
    return null;
  }
};

export const bboxWithOriginFull = (
  w2: number,
  h2: number,
  M: DOMMatrix,
  ox2: number,
  oy2: number,
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } => {
  const a2 = M.a,
    b2 = M.b,
    c2 = M.c,
    d2 = M.d,
    e2 = M.e || 0,
    f2 = M.f || 0;
  const pt = (x: number, y: number): [number, number] => {
    const X = x - ox2,
      Y = y - oy2;
    let X2 = a2 * X + c2 * Y,
      Y2 = b2 * X + d2 * Y;
    X2 += ox2 + e2;
    Y2 += oy2 + f2;
    return [X2, Y2];
  };
  const P = [pt(0, 0), pt(w2, 0), pt(0, h2), pt(w2, h2)];
  let minX2 = Infinity,
    minY2 = Infinity,
    maxX2 = -Infinity,
    maxY2 = -Infinity;
  for (const [X, Y] of P) {
    if (X < minX2) minX2 = X;
    if (Y < minY2) minY2 = Y;
    if (X > maxX2) maxX2 = X;
    if (Y > maxY2) maxY2 = Y;
  }
  return {
    minX: minX2,
    minY: minY2,
    maxX: maxX2,
    maxY: maxY2,
    width: maxX2 - minX2,
    height: maxY2 - minY2,
  };
};

export const parseTransformOriginPx = (
  cs: CSSStyleDeclaration,
  w: number,
  h: number,
): { ox: number; oy: number } => {
  const raw = (cs.transformOrigin || "0 0").trim().split(/\s+/);
  const [oxRaw, oyRaw] = [raw[0] || "0", raw[1] || "0"];

  const toPx = (token: string, size: number): number => {
    const t = token.toLowerCase();
    if (t === "left" || t === "top") return 0;
    if (t === "center") return size / 2;
    if (t === "right") return size;
    if (t === "bottom") return size;
    if (t.endsWith("px")) return parseFloat(t) || 0;
    if (t.endsWith("%")) return ((parseFloat(t) || 0) * size) / 100;
    if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t) || 0;
    return 0;
  };

  return {
    ox: toPx(oxRaw, w),
    oy: toPx(oyRaw, h),
  };
};

export const readIndividualTransforms = (el: Element): IndividualTransforms => {
  const out: IndividualTransforms = { rotate: "0deg", scale: null, translate: null };

  const map = typeof el.computedStyleMap === "function" ? el.computedStyleMap() : null;
  if (map) {
    const safeGet = (prop: string): CSSTypedValue | null => {
      try {
        if (typeof map.has === "function" && !map.has(prop)) return null;
        if (typeof map.get !== "function") return null;
        return map.get(prop) as unknown as CSSTypedValue;
      } catch {
        return null;
      }
    };

    const rot = safeGet("rotate");
    if (rot) {
      if (rot.angle) {
        const ang = rot.angle;
        out.rotate =
          ang.unit === "rad" ? (ang.value! * 180) / Math.PI + "deg" : ang.value! + ang.unit!;
      } else if (rot.unit) {
        out.rotate =
          rot.unit === "rad" ? (rot.value! * 180) / Math.PI + "deg" : rot.value! + rot.unit;
      } else {
        out.rotate = String(rot);
      }
    } else {
      const cs = getComputedStyle(el);
      out.rotate = cs.rotate && cs.rotate !== "none" ? cs.rotate : "0deg";
    }

    const sc = safeGet("scale");
    if (sc) {
      const sx =
        "x" in sc && sc.x?.value != null
          ? sc.x!.value
          : Array.isArray(sc)
            ? sc[0]?.value
            : Number(sc) || 1;
      const sy =
        "y" in sc && sc.y?.value != null ? sc.y!.value : Array.isArray(sc) ? sc[1]?.value : sx;
      out.scale = `${sx} ${sy}`;
    } else {
      const cs = getComputedStyle(el);
      out.scale = cs.scale && cs.scale !== "none" ? cs.scale : null;
    }

    const tr = safeGet("translate");
    if (tr) {
      const tx = "x" in tr && "value" in tr.x! ? tr.x!.value : Array.isArray(tr) ? tr[0]?.value : 0;
      const ty = "y" in tr && "value" in tr.y! ? tr.y!.value : Array.isArray(tr) ? tr[1]?.value : 0;
      const ux = "x" in tr && tr.x?.unit ? tr.x!.unit : "px";
      const uy = "y" in tr && tr.y?.unit ? tr.y!.unit : "px";
      out.translate = `${tx}${ux} ${ty}${uy}`;
    } else {
      const cs = getComputedStyle(el);
      out.translate = cs.translate && cs.translate !== "none" ? cs.translate : null;
    }
    return out;
  }

  const cs = getComputedStyle(el);
  out.rotate = cs.rotate && cs.rotate !== "none" ? cs.rotate : "0deg";
  out.scale = cs.scale && cs.scale !== "none" ? cs.scale : null;
  out.translate = cs.translate && cs.translate !== "none" ? cs.translate : null;
  return out;
};

let __measureHost: HTMLElement | null = null;

const getMeasureHost = (): HTMLElement => {
  if (__measureHost) return __measureHost;
  const n = document.createElement("div");
  n.id = "snapshot-measure-slot";
  n.setAttribute("aria-hidden", "true");
  Object.assign(n.style, {
    position: "absolute",
    left: "-99999px",
    top: "0px",
    width: "0px",
    height: "0px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
    contain: "size layout style",
  });
  document.documentElement.appendChild(n);
  __measureHost = n;
  return n;
};

export const readTotalTransformMatrix = (t: TransformInput): DOMMatrix => {
  const host = getMeasureHost();
  const tmp = document.createElement("div");
  tmp.style.transformOrigin = "0 0";
  if (t.baseTransform) tmp.style.transform = t.baseTransform;
  if (t.rotate) tmp.style.rotate = t.rotate;
  if (t.scale) tmp.style.scale = t.scale;
  if (t.translate) tmp.style.translate = t.translate;
  host.appendChild(tmp);
  const M = matrixFromComputed(tmp);
  host.removeChild(tmp);
  return M;
};

export const hasBBoxAffectingTransform = (el: Element): boolean => {
  const cs = getStyle(el);
  const t = cs.transform || "none";

  const hasMatrix =
    t !== "none" && !/^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,\s*0\s*,\s*0\s*\)$/i.test(t);

  if (hasMatrix) return true;

  const r = cs.rotate && cs.rotate !== "none" && cs.rotate !== "0deg";
  const s = cs.scale && cs.scale !== "none" && cs.scale !== "1";
  const tr = cs.translate && cs.translate !== "none" && cs.translate !== "0px 0px";

  return Boolean(r || s || tr);
};

const matrixFromComputed = (el: Element): DOMMatrix => {
  const tr = getComputedStyle(el).transform;
  if (!tr || tr === "none") return new DOMMatrix();
  try {
    return new DOMMatrix(tr);
  } catch {
    return new WebKitCSSMatrix(tr);
  }
};
