export interface SlotRenderSegment {
  kind: "digit" | "literal";
  value: string;
  digitDistanceFromRight: number;
}

export interface SlotRenderSegments {
  prefixLiterals: string[];
  rightAlignedSegments: SlotRenderSegment[];
}

const SLOT_DIGIT_REGEX = /^[0-9]$/;

export const createSlotRenderSegments = (text: string): SlotRenderSegments => {
  const characters = Array.from(text);
  const firstDigitIndex = characters.findIndex((character) => SLOT_DIGIT_REGEX.test(character));

  if (firstDigitIndex < 0) {
    return {
      prefixLiterals: characters,
      rightAlignedSegments: [],
    };
  }

  const prefixLiterals = characters.slice(0, firstDigitIndex);
  const rightAlignedSegments: SlotRenderSegment[] = [];
  let digitDistanceFromRight = 0;

  for (let position = characters.length - 1; position >= firstDigitIndex; position--) {
    const value = characters[position];
    const kind = SLOT_DIGIT_REGEX.test(value) ? "digit" : "literal";
    rightAlignedSegments.push({
      kind,
      value,
      digitDistanceFromRight,
    });
    if (kind === "digit") digitDistanceFromRight += 1;
  }

  return {
    prefixLiterals,
    rightAlignedSegments,
  };
};
