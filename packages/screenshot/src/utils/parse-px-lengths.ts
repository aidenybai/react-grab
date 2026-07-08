export const parsePxLengths = (value: string): number[] => {
  const matches = value.match(/-?\d+(?:\.\d+)?px/g);
  return matches ? matches.map((match) => Number.parseFloat(match)) : [];
};
