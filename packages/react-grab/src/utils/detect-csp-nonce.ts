const cachedNonceByDocument = new WeakMap<Document, string>();

export const detectCspNonce = (targetDocument: Document = document): string | null => {
  const cachedNonce = cachedNonceByDocument.get(targetDocument);
  if (cachedNonce !== undefined) return cachedNonce;

  const existingElement = targetDocument.querySelector<HTMLElement>("script[nonce], style[nonce]");
  const nonce = existingElement?.nonce || existingElement?.getAttribute("nonce") || null;
  if (nonce) cachedNonceByDocument.set(targetDocument, nonce);
  return nonce;
};
