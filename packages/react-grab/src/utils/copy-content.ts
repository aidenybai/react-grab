import { VERSION } from "../constants.js";

const LEXICAL_EDITOR_MIME_TYPE = "application/x-lexical-editor";
const REACT_GRAB_MIME_TYPE = "application/x-react-grab";

interface CopyContentOptions {
  onSuccess?: () => void;
  name?: string;
}

interface ReactGrabMetadata {
  version: string;
  content: string;
  timestamp: number;
}

interface LexicalNode {
  detail: number;
  format: number;
  mode: string;
  style: string;
  text: string;
  type: string;
  version: number;
  mentionName?: string;
  typeaheadType?: Record<string, unknown>;
  storedKey?: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

const generateUuid = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomNibble = (Math.random() * 16) | 0;
    const hexValue =
      character === "x" ? randomNibble : (randomNibble & 0x3) | 0x8;
    return hexValue.toString(16);
  });

const createMentionNode = (
  displayName: string,
  mentionKey: string,
  typeaheadType: Record<string, unknown>,
  metadata: Record<string, unknown>,
): LexicalNode => ({
  detail: 1,
  format: 0,
  mode: "segmented",
  style: "",
  text: `@${displayName}`,
  type: "mention",
  version: 1,
  mentionName: displayName,
  typeaheadType,
  storedKey: mentionKey,
  metadata,
  source: "chat",
});

const createTextNode = (text: string): LexicalNode => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface ClipboardData {
  plainText: string;
  htmlContent: string;
  lexicalData: string;
}

// HACK: Cursor's Lexical editor only reads content from registered commands/files,
// not from embedded clipboard data. We include the content after the mention chip
// so Cursor can actually read it.
const createClipboardData = (
  content: string,
  elementName: string,
): ClipboardData => {
  const mentionKey = String(Math.floor(Math.random() * 10000));
  const namespaceUuid = generateUuid();
  const displayName = `<${elementName}>`;

  const typeaheadType = {
    case: "file",
    path: `${displayName}.tsx`,
    content,
  };

  const selectedOption = {
    key: displayName,
    type: typeaheadType,
    payload: { file: { path: `${displayName}.tsx`, content } },
    id: generateUuid(),
    name: displayName,
    _score: 20,
    isSlash: false,
    labelMatch: [{ start: 0, end: 2 }],
  };

  const mentionMetadata = {
    selection: { type: 0 },
    selectedOption,
  };

  return {
    plainText: `@${displayName}\n\n${content}\n`,
    htmlContent: `<meta charset='utf-8'><pre><code>${escapeHtml(content)}</code></pre>`,
    lexicalData: JSON.stringify({
      namespace: `chat-input${namespaceUuid}-pane`,
      nodes: [
        createMentionNode(
          displayName,
          mentionKey,
          typeaheadType,
          mentionMetadata,
        ),
        createTextNode(`\n\n${content}`),
      ],
    }),
  };
};

export const copyContent = (
  content: string,
  options?: CopyContentOptions,
): boolean => {
  const elementName = options?.name ?? "div";
  const { plainText, htmlContent, lexicalData } = createClipboardData(
    content,
    elementName,
  );
  const reactGrabMetadata: ReactGrabMetadata = {
    version: VERSION,
    content,
    timestamp: Date.now(),
  };

  const copyHandler = (event: ClipboardEvent) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", plainText);
    event.clipboardData?.setData("text/html", htmlContent);
    event.clipboardData?.setData(LEXICAL_EDITOR_MIME_TYPE, lexicalData);
    event.clipboardData?.setData(
      REACT_GRAB_MIME_TYPE,
      JSON.stringify(reactGrabMetadata),
    );
  };

  document.addEventListener("copy", copyHandler);

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.ariaHidden = "true";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const didCopySucceed = document.execCommand("copy");
    if (didCopySucceed) {
      options?.onSuccess?.();
    }
    return didCopySucceed;
  } finally {
    document.removeEventListener("copy", copyHandler);
    textarea.remove();
  }
};
