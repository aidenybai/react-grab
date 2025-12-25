export const hasElements = <T>(arr: T[]): arr is [T, ...T[]] =>
  arr.length > 0 && arr[0] !== undefined;
