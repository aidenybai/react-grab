import type { SnapshotCaptureContext, SnapshotPictureResolverOptions } from "../types.js";

interface ResolvedPictureResolverOptions {
  timeout: number;
  concurrency: number;
  resolveLazySrc: boolean;
  silent: boolean;
  useProxy: string;
}

interface RemovedSource {
  el: HTMLSourceElement;
  parent: HTMLElement | null;
  next: ChildNode | null;
}

const isPlaceholderSrc = (src: string): boolean => {
  if (!src) return true;
  if (src.startsWith("data:")) return true;
  if (src.startsWith("blob:")) return true;
  if (/^data:image\/(gif|png|svg)/.test(src) && src.length < 200) return true;
  return false;
};

const quickProbeMayNeedPictureResolver = (
  root: Element | null | undefined,
  resolveLazySrc: boolean,
): boolean => {
  if (!root || !(root instanceof Element)) return false;
  if (root.querySelector("picture")) return true;
  if (resolveLazySrc) {
    return Boolean(
      root.querySelector(
        "img[data-src], img[data-lazy-src], img[data-original], img[data-hi-res-src], img[data-srcset], img[data-lazy-srcset]",
      ),
    );
  }
  return false;
};

const findRealUrlForPicture = (
  img: HTMLImageElement,
  picture: HTMLPictureElement,
): string | null => {
  const current = img.currentSrc || "";
  if (current && !isPlaceholderSrc(current)) return current;

  const sources = picture.querySelectorAll("source[srcset]");
  let fallback: string | null = null;
  for (const source of sources) {
    const srcset = source.getAttribute("srcset");
    if (!srcset || isPlaceholderSrc(srcset)) continue;

    const media = source.getAttribute("media");
    if (media) {
      try {
        if (window.matchMedia(media).matches) {
          return srcset.split(",")[0].trim().split(/\s+/)[0];
        }
      } catch {}
    }
    if (!fallback) fallback = srcset.split(",")[0].trim().split(/\s+/)[0];
  }
  return fallback;
};

const findLazySrcAttr = (img: HTMLImageElement): string | null => {
  const candidates = [
    img.getAttribute("data-src"),
    img.getAttribute("data-lazy-src"),
    img.getAttribute("data-original"),
    img.getAttribute("data-hi-res-src"),
  ];
  for (const c of candidates) {
    if (c && !isPlaceholderSrc(c)) return c;
  }
  const dataSrcset = img.getAttribute("data-srcset") || img.getAttribute("data-lazy-srcset");
  if (dataSrcset) {
    const first = dataSrcset.split(",")[0].trim().split(/\s+/)[0];
    if (first && !isPlaceholderSrc(first)) return first;
  }
  return null;
};

const mergePictureResolverOpts = (
  options: SnapshotCaptureContext = {},
): ResolvedPictureResolverOptions => {
  const pr: SnapshotPictureResolverOptions =
    options.pictureResolver && typeof options.pictureResolver === "object"
      ? options.pictureResolver
      : {};
  return {
    timeout: pr.timeout ?? 5000,
    concurrency: pr.concurrency ?? 4,
    resolveLazySrc: pr.resolveLazySrc !== false,
    silent: pr.silent ?? false,
    useProxy: typeof options.useProxy === "string" ? options.useProxy : "",
  };
};

export const runPictureResolverBeforeClone = async (
  root: Element | null | undefined,
  options: SnapshotCaptureContext = {},
): Promise<(() => Promise<void>) | null> => {
  if (!root || !(root instanceof Element)) return null;
  if (options.resolvePicturePlaceholders === false) return null;

  const { timeout, concurrency, resolveLazySrc, silent, useProxy } =
    mergePictureResolverOpts(options);

  if (!quickProbeMayNeedPictureResolver(root, resolveLazySrc)) return null;

  const undoStack: Array<() => void> = [];
  const tasks: Array<() => Promise<void>> = [];

  const fetchAsDataUrl = async (url: string): Promise<string | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      let resp = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!resp.ok && useProxy) {
        const proxyUrl = useProxy.includes("{url}")
          ? useProxy.replace("{url}", encodeURIComponent(url))
          : useProxy.endsWith("?")
            ? `${useProxy}${encodeURIComponent(url)}`
            : `${useProxy}${useProxy.includes("?") ? "&" : "?"}url=${encodeURIComponent(url)}`;
        resp = await fetch(proxyUrl, { signal: controller.signal });
      }
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const runBatched = async (taskFns: Array<() => Promise<void>>): Promise<void> => {
    for (let i = 0; i < taskFns.length; i += concurrency) {
      const batch = taskFns.slice(i, i + concurrency);
      await Promise.allSettled(batch.map((fn) => fn()));
    }
  };

  const pictures = root.querySelectorAll("picture");
  for (const picture of pictures) {
    const img = picture.querySelector("img");
    if (!img) continue;
    const originalSrc = img.getAttribute("src") || "";
    if (!isPlaceholderSrc(originalSrc)) continue;
    const realUrl = findRealUrlForPicture(img, picture);
    if (!realUrl) continue;

    tasks.push(async () => {
      const dataUrl = await fetchAsDataUrl(realUrl);
      if (!dataUrl) {
        if (!silent)
          console.warn(`[snapshot:picture-resolver] Failed to fetch: ${realUrl.slice(0, 60)}`);
        return;
      }
      const origAttr = img.getAttribute("src");
      const origSrcset = img.getAttribute("srcset");
      const origSizes = img.getAttribute("sizes");
      const removedSources: RemovedSource[] = [];
      img.src = dataUrl;
      img.setAttribute("src", dataUrl);
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      const sources = picture.querySelectorAll("source");
      for (const s of sources) {
        removedSources.push({ el: s, parent: s.parentElement, next: s.nextSibling });
        s.remove();
      }
      undoStack.push(() => {
        if (origAttr !== null) img.setAttribute("src", origAttr);
        else img.removeAttribute("src");
        if (origSrcset !== null) img.setAttribute("srcset", origSrcset);
        if (origSizes !== null) img.setAttribute("sizes", origSizes);
        for (const { el, parent, next } of removedSources) {
          if (parent) parent.insertBefore(el, next);
        }
      });
    });
  }

  if (resolveLazySrc) {
    const imgs = root.querySelectorAll("img");
    for (const img of imgs) {
      if (img.closest("picture") && isPlaceholderSrc(img.getAttribute("src") || "")) continue;
      const currentSrc = img.getAttribute("src") || "";
      const lazySrc = findLazySrcAttr(img);
      if (lazySrc && isPlaceholderSrc(currentSrc)) {
        tasks.push(async () => {
          const dataUrl = await fetchAsDataUrl(lazySrc);
          if (!dataUrl) return;
          const origSrc = img.getAttribute("src");
          img.src = dataUrl;
          img.setAttribute("src", dataUrl);
          img.removeAttribute("srcset");
          img.removeAttribute("sizes");
          undoStack.push(() => {
            if (origSrc !== null) img.setAttribute("src", origSrc);
            else img.removeAttribute("src");
          });
        });
      }
    }
  }

  if (tasks.length === 0) return null;

  await runBatched(tasks);

  return async function undoPictureResolverMutations(): Promise<void> {
    for (const undo of undoStack) {
      try {
        undo();
      } catch {}
    }
  };
};
