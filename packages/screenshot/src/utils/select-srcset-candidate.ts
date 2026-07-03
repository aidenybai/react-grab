import type { SrcsetCandidate } from "../types";

export const selectSrcsetCandidate = (
  srcsetValue: string,
  layoutWidthPx: number,
  devicePixelRatio: number,
): string | null => {
  const candidates: SrcsetCandidate[] = [];
  for (const candidateEntry of srcsetValue.split(",")) {
    const [candidateUrl, descriptor] = candidateEntry.trim().split(/\s+/);
    if (!candidateUrl) continue;
    let density = 1;
    if (descriptor?.endsWith("x")) {
      density = Number.parseFloat(descriptor);
    } else if (descriptor?.endsWith("w")) {
      const widthDescriptorPx = Number.parseFloat(descriptor);
      density = layoutWidthPx > 0 ? widthDescriptorPx / layoutWidthPx : 1;
    }
    if (!Number.isFinite(density) || density <= 0) continue;
    candidates.push({ url: candidateUrl, density });
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (firstCandidate, secondCandidate) => firstCandidate.density - secondCandidate.density,
  );
  const sufficientCandidate = candidates.find((candidate) => candidate.density >= devicePixelRatio);
  return (sufficientCandidate ?? candidates[candidates.length - 1]).url;
};
