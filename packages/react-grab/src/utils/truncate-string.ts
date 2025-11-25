export const truncateString = (
  text: string,
  maxLength: number,
  ellipsis = "…",
): string => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}${ellipsis}`;
};


