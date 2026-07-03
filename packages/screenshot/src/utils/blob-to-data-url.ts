export const blobToDataUrl = (blob: Blob): Promise<string> =>
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
