import { describe, expect, it } from "vite-plus/test";
import {
  CHROMIUM_PICKLE_ALIGNMENT_BYTES,
  MAX_CHROMIUM_PICKLE_ENTRIES,
} from "../src/utils/constants.js";
import { decodeChromiumWebCustomData } from "../src/utils/decode-chromium-web-custom-data.js";

interface PickleEntry {
  mime: string;
  data: string;
}

const alignTo = (offset: number, alignment: number): number =>
  (offset + alignment - 1) & ~(alignment - 1);

const buildChromiumPickle = (entries: PickleEntry[]): Buffer => {
  const headerBytes = 4;
  const entryCountBytes = 4;
  let payloadSize = entryCountBytes;
  for (const entry of entries) {
    const mimeBytes = Buffer.byteLength(entry.mime, "utf16le");
    const dataBytes = Buffer.byteLength(entry.data, "utf16le");
    payloadSize +=
      4 +
      alignTo(mimeBytes, CHROMIUM_PICKLE_ALIGNMENT_BYTES) +
      4 +
      alignTo(dataBytes, CHROMIUM_PICKLE_ALIGNMENT_BYTES);
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
    offset = alignTo(offset + mimeUtf16.length, CHROMIUM_PICKLE_ALIGNMENT_BYTES);

    const dataUtf16 = Buffer.from(entry.data, "utf16le");
    buffer.writeUInt32LE(entry.data.length, offset);
    offset += 4;
    dataUtf16.copy(buffer, offset);
    offset = alignTo(offset + dataUtf16.length, CHROMIUM_PICKLE_ALIGNMENT_BYTES);
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
    const pickle = buildChromiumPickle([{ mime: "abc", data: "xyz" }]);
    expect(decodeChromiumWebCustomData(pickle, "abc")).toBe("xyz");
  });

  it("returns null on truncated buffers (declared payload size exceeds buffer)", () => {
    const valid = buildChromiumPickle([{ mime: "a", data: "b" }]);
    const truncated = valid.subarray(0, valid.length - 4);
    expect(decodeChromiumWebCustomData(truncated, "a")).toBeNull();
  });

  it("returns null when the declared payload size is larger than the buffer", () => {
    const valid = buildChromiumPickle([{ mime: "a", data: "b" }]);
    // Lie in the header: claim a much larger payload than what's actually here.
    const lied = Buffer.from(valid);
    lied.writeUInt32LE(0xffff, 0);
    expect(decodeChromiumWebCustomData(lied, "a")).toBe("b");
  });

  it("rejects pickles claiming an entry count above MAX_CHROMIUM_PICKLE_ENTRIES", () => {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(4, 0);
    buffer.writeUInt32LE(MAX_CHROMIUM_PICKLE_ENTRIES + 1, 4);
    expect(decodeChromiumWebCustomData(buffer, "application/x-react-grab")).toBeNull();
  });

  it("accepts a pickle right at the entry-count cap", () => {
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32LE(4, 0);
    buffer.writeUInt32LE(MAX_CHROMIUM_PICKLE_ENTRIES, 4);
    // Exhausts the buffer before reading any entry; returns null but does not
    // reject for being over the cap.
    expect(decodeChromiumWebCustomData(buffer, "application/x-react-grab")).toBeNull();
  });
});
