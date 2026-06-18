import { DEFAULT_MAX_CONTEXT_LINES } from "../constants.js";

// A NaN/Infinity maxLines would make the budget comparisons never break (and
// disable the hard cap), dumping the entire owner stack; a negative or
// fractional value is equally nonsensical. Coerce to a non-negative integer and
// fall back to the default for anything non-finite.
export const resolveMaxContextLines = (maxLines: number | undefined): number => {
  if (maxLines === undefined || !Number.isFinite(maxLines)) return DEFAULT_MAX_CONTEXT_LINES;
  return Math.max(0, Math.floor(maxLines));
};
