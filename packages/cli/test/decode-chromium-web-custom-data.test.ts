import { describe, expect, it } from "vite-plus/test";
import { decodeChromiumWebCustomData } from "../src/utils/decode-chromium-web-custom-data.js";

interface PickleEntry {
  mime: string;
  data: string;
}

const buildChromiumPickle = (entries: PickleEntry[]): Buffer => {
  const headerBytes = 4; // payload size prefix
  const entryCountBytes = 4;
  let payloadSize = entryCountBytes;
  for (const entry of entries) {
    const mimeBytes = Buffer.byteLength(entry.mime, "utf16le");
    const dataBytes = Buffer.byteLength(entry.data, "utf16le");
    const alignedMime = (mimeBytes + 3) & ~3;
    const alignedData = (dataBytes + 3) & ~3;
    payloadSize += 4 + alignedMime + 4 + alignedData;
  }

  const buffer = Buffer.alloc(headerBytes + payloadSize);
  buffer.writeUInt32LE(payloadSize, 0);
  buffer.writeUInt32LE(entries.length, 4);
  let offset = 8;
  for (const entry of entries) {
    const mimeUtf16 = Buffer.from(entry.mime, "utf16le");
    buffer.writeUInt32LE(entry.mime.length, offset);
    offset += 4;
    mimeUtf16.copy(buffer, offset);
    offset += (mimeUtf16.length + 3) & ~3;

    const dataUtf16 = Buffer.from(entry.data, "utf16le");
    buffer.writeUInt32LE(entry.data.length, offset);
    offset += 4;
    dataUtf16.copy(buffer, offset);
    offset += (dataUtf16.length + 3) & ~3;
  }
  return buffer;
};

describe("decodeChromiumWebCustomData", () => {
  it("returns null for an empty buffer", () => {
    expect(decodeChromiumWebCustomData(Buffer.alloc(0), "application/x-react-grab")).toBeNull();
  });

  it("returns null for a buffer too short to hold the header", () => {
    expect(decodeChromiumWebCustomData(Buffer.from([1, 2, 3]), "any")).toBeNull();
  });

  it("extracts a single matching MIME entry", () => {
    const json = '{"version":"0.1.32","content":"<button/>","entries":[],"timestamp":1}';
    const pickle = buildChromiumPickle([{ mime: "application/x-react-grab", data: json }]);
    expect(decodeChromiumWebCustomData(pickle, "application/x-react-grab")).toBe(json);
  });

  it("returns null when the requested MIME type is not present", () => {
    const pickle = buildChromiumPickle([{ mime: "text/plain", data: "hello" }]);
    expect(decodeChromiumWebCustomData(pickle, "application/x-react-grab")).toBeNull();
  });

  it("scans past unrelated MIME entries to find the target", () => {
    const target = '{"react-grab":true}';
    const pickle = buildChromiumPickle([
      { mime: "text/plain", data: "hello world" },
      { mime: "application/x-react-grab", data: target },
      { mime: "text/html", data: "<p>hi</p>" },
    ]);
    expect(decodeChromiumWebCustomData(pickle, "application/x-react-grab")).toBe(target);
  });

  it("handles odd-length UTF-16 strings (non-multiple-of-4 byte counts) via alignment padding", () => {
    // 'abc' is 3 UTF-16 code units = 6 bytes; needs 2 bytes of padding.
    const pickle = buildChromiumPickle([{ mime: "abc", data: "xyz" }]);
    expect(decodeChromiumWebCustomData(pickle, "abc")).toBe("xyz");
  });

  it("returns null on truncated buffers (declared payload size exceeds buffer)", () => {
    const valid = buildChromiumPickle([{ mime: "a", data: "b" }]);
    const truncated = valid.subarray(0, valid.length - 4);
    expect(decodeChromiumWebCustomData(truncated, "a")).toBeNull();
  });
});
