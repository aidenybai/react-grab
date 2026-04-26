// Chromium serializes web-custom-format clipboard data on macOS into a single
// pasteboard type 'org.chromium.web-custom-data' using base::Pickle:
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
// (See Chromium ui/base/clipboard/clipboard_format_type_mac.mm). Each MIME
// type the page wrote via clipboardData.setData(type, data) becomes one entry.

const PICKLE_ALIGNMENT = 4;

const alignTo = (offset: number, alignment: number): number =>
  (offset + alignment - 1) & ~(alignment - 1);

export const decodeChromiumWebCustomData = (payload: Buffer, targetMime: string): string | null => {
  if (payload.length < 8) return null;

  const declaredPayloadSize = payload.readUInt32LE(0);
  const end = Math.min(payload.length, 4 + declaredPayloadSize);

  let offset = 4;
  const entryCount = payload.readUInt32LE(offset);
  offset += 4;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (offset + 4 > end) return null;
    const mimeCodeUnits = payload.readUInt32LE(offset);
    offset += 4;
    const mimeBytes = mimeCodeUnits * 2;
    if (offset + mimeBytes > end) return null;
    const mime = payload.subarray(offset, offset + mimeBytes).toString("utf16le");
    offset = alignTo(offset + mimeBytes, PICKLE_ALIGNMENT);

    if (offset + 4 > end) return null;
    const dataCodeUnits = payload.readUInt32LE(offset);
    offset += 4;
    const dataBytes = dataCodeUnits * 2;
    if (offset + dataBytes > end) return null;
    const data = payload.subarray(offset, offset + dataBytes).toString("utf16le");
    offset = alignTo(offset + dataBytes, PICKLE_ALIGNMENT);

    if (mime === targetMime) return data;
  }

  return null;
};
