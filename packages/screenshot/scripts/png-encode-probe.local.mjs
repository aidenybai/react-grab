import { chromium } from "@playwright/test";

const fixture = process.env.FIXTURE ?? "site-streaming-rows-light";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5179/${fixture}.html`, { waitUntil: "networkidle" });
const out = await page.evaluate(async () => {
  const width = document.documentElement.scrollWidth;
  const height = Math.min(document.documentElement.scrollHeight, 700);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#123456");
  gradient.addColorStop(1, "#fedcba");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#333";
  for (let index = 0; index < 200; index++) {
    context.fillText(`sample row ${index} lorem ipsum dolor sit amet`, 10, 14 * index);
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const encodeCustom = async () => {
    const t0 = performance.now();
    const imageData = context.getImageData(0, 0, width, height);
    const tRead = performance.now();
    const rowBytes = width * 4;
    const filtered = new Uint8Array((rowBytes + 1) * height);
    const src = imageData.data;
    for (let y = 0; y < height; y++) {
      const inOffset = y * rowBytes;
      const outOffset = y * (rowBytes + 1);
      filtered[outOffset] = 1;
      filtered[outOffset + 1] = src[inOffset];
      filtered[outOffset + 2] = src[inOffset + 1];
      filtered[outOffset + 3] = src[inOffset + 2];
      filtered[outOffset + 4] = src[inOffset + 3];
      for (let x = 4; x < rowBytes; x++) {
        filtered[outOffset + 1 + x] = (src[inOffset + x] - src[inOffset + x - 4]) & 0xff;
      }
    }
    const tFilter = performance.now();
    const stream = new CompressionStream("deflate");
    const writer = stream.writable.getWriter();
    writer.write(filtered);
    writer.close();
    const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer());
    const tDeflate = performance.now();
    const chunks = [];
    const pushChunk = (type, data) => {
      const chunk = new Uint8Array(12 + data.length);
      const view = new DataView(chunk.buffer);
      view.setUint32(0, data.length);
      chunk[4] = type.charCodeAt(0);
      chunk[5] = type.charCodeAt(1);
      chunk[6] = type.charCodeAt(2);
      chunk[7] = type.charCodeAt(3);
      chunk.set(data, 8);
      view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
      chunks.push(chunk);
    };
    const ihdr = new Uint8Array(13);
    const ihdrView = new DataView(ihdr.buffer);
    ihdrView.setUint32(0, width);
    ihdrView.setUint32(4, height);
    ihdr[8] = 8;
    ihdr[9] = 6;
    pushChunk("IHDR", ihdr);
    pushChunk("IDAT", compressed);
    pushChunk("IEND", new Uint8Array(0));
    const blob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks], {
      type: "image/png",
    });
    const tEnd = performance.now();
    return {
      total: tEnd - t0,
      read: tRead - t0,
      filter: tFilter - tRead,
      deflate: tDeflate - tFilter,
      assemble: tEnd - tDeflate,
      bytes: blob.size,
      blob,
    };
  };

  const encodeNative = async () => {
    const t0 = performance.now();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return { total: performance.now() - t0, bytes: blob.size, blob };
  };

  const nativeRuns = [];
  const customRuns = [];
  for (let run = 0; run < 6; run++) {
    nativeRuns.push(await encodeNative());
    customRuns.push(await encodeCustom());
  }
  const median = (values) => values.map((r) => r.total).sort((a, b) => a - b)[3];

  const customBlob = customRuns[0].blob;
  const bitmap = await createImageBitmap(customBlob);
  const verifyCanvas = document.createElement("canvas");
  verifyCanvas.width = width;
  verifyCanvas.height = height;
  const verifyContext = verifyCanvas.getContext("2d");
  verifyContext.drawImage(bitmap, 0, 0);
  const original = context.getImageData(0, 0, width, height).data;
  const decoded = verifyContext.getImageData(0, 0, width, height).data;
  let mismatches = 0;
  for (let i = 0; i < original.length; i++) if (original[i] !== decoded[i]) mismatches++;

  return {
    size: `${width}x${height}`,
    nativeMedianMs: median(nativeRuns),
    customMedianMs: median(customRuns),
    customBreakdown: customRuns[3],
    nativeBytes: nativeRuns[0].bytes,
    customBytes: customRuns[0].bytes,
    mismatches,
  };
});
delete out.customBreakdown.blob;
console.log(JSON.stringify(out, null, 1));
await browser.close();
