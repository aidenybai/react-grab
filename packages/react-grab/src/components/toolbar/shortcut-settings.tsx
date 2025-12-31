import { createSignal, onMount, onCleanup, Show } from "solid-js";
import type { Component } from "solid-js";
import { cn } from "../../utils/cn.js";
import { formatShortcut } from "../../utils/format-shortcut.js";
import {
  getDefaultShortcut,
  saveShortcutConfig,
  clearShortcutConfig,
  type RequiredActivationKey,
} from "../../shortcut/state.js";
import { IconReturn } from "../icons/icon-return.jsx";

interface ShortcutSettingsProps {
  currentShortcut: RequiredActivationKey;
  onShortcutChange: (shortcut: RequiredActivationKey) => void;
  onClose: () => void;
}

const MODIFIER_KEYS = new Set(["Meta", "Control", "Shift", "Alt"]);

export const ShortcutSettings: Component<ShortcutSettingsProps> = (props) => {
  const [isRecording, setIsRecording] = createSignal(false);
  const [recordedShortcut, setRecordedShortcut] =
    createSignal<RequiredActivationKey | null>(null);

  const displayShortcut = () => recordedShortcut() ?? props.currentShortcut;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isRecording()) return;

    event.preventDefault();
    event.stopPropagation();

    const isModifierOnly = MODIFIER_KEYS.has(event.key);
    if (isModifierOnly) return;

    const hasModifier =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!hasModifier) return;

    const newShortcut: RequiredActivationKey = {
      key: event.key.length === 1 ? event.key.toLowerCase() : event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    };

    setRecordedShortcut(newShortcut);
    setIsRecording(false);
  };

  const handleSave = () => {
    const shortcut = recordedShortcut();
    if (shortcut) {
      saveShortcutConfig(shortcut);
      props.onShortcutChange(shortcut);
      setRecordedShortcut(null);
    }
    props.onClose();
  };

  const handleReset = () => {
    const defaultShortcut = getDefaultShortcut();
    clearShortcutConfig();
    props.onShortcutChange(defaultShortcut);
    setRecordedShortcut(null);
  };

  const handleCancel = () => {
    setRecordedShortcut(null);
    setIsRecording(false);
    props.onClose();
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  });

  return (
    <div
      data-react-grab-ignore-events
      class="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-lg min-w-[220px]"
      style={{
        "z-index": "2147483647",
        "box-shadow":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div class="flex flex-col gap-3">
        <div class="text-[13px] font-medium text-black">
          Activation Shortcut
        </div>

        <button
          class={cn(
            "px-3 py-2 rounded border text-[13px] font-mono transition-all text-center",
            isRecording()
              ? "border-[#b21c8e] bg-[#fde7f7] text-[#b21c8e]"
              : "border-[#B3B3B3] bg-[#F5F5F5] text-black hover:bg-[#EBEBEB]",
          )}
          onClick={() => setIsRecording(true)}
        >
          <Show
            when={isRecording()}
            fallback={formatShortcut(displayShortcut())}
          >
            Press keys...
          </Show>
        </button>

        <div class="flex items-center justify-between gap-2">
          <button
            class="px-2 py-1 text-[12px] text-[#666] hover:text-black transition-colors"
            onClick={handleReset}
          >
            Reset to default
          </button>

          <div class="flex items-center gap-2">
            <button
              class="px-2 py-1 rounded text-[12px] border border-[#B3B3B3] hover:bg-[#F5F5F5] transition-all"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              class={cn(
                "px-2 py-1 rounded text-[12px] transition-all flex items-center gap-1",
                recordedShortcut()
                  ? "bg-black text-white hover:bg-[#333]"
                  : "bg-[#F5F5F5] text-[#999] cursor-not-allowed",
              )}
              onClick={handleSave}
              disabled={!recordedShortcut()}
            >
              Save
              <IconReturn size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
