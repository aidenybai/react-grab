import { BASE64_ENCODE_CHUNK_SIZE_BYTES, DEFAULT_BLOB_MIME_TYPE } from "../constants";

const encodeBytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  let binaryString = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_ENCODE_CHUNK_SIZE_BYTES) {
    binaryString += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_ENCODE_CHUNK_SIZE_BYTES),
    );
  }
  return btoa(binaryString);
};

export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mimeType = blob.type || DEFAULT_BLOB_MIME_TYPE;
  return `data:${mimeType};base64,${encodeBytesToBase64(bytes)}`;
};
