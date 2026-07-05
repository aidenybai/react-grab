export interface FontFaceWeightRange {
  minWeight: number;
  maxWeight: number;
}

const KEYWORD_WEIGHTS: Record<string, number> = { normal: 400, bold: 700 };

const parseSingleWeight = (weightToken: string): number | null => {
  const keywordWeight = KEYWORD_WEIGHTS[weightToken];
  if (keywordWeight !== undefined) return keywordWeight;
  const numericWeight = Number(weightToken);
  return Number.isFinite(numericWeight) && numericWeight >= 1 && numericWeight <= 1000
    ? numericWeight
    : null;
};

export const parseFontFaceWeightRange = (weightDescriptor: string): FontFaceWeightRange | null => {
  const trimmedDescriptor = weightDescriptor.trim().toLowerCase();
  if (trimmedDescriptor === "" || trimmedDescriptor === "auto") {
    return { minWeight: 400, maxWeight: 400 };
  }
  const weightTokens = trimmedDescriptor.split(/\s+/);
  if (weightTokens.length > 2) return null;
  const minWeight = parseSingleWeight(weightTokens[0]);
  if (minWeight === null) return null;
  if (weightTokens.length === 1) return { minWeight, maxWeight: minWeight };
  const maxWeight = parseSingleWeight(weightTokens[1]);
  if (maxWeight === null) return null;
  return { minWeight: Math.min(minWeight, maxWeight), maxWeight: Math.max(minWeight, maxWeight) };
};
