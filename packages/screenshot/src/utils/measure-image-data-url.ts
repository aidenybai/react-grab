export const measureImageDataUrl = (
  dataUrl: string,
): Promise<{ widthPx: number; heightPx: number } | null> => {
  const image = new Image();
  image.src = dataUrl;
  return image
    .decode()
    .then(() => ({ widthPx: image.naturalWidth, heightPx: image.naturalHeight }))
    .catch(() => null);
};
