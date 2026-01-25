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
 * Strips translation from a computed transform string.
 */
export const stripTranslateFromTransformString = (
  transform: string,
): string => {
  if (!transform || transform === "none") return "none";

  if (transform.charCodeAt(0) === 109) {
    if (transform.charCodeAt(6) === 51) {
      const start = 9;
      const end = transform.length - 1;
      const values = parseMatrixValues(transform.slice(start, end), 16);

      if (values) {
        values[12] = 0;
        values[13] = 0;
        values[14] = 0;

        if (isIdentityMatrix3d(values)) return "none";
        return `matrix3d(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]}, ${values[7]}, ${values[8]}, ${values[9]}, ${values[10]}, ${values[11]}, 0, 0, 0, ${values[15]})`;
      }
    } else {
      const start = 7;
      const end = transform.length - 1;
      const values = parseMatrixValues(transform.slice(start, end), 6);

      if (values) {
        const a = values[0];
        const b = values[1];
        const c = values[2];
        const d = values[3];

        if (isIdentityMatrix2d(a, b, c, d)) return "none";
        return `matrix(${a}, ${b}, ${c}, ${d}, 0, 0)`;
      }
    }
  }

  return "none";
};

/**
 * Strips translation from a DOMMatrix, returning a CSS matrix string.
 */
export const stripTranslateFromMatrix = (matrix: DOMMatrix): string => {
  if (matrix.isIdentity) return "none";

  if (matrix.is2D) {
    if (isIdentityMatrix2d(matrix.a, matrix.b, matrix.c, matrix.d))
      return "none";
    return `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, 0, 0)`;
  }

  if (
    matrix.m11 === 1 &&
    matrix.m12 === 0 &&
    matrix.m13 === 0 &&
    matrix.m14 === 0 &&
    matrix.m21 === 0 &&
    matrix.m22 === 1 &&
    matrix.m23 === 0 &&
    matrix.m24 === 0 &&
    matrix.m31 === 0 &&
    matrix.m32 === 0 &&
    matrix.m33 === 1 &&
    matrix.m34 === 0 &&
    matrix.m44 === 1
  ) {
    return "none";
  }

  return `matrix3d(${matrix.m11}, ${matrix.m12}, ${matrix.m13}, ${matrix.m14}, ${matrix.m21}, ${matrix.m22}, ${matrix.m23}, ${matrix.m24}, ${matrix.m31}, ${matrix.m32}, ${matrix.m33}, ${matrix.m34}, 0, 0, 0, ${matrix.m44})`;
};
