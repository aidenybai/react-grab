let cachedNonce: string | null | undefined;

export const detectCspNonce = (): string | null => {
  if (cachedNonce !== undefined) return cachedNonce;

  const existingElement = document.querySelector<HTMLElement>("script[nonce], style[nonce]");
  cachedNonce = existingElement?.nonce || existingElement?.getAttribute("nonce") || null;
  return cachedNonce;
};
