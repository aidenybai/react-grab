import { describe, expect, it } from "vite-plus/test";
import { parseComparativeIntent } from "../src/utils/comparative-intent.js";

describe("parseComparativeIntent", () => {
  it("returns null for plain property searches and tailwind classes", () => {
    for (const query of ["", "padding", "color", "p-4", "text-sm", "rounded-lg", "bg-red-500"]) {
      expect(parseComparativeIntent(query), query).toBeNull();
    }
  });

  it("ignores bare positive adjectives without another signal", () => {
    for (const query of ["big", "bold", "round", "tight"]) {
      expect(parseComparativeIntent(query), query).toBeNull();
    }
  });

  it("ignores a generic verb with no subject", () => {
    expect(parseComparativeIntent("more")).toBeNull();
    expect(parseComparativeIntent("less")).toBeNull();
  });

  it("parses comparative adjectives into a dimension and direction", () => {
    const bigger = parseComparativeIntent("bigger");
    expect(bigger?.dimensionCandidates).toContain("font-size");
    expect(bigger?.direction).toBe(1);
    expect(bigger?.magnitude).toBe(1);

    expect(parseComparativeIntent("smaller")?.direction).toBe(-1);
    expect(parseComparativeIntent("wider")?.dimensionCandidates).toContain("width");
    expect(parseComparativeIntent("taller")?.dimensionCandidates).toContain("height");
    expect(parseComparativeIntent("bolder")?.dimensionCandidates).toContain("font-weight");
    expect(parseComparativeIntent("rounder")?.dimensionCandidates).toContain("border-radius");
  });

  it("treats a command verb as a signal for positive adjectives", () => {
    const intent = parseComparativeIntent("make it big");
    expect(intent?.dimensionCandidates).toContain("font-size");
    expect(intent?.direction).toBe(1);
  });

  it("scales magnitude with amplifiers, diminishers, and repetition", () => {
    expect(parseComparativeIntent("much bigger")?.magnitude).toBe(2);
    expect(parseComparativeIntent("a lot bigger")?.magnitude).toBe(2);
    expect(parseComparativeIntent("way way bigger")?.magnitude).toBe(4);
    expect(parseComparativeIntent("slightly bigger")?.magnitude).toBe(0.5);
    expect(parseComparativeIntent("a bit smaller")?.magnitude).toBe(0.5);
    // "big bigger" stacks the repeated adjective.
    expect(parseComparativeIntent("big bigger")?.magnitude).toBe(1.5);
    expect(parseComparativeIntent("make it big big bigger")?.magnitude).toBeCloseTo(1.5 ** 2, 5);
  });

  it("parses more/less commands with an explicit subject", () => {
    const more = parseComparativeIntent("more padding");
    expect(more?.subject).toBe("padding");
    expect(more?.direction).toBe(1);

    const less = parseComparativeIntent("less margin");
    expect(less?.subject).toBe("margin");
    expect(less?.direction).toBe(-1);

    const reduce = parseComparativeIntent("reduce the font size a lot");
    expect(reduce?.subject).toBe("font size");
    expect(reduce?.direction).toBe(-1);
    expect(reduce?.magnitude).toBe(2);
  });

  it("keeps the adjective's direction and exposes the subject override", () => {
    const intent = parseComparativeIntent("make the border radius bigger");
    // The adjective fixes the direction; the subject noun is carried
    // separately so resolution can override the dimension default.
    expect(intent?.subject).toBe("border radius");
    expect(intent?.direction).toBe(1);
    expect(intent?.dimensionCandidates).toContain("font-size");
  });

  it("inverts the direction for 'too X' and reinforces for 'not X enough'", () => {
    const tooBig = parseComparativeIntent("too big");
    expect(tooBig?.dimensionCandidates).toContain("font-size");
    expect(tooBig?.direction).toBe(-1);

    expect(parseComparativeIntent("too small")?.direction).toBe(1);
    expect(parseComparativeIntent("way too wide")?.direction).toBe(-1);
    expect(parseComparativeIntent("way too wide")?.magnitude).toBe(2);

    const notBigEnough = parseComparativeIntent("not big enough");
    expect(notBigEnough?.dimensionCandidates).toContain("font-size");
    expect(notBigEnough?.direction).toBe(1);
  });

  it("treats 'too much X' / 'not enough X' as subject commands", () => {
    const tooMuch = parseComparativeIntent("too much padding");
    expect(tooMuch?.subject).toBe("padding");
    expect(tooMuch?.direction).toBe(-1);
    expect(tooMuch?.magnitude).toBe(1);

    const notEnough = parseComparativeIntent("not enough margin");
    expect(notEnough?.subject).toBe("margin");
    expect(notEnough?.direction).toBe(1);
  });

  it("inverts a comparative adjective under less", () => {
    expect(parseComparativeIntent("less wide")?.direction).toBe(-1);
    expect(parseComparativeIntent("less narrow")?.direction).toBe(1);
  });

  it("recognizes up/down directional verbs and extra synonyms", () => {
    const up = parseComparativeIntent("bump up the padding");
    expect(up?.subject).toBe("padding");
    expect(up?.direction).toBe(1);

    const down = parseComparativeIntent("shave down the border");
    expect(down?.subject).toBe("border");
    expect(down?.direction).toBe(-1);
  });

  it("understands extra opacity and spacing adjectives", () => {
    expect(parseComparativeIntent("dimmer")?.dimensionCandidates).toContain("opacity");
    expect(parseComparativeIntent("dimmer")?.direction).toBe(-1);
    expect(parseComparativeIntent("roomier")?.dimensionCandidates).toContain("padding");
    expect(parseComparativeIntent("roomier")?.direction).toBe(1);
  });

  it("ignores conversational filler around the command", () => {
    const intent = parseComparativeIntent("can you make this a little bigger please");
    expect(intent?.dimensionCandidates).toContain("font-size");
    expect(intent?.direction).toBe(1);
    expect(intent?.subject).toBeNull();
  });

  it("tolerates single-character typos in adjectives and verbs", () => {
    expect(parseComparativeIntent("biger")?.dimensionCandidates).toContain("font-size");
    expect(parseComparativeIntent("biger")?.direction).toBe(1);
    expect(parseComparativeIntent("smaler")?.direction).toBe(-1);
    expect(parseComparativeIntent("widder")?.dimensionCandidates).toContain("width");

    const increase = parseComparativeIntent("incrase the padding");
    expect(increase?.subject).toBe("padding");
    expect(increase?.direction).toBe(1);

    expect(parseComparativeIntent("slighty bigger")?.magnitude).toBe(0.5);
  });

  it("never coerces a real property word into a typo'd adjective", () => {
    // "border" is one edit from "bolder", "right" from "tight" — both must
    // stay plain property searches, not comparative commands.
    expect(parseComparativeIntent("border")).toBeNull();
    expect(parseComparativeIntent("right")).toBeNull();
    expect(parseComparativeIntent("color")).toBeNull();
  });

  it("handles inverse opacity adjectives independent of more/less", () => {
    const moreTransparent = parseComparativeIntent("more transparent");
    expect(moreTransparent?.dimensionCandidates).toContain("opacity");
    expect(moreTransparent?.direction).toBe(-1);

    const lessTransparent = parseComparativeIntent("less transparent");
    expect(lessTransparent?.dimensionCandidates).toContain("opacity");
    expect(lessTransparent?.direction).toBe(1);

    expect(parseComparativeIntent("make it more opaque")?.direction).toBe(1);
  });
});
