"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import {
  INITIAL_STREAM_DELAY_MS,
  BLOCK_TRANSITION_DELAY_MS,
  DEFAULT_CHUNK_SIZE,
  IMMEDIATE_TIMEOUT_MS,
} from "../constants";

type BlockContent = string | ReactNode | Array<string | ReactNode>;

const getTextContent = (content: BlockContent): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((item): item is string => typeof item === "string")
      .join("");
  }
  return "";
};

export type StreamStatus = "pending" | "streaming" | "complete";

export interface StreamBlock {
  id: string;
  type:
    | "thought"
    | "message"
    | "tool_call"
    | "planning"
    | "user_message"
    | "code_block";
  content: string | ReactNode | Array<string | ReactNode>;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface StreamChunk {
  id: string;
  text: string;
}

export interface StreamRenderedBlock {
  id: string;
  type:
    | "thought"
    | "message"
    | "tool_call"
    | "planning"
    | "user_message"
    | "code_block";
  content: string | ReactNode | Array<string | ReactNode>;
  chunks: StreamChunk[];
  status: StreamStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface UseStreamOptions {
  blocks: StreamBlock[];
  chunkSize?: number;
  chunkDelayMs?: number;
  blockDelayMs?: number;
  storageKey?: string;
  pauseAtBlockId?: string;
  skipAnimation?: boolean;
}

interface StreamState {
  currentBlockIndex: number;
  currentContent: string | ReactNode | Array<string | ReactNode>;
  status: StreamStatus;
  blocks: StreamRenderedBlock[];
  wasPreloaded: boolean;
  isPaused: boolean;
}

const hasRawParam = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("raw");
};

const saveCompletionToStorage = (key: string): void => {
  if (typeof window !== "undefined" && !hasRawParam()) {
    localStorage.setItem(key, "true");
  }
};

const hasCompletedStream = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  if (hasRawParam()) return false;
  return localStorage.getItem(key) === "true";
};

export const useStream = ({
  blocks,
  chunkSize,
  chunkDelayMs,
  blockDelayMs,
  storageKey = "stream-completed",
  pauseAtBlockId,
  skipAnimation = false,
}: UseStreamOptions) => {
  const [state, setState] = useState<StreamState>(() => ({
    currentBlockIndex: 0,
    currentContent: "",
    status: "pending",
    wasPreloaded: false,
    isPaused: false,
    blocks: blocks.map((block) => ({
      id: block.id,
      type: block.type,
      content: "",
      chunks: [],
      status: "pending" as StreamStatus,
      duration: block.duration,
      metadata: block.metadata,
    })),
  }));

  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    if (hasCheckedStorage) return;

    if (typeof window !== "undefined") {
      const hasCompleted = skipAnimation || hasCompletedStream(storageKey);

      if (hasCompleted) {
        if (skipAnimation) {
          saveCompletionToStorage(storageKey);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          currentBlockIndex: blocks.length,
          currentContent: "",
          status: "complete",
          wasPreloaded: true,
          isPaused: false,
          blocks: blocks.map((block) => ({
            id: block.id,
            type: block.type,
            content: block.content,
            chunks: [],
            status: "complete" as StreamStatus,
            duration: block.duration,
            metadata: block.metadata,
          })),
        });
      }

      setHasCheckedStorage(true);
    }
  }, [blocks, storageKey, hasCheckedStorage, skipAnimation]);

  const streamingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentBlockIdxRef = useRef(0);
  const currentCharIdxRef = useRef(0);
  const resumeCallbackRef = useRef<(() => void) | null>(null);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (streamingRef.current || blocks.length === 0 || !hasCheckedStorage)
      return;

    if (hasCompletedStream(storageKey)) return;

    streamingRef.current = true;
    currentBlockIdxRef.current = 0;
    currentCharIdxRef.current = 0;

    const streamNextChunk = () => {
      const currentBlockIdx = currentBlockIdxRef.current;
      const currentCharIdx = currentCharIdxRef.current;
      const currentBlocks = blocksRef.current;

      if (currentBlockIdx >= currentBlocks.length) {
        setState((prev) => ({
          ...prev,
          status: "complete",
        }));
        saveCompletionToStorage(storageKey);
        return;
      }

      const currentBlock = currentBlocks[currentBlockIdx];
      const blockContent = currentBlock.content;
      const isToolCall = currentBlock.type === "tool_call";
      const isArray = Array.isArray(blockContent);
      const textContent = getTextContent(blockContent);
      const isReactNode = typeof blockContent !== "string" && !isArray;
      const isInstantBlock =
        currentBlock.type === "user_message" || isReactNode;

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

            const justCompletedToolBlock = currentBlocks[currentBlockIdx];
            if (
              pauseAtBlockId &&
              justCompletedToolBlock.id === pauseAtBlockId
            ) {
              setState((prev) => ({
                ...prev,
                isPaused: true,
              }));
              resumeCallbackRef.current = () => {
                setState((prev) => ({
                  ...prev,
                  isPaused: false,
                }));
                timeoutRef.current = setTimeout(
                  streamNextChunk,
                  IMMEDIATE_TIMEOUT_MS,
                );
              };
              return;
            }

            if (currentBlockIdxRef.current < currentBlocks.length) {
              timeoutRef.current = setTimeout(
                streamNextChunk,
                IMMEDIATE_TIMEOUT_MS,
              );
            } else {
              setState((prev) => ({
                ...prev,
                status: "complete",
              }));
              saveCompletionToStorage(storageKey);
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

        const justCompletedInstantBlock = currentBlocks[currentBlockIdx];
        if (pauseAtBlockId && justCompletedInstantBlock.id === pauseAtBlockId) {
          setState((prev) => ({
            ...prev,
            isPaused: true,
          }));
          resumeCallbackRef.current = () => {
            setState((prev) => ({
              ...prev,
              isPaused: false,
            }));
            timeoutRef.current = setTimeout(
              streamNextChunk,
              IMMEDIATE_TIMEOUT_MS,
            );
          };
          return;
        }

        if (currentBlockIdxRef.current < currentBlocks.length) {
          timeoutRef.current = setTimeout(
            streamNextChunk,
            IMMEDIATE_TIMEOUT_MS,
          );
        } else {
          setState((prev) => ({
            ...prev,
            status: "complete",
          }));
          saveCompletionToStorage(storageKey);
        }

        return;
      }

      if (typeof blockContent !== "string" && !isArray) return;

      const endIdx = Math.min(
        currentCharIdx + (chunkSize || DEFAULT_CHUNK_SIZE),
        textContent.length,
      );
      const chunk = textContent.slice(currentCharIdx, endIdx);

      setState((prev) => {
        const newBlocks = [...prev.blocks];
        const existingBlock = newBlocks[currentBlockIdx];
        if (!existingBlock) return prev;

        const nextChunkId = `${existingBlock.id}-${existingBlock.chunks.length}`;
        const existingTextContent = getTextContent(existingBlock.content);
        const newTextContent = existingTextContent + chunk;

        const newContent = isArray
          ? blockContent.map((item) =>
              typeof item === "string" ? newTextContent : item,
            )
          : newTextContent;

        newBlocks[currentBlockIdx] = {
          ...existingBlock,
          content: newContent,
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

      if (currentCharIdxRef.current >= textContent.length) {
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

        const justCompletedBlock = currentBlocks[currentBlockIdx];
        if (pauseAtBlockId && justCompletedBlock.id === pauseAtBlockId) {
          setState((prev) => ({
            ...prev,
            isPaused: true,
          }));
          resumeCallbackRef.current = () => {
            setState((prev) => ({
              ...prev,
              isPaused: false,
            }));
            timeoutRef.current = setTimeout(
              streamNextChunk,
              BLOCK_TRANSITION_DELAY_MS,
            );
          };
          return;
        }

        if (currentBlockIdxRef.current < currentBlocks.length) {
          timeoutRef.current = setTimeout(
            streamNextChunk,
            BLOCK_TRANSITION_DELAY_MS,
          );
        } else {
          setState((prev) => ({
            ...prev,
            status: "complete",
          }));
          saveCompletionToStorage(storageKey);
        }
      } else {
        timeoutRef.current = setTimeout(streamNextChunk, chunkDelayMs);
      }
    };

    timeoutRef.current = setTimeout(streamNextChunk, INITIAL_STREAM_DELAY_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    blocks,
    chunkSize,
    chunkDelayMs,
    blockDelayMs,
    storageKey,
    pauseAtBlockId,
    hasCheckedStorage,
  ]);

  const resume = () => {
    if (resumeCallbackRef.current) {
      resumeCallbackRef.current();
      resumeCallbackRef.current = null;
    }
  };

  return { ...state, resume };
};
