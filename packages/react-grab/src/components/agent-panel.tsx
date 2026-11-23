import { createSignal, onCleanup, Show, type Component } from "solid-js";
import type { AgentLogPhase, AgentPresenceState, AgentTask, DropdownAnchor } from "../types.js";
import { AGENT_LOG_COPY_FEEDBACK_MS, AGENT_LOG_PANEL_WIDTH_PX } from "../constants.js";
import { AnchoredDropdownSurface } from "./ui/anchored-dropdown-surface.js";
import { Surface } from "./ui/surface.js";
import { AgentPresenceLabel, AgentTaskList } from "./agent-task-list.js";

interface AgentPanelProps {
  position: DropdownAnchor | null;
  logUrl: string | null;
  phase: AgentLogPhase;
  errorMessage: string | null;
  tasks: AgentTask[];
  presence: AgentPresenceState;
  onGenerateLink: () => void;
  onCopyPrompt: () => Promise<boolean>;
  onDisconnect: () => void;
  onDismiss: () => void;
}

const PRIMARY_BUTTON_CLASS =
  "contain-layout flex-1 h-6 px-2 rounded-md text-[12px] font-medium leading-4 cursor-pointer press-scale bg-[var(--rg-submit-bg)] text-[var(--rg-submit-fg)] disabled:opacity-50 disabled:cursor-default";
const SECONDARY_BUTTON_CLASS =
  "contain-layout h-6 px-2 rounded-md text-[12px] font-medium leading-4 cursor-pointer press-scale bg-[var(--rg-surface-hover)] hover:bg-[var(--rg-surface-active)] text-[var(--rg-text-primary)]";

export const AgentPanel: Component<AgentPanelProps> = (props) => {
  const [didCopyPrompt, setDidCopyPrompt] = createSignal(false);
  let copyFeedbackTimeoutId: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(copyFeedbackTimeoutId));

  const handleCopyPrompt = async () => {
    const didCopy = await props.onCopyPrompt();
    if (!didCopy) return;
    clearTimeout(copyFeedbackTimeoutId);
    setDidCopyPrompt(true);
    copyFeedbackTimeoutId = setTimeout(() => setDidCopyPrompt(false), AGENT_LOG_COPY_FEEDBACK_MS);
  };

  return (
    <AnchoredDropdownSurface
      position={props.position}
      dataAttribute="data-react-grab-agent-panel"
      onDismiss={props.onDismiss}
    >
      <Surface
        class="flex flex-col gap-2 p-3 select-text"
        style={{ width: `${AGENT_LOG_PANEL_WIDTH_PX}px` }}
      >
        <div class="flex items-center gap-1.5">
          <Show when={props.logUrl}>
            <span class="size-1.5 rounded-full bg-[#22c55e]" aria-hidden="true" />
          </Show>
          <span
            class="text-[13px] leading-4 font-medium text-[var(--rg-text-primary)]"
            textContent={props.logUrl ? "Agent connected" : "Connect agent"}
          />
        </div>
        <Show
          when={props.logUrl}
          fallback={
            <>
              <p
                class="text-[12px] leading-4 text-[var(--rg-text-secondary)]"
                textContent="Generate a link and give the prompt to your agent. Your comments become todos it works through live."
              />
              <Show when={props.phase === "failed" && props.errorMessage}>
                {(errorMessage) => (
                  <p
                    data-react-grab-agent-panel-error
                    class="text-[12px] leading-4 text-[var(--rg-error-text)]"
                    textContent={errorMessage()}
                  />
                )}
              </Show>
              <div class="flex">
                <button
                  type="button"
                  data-react-grab-agent-panel-generate
                  class={PRIMARY_BUTTON_CLASS}
                  disabled={props.phase === "generating"}
                  onClick={() => props.onGenerateLink()}
                  textContent={props.phase === "generating" ? "Generating…" : "Generate link"}
                />
              </div>
            </>
          }
        >
          {(logUrl) => (
            <>
              <code
                data-react-grab-agent-panel-url
                class="block truncate rounded-md px-2 py-1 text-[11px] leading-4 font-mono bg-[var(--rg-surface-hover)] text-[var(--rg-text-secondary)]"
                title={logUrl()}
                textContent={logUrl()}
              />
              <AgentPresenceLabel
                presence={props.presence}
                hasOpenTasks={props.tasks.some(
                  (task) => task.status === "todo" || task.status === "in_progress",
                )}
              />
              <Show
                when={props.tasks.length > 0}
                fallback={
                  <p
                    class="text-[12px] leading-4 text-[var(--rg-text-secondary)] opacity-60"
                    textContent="Comments you leave become todos for your agent."
                  />
                }
              >
                <AgentTaskList
                  tasks={[...props.tasks].reverse()}
                  class="max-h-[180px] overflow-y-auto pr-1"
                />
              </Show>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  data-react-grab-agent-panel-copy-prompt
                  class={PRIMARY_BUTTON_CLASS}
                  onClick={() => void handleCopyPrompt()}
                  textContent={didCopyPrompt() ? "Copied" : "Copy prompt"}
                />
                <button
                  type="button"
                  data-react-grab-agent-panel-disconnect
                  class={SECONDARY_BUTTON_CLASS}
                  onClick={() => props.onDisconnect()}
                  textContent="Disconnect"
                />
              </div>
            </>
          )}
        </Show>
      </Surface>
    </AnchoredDropdownSurface>
  );
};
