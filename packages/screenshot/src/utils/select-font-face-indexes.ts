import type { FontFaceStyleKeyword } from "./parse-font-face-style-keyword";
import type { FontFaceWeightRange } from "./parse-font-face-weight-range";

export interface FontFaceCandidate extends FontFaceWeightRange {
  styleKeyword: FontFaceStyleKeyword;
}

export interface FontVariantRequest {
  weight: number;
  styleKeyword: FontFaceStyleKeyword;
}

const STYLE_FALLBACK_ORDER: Record<FontFaceStyleKeyword, FontFaceStyleKeyword[]> = {
  normal: ["normal", "oblique", "italic"],
  italic: ["italic", "oblique", "normal"],
  oblique: ["oblique", "italic", "normal"],
};

const weightDistance = (candidate: FontFaceWeightRange, desiredWeight: number): number => {
  if (desiredWeight >= candidate.minWeight && desiredWeight <= candidate.maxWeight) return 0;
  return desiredWeight < candidate.minWeight
    ? candidate.minWeight - desiredWeight
    : desiredWeight - candidate.maxWeight;
};

const isAboveDesired = (candidate: FontFaceWeightRange, desiredWeight: number): boolean =>
  candidate.minWeight > desiredWeight;

// CSS font-matching weight search (css-fonts-4 §5.2): weights 400-500 prefer
// the range up to 500 ascending, then below descending, then above 500;
// lighter weights prefer below, heavier weights prefer above.
const selectByWeight = (
  candidateIndexes: number[],
  candidates: FontFaceCandidate[],
  desiredWeight: number,
): number[] => {
  const exactIndexes = candidateIndexes.filter(
    (candidateIndex) => weightDistance(candidates[candidateIndex], desiredWeight) === 0,
  );
  if (exactIndexes.length > 0) return exactIndexes;
  const belowIndexes = candidateIndexes.filter(
    (candidateIndex) => !isAboveDesired(candidates[candidateIndex], desiredWeight),
  );
  const aboveIndexes = candidateIndexes.filter((candidateIndex) =>
    isAboveDesired(candidates[candidateIndex], desiredWeight),
  );
  const nearest = (indexes: number[]): number[] => {
    let bestDistance = Infinity;
    for (const candidateIndex of indexes) {
      bestDistance = Math.min(
        bestDistance,
        weightDistance(candidates[candidateIndex], desiredWeight),
      );
    }
    return indexes.filter(
      (candidateIndex) =>
        weightDistance(candidates[candidateIndex], desiredWeight) === bestDistance,
    );
  };
  const preferAbove = desiredWeight > 500;
  const preferredIndexes = preferAbove ? aboveIndexes : belowIndexes;
  const fallbackIndexes = preferAbove ? belowIndexes : aboveIndexes;
  if (desiredWeight >= 400 && desiredWeight <= 500) {
    const upTo500Indexes = aboveIndexes.filter(
      (candidateIndex) => candidates[candidateIndex].minWeight <= 500,
    );
    if (upTo500Indexes.length > 0) return nearest(upTo500Indexes);
    if (belowIndexes.length > 0) return nearest(belowIndexes);
    return nearest(aboveIndexes);
  }
  if (preferredIndexes.length > 0) return nearest(preferredIndexes);
  return nearest(fallbackIndexes);
};

// Returns the indexes of every candidate face that CSS font matching could
// select for at least one of the requested (style, weight) variants. Faces
// outside the returned set can never render and are safe to drop.
export const selectFontFaceIndexes = (
  candidates: FontFaceCandidate[],
  requests: FontVariantRequest[],
): Set<number> => {
  const selectedIndexes = new Set<number>();
  const allIndexes = candidates.map((_, candidateIndex) => candidateIndex);
  for (const request of requests) {
    let styleFilteredIndexes: number[] = [];
    for (const styleKeyword of STYLE_FALLBACK_ORDER[request.styleKeyword]) {
      styleFilteredIndexes = allIndexes.filter(
        (candidateIndex) => candidates[candidateIndex].styleKeyword === styleKeyword,
      );
      if (styleFilteredIndexes.length > 0) break;
    }
    if (styleFilteredIndexes.length === 0) continue;
    for (const selectedIndex of selectByWeight(styleFilteredIndexes, candidates, request.weight)) {
      selectedIndexes.add(selectedIndex);
    }
  }
  return selectedIndexes;
};
