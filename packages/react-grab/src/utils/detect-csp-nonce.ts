let cachedNonce: string | undefined;

export const detectCspNonce = (): string | null => {
  if (cachedNonce !== undefined) return cachedNonce;

  const existingElement = document.querySelector<HTMLElement>("script[nonce], style[nonce]");
  const nonce = existingElement?.nonce || existingElement?.getAttribute("nonce") || null;
  if (nonce) cachedNonce = nonce;
  return nonce;
};
