import { safeEncodeURI } from "../utils/helpers.js";

export type SnapFetchAs = "text" | "blob" | "dataURL";

export interface SnapFetchOptions {
  as?: SnapFetchAs;
  timeout?: number;
  useProxy?: string;
  errorTTL?: number;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  silent?: boolean;
  onError?: (result: SnapFetchResult) => void;
}

export interface SnapFetchResult {
  ok: boolean;
  data: string | Blob | null;
  status: number;
  url: string;
  fromCache: boolean;
  mime?: string;
  reason?: string;
}

interface SnapLoggerOptions {
  ttlMs?: number;
  maxEntries?: number;
}

interface SnapLogger {
  warnOnce: (key: string, msg: string) => void;
  errorOnce: (key: string, msg: string) => void;
  reset: () => void;
}

interface SnapFetchErrorCacheEntry {
  until: number;
  result: SnapFetchResult;
}

const createSnapLogger = (
  prefix = "[snapshot]",
  { ttlMs = 5 * 60_000, maxEntries = 12 }: SnapLoggerOptions = {},
): SnapLogger => {
  const seen = new Map<string, number>();
  let emitted = 0;

  const log = (level: "warn" | "error", key: string, msg: string): void => {
    if (emitted >= maxEntries) return;
    const now = Date.now();
    const until = seen.get(key) || 0;
    if (until > now) return;
    seen.set(key, now + ttlMs);
    emitted++;
    if (level === "warn" && console && console.warn) console.warn(`${prefix} ${msg}`);
    else if (console && console.error) console.error(`${prefix} ${msg}`);
  };

  return {
    warnOnce: (key: string, msg: string): void => {
      log("warn", key, msg);
    },
    errorOnce: (key: string, msg: string): void => {
      log("error", key, msg);
    },
    reset: (): void => {
      seen.clear();
      emitted = 0;
    },
  };
};

const snapLogger = createSnapLogger("[snapshot]", { ttlMs: 3 * 60_000, maxEntries: 10 });

const _inflight = new Map<string, Promise<SnapFetchResult>>();
const _errorCache = new Map<string, SnapFetchErrorCacheEntry>();

const isSpecialURL = (url: string): boolean => {
  return /^data:|^blob:|^about:blank$/i.test(url);
};

const isAlreadyProxied = (url: string, useProxy: string): boolean => {
  try {
    const baseHref =
      typeof location !== "undefined" && location.href ? location.href : "http://localhost/";
    const proxyBaseRaw = useProxy.includes("{url}") ? useProxy.split("{url}")[0] : useProxy;
    const proxyBase = new URL(proxyBaseRaw || ".", baseHref);
    const u = new URL(url, baseHref);

    if (u.origin === proxyBase.origin) return true;

    const sp = u.searchParams;
    if (sp && (sp.has("url") || sp.has("target"))) return true;
  } catch {}
  return false;
};

const shouldProxy = (url: string, useProxy: string): boolean => {
  if (!useProxy) return false;
  if (isSpecialURL(url)) return false;
  if (isAlreadyProxied(url, useProxy)) return false;
  try {
    const base =
      typeof location !== "undefined" && location.href ? location.href : "http://localhost/";
    const u = new URL(url, base);
    return typeof location !== "undefined" ? u.origin !== location.origin : true;
  } catch {
    return Boolean(useProxy);
  }
};

const applyProxy = (url: string, useProxy: string): string => {
  if (!useProxy) return url;

  if (useProxy.includes("{url}")) {
    return useProxy
      .replace("{urlRaw}", safeEncodeURI(url))
      .replace("{url}", encodeURIComponent(url));
  }

  if (/[?&]url=?$/.test(useProxy)) {
    return `${useProxy}${encodeURIComponent(url)}`;
  }
  if (useProxy.endsWith("?")) {
    return `${useProxy}url=${encodeURIComponent(url)}`;
  }

  if (useProxy.endsWith("/")) {
    return `${useProxy}${safeEncodeURI(url)}`;
  }

  const sep = useProxy.includes("?") ? "&" : "?";
  return `${useProxy}${sep}url=${encodeURIComponent(url)}`;
};

const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || ""));
    fr.onerror = () => rej(new Error("read_failed"));
    fr.readAsDataURL(blob);
  });
};

const makeKey = (
  url: string,
  o: Pick<SnapFetchOptions, "as" | "timeout" | "useProxy" | "errorTTL">,
): string => {
  return [o.as || "blob", o.timeout ?? 3000, o.useProxy || "", o.errorTTL ?? 8000, url].join("|");
};

export const snapFetch = async (
  url: string,
  options: SnapFetchOptions = {},
): Promise<SnapFetchResult> => {
  const as = options.as ?? "blob";
  const timeout = options.timeout ?? 3000;
  const useProxy = options.useProxy || "";
  const errorTTL = options.errorTTL ?? 8000;
  const headers = options.headers || {};
  const silent = Boolean(options.silent);

  if (/^data:/i.test(url)) {
    try {
      if (as === "text") {
        return { ok: true, data: String(url), status: 200, url, fromCache: false };
      }
      if (as === "dataURL") {
        return {
          ok: true,
          data: String(url),
          status: 200,
          url,
          fromCache: false,
          mime: String(url).slice(5).split(";")[0] || "",
        };
      }
      const [, meta = "", data = ""] = String(url).match(/^data:([^,]*),(.*)$/) || [];
      const isBase64 = /;base64/i.test(meta);
      const bin = isBase64 ? atob(data) : decodeURIComponent(data);
      const bytes = new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
      const b = new Blob([bytes], { type: (meta || "").split(";")[0] || "" });
      return { ok: true, data: b, status: 200, url, fromCache: false, mime: b.type || "" };
    } catch {
      return {
        ok: false,
        data: null,
        status: 0,
        url,
        fromCache: false,
        reason: "special_url_error",
      };
    }
  }

  if (/^blob:/i.test(url)) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        return {
          ok: false,
          data: null,
          status: resp.status,
          url,
          fromCache: false,
          reason: "http_error",
        };
      }
      const blob = await resp.blob();
      const mime = blob.type || resp.headers.get("content-type") || "";
      if (as === "dataURL") {
        const dataURL = await blobToDataURL(blob);
        return { ok: true, data: dataURL, status: resp.status, url, fromCache: false, mime };
      }
      if (as === "text") {
        const text = await blob.text();
        return { ok: true, data: text, status: resp.status, url, fromCache: false, mime };
      }
      return { ok: true, data: blob, status: resp.status, url, fromCache: false, mime };
    } catch {
      return { ok: false, data: null, status: 0, url, fromCache: false, reason: "network" };
    }
  }

  if (/^about:blank$/i.test(url)) {
    if (as === "dataURL") {
      return {
        ok: true,
        data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
        status: 200,
        url,
        fromCache: false,
        mime: "image/png",
      };
    }
    return {
      ok: true,
      data: as === "text" ? "" : new Blob([]),
      status: 200,
      url,
      fromCache: false,
    };
  }

  const key = makeKey(url, { as, timeout, useProxy, errorTTL });

  const e = _errorCache.get(key);
  if (e && e.until > Date.now()) {
    return { ...e.result, fromCache: true };
  } else if (e) {
    _errorCache.delete(key);
  }

  const inflight = _inflight.get(key);
  if (inflight) return inflight;

  const finalURL = shouldProxy(url, useProxy) ? applyProxy(url, useProxy) : url;

  let cred = options.credentials;
  if (!cred) {
    try {
      const base =
        typeof location !== "undefined" && location.href ? location.href : "http://localhost/";
      const u = new URL(url, base);
      const sameOrigin = typeof location !== "undefined" && u.origin === location.origin;
      cred = sameOrigin ? "include" : "omit";
    } catch {
      cred = "omit";
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), timeout);

  const p = (async (): Promise<SnapFetchResult> => {
    try {
      const resp = await fetch(finalURL, { signal: ctrl.signal, credentials: cred, headers });

      if (!resp.ok) {
        const result: SnapFetchResult = {
          ok: false,
          data: null,
          status: resp.status,
          url: finalURL,
          fromCache: false,
          reason: "http_error",
        };
        if (errorTTL > 0) _errorCache.set(key, { until: Date.now() + errorTTL, result });
        if (!silent) {
          const short = `${resp.status} ${resp.statusText || ""}`.trim();
          snapLogger.warnOnce(
            `http:${resp.status}:${as}:${new URL(url, location?.href ?? "http://localhost/").origin}`,
            `HTTP error ${short} while fetching ${as} ${url}`,
          );
        }
        if (options.onError) options.onError(result);
        return result;
      }

      if (as === "text") {
        const text = await resp.text();
        return { ok: true, data: text, status: resp.status, url: finalURL, fromCache: false };
      }

      const blob = await resp.blob();
      const mime = blob.type || resp.headers.get("content-type") || "";

      if (as === "dataURL") {
        const dataURL = await blobToDataURL(blob);
        return {
          ok: true,
          data: dataURL,
          status: resp.status,
          url: finalURL,
          fromCache: false,
          mime,
        };
      }

      return { ok: true, data: blob, status: resp.status, url: finalURL, fromCache: false, mime };
    } catch (err) {
      const candidate = err as { name?: unknown; message?: unknown } | null;
      const reason =
        candidate &&
        typeof candidate === "object" &&
        "name" in candidate &&
        candidate.name === "AbortError"
          ? String(candidate.message || "").includes("timeout")
            ? "timeout"
            : "abort"
          : "network";

      const result: SnapFetchResult = {
        ok: false,
        data: null,
        status: 0,
        url: finalURL,
        fromCache: false,
        reason,
      };

      if (!/^blob:/i.test(url) && errorTTL > 0) {
        _errorCache.set(key, { until: Date.now() + errorTTL, result });
      }

      if (!silent) {
        const k = `${reason}:${as}:${new URL(url, location?.href ?? "http://localhost/").origin}`;
        const tips =
          reason === "timeout"
            ? `Timeout after ${timeout}ms. Consider increasing timeout or using a proxy for ${url}`
            : reason === "abort"
              ? `Request aborted while fetching ${as} ${url}`
              : `Network/CORS issue while fetching ${as} ${url}. A proxy may be required`;
        snapLogger.errorOnce(k, tips);
      }

      if (options.onError) options.onError(result);
      return result;
    } finally {
      clearTimeout(timer);
      _inflight.delete(key);
    }
  })();

  _inflight.set(key, p);
  return p;
};
