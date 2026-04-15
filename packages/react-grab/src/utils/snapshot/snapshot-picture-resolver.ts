import { SNAPSHOT_PLACEHOLDER_DATA_URL_MAX_LENGTH } from "../../constants.js";

const isPlaceholderSource = (source: string): boolean => {
  if (!source) return true;
  if (source.startsWith("data:") && source.length < SNAPSHOT_PLACEHOLDER_DATA_URL_MAX_LENGTH) return true;
  if (source.startsWith("blob:")) return true;
  return false;
};

export const resolvePictureSource = (imageElement: HTMLImageElement): string | null => {
  const pictureParent = imageElement.closest("picture");
  if (!pictureParent) return null;

  const currentSource = imageElement.currentSrc || "";
  if (currentSource && !isPlaceholderSource(currentSource)) return currentSource;

  const sourceElements = pictureParent.querySelectorAll("source[srcset]");
  let fallbackSource: string | null = null;

  for (const sourceElement of Array.from(sourceElements)) {
    const srcset = sourceElement.getAttribute("srcset");
    if (!srcset || isPlaceholderSource(srcset)) continue;

    const firstCandidate = srcset.split(",")[0].trim().split(/\s+/)[0];
    const mediaQuery = sourceElement.getAttribute("media");

    if (mediaQuery) {
      try {
        if (window.matchMedia(mediaQuery).matches) return firstCandidate;
      } catch {
        continue;
      }
    }

    if (!fallbackSource) fallbackSource = firstCandidate;
  }

  return fallbackSource;
};

const pickBestSrcsetCandidate = (srcset: string): string | null => {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const candidates = srcset.split(",").map((entry) => {
    const parts = entry.trim().split(/\s+/);
    const url = parts[0];
    const descriptor = parts[1] || "1x";
    const density = descriptor.endsWith("x") ? parseFloat(descriptor) : 1;
    return { url, density };
  });

  candidates.sort(
    (candidateA, candidateB) =>
      Math.abs(candidateA.density - devicePixelRatio) - Math.abs(candidateB.density - devicePixelRatio),
  );

  const bestCandidate = candidates[0];
  return bestCandidate?.url && !isPlaceholderSource(bestCandidate.url) ? bestCandidate.url : null;
};

export const resolveLazyImageSource = (imageElement: HTMLImageElement): string | null => {
  const lazyAttributes = ["data-src", "data-lazy-src", "data-original", "data-hi-res-src"];

  for (const attributeName of lazyAttributes) {
    const value = imageElement.getAttribute(attributeName);
    if (value && !isPlaceholderSource(value)) return value;
  }

  const lazySrcset = imageElement.getAttribute("data-srcset") || imageElement.getAttribute("data-lazy-srcset");
  if (lazySrcset) {
    const bestMatch = pickBestSrcsetCandidate(lazySrcset);
    if (bestMatch) return bestMatch;
  }

  return null;
};

export const resolveImageElementSource = (imageElement: HTMLImageElement): string => {
  const pictureSource = resolvePictureSource(imageElement);
  if (pictureSource) return pictureSource;

  const lazySource = resolveLazyImageSource(imageElement);
  if (lazySource) return lazySource;

  return imageElement.currentSrc || imageElement.src;
};
