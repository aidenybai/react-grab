import type { SnapshotCachePolicy, SnapshotSessionCache } from "../types.js";

const MAX_IMAGE = 100;
const MAX_BACKGROUND = 100;
const MAX_RESOURCE = 150;
const MAX_BASE_STYLE = 50;
const MAX_DEFAULT_STYLE = 30;

class EvictingMap<K, V> extends Map<K, V> {
  _maxSize: number;
  constructor(maxSize: number = 100, ...args: [entries?: Iterable<readonly [K, V]> | null]) {
    super(...args);
    this._maxSize = maxSize;
  }
  set(key: K, value: V): this {
    if (this.size >= this._maxSize && !this.has(key)) {
      const first = this.keys().next().value;
      if (first !== undefined) this.delete(first);
    }
    return super.set(key, value);
  }
}

interface SnapshotMeasureHint {
  cssLen: number;
  w0: number;
  csh: number;
  csw: number;
}

interface SnapshotCache {
  image: EvictingMap<string, string>;
  background: EvictingMap<string, string | null>;
  resource: EvictingMap<string, string>;
  defaultStyle: EvictingMap<string, Record<string, string>>;
  baseStyle: EvictingMap<string, string>;
  computedStyle: WeakMap<Element, Map<string | null, CSSStyleDeclaration>>;
  measureHints: WeakMap<Element, SnapshotMeasureHint>;
  font: Set<string>;
  session: SnapshotSessionCache;
}

export const cache: SnapshotCache = {
  image: new EvictingMap<string, string>(MAX_IMAGE),
  background: new EvictingMap<string, string | null>(MAX_BACKGROUND),
  resource: new EvictingMap<string, string>(MAX_RESOURCE),
  defaultStyle: new EvictingMap<string, Record<string, string>>(MAX_DEFAULT_STYLE),
  baseStyle: new EvictingMap<string, string>(MAX_BASE_STYLE),
  computedStyle: new WeakMap<Element, Map<string | null, CSSStyleDeclaration>>(),
  measureHints: new WeakMap<Element, SnapshotMeasureHint>(),
  font: new Set<string>(),
  session: {
    styleMap: new Map<Element, string>(),
    styleCache: new WeakMap<Element, CSSStyleDeclaration>(),
    nodeMap: new Map<Element, Element>(),
  },
};

export { EvictingMap };

export const normalizeCachePolicy = (v: unknown): SnapshotCachePolicy => {
  if (v === true) return "soft";
  if (v === false) return "disabled";
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (s === "auto") return "auto";
    if (s === "full") return "full";
    if (s === "soft" || s === "disabled") return s;
  }
  return "soft";
};

export const applyCachePolicy = (policy: SnapshotCachePolicy = "soft"): void => {
  cache.session.__counterEpoch = (cache.session.__counterEpoch || 0) + 1;
  switch (policy) {
    case "auto": {
      cache.session.styleMap = new Map();
      cache.session.nodeMap = new Map();
      return;
    }
    case "soft": {
      cache.session.styleMap = new Map();
      cache.session.nodeMap = new Map();
      cache.session.styleCache = new WeakMap();
      return;
    }
    case "full": {
      return;
    }
    case "disabled": {
      cache.session.styleMap = new Map();
      cache.session.nodeMap = new Map();
      cache.session.styleCache = new WeakMap();

      cache.computedStyle = new WeakMap();
      cache.measureHints = new WeakMap();
      cache.baseStyle = new EvictingMap<string, string>(MAX_BASE_STYLE);
      cache.defaultStyle = new EvictingMap<string, Record<string, string>>(MAX_DEFAULT_STYLE);
      cache.image = new EvictingMap<string, string>(MAX_IMAGE);
      cache.background = new EvictingMap<string, string | null>(MAX_BACKGROUND);
      cache.resource = new EvictingMap<string, string>(MAX_RESOURCE);
      cache.font = new Set();
      return;
    }
    default: {
      cache.session.styleMap = new Map();
      cache.session.nodeMap = new Map();
      cache.session.styleCache = new WeakMap();
      return;
    }
  }
};
