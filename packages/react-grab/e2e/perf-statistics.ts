import { PERF_ROUND_DECIMAL_PLACES } from "./perf-constants.js";

export const roundTo3 = (value: number): number => Number(value.toFixed(PERF_ROUND_DECIMAL_PLACES));

export const mean = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((totalValue, currentValue) => totalValue + currentValue, 0) / values.length;

export const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const middleIndex = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
};

export const percentile = (values: readonly number[], percentileValue: number): number => {
  if (values.length === 0) return 0;
  const sortedValues = [...values].sort((leftValue, rightValue) => leftValue - rightValue);
  const percentileIndex = Math.max(
    0,
    Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * percentileValue)),
  );
  return sortedValues[percentileIndex];
};
