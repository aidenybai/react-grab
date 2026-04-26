import { CHROMIUM_PICKLE_ALIGNMENT_BYTES, MAX_CHROMIUM_PICKLE_ENTRIES } from "./constants.js";

// Chromium-family browsers (Chrome, Edge, Cursor, Electron) and WebKit
// (Safari) on macOS bundle web-custom-format clipboard data into a single
// pasteboard entry with this layout:
//
//   uint32 LE  payload_size_bytes  // total size after this 4-byte prefix
//   uint32 LE  num_entries
//   for each entry:
//     uint32 LE  mime_codeunits   // length of MIME type in UTF-16 code units
//     bytes      mime_utf16_le    // mime_codeunits * 2 bytes
//     padding    align to 4 bytes
//     uint32 LE  data_codeunits   // length of value in UTF-16 code units
//     bytes      data_utf16_le    // data_codeunits * 2 bytes
//     padding    align to 4 bytes
//
// Chromium's source-of-truth is `ui/base/clipboard/clipboard_format_type_mac.mm`
// (uses `base::Pickle`). WebKit's exact layout under
// `org.webkit.web-custom-data` was not verified against a real Safari
// clipboard at the time of writing - the same parser is reused on a
// best-effort basis and returns null cleanly if the format differs.

const alignTo = (offset: number, alignment: number): number =>
  (offset + alignment - 1) & ~(alignment - 1);

export const decodeChromiumWebCustomData = (payload: Buffer, targetMime: string): string | null => {
  if (payload.length < 8) return null;

  const declaredPayloadSize = payload.readUInt32LE(0);
  const end = Math.min(payload.length, 4 + declaredPayloadSize);

  let offset = 4;
  const entryCount = payload.readUInt32LE(offset);
  offset += 4;
  if (entryCount > MAX_CHROMIUM_PICKLE_ENTRIES) return null;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (offset + 4 > end) return null;
    const mimeCodeUnits = payload.readUInt32LE(offset);
    offset += 4;
    const mimeBytes = mimeCodeUnits * 2;
    if (offset + mimeBytes > end) return null;
    const mime = payload.subarray(offset, offset + mimeBytes).toString("utf16le");
    offset = alignTo(offset + mimeBytes, CHROMIUM_PICKLE_ALIGNMENT_BYTES);

    if (offset + 4 > end) return null;
    const dataCodeUnits = payload.readUInt32LE(offset);
    offset += 4;
    const dataBytes = dataCodeUnits * 2;
    if (offset + dataBytes > end) return null;
    const data = payload.subarray(offset, offset + dataBytes).toString("utf16le");
    offset = alignTo(offset + dataBytes, CHROMIUM_PICKLE_ALIGNMENT_BYTES);

    if (mime === targetMime) return data;
  }

  return null;
};
