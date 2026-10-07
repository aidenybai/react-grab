export const areArraysShallowEqual = <T>(
  firstValues: readonly T[],
  secondValues: readonly T[],
): boolean =>
  firstValues.length === secondValues.length &&
  firstValues.every((value, valueIndex) => value === secondValues[valueIndex]);
