export const findLongestCommonSuffix = <T>(lists: T[][]): T[] => {
  if (lists.length === 0) return [];
  const minLength = Math.min(...lists.map((list) => list.length));
  let suffixLength = 0;
  for (let suffixIndex = 1; suffixIndex <= minLength; suffixIndex++) {
    const candidate = lists[0][lists[0].length - suffixIndex];
    const isShared = lists.every((list) => list[list.length - suffixIndex] === candidate);
    if (!isShared) break;
    suffixLength = suffixIndex;
  }
  if (suffixLength === 0) return [];
  return lists[0].slice(lists[0].length - suffixLength);
};
