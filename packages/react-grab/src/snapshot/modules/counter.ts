import { cache } from "../core/cache.js";
import type { SnapshotCounterContext } from "../types.js";

export type CounterContext = SnapshotCounterContext;

export const hasCounters = (input: string | null | undefined): boolean => {
  return /\bcounter\s*\(|\bcounters\s*\(/.test(input || "");
};

const alpha = (n: number, upper = false): string => {
  let s = "",
    x = Math.max(1, n);
  while (x > 0) {
    x--;
    s = String.fromCharCode(97 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return upper ? s.toUpperCase() : s;
};

const roman = (n: number, upper = true): string => {
  const map: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let num = Math.max(1, Math.min(3999, n)),
    out = "";
  for (const [v, sym] of map)
    while (num >= v) {
      out += sym;
      num -= v;
    }
  return upper ? out : out.toLowerCase();
};

const formatCounter = (value: number, style: string): string => {
  switch ((style || "decimal").toLowerCase()) {
    case "decimal":
      return String(value);
    case "decimal-leading-zero": {
      const abs = Math.abs(value);
      return (value < 0 ? "-" : "") + (abs < 10 ? "0" : "") + String(abs);
    }
    case "lower-alpha":
      return alpha(value, false);
    case "upper-alpha":
      return alpha(value, true);
    case "lower-roman":
      return roman(value, false);
    case "upper-roman":
      return roman(value, true);
    default:
      return String(value);
  }
};

export const buildCounterContext = (root: Document | Element): CounterContext => {
  const getEpoch = (): number => cache?.session?.__counterEpoch ?? 0;
  let run = getEpoch();
  const nodeCounters = new WeakMap<Element, Map<string, number[]>>();
  const rootEl = root instanceof Document ? root.documentElement : root;

  const isLi = (el: Element | null | undefined): boolean => el != null && el.tagName === "LI";
  const countPrevLi = (li: Element | null | undefined): number => {
    let c = 0,
      p = li?.parentElement;
    if (!p) return 0;
    for (const sib of p.children) {
      if (sib === li) break;
      if (sib.tagName === "LI") c++;
    }
    return c;
  };
  const cloneMap = (m: Map<string, number[]>): Map<string, number[]> => {
    const out = new Map<string, number[]>();
    for (const [k, arr] of m) out.set(k, arr.slice());
    return out;
  };

  const applyTo = (
    baseMap: Map<string, number[]>,
    parentMap: Map<string, number[]>,
    el: Element,
  ): Map<string, number[]> => {
    const map = cloneMap(baseMap);

    let reset: string | undefined;
    try {
      reset = (el as HTMLElement).style?.counterReset || getComputedStyle(el).counterReset;
    } catch {}
    if (reset && reset !== "none") {
      for (const part of reset.split(",")) {
        const toks = part.trim().split(/\s+/);
        const name = toks[0];
        const val = Number.isFinite(Number(toks[1])) ? Number(toks[1]) : 0;
        if (!name) continue;

        const parentStack = parentMap.get(name);
        if (parentStack && parentStack.length) {
          const s = parentStack.slice();
          s.push(val);
          map.set(name, s);
        } else {
          map.set(name, [val]);
        }
      }
    }

    let set: string | undefined;
    try {
      set = (el as HTMLElement).style?.counterSet || getComputedStyle(el).counterSet;
    } catch {}
    if (set && set !== "none") {
      for (const part of set.split(",")) {
        const toks = part.trim().split(/\s+/);
        const name = toks[0];
        const val = Number.isFinite(Number(toks[1])) ? Number(toks[1]) : 0;
        if (!name) continue;
        const stack = map.get(name) || [];
        if (stack.length === 0) stack.push(0);
        stack[stack.length - 1] = val;
        map.set(name, stack);
      }
    }

    let inc: string | undefined;
    try {
      inc = (el as HTMLElement).style?.counterIncrement || getComputedStyle(el).counterIncrement;
    } catch {}
    if (inc && inc !== "none") {
      for (const part of inc.split(",")) {
        const toks = part.trim().split(/\s+/);
        const name = toks[0];
        const by = Number.isFinite(Number(toks[1])) ? Number(toks[1]) : 1;
        if (!name) continue;
        const stack = map.get(name) || [];
        if (stack.length === 0) stack.push(0);
        stack[stack.length - 1] += by;
        map.set(name, stack);
      }
    }

    try {
      const cs = getComputedStyle(el);
      if (cs.display === "list-item" && isLi(el)) {
        const p = el.parentElement;
        let idx = 1;
        if (p && p.tagName === "OL") {
          const startAttr = p.getAttribute("start");
          const start = Number.isFinite(Number(startAttr)) ? Number(startAttr) : 1;
          const prev = countPrevLi(el);
          const ownAttr = el.getAttribute("value");
          idx = Number.isFinite(Number(ownAttr)) ? Number(ownAttr) : start + prev;
        } else {
          idx = 1 + countPrevLi(el);
        }
        const s = map.get("list-item") || [];
        if (s.length === 0) s.push(0);
        s[s.length - 1] = idx;
        map.set("list-item", s);
      }
    } catch {}

    return map;
  };

  const build = (
    el: Element,
    parentMap: Map<string, number[]>,
    carryMap: Map<string, number[]>,
  ): Map<string, number[]> => {
    const curr = applyTo(carryMap, parentMap, el);
    nodeCounters.set(el, curr);

    let nextCarry = curr;
    for (const child of el.children) {
      const childCarry = build(child, curr, nextCarry);
      nextCarry = childCarry;
    }

    const siblingCarry = new Map<string, number[]>();
    for (const [name, inStack] of carryMap) {
      const depth = inStack.length;
      const finalStack = nextCarry.get(name);
      siblingCarry.set(
        name,
        finalStack && finalStack.length ? finalStack.slice(0, depth) : inStack.slice(),
      );
    }
    for (const [name, finalStack] of nextCarry) {
      if (!siblingCarry.has(name) && finalStack.length && !parentMap.has(name)) {
        siblingCarry.set(name, finalStack.slice(0, 1));
      }
    }
    return siblingCarry;
  };

  const empty = new Map<string, number[]>();
  build(rootEl, empty, empty);

  const ensureFresh = (): void => {
    const now = getEpoch();
    if (now !== run) {
      run = now;
      const empty = new Map<string, number[]>();
      build(rootEl, empty, empty);
    }
  };

  return {
    get(node: Element, name: string): number {
      ensureFresh();
      const s = nodeCounters.get(node)?.get(name);
      return s && s.length ? s[s.length - 1] : 0;
    },
    getStack(node: Element, name: string): number[] {
      ensureFresh();
      const s = nodeCounters.get(node)?.get(name);
      return s ? s.slice() : [];
    },
  };
};

export const resolveCountersInContent = (
  raw: string,
  node: Element,
  ctx: CounterContext,
): string => {
  if (!raw || raw === "none") return raw;
  try {
    const RX = /\b(counter|counters)\s*\(([^)]+)\)/g;
    return raw.replace(RX, (_, fn: string, args: string) => {
      const parts = String(args)
        .split(",")
        .map((s) => s.trim());
      if (fn === "counter") {
        const name = parts[0]?.replace(/^["']|["']$/g, "");
        const style = (parts[1] || "decimal").toLowerCase();
        const v = ctx.get(node, name);
        return formatCounter(v, style);
      } else {
        const name = parts[0]?.replace(/^["']|["']$/g, "");
        const sep = parts[1]?.replace(/^["']|["']$/g, "") ?? "";
        const style = (parts[2] || "decimal").toLowerCase();
        const stack = ctx.getStack(node, name);
        if (!stack.length) return "";
        const pieces = stack.map((v) => formatCounter(v, style));
        return pieces.join(sep);
      }
    });
  } catch {
    return "- ";
  }
};
