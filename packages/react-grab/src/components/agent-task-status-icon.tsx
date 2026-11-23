import { Match, Switch, type Component } from "solid-js";
import type { AgentTaskStatus } from "../types.js";
import { IconCheck } from "./icons/icon-check.jsx";
import { IconLoader } from "./icons/icon-loader.jsx";

interface AgentTaskStatusIconProps {
  status: AgentTaskStatus;
}

const AGENT_TASK_STATUS_LABELS: Record<AgentTaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  error: "Error",
  canceled: "Canceled",
};

export const AgentTaskStatusIcon: Component<AgentTaskStatusIconProps> = (props) => (
  <span
    data-react-grab-agent-task-status={props.status}
    role="img"
    aria-label={AGENT_TASK_STATUS_LABELS[props.status]}
    title={AGENT_TASK_STATUS_LABELS[props.status]}
    class="contain-layout shrink-0 flex items-center justify-center size-3.5"
  >
    <Switch>
      <Match when={props.status === "todo"}>
        <span class="size-3 rounded-full border-[1.5px] border-dashed border-[var(--rg-text-secondary)]" />
      </Match>
      <Match when={props.status === "in_progress"}>
        <IconLoader size={14} class="text-[#f59e0b]" />
      </Match>
      <Match when={props.status === "done"}>
        <IconCheck size={14} class="text-[#22c55e]" />
      </Match>
      <Match when={props.status === "error"}>
        <span class="flex items-center justify-center size-3 rounded-full bg-[#ef4444] text-[9px] leading-none font-bold text-white">
          !
        </span>
      </Match>
      <Match when={props.status === "canceled"}>
        <span class="flex items-center justify-center size-3 rounded-full border-[1.5px] border-[var(--rg-text-secondary)]">
          <span class="w-1.5 h-[1.5px] bg-[var(--rg-text-secondary)]" />
        </span>
      </Match>
    </Switch>
  </span>
);
