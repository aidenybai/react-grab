import AppKit

// macOS clipboard reader for the React Grab watcher. React Grab's custom MIME
// type is not exposed directly by Chromium-based browsers: the legacy
// execCommand("copy") + dataTransfer.setData path lands as a base::Pickle under
// "org.chromium.web-custom-data"; the async Clipboard API path lands as raw
// bytes referenced by "org.w3.web-custom-format.map". This reader emits the
// pickle as base64 (watch.mjs decodes it, shared with Linux/Windows) and the
// W3C payload as a resolved string, plus changeCount for cheap idle polling.

let GRAB_MIME = "application/x-react-grab"
let pasteboard = NSPasteboard.general
var result: [String: Any] = ["changeCount": pasteboard.changeCount]

if let text = pasteboard.string(forType: .string) {
  result["text"] = text
}

if let data = pasteboard.data(forType: NSPasteboard.PasteboardType("org.chromium.web-custom-data")) {
  result["pickleBase64"] = data.base64EncodedString()
}

if let mapData = pasteboard.data(
  forType: NSPasteboard.PasteboardType("org.w3.web-custom-format.map")),
  let mapString = String(data: mapData, encoding: .utf8),
  let mapJson = try? JSONSerialization.jsonObject(with: Data(mapString.utf8)) as? [String: String],
  let pasteboardType = mapJson["web " + GRAB_MIME] ?? mapJson[GRAB_MIME],
  let raw = pasteboard.data(forType: NSPasteboard.PasteboardType(pasteboardType)),
  let value = String(data: raw, encoding: .utf8)
{
  result["grab"] = value
}

let outData = try! JSONSerialization.data(withJSONObject: result, options: [])
FileHandle.standardOutput.write(outData)
