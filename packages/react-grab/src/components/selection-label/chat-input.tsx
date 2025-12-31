import { createSignal, onMount } from "solid-js";
import type { Component } from "solid-js";
import type { ChatInputProps } from "../../types.js";
import { cn } from "../../utils/cn.js";
import { IconSend } from "../icons/icon-send.jsx";
import { IconSparkles } from "../icons/icon-sparkles.jsx";

export const ChatInput: Component<ChatInputProps> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined;
  let submitButtonRef: HTMLButtonElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
    textarea.style.height = `${newHeight}px`;
  };

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement;
    autoResize(target);
    props.onInput(target.value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    props.onKeyDown?.(e);

    // Tab focus trap - cycle between textarea and submit button
    if (e.key === "Tab") {
      e.preventDefault();
      if (document.activeElement === textareaRef) {
        submitButtonRef?.focus();
      } else {
        textareaRef?.focus();
      }
      return;
    }

    // Escape to cancel
    if (e.key === "Escape") {
      e.preventDefault();
      props.onCancel();
      return;
    }

    // Enter to submit (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit()) {
        props.onSubmit();
      }
      return;
    }
  };

  const handleSubmit = () => {
    if (canSubmit()) {
      props.onSubmit();
    }
  };

  onMount(() => {
    if (textareaRef) {
      textareaRef.focus();
      autoResize(textareaRef);
    }
  });

  const canSubmit = () =>
    props.value.trim().length > 0 && !props.isDisabled && !props.isLoading;

  return (
    <div
      class={cn(
        "relative flex flex-col rounded-xl border bg-white shadow-sm transition-all overflow-hidden",
        isFocused()
          ? "border-blue-400 ring-2 ring-blue-500/20"
          : "border-gray-200",
        props.isLoading && "opacity-80",
      )}
    >
      {/* Textarea area */}
      <div class="flex-1 p-3 pb-0">
        <textarea
          ref={textareaRef}
          value={props.value}
          placeholder={props.placeholder ?? "Write your prompt here..."}
          disabled={props.isDisabled || props.isLoading}
          class={cn(
            "w-full resize-none bg-transparent text-[14px] leading-relaxed",
            "text-gray-900 placeholder:text-gray-400 focus:outline-none",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
            props.isDisabled && "cursor-not-allowed opacity-60",
          )}
          style={{
            "min-height": "48px",
            "max-height": "200px",
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label="Prompt input"
          autocomplete="off"
          spellcheck={true}
          rows={1}
        />
      </div>

      {/* Footer with status and submit button */}
      <div class="flex items-center justify-between px-3 py-2 border-t border-gray-100">
        {/* AI status indicator */}
        <div class="flex items-center gap-1.5 text-xs text-gray-400">
          {props.hasAgent && (
            <>
              <IconSparkles
                size={12}
                class={cn(
                  props.isLoading
                    ? "animate-pulse text-blue-500"
                    : "text-gray-400",
                )}
              />
              <span>{props.isLoading ? "Processing..." : "AI Ready"}</span>
            </>
          )}
        </div>

        {/* Submit button */}
        <button
          ref={submitButtonRef}
          type="button"
          class={cn(
            "h-7 w-7 rounded-full flex items-center justify-center transition-all",
            canSubmit()
              ? "bg-black text-white hover:bg-gray-800 hover:scale-105"
              : "bg-gray-100 text-gray-400 cursor-not-allowed",
          )}
          disabled={!canSubmit()}
          onClick={handleSubmit}
          aria-label="Send prompt"
        >
          <IconSend size={14} class="text-current" />
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div class="px-3 pb-2 text-[10px] text-gray-400">
        <span class="opacity-70">
          Enter to send &middot; Shift+Enter for new line &middot; Esc to cancel
        </span>
      </div>
    </div>
  );
};
