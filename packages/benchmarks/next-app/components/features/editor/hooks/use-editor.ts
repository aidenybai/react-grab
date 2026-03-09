"use client";
import { useState, useCallback, useRef } from "react";

interface EditorState {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

export const useEditor = (initialContent = "") => {
  const [state, setState] = useState<EditorState>({
    content: initialContent,
    selectionStart: 0,
    selectionEnd: 0,
  });
  const historyRef = useRef<string[]>([initialContent]);
  const historyIndexRef = useRef(0);

  const setContent = useCallback((content: string) => {
    setState((prev) => ({ ...prev, content }));
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push(content);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setState((prev) => ({
        ...prev,
        content: historyRef.current[historyIndexRef.current],
      }));
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setState((prev) => ({
        ...prev,
        content: historyRef.current[historyIndexRef.current],
      }));
    }
  }, []);

  const setSelection = useCallback((start: number, end: number) => {
    setState((prev) => ({ ...prev, selectionStart: start, selectionEnd: end }));
  }, []);

  return {
    content: state.content,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
    setContent,
    setSelection,
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
  };
};
