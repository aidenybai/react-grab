import {
  COMPARATIVE_AMPLIFIER_FACTOR,
  COMPARATIVE_DIMINISHER_FACTOR,
  COMPARATIVE_MAX_MAGNITUDE,
  COMPARATIVE_MIN_MAGNITUDE,
  COMPARATIVE_REPEAT_FACTOR,
} from "../constants.js";
import type { ComparativeIntent } from "../types.js";
import { clampToRange } from "./clamp-to-range.js";

const SIZE = ["font-size", "width", "height"];
const WIDTH = ["width", "max-width", "min-width"];
const HEIGHT = ["height", "max-height", "min-height"];
const WEIGHT = ["font-weight"];
const BORDER_WIDTH = ["border-width"];
const RADIUS = ["border-radius"];
const OPACITY = ["opacity"];
const TRACKING = ["letter-spacing"];

interface PolarAdjective {
  candidates: readonly string[];
  direction: 1 | -1;
  isComparativeForm: boolean;
}

// Positive forms (`big`) only fire with another signal (a command verb,
// modifier, or repetition); comparative/superlative forms (`bigger`) are a
// strong signal on their own. `transparent`/`faint` deliberately live here —
// not as opacity aliases — because they invert the named quantity (more
// transparent means less opacity).
const POLAR_DEFINITIONS: ReadonlyArray<{
  base: readonly string[];
  comparative: readonly string[];
  candidates: readonly string[];
  direction: 1 | -1;
}> = [
  {
    base: ["big", "large", "huge", "enormous", "giant", "massive"],
    comparative: ["bigger", "biggest", "larger", "largest", "grow", "enlarge"],
    candidates: SIZE,
    direction: 1,
  },
  {
    base: ["small", "tiny", "petite"],
    comparative: ["smaller", "smallest", "tinier", "tiniest", "shrink"],
    candidates: SIZE,
    direction: -1,
  },
  {
    base: ["wide", "broad"],
    comparative: ["wider", "widest", "broader"],
    candidates: WIDTH,
    direction: 1,
  },
  {
    base: ["narrow", "skinny"],
    comparative: ["narrower", "narrowest", "skinnier"],
    candidates: WIDTH,
    direction: -1,
  },
  { base: ["tall"], comparative: ["taller", "tallest"], candidates: HEIGHT, direction: 1 },
  { base: ["short"], comparative: ["shorter", "shortest"], candidates: HEIGHT, direction: -1 },
  {
    base: ["bold", "heavy"],
    comparative: ["bolder", "boldest", "heavier", "heaviest"],
    candidates: WEIGHT,
    direction: 1,
  },
  { base: ["light"], comparative: ["lighter", "lightest"], candidates: WEIGHT, direction: -1 },
  { base: ["thick"], comparative: ["thicker", "thickest"], candidates: BORDER_WIDTH, direction: 1 },
  {
    base: ["thin"],
    comparative: ["thinner", "thinnest"],
    candidates: BORDER_WIDTH,
    direction: -1,
  },
  {
    base: ["round", "rounded"],
    comparative: ["rounder", "roundest"],
    candidates: RADIUS,
    direction: 1,
  },
  {
    base: ["sharp", "square", "squared", "boxy"],
    comparative: ["sharper", "sharpest", "squarer"],
    candidates: RADIUS,
    direction: -1,
  },
  { base: ["opaque"], comparative: ["opaquer"], candidates: OPACITY, direction: 1 },
  {
    base: ["transparent", "translucent", "faded", "faint", "see-through", "seethrough"],
    comparative: ["fainter", "faintest"],
    candidates: OPACITY,
    direction: -1,
  },
  { base: ["loose"], comparative: ["looser", "loosest"], candidates: TRACKING, direction: 1 },
  { base: ["tight"], comparative: ["tighter", "tightest"], candidates: TRACKING, direction: -1 },
];

const POLAR_ADJECTIVES = ((): Map<string, PolarAdjective> => {
  const wordToAdjective = new Map<string, PolarAdjective>();
  for (const definition of POLAR_DEFINITIONS) {
    for (const word of definition.base) {
      wordToAdjective.set(word, {
        candidates: definition.candidates,
        direction: definition.direction,
        isComparativeForm: false,
      });
    }
    for (const word of definition.comparative) {
      wordToAdjective.set(word, {
        candidates: definition.candidates,
        direction: definition.direction,
        isComparativeForm: true,
      });
    }
  }
  return wordToAdjective;
})();

const INCREASE_VERBS = new Set([
  "more",
  "increase",
  "increased",
  "increasing",
  "raise",
  "raised",
  "add",
  "added",
  "boost",
  "boosted",
  "expand",
  "expanded",
  "bump",
  "bumped",
  "extra",
  "plus",
]);

const DECREASE_VERBS = new Set([
  "less",
  "fewer",
  "decrease",
  "decreased",
  "decreasing",
  "reduce",
  "reduced",
  "lower",
  "lowered",
  "cut",
  "drop",
  "dropped",
  "lessen",
  "minimize",
  "trim",
]);

const COMMAND_VERBS = new Set(["make", "set", "turn", "render", "get", "give", "keep"]);

const AMPLIFIER_WORDS = new Set([
  "much",
  "very",
  "really",
  "super",
  "ultra",
  "way",
  "far",
  "extremely",
  "insanely",
  "massively",
  "hugely",
  "mega",
  "tons",
  "loads",
  "crazy",
]);

const DIMINISHER_WORDS = new Set([
  "slightly",
  "slight",
  "somewhat",
  "marginally",
  "barely",
  "kinda",
  "bit",
]);

const STOPWORDS = new Set([
  "it",
  "its",
  "this",
  "that",
  "the",
  "a",
  "an",
  "to",
  "by",
  "of",
  "my",
  "your",
  "please",
  "too",
  "and",
  "for",
  "on",
]);

const AMPLIFIER_PHRASE_PATTERN = /\ba\s+(?:lot|ton|whole\s+lot)\b/g;
const DIMINISHER_PHRASE_PATTERN = /\ba\s+(?:bit|little|tad|touch|smidge|hair)\b/g;

const countAndStrip = (text: string, pattern: RegExp): { text: string; count: number } => {
  let count = 0;
  const stripped = text.replace(pattern, () => {
    count++;
    return " ";
  });
  return { text: stripped, count };
};

const computeMagnitude = (
  amplifierCount: number,
  diminisherCount: number,
  extraRepeats: number,
): number => {
  const magnitude =
    COMPARATIVE_AMPLIFIER_FACTOR ** amplifierCount *
    COMPARATIVE_DIMINISHER_FACTOR ** diminisherCount *
    COMPARATIVE_REPEAT_FACTOR ** extraRepeats;
  return clampToRange(magnitude, COMPARATIVE_MIN_MAGNITUDE, COMPARATIVE_MAX_MAGNITUDE);
};

export const parseComparativeIntent = (rawQuery: string): ComparativeIntent | null => {
  const lowered = rawQuery.toLowerCase().trim();
  if (!lowered) return null;

  const amplifierPhrases = countAndStrip(lowered, AMPLIFIER_PHRASE_PATTERN);
  const diminisherPhrases = countAndStrip(amplifierPhrases.text, DIMINISHER_PHRASE_PATTERN);
  let amplifierCount = amplifierPhrases.count;
  let diminisherCount = diminisherPhrases.count;

  const tokens = diminisherPhrases.text.split(/\s+/).filter(Boolean);

  let polarAdjective: PolarAdjective | null = null;
  let polarCount = 0;
  let hasStrongPolar = false;
  let genericSign: 1 | -1 | 0 = 0;
  let genericVerbCount = 0;
  let hasCommandVerb = false;
  const subjectTokens: string[] = [];

  for (const token of tokens) {
    if (AMPLIFIER_WORDS.has(token)) {
      amplifierCount++;
      continue;
    }
    if (DIMINISHER_WORDS.has(token)) {
      diminisherCount++;
      continue;
    }
    if (COMMAND_VERBS.has(token)) {
      hasCommandVerb = true;
      continue;
    }
    if (INCREASE_VERBS.has(token)) {
      genericSign = 1;
      genericVerbCount++;
      continue;
    }
    if (DECREASE_VERBS.has(token)) {
      genericSign = -1;
      genericVerbCount++;
      continue;
    }
    const polar = POLAR_ADJECTIVES.get(token);
    if (polar) {
      polarCount++;
      if (polar.isComparativeForm) hasStrongPolar = true;
      if (!polarAdjective) polarAdjective = polar;
      continue;
    }
    if (STOPWORDS.has(token)) continue;
    subjectTokens.push(token);
  }

  const hasSignal =
    hasStrongPolar ||
    hasCommandVerb ||
    amplifierCount > 0 ||
    diminisherCount > 0 ||
    genericVerbCount > 0 ||
    polarCount >= 2;
  if (!hasSignal) return null;

  let direction: 1 | -1;
  let dimensionCandidates: readonly string[] | null;
  if (polarAdjective) {
    dimensionCandidates = polarAdjective.candidates;
    const shouldInvert = genericSign === -1;
    direction = shouldInvert ? (polarAdjective.direction === 1 ? -1 : 1) : polarAdjective.direction;
  } else if (genericSign !== 0) {
    dimensionCandidates = null;
    direction = genericSign;
  } else {
    return null;
  }

  const subject = subjectTokens.join(" ").trim() || null;
  if (!polarAdjective && !subject) return null;

  const extraRepeats = Math.max(0, polarCount - 1) + Math.max(0, genericVerbCount - 1);
  const magnitude = computeMagnitude(amplifierCount, diminisherCount, extraRepeats);

  return { subject, dimensionCandidates, direction, magnitude };
};
