export const resolveBlobUrl = async (blobUrl: string): Promise<string | null> => {
  if (!blobUrl.startsWith("blob:")) return null;

  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        resolve(typeof result === "string" ? result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const resolveBlobUrlsInStyles = async (
  styles: Record<string, string>,
): Promise<void> => {
  for (const [property, value] of Object.entries(styles)) {
    if (!value.includes("blob:")) continue;

    const blobMatch = value.match(/url\(["']?(blob:[^"')]+)["']?\)/);
    if (!blobMatch) continue;

    const blobUrl = blobMatch[1];
    const dataUrl = await resolveBlobUrl(blobUrl);
    if (dataUrl) {
      styles[property] = value.replace(blobUrl, dataUrl);
    }
  }
};
