"use client";

import { useState, useEffect, useRef } from "react";

export type StreamStatus = "pending" | "streaming" | "complete";

export interface StreamBlock {
  id: string;
  type: "thought" | "message" | "tool_call" | "planning" | "user_message" | "code_block";
  content: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface StreamChunk {
  id: string;
  text: string;
}

export interface StreamRenderedBlock {
  id: string;
  type: "thought" | "message" | "tool_call" | "planning" | "user_message" | "code_block";
  content: string;
  chunks: StreamChunk[];
  status: StreamStatus;
  startTime?: number;
  endTime?: number;
  metadata?: Record<string, unknown>;
}

interface UseStreamOptions {
  blocks: StreamBlock[];
  chunkSize?: number;
  chunkDelayMs?: number;
  blockDelayMs?: number;
  storageKey?: string;
}

interface StreamState {
  currentBlockIndex: number;
  currentContent: string;
  status: StreamStatus;
  blocks: StreamRenderedBlock[];
  wasPreloaded: boolean;
}

export const useStream = ({
  blocks,
  chunkSize = 4,
  chunkDelayMs = 50,
  blockDelayMs = 300,
  storageKey = "stream-completed",
}: UseStreamOptions) => {
  const [state, setState] = useState<StreamState>(() => ({
    currentBlockIndex: 0,
    currentContent: "",
    status: "pending",
    wasPreloaded: false,
    blocks: blocks.map((block) => ({
      id: block.id,
      type: block.type,
      content: "",
      chunks: [],
      status: "pending" as StreamStatus,
      metadata: block.metadata,
    })),
  }));

  const hasCheckedStorage = useRef(false);

  useEffect(() => {
    if (hasCheckedStorage.current) return;
    hasCheckedStorage.current = true;
    
    if (typeof window !== "undefined") {
      const hasCompleted = localStorage.getItem(storageKey) === "true";
      
      if (hasCompleted) {
        setTimeout(() => {
          setState({
            currentBlockIndex: blocks.length,
            currentContent: "",
            status: "complete",
            wasPreloaded: true,
            blocks: blocks.map((block) => ({
              id: block.id,
              type: block.type,
              content: block.content,
              chunks: [],
              status: "complete" as StreamStatus,
              metadata: block.metadata,
            })),
          });
        }, 0);
      }
    }
  }, [blocks, storageKey]);

  const streamingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentBlockIdxRef = useRef(0);
  const currentCharIdxRef = useRef(0);

  useEffect(() => {
    if (streamingRef.current || blocks.length === 0 || !hasCheckedStorage.current) return;
    
    const hasCompleted = typeof window !== "undefined" && localStorage.getItem(storageKey) === "true";
    if (hasCompleted) return;

    streamingRef.current = true;
    currentBlockIdxRef.current = 0;
    currentCharIdxRef.current = 0;

    const streamNextChunk = () => {
      const currentBlockIdx = currentBlockIdxRef.current;
      const currentCharIdx = currentCharIdxRef.current;

      if (currentBlockIdx >= blocks.length) {
        setState((prev) => ({
          ...prev,
          status: "complete",
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, "true");
        }
        return;
      }

      const currentBlock = blocks[currentBlockIdx];
      const blockContent = currentBlock.content;
      const isToolCall = currentBlock.type === "tool_call";
      const isInstantBlock = currentBlock.type === "user_message";

      if (currentCharIdx === 0) {
        setState((prev) => {
          const newBlocks = [...prev.blocks];
          newBlocks[currentBlockIdx] = {
            ...newBlocks[currentBlockIdx],
            status: "streaming",
            startTime: Date.now(),
          };
          return {
            ...prev,
            currentBlockIndex: currentBlockIdx,
            status: "streaming",
            blocks: newBlocks,
          };
        });
      }

      if (isToolCall) {
        // Keep tool calls in "streaming" state for blockDelayMs, then mark complete
        if (currentCharIdx === 0) {
          timeoutRef.current = setTimeout(() => {
            setState((prev) => {
              const newBlocks = [...prev.blocks];
              newBlocks[currentBlockIdx] = {
                ...newBlocks[currentBlockIdx],
                content: blockContent,
                status: "complete",
                endTime: Date.now(),
              };
              return {
                ...prev,
                currentContent: blockContent,
                blocks: newBlocks,
              };
            });

            currentBlockIdxRef.current++;
            currentCharIdxRef.current = 0;

            if (currentBlockIdxRef.current < blocks.length) {
              // Move on to the next block immediately after completion
              timeoutRef.current = setTimeout(streamNextChunk, 0);
            } else {
              setState((prev) => ({
                ...prev,
                status: "complete",
              }));
              if (typeof window !== "undefined") {
                localStorage.setItem(storageKey, "true");
              }
            }
          }, blockDelayMs);
        }
        return;
      }

      if (isInstantBlock) {
        setState((prev) => {
          const newBlocks = [...prev.blocks];
          const existingBlock = newBlocks[currentBlockIdx];
          if (!existingBlock) return prev;

          newBlocks[currentBlockIdx] = {
            ...existingBlock,
            content: blockContent,
            chunks: [],
            status: "complete",
            endTime: Date.now(),
          };

          return {
            ...prev,
            currentContent: blockContent,
            blocks: newBlocks,
          };
        });

        currentBlockIdxRef.current++;
        currentCharIdxRef.current = 0;

        if (currentBlockIdxRef.current < blocks.length) {
          timeoutRef.current = setTimeout(streamNextChunk, 0);
        } else {
          setState((prev) => ({
            ...prev,
            status: "complete",
          }));
          if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, "true");
          }
        }

        return;
      }

      const endIdx = Math.min(currentCharIdx + chunkSize, blockContent.length);
      const chunk = blockContent.slice(currentCharIdx, endIdx);

      setState((prev) => {
        const newBlocks = [...prev.blocks];
        const existingBlock = newBlocks[currentBlockIdx];
        if (!existingBlock) return prev;

        const nextChunkId = `${existingBlock.id}-${existingBlock.chunks.length}`;

        newBlocks[currentBlockIdx] = {
          ...existingBlock,
          content: (existingBlock.content || "") + chunk,
          chunks: [
            ...existingBlock.chunks,
            {
              id: nextChunkId,
              text: chunk,
            },
          ],
        };
        return {
          ...prev,
          currentContent: newBlocks[currentBlockIdx].content,
          blocks: newBlocks,
        };
      });

      currentCharIdxRef.current = endIdx;

      if (currentCharIdxRef.current >= blockContent.length) {
        setState((prev) => {
          const newBlocks = [...prev.blocks];
          newBlocks[currentBlockIdx] = {
            ...newBlocks[currentBlockIdx],
            status: "complete",
            endTime: Date.now(),
          };
          return {
            ...prev,
            blocks: newBlocks,
          };
        });

        currentBlockIdxRef.current++;
        currentCharIdxRef.current = 0;

        if (currentBlockIdxRef.current < blocks.length) {
          // Proceed to next block without extra delay (keep the flow snappy)
          timeoutRef.current = setTimeout(streamNextChunk, 50);
        } else {
          setState((prev) => ({
            ...prev,
            status: "complete",
          }));
          if (typeof window !== "undefined") {
            localStorage.setItem(storageKey, "true");
          }
        }
      } else {
        timeoutRef.current = setTimeout(streamNextChunk, chunkDelayMs);
      }
    };

    timeoutRef.current = setTimeout(streamNextChunk, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [blocks, chunkSize, chunkDelayMs, blockDelayMs, storageKey]);

  return state;
};
