const isValidNumber = (value: number): boolean =>
  typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);

const parseMatrixValue = (value: string): number | null => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const parsedValue = parseFloat(trimmedValue);
  return isValidNumber(parsedValue) ? parsedValue : null;
};

const parseMatrixValues = (
  valuesString: string,
  expectedLength: number,
): number[] | null => {
  const rawValues = valuesString.split(",");

  if (rawValues.length !== expectedLength) {
    return null;
  }

  const parsedValues: number[] = [];
  for (const rawValue of rawValues) {
    const parsedValue = parseMatrixValue(rawValue);
    if (parsedValue === null) {
      return null;
    }
    parsedValues.push(parsedValue);
  }

  return parsedValues;
};

const isIdentityMatrix2d = (
  a: number,
  b: number,
  c: number,
  d: number,
): boolean => a === 1 && b === 0 && c === 0 && d === 1;

const isIdentityMatrix3d = (values: number[]): boolean =>
  values[0] === 1 &&
  values[1] === 0 &&
  values[2] === 0 &&
  values[3] === 0 &&
  values[4] === 0 &&
  values[5] === 1 &&
  values[6] === 0 &&
  values[7] === 0 &&
  values[8] === 0 &&
  values[9] === 0 &&
  values[10] === 1 &&
  values[11] === 0 &&
  values[15] === 1;

/**
 * Strips translation components from a CSS transform while preserving other transformations.
 *
 * This is critical for virtualized lists where elements are positioned using transforms like
 * `translateY(500px)`. Since `getBoundingClientRect()` already returns the final position
 * after all transforms, we need to remove translations to avoid applying them twice.
 *
 * Preserves:
 * - rotation (rotate, rotateX, rotateY, rotateZ, rotate3d)
 * - scale (scale, scaleX, scaleY, scaleZ, scale3d)
 * - skew (skew, skewX, skewY)
 * - perspective
 *
 * Removes:
 * - translate (translate, translateX, translateY, translateZ, translate3d)
 *
 * @example
 * // Element has: transform: translateY(100px) rotate(45deg)
 * stripTranslateFromTransform(element) // Returns: "matrix(...) with rotation but no translation"
 *
 * @example
 * // Element has: transform: translateY(100px)
 * stripTranslateFromTransform(element) // Returns: "none" (only translation, nothing to preserve)
 */
export const stripTranslateFromTransform = (element: Element): string => {
  try {
    if (!(element instanceof Element)) {
      return "none";
    }

    const computedStyle = window.getComputedStyle(element);
    if (!computedStyle) {
      return "none";
    }

    const transform = computedStyle.transform;
    if (!transform || transform === "none") {
      return "none";
    }

    const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/);
    if (matrix3dMatch) {
      const values = parseMatrixValues(matrix3dMatch[1], 16);

      if (values && values.length === 16) {
        const strippedValues = [...values];
        strippedValues[12] = 0;
        strippedValues[13] = 0;
        strippedValues[14] = 0;

        if (isIdentityMatrix3d(strippedValues)) {
          return "none";
        }

        return `matrix3d(${strippedValues.join(", ")})`;
      }
    }

    const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
    if (matrixMatch) {
      const values = parseMatrixValues(matrixMatch[1], 6);

      if (values && values.length === 6) {
        const [a, b, c, d] = values;

        if (isIdentityMatrix2d(a, b, c, d)) {
          return "none";
        }

        return `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
      }
    }

    return "none";
  } catch {
    return "none";
  }
};
