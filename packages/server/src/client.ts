import { DefaultChatTransport } from "ai";

export interface ParsedTextChunk {
  type: "text";
  content: string;
}

export interface ParsedFinishChunk {
  type: "finish";
  finishReason: string;
}

export type ParsedChunk = ParsedTextChunk | ParsedFinishChunk;

export const client = {
  parseStream: async function* (response: Response): AsyncGenerator<ParsedChunk> {
    if (!response.body) throw new Error("No response body");

    const transport = new DefaultChatTransport();
    const uiMessageChunkStream = transport["processResponseStream"](response.body);

    const reader = uiMessageChunkStream.getReader();

    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        if (chunk.type === "text-delta") {
          yield { type: "text", content: chunk.delta };
        } else if (chunk.type === "finish" && chunk.finishReason) {
          yield {
            type: "finish",
            finishReason: chunk.finishReason,
          };
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
