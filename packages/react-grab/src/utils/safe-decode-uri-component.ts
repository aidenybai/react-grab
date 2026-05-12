export const safeDecodeURIComponent = (input: string): string => {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
};
