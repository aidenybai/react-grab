const readBlobViaFileReader = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const readerResult = fileReader.result;
      if (typeof readerResult === "string") resolve(readerResult);
      else reject(new Error("FileReader did not produce a data URL"));
    };
    fileReader.onerror = () => reject(fileReader.error ?? new Error("FileReader failed"));
    fileReader.readAsDataURL(blob);
  });

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  if (typeof Uint8Array.prototype.toBase64 !== "function") return readBlobViaFileReader(blob);
  const blobBytes = new Uint8Array(await blob.arrayBuffer());
  return `data:${blob.type || "application/octet-stream"};base64,${blobBytes.toBase64()}`;
};
