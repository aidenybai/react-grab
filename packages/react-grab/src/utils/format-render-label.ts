import { SCAN_LABEL_MAX_CHARS, SCAN_LABEL_MAX_NAMES_PER_GROUP } from "../constants.js";

// Builds the scan outline label from the component names that rendered into one
// element. Names sharing a render count are grouped under a single `×count`
// (e.g. "Row, Cell ×3, List ×1"), most-rendered first, and the whole label is
// truncated with an ellipsis so a long name or many components can't overflow.
export const formatRenderLabel = (nameCounts: Map<string, number>): string => {
  const namesByCount = new Map<number, string[]>();
  for (const [name, count] of nameCounts) {
    const names = namesByCount.get(count);
    if (names) {
      names.push(name);
    } else {
      namesByCount.set(count, [name]);
    }
  }

  const label = Array.from(namesByCount)
    .sort(([countA], [countB]) => countB - countA)
    .map(([count, names]) => {
      const joined = names.slice(0, SCAN_LABEL_MAX_NAMES_PER_GROUP).join(", ");
      return count > 1 ? `${joined} ×${count}` : joined;
    })
    .join(", ");

  return label.length > SCAN_LABEL_MAX_CHARS ? `${label.slice(0, SCAN_LABEL_MAX_CHARS)}…` : label;
};
