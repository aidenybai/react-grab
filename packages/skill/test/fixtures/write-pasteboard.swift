import AppKit

// Test fixture: emulate a browser writing React Grab data to the macOS
// pasteboard. argv[1] is the plain text; stdin is the raw base::Pickle bytes for
// the chromium web custom data type. Both are offered together, like a real copy.

let arguments = CommandLine.arguments
let text = arguments.count > 1 ? arguments[1] : ""
let pickle = FileHandle.standardInput.readDataToEndOfFile()

let pasteboard = NSPasteboard.general
let customType = NSPasteboard.PasteboardType("org.chromium.web-custom-data")
pasteboard.clearContents()
pasteboard.declareTypes([customType, .string], owner: nil)
pasteboard.setData(pickle, forType: customType)
pasteboard.setString(text, forType: .string)
