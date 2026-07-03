import pixelmatch from "pixelmatch";
import type { PNG } from "pngjs";
import { PIXELMATCH_COLOR_THRESHOLD } from "../../e2e/constants";
import { cropPng } from "../../e2e/utils/crop-png";
import { computeMeanChannelDelta } from "../../e2e/utils/mean-channel-delta";
import type { PngPairScore } from "../types";

export const scorePngPair = (expectedPng: PNG, actualPng: PNG): PngPairScore => {
  const intersectionWidthPx = Math.min(expectedPng.width, actualPng.width);
  const intersectionHeightPx = Math.min(expectedPng.height, actualPng.height);
  const croppedExpectedPng = cropPng(expectedPng, intersectionWidthPx, intersectionHeightPx);
  const croppedActualPng = cropPng(actualPng, intersectionWidthPx, intersectionHeightPx);
  const diffPixelCount = pixelmatch(
    croppedExpectedPng.data,
    croppedActualPng.data,
    undefined,
    intersectionWidthPx,
    intersectionHeightPx,
    { threshold: PIXELMATCH_COLOR_THRESHOLD },
  );
  return {
    score: diffPixelCount / (intersectionWidthPx * intersectionHeightPx),
    meanChannelDelta: computeMeanChannelDelta(croppedExpectedPng.data, croppedActualPng.data),
  };
};
