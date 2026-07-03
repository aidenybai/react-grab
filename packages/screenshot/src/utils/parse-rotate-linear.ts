import type { LinearTransform } from "../types";

const ANGLE_UNIT_TO_RADIANS: { [unit: string]: number } = {
  deg: Math.PI / 180,
  grad: Math.PI / 200,
  rad: 1,
  turn: 2 * Math.PI,
};

const parseAngleRadians = (token: string): number | null => {
  for (const unit in ANGLE_UNIT_TO_RADIANS) {
    if (!token.endsWith(unit)) continue;
    const magnitude = Number.parseFloat(token.slice(0, -unit.length));
    if (!Number.isFinite(magnitude)) return null;
    return magnitude * ANGLE_UNIT_TO_RADIANS[unit];
  }
  return null;
};

const parseAxis = (axisTokens: string[]): [number, number, number] | null => {
  if (axisTokens.length === 0) return [0, 0, 1];
  if (axisTokens.length === 1) {
    if (axisTokens[0] === "x") return [1, 0, 0];
    if (axisTokens[0] === "y") return [0, 1, 0];
    if (axisTokens[0] === "z") return [0, 0, 1];
    return null;
  }
  if (axisTokens.length !== 3) return null;
  const components = axisTokens.map((token) => Number.parseFloat(token));
  if (components.some((component) => !Number.isFinite(component))) return null;
  return [components[0], components[1], components[2]];
};

export const parseRotateLinear = (value: string | undefined): LinearTransform | null => {
  if (!value || value === "none") return null;
  const tokens = value.trim().split(/\s+/);
  const angleRadians = parseAngleRadians(tokens[tokens.length - 1]);
  if (angleRadians === null) return null;
  const axis = parseAxis(tokens.slice(0, -1));
  if (!axis) return null;
  const axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  if (axisLength === 0) return null;
  const [unitX, unitY, unitZ] = axis.map((component) => component / axisLength);
  const cosine = Math.cos(angleRadians);
  const sine = Math.sin(angleRadians);
  const oneMinusCosine = 1 - cosine;
  return {
    a: cosine + unitX * unitX * oneMinusCosine,
    b: unitY * unitX * oneMinusCosine + unitZ * sine,
    c: unitX * unitY * oneMinusCosine - unitZ * sine,
    d: cosine + unitY * unitY * oneMinusCosine,
  };
};
