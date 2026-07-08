import type { LinearTransform } from "../types";

const parseArguments = (value: string, openParenIndex: number): number[] =>
  value
    .slice(openParenIndex + 1, value.lastIndexOf(")"))
    .split(",")
    .map((argument) => Number.parseFloat(argument));

export const parseTransformMatrix = (value: string | undefined): LinearTransform | null => {
  if (!value || value === "none") return null;
  const openParenIndex = value.indexOf("(");
  if (openParenIndex === -1 || !value.endsWith(")")) return null;
  const functionName = value.slice(0, openParenIndex).trim();
  const parsedArguments = parseArguments(value, openParenIndex);
  if (parsedArguments.some((argument) => !Number.isFinite(argument))) return null;
  if (functionName === "matrix" && parsedArguments.length === 6) {
    const [a, b, c, d] = parsedArguments;
    return { a, b, c, d };
  }
  if (functionName === "matrix3d" && parsedArguments.length === 16) {
    return {
      a: parsedArguments[0],
      b: parsedArguments[1],
      c: parsedArguments[4],
      d: parsedArguments[5],
    };
  }
  return null;
};
