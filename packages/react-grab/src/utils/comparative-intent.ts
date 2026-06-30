import {
  COMPARATIVE_AMPLIFIER_FACTOR,
  COMPARATIVE_DIMINISHER_FACTOR,
  COMPARATIVE_MAX_MAGNITUDE,
  COMPARATIVE_MIN_MAGNITUDE,
  COMPARATIVE_REPEAT_FACTOR,
} from "../constants.js";
import type { ComparativeIntent } from "../types.js";
import { clampToRange } from "./clamp-to-range.js";
import { findClosestWord } from "./fuzzy-match.js";
import { propertyKeyForAlias } from "./tailwind-class-map.js";

const SIZE = ["font-size", "width", "height"];
const WIDTH = ["width", "max-width", "min-width"];
const HEIGHT = ["height", "max-height", "min-height"];
const WEIGHT = ["font-weight"];
const BORDER_WIDTH = ["border-width"];
const RADIUS = ["border-radius"];
const OPACITY = ["opacity"];
const TRACKING = ["letter-spacing"];
const SPACING = ["padding", "gap"];

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
  { base: ["opaque", "solid"], comparative: ["opaquer"], candidates: OPACITY, direction: 1 },
  {
    base: ["transparent", "translucent", "faded", "faint", "see-through", "seethrough", "dim"],
    comparative: ["fainter", "faintest", "dimmer", "dimmest"],
    candidates: OPACITY,
    direction: -1,
  },
  { base: ["loose"], comparative: ["looser", "loosest"], candidates: TRACKING, direction: 1 },
  { base: ["tight"], comparative: ["tighter", "tightest"], candidates: TRACKING, direction: -1 },
  {
    base: ["roomy", "airy", "spacious"],
    comparative: ["roomier", "airier"],
    candidates: SPACING,
    direction: 1,
  },
  { base: ["cramped", "crowded"], comparative: [], candidates: SPACING, direction: -1 },
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
  "up",
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
  "minimise",
  "trim",
  "down",
  "shave",
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
  "so",
  "real",
  "ridiculously",
  "absurdly",
  "noticeably",
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
  "and",
  "for",
  "on",
  "can",
  "could",
  "would",
  "you",
  "i",
  "im",
  "want",
  "wanna",
  "need",
  "needs",
  "just",
  "look",
  "looks",
  "looking",
]);

// Snapshots of each vocabulary for fuzzy fallback. Order within each list is
// the priority used on ties; categories themselves are tried in the same
// order as the exact checks below.
const POLAR_WORDS = Array.from(POLAR_ADJECTIVES.keys());
const AMPLIFIER_WORD_LIST = Array.from(AMPLIFIER_WORDS);
const DIMINISHER_WORD_LIST = Array.from(DIMINISHER_WORDS);
const COMMAND_WORD_LIST = Array.from(COMMAND_VERBS);
const INCREASE_WORD_LIST = Array.from(INCREASE_VERBS);
const DECREASE_WORD_LIST = Array.from(DECREASE_VERBS);

const AMPLIFIER_PHRASE_PATTERN = /\ba\s+(?:lot|ton|whole\s+lot)\b/g;
const DIMINISHER_PHRASE_PATTERN = /\ba\s+(?:bit|little|tad|touch|smidge|hair)\b/g;
// "too much/many <x>" reads as "trim x" without amplifying, so it is matched
// as a unit before the bare "much" amplifier is counted.
const TOO_MUCH_PHRASE_PATTERN = /\btoo\s+(?:much|many)\b/g;

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

  const tooMuchPhrases = countAndStrip(lowered, TOO_MUCH_PHRASE_PATTERN);
  const amplifierPhrases = countAndStrip(tooMuchPhrases.text, AMPLIFIER_PHRASE_PATTERN);
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
  // "too big" → smaller; "not big enough" → bigger. Tracked separately so the
  // direction resolver can flip or reinforce the adjective.
  let hasExcessCue = tooMuchPhrases.count > 0;
  let hasNegationCue = false;
  let hasEnoughCue = false;
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
    if (token === "too") {
      hasExcessCue = true;
      continue;
    }
    if (token === "not" || token === "isnt" || token === "no") {
      hasNegationCue = true;
      continue;
    }
    if (token === "enough") {
      hasEnoughCue = true;
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

    // Typo fallback. Skipped for any token that already names a property
    // (e.g. "border", "right") so a one-edit neighbor like "bolder"/"tight"
    // can never hijack a legitimate property search.
    if (propertyKeyForAlias(token) === null) {
      if (findClosestWord(token, AMPLIFIER_WORD_LIST)) {
        amplifierCount++;
        continue;
      }
      if (findClosestWord(token, DIMINISHER_WORD_LIST)) {
        diminisherCount++;
        continue;
      }
      if (findClosestWord(token, COMMAND_WORD_LIST)) {
        hasCommandVerb = true;
        continue;
      }
      if (findClosestWord(token, INCREASE_WORD_LIST)) {
        genericSign = 1;
        genericVerbCount++;
        continue;
      }
      if (findClosestWord(token, DECREASE_WORD_LIST)) {
        genericSign = -1;
        genericVerbCount++;
        continue;
      }
      const polarWord = findClosestWord(token, POLAR_WORDS);
      if (polarWord) {
        const polar = POLAR_ADJECTIVES.get(polarWord);
        if (polar) {
          polarCount++;
          if (polar.isComparativeForm) hasStrongPolar = true;
          if (!polarAdjective) polarAdjective = polar;
        }
        continue;
      }
    }

    subjectTokens.push(token);
  }

  const hasNotEnoughCue = hasNegationCue && hasEnoughCue;
  const hasSignal =
    hasStrongPolar ||
    hasCommandVerb ||
    amplifierCount > 0 ||
    diminisherCount > 0 ||
    genericVerbCount > 0 ||
    hasExcessCue ||
    hasNotEnoughCue ||
    polarCount >= 2;
  if (!hasSignal) return null;

  let direction: 1 | -1;
  let dimensionCandidates: readonly string[] | null;
  if (polarAdjective) {
    dimensionCandidates = polarAdjective.candidates;
    // A decrease cue flips the adjective's natural direction: "less wide" →
    // wider, "too big" → smaller. "not big enough" keeps it (reinforces).
    let inversions = 0;
    if (genericSign === -1) inversions++;
    if (hasExcessCue) inversions++;
    direction =
      inversions % 2 === 1 ? (polarAdjective.direction === 1 ? -1 : 1) : polarAdjective.direction;
  } else if (genericSign !== 0) {
    dimensionCandidates = null;
    direction = genericSign;
  } else if (hasExcessCue) {
    // "too much padding" → trim the named property.
    dimensionCandidates = null;
    direction = -1;
  } else if (hasNotEnoughCue) {
    // "not enough padding" → add to the named property.
    dimensionCandidates = null;
    direction = 1;
  } else {
    return null;
  }

  const subject = subjectTokens.join(" ").trim() || null;
  if (!polarAdjective && !subject) return null;

  const extraRepeats = Math.max(0, polarCount - 1) + Math.max(0, genericVerbCount - 1);
  const magnitude = computeMagnitude(amplifierCount, diminisherCount, extraRepeats);

  return { subject, dimensionCandidates, direction, magnitude };
};
