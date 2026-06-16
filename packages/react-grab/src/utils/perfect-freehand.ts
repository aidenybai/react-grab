// Vendored from perfect-freehand (MIT, © Steve Ruiz) https://github.com/steveruizok/perfect-freehand

export type Vec2 = [number, number];

type InputPoint = number[] | { x: number; y: number; pressure?: number };

interface StrokeOptions {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  easing?: (pressure: number) => number;
  simulatePressure?: boolean;
  start?: { cap?: boolean; taper?: number | boolean; easing?: (distance: number) => number };
  end?: { cap?: boolean; taper?: number | boolean; easing?: (distance: number) => number };
  last?: boolean;
}

interface StrokePoint {
  point: Vec2;
  pressure: number;
  distance: number;
  vector: Vec2;
  runningLength: number;
}

const RATE_OF_PRESSURE_CHANGE = 0.275;
const FIXED_PI = Math.PI + 0.0001;
const START_CAP_SEGMENTS = 13;
const END_CAP_SEGMENTS = 29;
const CORNER_CAP_SEGMENTS = 13;
const END_NOISE_THRESHOLD = 3;
const MIN_STREAMLINE_T = 0.15;
const STREAMLINE_T_RANGE = 0.85;
const MIN_RADIUS = 0.01;
const DEFAULT_FIRST_PRESSURE = 0.25;
const DEFAULT_PRESSURE = 0.5;
const UNIT_OFFSET: Vec2 = [1, 1];

const neg = (A: Vec2): Vec2 => [-A[0], -A[1]];
const add = (A: Vec2, B: Vec2): Vec2 => [A[0] + B[0], A[1] + B[1]];
const sub = (A: Vec2, B: Vec2): Vec2 => [A[0] - B[0], A[1] - B[1]];
const mul = (A: Vec2, n: number): Vec2 => [A[0] * n, A[1] * n];
const div = (A: Vec2, n: number): Vec2 => [A[0] / n, A[1] / n];
const per = (A: Vec2): Vec2 => [A[1], -A[0]];
const dpr = (A: Vec2, B: Vec2): number => A[0] * B[0] + A[1] * B[1];
const isEqual = (A: Vec2, B: Vec2): boolean => A[0] === B[0] && A[1] === B[1];
const len = (A: Vec2): number => Math.hypot(A[0], A[1]);
const uni = (A: Vec2): Vec2 => div(A, len(A));
const dist = (A: Vec2, B: Vec2): number => Math.hypot(A[1] - B[1], A[0] - B[0]);
const lrp = (A: Vec2, B: Vec2, t: number): Vec2 => add(A, mul(sub(B, A), t));
const prj = (A: Vec2, B: Vec2, c: number): Vec2 => add(A, mul(B, c));

const dist2 = (A: Vec2, B: Vec2): number => {
  const deltaX = A[0] - B[0];
  const deltaY = A[1] - B[1];
  return deltaX * deltaX + deltaY * deltaY;
};

const rotAround = (A: Vec2, C: Vec2, r: number): Vec2 => {
  const s = Math.sin(r);
  const c = Math.cos(r);
  const px = A[0] - C[0];
  const py = A[1] - C[1];
  return [px * c - py * s + C[0], px * s + py * c + C[1]];
};

// The *Into helpers mutate an output vector to stay allocation-free in the hot loop.
const addInto = (out: Vec2, A: Vec2, B: Vec2): Vec2 => {
  out[0] = A[0] + B[0];
  out[1] = A[1] + B[1];
  return out;
};

const subInto = (out: Vec2, A: Vec2, B: Vec2): Vec2 => {
  out[0] = A[0] - B[0];
  out[1] = A[1] - B[1];
  return out;
};

const mulInto = (out: Vec2, A: Vec2, n: number): Vec2 => {
  out[0] = A[0] * n;
  out[1] = A[1] * n;
  return out;
};

const perInto = (out: Vec2, A: Vec2): Vec2 => {
  const temp = A[0];
  out[0] = A[1];
  out[1] = -temp;
  return out;
};

const lrpInto = (out: Vec2, A: Vec2, B: Vec2, t: number): Vec2 => {
  out[0] = A[0] + (B[0] - A[0]) * t;
  out[1] = A[1] + (B[1] - A[1]) * t;
  return out;
};

const rotAroundInto = (out: Vec2, A: Vec2, C: Vec2, r: number): Vec2 => {
  const s = Math.sin(r);
  const c = Math.cos(r);
  const px = A[0] - C[0];
  const py = A[1] - C[1];
  out[0] = px * c - py * s + C[0];
  out[1] = px * s + py * c + C[1];
  return out;
};

const getStrokeRadius = (
  size: number,
  thinning: number,
  pressure: number,
  easing: (t: number) => number = (t) => t,
): number => size * easing(0.5 - thinning * (0.5 - pressure));

const simulatePressure = (prevPressure: number, distance: number, size: number): number => {
  const speed = Math.min(1, distance / size);
  const rate = Math.min(1, 1 - speed);
  return Math.min(1, prevPressure + (rate - prevPressure) * (speed * RATE_OF_PRESSURE_CHANGE));
};

const isValidPressure = (pressure: number | undefined): pressure is number =>
  pressure != null && pressure >= 0;

const _vectorDiff: Vec2 = [0, 0];

const getStrokePoints = (points: InputPoint[], options: StrokeOptions = {}): StrokePoint[] => {
  const { streamline = 0.5, size = 16, last: isComplete = false } = options;

  if (points.length === 0) return [];

  const t = MIN_STREAMLINE_T + (1 - streamline) * STREAMLINE_T_RANGE;

  let pts: number[][] = Array.isArray(points[0])
    ? (points as number[][])
    : (points as { x: number; y: number; pressure?: number }[]).map(
        ({ x, y, pressure = DEFAULT_PRESSURE }) => [x, y, pressure],
      );

  if (pts.length === 2) {
    const last = pts[1];
    pts = pts.slice(0, -1);
    for (let i = 1; i < 5; i++) {
      pts.push(lrp(pts[0] as Vec2, last as Vec2, i / 4));
    }
  }

  if (pts.length === 1) {
    pts = [...pts, [...add(pts[0] as Vec2, UNIT_OFFSET), ...pts[0].slice(2)]];
  }

  const strokePoints: StrokePoint[] = [
    {
      point: [pts[0][0], pts[0][1]],
      pressure: isValidPressure(pts[0][2]) ? pts[0][2] : DEFAULT_FIRST_PRESSURE,
      vector: [...UNIT_OFFSET],
      distance: 0,
      runningLength: 0,
    },
  ];

  let hasReachedMinimumLength = false;
  let runningLength = 0;
  let prev = strokePoints[0];
  const max = pts.length - 1;

  for (let i = 1; i < pts.length; i++) {
    const point: Vec2 =
      isComplete && i === max ? [pts[i][0], pts[i][1]] : lrp(prev.point, pts[i] as Vec2, t);

    if (isEqual(prev.point, point)) continue;

    const distance = dist(point, prev.point);
    runningLength += distance;

    if (i < max && !hasReachedMinimumLength) {
      if (runningLength < size) continue;
      hasReachedMinimumLength = true;
    }

    subInto(_vectorDiff, prev.point, point);
    prev = {
      point,
      pressure: isValidPressure(pts[i][2]) ? pts[i][2] : DEFAULT_PRESSURE,
      vector: uni(_vectorDiff),
      distance,
      runningLength,
    };

    strokePoints.push(prev);
  }

  strokePoints[0].vector = strokePoints[1]?.vector || [0, 0];

  return strokePoints;
};

const _offset: Vec2 = [0, 0];
const _tl: Vec2 = [0, 0];
const _tr: Vec2 = [0, 0];

const drawDot = (center: Vec2, radius: number): Vec2[] => {
  const offsetPoint = add(center, [1, 1]);
  const start = prj(center, uni(per(sub(center, offsetPoint))), -radius);
  const dotPts: Vec2[] = [];
  const step = 1 / START_CAP_SEGMENTS;
  for (let t = step; t <= 1; t += step) {
    dotPts.push(rotAround(start, center, FIXED_PI * 2 * t));
  }
  return dotPts;
};

const drawRoundStartCap = (center: Vec2, rightPoint: Vec2, segments: number): Vec2[] => {
  const cap: Vec2[] = [];
  const step = 1 / segments;
  for (let t = step; t <= 1; t += step) {
    cap.push(rotAround(rightPoint, center, FIXED_PI * t));
  }
  return cap;
};

const drawFlatStartCap = (center: Vec2, leftPoint: Vec2, rightPoint: Vec2): Vec2[] => {
  const cornersVector = sub(leftPoint, rightPoint);
  const offsetA = mul(cornersVector, 0.5);
  const offsetB = mul(cornersVector, 0.51);
  return [sub(center, offsetA), sub(center, offsetB), add(center, offsetB), add(center, offsetA)];
};

const drawRoundEndCap = (
  center: Vec2,
  direction: Vec2,
  radius: number,
  segments: number,
): Vec2[] => {
  const cap: Vec2[] = [];
  const start = prj(center, direction, radius);
  const step = 1 / segments;
  for (let t = step; t < 1; t += step) {
    cap.push(rotAround(start, center, FIXED_PI * 3 * t));
  }
  return cap;
};

const drawFlatEndCap = (center: Vec2, direction: Vec2, radius: number): Vec2[] => [
  add(center, mul(direction, radius)),
  add(center, mul(direction, radius * 0.99)),
  sub(center, mul(direction, radius * 0.99)),
  sub(center, mul(direction, radius)),
];

const computeTaperDistance = (
  taper: boolean | number | undefined,
  size: number,
  totalLength: number,
): number => {
  if (taper === false || taper === undefined) return 0;
  if (taper === true) return Math.max(size, totalLength);
  return taper;
};

const computeInitialPressure = (
  points: StrokePoint[],
  shouldSimulatePressure: boolean,
  size: number,
): number =>
  points.slice(0, 10).reduce((acc, curr) => {
    let pressure = curr.pressure;
    if (shouldSimulatePressure) {
      pressure = simulatePressure(acc, curr.distance, size);
    }
    return (acc + pressure) / 2;
  }, points[0].pressure);

const getStrokeOutlinePoints = (
  points: StrokePoint[],
  options: Partial<StrokeOptions> = {},
): Vec2[] => {
  const {
    size = 16,
    smoothing = 0.5,
    thinning = 0.5,
    simulatePressure: shouldSimulatePressure = true,
    easing = (t) => t,
    start = {},
    end = {},
    last: isComplete = false,
  } = options;

  const { cap: capStart = true, easing: taperStartEase = (t) => t * (2 - t) } = start;
  const { cap: capEnd = true, easing: taperEndEase = (t) => --t * t * t + 1 } = end;

  if (points.length === 0 || size <= 0) {
    return [];
  }

  const totalLength = points[points.length - 1].runningLength;

  const taperStart = computeTaperDistance(start.taper, size, totalLength);
  const taperEnd = computeTaperDistance(end.taper, size, totalLength);

  const minDistance = Math.pow(size * smoothing, 2);

  const leftPts: Vec2[] = [];
  const rightPts: Vec2[] = [];

  let prevPressure = computeInitialPressure(points, shouldSimulatePressure, size);
  let radius = getStrokeRadius(size, thinning, points[points.length - 1].pressure, easing);
  let firstRadius: number | undefined = undefined;
  let prevVector = points[0].vector;
  let prevLeftPoint = points[0].point;
  let prevRightPoint = prevLeftPoint;
  let tempLeftPoint: Vec2 = prevLeftPoint;
  let tempRightPoint: Vec2 = prevRightPoint;
  let isPrevPointSharpCorner = false;

  for (let i = 0; i < points.length; i++) {
    let { pressure } = points[i];
    const { point, vector, distance, runningLength } = points[i];
    const isLastPoint = i === points.length - 1;

    if (!isLastPoint && totalLength - runningLength < END_NOISE_THRESHOLD) {
      continue;
    }

    if (thinning) {
      if (shouldSimulatePressure) {
        pressure = simulatePressure(prevPressure, distance, size);
      }
      radius = getStrokeRadius(size, thinning, pressure, easing);
    } else {
      radius = size / 2;
    }

    if (firstRadius === undefined) {
      firstRadius = radius;
    }

    const taperStartStrength =
      runningLength < taperStart ? taperStartEase(runningLength / taperStart) : 1;

    const taperEndStrength =
      totalLength - runningLength < taperEnd
        ? taperEndEase((totalLength - runningLength) / taperEnd)
        : 1;

    radius = Math.max(MIN_RADIUS, radius * Math.min(taperStartStrength, taperEndStrength));

    const nextVector = (!isLastPoint ? points[i + 1] : points[i]).vector;
    const nextDpr = !isLastPoint ? dpr(vector, nextVector) : 1.0;
    const prevDpr = dpr(vector, prevVector);

    const isPointSharpCorner = prevDpr < 0 && !isPrevPointSharpCorner;
    const isNextPointSharpCorner = nextDpr !== null && nextDpr < 0;

    if (isPointSharpCorner || isNextPointSharpCorner) {
      perInto(_offset, prevVector);
      mulInto(_offset, _offset, radius);

      const step = 1 / CORNER_CAP_SEGMENTS;
      for (let t = 0; t <= 1; t += step) {
        subInto(_tl, point, _offset);
        rotAroundInto(_tl, _tl, point, FIXED_PI * t);
        tempLeftPoint = [_tl[0], _tl[1]];
        leftPts.push(tempLeftPoint);

        addInto(_tr, point, _offset);
        rotAroundInto(_tr, _tr, point, FIXED_PI * -t);
        tempRightPoint = [_tr[0], _tr[1]];
        rightPts.push(tempRightPoint);
      }

      prevLeftPoint = tempLeftPoint;
      prevRightPoint = tempRightPoint;

      if (isNextPointSharpCorner) {
        isPrevPointSharpCorner = true;
      }
      continue;
    }

    isPrevPointSharpCorner = false;

    if (isLastPoint) {
      perInto(_offset, vector);
      mulInto(_offset, _offset, radius);
      leftPts.push(sub(point, _offset));
      rightPts.push(add(point, _offset));
      continue;
    }

    lrpInto(_offset, nextVector, vector, nextDpr);
    perInto(_offset, _offset);
    mulInto(_offset, _offset, radius);

    subInto(_tl, point, _offset);
    tempLeftPoint = [_tl[0], _tl[1]];

    if (i <= 1 || dist2(prevLeftPoint, tempLeftPoint) > minDistance) {
      leftPts.push(tempLeftPoint);
      prevLeftPoint = tempLeftPoint;
    }

    addInto(_tr, point, _offset);
    tempRightPoint = [_tr[0], _tr[1]];

    if (i <= 1 || dist2(prevRightPoint, tempRightPoint) > minDistance) {
      rightPts.push(tempRightPoint);
      prevRightPoint = tempRightPoint;
    }

    prevPressure = pressure;
    prevVector = vector;
  }

  const firstPoint: Vec2 = [points[0].point[0], points[0].point[1]];

  const lastPoint: Vec2 =
    points.length > 1
      ? [points[points.length - 1].point[0], points[points.length - 1].point[1]]
      : add(points[0].point, [1, 1]);

  const startCap: Vec2[] = [];
  const endCap: Vec2[] = [];

  if (points.length === 1) {
    if (!(taperStart || taperEnd) || isComplete) {
      return drawDot(firstPoint, firstRadius || radius);
    }
  } else {
    if (taperStart || (taperEnd && points.length === 1)) {
      // tapered start: no cap
    } else if (capStart) {
      startCap.push(...drawRoundStartCap(firstPoint, rightPts[0], START_CAP_SEGMENTS));
    } else {
      startCap.push(...drawFlatStartCap(firstPoint, leftPts[0], rightPts[0]));
    }

    const direction = per(neg(points[points.length - 1].vector));

    if (taperEnd || (taperStart && points.length === 1)) {
      endCap.push(lastPoint);
    } else if (capEnd) {
      endCap.push(...drawRoundEndCap(lastPoint, direction, radius, END_CAP_SEGMENTS));
    } else {
      endCap.push(...drawFlatEndCap(lastPoint, direction, radius));
    }
  }

  return leftPts.concat(endCap, rightPts.reverse(), startCap);
};

export const getStroke = (points: InputPoint[], options: StrokeOptions = {}): Vec2[] =>
  getStrokeOutlinePoints(getStrokePoints(points, options), options);
