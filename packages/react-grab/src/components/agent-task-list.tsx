import { For, Show, type Component } from "solid-js";
import type { AgentPresenceState, AgentTask } from "../types.js";
import { cn } from "../utils/cn.js";
import { AgentTaskStatusIcon } from "./agent-task-status-icon.js";

interface AgentTaskListProps {
  tasks: AgentTask[];
  class?: string;
}

interface AgentPresenceLabelProps {
  presence: AgentPresenceState;
  hasOpenTasks: boolean;
}

const AGENT_PRESENCE_LABELS: Record<AgentPresenceState, string> = {
  none: "Waiting for agent. Copy the prompt to start.",
  listening: "Agent is listening",
  working: "Agent is working",
  offline: "Agent went quiet",
};

const AGENT_PRESENCE_DOT_CLASSES: Record<AgentPresenceState, string> = {
  none: "bg-[#a3a3a3]",
  listening: "bg-[#22c55e]",
  working: "bg-[#f59e0b] animate-pulse",
  offline: "bg-[#ef4444]",
};

export const AgentPresenceLabel: Component<AgentPresenceLabelProps> = (props) => {
  const effectivePresence = (): AgentPresenceState =>
    props.presence === "listening" && props.hasOpenTasks ? "working" : props.presence;

  return (
    <div data-react-grab-agent-presence={effectivePresence()} class="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        class={cn("size-1.5 rounded-full", AGENT_PRESENCE_DOT_CLASSES[effectivePresence()])}
      />
      <span
        class="text-[12px] leading-4 text-[var(--rg-text-secondary)]"
        textContent={AGENT_PRESENCE_LABELS[effectivePresence()]}
      />
    </div>
  );
};

export const AgentTaskList: Component<AgentTaskListProps> = (props) => (
  <ul data-react-grab-agent-tasks class={cn("flex flex-col gap-1.5", props.class)}>
    <For each={props.tasks}>
      {(task) => (
        <li data-react-grab-agent-task={task.seqNum} class="flex items-start gap-2 min-w-0">
          <span class="mt-px">
            <AgentTaskStatusIcon status={task.status} />
          </span>
          <div class="flex flex-col min-w-0">
            <span
              class={cn(
                "truncate text-[12px] leading-4 text-[var(--rg-text-primary)]",
                (task.status === "done" || task.status === "canceled") && "opacity-60",
                task.status === "canceled" && "line-through",
              )}
              title={task.comment}
              textContent={task.comment}
            />
            <Show when={task.note}>
              {(note) => (
                <span
                  class="truncate text-[11px] leading-[14px] text-[var(--rg-text-secondary)]"
                  title={note()}
                  textContent={note()}
                />
              )}
            </Show>
          </div>
        </li>
      )}
    </For>
  </ul>
);
