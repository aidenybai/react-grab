// Allowed typo budget grows with the candidate length: short words demand an
// exact hit (too easy to collide), medium words tolerate one edit, long words
// two. Tuned so comparative forms ("bigger", "smaller", "increase") forgive a
// single slip without coercing unrelated 4-letter words.
const allowedEditDistance = (length: number): number => (length <= 4 ? 0 : length <= 7 ? 1 : 2);

const MIN_FUZZY_TOKEN_LENGTH = 4;

// Bounded Levenshtein: bails out early (returning maxDistance + 1) once a row's
// best is already over budget, so most non-matches cost a few comparisons.
const editDistance = (source: string, target: string, maxDistance: number): number => {
  const sourceLength = source.length;
  const targetLength = target.length;
  if (Math.abs(sourceLength - targetLength) > maxDistance) return maxDistance + 1;

  let previousRow = new Array<number>(targetLength + 1);
  let currentRow = new Array<number>(targetLength + 1);
  for (let column = 0; column <= targetLength; column++) previousRow[column] = column;

  for (let row = 1; row <= sourceLength; row++) {
    currentRow[0] = row;
    let rowMinimum = currentRow[0];
    const sourceCharCode = source.charCodeAt(row - 1);
    for (let column = 1; column <= targetLength; column++) {
      const substitutionCost = sourceCharCode === target.charCodeAt(column - 1) ? 0 : 1;
      const deletion = previousRow[column] + 1;
      const insertion = currentRow[column - 1] + 1;
      const substitution = previousRow[column - 1] + substitutionCost;
      let best = deletion < insertion ? deletion : insertion;
      if (substitution < best) best = substitution;
      currentRow[column] = best;
      if (best < rowMinimum) rowMinimum = best;
    }
    if (rowMinimum > maxDistance) return maxDistance + 1;
    const swap = previousRow;
    previousRow = currentRow;
    currentRow = swap;
  }
  return previousRow[targetLength];
};

export const isTypoMatch = (token: string, candidate: string): boolean => {
  if (token.length < MIN_FUZZY_TOKEN_LENGTH) return false;
  const allowed = allowedEditDistance(candidate.length);
  if (allowed === 0) return false;
  return editDistance(token, candidate, allowed) <= allowed;
};

// Returns the first candidate (in supplied priority order) within typo budget,
// or null. Stops at the first single-edit hit since nothing can beat it.
export const findClosestWord = (token: string, candidates: readonly string[]): string | null => {
  if (token.length < MIN_FUZZY_TOKEN_LENGTH) return null;
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const allowed = allowedEditDistance(candidate.length);
    if (allowed === 0) continue;
    const distance = editDistance(token, candidate, allowed);
    if (distance <= allowed && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      if (distance === 1) break;
    }
  }
  return best;
};
