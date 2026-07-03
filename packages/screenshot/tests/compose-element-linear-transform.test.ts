import { describe, expect, it } from "vite-plus/test";
import { composeElementLinearTransform } from "../src/utils/compose-element-linear-transform";
import { multiplyLinearTransforms } from "../src/utils/multiply-linear-transforms";
import { parseRotateLinear } from "../src/utils/parse-rotate-linear";
import { parseScaleLinear } from "../src/utils/parse-scale-linear";
import { parseTransformMatrix } from "../src/utils/parse-transform-matrix";

const expectLinearCloseTo = (
  actual: { a: number; b: number; c: number; d: number },
  expected: { a: number; b: number; c: number; d: number },
): void => {
  expect(actual.a).toBeCloseTo(expected.a, 6);
  expect(actual.b).toBeCloseTo(expected.b, 6);
  expect(actual.c).toBeCloseTo(expected.c, 6);
  expect(actual.d).toBeCloseTo(expected.d, 6);
};

describe("parseTransformMatrix", () => {
  it("returns null for none and undefined", () => {
    expect(parseTransformMatrix("none")).toBeNull();
    expect(parseTransformMatrix(undefined)).toBeNull();
  });

  it("extracts the linear part of a 2d matrix", () => {
    expectLinearCloseTo(
      parseTransformMatrix("matrix(1, 2, 3, 4, 50, 60)") ?? { a: 0, b: 0, c: 0, d: 0 },
      {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      },
    );
  });

  it("flattens a matrix3d to its top-left 2x2 block", () => {
    const flattened = parseTransformMatrix(
      "matrix3d(0.7, 0.1, 0, 0, -0.2, 0.9, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1)",
    );
    expectLinearCloseTo(flattened ?? { a: 0, b: 0, c: 0, d: 0 }, {
      a: 0.7,
      b: 0.1,
      c: -0.2,
      d: 0.9,
    });
  });

  it("rejects malformed values", () => {
    expect(parseTransformMatrix("matrix(1, 2, 3)")).toBeNull();
    expect(parseTransformMatrix("rotate(45deg)")).toBeNull();
  });
});

describe("parseRotateLinear", () => {
  it("parses a bare angle as a z rotation", () => {
    const quarterTurn = parseRotateLinear("90deg");
    expectLinearCloseTo(quarterTurn ?? { a: 0, b: 0, c: 0, d: 0 }, { a: 0, b: 1, c: -1, d: 0 });
  });

  it("flattens an x-axis rotation to a vertical squash", () => {
    const rotated = parseRotateLinear("x 60deg");
    expectLinearCloseTo(rotated ?? { a: 0, b: 0, c: 0, d: 0 }, { a: 1, b: 0, c: 0, d: 0.5 });
  });

  it("parses a numeric axis form", () => {
    const aroundZ = parseRotateLinear("0 0 1 45deg");
    const bare = parseRotateLinear("45deg");
    expectLinearCloseTo(aroundZ ?? { a: 0, b: 0, c: 0, d: 0 }, bare ?? { a: 0, b: 0, c: 0, d: 0 });
  });

  it("returns null for none and a zero-length axis", () => {
    expect(parseRotateLinear("none")).toBeNull();
    expect(parseRotateLinear("0 0 0 45deg")).toBeNull();
  });
});

describe("parseScaleLinear", () => {
  it("expands a single factor to both axes", () => {
    expectLinearCloseTo(parseScaleLinear("2") ?? { a: 0, b: 0, c: 0, d: 0 }, {
      a: 2,
      b: 0,
      c: 0,
      d: 2,
    });
  });

  it("keeps distinct x and y factors", () => {
    expectLinearCloseTo(parseScaleLinear("2 0.5 3") ?? { a: 0, b: 0, c: 0, d: 0 }, {
      a: 2,
      b: 0,
      c: 0,
      d: 0.5,
    });
  });

  it("returns null for none", () => {
    expect(parseScaleLinear("none")).toBeNull();
  });
});

describe("multiplyLinearTransforms", () => {
  it("applies the inner transform first", () => {
    const rotate90 = { a: 0, b: 1, c: -1, d: 0 };
    const scaleX2 = { a: 2, b: 0, c: 0, d: 1 };
    expectLinearCloseTo(multiplyLinearTransforms(scaleX2, rotate90), {
      a: 0,
      b: 1,
      c: -2,
      d: 0,
    });
  });
});

describe("composeElementLinearTransform", () => {
  it("returns identity when nothing is set", () => {
    expectLinearCloseTo(
      composeElementLinearTransform({ transform: "none", rotate: "none", scale: "none" }),
      { a: 1, b: 0, c: 0, d: 1 },
    );
  });

  it("composes rotate after scale after transform", () => {
    const composed = composeElementLinearTransform({
      transform: "matrix(1, 0, 0, 1, 30, 40)",
      rotate: "90deg",
      scale: "2",
    });
    expectLinearCloseTo(composed, { a: 0, b: 2, c: -2, d: 0 });
  });
});
