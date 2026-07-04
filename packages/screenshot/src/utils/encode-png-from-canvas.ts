const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let crcTable: Uint32Array | null = null;

const getCrcTable = (): Uint32Array => {
  if (crcTable !== null) return crcTable;
  crcTable = new Uint32Array(256);
  for (let tableIndex = 0; tableIndex < 256; tableIndex++) {
    let crcValue = tableIndex;
    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      crcValue = crcValue & 1 ? 0xedb88320 ^ (crcValue >>> 1) : crcValue >>> 1;
    }
    crcTable[tableIndex] = crcValue;
  }
  return crcTable;
};

const crc32 = (bytes: Uint8Array, start: number, end: number): number => {
  const table = getCrcTable();
  let crcValue = 0xffffffff;
  for (let byteIndex = start; byteIndex < end; byteIndex++) {
    crcValue = table[(crcValue ^ bytes[byteIndex]) & 0xff] ^ (crcValue >>> 8);
  }
  return (crcValue ^ 0xffffffff) >>> 0;
};

const buildChunk = (chunkType: string, chunkData: Uint8Array): Uint8Array<ArrayBuffer> => {
  const chunk = new Uint8Array(12 + chunkData.length);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, chunkData.length);
  for (let charIndex = 0; charIndex < 4; charIndex++) {
    chunk[4 + charIndex] = chunkType.charCodeAt(charIndex);
  }
  chunk.set(chunkData, 8);
  chunkView.setUint32(8 + chunkData.length, crc32(chunk, 4, 8 + chunkData.length));
  return chunk;
};

// On flat UI rasters the None filter both deflates faster and compresses
// smaller than Sub (long literal runs suit zlib's matcher), and the row copy
// is a plain set().
const buildFilteredScanlines = (
  pixelBytes: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> => {
  const rowByteCount = width * 4;
  const filteredBytes = new Uint8Array((rowByteCount + 1) * height);
  let writeOffset = 0;
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    writeOffset++;
    filteredBytes.set(
      pixelBytes.subarray(rowIndex * rowByteCount, (rowIndex + 1) * rowByteCount),
      writeOffset,
    );
    writeOffset += rowByteCount;
  }
  return filteredBytes;
};

const deflateWithZlibWrapper = async (
  inputBytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> => {
  const compressionStream = new CompressionStream("deflate");
  const compressedResponse = new Response(
    new Blob([inputBytes]).stream().pipeThrough(compressionStream),
  );
  return new Uint8Array(await compressedResponse.arrayBuffer());
};

// Hand-rolled PNG container around the engine's native deflate
// (CompressionStream): WebKit's canvas.toBlob PNG encoder is an order of
// magnitude slower than Blink's, so building the IDAT stream directly turns a
// ~650ms encode into a getImageData + filter pass + native deflate.
export const encodePngFromCanvas = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const renderingContext = canvas.getContext("2d");
  if (renderingContext === null) throw new Error("Could not acquire a 2d canvas context");
  const { width, height } = canvas;
  const imageData = renderingContext.getImageData(0, 0, width, height);
  const filteredBytes = buildFilteredScanlines(imageData.data, width, height);
  const compressedBytes = await deflateWithZlibWrapper(filteredBytes);
  const headerData = new Uint8Array(13);
  const headerView = new DataView(headerData.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  headerData[8] = 8;
  headerData[9] = 6;
  return new Blob(
    [
      new Uint8Array(PNG_SIGNATURE),
      buildChunk("IHDR", headerData),
      buildChunk("IDAT", compressedBytes),
      buildChunk("IEND", new Uint8Array(0)),
    ],
    { type: "image/png" },
  );
};
