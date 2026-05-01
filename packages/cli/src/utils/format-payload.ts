import { extractPromptAndContent } from "./extract-prompt-and-content.js";
import type { ReactGrabPayload } from "./parse-react-grab-payload.js";

export const formatPayload = (payload: ReactGrabPayload): string => {
  const { prompt, content } = extractPromptAndContent(payload);
  const elementsSection = `Elements (${payload.entries.length}):\n${content}`;
  return prompt !== undefined ? `Prompt: ${prompt}\n\n${elementsSection}` : elementsSection;
};
