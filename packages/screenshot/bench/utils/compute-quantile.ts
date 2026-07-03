export const computeQuantile = (values: number[], quantile: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const rankIndex = (sortedValues.length - 1) * quantile;
  const lowerIndex = Math.floor(rankIndex);
  const upperIndex = Math.ceil(rankIndex);
  const lowerValue = sortedValues[lowerIndex] ?? 0;
  const upperValue = sortedValues[upperIndex] ?? lowerValue;
  return lowerValue + (upperValue - lowerValue) * (rankIndex - lowerIndex);
};
